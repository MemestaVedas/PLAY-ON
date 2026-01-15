import { useState, useEffect } from 'react';

/**
 * Extracts the dominant color from an image URL.
 * Returns the color as an RGB string (e.g., "180, 162, 246").
 */
export function useImageColor(imageUrl: string | null | undefined): string | null {
    const [color, setColor] = useState<string | null>(null);

    useEffect(() => {
        if (!imageUrl) {
            setColor(null);
            return;
        }

        console.log('[useImageColor] Extracting color from:', imageUrl);

        const extractColor = (imgElement: HTMLImageElement) => {
            try {
                const canvas = document.createElement('canvas');
                // Sample a larger area for better accuracy
                const sampleSize = 50;
                canvas.width = sampleSize;
                canvas.height = sampleSize;

                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    console.warn('[useImageColor] No canvas context');
                    return null;
                }

                ctx.drawImage(imgElement, 0, 0, sampleSize, sampleSize);

                // Get pixel data and calculate average color
                const imageData = ctx.getImageData(0, 0, sampleSize, sampleSize);
                const data = imageData.data;

                let r = 0, g = 0, b = 0;
                let count = 0;

                // Skip very dark and very light pixels for better "vibrant" color
                for (let i = 0; i < data.length; i += 4) {
                    const pr = data[i];
                    const pg = data[i + 1];
                    const pb = data[i + 2];

                    // Skip very dark or very light pixels
                    const brightness = (pr + pg + pb) / 3;
                    if (brightness > 30 && brightness < 220) {
                        r += pr;
                        g += pg;
                        b += pb;
                        count++;
                    }
                }

                if (count > 0) {
                    r = Math.round(r / count);
                    g = Math.round(g / count);
                    b = Math.round(b / count);

                    // Boost saturation for more vibrant tinting
                    const max = Math.max(r, g, b);
                    const min = Math.min(r, g, b);
                    const saturationBoost = 1.3;

                    if (max !== min) {
                        const mid = (max + min) / 2;
                        r = Math.min(255, Math.round(mid + (r - mid) * saturationBoost));
                        g = Math.min(255, Math.round(mid + (g - mid) * saturationBoost));
                        b = Math.min(255, Math.round(mid + (b - mid) * saturationBoost));
                    }

                    const colorStr = `${r}, ${g}, ${b}`;
                    console.log('[useImageColor] Extracted color:', colorStr);
                    return colorStr;
                }
                return null;
            } catch (err) {
                console.warn('[useImageColor] Canvas extraction failed:', err);
                return null;
            }
        };

        // Try with crossOrigin first
        const img = new Image();
        img.crossOrigin = 'anonymous';

        img.onload = () => {
            const result = extractColor(img);
            if (result) {
                setColor(result);
            } else {
                console.log('[useImageColor] First attempt failed, trying without crossOrigin...');
                // Fallback: try without crossOrigin (won't work for CORS but at least logs the issue)
                tryWithoutCors();
            }
        };

        img.onerror = () => {
            console.log('[useImageColor] CORS failed, trying without crossOrigin...');
            tryWithoutCors();
        };

        const tryWithoutCors = () => {
            // For images that can't be accessed with CORS, 
            // extract a color from the URL pattern or use a default vibrant color
            // based on the image URL hash for visual variety
            const hash = imageUrl.split('').reduce((acc, char) => {
                return char.charCodeAt(0) + ((acc << 5) - acc);
            }, 0);

            // Generate a pleasant color from the hash
            const hue = Math.abs(hash % 360);
            const sat = 60 + Math.abs((hash >> 8) % 30); // 60-90%
            const light = 50 + Math.abs((hash >> 16) % 20); // 50-70%

            // HSL to RGB conversion
            const c = (1 - Math.abs(2 * light / 100 - 1)) * sat / 100;
            const x = c * (1 - Math.abs((hue / 60) % 2 - 1));
            const m = light / 100 - c / 2;

            let r = 0, g = 0, b = 0;
            if (hue < 60) { r = c; g = x; }
            else if (hue < 120) { r = x; g = c; }
            else if (hue < 180) { g = c; b = x; }
            else if (hue < 240) { g = x; b = c; }
            else if (hue < 300) { r = x; b = c; }
            else { r = c; b = x; }

            r = Math.round((r + m) * 255);
            g = Math.round((g + m) * 255);
            b = Math.round((b + m) * 255);

            const colorStr = `${r}, ${g}, ${b}`;
            console.log('[useImageColor] Using hash-based fallback color:', colorStr);
            setColor(colorStr);
        };

        img.src = imageUrl;

        return () => {
            img.onload = null;
            img.onerror = null;
        };
    }, [imageUrl]);

    return color;
}

export default useImageColor;
