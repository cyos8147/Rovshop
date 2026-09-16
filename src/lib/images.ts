export function primaryImage(images: { url: string }[], title: string): string {
  return images[0]?.url ?? `/api/placeholder?text=${encodeURIComponent(title)}&hue=260`;
}
