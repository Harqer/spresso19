import React, { useState, useRef, useEffect, ReactNode } from "react";
import { MaterialIcon } from "./MaterialIcon";
import { M3ExpressiveCircularProgress } from "./M3ExpressiveCircularProgress";

export interface PullToRefreshBoxProps {
  isRefreshing: boolean;
  onRefresh: () => void | Promise<void>;
  children: ReactNode;
  modifier?: string;
  /** Custom indicator render function */
  indicator?: (props: {
    isRefreshing: boolean;
    distanceFraction: number;
    pullDistance: number;
  }) => ReactNode;
  /** Positional threshold in pixels to trigger refresh (default: 80) */
  threshold?: number;
  /** Custom container background or style */
  containerClassName?: string;
}

export const PullToRefreshBox: React.FC<PullToRefreshBoxProps> = ({
  isRefreshing,
  onRefresh,
  children,
  modifier = "",
  indicator,
  threshold = 80,
  containerClassName = ""
}) => {
  const [pullDistance, setPullDistance] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const startYRef = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const distanceFraction = Math.min(1, pullDistance / threshold);

  // Handle Touch Start
  const handleTouchStart = (e: React.TouchEvent) => {
    if (containerRef.current && containerRef.current.scrollTop === 0 && !isRefreshing) {
      startYRef.current = e.touches[0].clientY;
      setIsDragging(true);
    }
  };

  // Handle Touch Move
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || isRefreshing) return;
    const currentY = e.touches[0].clientY;
    const deltaY = currentY - startYRef.current;

    // Only pull when at the top of the container
    if (deltaY > 0 && containerRef.current && containerRef.current.scrollTop <= 0) {
      // Apply rubberband dampening factor
      const dampenedDistance = Math.min(deltaY * 0.45, threshold * 1.5);
      setPullDistance(dampenedDistance);
    } else {
      setPullDistance(0);
    }
  };

  // Handle Touch End / Mouse Up
  const handleTouchEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);

    if (pullDistance >= threshold && !isRefreshing) {
      setPullDistance(threshold);
      onRefresh();
    } else {
      setPullDistance(0);
    }
  };

  // Reset pull distance when refreshing completes
  useEffect(() => {
    if (!isRefreshing && !isDragging) {
      setPullDistance(0);
    }
  }, [isRefreshing, isDragging]);

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className={`relative overflow-y-auto overflow-x-hidden ${containerClassName} ${modifier}`}
      style={{ touchAction: "pan-y" }}
    >
      {/* Pull To Refresh Indicator Banner / Floating Box */}
      <div
        className="absolute left-0 right-0 top-0 z-30 flex items-center justify-center pointer-events-none transition-transform duration-200 ease-out"
        style={{
          transform: `translateY(${
            isRefreshing ? 16 : Math.max(0, pullDistance - 48)
          }px)`,
          opacity: isRefreshing || pullDistance > 10 ? 1 : 0
        }}
      >
        {indicator ? (
          indicator({ isRefreshing, distanceFraction, pullDistance })
        ) : (
          <div className="px-4 py-2 bg-white/95 dark:bg-[#191d16]/95 border border-[#dfe4d7] dark:border-[#43483e] shadow-md rounded-full flex items-center space-x-2.5 backdrop-blur-md">
            {isRefreshing ? (
              <M3ExpressiveCircularProgress size={24} />
            ) : (
              <div
                className="w-6 h-6 flex items-center justify-center text-[#446732] dark:text-[#a9d291] transition-transform duration-150"
                style={{
                  transform: `rotate(${distanceFraction * 180}deg) scale(${
                    0.6 + distanceFraction * 0.4
                  })`
                }}
              >
                <MaterialIcon
                  icon={distanceFraction >= 1 ? "refresh" : "arrow_downward"}
                  size={18}
                />
              </div>
            )}
            <span className="text-xs font-serif font-bold text-[#191d16] dark:text-[#e1e4d9]">
              {isRefreshing
                ? "Refreshing data..."
                : distanceFraction >= 1
                ? "Release to refresh"
                : "Pull down to refresh"}
            </span>
          </div>
        )}
      </div>

      {/* Main Scroll Content with Rubberband Pull Down Shift */}
      <div
        className="transition-transform duration-200 ease-out w-full h-full"
        style={{
          transform: `translateY(${isRefreshing ? 52 : pullDistance * 0.5}px)`
        }}
      >
        {children}
      </div>
    </div>
  );
};
