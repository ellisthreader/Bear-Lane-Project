/**
 * Converts an image into a color-preserving stencil
 * EMBROIDERY SAFE – uses alpha as stencil mask
 * ENHANCED COLOR PRESERVATION
 */

const rand = (min: number, max: number) =>
  Math.random() * (max - min) + min;

export const stencilizeImage = (
  url: string,
  options: {
    threshold?: number;
    blur?: number;
    edgeDetection?: boolean;
    posterizeLevels?: number;
    edgeStrength?: number;
    randomness?: number;
    interiorStrength?: number; // 🆕 how much interior color survives
  } = {}
): Promise<string> => {
  const {
    threshold = 140,
    blur = 0,
    edgeDetection = true,
    posterizeLevels = 2,
    edgeStrength = 1,
    randomness = 0,
    interiorStrength = 0.6,
  } = options;

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = url;

    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d")!;
      canvas.width = img.width;
      canvas.height = img.height;

      ctx.drawImage(img, 0, 0);

      /* -------------------- Optional Blur -------------------- */
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

      // 🔐 Preserve original colors
      const original = new Uint8ClampedArray(data);

      /* -------------------- Grayscale (for edge detection only) -------------------- */
      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] === 0) continue;

        let g =
          data[i] * 0.299 +
          data[i + 1] * 0.587 +
          data[i + 2] * 0.114;

        if (posterizeLevels > 2) {
          g =
            Math.round((g / 255) * (posterizeLevels - 1)) *
            (255 / (posterizeLevels - 1));
        }

        data[i] = data[i + 1] = data[i + 2] = g;
      }

      const w = canvas.width;
      const h = canvas.height;

      /* -------------------- EDGE DETECTION -------------------- */
      if (edgeDetection) {
        const copy = new Uint8ClampedArray(data);

        const kx = [
          [-1, 0, 1],
          [-2, 0, 2],
          [-1, 0, 1],
        ];
        const ky = [
          [-1, -2, -1],
          [0, 0, 0],
          [1, 2, 1],
        ];

        for (let y = 1; y < h - 1; y++) {
          for (let x = 1; x < w - 1; x++) {
            const idx = (y * w + x) * 4;
            if (copy[idx + 3] === 0) continue;

            let gx = 0;
            let gy = 0;

            for (let j = -1; j <= 1; j++) {
              for (let i = -1; i <= 1; i++) {
                const nidx = ((y + j) * w + (x + i)) * 4;
                const v = copy[nidx];
                gx += v * kx[j + 1][i + 1];
                gy += v * ky[j + 1][i + 1];
              }
            }

            const jitter = rand(-randomness, randomness);
            const magnitude = Math.sqrt(gx * gx + gy * gy);

            // 🔥 Soft edge alpha
            const edgeAlpha = Math.min(
              255,
              Math.max(0, (magnitude - threshold) * edgeStrength * 2 + jitter * 50)
            );

            // 🎨 Interior brightness preservation
            const brightness = copy[idx];
            const interiorAlpha =
              brightness < threshold
                ? 255 * interiorStrength
                : 0;

            const alpha = Math.max(edgeAlpha, interiorAlpha);

            // Restore original RGB, apply alpha stencil
            data[idx]     = original[idx];
            data[idx + 1] = original[idx + 1];
            data[idx + 2] = original[idx + 2];
            data[idx + 3] = alpha;
          }
        }

        /* -------------------- Alpha Dilation (fills color gaps) -------------------- */
        const dilated = new Uint8ClampedArray(data);
        for (let y = 1; y < h - 1; y++) {
          for (let x = 1; x < w - 1; x++) {
            const idx = (y * w + x) * 4;
            if (data[idx + 3] !== 0) continue;

            let maxAlpha = 0;
            for (let j = -1; j <= 1; j++) {
              for (let i = -1; i <= 1; i++) {
                const n = ((y + j) * w + (x + i)) * 4;
                maxAlpha = Math.max(maxAlpha, data[n + 3]);
              }
            }

            if (maxAlpha > 0) {
              dilated[idx + 3] = maxAlpha * 0.6;
              dilated[idx]     = original[idx];
              dilated[idx + 1] = original[idx + 1];
              dilated[idx + 2] = original[idx + 2];
            }
          }
        }

        data.set(dilated);
      } else {
        /* -------------------- SIMPLE MASK -------------------- */
        for (let i = 0; i < data.length; i += 4) {
          if (data[i + 3] === 0) continue;

          const mask = data[i] < threshold ? 255 : 0;

          data[i]     = original[i];
          data[i + 1] = original[i + 1];
          data[i + 2] = original[i + 2];
          data[i + 3] = mask;
        }
      }

      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
  });
};
