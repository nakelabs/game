import React, { useEffect, useRef } from 'react';
import { FastForward } from 'lucide-react';

interface VideoPlayerProps {
  isPlaying: boolean;
  isFadingOut: boolean;
  onPrewarm: () => void;
  onVideoEnd: () => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  isPlaying,
  isFadingOut,
  onPrewarm,
  onVideoEnd,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const completedRef = useRef(false);
  const prewarmedRef = useRef(false);

  const triggerHandoff = () => {
    if (completedRef.current) return;
    completedRef.current = true;
    if (!prewarmedRef.current) {
      prewarmedRef.current = true;
      onPrewarm();
    }
    onVideoEnd();
    // Pause video only after the 300ms crossfade completes so the video remains in motion during the dissolve!
    window.setTimeout(() => {
      if (videoRef.current) {
        videoRef.current.pause();
      }
    }, 320);
  };

  const handleTimeUpdate = () => {
    const videoEl = videoRef.current;
    if (!videoEl || completedRef.current) return;

    if (Number.isFinite(videoEl.duration) && videoEl.duration > 0) {
      const remaining = videoEl.duration - videoEl.currentTime;
      if (!prewarmedRef.current && remaining <= 1.2) {
        prewarmedRef.current = true;
        onPrewarm();
      }
      // Trigger cross-dissolve handoff slightly before the final frame so there is zero pause or black hitch!
      if (remaining <= 0.16) {
        triggerHandoff();
      }
    }
  };

  useEffect(() => {
    if (!isPlaying) {
      completedRef.current = false;
      prewarmedRef.current = false;
      return;
    }

    const videoEl = videoRef.current;
    if (!videoEl) {
      triggerHandoff();
      return;
    }

    // Play immediately with unlocked audio since START DELIVERY was just clicked
    videoEl.currentTime = 0;
    videoEl.muted = false;
    const playPromise = videoEl.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        // If ./into/story.mp4 cannot play, seamlessly transition straight into gameplay
        triggerHandoff();
      });
    }
  }, [isPlaying]);

  return (
    <div
      className={`absolute inset-0 z-30 flex items-center justify-center overflow-hidden transition-opacity duration-300 ease-out ${
        isPlaying && !isFadingOut
          ? 'opacity-100'
          : 'opacity-0 pointer-events-none'
      }`}
    >
      <video
        ref={videoRef}
        src="./into/story.mp4"
        playsInline
        preload="auto"
        onTimeUpdate={handleTimeUpdate}
        onEnded={triggerHandoff}
        onError={triggerHandoff}
        className="w-full h-full object-cover"
      />

      {/* Subtle Skip Intro button in top-right corner for rapid testing */}
      <button
        type="button"
        onClick={triggerHandoff}
        className="absolute top-3 right-3 sm:top-5 sm:right-5 z-40 flex items-center gap-1.5 px-3.5 py-1.5 bg-[#0D0C10]/85 hover:bg-[#FFCC00] text-white/90 hover:text-[#0D0C10] font-bold text-xs sm:text-sm uppercase tracking-wider border-2 border-white/30 hover:border-[#0D0C10] transition-colors shadow-[3px_3px_0px_#0D0C10] cursor-pointer"
      >
        <span>Skip Intro</span>
        <FastForward className="w-3.5 h-3.5" />
      </button>

      {/* Bottom Cinematic Vignette Badge */}
      <div className="absolute bottom-3 left-4 pointer-events-none flex items-center gap-2 bg-[#0D0C10]/80 px-2.5 py-1 border border-[#FFCC00]/40">
        <span className="w-2 h-2 rounded-full bg-[#FF2E2E] animate-ping" />
        <span className="text-[10px] sm:text-xs font-mono tracking-widest uppercase text-[#FFCC00]">
          LAGOS DISPATCH FEED // STORY.MP4
        </span>
      </div>
    </div>
  );
};
