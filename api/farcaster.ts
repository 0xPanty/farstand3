import type { VercelRequest, VercelResponse } from '@vercel/node';

const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY;
const ETH_RPC_URL = "https://eth.llamarpc.com";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { fid } = req.query;

    if (!fid) {
      return res.status(400).json({ error: 'Missing fid parameter' });
    }

    // Fetch user profile
    const profile = await fetchFarcasterUser(Number(fid));
    
    if (!profile) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Calculate stats
    const calculatedData = await calculateFarcasterStats(profile);

    return res.status(200).json({
      profile,
      ...calculatedData
    });

  } catch (error: any) {
    console.error('Farcaster API Error:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch Farcaster data' });
  }
}

// ==========================================
// Fetch User Data from Neynar
// ==========================================
async function fetchFarcasterUser(fid: number): Promise<any> {
  try {
    const response = await fetch(
      `https://api.neynar.com/v2/farcaster/user/bulk?fids=${fid}&viewer_fid=${fid}`,
      {
        headers: {
          accept: "application/json",
          "x-api-key": NEYNAR_API_KEY || "",
          "x-neynar-experimental": "true",
        },
      }
    );

    if (!response.ok) throw new Error("Failed to fetch Farcaster user");

    const data = await response.json();
    const user = data.users?.[0];

    if (!user) return null;

    // Also fetch user's casts to count them
    let castCount = 0;
    let sampledCastCount = 0; // Track actual casts we sampled
    let likesReceived = 0;
    let recastsReceived = 0;
    let repliesReceived = 0;
    
    try {
      const castsResponse = await fetch(
        `https://api.neynar.com/v2/farcaster/feed/user/${fid}/casts?limit=50`,
        {
          headers: {
            accept: "application/json",
            "x-api-key": NEYNAR_API_KEY || "",
          },
        }
      );
      if (castsResponse.ok) {
        const castsData = await castsResponse.json();
        sampledCastCount = castsData.casts?.length || 0;
        castCount = user.cast_count || sampledCastCount; // Use API's total count if available
        castsData.casts?.forEach((cast: any) => {
          likesReceived += cast.reactions?.likes_count || 0;
          recastsReceived += cast.reactions?.recasts_count || 0;
          repliesReceived += cast.replies?.count || 0;
        });
      }
    } catch (e) {
      console.warn("Failed to fetch casts:", e);
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
      repliesReceived,
      verifications: user.verifications || [],
      powerBadge: user.power_badge || false,
      score: user.experimental?.neynar_user_score || user.score,
    };
  } catch (error) {
    console.error("Farcaster Fetch Error:", error);
    return null;
  }
}

// ==========================================
// Get On-Chain TX Count
// ==========================================
async function getEthTransactionCount(address: string): Promise<number> {
  console.log("🔍 Fetching TX count for address:", address);
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
    
    if (!response.ok) {
      console.error("❌ RPC response not OK:", response.status, response.statusText);
      return 0;
    }
    
    const data = await response.json();
    console.log("📊 RPC response data:", data);
    
    if (data.error) {
      console.error("❌ RPC returned error:", data.error);
      return 0;
    }
    
    if (!data.result) {
      console.warn("⚠️ No result in RPC response");
      return 0;
    }
    
    const count = parseInt(data.result, 16);
    console.log("✅ TX Count:", count);
    return isNaN(count) ? 0 : count;
  } catch (e) {
    console.error("❌ RPC Fetch failed:", e);
    return 0;
  }
}

// ==========================================
// Calculate Stats
// ==========================================
async function calculateFarcasterStats(profile: any): Promise<any> {
  
  // A. POWER (Neynar score is 0-1, convert to percentage)
  let power = 'E';
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

  const powerDetail = profile.score 
    ? `Score: ${scorePercent.toFixed(0)}%` 
    : (profile.powerBadge ? "Power Badge" : `Followers: ${profile.followerCount}`);

  // B. SPEED
  let txCount = 0;
  if (profile.verifications.length > 0) {
    txCount = await getEthTransactionCount(profile.verifications[0]);
  }
  
  let speed = 'E';
  if (txCount > 500) speed = 'A';
  else if (txCount > 100) speed = 'B';
  else if (txCount > 20) speed = 'C';
  else if (txCount > 0) speed = 'D';
  if (speed === 'E' && profile.verifications.length > 2) speed = 'C';

  const speedDetail = `${txCount} Txns`;

  // C. DURABILITY
  let durability = 'E';
  if (profile.castCount > 5000) durability = 'A';
  else if (profile.castCount > 1500) durability = 'B';
  else if (profile.castCount > 500) durability = 'C';
  else if (profile.castCount > 100) durability = 'D';

  const durabilityDetail = `${profile.castCount} Casts`;

  // D. PRECISION (Engagement Quality Score - Weighted: Likes + Recasts×2 + Replies×3)
  let precision = 'E';
  let precisionDetail = 'No data';
  
  if (profile.castCount > 0) {
    // Calculate weighted engagement score per cast
    // Replies are most valuable (show discussion), Recasts are medium, Likes are baseline
    const weightedScore = (
      (profile.likesReceived || 0) + 
      (profile.recastsReceived || 0) * 2 + 
      (profile.repliesReceived || 0) * 3
    ) / profile.castCount;
    
    // Determine precision grade based on weighted quality score (adjusted for Farcaster reality)
    if (weightedScore >= 10) precision = 'A';       // Viral quality content (top 5%)
    else if (weightedScore >= 5) precision = 'B';  // High quality engagement (top 15%)
    else if (weightedScore >= 2) precision = 'C';   // Good engagement (top 40%)
    else if (weightedScore >= 1) precision = 'D';   // Moderate engagement (above average)
    else precision = 'E';                           // Low engagement
    
    precisionDetail = `Quality: ${weightedScore.toFixed(1)}`;
  } else {
    precisionDetail = 'No casts';
  }

  // E. RANGE
  const totalEngagement = profile.likesReceived + profile.recastsReceived;
  let range = 'E';
  if (totalEngagement > 10000) range = 'A';
  else if (totalEngagement > 3000) range = 'B';
  else if (totalEngagement > 1000) range = 'C';
  else if (totalEngagement > 200) range = 'D';

  const rangeDetail = `Engage: ${totalEngagement}`;

  // F. POTENTIAL
  let potential = 'E';
  if (profile.fid > 400000) potential = 'A';
  else if (profile.fid > 200000) potential = 'B';
  else if (profile.fid > 15000) potential = 'C';
  else if (profile.fid > 2000) potential = 'D';
  else potential = 'E';

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
}
