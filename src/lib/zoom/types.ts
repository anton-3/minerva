// Zoom module types — no @zoom/videosdk types leak outside
// Owner: Person B (Media Specialist)


export type ZoomSessionStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "disconnected"
  | "error";

export interface ZoomClient {
  /** Join a Zoom Video SDK session */
  joinSession(options: {
    topic: string;
    token: string;
    userName: string;
  }): Promise<void>;

  /** Leave the current session */
  leaveSession(): Promise<void>;

  /** Start local video capture and attach self-view to a container */
  startVideo(container: HTMLElement): Promise<void>;

  /** Stop local video */
  stopVideo(): Promise<void>;

  /** Start audio (mic + speaker) */
  startAudio(): Promise<void>;

  /** Mute/unmute mic */
  toggleMute(): Promise<boolean>;

  /** Check if currently muted */
  isMuted(): boolean;

  /** Register status change callback */
  onStatusChange(callback: (status: ZoomSessionStatus) => void): void;

  /** Get current session status */
  getStatus(): ZoomSessionStatus;
}
