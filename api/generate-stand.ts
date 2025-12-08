import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers for local development
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { base64Image, action, farcasterStats, farcasterBio, visualPrompt } = req.body;

    if (!base64Image) {
      return res.status(400).json({ error: 'Missing base64Image' });
    }

    // Action: 'analyze' or 'visualize'
    if (action === 'analyze') {
      const profile = await generateStandProfile(base64Image, farcasterStats, farcasterBio);
      return res.status(200).json(profile);
    } 
    else if (action === 'visualize') {
      if (!visualPrompt) {
        return res.status(400).json({ error: 'Missing visualPrompt for visualization' });
      }
      const imageUrl = await generateStandVisuals(base64Image, visualPrompt);
      return res.status(200).json({ standImageUrl: imageUrl });
    }
    else {
      return res.status(400).json({ error: 'Invalid action. Use "analyze" or "visualize"' });
    }

  } catch (error: any) {
    console.error('Stand Generation Error:', error);
    return res.status(500).json({ error: error.message || 'Stand generation failed' });
  }
}

// ==========================================
// Generate Stand Profile (Analysis)
// ==========================================
async function generateStandProfile(
  base64Image: string, 
  forcedStats?: any,
  userBio?: string
): Promise<any> {
  const modelId = "gemini-2.5-flash";

  const statInstruction = forcedStats 
    ? `
      CRITICAL INSTRUCTION:
      You MUST use the following Stats for the Stand. DO NOT GENERATE RANDOM STATS.
      - Power: ${forcedStats.power}
      - Speed: ${forcedStats.speed}
      - Range: ${forcedStats.range}
      - Durability: ${forcedStats.durability}
      - Precision: ${forcedStats.precision}
      - Potential: ${forcedStats.potential}
      
      However, you MUST still interpret WHY these stats are the way they are based on the user's visual vibe + bio.
    ` 
    : "Determine the stats (A-E) based on the 'aura' and intensity of the person in the image.";

  const bioInstruction = userBio 
    ? `The user's personality/bio is: "${userBio}". Use this to theme the Stand Name and Ability.` 
    : "";

  const systemInstruction = `
    You are a specialized AI for "JoJo's Bizarre Adventure" (Hirohiko Araki Style).
    
    TASK:
    1. Analyze the input image content.
    2. **TRANSFORMATION LOGIC (CRITICAL)**:
       - **IF HUMAN INPUT**: Stylize into Araki's art style (Part 5 Golden Wind / Part 9 JOJOLands). Keep likeness but make features sharp, shaded, and stylish.
       - **IF NON-HUMAN INPUT (Monster, Animal, Object)**: PERFORM **HIGH-FASHION GIJINKA**.
         - **STRICT RULE**: The output User must be a **LEAN, ATTRACTIVE HUMAN**.
         - **FORBIDDEN**: Do NOT generate mascot suits, kigurumi, puffy costumes, or round body types.
         - **METHOD**: Translate the object's texture/color into **Tailored Clothing** (e.g., yellow scales become a tight yellow patterned vest; fur becomes a stylish collar).
         - **PHYSIQUE**: Slender, muscular, angular (Araki anatomy).
    3. **USER POSE**: The user MUST be striking an **EXTREME "JoJo Pose"** (JoJo-dachi). 
       - Contorted limbs, dramatic perspective, hand covering face, leaning back, etc.
    4. **STAND POSE & INTEGRATION (CRITICAL)**: 
       - The Stand must NOT be a static statue behind the user.
       - **ACTION**: The Stand must be performing a dynamic action (punching rush, screaming, winding around the user, or mirroring the user's pose).
       - **SYNERGY**: The User and Stand should overlap visually or interact (e.g. Stand's hands on User's shoulders, or back-to-back combat stance).
    5. **COMPOSITION**: Vertical Manga Illustration. Dynamic duo composition.
    6. **SFX**: Include Japanese manga sound effects (ゴゴゴ, ドドーン) in the background.

    ${statInstruction}
    ${bioInstruction}

    JSON OUTPUT REQUIRED.
  `;

  const prompt = `
    Analyze this image.
    
    1. Is it Human or Non-Human?
    2. Define Gender & Stats.
    3. Create Stand Name & Ability.
    4. **Construct 'visualPrompt'**:
       - **Subject**: "A [Male/Female] Stand User in Hirohiko Araki style. Lean, angular, fashion model physique."
       - **Clothing**: Describe high-fashion gear inspired by input. **Avoid bulky/puffy clothes.**
       - **User Pose**: "Striking an impossible fashion pose, angular limbs, dramatic hands."
       - **Stand Visuals**: "A Spirit Stand [Stand Name] appearing behind/around the user. [Stand Description]."
       - **Stand Action**: "The Stand is striking a wild, contorted JoJo pose that complements the user. It is [punching/posing/yelling/floating dynamically]."
       - **Composition**: "The Stand and User are visually connected, creating a cohesive silhouette. Thick black contour lines, vibrant colors, heavy manga shading."
       - **Background**: "Psychadelic patterns, manga speed lines, floating Katakana SFX 'ゴゴゴ'."
       - **Constraint**: "NO TEXT, NO TITLES, NO LOGOS. Pure Illustration."
  `;

  const cleanBase64 = base64Image.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");

  const response = await ai.models.generateContent({
    model: modelId,
    contents: {
      parts: [
        { inlineData: { mimeType: "image/jpeg", data: cleanBase64 } },
        { text: prompt }
      ]
    },
    config: {
      systemInstruction: systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          standName: { type: Type.STRING },
          gender: { type: Type.STRING, enum: ['MALE', 'FEMALE'] },
          userAnalysis: { type: Type.STRING, description: "Analysis of the input and how it was humanized/stylized." },
          standDescription: { type: Type.STRING, description: "Description of the Stand's appearance." },
          ability: { type: Type.STRING },
          battleCry: { type: Type.STRING },
          visualPrompt: { type: Type.STRING, description: "The detailed prompt for the image generator." },
          stats: {
            type: Type.OBJECT,
            properties: {
              power: { type: Type.STRING, enum: ['A', 'B', 'C', 'D', 'E', 'N/A'] },
              speed: { type: Type.STRING, enum: ['A', 'B', 'C', 'D', 'E', 'N/A'] },
              range: { type: Type.STRING, enum: ['A', 'B', 'C', 'D', 'E', 'N/A'] },
              durability: { type: Type.STRING, enum: ['A', 'B', 'C', 'D', 'E', 'N/A'] },
              precision: { type: Type.STRING, enum: ['A', 'B', 'C', 'D', 'E', 'N/A'] },
              potential: { type: Type.STRING, enum: ['A', 'B', 'C', 'D', 'E', 'N/A'] },
            },
            required: ['power', 'speed', 'range', 'durability', 'precision', 'potential']
          }
        },
        required: ['standName', 'gender', 'userAnalysis', 'standDescription', 'ability', 'battleCry', 'stats', 'visualPrompt']
      }
    }
  });

  const text = response.text;
  if (!text) throw new Error("No response from Gemini.");
  
  const result = JSON.parse(text);
  if (forcedStats) {
    result.stats = forcedStats;
  }
  
  return result;
}

// ==========================================
// Generate Stand Visuals (Image-to-Image)
// ==========================================
async function generateStandVisuals(originalImageBase64: string, visualPrompt: string): Promise<string> {
  const modelId = "gemini-2.5-flash-image";

  const cleanBase64 = originalImageBase64.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");

  const finalPrompt = `
    ${visualPrompt}
    
    CRITICAL ART DIRECTION (ARAKI STYLE):
    1. **PHYSIQUE**: Characters must be LEAN, ANGULAR, and FASHIONABLE (Golden Wind / Stone Ocean style). **NO** puffy jackets, **NO** mascot suits, **NO** round bodies.
    2. **DOUBLE POSE**: BOTH the User AND the Stand must be posing dramatically. 
       - The Stand should NOT be static. It must look alive, menacing, and active (e.g. winding around user, punching forward, or mirroring the user's contortion).
    3. **INTEGRATION**: The Stand should feel connected to the user, not just pasted in the background.
    4. **COMPOSITION**: Vertical Manga Illustration.
    5. **SFX**: Visible Japanese sound effects (Katakana 'ゴゴゴ') integrated into the art are okay.
    6. **FACE**: Sharp jawline, detailed eyes, heavy shading lines on face.
    7. **COLORS**: Bizarre, high-contrast color palettes (e.g. green lips, purple skies).
  `;

  const response = await ai.models.generateContent({
    model: modelId,
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: 'image/jpeg',
            data: cleanBase64,
          },
        },
        {
          text: finalPrompt,
        },
      ],
    },
    config: {},
  });

  const parts = response.candidates?.[0]?.content?.parts;
  if (!parts) throw new Error("No image generated.");

  for (const part of parts) {
    if (part.inlineData && part.inlineData.data) {
      return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
  }
  
  throw new Error("No inline image data found.");
}
