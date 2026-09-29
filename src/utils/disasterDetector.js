/**
 * Disaster Analysis & Detection Engine
 * Evaluates visual features from drone imagery to detect disasters:
 * - Flood / Water Inundation
 * - Wildfire / Fire & Smoke Hazard
 * - Earthquake / Structural Collapse & Rubble
 * - Landslide / Mudflow
 * - Clear / No Active Disaster
 */

function rgbToHsv(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  const s = max === 0 ? 0 : d / max;
  const v = max;

  if (max !== min) {
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }
  return [h * 360, s, v];
}

export function analyzeDisaster(imageElement) {
  return new Promise((resolve) => {
    try {
      const canvas = document.createElement("canvas");
      // Downscale to 320x240 for rapid sub-50ms execution
      const width = 320;
      const height = Math.max(160, Math.floor((imageElement.naturalHeight / (imageElement.naturalWidth || 1)) * 320)) || 240;
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      ctx.drawImage(imageElement, 0, 0, width, height);

      const imgData = ctx.getImageData(0, 0, width, height);
      const data = imgData.data;
      const totalPixels = width * height;

      let firePixels = 0;
      let smokePixels = 0;
      let floodWaterPixels = 0;
      let mudPixels = 0;

      // Color space analysis
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const [h, s, v] = rgbToHsv(r, g, b);

        // Fire detection (High saturation warm hues, high intensity)
        if ((h < 40 || h > 345) && s > 0.65 && v > 0.65 && r > g && g > b * 0.8) {
          firePixels++;
        }
        // Smoke detection (Low saturation, moderate-to-high luminance, hazy grey)
        else if (s < 0.18 && v > 0.35 && v < 0.90 && Math.abs(r - g) < 20 && Math.abs(g - b) < 20) {
          smokePixels++;
        }

        // Flood / Water detection:
        // Case A: Blue / grey-blue flood water
        if (h >= 170 && h <= 245 && s > 0.12 && v > 0.20 && v < 0.85) {
          floodWaterPixels++;
        }
        // Case B: Muddy / silted brown flood water
        else if (h >= 22 && h <= 48 && s >= 0.22 && s <= 0.65 && v >= 0.22 && v <= 0.72 && r > b) {
          floodWaterPixels++;
          mudPixels++;
        }
      }

      // Edge density & chaos analysis (for structural collapse / rubble)
      // Sobel gradient magnitude
      let highEntropyEdges = 0;
      const gray = new Uint8Array(width * height);
      for (let i = 0; i < totalPixels; i++) {
        const idx = i * 4;
        gray[i] = (data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114);
      }

      for (let y = 1; y < height - 1; y += 2) {
        for (let x = 1; x < width - 1; x += 2) {
          const gx =
            -gray[(y - 1) * width + (x - 1)] + gray[(y - 1) * width + (x + 1)] +
            -2 * gray[y * width + (x - 1)] + 2 * gray[y * width + (x + 1)] +
            -gray[(y + 1) * width + (x - 1)] + gray[(y + 1) * width + (x + 1)];

          const gy =
            -gray[(y - 1) * width + (x - 1)] - 2 * gray[(y - 1) * width + x] - gray[(y - 1) * width + (x + 1)] +
            gray[(y + 1) * width + (x - 1)] + 2 * gray[(y + 1) * width + x] + gray[(y + 1) * width + (x + 1)];

          const mag = Math.sqrt(gx * gx + gy * gy);
          if (mag > 115) {
            highEntropyEdges++;
          }
        }
      }

      const sampledPixels = (width / 2) * (height / 2);
      const edgeEntropyRatio = highEntropyEdges / sampledPixels;
      const floodRatio = floodWaterPixels / totalPixels;
      const fireRatio = firePixels / totalPixels;
      const smokeRatio = smokePixels / totalPixels;

      // Classify disaster
      let type = "No Active Disaster";
      let severity = "NONE";
      let confidence = 92;
      let hazardColor = "#10b981";
      let summary = "No disaster anomalies detected. Terrain is stable.";
      let recommendation = "Area clear. Continue routine aerial search scan.";

      // 1. Fire / Wildfire
      if (fireRatio > 0.008 || (fireRatio > 0.003 && smokeRatio > 0.15)) {
        type = "Wildfire & Smoke Hazard";
        severity = fireRatio > 0.03 || smokeRatio > 0.3 ? "CRITICAL" : "HIGH";
        confidence = Math.min(98, Math.round(75 + (fireRatio * 350) + (smokeRatio * 40)));
        hazardColor = "#ef4444";
        summary = `Active fire line and smoke plume detected (Thermal index: ${(fireRatio * 100).toFixed(1)}%, Smoke density: ${(smokeRatio * 100).toFixed(1)}%).`;
        recommendation = "Immediate aerial evacuation path needed. Alert local firefighting command.";
      }
      // 2. Flood / Water Inundation
      else if (floodRatio > 0.20) {
        type = "Flood & Water Inundation";
        severity = floodRatio > 0.45 ? "CRITICAL" : "HIGH";
        confidence = Math.min(97, Math.round(68 + floodRatio * 40));
        hazardColor = "#0284c7";
        summary = `Extensive water inundation detected covering ${(floodRatio * 100).toFixed(1)}% of the surface area.`;
        recommendation = "Dispatch rescue boat / helicopter winch to stranded individuals.";
      }
      // 3. Structural Collapse / Earthquake Rubble
      else if (edgeEntropyRatio > 0.24) {
        type = "Structural Collapse / Rubble";
        severity = edgeEntropyRatio > 0.35 ? "CRITICAL" : "HIGH";
        confidence = Math.min(96, Math.round(65 + edgeEntropyRatio * 75));
        hazardColor = "#f59e0b";
        summary = `Heavy structural fragmentation and debris field detected (Entropy index: ${(edgeEntropyRatio * 100).toFixed(1)}%).`;
        recommendation = "Deploy acoustic listening devices and urban search-and-rescue (USAR) team.";
      }
      // 4. Mudslide / Landslide
      else if (mudPixels / totalPixels > 0.35 && edgeEntropyRatio > 0.15) {
        type = "Landslide / Mudflow";
        severity = "HIGH";
        confidence = Math.min(94, Math.round(70 + (mudPixels / totalPixels) * 30));
        hazardColor = "#d97706";
        summary = "Significant earth displacement and mudflow signatures detected across slope.";
        recommendation = "Caution: high risk of secondary slope failure. Establish safe perimeter.";
      }

      resolve({
        type,
        severity,
        confidence,
        hazardColor,
        summary,
        recommendation,
        metrics: {
          waterCoverage: Math.round(floodRatio * 100),
          smokeDensity: Math.round(smokeRatio * 100),
          thermalIndex: Math.round(fireRatio * 100),
          debrisEntropy: Math.round(edgeEntropyRatio * 100)
        }
      });
    } catch (err) {
      console.error("Disaster analysis failed:", err);
      resolve({
        type: "Analysis Offline",
        severity: "UNKNOWN",
        confidence: 0,
        hazardColor: "#64748b",
        summary: "Unable to parse image pixel array.",
        recommendation: "Inspect image format and re-upload.",
        metrics: { waterCoverage: 0, smokeDensity: 0, thermalIndex: 0, debrisEntropy: 0 }
      });
    }
  });
}
