// Document boundary detector — lightweight edge detection for paper/notebook detection
// Uses Sobel edge detection on reduced-resolution frames for speed.
// This is a visual hint, not the capture mechanism — the scan button does the actual capture.

interface Point {
  x: number;
  y: number;
}

export interface DetectionResult {
  detected: boolean;
  confidence: number; // 0-1
  corners?: [Point, Point, Point, Point]; // TL, TR, BR, BL (normalized 0-1)
}

const DETECT_WIDTH = 160;
const DETECT_HEIGHT = 120;

// Reusable canvas for detection (avoid creating new ones every frame)
let detectCanvas: HTMLCanvasElement | null = null;
let detectCtx: CanvasRenderingContext2D | null = null;

function getDetectCanvas(): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } | null {
  if (!detectCanvas) {
    detectCanvas = document.createElement("canvas");
    detectCanvas.width = DETECT_WIDTH;
    detectCanvas.height = DETECT_HEIGHT;
    detectCtx = detectCanvas.getContext("2d", { willReadFrequently: true });
  }
  if (!detectCtx) return null;
  return { canvas: detectCanvas, ctx: detectCtx };
}

/**
 * Detect if a document/paper is visible in the video frame.
 * Uses simple edge detection + rectangle heuristics.
 */
export function detectDocument(video: HTMLVideoElement): DetectionResult {
  if (!video.videoWidth || !video.videoHeight) {
    return { detected: false, confidence: 0 };
  }

  const setup = getDetectCanvas();
  if (!setup) return { detected: false, confidence: 0 };

  const { ctx } = setup;

  // Draw video frame at reduced resolution
  ctx.drawImage(video, 0, 0, DETECT_WIDTH, DETECT_HEIGHT);
  const imageData = ctx.getImageData(0, 0, DETECT_WIDTH, DETECT_HEIGHT);
  const data = imageData.data;

  // Convert to grayscale
  const gray = new Uint8Array(DETECT_WIDTH * DETECT_HEIGHT);
  for (let i = 0; i < gray.length; i++) {
    const idx = i * 4;
    gray[i] = Math.round(data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114);
  }

  // Sobel edge detection
  const edges = new Uint8Array(DETECT_WIDTH * DETECT_HEIGHT);
  let edgeCount = 0;
  const threshold = 50;

  for (let y = 1; y < DETECT_HEIGHT - 1; y++) {
    for (let x = 1; x < DETECT_WIDTH - 1; x++) {
      const idx = y * DETECT_WIDTH + x;

      // Sobel X
      const gx =
        -gray[(y - 1) * DETECT_WIDTH + (x - 1)] +
        gray[(y - 1) * DETECT_WIDTH + (x + 1)] +
        -2 * gray[y * DETECT_WIDTH + (x - 1)] +
        2 * gray[y * DETECT_WIDTH + (x + 1)] +
        -gray[(y + 1) * DETECT_WIDTH + (x - 1)] +
        gray[(y + 1) * DETECT_WIDTH + (x + 1)];

      // Sobel Y
      const gy =
        -gray[(y - 1) * DETECT_WIDTH + (x - 1)] +
        -2 * gray[(y - 1) * DETECT_WIDTH + x] +
        -gray[(y - 1) * DETECT_WIDTH + (x + 1)] +
        gray[(y + 1) * DETECT_WIDTH + (x - 1)] +
        2 * gray[(y + 1) * DETECT_WIDTH + x] +
        gray[(y + 1) * DETECT_WIDTH + (x + 1)];

      const magnitude = Math.sqrt(gx * gx + gy * gy);
      if (magnitude > threshold) {
        edges[idx] = 255;
        edgeCount++;
      }
    }
  }

  const totalPixels = (DETECT_WIDTH - 2) * (DETECT_HEIGHT - 2);
  const edgeRatio = edgeCount / totalPixels;

  // Heuristic: a document in frame typically produces moderate edge density
  // (borders of paper create strong edges, content creates medium edges)
  // Too few edges = no document, too many = noise/complex background
  const hasDocument = edgeRatio > 0.03 && edgeRatio < 0.25;
  const confidence = hasDocument ? Math.min(1, edgeRatio / 0.1) : 0;

  if (hasDocument) {
    // Find approximate bounding box of edge-dense region
    let minX = DETECT_WIDTH, maxX = 0, minY = DETECT_HEIGHT, maxY = 0;
    for (let y = 1; y < DETECT_HEIGHT - 1; y++) {
      for (let x = 1; x < DETECT_WIDTH - 1; x++) {
        if (edges[y * DETECT_WIDTH + x]) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    // Only report detection if bounding box is reasonable size (at least 30% of frame)
    const boxWidth = (maxX - minX) / DETECT_WIDTH;
    const boxHeight = (maxY - minY) / DETECT_HEIGHT;

    if (boxWidth > 0.3 && boxHeight > 0.3) {
      return {
        detected: true,
        confidence,
        corners: [
          { x: minX / DETECT_WIDTH, y: minY / DETECT_HEIGHT },
          { x: maxX / DETECT_WIDTH, y: minY / DETECT_HEIGHT },
          { x: maxX / DETECT_WIDTH, y: maxY / DETECT_HEIGHT },
          { x: minX / DETECT_WIDTH, y: maxY / DETECT_HEIGHT },
        ],
      };
    }
  }

  return { detected: false, confidence: 0 };
}
