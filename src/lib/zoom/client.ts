// Zoom Video SDK wrapper — black box module
// Wraps @zoom/videosdk. No Zoom SDK types leak outside.
//
// Uses attachVideo() API (v2.3+) with <video-player-container> custom elements.
// renderVideo() on <canvas> is deprecated.
// See: https://developers.zoom.us/docs/video-sdk/web/video/

// Dynamic import — @zoom/videosdk uses `window` at module level (no SSR)
import type { ZoomClient, ZoomSessionStatus } from "./types";

export type { ZoomClient, ZoomSessionStatus };

export async function createZoomClient(): Promise<ZoomClient> {
  const ZoomVideoModule = await import("@zoom/videosdk");
  const ZoomVideo = ZoomVideoModule.default;
  const client = ZoomVideo.createClient();
  let status: ZoomSessionStatus = "idle";
  let muted = false;
  let currentUserId: number | undefined;

  const statusCallbacks: ((status: ZoomSessionStatus) => void)[] = [];

  function notifyStatus(newStatus: ZoomSessionStatus) {
    status = newStatus;
    statusCallbacks.forEach((cb) => cb(newStatus));
  }

  return {
    async joinSession({ topic, token, userName }) {
      try {
        notifyStatus("connecting");

        await client.init("en-US", "Global", {
          patchJsMedia: true,
          leaveOnPageUnload: true, // Auto-cleanup on tab close — prevents orphan sessions
        });

        // Handle browser blocking audio auto-play
        client.on("auto-play-audio-failed", () => {
          console.warn("[ZoomClient] Auto-play audio blocked by browser — user interaction needed");
        });

        // Track connection state for reconnection awareness
        client.on("connection-change", (payload: { state: string; reason: string }) => {
          console.log("[ZoomClient] Connection change:", payload.state, payload.reason);
          if (payload.state === "Closed" || payload.state === "Fail") {
            notifyStatus("disconnected");
          } else if (payload.state === "Reconnecting") {
            notifyStatus("connecting");
          }
        });

        await client.join(topic, token, userName);
        currentUserId = client.getCurrentUserInfo()?.userId;

        notifyStatus("connected");
      } catch (err) {
        console.error("[ZoomClient] Failed to join session:", err);
        notifyStatus("error");
        throw err;
      }
    },

    async leaveSession() {
      try {
        // Detach video before leaving to release SDK resources
        if (currentUserId !== undefined) {
          try {
            const stream = client.getMediaStream();
            await stream.detachVideo(currentUserId);
          } catch {
            // May fail if video wasn't started — ignore
          }
        }

        await client.leave();
        notifyStatus("disconnected");
      } catch (err) {
        console.error("[ZoomClient] Error leaving session:", err);
        notifyStatus("disconnected");
      } finally {
        // Always destroy client to release all resources
        // This prevents "duplicated operation" errors on re-join
        try {
          ZoomVideo.destroyClient();
        } catch {
          // Ignore — may already be destroyed
        }
        currentUserId = undefined;
      }
    },

    async startAudio() {
      try {
        const stream = client.getMediaStream();
        await stream.startAudio();
      } catch (err) {
        console.error("[ZoomClient] Failed to start audio:", err);
      }
    },

    async startVideo(container: HTMLElement) {
      try {
        const stream = client.getMediaStream();
        await stream.startVideo();

        // Attach self-view video element to the container (SDK v2.3+)
        // attachVideo() returns a <video-player> custom element
        // that MUST be inside a <video-player-container>
        if (currentUserId !== undefined) {
          const videoElement = await stream.attachVideo(currentUserId, 2 /* Video_360P */);
          container.appendChild(videoElement as unknown as HTMLElement);
        }
      } catch (err) {
        console.error("[ZoomClient] Failed to start video:", err);
      }
    },

    async stopVideo() {
      try {
        const stream = client.getMediaStream();
        if (currentUserId !== undefined) {
          await stream.detachVideo(currentUserId);
        }
        await stream.stopVideo();
      } catch (err) {
        console.error("[ZoomClient] Failed to stop video:", err);
      }
    },

    async toggleMute() {
      try {
        const stream = client.getMediaStream();
        if (muted) {
          await stream.unmuteAudio();
          muted = false;
        } else {
          await stream.muteAudio();
          muted = true;
        }
        return muted;
      } catch (err) {
        console.error("[ZoomClient] Failed to toggle mute:", err);
        return muted;
      }
    },

    isMuted() {
      return muted;
    },

    onStatusChange(callback) {
      statusCallbacks.push(callback);
    },

    getStatus() {
      return status;
    },
  };
}
