import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '@vercel/postgres';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { id } = req.query as { id: string };
    if (!id) return res.status(400).send('Missing id');

    // Try v2 table first (new format), then fallback to old table
    let result: any = { rows: [] };
    try {
      result = await sql`SELECT mime, base64_data FROM stand_uploads_v2 WHERE id = ${id} LIMIT 1`;
    } catch (e) {
      // v2 table might not exist, ignore
    }
    if (result.rows.length === 0) {
      try {
        result = await sql`SELECT mime, data, base64_data FROM stand_uploads WHERE id = ${id} LIMIT 1`;
      } catch (e) {
        // old table might not exist either
      }
    }
    if (result.rows.length === 0) return res.status(404).send('Not found');

    const row: any = result.rows[0];
    const mime: string = row.mime || 'application/octet-stream';
    
    // Support both old BYTEA format and new base64 format
    let imageBuffer: Buffer;
    if (row.base64_data) {
      // New format: base64 string
      imageBuffer = Buffer.from(row.base64_data, 'base64');
    } else if (row.data) {
      // Old format: BYTEA
      imageBuffer = Buffer.isBuffer(row.data) ? row.data : Buffer.from(row.data);
    } else {
      return res.status(404).send('No image data');
    }

    res.setHeader('Content-Type', mime);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.status(200).send(imageBuffer);
  } catch (err: any) {
    console.error('get-image error:', err);
    res.status(500).send('Server error');
  }
}
