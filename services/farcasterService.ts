import { FarcasterProfile, StandStats, StandStatRawValues } from "../types";

// API base URL - use relative path for same-origin, or full URL for production
const API_BASE_URL = import.meta.env.PROD 
  ? '' // In production, use relative path (same domain)
  : ''; // In development, also use relative path (Vite proxy can handle it)

// ==========================================
// Fetch user data and stats from backend API
// This keeps the Neynar API key secure on the server side
// ==========================================
export const fetchFarcasterUser = async (fid: number): Promise<FarcasterProfile | null> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/farcaster?fid=${fid}`);
    
    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }
    
    const data = await response.json();
    return data.profile || null;
  } catch (error) {
    console.error("Farcaster Fetch Error:", error);
    return null;
  }
};

// ==========================================
// Fetch complete data (profile + stats) from backend API
// ==========================================
export const fetchFarcasterData = async (fid: number): Promise<{
  profile: FarcasterProfile;
  stats: StandStats;
  details: StandStatRawValues;
} | null> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/farcaster?fid=${fid}`);
    
    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.profile) {
      return null;
    }
    
    return {
      profile: data.profile,
      stats: data.stats,
      details: data.details
    };
  } catch (error) {
    console.error("Farcaster Data Fetch Error:", error);
    return null;
  }
};

// ==========================================
// Calculate stats - now just a wrapper that calls the backend
// Kept for backward compatibility if any code still uses it
// ==========================================
export const calculateFarcasterStats = async (profile: FarcasterProfile & { score?: number }): Promise<{ stats: StandStats; details: StandStatRawValues }> => {
  // If we already have the profile, fetch the full data from API
  const data = await fetchFarcasterData(profile.fid);
  
  if (data) {
    return {
      stats: data.stats,
      details: data.details
    };
  }
  
  // Fallback: generate basic stats locally if API fails
  return generateFallbackStats(profile);
};

// ==========================================
// Fallback stats generation (no API needed)
// ==========================================
function generateFallbackStats(profile: FarcasterProfile & { score?: number }): { stats: StandStats; details: StandStatRawValues } {
  type StatValue = 'A' | 'B' | 'C' | 'D' | 'E';
  
  const getGrade = (value: number, thresholds: number[]): StatValue => {
    if (value > thresholds[0]) return 'A';
    if (value > thresholds[1]) return 'B';
    if (value > thresholds[2]) return 'C';
    if (value > thresholds[3]) return 'D';
    return 'E';
  };

  const power: StatValue = profile.powerBadge ? 'A' : getGrade(profile.followerCount, [5000, 1000, 200, 50]);
  const speed: StatValue = getGrade(profile.castCount, [5000, 2000, 500, 100]);
  const durability: StatValue = getGrade(profile.castCount, [3000, 1000, 300, 50]);
  const range: StatValue = getGrade(profile.likesReceived + profile.recastsReceived, [1000, 500, 300, 150]);
  
  const castsForCalc = profile.sampledCastCount || profile.castCount || 1;
  const qualityScore = ((profile.likesReceived || 0) + (profile.recastsReceived || 0) * 2 + (profile.repliesReceived || 0) * 3) / castsForCalc;
  const precision: StatValue = getGrade(qualityScore, [20, 10, 5, 2]);
  
  let potential: StatValue;
  if (profile.fid > 400000) potential = 'A';
  else if (profile.fid > 200000) potential = 'B';
  else if (profile.fid > 15000) potential = 'C';
  else if (profile.fid > 2000) potential = 'D';
  else potential = 'E';

  return {
    stats: { power, speed, range, durability, precision, potential },
    details: {
      power: profile.score ? `Score: ${(profile.score * 100).toFixed(0)}%` : `Followers: ${profile.followerCount}`,
      speed: `${profile.castCount} Casts`,
      range: `Engage: ${profile.likesReceived + profile.recastsReceived}`,
      durability: `${profile.castCount} Casts`,
      precision: `Quality: ${qualityScore.toFixed(1)}`,
      potential: `FID: ${profile.fid}`
    }
  };
}
