import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '@vercel/postgres';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { dataUrl, url, filename } = req.body || {};
    let mime = 'image/png';
    let buffer: Buffer | null = null;

    if (dataUrl && typeof dataUrl === 'string') {
      const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (!match) return res.status(400).json({ error: 'Invalid data URL' });
      mime = match[1] || 'image/png';
      buffer = Buffer.from(match[2], 'base64');
    } else if (url && typeof url === 'string') {
      const r = await fetch(url);
      if (!r.ok) return res.status(400).json({ error: `Fetch failed ${r.status}` });
      const ab = await r.arrayBuffer();
      buffer = Buffer.from(ab);
      const ct = r.headers.get('content-type');
      if (ct) mime = ct.split(';')[0];
    } else {
      return res.status(400).json({ error: 'Missing dataUrl or url' });
    }

    if (!buffer) return res.status(400).json({ error: 'No image data' });

    // Check size limit (max 4MB for Vercel)
    if (buffer.length > 4 * 1024 * 1024) {
      return res.status(413).json({ error: 'Image too large, max 4MB' });
    }

    // Generate id
    const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;

    // Store as base64 string
    const base64Data = buffer.toString('base64');

    // Try to create table with new schema
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS stand_uploads_v2 (
          id VARCHAR(40) PRIMARY KEY,
          mime TEXT NOT NULL,
          base64_data TEXT NOT NULL,
          filename TEXT,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `;
    } catch (e) {
      // Table might exist, ignore
    }

    // Insert image data into v2 table
    await sql`INSERT INTO stand_uploads_v2 (id, mime, base64_data, filename) VALUES (${id}, ${mime}, ${base64Data}, ${filename || null})`;

    const host = (req.headers['x-forwarded-host'] || req.headers.host) as string;
    const proto = (req.headers['x-forwarded-proto'] as string) || 'https';
    const publicUrl = `${proto}://${host}/api/i/${id}`;

    return res.status(200).json({ url: publicUrl, id });
  } catch (err: any) {
    console.error('upload-image error:', err);
    return res.status(500).json({ error: 'Upload failed', details: err?.message });
  }
}
