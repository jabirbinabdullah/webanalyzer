export function triggerFileDownload(content, filename, mimeType) {
  try {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  } catch (e) {
    console.error('Failed to trigger file download:', e);
    alert('Failed to download file.');
  }
}

export function generateFilename(baseUrl, prefix, extension) {
  try {
    const filenameHost = new URL(baseUrl).hostname.replace(/[:\\/\\\\]/g, '-');
    const ts = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    return `${prefix}-${filenameHost}-${ts}.${extension}`;
  } catch (e) {
    console.warn('Could not parse URL for filename, using generic name.', e);
    return `${prefix}-analysis-${new Date().toISOString().slice(0,10)}.${extension}`;
  }
}
