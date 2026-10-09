import { useRef, useState, type Ref } from 'react';
import { ArrowUp, Clapperboard, ImageIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

export type PromptKind = 'video' | 'image';
export type PromptBoxValue = { prompt: string; kind: PromptKind };

/** The hero prompt composer: free text + video/image switch + send. */
export function PromptBox({
  placeholder,
  videoLabel,
  imageLabel,
  submitLabel,
  onSubmit,
  onChange,
  inputRef,
  className,
}: {
  placeholder: string;
  videoLabel: string;
  imageLabel: string;
  submitLabel: string;
  onSubmit: (value: PromptBoxValue) => void;
  onChange?: (value: PromptBoxValue) => void;
  inputRef?: Ref<HTMLTextAreaElement>;
  className?: string;
}) {
  const [prompt, setPrompt] = useState('');
  const [kind, setKind] = useState<PromptKind>('video');
  const promptRef = useRef('');
  const kindRef = useRef<PromptKind>('video');

  function updatePrompt(value: string) {
    promptRef.current = value;
    setPrompt(value);
    onChange?.({ prompt: value, kind: kindRef.current });
  }

  function updateKind(value: PromptKind) {
    kindRef.current = value;
    setKind(value);
    onChange?.({ prompt: promptRef.current, kind: value });
  }

  function submit(form?: HTMLFormElement | null) {
    // Read the live form value at submit time as well as React state. This
    // avoids dropping the last keystroke when a user clicks immediately after
    // typing and the state update has not committed yet.
    const field = form?.elements.namedItem('prompt');
    const value = field instanceof HTMLTextAreaElement ? field.value : prompt;
    onSubmit({ prompt: value.trim(), kind: kindRef.current });
  }

  const chip = (value: PromptKind, label: string, Icon: typeof ImageIcon) => (
    <button
      type="button"
      onClick={() => updateKind(value)}
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
        submit(e.currentTarget);
      }}
    >
      <textarea
        name="prompt"
        ref={inputRef}
        value={prompt}
        onChange={(e) => updatePrompt(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            submit(e.currentTarget.form);
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
