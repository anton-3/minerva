// Camera frame capture utility — captures a single frame from a video element
// Used for document scanning: user points camera at paper, clicks scan,
// frame is captured and sent to Claude Vision for analysis.

export interface ScanResult {
  base64: string;
  mediaType: "image/jpeg";
}

/**
 * Capture a single frame from a video element as a JPEG base64 string.
 * Returns null if the video isn't playing or has no dimensions.
 */
export function captureFrame(
  video: HTMLVideoElement,
  quality = 0.85
): ScanResult | null {
  if (!video.videoWidth || !video.videoHeight) return null;

  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  const dataUrl = canvas.toDataURL("image/jpeg", quality);
  // Strip "data:image/jpeg;base64," prefix
  const base64 = dataUrl.replace(/^data:image\/jpeg;base64,/, "");

  return { base64, mediaType: "image/jpeg" };
}
