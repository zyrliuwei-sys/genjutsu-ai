import { useRef } from 'react';
import { Play } from 'lucide-react';

export function VideoComparison({
  source,
  result,
  copy,
}: {
  source?: string;
  result?: string | null;
  copy: {
    before: string;
    after: string;
    empty: string;
    missing: string;
    play: string;
  };
}) {
  const before = useRef<HTMLVideoElement>(null);
  const after = useRef<HTMLVideoElement>(null);
  return (
    <div className="flex h-full w-full flex-col gap-3 p-3 sm:p-4">
      <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2">
        {[
          { url: source, label: copy.before, ref: before },
          { url: result, label: copy.after, ref: after },
        ].map(({ url, label, ref }) => (
          <div
            key={label}
            className="flex min-h-48 flex-col overflow-hidden rounded-lg border border-white/15 bg-white/5"
          >
            <p className="border-b border-white/10 px-3 py-2 text-xs font-medium text-white/80">
              {label}
            </p>
            {url ? (
              <video
                ref={ref}
                src={url}
                controls
                muted
                playsInline
                preload="metadata"
                className="min-h-0 w-full flex-1 object-contain"
              />
            ) : (
              <p className="m-auto px-4 py-8 text-center text-xs leading-relaxed text-white/60">
                {label === copy.after ? copy.empty : copy.missing}
              </p>
            )}
          </div>
        ))}
      </div>
      {source && result && (
        <button
          type="button"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-white/20 px-3 py-2 text-xs text-white"
          onClick={() => {
            for (const video of [before.current, after.current]) {
              if (!video) continue;
              video.currentTime = 0;
              void video.play().catch(() => undefined);
            }
          }}
        >
          <Play className="size-3.5" />
          {copy.play}
        </button>
      )}
    </div>
  );
}
