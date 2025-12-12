import type { VercelRequest, VercelResponse } from '@vercel/node';
import { put } from '@vercel/blob';

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

    // Check size limit (max 4MB)
    if (buffer.length > 4 * 1024 * 1024) {
      return res.status(413).json({ error: 'Image too large, max 4MB' });
    }

    // Generate filename
    const ext = mime.split('/')[1] || 'png';
    const blobFilename = filename || `stand_${Date.now()}.${ext}`;

    // Upload to Vercel Blob
    const blob = await put(blobFilename, buffer, {
      access: 'public',
      contentType: mime,
    });

    return res.status(200).json({ url: blob.url, id: blob.url });
  } catch (err: any) {
    console.error('upload-image error:', err);
    return res.status(500).json({ error: 'Upload failed', details: err?.message });
  }
}
