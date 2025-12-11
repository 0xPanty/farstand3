/**
 * Download Stand image in high quality (supports both PC and mobile)
 */
export async function downloadStandImage(imageUrl: string, standName: string) {
  try {
    const filename = `${standName.replace(/[『』\s]/g, '_')}_Stand.png`;

    // Detect if we're on mobile
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    
    console.log(`📥 Download started - Device: ${isMobile ? 'Mobile' : 'PC'}, iOS: ${isIOS}`);

    // Method 1: Try native Web Share API for mobile (best UX on mobile)
    if (isMobile && navigator.share) {
      try {
        // Get blob from image URL
        let blob: Blob;
        if (imageUrl.startsWith('data:')) {
          const [meta, b64] = imageUrl.split(',');
          const mime = meta.match(/data:([^;]+);/i)?.[1] || 'image/png';
          const bin = atob(b64);
          const arr = new Uint8Array(bin.length);
          for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
          blob = new Blob([arr], { type: mime });
        } else {
          const response = await fetch(imageUrl, { mode: 'cors' });
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          blob = await response.blob();
        }

        // Create file from blob
        const file = new File([blob], filename, { type: blob.type || 'image/png' });

        // Check if we can share files
        // @ts-ignore - canShare might not be in all TS definitions
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: 'JoJo Stand',
            text: `My Stand: ${standName}`,
          });
          console.log('✅ Shared via Web Share API');
          return true;
        }
      } catch (shareError: any) {
        // User cancelled share or share not supported
        if (shareError.name !== 'AbortError') {
          console.log('ℹ️ Web Share API failed, trying download method:', shareError.message);
        } else {
          console.log('ℹ️ User cancelled share');
          return false;
        }
      }
    }

    // Method 2: Standard download for PC and fallback for mobile
    let blobUrl: string;
    
    if (imageUrl.startsWith('data:')) {
      // Data URL can be used directly
      blobUrl = imageUrl;
    } else {
      // Fetch and create blob URL
      const response = await fetch(imageUrl, { mode: 'cors' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();
      blobUrl = window.URL.createObjectURL(blob);
    }

    // Create download link
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    
    // Trigger download
    link.click();
    
    // Cleanup
    document.body.removeChild(link);
    if (!imageUrl.startsWith('data:')) {
      // Only revoke object URLs we created
      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 100);
    }

    console.log('✅ Download triggered successfully');
    return true;

  } catch (error) {
    console.error('❌ Download error:', error);

    // Method 3: Last resort - open in new tab for manual save
    try {
      console.log('⚠️ Attempting fallback: open in new tab');
      const win = window.open(imageUrl, '_blank', 'noopener,noreferrer');
      if (!win) {
        // If popup blocked, try same-window navigation
        window.location.href = imageUrl;
      }
      return true;
    } catch (finalError) {
      console.error('❌ All download methods failed:', finalError);
      return false;
    }
  }
}

/**
 * Download Stand card as composite image (front + back combined)
 * Uses html2canvas to capture the card element
 */
export async function downloadStandCard(cardElementId: string, standName: string) {
  try {
    // Dynamically import html2canvas only when needed
    const html2canvas = (await import('html2canvas')).default;
    
    const element = document.getElementById(cardElementId);
    if (!element) {
      throw new Error('Card element not found');
    }

    // Capture the element as canvas
    const canvas = await html2canvas(element, {
      backgroundColor: '#0f0015',
      scale: 2, // Higher quality (2x resolution)
      logging: false,
      useCORS: true, // Allow cross-origin images
    });

    // Convert canvas to blob
    canvas.toBlob((blob) => {
      if (!blob) {
        throw new Error('Failed to create image blob');
      }

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      const filename = `${standName.replace(/[『』\s]/g, '_')}_Card.png`;
      link.download = filename;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      window.URL.revokeObjectURL(url);
    }, 'image/png');

    return true;
  } catch (error) {
    console.error('Card download error:', error);
    return false;
  }
}

/**
 * Share Stand on Farcaster with image (supports both PC and mobile)
 * 
 * @param standName - Name of the Stand
 * @param appUrl - Base app URL (e.g., https://farstand3.vercel.app)
 * @param fid - User's Farcaster ID (required for share page with OG image)
 * @param imageUrlOrData - Optional image URL or data URL for upload
 */
export async function shareOnFarcaster(
  standName: string,
  appUrl: string,
  fid?: number,
  imageUrlOrData?: string
) {
  try {
    const plainText = `I just awakened my Stand: ${standName}! ✨\n\nDiscover yours:`;
    
    // Build the share URL with OpenGraph metadata
    // This URL will show the Stand image in the cast preview
    const sharePageUrl = fid ? `${appUrl}/api/share/${fid}` : appUrl;
    
    console.log('🔗 Share page URL:', sharePageUrl);
    
    // Priority 1: Try Farcaster Mini App SDK composeCast (BEST for Warpcast)
    try {
      const { sdk } = await import('@farcaster/miniapp-sdk');
      
      // Use share page as the embed - it has proper OG tags for image preview
      // The share page will redirect users to the app
      const embeds: [string] = [sharePageUrl];
      
      // Use composeCast to open the native cast composer
      const result = await sdk.actions.composeCast({
        text: plainText,
        embeds: embeds,
      });
      
      console.log('✅ Cast composed via SDK:', result);
      return true;
    } catch (sdkError) {
      console.log('ℹ️ SDK composeCast not available, trying fallback methods:', sdkError);
    }

    // Priority 2: Try Web Share API (for mobile browsers outside Warpcast)
    try {
      // @ts-ignore - navigator.share not in all TS lib targets
      if (navigator.share) {
        await (navigator as any).share({ 
          title: `${standName} - Farstand`, 
          text: plainText, 
          url: sharePageUrl 
        });
        console.log('✅ Shared via Web Share API');
        return true;
      }
    } catch (shareError: any) {
      if (shareError.name === 'AbortError') {
        console.log('ℹ️ User cancelled share');
        return false;
      }
      console.log('ℹ️ Web Share API not available');
    }

    // Priority 3: Fallback to opening Warpcast compose URL (for PC browsers)
    const text = encodeURIComponent(plainText);
    const sharePageUrlEncoded = encodeURIComponent(sharePageUrl);
    
    const warpcastUrl = `https://warpcast.com/~/compose?text=${text}&embeds[]=${sharePageUrlEncoded}`;

    const opened = window.open(warpcastUrl, '_blank', 'noopener,noreferrer');
    if (opened) {
      console.log('✅ Opened share in new window');
      return true;
    }
    
    console.warn('⚠️ Popup blocked. Please allow popups for this site.');
    alert('⚠️ Please allow popups to share. Check your browser settings.');
    return false;
    
  } catch (error) {
    console.error('❌ Share function error:', error);
    return false;
  }
}
