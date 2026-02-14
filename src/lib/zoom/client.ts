// Zoom Video SDK wrapper — black box module
// Wraps @zoom/videosdk. No Zoom SDK types leak outside.
// See: specs/001-minerva-mvp/plan.md (Black Box Interfaces)
//
// The Zoom Video SDK renders video to a <canvas> element using
// renderVideo() and uses WebAssembly for media processing.

// Dynamic import — @zoom/videosdk uses `window` at module level (no SSR)
import type { ZoomClient, ZoomSessionStatus } from "./types";

export type { ZoomClient, ZoomSessionStatus };

export async function createZoomClient(): Promise<ZoomClient> {
  const { default: ZoomVideo } = await import("@zoom/videosdk");
  const client = ZoomVideo.createClient();
  let status: ZoomSessionStatus = "idle";
  let muted = false;

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
        });

        await client.join(topic, token, userName);

        notifyStatus("connected");
      } catch (err) {
        console.error("[ZoomClient] Failed to join session:", err);
        notifyStatus("error");
        throw err;
      }
    },

    async leaveSession() {
      try {
        await client.leave();
        notifyStatus("disconnected");
      } catch (err) {
        console.error("[ZoomClient] Error leaving session:", err);
        notifyStatus("disconnected");
      }
    },

    async startVideo(container: HTMLElement) {
      try {
        const stream = client.getMediaStream();
        await stream.startVideo();

        // Attach self-view video element to the container (SDK v2.3+)
        const userId = client.getCurrentUserInfo()?.userId;
        if (userId !== undefined) {
          const videoElement = await stream.attachVideo(userId, 2 /* Video_360P */);
          // Clear previous children and append the new video element
          container.innerHTML = "";
          container.appendChild(videoElement as unknown as HTMLElement);
        }
      } catch (err) {
        console.error("[ZoomClient] Failed to start video:", err);
      }
    },

    async stopVideo() {
      try {
        const stream = client.getMediaStream();
        await stream.stopVideo();
      } catch (err) {
        console.error("[ZoomClient] Failed to stop video:", err);
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
