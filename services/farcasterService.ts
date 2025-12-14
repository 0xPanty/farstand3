import { FarcasterProfile, StandStats, StandStatRawValues } from "../types";

// ==========================================
// 🔧 SECURITY FIX: All Neynar API calls moved to backend
// Frontend now calls /api/farcaster instead of direct API calls
// This prevents API key exposure in client-side code
// ==========================================

/**
 * Fetch Farcaster user data via backend API (secure)
 * @param fid - Farcaster ID
 * @returns FarcasterProfile with score, or null if not found
 */
export const fetchFarcasterUser = async (fid: number): Promise<(FarcasterProfile & { score?: number }) | null> => {
  try {
    console.log(`🔍 Fetching Farcaster data for FID: ${fid}`);
    
    const response = await fetch(`/api/farcaster?fid=${fid}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`❌ Farcaster API error: ${response.status}`);
      return null;
    }

    const data = await response.json();
    
    if (!data.profile) {
      console.warn('⚠️ No profile data received');
      return null;
    }

    console.log(`✅ Farcaster data loaded for @${data.profile.username}`);
    return data.profile;
    
  } catch (error) {
    console.error("❌ Farcaster Fetch Error:", error);
    return null;
  }
};

/**
 * Calculate Farcaster stats via backend API (secure)
 * @param profile - Farcaster profile data
 * @returns Stats and details
 */
export const calculateFarcasterStats = async (
  profile: FarcasterProfile & { score?: number }
): Promise<{ stats: StandStats; details: StandStatRawValues }> => {
  try {
    console.log(`🔍 Calculating stats for FID: ${profile.fid}`);
    
    const response = await fetch(`/api/farcaster?fid=${profile.fid}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`❌ Stats API error: ${response.status}`);
      // Return default stats on error
      return generateDefaultStats(profile);
    }

    const data = await response.json();
    
    if (data.stats && data.details) {
      console.log(`✅ Stats calculated:`, data.stats);
      return {
        stats: data.stats,
        details: data.details,
      };
    }

    // Fallback to default if incomplete data
    return generateDefaultStats(profile);
    
  } catch (error) {
    console.error("❌ Stats Calculation Error:", error);
    return generateDefaultStats(profile);
  }
};

/**
 * Generate default stats as fallback
 * @param profile - User profile
 * @returns Default stats based on basic metrics
 */
function generateDefaultStats(profile: FarcasterProfile): { stats: StandStats; details: StandStatRawValues } {
  // Simple fallback logic
  const followerCount = profile.followerCount || 0;
  const castCount = profile.castCount || 0;
  
  let power: 'A' | 'B' | 'C' | 'D' | 'E' = 'E';
  if (followerCount > 5000) power = 'A';
  else if (followerCount > 1000) power = 'B';
  else if (followerCount > 200) power = 'C';
  else if (followerCount > 50) power = 'D';

  let durability: 'A' | 'B' | 'C' | 'D' | 'E' = 'E';
  if (castCount > 3000) durability = 'A';
  else if (castCount > 1000) durability = 'B';
  else if (castCount > 300) durability = 'C';
  else if (castCount > 50) durability = 'D';

  return {
    stats: {
      power,
      speed: 'C',
      durability,
      precision: 'C',
      range: 'C',
      potential: 'C',
    },
    details: {
      power: `Followers: ${followerCount}`,
      speed: 'Default',
      durability: `Casts: ${castCount}`,
      precision: 'Default',
      range: 'Default',
      potential: `FID: ${profile.fid}`,
    },
  };
}
