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
 * Capture receipt element as base64 image
 * Uses html2canvas to capture the receipt paper
 */
export async function captureReceiptAsImage(): Promise<string | null> {
  // 设置超时，避免阻塞分享流程
  const timeoutPromise = new Promise<null>((resolve) => {
    setTimeout(() => {
      console.log('⏱️ Receipt capture timeout');
      resolve(null);
    }, 3000); // 3秒超时
  });

  const capturePromise = (async (): Promise<string | null> => {
    try {
      console.log('📸 Starting receipt capture...');
      
      const element = document.getElementById('receipt-paper');
      if (!element) {
        console.log('📸 Receipt element not found');
        return null;
      }

      // 动态导入 html2canvas
      const html2canvas = (await import('html2canvas')).default;
      
      // 使用最简配置，减少 CSP 问题
      const canvas = await html2canvas(element, {
        backgroundColor: '#f8f8f5',
        scale: 1.5,
        logging: false,
        useCORS: true,
        allowTaint: true,
        foreignObjectRendering: false, // 禁用可能触发 CSP 的功能
      });

      const dataUrl = canvas.toDataURL('image/png', 0.8);
      console.log('✅ Receipt captured, size:', dataUrl.length);
      return dataUrl;
    } catch (error) {
      console.error('❌ Receipt capture error:', error);
      return null;
    }
  })();

  // 返回先完成的（成功或超时）
  return Promise.race([capturePromise, timeoutPromise]);
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
 */
export async function shareOnFarcaster(
  standName: string,
  appUrl: string,
  fid?: number
) {
  try {
    const plainText = `I just awakened my Stand: ${standName}! ✨\n\nDiscover yours:`;
    
    // Build the share URL with OpenGraph metadata
    const sharePageUrl = fid ? `${appUrl}/api/share/${fid}` : appUrl;
    
    console.log('🔗 Share page URL:', sharePageUrl);
    
    // Import SDK
    const { sdk } = await import('@farcaster/miniapp-sdk');
    
    // Always try SDK composeCast first
    try {
      console.log('🚀 Trying SDK composeCast...');
      const result = await sdk.actions.composeCast({
        text: plainText,
        embeds: [sharePageUrl],
      });
      console.log('✅ Cast composed via SDK:', result);
      return true;
    } catch (sdkError) {
      console.log('ℹ️ SDK composeCast failed, trying fallback:', sdkError);
    }
    
    // Not in Mini App - use browser fallbacks
    // Try opening Warpcast compose URL
    const text = encodeURIComponent(plainText);
    const sharePageUrlEncoded = encodeURIComponent(sharePageUrl);
    const warpcastUrl = `https://warpcast.com/~/compose?text=${text}&embeds[]=${sharePageUrlEncoded}`;

    const opened = window.open(warpcastUrl, '_blank', 'noopener,noreferrer');
    if (opened) {
      console.log('✅ Opened share in new window');
      return true;
    }
    
    // Fallback: copy to clipboard
    try {
      await navigator.clipboard.writeText(`${plainText}\n${sharePageUrl}`);
      alert('链接已复制，请手动粘贴到 Warpcast');
      return true;
    } catch (e) {
      alert('请手动复制分享链接');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Share function error:', error);
    return false;
  }
}
