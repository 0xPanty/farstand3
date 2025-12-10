import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Upload Stand metadata to IPFS via Pinata
 * Used before minting the NFT
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { standData, fid } = req.body;

  if (!standData) {
    return res.status(400).json({ error: 'Missing standData' });
  }

  try {
    const PINATA_API_KEY = process.env.PINATA_API_KEY;
    const PINATA_SECRET_KEY = process.env.PINATA_SECRET_KEY;

    if (!PINATA_API_KEY || !PINATA_SECRET_KEY) {
      throw new Error('Pinata credentials not configured');
    }

    // 1. Upload image to IPFS (if standImageUrl is base64)
    let imageIpfsUrl = standData.standImageUrl;
    
    if (standData.standImageUrl && standData.standImageUrl.startsWith('data:image')) {
      // Convert base64 to buffer
      const base64Data = standData.standImageUrl.split(',')[1];
      const buffer = Buffer.from(base64Data, 'base64');
      
      const imageFormData = new FormData();
      const blob = new Blob([buffer], { type: 'image/png' });
      imageFormData.append('file', blob, `stand-${fid}.png`);
      
      const imageUploadResponse = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
        method: 'POST',
        headers: {
          'pinata_api_key': PINATA_API_KEY,
          'pinata_secret_api_key': PINATA_SECRET_KEY,
        },
        body: imageFormData,
      });

      const imageResult = await imageUploadResponse.json();
      imageIpfsUrl = `ipfs://${imageResult.IpfsHash}`;
      console.log('✅ Image uploaded to IPFS:', imageIpfsUrl);
    }

    // 2. Create NFT metadata (OpenSea standard)
    const metadata = {
      name: standData.standName.replace(/[『』]/g, ''),
      description: standData.standDescription,
      image: imageIpfsUrl,
      external_url: `https://farstand3.vercel.app`,
      attributes: [
        {
          trait_type: "Power",
          value: standData.stats.power
        },
        {
          trait_type: "Speed",
          value: standData.stats.speed
        },
        {
          trait_type: "Range",
          value: standData.stats.range
        },
        {
          trait_type: "Durability",
          value: standData.stats.durability
        },
        {
          trait_type: "Precision",
          value: standData.stats.precision
        },
        {
          trait_type: "Potential",
          value: standData.stats.potential
        },
        {
          trait_type: "Ability",
          value: standData.ability
        },
        {
          trait_type: "Battle Cry",
          value: standData.battleCry
        },
        {
          trait_type: "Farcaster FID",
          value: fid || 0
        }
      ]
    };

    // 3. Upload metadata JSON to IPFS
    const metadataResponse = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'pinata_api_key': PINATA_API_KEY,
        'pinata_secret_api_key': PINATA_SECRET_KEY,
      },
      body: JSON.stringify({
        pinataContent: metadata,
        pinataMetadata: {
          name: `${standData.standName}-metadata.json`
        }
      }),
    });

    const metadataResult = await metadataResponse.json();
    const tokenURI = `ipfs://${metadataResult.IpfsHash}`;

    console.log('✅ Metadata uploaded to IPFS:', tokenURI);

    return res.status(200).json({
      success: true,
      tokenURI,
      metadata,
      imageIpfsUrl
    });

  } catch (error: any) {
    console.error('❌ IPFS upload error:', error);
    return res.status(500).json({
      error: 'Failed to upload to IPFS',
      details: error.message
    });
  }
}
