// Shared Desmos API script loader
// Prevents duplicate script tags when DesmosPanel and Desmos3DPanel mount simultaneously.

let status: "idle" | "loading" | "loaded" = "idle";
const callbacks: (() => void)[] = [];

export function loadDesmosScript(apiKey?: string): Promise<void> {
  // Already loaded
  if (status === "loaded" || (typeof window !== "undefined" && window.Desmos)) {
    status = "loaded";
    return Promise.resolve();
  }

  // Currently loading — queue callback
  if (status === "loading") {
    return new Promise<void>((resolve) => {
      callbacks.push(resolve);
    });
  }

  // Start loading
  status = "loading";

  return new Promise<void>((resolve, reject) => {
    callbacks.push(resolve);

    const script = document.createElement("script");
    const key =
      apiKey ||
      (typeof process !== "undefined"
        ? process.env.NEXT_PUBLIC_DESMOS_API_KEY
        : undefined) ||
      "dcb31709b452b1cf9dc26972add0fda6";
    script.src = `https://www.desmos.com/api/v1.11/calculator.js?apiKey=${key}`;
    script.async = true;
    script.onload = () => {
      status = "loaded";
      const pending = callbacks.splice(0);
      for (const cb of pending) cb();
    };
    script.onerror = () => {
      status = "idle";
      const pending = callbacks.splice(0);
      reject(new Error("Failed to load Desmos API script"));
      // Reject remaining
      for (const cb of pending) {
        void cb; // already resolved above
      }
    };
    document.head.appendChild(script);
  });
}
