
import { FarcasterProfile, StandStats, StatValue, StandStatRawValues } from "../types";

const NEYNAR_API_KEY = import.meta.env.VITE_NEYNAR_API_KEY || "BDED1C34-E2A9-43FA-B973-38C4B938008D";
const ETH_RPC_URL = "https://cloudflare-eth.com";

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

    // Fetch real cast count from free Farcaster Hub API (with pagination)
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
// 2. Get On-Chain TX Count (Speed)
// ==========================================
const getEthTransactionCount = async (address: string): Promise<number> => {
  try {
    const response = await fetch(ETH_RPC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "eth_getTransactionCount",
        params: [address, "latest"],
        id: 1,
      }),
    });
    const data = await response.json();
    const count = parseInt(data.result, 16);
    // Return 0 if NaN
    return isNaN(count) ? 0 : count;
  } catch (e) {
    console.warn("RPC Fetch failed, using fallback speed", e);
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

  // B. SPEED (Chain TXs)
  let txCount = 0;
  if (profile.verifications.length > 0) {
    txCount = await getEthTransactionCount(profile.verifications[0]);
  }
  
  let speed: StatValue = 'E';
  if (txCount > 500) speed = 'A';
  else if (txCount > 100) speed = 'B';
  else if (txCount > 20) speed = 'C';
  else if (txCount > 0) speed = 'D';
  if (speed === 'E' && profile.verifications.length > 2) speed = 'C';

  const speedDetail = `${txCount} Txns`;

  // C. DURABILITY (Cast Count)
  let durability: StatValue = 'E';
  if (profile.castCount > 5000) durability = 'A';
  else if (profile.castCount > 1500) durability = 'B';
  else if (profile.castCount > 500) durability = 'C';
  else if (profile.castCount > 100) durability = 'D';

  const durabilityDetail = `${profile.castCount} Casts`;

  // D. PRECISION (Hash Algorithm - Deterministic)
  const precisionMap: StatValue[] = ['A', 'B', 'C', 'D', 'E'];
  const precisionIndex = profile.fid % 5; 
  const precision = precisionMap[precisionIndex];

  const precisionDetail = `Hash: ${precisionIndex}`;

  // E. RANGE (Followers - Social Reach)
  let range: StatValue = 'E';
  if (profile.followerCount > 10000) range = 'A';
  else if (profile.followerCount > 3000) range = 'B';
  else if (profile.followerCount > 1000) range = 'C';
  else if (profile.followerCount > 200) range = 'D';

  const rangeDetail = `${profile.followerCount} Followers`;

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
