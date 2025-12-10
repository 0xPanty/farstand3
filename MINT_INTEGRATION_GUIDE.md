# 🎨 Adding Mint Button to App.tsx

## Quick Integration Steps

### Step 1: Add Import (Top of App.tsx)

Add this import after the existing imports:

```typescript
import { mintStandNFT } from './services/mintService';
```

### Step 2: Add State for Minting (Inside App Component)

Add these state variables after the existing useState declarations:

```typescript
const [isMinting, setIsMinting] = useState(false);
const [mintSuccess, setMintSuccess] = useState<string | null>(null); // Transaction hash
```

### Step 3: Add Mint Handler Function

Add this function after the `handleGenerate` function:

```typescript
const handleMint = useCallback(async () => {
  if (!standData || !farcasterUser) {
    alert("Please generate your Stand first!");
    return;
  }

  if (isMinting) return;

  setIsMinting(true);
  setMintSuccess(null);

  try {
    // Get user's wallet address from Farcaster context
    const userAddress = context?.user?.custody || context?.user?.verifications?.[0];
    
    if (!userAddress) {
      throw new Error("No wallet address found. Please connect your wallet.");
    }

    console.log("🎯 Minting Stand NFT...");
    
    const result = await mintStandNFT(standData, farcasterUser.fid, userAddress);

    if (result.success) {
      setMintSuccess(result.transactionHash || "Success!");
      alert(`🎉 Stand NFT Minted!\n\nTx: ${result.transactionHash}\n\nCheck it on BaseScan!`);
    } else {
      throw new Error(result.error || "Mint failed");
    }
  } catch (error: any) {
    console.error("❌ Mint error:", error);
    alert(`Mint failed: ${error.message}`);
  } finally {
    setIsMinting(false);
  }
}, [standData, farcasterUser, context, isMinting]);
```

### Step 4: Add Mint Button UI

Find the section where `standData` is displayed (after the Stand card flip section).

Add this button **AFTER** the stand card `</div>` closes but **BEFORE** the bottom decorative strip:

```typescript
{/* Mint NFT Button - Only show after Stand is generated */}
{standData && (
  <div className="w-full px-6 py-4 flex flex-col items-center gap-3 z-20">
    <button
      onClick={handleMint}
      disabled={isMinting || !!mintSuccess}
      className={`
        relative group w-full max-w-md h-16 
        ${isMinting ? 'animate-pulse' : ''}
        ${mintSuccess ? 'bg-green-600' : 'bg-gradient-to-r from-[#db2777] via-[#c026d3] to-[#7c3aed]'}
        border-4 border-white shadow-[0_0_20px_rgba(219,39,119,0.6)]
        active:scale-95 transition-all duration-200
        disabled:opacity-50 disabled:cursor-not-allowed
        overflow-hidden
      `}
    >
      {/* Button Background Animation */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-[shimmer_2s_linear_infinite] opacity-30"></div>
      
      {/* Button Text */}
      <span className="relative z-10 text-white font-black text-xl tracking-widest drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
        {isMinting ? (
          <>
            <span className="animate-pulse">⏳ MINTING...</span>
          </>
        ) : mintSuccess ? (
          <>
            ✅ MINTED!
          </>
        ) : (
          <>
            🎨 MINT STAND NFT
          </>
        )}
      </span>
      
      {/* Corner Decorations */}
      <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-[#fbbf24]"></div>
      <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-[#fbbf24]"></div>
      <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-[#fbbf24]"></div>
      <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-[#fbbf24]"></div>
    </button>
    
    {/* Success Message */}
    {mintSuccess && (
      <div className="text-center">
        <p className="text-green-400 text-sm font-bold mb-1">🎉 Stand Awakened On-Chain!</p>
        <a 
          href={`https://basescan.org/tx/${mintSuccess}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#06b6d4] text-xs underline hover:text-[#fbbf24] transition-colors"
        >
          View on BaseScan →
        </a>
      </div>
    )}
    
    {/* Gas Fee Info */}
    {!mintSuccess && (
      <p className="text-gray-400 text-xs text-center">
        Free mint · You only pay gas (~$0.50 on Base)
      </p>
    )}
  </div>
)}
```

### Step 5: Add Shimmer Animation (In index.html `<style>` section)

Add this to the existing `<style>` block in `index.html`:

```css
@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}
```

---

## 🎯 Exact Location in App.tsx

Find this code block (around line 1090-1100):

```typescript
            </div>
            {/* ^^^^^ This closes the stand card flip container */}

            {/* ADD MINT BUTTON HERE! */}

            <div className="w-full flex flex-col items-center z-20">
                <div className="mb-4 h-12 flex items-center justify-center">
```

Insert the Mint Button code from Step 4 **between** these two sections.

---

## 🧪 Testing the Integration

1. **Local Test:**
   ```bash
   npm run dev
   ```

2. **Generate a Stand**

3. **Click "MINT STAND NFT" button**
   - Should trigger wallet popup
   - Confirm transaction
   - See success message

4. **Check transaction** on BaseScan

---

## 🐛 Troubleshooting

### "No wallet address found"
- Make sure you're logged in via Farcaster
- Check that `context.user` has address

### "Contract address not configured"
- Set `VITE_STAND_NFT_CONTRACT` in `.env`
- Redeploy to Vercel

### Button doesn't appear
- Make sure `standData` exists
- Check browser console for errors

### Transaction fails
- Check if user already minted (1 per FID)
- Verify contract is deployed
- Check user has ETH on Base

---

## 📦 Full Modified Files

After following this guide, you'll have modified:

- ✅ `App.tsx` - Added mint button and handler
- ✅ `services/mintService.ts` - Created (already done)
- ✅ `api/upload-metadata.ts` - Created (already done)
- ✅ `index.html` - Added shimmer animation (already exists)

---

## 🚀 Ready to Deploy!

Once you've made these changes:

1. Test locally
2. Commit and push:
   ```bash
   git add .
   git commit -m "feat: add NFT mint functionality"
   git push
   ```
3. Vercel will auto-deploy
4. Test in Warpcast!

---

🎉 **Your Stand Maker now has NFT minting!**
