import type { VercelRequest, VercelResponse } from '@vercel/node';

const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY;

// 缓存机制
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000;

export default async function handler(req: VercelRequest, res: VercelResponse) {
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

    const cacheKey = `user_${fid}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return res.status(200).json(cached.data);
    }

    try {
      const profile = await fetchFarcasterUser(Number(fid));
      if (profile) {
        const calculatedData = await calculateFarcasterStats(profile);
        const result = { profile, stats: calculatedData.stats, details: calculatedData.details };
        cache.set(cacheKey, { data: result, timestamp: Date.now() });
        return res.status(200).json(result);
      }
    } catch (neynarError) {
      console.error('Neynar API failed:', neynarError);
    }

    const fallbackData = generateFallbackStats(Number(fid));
    cache.set(cacheKey, { data: fallbackData, timestamp: Date.now() });
    return res.status(200).json(fallbackData);

  } catch (error: any) {
    const { fid } = req.query;
    return res.status(200).json(generateFallbackStats(Number(fid)));
  }
}

// ==========================================
// 降级方案
// ==========================================
function generateFallbackStats(fid: number) {
  const seed = fid % 100;
  const grades: Array<'A' | 'B' | 'C' | 'D' | 'E'> = ['A', 'B', 'C', 'D', 'E'];
  
  let potential: 'A' | 'B' | 'C' | 'D' | 'E';
  if (fid > 400000) potential = 'A';
  else if (fid > 200000) potential = 'B';
  else if (fid > 15000) potential = 'C';
  else if (fid > 2000) potential = 'D';
  else potential = 'E';

  return {
    profile: {
      fid, username: `user_${fid}`, displayName: `User ${fid}`,
      bio: '', pfpUrl: '', followerCount: seed * 10, followingCount: seed * 5,
      castCount: seed * 20, likesReceived: seed * 15, recastsReceived: seed * 5,
      repliesReceived: seed * 3, verifications: [], powerBadge: false, score: seed / 100
    },
    stats: {
      power: grades[seed % 5], speed: grades[(seed + 1) % 5], range: grades[(seed + 2) % 5],
      durability: grades[(seed + 3) % 5], precision: grades[(seed + 4) % 5], potential
    },
    details: {
      power: `Score: ${seed}%`, speed: `${seed} Txns`, range: `Engage: ${seed * 20}`,
      durability: `${seed * 20} Casts`, precision: `Quality: ${(seed / 10).toFixed(1)}`, potential: `FID: ${fid}`
    }
  };
}

// ==========================================
// 获取 Base L2 交易数量
// ==========================================
async function getBaseTransactionCount(address: string): Promise<number> {
  try {
    const response = await fetch(
      `https://api.basescan.org/api?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&page=1&offset=1000&sort=asc`
    );
    if (!response.ok) return 0;
    const data = await response.json();
    if (data.status === "1" && Array.isArray(data.result)) {
      return data.result.length;
    }
    return 0;
  } catch (e) {
    return 0;
  }
}

// ==========================================
// 获取 Farcaster 用户数据
// ==========================================
async function fetchFarcasterUser(fid: number): Promise<any> {
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

  if (!response.ok) throw new Error(`API returned ${response.status}`);
  const data = await response.json();
  const user = data.users?.[0];
  if (!user) return null;

  let castCount = user.cast_count || 0;
  let sampledCastCount = 0;
  let likesReceived = 0;
  let recastsReceived = 0;
  let repliesReceived = 0;

  // 只采样 10 条 Cast (省 API)
  try {
    const castsResponse = await fetch(
      `https://api.neynar.com/v2/farcaster/feed/user/casts?fid=${fid}&limit=10`,
      { headers: { accept: "application/json", "x-api-key": NEYNAR_API_KEY || "" } }
    );
    if (castsResponse.ok) {
      const castsData = await castsResponse.json();
      sampledCastCount = castsData.casts?.length || 0;
      castsData.casts?.forEach((cast: any) => {
        likesReceived += cast.reactions?.likes_count || 0;
        recastsReceived += cast.reactions?.recasts_count || 0;
        repliesReceived += cast.replies?.count || 0;
      });
    }
  } catch (e) {}

  return {
    fid: user.fid,
    username: user.username,
    displayName: user.display_name,
    bio: user.profile?.bio?.text || "",
    pfpUrl: user.pfp_url,
    followerCount: user.follower_count || 0,
    followingCount: user.following_count || 0,
    castCount,
    sampledCastCount,
    likesReceived,
    recastsReceived,
    repliesReceived,
    verifications: user.verifications || [],
    powerBadge: user.power_badge || false,
    score: user.experimental?.neynar_user_score || user.score,
  };
}

// ==========================================
// 计算 Stand 属性
// ==========================================
async function calculateFarcasterStats(profile: any): Promise<any> {
  const getGrade = (value: number, thresholds: number[]): 'A' | 'B' | 'C' | 'D' | 'E' => {
    if (value > thresholds[0]) return 'A';
    if (value > thresholds[1]) return 'B';
    if (value > thresholds[2]) return 'C';
    if (value > thresholds[3]) return 'D';
    return 'E';
  };

  // ========== POWER: Neynar Score (0-100%) ==========
  const scorePercent = profile.score ? profile.score * 100 : 0;
  let power: 'A' | 'B' | 'C' | 'D' | 'E';
  if (scorePercent > 90) power = 'A';
  else if (scorePercent > 70) power = 'B';
  else if (scorePercent > 50) power = 'C';
  else if (scorePercent > 30) power = 'D';
  else power = 'E';
  const powerDetail = `Score: ${scorePercent.toFixed(0)}%`;

  // ========== SPEED: Base L2 交易数 ==========
  let txCount = 0;
  if (profile.verifications?.length > 0) {
    txCount = await getBaseTransactionCount(profile.verifications[0]);
  }
  const speed = getGrade(txCount, [500, 100, 20, 5]);
  const speedDetail = `${txCount} Txns`;

  // ========== RANGE: 互动量 (likes + recasts) ==========
  const totalEngagement = (profile.likesReceived || 0) + (profile.recastsReceived || 0);
  const range = getGrade(totalEngagement, [300, 100, 30, 10]);
  const rangeDetail = `Engage: ${totalEngagement}`;

  // ========== DURABILITY: Cast 数量 (总数) ==========
  const durability = getGrade(profile.castCount, [2000, 800, 200, 50]);
  const durabilityDetail = `${profile.castCount} Casts`;

  // ========== PRECISION: 精度分 (点赞×1 + 转发×1.5 + 回复×3) ==========
  const precisionScore = (profile.likesReceived || 0) + (profile.recastsReceived || 0) * 1.5 + (profile.repliesReceived || 0) * 3;
  const precision = getGrade(precisionScore, [200, 100, 50, 20]);
  const precisionDetail = `Quality: ${precisionScore.toFixed(0)}`;

  // ========== POTENTIAL: FID 年龄 ==========
  let potential: 'A' | 'B' | 'C' | 'D' | 'E';
  if (profile.fid > 400000) potential = 'A';
  else if (profile.fid > 200000) potential = 'B';
  else if (profile.fid > 15000) potential = 'C';
  else if (profile.fid > 2000) potential = 'D';
  else potential = 'E';
  const potentialDetail = `FID: ${profile.fid}`;

  return {
    stats: { power, speed, range, durability, precision, potential },
    details: {
      power: powerDetail,
      speed: speedDetail,
      range: rangeDetail,
      durability: durabilityDetail,
      precision: precisionDetail,
      potential: potentialDetail
    }
  };
}
