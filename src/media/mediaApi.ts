export function getMediaEndpoint(): string {
  if (typeof window !== 'undefined' && (window as unknown as { PBMP_MEDIA_ENDPOINT?: string }).PBMP_MEDIA_ENDPOINT) {
    return (window as unknown as { PBMP_MEDIA_ENDPOINT: string }).PBMP_MEDIA_ENDPOINT;
  }
  if (import.meta.env.VITE_MEDIA_ENDPOINT) {
    return import.meta.env.VITE_MEDIA_ENDPOINT;
  }
  const chat = import.meta.env.VITE_API_ENDPOINT || 'http://localhost:3000/api/chat';
  return chat.replace(/\/api\/chat.*$/, '/api/media/upload');
}

export async function fileToBase64(file: File | Blob): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
  const comma = dataUrl.indexOf(',');
  return comma === -1 ? dataUrl : dataUrl.slice(comma + 1);
}

export async function uploadMedia(input: {
  file: File | Blob;
  mimeType: string;
  caption?: string;
}): Promise<{ received: boolean; id?: string; type?: string; filename?: string; downloadUrl?: string; message?: string }> {
  const dataBase64 = await fileToBase64(input.file);
  const response = await fetch(getMediaEndpoint(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      dataBase64,
      mimeType: input.mimeType,
      caption: input.caption || '',
      clientSource: 'pwa',
      clientTs: new Date().toISOString(),
    }),
  });

  const data = (await response.json().catch(() => ({}))) as {
    received?: boolean;
    id?: string;
    type?: string;
    filename?: string;
    downloadUrl?: string;
    message?: string;
    error?: string;
  };

  if (!response.ok || !data.received) {
    throw new Error(data.error || `Media upload error ${response.status}`);
  }

  return data;
}
