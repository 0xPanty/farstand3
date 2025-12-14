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
    else if (action === 'sketch') {
      // Generate pencil sketch style image for receipt printer
      const sketchUrl = await generateSketchImage(base64Image);
      return res.status(200).json({ sketchImageUrl: sketchUrl });
    }
    else {
      return res.status(400).json({ error: 'Invalid action. Use "analyze", "visualize", or "sketch"' });
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
    ? 
      CRITICAL INSTRUCTION:
      You MUST use the following Stats for the Stand. DO NOT GENERATE RANDOM STATS.
      - Power: 
      - Speed: 
      - Range: 
      - Durability: 
      - Precision: 
      - Potential: 
      
      However, you MUST still interpret WHY these stats are the way they are based on the user's visual vibe + bio.
     
    : "Determine the stats (A-E) based on the 'aura' and intensity of the person in the image.";

  const bioInstruction = userBio 
    ? The user's personality/bio is: "". Use this to theme the Stand Name and Ability. 
    : "";

  const systemInstruction = 
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

    
    

    JSON OUTPUT REQUIRED.
  ;

  const prompt = 
    Analyze this image.
    
    1. **IDENTIFY GENDER FIRST (CRITICAL)**: Carefully analyze the person in the image to determine their gender.
       - Look at facial features, hairstyle, clothing, body structure.
       - Set gender to either "MALE" or "FEMALE" based on your analysis.
    
    2. Is it Human or Non-Human?
    3. Define Stats.
    4. Create Stand Name & Ability.
    5. **Construct 'visualPrompt'** - GENDER MUST MATCH THE INPUT:
       - **Subject**: "A [MALE/FEMALE - MUST MATCH INPUT GENDER] Stand User in Hirohiko Araki style. Lean, angular, fashion model physique."
       - **Gender Consistency Rule**: 
         * If input is MALE → User MUST be male, Stand MUST have masculine features
         * If input is FEMALE → User MUST be female, Stand MUST have feminine features
       - **Clothing**: Describe high-fashion gear inspired by input. **Avoid bulky/puffy clothes.**
       - **User Pose**: "Striking an impossible fashion pose, angular limbs, dramatic hands."
       - **Stand Visuals**: "A [Gender-matching] Spirit Stand [Stand Name] appearing behind/around the user. [Stand Description]."
       - **Stand Action**: "The Stand is striking a wild, contorted JoJo pose that complements the user. It is [punching/posing/yelling/floating dynamically]."
       - **Composition**: "The Stand and User are visually connected, creating a cohesive silhouette. Thick black contour lines, vibrant colors, heavy manga shading."
       - **Background**: "Psychadelic patterns, manga speed lines, floating Katakana SFX 'ゴゴゴ'."
       - **Constraint**: "NO TEXT, NO TITLES, NO LOGOS. Pure Illustration."
  ;

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

  // ==========================================
  // 🔧 IMPROVED: Enhanced JSON parsing with error handling
  // ==========================================
  const text = response.text;
  if (!text) {
    console.error('❌ Empty response from Gemini API');
    throw new Error("No response from Gemini. Please try again.");
  }
  
  // Clean potential markdown code blocks or extra whitespace
  let cleanText = text.trim();
  if (cleanText.startsWith('`json')) {
    cleanText = cleanText.replace(/^`json\n?/, '').replace(/\n?`$/, '');
  } else if (cleanText.startsWith('`')) {
    cleanText = cleanText.replace(/^`\n?/, '').replace(/\n?`$/, '');
  }
  
  // Parse JSON with detailed error handling
  let result: any;
  try {
    result = JSON.parse(cleanText);
  } catch (parseError: any) {
    console.error('❌ JSON Parse Error:', parseError.message);
    console.error('📄 Raw response (first 500 chars):', text.substring(0, 500));
    console.error('📄 Cleaned text (first 500 chars):', cleanText.substring(0, 500));
    throw new Error('Failed to parse AI response. The image may be unclear - please try uploading a clearer photo with better lighting.');
  }
  
  // Validate and fix gender field
  if (!result.gender || !['MALE', 'FEMALE'].includes(result.gender.toUpperCase())) {
    console.warn('⚠️ Invalid or missing gender value:', result.gender, '- defaulting to MALE');
    result.gender = 'MALE';
  } else {
    // Normalize to uppercase
    result.gender = result.gender.toUpperCase();
  }
  
  // Validate required fields
  const requiredFields = ['standName', 'userAnalysis', 'standDescription', 'ability', 'battleCry', 'stats', 'visualPrompt'];
  const missingFields = requiredFields.filter(field => !result[field]);
  if (missingFields.length > 0) {
    console.error('❌ Missing required fields:', missingFields);
    throw new Error(Incomplete AI response (missing: ). Please try again with a different photo.);
  }
  
  // Validate stats object
  if (!result.stats || typeof result.stats !== 'object') {
    console.error('❌ Invalid stats object:', result.stats);
    throw new Error('Invalid stats generated. Please try again.');
  }
  
  const statFields = ['power', 'speed', 'range', 'durability', 'precision', 'potential'];
  const validStatValues = ['A', 'B', 'C', 'D', 'E', 'N/A'];
  for (const statField of statFields) {
    if (!result.stats[statField] || !validStatValues.includes(result.stats[statField])) {
      console.warn(⚠️ Invalid stat value for :, result.stats[statField], '- defaulting to C');
      result.stats[statField] = 'C';
    }
  }
  
  // Override with forced stats if provided
  if (forcedStats) {
    console.log('✅ Applying forced stats from Farcaster data');
    result.stats = forcedStats;
  }
  
  console.log('✅ Stand profile generated successfully:', {
    standName: result.standName,
    gender: result.gender,
    stats: result.stats
  });
  
  return result;
}

// ==========================================
// Generate Stand Visuals (Image-to-Image)
// ==========================================
async function generateStandVisuals(originalImageBase64: string, visualPrompt: string): Promise<string> {
  const modelId = "gemini-2.5-flash-image"; // Stable version - works reliably with your $300 credit

  const cleanBase64 = originalImageBase64.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");

  const finalPrompt = 
    
    
    CRITICAL ART DIRECTION (ARAKI STYLE):
    1. **MANDATORY: FULL COLOR ILLUSTRATION** - This MUST be a vibrant, fully colored artwork. NO black-and-white sketches, NO grayscale. Use rich, saturated colors.
    2. **PHYSIQUE**: Characters must be LEAN, ANGULAR, and FASHIONABLE (Golden Wind / Stone Ocean style). **NO** puffy jackets, **NO** mascot suits, **NO** round bodies.
    3. **DOUBLE POSE**: BOTH the User AND the Stand must be posing dramatically. 
       - The Stand should NOT be static. It must look alive, menacing, and active (e.g. winding around user, punching forward, or mirroring the user's contortion).
    4. **INTEGRATION**: The Stand should feel connected to the user, not just pasted in the background.
    5. **COMPOSITION**: Vertical Manga Illustration with detailed cross-hatching shading.
    6. **SFX**: Visible Japanese sound effects (Katakana 'ゴゴゴ') integrated into the art are okay.
    7. **FACE**: Sharp jawline, detailed eyes, heavy shading lines on face with full color rendering.
    8. **COLORS**: Bizarre, high-contrast color palettes (e.g. green lips, purple skies, bold outfit colors).
    9. **RENDERING QUALITY**: Professional manga colorization with cell-shading, highlights, and shadows. NOT a rough sketch.
  ;

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
    config: {
      temperature: 0.7, // Reduced for more consistent quality
      topP: 0.95,
      topK: 40,
    },
  });

  const parts = response.candidates?.[0]?.content?.parts;
  if (!parts) throw new Error("No image generated.");

  for (const part of parts) {
    if (part.inlineData && part.inlineData.data) {
      return data:;base64,;
    }
  }
  
  throw new Error("No inline image data found.");
}

// ==========================================
// Generate Sketch Image (Pencil/Ink Style for Receipt)
// ==========================================
async function generateSketchImage(standImageBase64: string): Promise<string> {
  const modelId = "gemini-2.5-flash-image";

  const cleanBase64 = standImageBase64.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");

  const sketchPrompt = 
    Create a HAND-DRAWN PENCIL SKETCH portrait of the character in this image.
    
    CRITICAL REQUIREMENTS:
    1. **CREAM/OFF-WHITE BACKGROUND** - Background color: #f8f8f5 (warm paper tone). NO pure white.
    2. **CLOSE-UP PORTRAIT** - Draw only HEAD and UPPER CHEST/SHOULDERS. Fill the entire frame. Face should be LARGE and prominent.
    3. **AUTHENTIC HAND-DRAWN FEEL**:
       - Visible pencil strokes and texture
       - Slightly rough, imperfect lines (NOT clean vector lines)
       - Cross-hatching and scribble shading like real pencil
       - Some areas can be loose/sketchy, not everything perfectly defined
       - Smudge effects where shading blends
       - Vary line weight - heavier for outlines, lighter for details
    4. **NO Stand spirit, NO effects, NO SFX text** - ONLY the human character
    5. **STYLE**: Like a quick portrait sketch in an artist's moleskine notebook. Raw, expressive, with visible artistic hand.
    6. **FILL THE FRAME** - The face/head should take up 70-80% of the image. Crop tight.
    7. **WARM TONES** - Use sepia/brown tones for the pencil work, not pure black. Like a graphite or charcoal sketch on cream paper.
    
    DO NOT make it look AI-generated or too clean. It should look like a human artist drew it quickly but skillfully.
  ;

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
          text: sketchPrompt,
        },
      ],
    },
    config: {
      temperature: 0.7, // Reduced for more consistent quality
      topP: 0.95,
      topK: 40,
    },
  });

  const parts = response.candidates?.[0]?.content?.parts;
  if (!parts) throw new Error("No sketch image generated.");

  for (const part of parts) {
    if (part.inlineData && part.inlineData.data) {
      return data:;base64,;
    }
  }
  
  throw new Error("No sketch image data found.");
}
