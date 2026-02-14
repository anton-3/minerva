// Zoom Video SDK custom HTML elements (v2.3+)
// attachVideo() returns a <video-player> that must live inside <video-player-container>

import "react";

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "video-player-container": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      >;
      "video-player": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      >;
    }
  }
}
