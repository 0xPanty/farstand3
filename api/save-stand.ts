import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '@vercel/postgres';

/**
 * Save Stand to database
 * POST /api/save-stand
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { standData, farcasterUser } = req.body;

    if (!standData || !farcasterUser) {
      return res.status(400).json({ error: 'Missing standData or farcasterUser' });
    }

    // Create table if not exists (auto-migration)
    await sql`
      CREATE TABLE IF NOT EXISTS stands (
        id SERIAL PRIMARY KEY,
        fid INTEGER NOT NULL,
        username VARCHAR(255),
        display_name VARCHAR(255),
        pfp_url TEXT,
        stand_name VARCHAR(255) NOT NULL,
        gender VARCHAR(10),
        user_analysis TEXT,
        stand_description TEXT,
        ability TEXT,
        battle_cry TEXT,
        stats JSONB,
        stat_details JSONB,
        stand_image_url TEXT,
        sketch_image_url TEXT,
        visual_prompt TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;

    // Create index on fid for faster queries
    await sql`
      CREATE INDEX IF NOT EXISTS idx_stands_fid ON stands(fid)
    `;

    // Create index on created_at for gallery sorting
    await sql`
      CREATE INDEX IF NOT EXISTS idx_stands_created_at ON stands(created_at DESC)
    `;

    // Check if user already has a stand, update it
    const existing = await sql`
      SELECT id FROM stands WHERE fid = ${farcasterUser.fid}
    `;

    let result;
    if (existing.rows.length > 0) {
      // Update existing
      result = await sql`
        UPDATE stands SET
          username = ${farcasterUser.username},
          display_name = ${farcasterUser.displayName},
          pfp_url = ${farcasterUser.pfpUrl},
          stand_name = ${standData.standName},
          gender = ${standData.gender || 'MALE'},
          user_analysis = ${standData.userAnalysis},
          stand_description = ${standData.standDescription},
          ability = ${standData.ability},
          battle_cry = ${standData.battleCry},
          stats = ${JSON.stringify(standData.stats)},
          stat_details = ${JSON.stringify(standData.statDetails || {})},
          stand_image_url = ${standData.standImageUrl || null},
          sketch_image_url = ${standData.sketchImageUrl || null},
          visual_prompt = ${standData.visualPrompt || null},
          updated_at = NOW()
        WHERE fid = ${farcasterUser.fid}
        RETURNING id
      `;
    } else {
      // Insert new
      result = await sql`
        INSERT INTO stands (
          fid, username, display_name, pfp_url,
          stand_name, gender, user_analysis, stand_description,
          ability, battle_cry, stats, stat_details,
          stand_image_url, sketch_image_url, visual_prompt
        ) VALUES (
          ${farcasterUser.fid},
          ${farcasterUser.username},
          ${farcasterUser.displayName},
          ${farcasterUser.pfpUrl},
          ${standData.standName},
          ${standData.gender || 'MALE'},
          ${standData.userAnalysis},
          ${standData.standDescription},
          ${standData.ability},
          ${standData.battleCry},
          ${JSON.stringify(standData.stats)},
          ${JSON.stringify(standData.statDetails || {})},
          ${standData.standImageUrl || null},
          ${standData.sketchImageUrl || null},
          ${standData.visualPrompt || null}
        )
        RETURNING id
      `;
    }

    const standId = result.rows[0].id;

    return res.status(200).json({
      success: true,
      standId,
      message: existing.rows.length > 0 ? 'Stand updated' : 'Stand saved'
    });

  } catch (error: any) {
    console.error('Database error:', error);
    return res.status(500).json({
      error: 'Failed to save Stand',
      details: error.message
    });
  }
}
