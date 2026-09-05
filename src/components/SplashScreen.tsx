import Logger from "../lib/Logger";
import React, { useRef, useEffect } from "react";
import { motion } from "motion/react";

interface SplashScreenProps {
  onSplashComplete?: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onSplashComplete }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.currentTime = 0;
    video.muted = false;
    video.volume = 1.0;

    const attemptPlay = async () => {
      try {
        await video.play();
      } catch (err) {
        Logger.warn("Unmuted autoplay restricted by browser, fallback to muted autoplay:", err);
        video.muted = true;
        await video.play();
      }
    };

    attemptPlay();

    // Enable audio on user interaction anywhere on screen
    const unlockAudio = () => {
      if (video) {
        video.muted = false;
        video.volume = 1.0;
        video.play().catch(() => {});
      }
      window.removeEventListener("pointerdown", unlockAudio);
      window.removeEventListener("touchstart", unlockAudio);
      window.removeEventListener("keydown", unlockAudio);
    };

    window.addEventListener("pointerdown", unlockAudio);
    window.addEventListener("touchstart", unlockAudio);
    window.addEventListener("keydown", unlockAudio);

    return () => {
      window.removeEventListener("pointerdown", unlockAudio);
      window.removeEventListener("touchstart", unlockAudio);
      window.removeEventListener("keydown", unlockAudio);
    };
  }, []);

  const handleEnded = () => {
    onSplashComplete?.();
  };

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      onClick={() => {
        if (videoRef.current) {
          videoRef.current.muted = false;
          videoRef.current.volume = 1.0;
          videoRef.current.play().catch(() => {});
        }
      }}
      className="fixed inset-0 z-50 bg-black flex items-center justify-center overflow-hidden select-none cursor-pointer"
    >
      <video
        ref={videoRef}
        src="/splash_video.mp4"
        autoPlay
        playsInline
        aria-hidden="true"
        onEnded={handleEnded}
        className="w-full h-full object-cover pointer-events-none"
      />

      {/* Skip Button Overlay */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onSplashComplete?.();
        }}
        className="absolute bottom-6 right-6 px-4 py-2 bg-black/60 hover:bg-black/80 text-white/90 hover:text-white text-xs font-semibold rounded-full border border-white/20 backdrop-blur-md transition-all cursor-pointer z-10"
      >
        Skip
      </button>
    </motion.div>
  );
};
