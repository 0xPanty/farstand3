import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '@vercel/postgres';

/**
 * Share page for a Stand - Returns HTML with OpenGraph and fc:miniapp metadata
 * GET /api/share/[fid]
 * 
 * This endpoint is designed to be used as an embed URL in Farcaster casts.
 * It returns proper OG tags so the Stand image appears in the cast preview.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { fid } = req.query as { fid: string };
    
    if (!fid) {
      return res.status(400).send('Missing fid');
    }

    // Fetch stand data from database
    const result = await sql`
      SELECT 
        fid, username, display_name, stand_name, 
        stand_description, ability, stand_image_url,
        stats
      FROM stands 
      WHERE fid = ${parseInt(fid)} 
      LIMIT 1
    `;

    if (result.rows.length === 0) {
      return res.status(404).send('Stand not found');
    }

    const stand = result.rows[0];
    const baseUrl = 'https://farstand3.vercel.app';
    
    // Use the stand image or fallback to logo
    const imageUrl = stand.stand_image_url || `${baseUrl}/logo.png`;
    const standName = stand.stand_name || 'Unknown Stand';
    const username = stand.username || 'Anonymous';
    const description = stand.stand_description || stand.ability || `A unique Stand created by @${username}`;
    
    // Truncate description for OG
    const ogDescription = description.length > 200 
      ? description.substring(0, 197) + '...' 
      : description;

    // Build fc:miniapp embed JSON
    const miniAppEmbed = JSON.stringify({
      version: "1",
      imageUrl: imageUrl,
      button: {
        title: "Awaken Your Stand",
        action: {
          type: "launch_miniapp",
          name: "Farstand",
          url: baseUrl,
          splashImageUrl: `${baseUrl}/logo.png`,
          splashBackgroundColor: "#0f0015"
        }
      }
    });
    
    // Build fc:frame embed JSON (backward compatibility)
    const frameEmbed = JSON.stringify({
      version: "1",
      imageUrl: imageUrl,
      button: {
        title: "Awaken Your Stand",
        action: {
          type: "launch_frame",
          name: "Farstand",
          url: baseUrl,
          splashImageUrl: `${baseUrl}/logo.png`,
          splashBackgroundColor: "#0f0015"
        }
      }
    });

    // Return HTML with OpenGraph and fc:miniapp metadata
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${standName} - Stand by @${username}</title>
  
  <!-- OpenGraph Meta Tags -->
  <meta property="og:type" content="website">
  <meta property="og:title" content="${standName}">
  <meta property="og:description" content="${ogDescription}">
  <meta property="og:image" content="${imageUrl}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="800">
  <meta property="og:url" content="${baseUrl}/api/share/${fid}">
  <meta property="og:site_name" content="Farstand">
  
  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${standName}">
  <meta name="twitter:description" content="${ogDescription}">
  <meta name="twitter:image" content="${imageUrl}">
  
  <!-- Farcaster Mini App Embed -->
  <meta name="fc:miniapp" content='${miniAppEmbed.replace(/'/g, "&#39;")}'>
  <!-- Backward compatibility -->
  <meta name="fc:frame" content='${frameEmbed.replace(/'/g, "&#39;")}'>
  
  <!-- Redirect to app after brief delay -->
  <meta http-equiv="refresh" content="0;url=${baseUrl}">
  
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0f0015;
      color: white;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      margin: 0;
      text-align: center;
    }
    .container {
      padding: 20px;
    }
    h1 {
      color: #db2777;
      margin-bottom: 10px;
    }
    p {
      color: #888;
    }
    a {
      color: #db2777;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>${standName}</h1>
    <p>Stand by @${username}</p>
    <p>Redirecting to Farstand...</p>
    <p><a href="${baseUrl}">Click here if not redirected</a></p>
  </div>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    return res.status(200).send(html);

  } catch (err: any) {
    console.error('share page error:', err);
    return res.status(500).send('Server error');
  }
}
