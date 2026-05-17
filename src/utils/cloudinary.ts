export function optimizeImageUrl(url: string | null | undefined): string {
  if (!url || !url.includes('cloudinary')) return url || '';
  return url.replace('/upload/', '/upload/q_auto,f_auto/');
}
