import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '@vercel/postgres';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { id } = req.query as { id: string };
    if (!id) return res.status(400).send('Missing id');

    const result = await sql`SELECT mime, data FROM stand_uploads WHERE id = ${id} LIMIT 1`;
    if (result.rows.length === 0) return res.status(404).send('Not found');

    const row: any = result.rows[0];
    const mime: string = row.mime || 'application/octet-stream';
    const data: any = row.data; // pg returns Buffer for bytea

    res.setHeader('Content-Type', mime);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.status(200).send(Buffer.isBuffer(data) ? data : Buffer.from(data));
  } catch (err: any) {
    console.error('get-image error:', err);
    res.status(500).send('Server error');
  }
}
