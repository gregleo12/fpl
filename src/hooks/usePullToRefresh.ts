'use client';

import { useEffect, useState, useRef } from 'react';

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void>;
  threshold?: number;
  enabled?: boolean;
}

export function usePullToRefresh({
  onRefresh,
  threshold = 80,
  enabled = true,
}: UsePullToRefreshOptions) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const startY = useRef(0);
  const currentY = useRef(0);

  useEffect(() => {
    if (!enabled) return;

    let rafId: number;

    const handleTouchStart = (e: TouchEvent) => {
      if (window.scrollY === 0) {
        startY.current = e.touches[0].clientY;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (window.scrollY === 0 && startY.current > 0) {
        currentY.current = e.touches[0].clientY;
        const distance = currentY.current - startY.current;

        if (distance > 0) {
          // Prevent default scrolling when pulling down
          e.preventDefault();

          // Ease the pull distance (diminishing returns)
          const easedDistance = Math.min(distance * 0.5, threshold * 1.5);

          rafId = requestAnimationFrame(() => {
            setPullDistance(easedDistance);
          });
        }
      }
    };

    const handleTouchEnd = async () => {
      if (pullDistance >= threshold && !isRefreshing) {
        setIsRefreshing(true);
        setPullDistance(0);

        try {
          await onRefresh();
        } finally {
          setIsRefreshing(false);
        }
      } else {
        setPullDistance(0);
      }

      startY.current = 0;
      currentY.current = 0;
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [enabled, onRefresh, threshold, isRefreshing, pullDistance]);

  return { isRefreshing, pullDistance };
}
