import type { VercelRequest, VercelResponse } from '@vercel/node';

const ETH_RPC_URL = "https://cloudflare-eth.com";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  const { address } = req.query;
  
  if (!address) {
    return res.status(400).json({ error: 'Missing address parameter' });
  }

  try {
    console.log("Testing TX count for:", address);
    
    const response = await fetch(ETH_RPC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "eth_getTransactionCount",
        params: [address, "latest"],
        id: 1,
      }),
    });
    
    const responseText = await response.text();
    console.log("RPC raw response:", responseText);
    
    const data = JSON.parse(responseText);
    console.log("RPC parsed data:", data);
    
    if (data.error) {
      return res.status(200).json({
        address,
        error: data.error,
        txCount: 0
      });
    }
    
    const count = parseInt(data.result, 16);
    
    return res.status(200).json({
      address,
      hexResult: data.result,
      txCount: count,
      success: true
    });
    
  } catch (e: any) {
    console.error("Test TX error:", e);
    return res.status(500).json({
      address,
      error: e.message,
      txCount: 0
    });
  }
}
