import { useState } from 'react';
import { ArrowUp, Clapperboard, ImageIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

export type PromptKind = 'video' | 'image';

/** The hero prompt composer: free text + video/image switch + send. */
export function PromptBox({
  placeholder,
  videoLabel,
  imageLabel,
  submitLabel,
  onSubmit,
  className,
}: {
  placeholder: string;
  videoLabel: string;
  imageLabel: string;
  submitLabel: string;
  onSubmit: (value: { prompt: string; kind: PromptKind }) => void;
  className?: string;
}) {
  const [prompt, setPrompt] = useState('');
  const [kind, setKind] = useState<PromptKind>('video');

  function submit() {
    onSubmit({ prompt: prompt.trim(), kind });
  }

  const chip = (value: PromptKind, label: string, Icon: typeof ImageIcon) => (
    <button
      type="button"
      onClick={() => setKind(value)}
      aria-pressed={kind === value}
      className={cn(
        'inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-sm transition',
        kind === value
          ? 'border-primary/50 bg-primary/10 text-primary-text'
          : 'text-muted-foreground hover:text-foreground border-border'
      )}
    >
      <Icon className="size-4" />
      {label}
    </button>
  );

  return (
    <form
      className={cn(
        'bg-card focus-within:border-primary/60 rounded-lg border p-3 text-left shadow-[0_24px_60px_-36px_rgb(0_0_0/0.6)] transition-colors',
        className
      )}
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            submit();
          }
        }}
        rows={2}
        maxLength={2000}
        placeholder={placeholder}
        className="placeholder:text-muted-foreground/70 w-full resize-none bg-transparent px-3 pt-2 text-base outline-none"
      />
      <div className="flex items-center gap-2 pt-1">
        {chip('video', videoLabel, Clapperboard)}
        {chip('image', imageLabel, ImageIcon)}
        <div className="flex-1" />
        <button
          type="submit"
          aria-label={submitLabel}
          className="eg-pill-primary size-9 p-0"
        >
          <ArrowUp className="size-5" />
        </button>
      </div>
    </form>
  );
}
