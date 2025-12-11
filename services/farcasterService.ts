
import { FarcasterProfile, StandStats, StatValue, StandStatRawValues } from "../types";

const NEYNAR_API_KEY = import.meta.env.VITE_NEYNAR_API_KEY || "BDED1C34-E2A9-43FA-B973-38C4B938008D";
// Use Base chain RPC instead of Ethereum mainnet (Farcaster users are more active on Base)
const BASE_RPC_URL = "https://mainnet.base.org";

// ==========================================
// 1. Fetch User Data (with extended viewer_fid for more stats)
// ==========================================
export const fetchFarcasterUser = async (fid: number): Promise<FarcasterProfile & { score?: number } | null> => {
  try {
    // Use viewer_fid to get more context, and x-neynar-experimental for score
    const response = await fetch(
      `https://api.neynar.com/v2/farcaster/user/bulk?fids=${fid}&viewer_fid=${fid}`,
      {
        headers: {
          accept: "application/json",
          "x-api-key": NEYNAR_API_KEY,
          "x-neynar-experimental": "true",
        },
      }
    );

    if (!response.ok) throw new Error("Failed to fetch Farcaster user");

    const data = await response.json();
    const user = data.users?.[0];

    if (!user) return null;

    // Fetch engagement from Neynar API (paid plan)
    let likesReceived = 0;
    let recastsReceived = 0;
    
    try {
      const castsResponse = await fetch(
        `https://api.neynar.com/v2/farcaster/feed/user/casts?fid=${fid}&limit=150`,
        {
          headers: {
            accept: "application/json",
            "x-api-key": NEYNAR_API_KEY,
          },
        }
      );
      if (castsResponse.ok) {
        const castsData = await castsResponse.json();
        castsData.casts?.forEach((cast: any) => {
          likesReceived += cast.reactions?.likes_count || 0;
          recastsReceived += cast.reactions?.recasts_count || 0;
        });
      }
    } catch (e) {
      console.warn("Neynar API fetch failed:", e);
    }
    
    // Fetch real cast count from Hub API (with pagination)
    let castCount = 0;
    try {
      let nextPageToken: string | null = null;
      do {
        const url = `https://hub.pinata.cloud/v1/castsByFid?fid=${fid}&pageSize=1000${nextPageToken ? `&pageToken=${nextPageToken}` : ''}`;
        const hubResponse = await fetch(url);
        if (hubResponse.ok) {
          const hubData = await hubResponse.json();
          castCount += hubData.messages?.filter(
            (m: any) => m.data?.type === 'MESSAGE_TYPE_CAST_ADD'
          ).length || 0;
          nextPageToken = hubData.nextPageToken || null;
        } else {
          break;
        }
      } while (nextPageToken);
    } catch (e) {
      console.warn("Hub API fetch failed:", e);
    }

    return {
      fid: user.fid,
      username: user.username,
      displayName: user.display_name,
      bio: user.profile?.bio?.text || "",
      pfpUrl: user.pfp_url,
      followerCount: user.follower_count || 0,
      followingCount: user.following_count || 0,
      castCount,
      likesReceived,
      recastsReceived,
      verifications: user.verifications || [],
      powerBadge: user.power_badge || false,
      score: user.experimental?.neynar_user_score || user.score,
    };
  } catch (error) {
    console.error("Farcaster Fetch Error:", error);
    return null;
  }
};

// ==========================================
// 2. Get ALL Transaction Count from Base L2 (both sent and received)
// ==========================================
const getBaseTransactionCount = async (address: string): Promise<number> => {
  try {
    // Use BaseScan API to get total transaction count (including received transactions)
    // Fetch max 10000 transactions to get a good estimate
    const response = await fetch(
      `https://api.basescan.org/api?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&page=1&offset=10000&sort=asc`
    );
    
    if (!response.ok) {
      throw new Error("BaseScan API request failed");
    }
    
    const data = await response.json();
    
    // BaseScan API returns status "1" for success, even without API key (rate limited but works)
    if (data.status === "1" && Array.isArray(data.result)) {
      // Return actual transaction count
      // If it's exactly 10000, there might be more, but that's already a lot
      return data.result.length;
    }
    
    // If API rate limit or other error, fallback to RPC method (only outgoing transactions)
    console.warn("BaseScan API response not OK, falling back to RPC", data.message);
    const rpcResponse = await fetch(BASE_RPC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "eth_getTransactionCount",
        params: [address, "latest"],
        id: 1,
      }),
    });
    
    if (rpcResponse.ok) {
      const rpcData = await rpcResponse.json();
      if (rpcData.result) {
        const count = parseInt(rpcData.result, 16);
        return isNaN(count) ? 0 : count;
      }
    }
    
    return 0;
    
  } catch (e) {
    console.warn("Base transaction fetch failed, using fallback", e);
    return 0;
  }
};

// ==========================================
// 3. Calculate Stats
// ==========================================
export const calculateFarcasterStats = async (profile: FarcasterProfile & { score?: number }): Promise<{ stats: StandStats; details: StandStatRawValues }> => {
  
  // A. POWER (Neynar Score / Social Capital)
  // Neynar score is 0-1, so multiply by 100 for percentage
  let power: StatValue = 'E';
  const scorePercent = profile.score ? profile.score * 100 : 0;
  
  if (scorePercent > 0) {
      if (scorePercent > 90) power = 'A';
      else if (scorePercent > 70) power = 'B';
      else if (scorePercent > 50) power = 'C';
      else if (scorePercent > 30) power = 'D';
  } else {
      if (profile.powerBadge) power = 'A';
      else if (profile.followerCount > 5000) power = 'A';
      else if (profile.followerCount > 1000) power = 'B';
      else if (profile.followerCount > 200) power = 'C';
      else if (profile.followerCount > 50) power = 'D';
  }

  // Display Detail: Prefer Score (as percentage), fall back to Followers
  const powerDetail = profile.score 
    ? `Score: ${scorePercent.toFixed(0)}%` 
    : (profile.powerBadge ? "Power Badge" : `Followers: ${profile.followerCount}`);

  // B. SPEED (Activity Rate - Base L2 transaction count or Cast frequency)
  let txCount = 0;
  let speedDetail = 'No data';
  
  // Try to get Base L2 transaction count first (using first verified wallet)
  if (profile.verifications.length > 0) {
    txCount = await getBaseTransactionCount(profile.verifications[0]);
  }

  let speed: StatValue = 'E';
  
  // If we have transaction data, use it
  if (txCount > 0) {
    if (txCount > 500) speed = 'A';
    else if (txCount > 100) speed = 'B';
    else if (txCount > 20) speed = 'C';
    else if (txCount > 0) speed = 'D';
    speedDetail = `${txCount} Txns`;  // All transactions (sent + received) from BaseScan
  } else {
    // Fallback: Use cast activity rate as speed indicator
    // Higher cast count = more active = faster
    const castCount = profile.castCount || 0;
    if (castCount > 5000) speed = 'A';
    else if (castCount > 2000) speed = 'B';
    else if (castCount > 500) speed = 'C';
    else if (castCount > 100) speed = 'D';
    speedDetail = `${castCount} Casts`;
  }

  // C. DURABILITY (Cast Count) - 调整门槛更合理
  let durability: StatValue = 'E';
  if (profile.castCount > 3000) durability = 'A';
  else if (profile.castCount > 1000) durability = 'B';
  else if (profile.castCount > 300) durability = 'C';
  else if (profile.castCount > 50) durability = 'D';

  const durabilityDetail = `${profile.castCount} Casts`;

  // D. PRECISION (Engagement Quality - Overall average likes per cast)
  let precision: StatValue = 'E';
  let precisionDetail = 'No data';
  
  // Use TOTAL likes / TOTAL casts for overall quality (faster, no extra API call)
  if (profile.castCount > 0) {
    const avgLikesPerCast = profile.likesReceived / profile.castCount;
    
    // Determine precision grade based on average likes per cast
    if (avgLikesPerCast > 30) precision = 'A';
    else if (avgLikesPerCast > 15) precision = 'B';
    else if (avgLikesPerCast > 7) precision = 'C';
    else if (avgLikesPerCast > 2) precision = 'D';
    else precision = 'E';
    
    precisionDetail = `Avg: ${avgLikesPerCast.toFixed(1)}/cast`;
  } else {
    // Fallback: use follower ratio if no casts
    const ratio = profile.followerCount / Math.max(profile.followingCount, 1);
    if (ratio > 5) precision = 'A';
    else if (ratio > 2) precision = 'B';
    else if (ratio > 1) precision = 'C';
    else if (ratio > 0.5) precision = 'D';
    else precision = 'E';
    precisionDetail = `Ratio: ${ratio.toFixed(2)}`;
  }

  // E. RANGE (Engagement - Likes + Recasts)
  const totalEngagement = profile.likesReceived + profile.recastsReceived;
  let range: StatValue = 'E';
  if (totalEngagement > 1000) range = 'A';
  else if (totalEngagement > 500) range = 'B';
  else if (totalEngagement > 300) range = 'C';
  else if (totalEngagement > 150) range = 'D';
  else if (totalEngagement > 50) range = 'E';

  const rangeDetail = `Engage: ${totalEngagement}`;

  // F. POTENTIAL (FID Age)
  let potential: StatValue = 'E';
  if (profile.fid > 400000) potential = 'A'; // Very new
  else if (profile.fid > 200000) potential = 'B';
  else if (profile.fid > 15000) potential = 'C';
  else if (profile.fid > 2000) potential = 'D';
  else potential = 'E'; // OG

  const potentialDetail = `FID: ${profile.fid}`;

  return { 
    stats: { power, speed, durability, precision, range, potential },
    details: { 
      power: powerDetail, 
      speed: speedDetail, 
      durability: durabilityDetail,
      precision: precisionDetail,
      range: rangeDetail,
      potential: potentialDetail
    }
  };
};
