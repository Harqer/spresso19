import React, { useState, useRef, useEffect } from "react";
import { MaterialIcon } from "../MaterialIcon";

export interface ReviewVideoData {
  id: string;
  authorName: string;
  rating: number;
  commentText: string;
  thumbnailUrl: string;
  videoUrl: string;
}

interface VideoReviewItemProps {
  review: ReviewVideoData;
}

export const VideoReviewItem: React.FC<VideoReviewItemProps> = ({ review }) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    return () => {
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current = null;
      }
    };
  }, []);

  return (
    <div className="w-full py-3 space-y-2 border-b border-stone-200 dark:border-stone-800 text-stone-900 dark:text-stone-100">
      {/* Review Header: Zero Container Box */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold">{review.authorName}</span>
        <div className="flex items-center space-x-1 text-amber-500">
          <MaterialIcon icon="star" size={14} />
          <span className="text-xs font-bold">{review.rating}</span>
        </div>
      </div>

      <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
        {review.commentText}
      </p>

      {/* Seamless Video Container with Zero Card Background */}
      <div className="relative w-full h-48 rounded-xl overflow-hidden bg-black flex items-center justify-center cursor-pointer group">
        {!isPlaying ? (
          <>
            <img
              src={review.thumbnailUrl}
              alt={review.authorName}
              className="w-full h-full object-cover opacity-80 group-hover:opacity-90 transition duration-300"
            />
            <button
              onClick={() => setIsPlaying(true)}
              className="absolute z-10 w-12 h-12 rounded-full bg-black/70 hover:bg-[#446732] text-white flex items-center justify-center shadow-xl border border-white/30 transition transform group-hover:scale-110 cursor-pointer"
            >
              <MaterialIcon icon="play_arrow" size={28} />
            </button>
            <span className="absolute bottom-2 left-2 text-[10px] font-mono font-bold text-white bg-black/60 px-2 py-0.5 rounded">
              TAP TO PLAY VIDEO REVIEW
            </span>
          </>
        ) : (
          <video
            ref={videoRef}
            src={review.videoUrl}
            controls
            autoPlay
            className="w-full h-full object-cover"
            onEnded={() => setIsPlaying(false)}
          />
        )}
      </div>
    </div>
  );
};
