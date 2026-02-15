// Manim video service wrapper — generates 3blue1brown-style math animations
// Wraps the Manim REST API. No external types leak outside.
// Server-side only (uses NEXT_PUBLIC_MANIM_URL).

const MANIM_BASE_URL = process.env.NEXT_PUBLIC_MANIM_URL;

export interface ManimVideo {
  filename: string;
  prompt: string;
  length?: number;
}

export interface ManimClient {
  getExistingVideos(): Promise<ManimVideo[]>;
  getVideoUrl(filename: string): string;
  generateVideo(prompt: string): Promise<string>;
}

export function createManimClient(): ManimClient {
  if (!MANIM_BASE_URL) {
    throw new Error("NEXT_PUBLIC_MANIM_URL is not set");
  }

  return {
    async getExistingVideos() {
      try {
        console.log("Getting existing videos from", MANIM_BASE_URL);
        const res = await fetch(`${MANIM_BASE_URL}/exists`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });
        if (!res.ok) return [];
        const data = await res.json();
        return (data.videos ?? []) as ManimVideo[];
      } catch (err) {
        console.error("[manim] Failed to fetch existing videos:", err);
        return [];
      }
    },

    getVideoUrl(filename: string) {
      return `${MANIM_BASE_URL}/videos/${filename}`;
    },

    async generateVideo(prompt: string) {
      // Manim generation can take 60-120+ seconds for complex animations
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5 * 60 * 1000); // 5 minute timeout
      
      try {
        const res = await fetch(`${MANIM_BASE_URL}/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        
        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`Manim generation failed: ${res.status} ${errText}`);
        }
        const data = await res.json();
        return data.url; //`${MANIM_BASE_URL}${data.url}`;
      } catch (err) {
        clearTimeout(timeoutId);
        throw err;
      }
    },
  };
}
