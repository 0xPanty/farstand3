import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '@vercel/postgres';

/**
 * Get a single Stand by FID
 * GET /api/get-stand?fid=123
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
    const fid = req.query.fid as string;

    if (!fid) {
      return res.status(400).json({ error: 'Missing fid parameter' });
    }

    const result = await sql`
      SELECT * FROM stands
      WHERE fid = ${parseInt(fid)}
      LIMIT 1
    `;

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false,
        error: 'Stand not found' 
      });
    }

    return res.status(200).json({
      success: true,
      stand: result.rows[0]
    });

  } catch (error: any) {
    console.error('Database error:', error);
    return res.status(500).json({
      error: 'Failed to fetch Stand',
      details: error.message
    });
  }
}
