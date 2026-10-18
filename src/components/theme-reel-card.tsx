import { useRef, useState } from 'react';
import { ArrowRight, Play } from 'lucide-react';

import { cn } from '@/lib/utils';

/** Poster that plays its muted clip on hover (tap toggles on touch). */
export function ThemeReelCard({
  src,
  poster,
  title,
  index,
  actionLabel,
  onAction,
  featured = false,
}: {
  src: string;
  poster: string;
  title: string;
  index: number;
  actionLabel: string;
  onAction: () => void;
  featured?: boolean;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const play = () => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    void ref.current?.play().catch(() => {});
  };
  const pause = () => ref.current?.pause();
  return (
    <figure
      className={cn('reel-card', featured && 'reel-card-featured')}
      data-playing={playing}
      onPointerEnter={(e) => e.pointerType === 'mouse' && play()}
      onPointerLeave={(e) => e.pointerType === 'mouse' && pause()}
    >
      <video
        ref={ref}
        src={src}
        poster={poster}
        aria-label={title}
        muted
        loop
        playsInline
        preload="none"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onClick={() => (ref.current?.paused ? play() : pause())}
      />
      <span className="reel-card-play" aria-hidden>
        <Play size={featured ? 22 : 16} fill="currentColor" />
      </span>
      <figcaption>
        <span className="reel-card-index" aria-hidden>
          {String(index).padStart(2, '0')}
        </span>
        <h3>{title}</h3>
        <button type="button" onClick={onAction}>
          {actionLabel}
          <ArrowRight size={15} aria-hidden />
        </button>
      </figcaption>
    </figure>
  );
}
