import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '@vercel/postgres';

/**
 * Get gallery of all Stands
 * GET /api/get-gallery?limit=50&offset=0
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    // Get stands ordered by most recent
    const result = await sql`
      SELECT 
        id,
        fid,
        username,
        display_name,
        pfp_url,
        stand_name,
        gender,
        stand_description,
        ability,
        battle_cry,
        stats,
        stand_image_url,
        created_at,
        updated_at
      FROM stands
      ORDER BY created_at DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `;

    // Get total count
    const countResult = await sql`
      SELECT COUNT(*) as total FROM stands
    `;

    const total = parseInt(countResult.rows[0].total);

    return res.status(200).json({
      success: true,
      stands: result.rows,
      total,
      limit,
      offset,
      hasMore: offset + limit < total
    });

  } catch (error: any) {
    console.error('Database error:', error);
    return res.status(500).json({
      error: 'Failed to fetch gallery',
      details: error.message
    });
  }
}
