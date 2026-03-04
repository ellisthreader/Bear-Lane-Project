const LOCAL_IMAGE_ALIASES: Record<string, string> = {
  "/images/products/bwhitetee1.png": "/images/Products/WhiteTee1.png",
  "images/products/bwhitetee1.png": "/images/Products/WhiteTee1.png",
};

const decodePathSegment = (segment: string): string => {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
};

const encodePath = (path: string): string =>
  path
    .split("/")
    .map((segment, index) => {
      if (index === 0 && segment === "") return "";
      return encodeURIComponent(decodePathSegment(segment));
    })
    .join("/");

const normalizeExtensionTypos = (value: string): string =>
  value
    .replace(/\.pngg(?=($|[?#]))/i, ".png")
    .replace(/\.jpgg(?=($|[?#]))/i, ".jpg")
    .replace(/\.jpegg(?=($|[?#]))/i, ".jpeg")
    .replace(/\.webpp(?=($|[?#]))/i, ".webp")
    .replace(/\.svgg(?=($|[?#]))/i, ".svg");

const normalizeLocalPath = (value: string): string => {
  let next = value.replace(/\\/g, "/").replace(/\/{2,}/g, "/");
  next = normalizeExtensionTypos(next);

  const alias = LOCAL_IMAGE_ALIASES[next.toLowerCase()];
  if (alias) next = alias;

  if (!next.startsWith("/") && (next.startsWith("images/") || next.startsWith("storage/"))) {
    next = `/${next}`;
  }

  return encodePath(next);
};

const normalizeImageSrc = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("data:") || trimmed.startsWith("blob:")) return trimmed;

  try {
    const url = new URL(trimmed);
    url.pathname = encodePath(normalizeExtensionTypos(url.pathname));
    return url.toString();
  } catch {
    return normalizeLocalPath(trimmed);
  }
};

const readImageSource = (img: unknown): string => {
  if (typeof img === "string") return img;
  if (img && typeof img === "object") {
    const maybeImage = img as { url?: unknown; path?: unknown };
    if (typeof maybeImage.url === "string") return maybeImage.url;
    if (typeof maybeImage.path === "string") return maybeImage.path;
  }
  return "";
};

export const normalizeDesignImages = (images: unknown[]): string[] =>
  (images ?? []).map((img) => normalizeImageSrc(readImageSource(img)));
