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
export async function shareOnFarcaster(standName: string, appUrl: string) {
  const plainText = `I just awakened my Stand: ${standName}! ✨\n\nDiscover yours:`;
  const text = encodeURIComponent(plainText);
  const url = encodeURIComponent(appUrl);

  // Warpcast compose link
  const shareUrl = `https://warpcast.com/~/compose?text=${text}&embeds[]=${url}`;

  // Prefer native Web Share when available (mobile-friendly)
  try {
    // @ts-ignore - navigator.share is not in all TS lib targets
    if (navigator.share) {
      // Use plain values for native share
      await (navigator as any).share({ title: 'JoJo Stand Maker', text: plainText, url: appUrl });
      return;
    }
  } catch (e) {
    console.warn('navigator.share failed, falling back:', e);
  }

  // Fallbacks: open new tab or navigate current tab (in-app browsers often block window.open)
  const win = window.open(shareUrl, '_blank', 'noopener,noreferrer');
  if (!win) {
    window.location.href = shareUrl;
  }
}
