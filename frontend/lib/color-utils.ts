// frontend/lib/color-utils.ts

/**
 * Вспомогательная функция для перевода RGB в HSL
 */
function rgbToHsl(r: number, g: number, b: number) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
          case r: h = (g - b) / d + (g < b ? 6 : 0); break;
          case g: h = (b - r) / d + 2; break;
          case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
  }
  return [h, s, l];
}

export interface ColorResult {
  color: string;
  isLight: boolean;
}

/**
 * Извлекает акцентный цвет и определяет, светлый он или темный.
 */
export const getAverageColor = (src: string): Promise<ColorResult | null> => {
return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "Anonymous"; 
    img.src = src;

    img.onload = () => {
        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            if (!ctx) {
                resolve(null); return;
            }
            
            canvas.width = 64;
            canvas.height = 64;
            ctx.drawImage(img, 0, 0, 64, 64);

            const imageData = ctx.getImageData(0, 0, 64, 64).data;
            let pixels = [];

            // Собираем все пиксели и их HSL значения
            for (let i = 0; i < imageData.length; i += 4) {
                const r = imageData[i], g = imageData[i + 1], b = imageData[i + 2], a = imageData[i + 3];
                if (a < 128) continue; // Пропускаем прозрачные
                
                const [h, s, l] = rgbToHsl(r, g, b);
                
                if (l > 0.1 && l < 0.9) {
                    pixels.push({ r, g, b, s, l });
                }
            }

            if (pixels.length === 0) {
                 resolve({ color: 'rgb(100, 100, 100)', isLight: false });
                 return;
            }

            // Сортируем пиксели по насыщенности
            pixels.sort((a, b) => b.s - a.s);

            const topPixels = pixels.slice(0, Math.max(1, Math.floor(pixels.length * 0.1)));

            let rSum = 0, gSum = 0, bSum = 0;
            topPixels.forEach(p => { rSum += p.r; gSum += p.g; bSum += p.b; });

            const finalR = Math.floor(rSum / topPixels.length);
            const finalG = Math.floor(gSum / topPixels.length);
            const finalB = Math.floor(bSum / topPixels.length);

            // Вычисляем яркость (Luma) по формуле Y = 0.2126R + 0.7152G + 0.0722B
            const luma = 0.2126 * finalR + 0.7152 * finalG + 0.0722 * finalB;
            const isLight = luma > 140; // Порог яркости (можно подкрутить, обычно 128-150)

            resolve({ 
                color: `rgb(${finalR}, ${finalG}, ${finalB})`, 
                isLight 
            });
        } catch (e) {
            console.warn("Ошибка холста (CORS)", e);
            resolve(null); 
        }
    };

    img.onerror = () => resolve(null);
});
};