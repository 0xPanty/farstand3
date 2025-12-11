/**
 * Download Stand image in high quality
 */
export async function downloadStandImage(imageUrl: string, standName: string) {
  try {
    const filename = `${standName.replace(/[『』\s]/g, '_')}_Stand.png`;

    // Fast path for data URLs (no network, no CORS issues)
    if (imageUrl.startsWith('data:')) {
      const a = document.createElement('a');
      a.href = imageUrl;
      a.download = filename;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return true;
    }

    // Fallback: fetch as blob and download (best-effort if same-origin/CORS-enabled)
    const response = await fetch(imageUrl, { mode: 'cors' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const blob = await response.blob();

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    return true;
  } catch (error) {
    console.error('Download error:', error);

    // Last-resort: try opening the image in a new tab so the user can save manually
    try {
      const win = window.open(imageUrl, '_blank', 'noopener,noreferrer');
      if (!win) window.location.href = imageUrl;
    } catch {}
    return false;
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
 * Share Stand on Farcaster
 */
export async function shareOnFarcaster(
  standName: string,
  appUrl: string,
  imageUrlOrData?: string
) {
  const plainText = `I just awakened my Stand: ${standName}! ✨\n\nDiscover yours:`;
  const text = encodeURIComponent(plainText);
  const url = encodeURIComponent(appUrl);

  // Warpcast compose link (fallback)
  const shareUrl = `https://warpcast.com/~/compose?text=${text}&embeds[]=${url}`;

  // Try native share with image attachment when possible
  try {
    // Only attempt file share if we have an image provided
    if (imageUrlOrData) {
      // Get blob from data URL or fetch
      let blob: Blob;
      if (imageUrlOrData.startsWith('data:')) {
        const [meta, b64] = imageUrlOrData.split(',');
        const mime = meta.match(/data:([^;]+);/i)?.[1] || 'image/png';
        const bin = atob(b64);
        const arr = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
        blob = new Blob([arr], { type: mime });
      } else {
        const resp = await fetch(imageUrlOrData, { mode: 'cors' });
        blob = await resp.blob();
      }

      const filename = `${standName.replace(/[『』\s]/g, '_')}_Stand.png`;
      // Some browsers require File instead of Blob
      // @ts-ignore File constructor exists in modern browsers
      const file = new File([blob], filename, { type: blob.type || 'image/png' });

      // @ts-ignore - canShare not on all TS targets
      const canShareFiles = typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [file] });

      // @ts-ignore - navigator.share not in all TS lib targets
      if (canShareFiles && navigator.share) {
        await (navigator as any).share({
          title: 'JoJo Stand Maker',
          text: plainText,
          files: [file],
          // Note: including url is fine; some platforms ignore it when files present
          url: appUrl,
        });
        return true;
      }
    }

    // Fallback to text+url share without files
    // @ts-ignore - navigator.share not in all TS lib targets
    if (navigator.share) {
      await (navigator as any).share({ title: 'JoJo Stand Maker', text: plainText, url: appUrl });
      return true;
    }
  } catch (e) {
    console.warn('navigator.share failed, falling back:', e);
  }

  // Final fallback: open Warpcast compose with embed to app URL
  const win = window.open(shareUrl, '_blank', 'noopener,noreferrer');
  if (!win) {
    window.location.href = shareUrl;
  }
  return false;
}
