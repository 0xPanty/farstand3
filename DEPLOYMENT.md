# 🚀 StandNFT Deployment Guide - Base Chain Free Mint

## 📋 Prerequisites

1. **Node.js** installed (v18+)
2. **Base wallet** with some ETH for deployment (~$2-5 USD)
3. **Pinata account** for IPFS storage (free tier works)
4. **BaseScan API key** (optional, for contract verification)

---

## 🔧 Step 1: Environment Setup

### 1.1 Install Contract Dependencies

```bash
cd contracts
npm install
```

### 1.2 Create `.env` File in Root Directory

```bash
# Contract Deployment
DEPLOYER_PRIVATE_KEY=your_wallet_private_key_here
BASESCAN_API_KEY=your_basescan_api_key_here

# IPFS Storage (Pinata)
PINATA_API_KEY=your_pinata_api_key_here
PINATA_SECRET_KEY=your_pinata_secret_key_here

# Gemini API
VITE_GEMINI_API_KEY=your_gemini_api_key_here

# Neynar API
VITE_NEYNAR_API_KEY=your_neynar_api_key_here

# Contract Address (will be filled after deployment)
VITE_STAND_NFT_CONTRACT=
```

### 1.3 Get Your Keys

**Pinata (IPFS):**
1. Go to https://app.pinata.cloud/
2. Sign up for free account
3. Go to API Keys → New Key
4. Enable `pinFileToIPFS` and `pinJSONToIPFS`
5. Copy API Key and Secret Key

**BaseScan (Contract Verification):**
1. Go to https://basescan.org/myapikey
2. Create free account
3. Add API Key

**Get Private Key:**
⚠️ **Use a fresh wallet for deployment, never your main wallet!**
```bash
# From MetaMask:
# Account Details → Export Private Key → Copy
```

---

## 🚢 Step 2: Deploy Contract to Base

### 2.1 Test on Base Sepolia (Testnet) First

```bash
cd contracts
npm run deploy:baseSepolia
```

You'll see output like:
```
🚀 Deploying StandNFT to Base...
✅ StandNFT deployed to: 0x1234567890abcdef...
📝 Save this address to your .env file:
VITE_STAND_NFT_CONTRACT=0x1234567890abcdef...
```

### 2.2 Deploy to Base Mainnet

```bash
npm run deploy:base
```

**⚠️ Make sure you have enough ETH on Base mainnet (~$2-5 USD for gas)**

### 2.3 Save Contract Address

Copy the contract address from the output and add it to `.env`:
```bash
VITE_STAND_NFT_CONTRACT=0xYourContractAddressHere
```

---

## 🔗 Step 3: Update Vercel Environment Variables

1. Go to your Vercel Dashboard
2. Select your project → Settings → Environment Variables
3. Add these variables:
   ```
   PINATA_API_KEY=...
   PINATA_SECRET_KEY=...
   VITE_STAND_NFT_CONTRACT=0xYourContractAddress
   VITE_GEMINI_API_KEY=...
   VITE_NEYNAR_API_KEY=...
   ```
4. Click **Save**
5. Redeploy your application

---

## 🧪 Step 4: Test the Mint Flow

### 4.1 Local Testing

```bash
# In root directory
npm run dev
```

Open http://localhost:5173 and test:
1. ✅ Generate Stand
2. ✅ Click "MINT NFT" button
3. ✅ Wallet popup appears
4. ✅ Confirm transaction
5. ✅ Check transaction on BaseScan

### 4.2 Production Testing

1. Open your Mini App in Warpcast
2. Generate a Stand
3. Click "MINT NFT"
4. Confirm transaction in Farcaster wallet
5. Verify on BaseScan: https://basescan.org/address/YOUR_CONTRACT_ADDRESS

---

## 📊 Step 5: Verify Contract on BaseScan

This makes your contract's code public and verifiable:

```bash
cd contracts
npx hardhat verify --network base YOUR_CONTRACT_ADDRESS
```

Or if auto-verification failed during deployment:
```bash
npm run verify YOUR_CONTRACT_ADDRESS
```

---

## 🎯 Contract Details

**Contract Name:** StandNFT  
**Symbol:** STAND  
**Type:** ERC-721  
**Max Supply:** 10,000  
**Chain:** Base (8453)  
**Mint Type:** Free (users pay gas only)  
**Restrictions:** 1 mint per Farcaster FID

---

## 🛠️ Troubleshooting

### Error: "Insufficient funds for gas"
- Make sure your wallet has ETH on Base mainnet
- Get Base ETH from bridge: https://bridge.base.org

### Error: "Pinata upload failed"
- Check your Pinata API keys in Vercel environment variables
- Ensure you have remaining storage quota

### Error: "Contract address not configured"
- Make sure `VITE_STAND_NFT_CONTRACT` is set in Vercel
- Redeploy after adding the variable

### Transaction Fails in Wallet
- Check if user already minted (1 per FID limit)
- Check if max supply reached
- Verify contract address is correct

---

## 📈 Next Steps

1. **Monitor Usage:**
   - BaseScan: https://basescan.org/address/YOUR_CONTRACT
   - Pinata Dashboard: Check IPFS usage

2. **Share Your Mini App:**
   - Post on Farcaster with the Mini App link
   - Share in relevant channels

3. **Optional Upgrades:**
   - Add whitelist minting
   - Implement royalties
   - Create OpenSea collection page

---

## 🔒 Security Notes

- ✅ Contract is ownable (only you can upgrade)
- ✅ Free mint (no payment handling)
- ✅ Per-FID limit prevents spam
- ⚠️ Keep deployer private key secure
- ⚠️ Never commit `.env` to git

---

## 💰 Cost Estimate

- **Contract Deployment:** ~$2-5 USD (one-time)
- **Per Mint:** ~$0.20-1 USD gas (user pays)
- **IPFS Storage:** Free (Pinata free tier: 1GB)
- **Total:** ~$2-5 USD to launch

---

## 📞 Support

If you encounter issues:
1. Check Vercel logs
2. Check BaseScan transaction details
3. Review browser console for errors
4. Check contract on BaseScan

---

🎉 **You're ready to launch your Stand NFT on Base!**
