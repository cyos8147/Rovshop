// Only allow same-site relative paths as post-login destinations (prevents
// open redirects such as ?callbackUrl=https://evil.example or //evil).
export function sanitizeCallbackUrl(url: string | undefined, fallback: string): string {
  if (!url || !url.startsWith("/") || url.startsWith("//") || url.startsWith("/\\")) return fallback;
  return url;
}
