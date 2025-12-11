// Frontend Service - Calls Backend API (Secure)
import { StandResult, StandStats, StandStatRawValues } from "../types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
const GOOGLE_AI_API_KEY = import.meta.env.VITE_GOOGLE_AI_API_KEY || 'AIzaSyCYourApiKeyHere';

export const analyzeUserAndGenerateStand = async (
  base64UserImage: string, 
  farcasterData?: { stats: StandStats; details: StandStatRawValues },
  farcasterBio?: string
): Promise<StandResult> => {
  // Step 1: Analyze and generate Stand profile
  const analyzeResponse = await fetch(`${API_BASE_URL}/generate-stand`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      base64Image: base64UserImage,
      action: 'analyze',
      farcasterStats: farcasterData?.stats,
      farcasterBio
    })
  });

  if (!analyzeResponse.ok) {
    const error = await analyzeResponse.json();
    throw new Error(error.error || 'Analysis failed');
  }

  const profile = await analyzeResponse.json();

  // Step 2: Generate visuals if we have a visual prompt
  let standImageUrl: string | undefined;
  
  if (profile.visualPrompt) {
    try {
      const visualResponse = await fetch(`${API_BASE_URL}/generate-stand`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          base64Image: base64UserImage,
          action: 'visualize',
          visualPrompt: profile.visualPrompt
        })
      });

      if (visualResponse.ok) {
        const visualData = await visualResponse.json();
        standImageUrl = visualData.standImageUrl;
      }
    } catch (e) {
      console.error('Visual generation failed:', e);
    }
  }

  return {
    ...profile,
    statDetails: farcasterData?.details,
    standImageUrl
  };
};
