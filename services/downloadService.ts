/**
 * Download Stand image in high quality
 */
export async function downloadStandImage(imageUrl: string, standName: string) {
  try {
    // Fetch the image
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    
    // Create download link
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    // Clean filename
    const filename = `${standName.replace(/[『』\s]/g, '_')}_Stand.png`;
    link.download = filename;
    
    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Cleanup
    window.URL.revokeObjectURL(url);
    
    return true;
  } catch (error) {
    console.error('Download error:', error);
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
export function shareOnFarcaster(standName: string, appUrl: string) {
  const text = encodeURIComponent(`I just awakened my Stand: ${standName}! ✨\n\nDiscover yours:`);
  const url = encodeURIComponent(appUrl);
  
  // Warpcast share URL
  const shareUrl = `https://warpcast.com/~/compose?text=${text}&embeds[]=${url}`;
  
  window.open(shareUrl, '_blank');
}
