import { useEffect, useRef, useState } from 'react';

import { cn } from '@/lib/utils';

type BeforeAfterVideoProps = {
  before: { src: string; poster: string };
  after: { src: string; poster: string };
  /** Photo the "after" clip was generated from, shown as a corner badge. */
  photo?: { src: string; label: string };
  labels: { before: string; after: string; slider: string };
  width: number;
  height: number;
  /** Sound of the generated clip; the original always stays muted. */
  muted?: boolean;
  className?: string;
};

/**
 * Two synced muted loops stacked on top of each other; dragging the divider
 * reveals the original clip on the left and the generated one on the right.
 * Videos load only near the viewport and pause off-screen.
 */
export function BeforeAfterVideo({
  before,
  after,
  photo,
  labels,
  width,
  height,
  muted = true,
  className,
}: BeforeAfterVideoProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const beforeRef = useRef<HTMLVideoElement>(null);
  const afterRef = useRef<HTMLVideoElement>(null);
  const [position, setPosition] = useState(50);
  const [load, setLoad] = useState(false);
  const [near, setNear] = useState(false);

  // Defer the posters until the slider approaches the viewport.
  useEffect(() => {
    const root = rootRef.current;
    if (!root || near) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) setNear(true);
      },
      { rootMargin: '600px' }
    );
    observer.observe(root);
    return () => observer.disconnect();
  }, [near]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        const videos = [beforeRef.current, afterRef.current];
        if (entry?.isIntersecting) {
          setLoad(true);
          videos.forEach((video) => video?.play().catch(() => {}));
        } else {
          videos.forEach((video) => video?.pause());
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  // Keep the original clip on the generated clip's clock.
  const sync = () => {
    const lead = afterRef.current;
    const follower = beforeRef.current;
    if (!lead || !follower) return;
    if (Math.abs(follower.currentTime - lead.currentTime) > 0.12)
      follower.currentTime = lead.currentTime;
  };

  const videoProps = {
    muted: true,
    loop: true,
    playsInline: true,
    autoPlay: load,
    preload: load ? 'auto' : 'none',
    width,
    height,
    className: 'absolute inset-0 size-full object-cover',
  } as const;

  return (
    <div
      ref={rootRef}
      style={{ aspectRatio: `${width} / ${height}` }}
      className={cn(
        'eg-screen relative overflow-hidden rounded-md select-none',
        className
      )}
    >
      <video
        ref={afterRef}
        src={load ? after.src : undefined}
        poster={near || load ? after.poster : undefined}
        aria-label={labels.after}
        onTimeUpdate={sync}
        {...videoProps}
        muted={muted}
      />
      <video
        ref={beforeRef}
        src={load ? before.src : undefined}
        poster={near || load ? before.poster : undefined}
        aria-label={labels.before}
        style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
        {...videoProps}
      />

      <div
        aria-hidden
        style={{ left: `${position}%` }}
        className="pointer-events-none absolute inset-y-0 -translate-x-1/2"
      >
        <div className="h-full w-0.5 bg-white/90 shadow-[0_0_12px_rgb(0_0_0/0.6)]" />
        <div className="absolute top-1/2 left-1/2 flex size-10 -translate-1/2 items-center justify-center gap-0.5 rounded-full bg-white text-neutral-900 shadow-lg">
          <svg viewBox="0 0 24 24" className="size-5" fill="currentColor">
            <path d="M9 6 3 12l6 6V6Zm6 0v12l6-6-6-6Z" />
          </svg>
        </div>
      </div>

      <span className="pointer-events-none absolute top-3 left-3 rounded-full bg-black/70 px-2.5 py-1 font-mono text-[10px] tracking-[0.16em] text-white uppercase backdrop-blur">
        {labels.before}
      </span>
      <span className="bg-primary text-primary-foreground pointer-events-none absolute top-3 right-3 rounded-full px-2.5 py-1 font-mono text-[10px] tracking-[0.16em] uppercase">
        {labels.after}
      </span>

      {photo && (
        <span className="pointer-events-none absolute right-3 bottom-3 flex items-center gap-2 rounded-full bg-black/70 py-1 pr-3 pl-1 text-xs text-white backdrop-blur">
          <img
            src={photo.src}
            alt=""
            width={28}
            height={28}
            loading="lazy"
            className="size-7 rounded-full object-cover ring-2 ring-white/80"
          />
          {photo.label}
        </span>
      )}

      <input
        type="range"
        min={0}
        max={100}
        step={0.5}
        value={position}
        aria-label={labels.slider}
        onChange={(event) => setPosition(Number(event.target.value))}
        className="absolute inset-0 size-full cursor-ew-resize opacity-0"
      />
    </div>
  );
}
