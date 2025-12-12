import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '@vercel/postgres';

/**
 * Generate 3:2 OG image for sharing
 * Redirects to the stand image (Farcaster will handle display)
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { fid } = req.query as { fid: string };
    
    if (!fid) {
      return res.status(400).send('Missing fid');
    }

    const result = await sql`
      SELECT stand_image_url FROM stands WHERE fid = ${parseInt(fid)} LIMIT 1
    `;

    if (result.rows.length === 0 || !result.rows[0].stand_image_url) {
      // Fallback to logo
      return res.redirect(302, 'https://farstand3.vercel.app/logo.png');
    }

    const imageUrl = result.rows[0].stand_image_url;
    
    // Redirect to the actual image
    // Farcaster will fetch and display it
    res.setHeader('Cache-Control', 'public, max-age=3600');
    return res.redirect(302, imageUrl);
    
  } catch (err: any) {
    console.error('OG image error:', err);
    return res.redirect(302, 'https://farstand3.vercel.app/logo.png');
  }
}
