import { sdk } from '@farcaster/frame-sdk';

// ABI for the StandNFT contract (only the mint function we need)
const STAND_NFT_ABI = [
  {
    "inputs": [
      { "internalType": "address", "name": "to", "type": "address" },
      { "internalType": "uint256", "name": "fid", "type": "uint256" },
      { "internalType": "string", "name": "tokenURI", "type": "string" }
    ],
    "name": "mint",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "totalSupply",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
];

const CONTRACT_ADDRESS = import.meta.env.VITE_STAND_NFT_CONTRACT || '';
const BASE_CHAIN_ID = '0x2105'; // Base mainnet (8453)

export interface MintResult {
  success: boolean;
  transactionHash?: string;
  tokenId?: number;
  error?: string;
}

/**
 * Mint Stand NFT using Farcaster SDK wallet
 */
export async function mintStandNFT(
  standData: any,
  fid: number,
  userAddress: string
): Promise<MintResult> {
  try {
    console.log('🎯 Starting mint process...');

    if (!CONTRACT_ADDRESS) {
      throw new Error('Contract address not configured');
    }

    // Step 1: Upload metadata to IPFS
    console.log('📤 Uploading metadata to IPFS...');
    const uploadResponse = await fetch('/api/upload-metadata', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ standData, fid }),
    });

    if (!uploadResponse.ok) {
      const error = await uploadResponse.json();
      throw new Error(`IPFS upload failed: ${error.details || error.error}`);
    }

    const { tokenURI } = await uploadResponse.json();
    console.log('✅ Metadata uploaded:', tokenURI);

    // Step 2: Encode mint function call
    const mintData = encodeMintCall(userAddress, fid, tokenURI);

    // Step 3: Send transaction via Farcaster SDK
    console.log('💰 Requesting transaction from wallet...');
    
    const transactionId = await sdk.wallet.sendTransaction({
      chainId: BASE_CHAIN_ID,
      to: CONTRACT_ADDRESS,
      data: mintData,
      value: '0', // Free mint, only gas
    });

    console.log('✅ Transaction sent:', transactionId);

    // Step 4: Wait for confirmation (optional)
    // Note: Farcaster SDK doesn't provide receipt polling yet
    // You may want to add polling logic here or show a link to block explorer

    return {
      success: true,
      transactionHash: transactionId,
      tokenId: undefined, // Will be available after transaction confirmation
    };

  } catch (error: any) {
    console.error('❌ Mint error:', error);
    return {
      success: false,
      error: error.message || 'Unknown error during mint',
    };
  }
}

/**
 * Encode the mint function call data
 */
function encodeMintCall(to: string, fid: number, tokenURI: string): `0x${string}` {
  // Simple ABI encoding for mint(address,uint256,string)
  // In production, use ethers.js or viem for proper encoding
  
  // Function selector: mint(address,uint256,string) = 0xd85d3d27
  const selector = '0xd85d3d27';
  
  // Encode parameters (simplified - use ethers.js in production)
  const encodedTo = to.slice(2).padStart(64, '0');
  const encodedFid = fid.toString(16).padStart(64, '0');
  
  // For string encoding, this is simplified. Use proper ABI encoder in production.
  const tokenURIHex = Buffer.from(tokenURI).toString('hex');
  const encodedURI = '0000000000000000000000000000000000000000000000000000000000000060' + // offset
                      tokenURIHex.length.toString(16).padStart(64, '0') + // length
                      tokenURIHex.padEnd(Math.ceil(tokenURIHex.length / 64) * 64, '0'); // data
  
  return `${selector}${encodedTo}${encodedFid}${encodedURI}` as `0x${string}`;
}

/**
 * Check if user already minted
 */
export async function checkIfMinted(fid: number): Promise<boolean> {
  try {
    // This would require a read call to the contract
    // For now, return false (implement with viem or ethers.js)
    return false;
  } catch (error) {
    console.error('Error checking mint status:', error);
    return false;
  }
}

/**
 * Get current total supply
 */
export async function getTotalSupply(): Promise<number> {
  try {
    // This would require a read call to the contract
    // Implement with viem or ethers.js
    return 0;
  } catch (error) {
    console.error('Error getting total supply:', error);
    return 0;
  }
}
