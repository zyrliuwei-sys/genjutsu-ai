import { useEffect, useRef, useState } from 'react';

import { cn } from '@/lib/utils';

type LoopVideoProps = {
  src: string;
  poster: string;
  label: string;
  width: number;
  height: number;
  className?: string;
  /** Load immediately instead of waiting for the element to scroll into view. */
  eager?: boolean;
};

/**
 * Muted looping clip that behaves like an image: the poster renders first,
 * the video only loads once it nears the viewport, and it pauses off-screen.
 * Reduced-motion users keep the still poster.
 */
export function LoopVideo({
  src,
  poster,
  label,
  width,
  height,
  className,
  eager,
}: LoopVideoProps) {
  const ref = useRef<HTMLVideoElement>(null);
  const [load, setLoad] = useState(false);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (eager) setLoad(true);

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setLoad(true);
          video.play().catch(() => {});
        } else {
          video.pause();
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, [eager]);

  return (
    <video
      ref={ref}
      src={load ? src : undefined}
      poster={poster}
      aria-label={label}
      width={width}
      height={height}
      muted
      loop
      playsInline
      autoPlay={load}
      preload={load ? 'auto' : 'none'}
      className={cn('object-cover', className)}
    />
  );
}
