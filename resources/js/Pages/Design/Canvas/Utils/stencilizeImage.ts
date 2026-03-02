/**
 * Converts an image into a cleaner stencil mask for embroidery previews.
 * Deterministic output: no randomness, no noisy semi-transparent artifacts.
 */

type StencilizeOptions = {
  threshold?: number; // <= 0 => auto (Otsu)
  blur?: number;
  edgeDetection?: boolean;
  posterizeLevels?: number;
  edgeStrength?: number;
  randomness?: number; // legacy option (ignored)
  interiorStrength?: number; // legacy option (ignored)
  minAlpha?: number;
  mode?: "mono" | "color";
};

const getOtsuThreshold = (luma: Uint8ClampedArray, alpha: Uint8ClampedArray) => {
  const hist = new Array<number>(256).fill(0);
  let total = 0;
  for (let i = 0; i < luma.length; i++) {
    if (alpha[i] === 0) continue;
    hist[luma[i]]++;
    total++;
  }
  if (total === 0) return 140;

  let sum = 0;
  for (let i = 0; i < 256; i++) sum += i * hist[i];

  let sumB = 0;
  let wB = 0;
  let maxVar = -1;
  let bestT = 140;

  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (wB === 0) continue;
    const wF = total - wB;
    if (wF === 0) break;
    sumB += t * hist[t];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const between = wB * wF * (mB - mF) * (mB - mF);
    if (between > maxVar) {
      maxVar = between;
      bestT = t;
    }
  }

  return Math.min(200, Math.max(75, bestT));
};

const neighborCount = (mask: Uint8Array, x: number, y: number, w: number, h: number) => {
  let count = 0;
  for (let j = -1; j <= 1; j++) {
    for (let i = -1; i <= 1; i++) {
      if (i === 0 && j === 0) continue;
      const nx = x + i;
      const ny = y + j;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      if (mask[ny * w + nx]) count++;
    }
  }
  return count;
};

export const stencilizeImage = (url: string, options: StencilizeOptions = {}): Promise<string> => {
  const {
    threshold = 0,
    blur = 0.8,
    edgeDetection = true,
    posterizeLevels = 3,
    edgeStrength = 1.2,
    minAlpha = 20,
    mode = "mono",
  } = options;

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = url;

    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Could not get canvas context"));
        return;
      }

      ctx.drawImage(img, 0, 0);

      if (blur > 0) {
        const temp = document.createElement("canvas");
        temp.width = canvas.width;
        temp.height = canvas.height;
        const tctx = temp.getContext("2d")!;
        tctx.filter = `blur(${blur}px)`;
        tctx.drawImage(canvas, 0, 0);
        tctx.filter = "none";
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(temp, 0, 0);
      }

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      const original = new Uint8ClampedArray(data);
      const w = canvas.width;
      const h = canvas.height;
      const pixelCount = w * h;

      const luma = new Uint8ClampedArray(pixelCount);
      const alpha = new Uint8ClampedArray(pixelCount);

      for (let p = 0; p < pixelCount; p++) {
        const i = p * 4;
        const a = data[i + 3];
        alpha[p] = a;
        if (a <= minAlpha) continue;
        let y = Math.round(
          data[i] * 0.2126 +
            data[i + 1] * 0.7152 +
            data[i + 2] * 0.0722
        );
        if (posterizeLevels > 2) {
          const step = 255 / (posterizeLevels - 1);
          y = Math.round(y / step) * step;
        }
        luma[p] = Math.min(255, Math.max(0, y));
      }

      const t = threshold > 0 ? threshold : getOtsuThreshold(luma, alpha);
      const mask = new Uint8Array(pixelCount);

      for (let p = 0; p < pixelCount; p++) {
        if (alpha[p] <= minAlpha) continue;
        if (luma[p] <= t) mask[p] = 1;
      }

      if (edgeDetection) {
        const gxKernel = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
        const gyKernel = [-1, -2, -1, 0, 0, 0, 1, 2, 1];
        const edgeCutoff = 80 / Math.max(0.5, edgeStrength);

        for (let y = 1; y < h - 1; y++) {
          for (let x = 1; x < w - 1; x++) {
            const idx = y * w + x;
            if (alpha[idx] <= minAlpha) continue;

            let gx = 0;
            let gy = 0;
            let k = 0;
            for (let j = -1; j <= 1; j++) {
              for (let i = -1; i <= 1; i++) {
                const n = (y + j) * w + (x + i);
                const v = luma[n];
                gx += v * gxKernel[k];
                gy += v * gyKernel[k];
                k++;
              }
            }

            const mag = Math.hypot(gx, gy);
            if (mag >= edgeCutoff) mask[idx] = 1;
          }
        }
      }

      // Remove tiny speckles.
      const cleaned = new Uint8Array(mask);
      for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
          const idx = y * w + x;
          if (!mask[idx]) continue;
          const n = neighborCount(mask, x, y, w, h);
          if (n <= 1) cleaned[idx] = 0;
        }
      }

      // Fill tiny holes.
      const finalMask = new Uint8Array(cleaned);
      for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
          const idx = y * w + x;
          if (cleaned[idx]) continue;
          if (alpha[idx] <= minAlpha) continue;
          const n = neighborCount(cleaned, x, y, w, h);
          if (n >= 6) finalMask[idx] = 1;
        }
      }

      for (let p = 0; p < pixelCount; p++) {
        const i = p * 4;
        if (!finalMask[p]) {
          data[i + 3] = 0;
          continue;
        }

        if (mode === "color") {
          data[i] = original[i];
          data[i + 1] = original[i + 1];
          data[i + 2] = original[i + 2];
        } else {
          data[i] = 18;
          data[i + 1] = 18;
          data[i + 2] = 18;
        }
        data[i + 3] = 255;
      }

      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };

    img.onerror = () => reject(new Error("Failed to load image for stencil processing"));
  });
};
