"use client";

import { useEffect, useState, useRef } from "react";

export function AvatarOverlay() {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Trigger on "m" key press (for Minerva)
      if (e.key.toLowerCase() === "m" && !isAnimating && !e.ctrlKey && !e.metaKey && !e.altKey) {
        // Prevent if user is typing in an input/textarea
        const target = e.target as HTMLElement;
        if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
          return;
        }

        setIsAnimating(true);
        
        // Small delay to ensure smooth fade-in transition
        requestAnimationFrame(() => {
          setIsVisible(true);
        });

        // Play the video from 1.5 seconds before the middle
        if (videoRef.current) {
          const video = videoRef.current;
          // Start 1.5 seconds before the middle of the video
          if (video.duration) {
            video.currentTime = (video.duration / 2) - 1.5;
          } else {
            // If duration not loaded yet, use metadata event
            video.addEventListener('loadedmetadata', () => {
              video.currentTime = (video.duration / 2) - 1.5;
            }, { once: true });
          }
          video.play();
        }

        // Auto-hide after video duration (adjust timing as needed)
        setTimeout(() => {
          setIsVisible(false);
          setTimeout(() => {
            setIsAnimating(false);
          }, 600); // Wait for fade-out transition
        }, 2000); // Show for 2 seconds
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isAnimating]);

  // Always render, but hide when not visible
  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none transition-all duration-500 ease-out ${
        isVisible ? "opacity-100" : "opacity-0"
      }`}
      style={{
        backdropFilter: isVisible ? "blur(8px)" : "blur(0px)",
        display: !isAnimating && !isVisible ? "none" : "flex",
      }}
    >
      {/* Diffuse backdrop */}
      <div
        className={`absolute inset-0 bg-black/20 transition-opacity duration-500 ${
          isVisible ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* Video container with smooth scale animation */}
      <div
        className={`relative w-full h-full flex items-center justify-center transform transition-all duration-700 ease-out ${
          isVisible
            ? "scale-100 opacity-100"
            : "scale-95 opacity-0"
        }`}
      >
        <video
          ref={videoRef}
          src="/avatar-preview.mp4"
          muted
          playsInline
          preload="metadata"
          className="max-w-[90vw] max-h-[90vh] w-auto h-auto object-contain rounded-2xl shadow-2xl"
          style={{
            filter: "drop-shadow(0 25px 50px rgba(146, 160, 225, 0.4))",
          }}
        />

        {/* Subtle glow effect */}
        <div
          className={`absolute inset-0 bg-gradient-to-br from-brand-primary/20 via-brand-secondary/10 to-transparent blur-3xl transition-opacity duration-700 ${
            isVisible ? "opacity-100" : "opacity-0"
          }`}
        />
      </div>
    </div>
  );
}
