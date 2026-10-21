import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowRight,
  Download,
  Loader2,
  RotateCcw,
  Upload,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

import { useSession } from '@/core/auth/client';
import { useRouter } from '@/core/i18n/navigation';
import { PaymentType } from '@/core/payment/types';
import {
  DEFAULT_DUET_SCENE,
  DUET_SCENES,
  isDuetScene,
  type DuetScene,
} from '@/config/hotel-lobby-scenes';
import {
  DEFAULT_DUET_SIZE,
  DUET_SIZES,
  isDuetSize,
  type DuetSize,
} from '@/config/hotel-lobby-sizes';
import type { PricingProduct } from '@/config/pricing';
import { apiGet, apiPost } from '@/lib/api-client';
import { track } from '@/lib/track';
import { m } from '@/paraglide/messages.js';
import { getLocale } from '@/paraglide/runtime.js';
import { Pricing } from '@/blocks/pricing';
import { Dialog, DialogContent } from '@/components/ui/dialog';

const INSUFFICIENT_CREDITS = 'Insufficient credits';
const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
// Survives the sign-in / checkout round trip in this tab.
const DRAFT_KEY = 'hotel-lobby-draft';
const RESUME_KEY = 'hotel-lobby-resume';
// An accepted task, so a reload keeps polling instead of losing the video.
const TASK_KEY = 'hotel-lobby-task';

type DuetTask = {
  id: string;
  status: 'pending' | 'processing' | 'success' | 'failed';
  stage: 'scene' | 'motion' | null;
  sceneImageUrl: string | null;
  videoUrl: string | null;
  error: string | null;
};

type Draft = {
  photoA: string | null;
  photoB: string | null;
  scene: DuetScene;
  size: DuetSize;
  direction: string;
};

// Downscale to ≤1280px JPEG: small uploads, and small enough to keep in
// sessionStorage across sign-in. fal accepts data URIs directly.
async function toDataUrl(file: File, maxSide = 1280): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL('image/jpeg', 0.88);
}

function readStorage<T>(store: 'session' | 'local', key: string): T | null {
  try {
    const raw = (store === 'session' ? sessionStorage : localStorage).getItem(
      key
    );
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeStorage(store: 'session' | 'local', key: string, value: unknown) {
  try {
    const target = store === 'session' ? sessionStorage : localStorage;
    if (value === null) target.removeItem(key);
    else target.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function PhotoSlot({
  label,
  side,
  photo,
  disabled,
  onPick,
  onClear,
}: {
  label: string;
  side: string;
  photo: string | null;
  disabled: boolean;
  onPick: (file: File) => void;
  onClear: () => void;
}) {
  return (
    <div className="hl-slot" data-filled={photo ? true : undefined}>
      <label>
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="sr-only"
          disabled={disabled}
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (file) onPick(file);
          }}
        />
        {photo ? (
          <img src={photo} alt={label} />
        ) : (
          <span className="hl-slot-empty">
            <Upload size={22} strokeWidth={1.6} aria-hidden />
            {m['hotel.gen.upload']()}
          </span>
        )}
        <span className="hl-slot-label">
          <strong>{label}</strong>
          <small>{side}</small>
        </span>
      </label>
      {photo && !disabled && (
        <button
          type="button"
          className="hl-slot-clear"
          onClick={onClear}
          aria-label={m['hotel.gen.remove']()}
        >
          <X size={14} aria-hidden />
        </button>
      )}
    </div>
  );
}

export function HotelLobbyStudio({
  scene,
  onSceneChange,
}: {
  scene: DuetScene;
  onSceneChange: (scene: DuetScene) => void;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const user = session?.user;
  const [photoA, setPhotoA] = useState<string | null>(null);
  const [photoB, setPhotoB] = useState<string | null>(null);
  const [size, setSize] = useState<DuetSize>(DEFAULT_DUET_SIZE);
  const [direction, setDirection] = useState('');
  const [consent, setConsent] = useState(false);
  const [taskId, setTaskId] = useState<string>();
  const [checking, setChecking] = useState(false);
  const [paywall, setPaywall] = useState(false);
  const sceneNames: Record<DuetScene, string> = {
    'orange-studio': m['hotel.scenes.orange_studio'](),
    'hotel-lobby': m['hotel.scenes.hotel_lobby'](),
    'night-street': m['hotel.scenes.night_street'](),
    'neon-studio': m['hotel.scenes.neon_studio'](),
  };

  // Restore a draft saved before sign-in / checkout, and a running task.
  useEffect(() => {
    const draft = readStorage<Draft>('session', DRAFT_KEY);
    if (draft) {
      setPhotoA(draft.photoA);
      setPhotoB(draft.photoB);
      if (isDuetScene(draft.scene)) onSceneChange(draft.scene);
      if (isDuetSize(draft.size)) setSize(draft.size);
      setDirection(draft.direction || '');
      if (draft.photoA && draft.photoB) setConsent(true);
    }
    const saved = readStorage<string>('local', TASK_KEY);
    if (saved) setTaskId(saved);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function saveDraft() {
    return writeStorage('session', DRAFT_KEY, {
      photoA,
      photoB,
      scene,
      size,
      direction,
    } satisfies Draft);
  }

  async function pick(slot: 'a' | 'b', file: File) {
    if (file.size > MAX_PHOTO_BYTES) {
      toast.error(m['hotel.gen.too_large']());
      return;
    }
    try {
      const url = await toDataUrl(file);
      (slot === 'a' ? setPhotoA : setPhotoB)(url);
      track('lead_uploaded', { tool: 'hotel-lobby', slot });
    } catch {
      toast.error(m['hotel.gen.bad_photo']());
    }
  }

  const priceQuery = useQuery({
    queryKey: ['hotel-lobby-price'],
    queryFn: () => apiGet<{ credits: number }>('/api/hotel-lobby/price'),
    staleTime: 10 * 60_000,
  });
  const creditsQuery = useQuery({
    queryKey: ['credits'],
    queryFn: () =>
      apiGet<{ balance: number; hasPaidOrder: boolean }>('/api/credits'),
    enabled: Boolean(user),
  });
  const price = priceQuery.data?.credits;

  const generate = useMutation({
    mutationFn: () =>
      apiPost<DuetTask>('/api/hotel-lobby/generate', {
        photoA,
        photoB,
        scene,
        size,
        direction: direction.trim() || undefined,
        locale: getLocale(),
      }),
    onSuccess: (task) => {
      track('generate_submitted', { tool: 'hotel-lobby', scene, size });
      setTaskId(task.id);
      writeStorage('local', TASK_KEY, task.id);
      writeStorage('session', DRAFT_KEY, null);
      queryClient.invalidateQueries({ queryKey: ['credits'] });
    },
    onError: (e: Error) => {
      // Server is the source of truth: out of credits → show the plans.
      if (e.message === INSUFFICIENT_CREDITS) {
        track('paywall_shown', { tool: 'hotel-lobby', reason: 'server' });
        saveDraft();
        setPaywall(true);
        return;
      }
      track('generate_error', {
        tool: 'hotel-lobby',
        stage: 'submit',
        error: e.message.slice(0, 200),
      });
      toast.error(`${m['hotel.gen.failed']()}: ${e.message}`);
    },
  });

  const taskQuery = useQuery({
    queryKey: ['hotel-lobby-task', taskId],
    queryFn: () => apiGet<DuetTask>(`/api/hotel-lobby/task?id=${taskId}`),
    enabled: Boolean(taskId && user),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === 'success' || status === 'failed' ? false : 5000;
    },
    retry: false,
  });
  const task = taskQuery.data;
  const finished = task?.status === 'success' || task?.status === 'failed';

  useEffect(() => {
    if (!task || !finished) return;
    writeStorage('local', TASK_KEY, null);
    if (task.status === 'failed') {
      track('generate_failed', { tool: 'hotel-lobby' });
      toast.error(
        `${m['hotel.gen.failed']()}: ${task.error ?? ''} ${m['hotel.gen.refunded']()}`
      );
      queryClient.invalidateQueries({ queryKey: ['credits'] });
    }
  }, [task, finished, queryClient]);

  // A stale/foreign saved task id: forget it.
  useEffect(() => {
    if (taskQuery.isError) {
      writeStorage('local', TASK_KEY, null);
      setTaskId(undefined);
    }
  }, [taskQuery.isError]);

  const running =
    checking || generate.isPending || (Boolean(taskId) && !finished);
  const ready = Boolean(photoA && photoB);
  const canGenerate = ready && consent && !running;

  async function start() {
    track('generate_click', {
      tool: 'hotel-lobby',
      signedIn: Boolean(user),
      ready,
    });
    if (!ready) {
      toast.error(m['hotel.gen.hint']());
      return;
    }
    if (!user) {
      const saved = saveDraft();
      if (saved) writeStorage('session', RESUME_KEY, true);
      else toast.warning(m['hotel.gen.draft_not_saved']());
      track('signin_redirect', { tool: 'hotel-lobby' });
      router.push(`/sign-in?callbackUrl=${encodeURIComponent('/hotel-lobby')}`);
      return;
    }
    setChecking(true);
    try {
      const [credits, quote] = await Promise.all([
        creditsQuery.refetch(),
        priceQuery.refetch(),
      ]);
      if (credits.data && quote.data) {
        const { balance, hasPaidOrder } = credits.data;
        if (!hasPaidOrder || balance < quote.data.credits) {
          track('paywall_shown', {
            tool: 'hotel-lobby',
            reason: hasPaidOrder ? 'low_balance' : 'no_paid_order',
            balance,
            cost: quote.data.credits,
          });
          saveDraft();
          setPaywall(true);
          return;
        }
      }
      generate.mutate();
    } finally {
      setChecking(false);
    }
  }

  // Back from sign-in with the draft restored: continue to the balance
  // check (paywall or generation) without a second click.
  const resumed = useRef(false);
  useEffect(() => {
    if (resumed.current || !user || !ready || !consent) return;
    if (!readStorage<boolean>('session', RESUME_KEY)) return;
    resumed.current = true;
    writeStorage('session', RESUME_KEY, null);
    track('signin_resume', { tool: 'hotel-lobby' });
    void start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, ready, consent]);

  function reset() {
    generate.reset();
    setTaskId(undefined);
    writeStorage('local', TASK_KEY, null);
  }

  const status =
    task?.status === 'success'
      ? m['hotel.gen.done']()
      : generate.isPending
        ? m['hotel.gen.submitting']()
        : task?.stage === 'motion'
          ? `${m['hotel.gen.stage_motion']()} ${m['hotel.gen.keep_open']()}`
          : taskId && !finished
            ? `${m['hotel.gen.stage_scene']()} ${m['hotel.gen.keep_open']()}`
            : ready
              ? m['hotel.gen.ready']()
              : m['hotel.gen.hint']();

  const quote: PricingProduct | undefined = price
    ? {
        productId: 'hotel_lobby_duet',
        productName: m['hotel.gen.product'](),
        planName: 'Single Video',
        description: 'One Hotel Lobby duet video',
        type: PaymentType.ONE_TIME,
        priceInCents: price,
        currency: 'usd',
        credits: price,
      }
    : undefined;

  const ratio = `${DUET_SIZES[size].width} / ${DUET_SIZES[size].height}`;

  return (
    <div className="hl-studio-panel">
      <div className="hl-form">
        <div className="hl-slots">
          <PhotoSlot
            label={m['hotel.gen.person_a']()}
            side={m['hotel.gen.left']()}
            photo={photoA}
            disabled={running}
            onPick={(file) => pick('a', file)}
            onClear={() => setPhotoA(null)}
          />
          <span className="hl-slots-mic" aria-hidden />
          <PhotoSlot
            label={m['hotel.gen.person_b']()}
            side={m['hotel.gen.right']()}
            photo={photoB}
            disabled={running}
            onPick={(file) => pick('b', file)}
            onClear={() => setPhotoB(null)}
          />
        </div>
        <p className="hl-field-hint">{m['hotel.gen.photo_hint']()}</p>

        <p className="hl-field-label" id="hl-scene-label">
          {m['hotel.gen.scene']()}
        </p>
        <div
          className="hl-scenes"
          role="radiogroup"
          aria-labelledby="hl-scene-label"
        >
          {(Object.keys(DUET_SCENES) as DuetScene[]).map((key) => (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={scene === key}
              disabled={running}
              onClick={() => onSceneChange(key)}
            >
              <img
                src={`/videos/hotel-lobby/${key}.jpg`}
                alt=""
                width={540}
                height={960}
                loading="lazy"
              />
              <span>{sceneNames[key]}</span>
            </button>
          ))}
        </div>

        <p className="hl-field-label" id="hl-size-label">
          {m['hotel.gen.size']()}
        </p>
        <div
          className="hl-sizes"
          role="radiogroup"
          aria-labelledby="hl-size-label"
        >
          {(Object.keys(DUET_SIZES) as DuetSize[]).map((key) => (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={size === key}
              disabled={running}
              onClick={() => setSize(key)}
            >
              <span
                className="hl-size-shape"
                style={{
                  aspectRatio: `${DUET_SIZES[key].width} / ${DUET_SIZES[key].height}`,
                }}
                aria-hidden
              />
              {key}
            </button>
          ))}
        </div>

        <label className="hl-field-label" htmlFor="hl-direction">
          {m['hotel.gen.direction']()}
        </label>
        <textarea
          id="hl-direction"
          className="hl-textarea"
          value={direction}
          onChange={(e) => setDirection(e.target.value)}
          maxLength={300}
          rows={2}
          disabled={running}
          placeholder={m['hotel.gen.placeholder']()}
        />

        <label className="hl-consent">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
          />
          <span>{m['hotel.gen.consent']()}</span>
        </label>

        <div className="hl-form-actions">
          {finished ? (
            <button type="button" className="hl-button" onClick={reset}>
              <RotateCcw size={17} aria-hidden />
              {m['hotel.gen.again']()}
            </button>
          ) : (
            <button
              type="button"
              className="hl-button"
              disabled={!canGenerate}
              onClick={start}
            >
              {running && (
                <Loader2 size={17} className="animate-spin" aria-hidden />
              )}
              {user ? m['hotel.gen.generate']() : m['hotel.gen.sign_in']()}
              {!running && <ArrowRight size={17} aria-hidden />}
            </button>
          )}
          {task?.videoUrl && (
            <a
              className="hl-button hl-button-ghost"
              href={task.videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              download
            >
              <Download size={17} aria-hidden />
              {m['hotel.gen.download']()}
            </a>
          )}
        </div>
        {price !== undefined && (
          <p className="hl-field-hint">
            {m['hotel.gen.cost']({ credits: price.toLocaleString('en-US') })}
            {user && creditsQuery.data && (
              <>
                {' · '}
                {m['hotel.gen.balance']({
                  credits: creditsQuery.data.balance.toLocaleString('en-US'),
                })}
              </>
            )}
          </p>
        )}
        <p className="hl-status" role="status" aria-live="polite">
          {status}
        </p>
      </div>

      <aside className="hl-preview" aria-label={m['hotel.gen.preview']()}>
        <div className="hl-preview-media" style={{ aspectRatio: ratio }}>
          {task?.videoUrl ? (
            <video
              src={task.videoUrl}
              poster={task.sceneImageUrl ?? undefined}
              controls
              autoPlay
              playsInline
            />
          ) : task?.sceneImageUrl ? (
            <img src={task.sceneImageUrl} alt={m['hotel.gen.preview']()} />
          ) : (
            <video
              key={scene}
              src={`/videos/hotel-lobby/${scene}.mp4`}
              poster={`/videos/hotel-lobby/${scene}.jpg`}
              muted
              loop
              autoPlay
              playsInline
              preload="none"
            />
          )}
          {running && (
            <span className="hl-preview-badge">
              <Loader2 size={14} className="animate-spin" aria-hidden />
              {task?.stage === 'motion'
                ? m['hotel.gen.badge_motion']()
                : m['hotel.gen.badge_scene']()}
            </span>
          )}
        </div>
        <p className="hl-preview-note">
          {task?.videoUrl
            ? m['hotel.gen.preview_done']()
            : m['hotel.gen.preview_note']({ scene: sceneNames[scene] })}
        </p>
      </aside>

      <Dialog
        open={paywall}
        onOpenChange={(open) => {
          if (!open) track('paywall_closed', { tool: 'hotel-lobby' });
          setPaywall(open);
        }}
      >
        <DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] overflow-y-auto p-5 sm:max-w-6xl">
          <Pricing
            variant="dialog"
            singleVideo={quote}
            balanceCredits={creditsQuery.data?.balance || 0}
            title={m['hotel.gen.paywall_title']()}
            description={
              creditsQuery.data?.hasPaidOrder
                ? m['hotel.gen.paywall_topup']()
                : m['hotel.gen.paywall_first']()
            }
            beforeCheckout={async () => {
              if (!saveDraft()) toast.warning(m['hotel.gen.draft_not_saved']());
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
