export async function downloadFile(url: string, filename: string) {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(blobUrl);
    return true;
  } catch (error) {
    console.error('Download failed:', error);
    return false;
  }
}

export async function downloadMultipleFiles(files: { url: string; filename: string }[]) {
  for (let i = 0; i < files.length; i++) {
    await downloadFile(files[i].url, files[i].filename);
    if (i < files.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  }
}

export function getMediaFileName(baseId: string, mediaType: string, index: number, url: string): string {
  const extension = url.split('.').pop()?.split('?')[0] || 'jpg';
  return `${baseId}_${mediaType}_${index + 1}.${extension}`;
}
