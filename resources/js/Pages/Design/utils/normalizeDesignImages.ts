export const normalizeDesignImages = (images: unknown[]): string[] =>
  (images ?? []).map(img => {
    if (typeof img === "string") return img;
    if (img && typeof img === "object") {
      const maybeImage = img as { url?: unknown; path?: unknown };
      if (typeof maybeImage.url === "string") return maybeImage.url;
      if (typeof maybeImage.path === "string") return maybeImage.path;
    }
    return "";
  });
