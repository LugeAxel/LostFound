const apiUrl = (import.meta as any).env.VITE_API_URL;
if (!apiUrl) {
  console.warn('⚠️ VITE_API_URL is not set. Using default: http://localhost:5005');
}
export const API_URL = apiUrl;
export const SOCKET_URL = apiUrl;
