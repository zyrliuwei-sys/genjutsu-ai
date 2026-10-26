import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowRight,
  Check,
  ChevronDown,
  Download,
  ImageIcon,
  Loader2,
  Play,
  Plus,
  Sparkles,
  Upload,
  Video,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';

import { useSession } from '@/core/auth/client';
import { useRouter } from '@/core/i18n/navigation';
import {
  GENJUTSU_ASPECTS,
  GENJUTSU_DIRECTIONS,
  GENJUTSU_MAX_SECONDS,
  GENJUTSU_SECONDS,
  genjutsuCredits,
  genjutsuGenerations,
  type GenjutsuAspect,
  type GenjutsuReadiness,
} from '@/config/genjutsu';
import {
  apiDownload,
  apiGet,
  apiGetMedia,
  apiPost,
  apiUpload,
} from '@/lib/api-client';
import { warmVideoTools } from '@/lib/browser-video-engine';
import { trimMiddleVideo } from '@/lib/browser-video-trim';
import {
  loadGenjutsuDraft,
  saveGenjutsuDraft,
  type DraftAsset,
} from '@/lib/genjutsu-draft';
import { readMediaMetadata } from '@/lib/media-metadata';
import { parallelMediaUpload } from '@/lib/parallel-media-upload';
import { referenceVideoPlan } from '@/lib/reference-video-plan';
import { track } from '@/lib/track';
import { cn } from '@/lib/utils';
import { matchesVideoAspect } from '@/lib/video-dimensions';
import { MAX_REFERENCE_VIDEO_MB } from '@/lib/video-trim-plan';
import { Pricing } from '@/blocks/pricing';
import { BeforeAfterVideo } from '@/components/before-after-video';
import { Dialog, DialogContent } from '@/components/ui/dialog';

export type GeneratorTemplate = {
  id: string;
  name: string;
  image: string;
  thumb: string;
  clip?: string;
  /** Reference clip id under /videos/effect-clips. */
  asset: string;
  duration: number;
  ratios: string;
  tag?: 'Trending' | 'New';
  prompt: string;
};

type Asset = {
  kind: 'image' | 'video';
  file?: File;
  sourceFile?: File;
  sourceDuration?: number;
  trimStart?: number;
  preview: string;
  url?: string;
  uploading: boolean;
  width?: number;
  height?: number;
  duration?: number;
  videoReceipt?: { payload: string; signature: string };
};

type GenjutsuTask = {
  id: string;
  status: 'pending' | 'processing' | 'success' | 'failed' | 'canceled';
  url: string | null;
  error: string | null;
  archivePending?: boolean;
  aspect?: string;
  referenceName?: string;
  createdAt?: string;
};

// Each effect plays /videos/effect-clips/<asset>-10s.mp4 and sends it as the
// motion reference; `asset` also keys GENJUTSU_DIRECTIONS.
const effect = (
  id: string,
  name: string,
  asset: string,
  duration: number,
  ratios: string,
  tag?: GeneratorTemplate['tag']
): GeneratorTemplate => ({
  id,
  name,
  image: `/videos/effects/${asset}.webp`,
  thumb: `/videos/effects/${asset}-thumb.webp`,
  asset,
  duration,
  ratios,
  tag,
  prompt: GENJUTSU_DIRECTIONS[asset] ?? '',
});

const TEMPLATES: GeneratorTemplate[] = [
  effect('street-runway', 'Street Runway', 'runway', 10, '16:9', 'New'),
  effect('moonlit-walk', 'Moonlit Walk', 'moonwalk', 5, '16:9', 'New'),
  effect('colonial-stroll', 'Colonial Stroll', 'colonial', 10, '16:9', 'New'),
  effect(
    'holiday-homecoming',
    'Holiday Homecoming',
    'homecoming',
    10,
    '16:9',
    'New'
  ),
  effect(
    'shoreline-memory',
    'Shoreline Memory',
    'shoreline',
    10,
    '16:9',
    'New'
  ),
  effect('cosmic-dive', 'Cosmic Dive', 'cosmic', 10, '16:9', 'New'),
  effect('chess-float', 'Chess Float', 'chess', 3, '16:9', 'New'),
  effect('mural-style-shift', 'Mural Style Shift', 'mural', 4, '16:9', 'New'),
  effect(
    'salt-flat-astronaut',
    'Salt Flat Astronaut',
    'saltflat',
    5,
    '9:16',
    'New'
  ),
  effect('origami-lookbook', 'Origami Lookbook', 'origami', 6, '9:16', 'New'),
  effect(
    'tennis-ball-picnic',
    'Tennis Ball Picnic',
    'tennis',
    6,
    '9:16',
    'New'
  ),
  effect('desert-boardroom', 'Desert Boardroom', 'desert', 6, '9:16', 'New'),
  effect(
    'pinstripe-portrait',
    'Pinstripe Portrait',
    'pinstripe',
    4,
    '9:16',
    'New'
  ),
  effect('corduroy-lounge', 'Corduroy Lounge', 'corduroy', 6, '9:16', 'New'),
  effect('color-block-duo', 'Color Block Duo', 'colorblock', 6, '9:16', 'New'),
  effect('pastel-picnic', 'Pastel Picnic', 'pastel', 6, '9:16', 'New'),
  effect('cloud-lounge', 'Cloud Lounge', 'clouds', 6, '9:16', 'New'),
  effect('sketch-glow-up', 'Sketch Glow-Up', 'glowup', 9, '9:16', 'Trending'),
  effect('fire-skirt-spin', 'Fire Skirt Spin', 'fire-skirt', 9, '9:16', 'New'),
  effect('red-suit-groove', 'Red Suit Groove', 'groove', 10, '9:16', 'New'),
  effect('rail-ollie', 'Rail Ollie', 'skate', 10, '9:16', 'New'),
];

// Preselected effect; the list order is display order only.
const DEFAULT_TEMPLATE =
  TEMPLATES.find((template) => template.id === 'street-runway') ?? TEMPLATES[0];

// Effects with a finished sample (16:9, `.mp4` + `.jpg` poster): the Reference
// Example tab shows it as a drag-to-compare slider over the effect clip.
const EFFECT_RESULTS: Partial<Record<string, string>> = {
  runway: '/videos/swap/runway-after-10s',
};

const isDone = (task?: GenjutsuTask) =>
  task?.status === 'success' ||
  task?.status === 'failed' ||
  task?.status === 'canceled';

const RESUME_KEY = 'genjutsu-resume-after-signin';

// Draft saves go to IndexedDB, which fails in private mode or on full storage;
// keep the browser's reason so the funnel shows why.
function trackDraftError(stage: string, error: unknown) {
  track('generate_error', {
    stage,
    error: (error instanceof Error
      ? `${error.name}: ${error.message}`
      : String(error)
    ).slice(0, 200),
  });
}

function assetIsReady(asset?: Asset) {
  return Boolean(asset?.url || asset?.file) && !asset?.uploading;
}

function PreviewAsset({
  asset,
  className,
}: {
  asset?: Asset;
  className?: string;
}) {
  if (!asset) return null;
  if (asset.kind === 'video') {
    return (
      <video
        src={asset.preview}
        muted
        loop
        autoPlay
        playsInline
        className={cn('size-full object-cover', className)}
      />
    );
  }
  return (
    <img
      src={asset.preview}
      alt=""
      className={cn('size-full object-cover', className)}
    />
  );
}

// Status card shown over the preview while media is prepared or rendered.
// `percent` undefined = indeterminate.
function ProgressPanel({
  icon,
  title,
  hint,
  percent,
  onMedia = false,
}: {
  icon: React.ReactNode;
  title: string;
  hint?: string;
  percent?: number;
  onMedia?: boolean;
}) {
  return (
    <div
      className={cn(
        'relative flex w-full max-w-sm flex-col items-center gap-2 px-6 text-center sm:gap-3',
        onMedia ? 'text-white' : 'text-foreground'
      )}
    >
      <span className="bg-primary/15 text-primary-text ring-primary/40 flex size-10 items-center justify-center rounded-full ring-1 sm:size-12">
        {icon}
      </span>
      <p className="text-sm font-semibold sm:text-base">{title}</p>
      {hint && (
        <p
          className={cn(
            'text-xs sm:text-sm',
            onMedia ? 'text-white/70' : 'text-muted-foreground'
          )}
        >
          {hint}
        </p>
      )}
      <div
        className={cn(
          'h-1.5 w-full overflow-hidden rounded-full sm:h-2',
          onMedia ? 'bg-white/20' : 'bg-foreground/10'
        )}
      >
        {percent === undefined ? (
          <div className="bg-primary h-full w-1/3 animate-pulse rounded-full" />
        ) : (
          <div
            className="bg-primary h-full rounded-full transition-[width] duration-700 ease-out"
            style={{ width: `${Math.max(2, Math.min(100, percent))}%` }}
          />
        )}
      </div>
      {percent !== undefined && (
        <p className="text-xs tabular-nums opacity-70">
          {Math.round(percent)}%
        </p>
      )}
    </div>
  );
}

function UploadSlot({
  label,
  hint,
  accept,
  asset,
  kind,
  disabled,
  onFile,
  onRemove,
  removeLabel,
  uploadLabel,
  testId,
  frameClassName,
  rootClassName,
}: {
  label: string;
  hint: string;
  accept: string;
  asset?: Asset;
  kind: 'image' | 'video';
  disabled: boolean;
  onFile: (file: File | undefined) => void;
  onRemove: () => void;
  removeLabel: string;
  uploadLabel: string;
  testId: string;
  frameClassName?: string;
  rootClassName?: string;
}) {
  const inputId = useId();
  return (
    <div className={cn('flex min-w-0 flex-col gap-2', rootClassName)}>
      <div className="flex flex-col">
        <label htmlFor={inputId} className="truncate text-sm font-medium">
          {label}
        </label>
        <span className="text-muted-foreground truncate text-xs">{hint}</span>
      </div>
      <div
        className={cn(
          'eg-generator-upload group hover:border-primary/70 border-border bg-muted relative aspect-[3/4] overflow-hidden rounded-xl border border-dashed transition-colors',
          disabled && 'opacity-70',
          frameClassName
        )}
      >
        <input
          id={inputId}
          aria-label={uploadLabel}
          disabled={disabled}
          data-testid={testId}
          data-filled={assetIsReady(asset)}
          type="file"
          accept={accept}
          className="absolute inset-0 z-20 size-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
          onChange={(event) => {
            onFile(event.target.files?.[0]);
            event.currentTarget.value = '';
          }}
        />
        {asset ? (
          <>
            <PreviewAsset
              asset={asset}
              className="pointer-events-none absolute inset-0"
            />
            <button
              type="button"
              data-testid="remove-lead-photo"
              aria-label={removeLabel}
              title={removeLabel}
              disabled={disabled}
              onClick={onRemove}
              className="hover:bg-destructive focus-visible:ring-primary absolute top-2 right-2 z-30 flex size-7 items-center justify-center rounded-full bg-black/80 text-white transition-colors focus-visible:ring-2 disabled:opacity-50"
            >
              <X className="size-3.5" aria-hidden="true" />
            </button>
          </>
        ) : null}
        <div
          className={cn(
            'pointer-events-none absolute inset-0 flex size-full flex-col items-center justify-center gap-3 p-3 text-center',
            asset &&
              'bg-black/20 opacity-0 transition-opacity hover:opacity-100'
          )}
        >
          {!asset && (
            <>
              <span className="bg-primary/15 text-primary-text ring-primary/40 relative flex size-11 items-center justify-center rounded-full ring-1 transition-transform duration-300 group-hover:scale-110">
                {kind === 'video' ? (
                  <Upload className="size-5" />
                ) : (
                  <ImageIcon className="size-5" />
                )}
              </span>
              <span className="relative text-sm font-medium">
                {uploadLabel}
              </span>
              <span className="text-muted-foreground relative text-[11px]">
                {kind === 'video' ? 'MP4, MOV · 30MB' : 'JPG, PNG, WEBP · 10MB'}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export type GeneratorUiCopy = {
  aiEffects: string;
  effect: string;
  selectEffect: string;
  yourPhoto: string;
  photoHint: string;
  uploadPhoto: string;
  generateNow: string;
  videoSize: string;
  referenceExample: string;
  myWork: string;
  download: string;
  loadVideoFailed: string;
  restoreFailed: string;
  onlyImages: string;
  onlyVideos: string;
  imageTooSmall: string;
  needAssets: string;
  waitReference: string;
  unsupportedSize: string;
  unsupportedRatio: string;
  verifyBalanceFailed: string;
  saveMediaSignIn: string;
  saveMediaCheckout: string;
  generationCanceled: string;
  noGeneratedVideo: string;
  closeVideo: string;
  dismiss: string;
};

export function GenjutsuGenerator({
  copy,
  referenceOnly = false,
  returnPath = '/create',
  theme,
}: {
  referenceOnly?: boolean;
  returnPath?: string;
  theme?: {
    templates: GeneratorTemplate[];
    /** Direction key for a visitor's own upload on this themed page. */
    uploadTemplateId: string;
    /** Desktop: pick takes inside the side panel instead of a strip under the preview. */
    pickerInPanel?: boolean;
    /** Finished results shown after the templates; a tap plays one in the preview. */
    samples?: { id: string; name: string; clip: string; poster: string }[];
    sampleLabel?: string;
    title: string;
    choose: string;
    photo: string;
    photoHint: string;
    generate: string;
    loading: string;
    retry: string;
  };
  copy: {
    moreSettings: string;
    generatingTitle: string;
    generatingPreparing: string;
    generatingEta: (minutes: string) => string;
    videoReading: string;
    videoPreparing: string;
    uploadPhotoCta: string;
    remainingGenerations: (count: number) => string;
    generationRules: string;
    contentPolicy: string;
    generationBusy: string;
    generationFailed: string;
    /** Shown under Generate until the first purchase, so the price is no surprise. */
    firstPrice: string;
    failedTitle: string;
    paywallTitle: string;
    paywallFirst: string;
    paywallTopUp: string;
    yourVideo: string;
    summaryMotion: string;
    summaryPhoto: string;
    retry: string;
    referenceDisclaimer: string;
    removeReference: string;
    removePhoto: string;
    referenceEmpty: string;
    uploadReference: string;
    customReference: string;
    referenceRequirements: string;
    invalidVideoDuration: string;
    videoDurationRange: (seconds: string) => string;
    trimming: (percent: number) => string;
    trimFailed: string;
    trimmedReference: (start: string, end: string, total: string) => string;
    chargeDetails: (credits: number, price: string) => string;
    serviceUnavailable: string;
    archivePending: string;
    generatedVideo: string;
    priorRatioMismatch: (
      width: number,
      height: number,
      aspect: string
    ) => string;
    ratioPadding: string;
    compare: { before: string; after: string; slider: string };
    ui: GeneratorUiCopy;
  };
}) {
  const templates = theme?.templates ?? TEMPLATES;
  const panelPicker = Boolean(theme?.pickerInPanel);
  const defaultTemplate = theme?.templates[0] ?? DEFAULT_TEMPLATE;
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: session, isPending: sessionPending } = useSession();
  const user = session?.user;
  const [selectedId, setSelectedId] = useState(defaultTemplate.id);
  const [exampleId, setExampleId] = useState(defaultTemplate.id);
  const [sampleId, setSampleId] = useState<string>();
  const [validatingMedia, setValidatingMedia] = useState(false);
  // Photos validate separately so they stay selectable while a video trims.
  const [validatingPhoto, setValidatingPhoto] = useState(false);
  const [trimProgress, setTrimProgress] = useState<number>();
  const clipController = useRef<AbortController | undefined>(undefined);
  useEffect(() => () => clipController.current?.abort(), []);
  const [aspect, setAspect] = useState<GenjutsuAspect>('16:9');
  // Every video is a single clip of up to 10s; there is no length choice.
  const durationTier = GENJUTSU_SECONDS;
  const [lead, setLead] = useState<Asset>();
  const [referenceVideo, setReferenceVideo] = useState<Asset>();
  // The visitor's last uploaded video, kept as a card in the effects strip.
  const [ownVideo, setOwnVideo] = useState<Asset>();
  const [referenceClosed, setReferenceClosed] = useState(false);
  const [referenceSource, setReferenceSource] = useState<'effect' | 'upload'>(
    referenceOnly ? 'upload' : 'effect'
  );
  const referenceInputId = useId();
  const [taskId, setTaskId] = useState<string>();
  const [previewMode, setPreviewMode] = useState<'example' | 'work'>('example');
  const [muted, setMuted] = useState(true);
  const [paywall, setPaywall] = useState(false);
  // Last generation failure, kept on the preview until dismissed or retried
  // (a toast alone vanished before customers read why or that they were refunded).
  const [failure, setFailure] = useState<{
    message: string;
    retryable: boolean;
  }>();
  const showFailure = (error?: string | null) => {
    setFailure({
      message: failureMessage(error),
      retryable: error !== 'Content policy violation',
    });
    revealResult();
  };
  // Phones only: additional video settings sit behind a toggle.
  const [moreOpen, setMoreOpen] = useState(false);
  // Blob URL of a reference video being read/trimmed (drives the overlay).
  const [videoJob, setVideoJob] = useState<string>();
  // Between the Generate click and the task existing (checks, uploads).
  const [submitting, setSubmitting] = useState(false);
  const [startedAt, setStartedAt] = useState<number>();
  const [now, setNow] = useState(() => Date.now());
  // The preview box takes the media's aspect ratio, so clips get no bars
  // (desktop caps the height at 560px and narrows the box for tall media).
  const [mediaRatio, setMediaRatio] = useState(16 / 9);
  const fitMedia = (width: number, height: number) => {
    if (width && height) setMediaRatio(width / height);
  };
  const generatorRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLElement>(null);
  const effectsRef = useRef<HTMLDivElement>(null);
  const effectsPointerDown = useRef(false);
  const effectsReturnPending = useRef(false);
  const effectsLastScroll = useRef(0);
  const effectsReturnTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined
  );
  const returnToSelectedEffect = () => {
    clearTimeout(effectsReturnTimer.current);
    if (!effectsReturnPending.current || effectsPointerDown.current) return;
    const remaining = 150 - (performance.now() - effectsLastScroll.current);
    if (remaining > 0) {
      effectsReturnTimer.current = setTimeout(
        returnToSelectedEffect,
        remaining
      );
      return;
    }
    effectsReturnPending.current = false;
    const strip = effectsRef.current;
    const card = strip?.querySelector<HTMLElement>(
      '[aria-pressed="true"], [data-selected="true"]'
    );
    if (!strip || !card) return;
    // Land the selected card just right of the pinned upload card.
    const upload = strip.querySelector<HTMLElement>(
      '[data-testid="template-own-video"]'
    );
    const pinned =
      upload && upload.offsetWidth > 0 && upload !== card
        ? upload.getBoundingClientRect().right -
          strip.getBoundingClientRect().left +
          12
        : 4;
    strip.scrollTo({
      left:
        strip.scrollLeft +
        card.getBoundingClientRect().left -
        strip.getBoundingClientRect().left -
        pinned,
      behavior: 'instant',
    });
  };
  useEffect(() => {
    const releasePointer = () => {
      effectsPointerDown.current = false;
      returnToSelectedEffect();
    };
    window.addEventListener('pointerup', releasePointer);
    window.addEventListener('pointercancel', releasePointer);
    return () => {
      window.removeEventListener('pointerup', releasePointer);
      window.removeEventListener('pointercancel', releasePointer);
      clearTimeout(effectsReturnTimer.current);
    };
  }, []);
  const [generatorVisible, setGeneratorVisible] = useState(false);
  const createRef = useRef<HTMLElement>(null);
  const [createVisible, setCreateVisible] = useState(false);
  useEffect(() => track('create_view'), []);
  useEffect(() => {
    const node = generatorRef.current;
    if (!node || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(([entry]) =>
      setGeneratorVisible(entry.isIntersecting)
    );
    observer.observe(node);
    // Once the upload/generate controls are on screen the sticky CTA would
    // only duplicate them.
    const create = createRef.current;
    const createObserver = create
      ? new IntersectionObserver(([entry]) =>
          setCreateVisible(entry.isIntersecting)
        )
      : undefined;
    if (create) createObserver!.observe(create);
    return () => {
      observer.disconnect();
      createObserver?.disconnect();
    };
  }, []);
  // On phones the result area is above the controls — bring it into view
  // once something starts rendering there.
  const revealResult = () => {
    if (window.matchMedia('(max-width: 1023px)').matches)
      previewRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
  };
  const [draftReady, setDraftReady] = useState(false);
  const linkedEffectPending = useRef(true);
  const [draftOwner, setDraftOwner] = useState<string>();
  const [savingDraft, setSavingDraft] = useState(false);
  const [checkingGeneration, setCheckingGeneration] = useState(false);
  const submissionStorageKey = `genjutsu-submission:${user?.id}`;
  const recoveryQuery = useQuery({
    queryKey: ['genjutsu-recover', user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const saved = sessionStorage.getItem(submissionStorageKey);
      if (!saved) return null;
      const { requestId } = JSON.parse(saved);
      return (
        await apiGet<{ task: GenjutsuTask | null }>(
          `/api/genjutsu/generate?requestId=${encodeURIComponent(requestId)}`
        )
      ).task;
    },
  });
  useEffect(() => {
    if (recoveryQuery.data) {
      setTaskId(recoveryQuery.data.id);
      setPreviewMode('work');
    }
  }, [recoveryQuery.data]);
  useEffect(() => {
    if (sessionPending) return;
    let active = true;
    setDraftReady(false);
    loadGenjutsuDraft(user?.id)
      .then((draft) => {
        if (!active) return;
        const restore = (asset?: DraftAsset): Asset | undefined => {
          if (!asset || (!asset.file && !asset.url)) return;
          // Drop drafted clips longer than the current length limit.
          if (
            asset.kind === 'video' &&
            Number(asset.duration) > GENJUTSU_MAX_SECONDS
          )
            return;
          return {
            ...asset,
            uploading: false,
            preview: asset.file ? URL.createObjectURL(asset.file) : asset.url!,
          };
        };
        setLead(restore(draft?.lead));
        setReferenceVideo(restore(draft?.referenceVideo));
        setOwnVideo(
          restore(
            draft?.ownVideo ??
              (draft?.referenceSource === 'upload'
                ? draft.referenceVideo
                : undefined)
          )
        );
        setReferenceClosed(draft?.referenceClosed === true);
        setReferenceSource(
          referenceOnly || draft?.referenceSource === 'upload'
            ? 'upload'
            : 'effect'
        );
        if (draft && templates.some((t) => t.id === draft.selectedId)) {
          setSelectedId(draft.selectedId);
          setExampleId(draft.selectedId);
        }
        if (draft && GENJUTSU_ASPECTS.includes(draft.aspect as GenjutsuAspect))
          setAspect(draft.aspect as GenjutsuAspect);
        // A showcase card links to /create?effect=<asset>: open that effect
        // once, the way clicking its card in the strip would.
        const linked = linkedEffectPending.current
          ? templates.find(
              (t) =>
                t.asset ===
                new URLSearchParams(window.location.search).get('effect')
            )
          : undefined;
        if (theme) {
          // Keep a drafted own video (e.g. resuming after sign-in); otherwise
          // open on a theme scene.
          if (draft?.referenceSource !== 'upload' || !draft.referenceVideo) {
            setReferenceSource('effect');
            setReferenceClosed(false);
            setReferenceVideo(undefined);
          }
          const saved = templates.find((t) => t.id === draft?.selectedId);
          setSelectedId(saved?.id ?? defaultTemplate.id);
          setExampleId(saved?.id ?? defaultTemplate.id);
        }
        if (referenceOnly) {
          setReferenceSource('upload');
          setReferenceClosed(false);
          if (draft?.referenceSource !== 'upload') setReferenceVideo(undefined);
        }
        linkedEffectPending.current = false;
        if (linked && !referenceOnly) {
          setReferenceSource('effect');
          setReferenceClosed(false);
          setReferenceVideo(undefined);
          setSelectedId(linked.id);
          setExampleId(linked.id);
          setPreviewMode('example');
        }
      })
      .catch(() => {
        if (active) {
          setLead(undefined);
          setReferenceVideo(undefined);
          toast.error(copy.ui.restoreFailed);
        }
      })
      .finally(() => {
        if (active) {
          setDraftOwner(user?.id || 'anonymous');
          setDraftReady(true);
        }
      });
    return () => {
      active = false;
    };
  }, [
    sessionPending,
    user?.id,
    referenceOnly,
    templates,
    defaultTemplate,
    Boolean(theme),
  ]);

  function persistDraft() {
    if (!draftReady || draftOwner !== (user?.id || 'anonymous'))
      return Promise.reject(new Error('Wait for media recovery to finish'));
    const store = (asset?: Asset): DraftAsset | undefined =>
      asset && {
        kind: asset.kind,
        // The original picker File (sourceFile) is never read after trimming;
        // storing it only doubles the draft and adds a blob that some Android
        // browsers can't write to IndexedDB.
        file: asset.file,
        sourceDuration: asset.sourceDuration,
        trimStart: asset.trimStart,
        url: asset.url,
        width: asset.width,
        height: asset.height,
        duration: asset.duration,
        videoReceipt: asset.videoReceipt,
      };
    return saveGenjutsuDraft({
      owner: user?.id,
      selectedId,
      aspect,
      durationTier,
      referenceClosed,
      referenceSource,
      lead: store(lead),
      referenceVideo: store(referenceVideo),
      ownVideo: store(ownVideo),
      savedAt: Date.now(),
    });
  }
  // Autosave reruns on every input change; report its failure once per visit.
  const autosaveErrorTracked = useRef(false);
  useEffect(() => {
    if (
      !draftReady ||
      sessionPending ||
      draftOwner !== (user?.id || 'anonymous')
    )
      return;
    // A committed binary save is required before the checkout dialog opens.
    // Autosave also covers ordinary navigation and reloads.
    // Failures stay silent here: Generate and checkout warn when it matters.
    void persistDraft().catch((error) => {
      if (autosaveErrorTracked.current) return;
      autosaveErrorTracked.current = true;
      trackDraftError('draft_autosave', error);
    });
  }, [
    draftReady,
    draftOwner,
    sessionPending,
    user?.id,
    lead,
    referenceVideo,
    ownVideo,
    selectedId,
    aspect,
    durationTier,
    referenceClosed,
    referenceSource,
  ]);
  useEffect(
    () => () => {
      if (lead?.preview.startsWith('blob:')) URL.revokeObjectURL(lead.preview);
    },
    [lead?.preview]
  );
  useEffect(
    () => () => {
      if (referenceVideo?.preview.startsWith('blob:'))
        URL.revokeObjectURL(referenceVideo.preview);
    },
    [referenceVideo?.preview]
  );
  useEffect(
    () => () => {
      if (ownVideo?.preview.startsWith('blob:'))
        URL.revokeObjectURL(ownVideo.preview);
    },
    [ownVideo?.preview]
  );
  // Mirror the uploaded reference (incl. its storage url/receipt once
  // generated) into its own copy with a separate preview URL.
  useEffect(() => {
    if (
      referenceSource !== 'upload' ||
      !referenceVideo?.file ||
      referenceVideo.uploading
    )
      return;
    setOwnVideo((current) =>
      current?.file === referenceVideo.file &&
      current?.url === referenceVideo.url &&
      current?.videoReceipt === referenceVideo.videoReceipt
        ? current
        : {
            ...referenceVideo,
            preview:
              current?.file === referenceVideo.file
                ? current!.preview
                : URL.createObjectURL(referenceVideo.file!),
          }
    );
  }, [referenceSource, referenceVideo]);

  const selected = useMemo(
    () =>
      templates.find((template) => template.id === selectedId) ??
      defaultTemplate,
    [selectedId, templates, defaultTemplate]
  );
  const example =
    templates.find((template) => template.id === exampleId) ?? defaultTemplate;
  const effectClip =
    selected.clip ??
    `/videos/effect-clips/${selected.asset}-${durationTier}s.mp4`;
  const effectQueryEnabled =
    draftReady && !referenceClosed && referenceSource === 'effect';
  const effectQuery = useQuery({
    queryKey: ['effect-clip', effectClip],
    enabled: effectQueryEnabled,
    staleTime: Infinity,
    retry: 1,
    queryFn: async ({ signal }) => {
      const blob = await apiGetMedia(effectClip, signal);
      const file = new File([blob], `${selected.name}-${durationTier}s.mp4`, {
        type: 'video/mp4',
      });
      const preview = URL.createObjectURL(file);
      try {
        const metadata = await readMediaMetadata(preview, 'video', file);
        genjutsuCredits(metadata.duration);
        return { file, ...metadata };
      } finally {
        URL.revokeObjectURL(preview);
      }
    },
  });
  useEffect(() => {
    if (!draftReady) return;
    if (referenceSource === 'upload') return;
    if (referenceClosed) {
      setReferenceVideo(undefined);
      return;
    }
    if (!effectQuery.data) {
      setReferenceVideo(undefined);
      return;
    }
    setReferenceVideo({
      ...effectQuery.data,
      kind: 'video',
      preview: URL.createObjectURL(effectQuery.data.file),
      uploading: false,
    });
    // The editing API keeps the input framing, so the size follows the clip.
    const closest = closestAspect(
      effectQuery.data.width,
      effectQuery.data.height
    );
    if (closest) setAspect(closest);
  }, [
    effectQuery.data,
    draftReady,
    effectClip,
    referenceClosed,
    referenceSource,
  ]);
  // The clip is fetched once (above) as the generation input; both previews
  // play that same blob instead of each re-downloading the mp4. During SSR /
  // draft restore and while the fetch is pending they show the poster; if the
  // fetch is off or failed, fall back to streaming the static URL.
  const effectResult = EFFECT_RESULTS[selected.asset];
  const showCompare =
    previewMode === 'example' && referenceSource === 'effect' && !!effectResult;
  // The slider has no metadata callback, so size the box for its clips.
  useEffect(() => {
    if (showCompare) setMediaRatio(16 / 9);
  }, [showCompare]);
  const effectPreviewSrc = !draftReady
    ? undefined
    : effectQueryEnabled && !effectQuery.isError
      ? effectQuery.data
        ? referenceVideo?.preview
        : undefined
      : effectClip;
  const readinessQuery = useQuery({
    queryKey: ['genjutsu-readiness'],
    queryFn: () => apiGet<GenjutsuReadiness>('/api/genjutsu/generate'),
    staleTime: 30000,
  });
  const readiness = readinessQuery.data;
  const costCredits = genjutsuCredits(referenceVideo?.duration || durationTier);
  const requiredGenerations = genjutsuGenerations(
    referenceVideo?.duration || durationTier
  );
  useEffect(() => {
    const saved = user
      ? sessionStorage.getItem(`genjutsu-task:${user.id}`)
      : null;
    setTaskId(saved || undefined);
    if (saved) setPreviewMode('work');
  }, [user?.id]);
  useEffect(() => {
    if (taskId && user)
      sessionStorage.setItem(`genjutsu-task:${user.id}`, taskId);
  }, [taskId, user?.id]);
  const creditsQuery = useQuery({
    queryKey: ['credits'],
    queryFn: () =>
      apiGet<{ balance: number; hasPaidOrder: boolean }>('/api/credits'),
    enabled: Boolean(user),
  });
  const taskQuery = useQuery({
    queryKey: ['genjutsu-task', taskId],
    queryFn: () => apiGet<GenjutsuTask>(`/api/studio/task?id=${taskId}`),
    enabled: Boolean(taskId && user),
    refetchInterval: (query) =>
      isDone(query.state.data) && !query.state.data?.archivePending
        ? false
        : 5000,
  });
  const task = taskQuery.data;
  useEffect(() => {
    if (taskQuery.isError && taskQuery.error.message === 'Task not found') {
      sessionStorage.removeItem(`genjutsu-task:${user?.id}`);
      sessionStorage.removeItem(submissionStorageKey);
      setTaskId(undefined);
      toast.error(taskQuery.error.message);
    }
  }, [taskQuery.isError, taskQuery.error, user?.id, submissionStorageKey]);

  const closestAspect = (width: number, height: number) => {
    const sourceRatio = width / height;
    const ratio = (value: string) => {
      const [w, h] = value.split(':').map(Number);
      return w / h;
    };
    return [...(readiness?.aspects || GENJUTSU_ASPECTS)].sort(
      (a, b) =>
        Math.abs(ratio(a) - sourceRatio) - Math.abs(ratio(b) - sourceRatio)
    )[0];
  };

  // Re-selects the kept own video from the effects strip.
  const selectOwnVideo = () => {
    if (!ownVideo) return;
    track('effect_select', { effect: 'own_video_saved' });
    setReferenceSource('upload');
    setReferenceClosed(false);
    setReferenceVideo({
      ...ownVideo,
      preview: ownVideo.file
        ? URL.createObjectURL(ownVideo.file)
        : ownVideo.url!,
    });
    if (ownVideo.width && ownVideo.height) {
      const closest = closestAspect(ownVideo.width, ownVideo.height);
      if (closest) setAspect(closest);
    }
    setPreviewMode('example');
  };

  const selectAsset = async (
    file: File | undefined,
    type: 'image' | 'video',
    setAsset: (asset: Asset | undefined) => void,
    tier: 5 | 10 = durationTier,
    preserveAspect = false
  ) => {
    if (!file) return;
    const isVideo = ['video/mp4', 'video/quicktime', 'video/x-m4v'].includes(
      file.type
    );
    if (
      type === 'image' &&
      !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)
    ) {
      toast.error(copy.ui.onlyImages);
      return;
    }
    if (type === 'video' && !isVideo) {
      toast.error(copy.ui.onlyVideos);
      return;
    }
    const maxMB = isVideo ? MAX_REFERENCE_VIDEO_MB : 10;
    const maxBytes = maxMB * 1024 * 1024;
    if (file.size > maxBytes) {
      toast.error(`File exceeds the ${maxMB}MB limit`);
      return;
    }

    const jobUrl = isVideo ? URL.createObjectURL(file) : undefined;
    if (jobUrl) {
      setVideoJob(jobUrl);
      revealResult();
    }
    let preview = URL.createObjectURL(file);
    const controller = new AbortController();
    if (isVideo) clipController.current = controller;
    const setValidating = isVideo ? setValidatingMedia : setValidatingPhoto;
    setValidating(true);
    try {
      let metadata = await readMediaMetadata(
        preview,
        type,
        isVideo ? file : undefined
      );
      if (isVideo && !Number.isFinite(metadata.duration))
        throw new Error(copy.invalidVideoDuration);
      if (isVideo && metadata.duration < 3)
        throw new Error(copy.videoDurationRange(metadata.duration.toFixed(2)));
      if (
        !isVideo &&
        (metadata.width < 300 ||
          metadata.height < 300 ||
          metadata.width / metadata.height < 0.4 ||
          metadata.width / metadata.height > 2.5)
      )
        throw new Error(copy.ui.imageTooSmall);
      const sourceDuration = metadata.duration;
      let preparedFile = file;
      let trimStart = 0;
      const resize = isVideo
        ? referenceVideoPlan(metadata.width, metadata.height)
        : undefined;
      if (isVideo && (sourceDuration > tier || resize?.needsResize)) {
        setTrimProgress(0);
        try {
          const clipped = await trimMiddleVideo(
            file,
            sourceDuration,
            tier,
            setTrimProgress,
            controller.signal,
            { width: metadata.width, height: metadata.height }
          );
          preparedFile = clipped.file;
          trimStart = clipped.start;
          URL.revokeObjectURL(preview);
          preview = URL.createObjectURL(preparedFile);
          metadata = await readMediaMetadata(preview, 'video', preparedFile);
          genjutsuCredits(metadata.duration);
        } catch {
          throw new Error(copy.trimFailed);
        }
      }
      if (
        isVideo &&
        (metadata.width < 720 ||
          metadata.height < 720 ||
          metadata.width > 2160 ||
          metadata.height > 2160)
      )
        throw new Error('Reference video dimensions must be 720–2160px');
      controller.signal.throwIfAborted();
      setAsset({
        kind: isVideo ? 'video' : 'image',
        file: preparedFile,
        ...(isVideo ? { sourceFile: file, sourceDuration, trimStart } : {}),
        preview,
        uploading: false,
        ...metadata,
      });
      track(isVideo ? 'reference_ready' : 'lead_uploaded', {
        source: 'upload',
      });
      if (isVideo) {
        setReferenceSource('upload');
        setReferenceClosed(false);
        const closest = closestAspect(metadata.width, metadata.height);
        if (closest && !preserveAspect) setAspect(closest);
        setPreviewMode('example');
      }
    } catch (error) {
      URL.revokeObjectURL(preview);
      if (!controller.signal.aborted)
        toast.error(error instanceof Error ? error.message : 'Invalid media');
    } finally {
      if (isVideo) {
        if (clipController.current === controller)
          clipController.current = undefined;
        setTrimProgress(undefined);
      }
      setValidating(false);
      if (jobUrl) {
        setVideoJob((current) => (current === jobUrl ? undefined : current));
        URL.revokeObjectURL(jobUrl);
      }
    }
  };

  const uploadAsset = async (asset: Asset) => {
    let receiptValid = false;
    try {
      const receipt =
        asset.videoReceipt && JSON.parse(asset.videoReceipt.payload);
      receiptValid = Boolean(
        receipt &&
        receipt.expires > Date.now() + 60000 &&
        receipt.width === asset.width &&
        receipt.height === asset.height
      );
    } catch {
      /* Re-upload invalid/expired receipts. */
    }
    if (asset.url && (asset.kind === 'image' || receiptValid))
      return { url: asset.url, videoReceipt: asset.videoReceipt };
    if (!asset.file) throw new Error('Select a file before generating');
    const response = await apiUpload<{
      urls: string[];
      videoReceipt?: Asset['videoReceipt'];
      duration?: number;
    }>(
      asset.kind === 'video'
        ? '/api/storage/upload-video'
        : '/api/storage/upload-image',
      asset.file
    );
    const url = response.urls[0];
    if (!url || !url.startsWith('https://')) {
      throw new Error(
        'Configure public storage before uploading reference media'
      );
    }
    return {
      url,
      videoReceipt: response.videoReceipt,
      duration: response.duration,
    };
  };

  const generate = useMutation({
    mutationFn: async () => {
      if (!lead || !referenceVideo) throw new Error(copy.ui.needAssets);
      const current = await readinessQuery.refetch();
      if (current.isError) throw new Error(copy.serviceUnavailable);
      if (!current.data?.provider)
        throw new Error(
          'Configure an EvoLink or fal API key in Admin Settings'
        );
      if (!current.data.storageReady)
        throw new Error(
          'Configure public R2 storage in Admin Settings before generating'
        );
      if (!current.data.safetyReady)
        throw new Error(
          'Configure prompt safety screening in Admin Settings before generating'
        );
      if (!current.data.aspects.includes(aspect))
        throw new Error(copy.ui.unsupportedSize);
      // Editing models preserve source framing: prepare the actual input, not
      // only the API's aspect_ratio flag. Pad to keep the entire performance.
      let preparedReference = referenceVideo;
      if (!referenceVideo.width || !referenceVideo.height)
        throw new Error(
          'Select the reference video again to verify its dimensions'
        );
      const plan = referenceVideoPlan(
        referenceVideo.width,
        referenceVideo.height,
        aspect
      );
      if (plan.needsResize) {
        if (!referenceVideo.file)
          throw new Error(
            'Select the reference video again to change its ratio'
          );
        const controller = new AbortController();
        clipController.current = controller;
        setTrimProgress(0);
        try {
          const result = await trimMiddleVideo(
            referenceVideo.file,
            referenceVideo.duration!,
            durationTier,
            setTrimProgress,
            controller.signal,
            {
              width: referenceVideo.width,
              height: referenceVideo.height,
              aspect,
            }
          );
          const preview = URL.createObjectURL(result.file);
          let metadata;
          try {
            metadata = await readMediaMetadata(preview, 'video', result.file);
          } catch (error) {
            URL.revokeObjectURL(preview);
            throw error;
          }
          if (!matchesVideoAspect(metadata.width, metadata.height, aspect)) {
            URL.revokeObjectURL(preview);
            throw new Error(
              'Could not prepare the selected video ratio. Please retry.'
            );
          }
          preparedReference = {
            ...referenceVideo,
            ...metadata,
            file: result.file,
            preview,
            url: undefined,
            videoReceipt: undefined,
            uploading: false,
          };
          setReferenceVideo(preparedReference);
        } finally {
          if (clipController.current === controller)
            clipController.current = undefined;
          setTrimProgress(undefined);
        }
      }
      setLead({ ...lead, uploading: true });
      setReferenceVideo({ ...preparedReference, uploading: true });
      let leadImage: string;
      let videoUrl: string;
      let videoReceipt: Asset['videoReceipt'];
      try {
        // Parallel transfer; each successful asset is retained even if the other fails.
        const [imageUpload, videoUpload] = await parallelMediaUpload(
          async () => {
            const uploaded = await uploadAsset(lead);
            setLead({ ...lead, url: uploaded.url, uploading: false });
            return uploaded;
          },
          async () => {
            const uploaded = await uploadAsset(preparedReference);
            setReferenceVideo({
              ...preparedReference,
              url: uploaded.url,
              videoReceipt: uploaded.videoReceipt,
              uploading: false,
            });
            return uploaded;
          }
        );
        leadImage = imageUpload.url;
        videoUrl = videoUpload.url;
        videoReceipt = videoUpload.videoReceipt;
      } catch (error) {
        setLead((value) => (value ? { ...value, uploading: false } : value));
        setReferenceVideo((value) =>
          value ? { ...value, uploading: false } : value
        );
        throw error;
      }
      const signature = JSON.stringify([
        leadImage,
        videoUrl,
        aspect,
        selected.id,
      ]);
      let submission: { signature: string; requestId: string } | undefined;
      try {
        submission = JSON.parse(
          sessionStorage.getItem(submissionStorageKey) || 'null'
        );
      } catch {
        /* New submission. */
      }
      if (!submission || submission.signature !== signature) {
        // uuid falls back to getRandomValues where crypto.randomUUID is missing.
        submission = { signature, requestId: uuidv4() };
        sessionStorage.setItem(
          submissionStorageKey,
          JSON.stringify(submission)
        );
      }
      return apiPost<GenjutsuTask>('/api/genjutsu/generate', {
        requestId: submission.requestId,
        aspect,
        templateId:
          theme && referenceSource === 'upload'
            ? theme.uploadTemplateId
            : referenceOnly
              ? 'crazy-frog-ai'
              : referenceSource === 'effect'
                ? selected.id
                : undefined,
        leadImage,
        referenceVideo: videoUrl,
        videoReceipt,
        referenceWidth: preparedReference.width,
        referenceHeight: preparedReference.height,
      });
    },
    onSuccess: (created) => {
      track('generate_submitted');
      setTaskId(created.id);
      setPreviewMode('work');
      revealResult();
      queryClient.setQueryData(['genjutsu-task', created.id], created);
      queryClient.invalidateQueries({ queryKey: ['credits'] });
    },
    onError: (error: Error) => {
      if (error.message === 'Insufficient credits') {
        track('paywall_shown', { reason: 'low_balance' });
        setPaywall(true);
      } else {
        track('generate_error', { stage: 'submit', error: error.message });
        showFailure(error.message);
      }
    },
  });

  // The API reduces provider failures to these three messages (see
  // publicTaskError); anything else is one of our own readable errors.
  const failureMessage = (error?: string | null) =>
    error === 'Content policy violation'
      ? copy.contentPolicy
      : error === 'Service busy'
        ? copy.generationBusy
        : !error || error === 'Generation failed'
          ? copy.generationFailed
          : error;

  useEffect(() => {
    if (!task || !isDone(task)) return;
    sessionStorage.removeItem(submissionStorageKey);
    queryClient.invalidateQueries({ queryKey: ['credits'] });
    if (task.status === 'failed') {
      track('generate_failed', { kind: task.error || 'unknown' });
      showFailure(task.error);
    }
  }, [queryClient, task]);

  const running = generate.isPending || Boolean(taskId && !isDone(task));

  function chooseTemplate(template: GeneratorTemplate) {
    track('effect_select', { effect: template.id });
    setFailure(undefined);
    setReferenceSource('effect');
    setReferenceClosed(false);
    if (selectedId !== template.id || referenceSource === 'upload')
      setReferenceVideo(undefined);
    setSelectedId(template.id);
    setExampleId(template.id);
    setSampleId(undefined);
    setPreviewMode('example');
  }
  // Page sections outside the generator (e.g. a theme gallery) pick a
  // template by dispatching `genjutsu:select-template` with its id.
  const chooseTemplateRef = useRef(chooseTemplate);
  chooseTemplateRef.current = chooseTemplate;
  const selectionLocked =
    running || checkingGeneration || validatingMedia || savingDraft;
  useEffect(() => {
    const onSelect = (event: Event) => {
      const id = (event as CustomEvent<string>).detail;
      const template = templates.find((t) => t.id === id);
      if (template && !selectionLocked) chooseTemplateRef.current(template);
    };
    window.addEventListener('genjutsu:select-template', onSelect);
    return () =>
      window.removeEventListener('genjutsu:select-template', onSelect);
  }, [templates, selectionLocked]);
  // Generation overlay: the provider reports no progress, so the bar is an
  // estimate from observed render times.
  const generatingView = submitting || running;
  useEffect(() => {
    if (!generatingView) return;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [generatingView]);
  const preparingMedia = submitting || generate.isPending;
  // Kling O3 rendered a 7s clip in ~3–4 min in testing (2026-10-12).
  const expectedSecs = 300;
  const renderStart =
    !preparingMedia && task?.createdAt
      ? Date.parse(task.createdAt)
      : (startedAt ?? now);
  const elapsedSecs = Math.max(0, (now - renderStart) / 1000);
  const generatingPercent = preparingMedia
    ? Math.min(8, 2 + elapsedSecs)
    : elapsedSecs < expectedSecs
      ? 8 + (82 * elapsedSecs) / expectedSecs
      : 90 + 9 * (1 - Math.exp(-(elapsedSecs - expectedSecs) / expectedSecs));
  const uploading = Boolean(lead?.uploading || referenceVideo?.uploading);
  const canGenerate =
    draftReady &&
    draftOwner === (user?.id || 'anonymous') &&
    !sessionPending &&
    !savingDraft &&
    !checkingGeneration &&
    !recoveryQuery.isFetching &&
    !uploading &&
    !running &&
    !validatingMedia &&
    !validatingPhoto;

  async function startGeneration() {
    setFailure(undefined);
    setSubmitting(true);
    setStartedAt(Date.now());
    revealResult();
    try {
      await runGeneration();
    } finally {
      setSubmitting(false);
    }
  }

  async function runGeneration() {
    if (
      referenceSource === 'effect' &&
      !referenceClosed &&
      (effectQuery.isFetching || effectQuery.isError || !effectQuery.data)
    ) {
      track('generate_error', { stage: 'effect_loading' });
      toast.error(copy.ui.waitReference);
      return;
    }
    track('generate_click', {
      signedIn: Boolean(user),
      leadReady: assetIsReady(lead),
      referenceReady: assetIsReady(referenceVideo),
    });
    // Check the inputs before sending the visitor to sign in, so they never
    // sign in only to be told something is missing.
    if (!assetIsReady(lead) || !assetIsReady(referenceVideo)) {
      track('generate_error', { stage: 'assets' });
      toast.error(copy.ui.needAssets);
      return;
    }
    setSavingDraft(true);
    let draftSaved = true;
    try {
      await persistDraft();
    } catch (error) {
      // The draft only restores media after a redirect; a failed save (private
      // mode, full storage) must not block sign-in or generation.
      draftSaved = false;
      trackDraftError('draft', error);
    } finally {
      setSavingDraft(false);
    }
    if (!user) {
      if (draftSaved) {
        try {
          sessionStorage.setItem(RESUME_KEY, 'generate');
        } catch {
          /* Storage unavailable — the user can click again. */
        }
      } else {
        toast.warning(copy.ui.saveMediaSignIn);
      }
      track('signin_redirect');
      router.push(`/sign-in?callbackUrl=${encodeURIComponent(returnPath)}`);
      return;
    }
    setCheckingGeneration(true);
    try {
      // Recover an accepted request before checking the now-reduced balance.
      const recovered = await recoveryQuery.refetch();
      if (recovered.isError) throw recovered.error;
      if (recovered.data) {
        setTaskId(recovered.data.id);
        setPreviewMode('work');
        return;
      }
      const current = await readinessQuery.refetch();
      if (current.isError || !current.data?.ready)
        throw new Error(copy.serviceUnavailable);
      if (!current.data.aspects.includes(aspect))
        throw new Error(copy.ui.unsupportedSize);
      const credits = await creditsQuery.refetch();
      if (credits.isError || !credits.data)
        throw new Error(copy.ui.verifyBalanceFailed);
      if (!credits.data.hasPaidOrder || credits.data.balance < costCredits) {
        track('paywall_shown', {
          reason: credits.data.hasPaidOrder ? 'low_balance' : 'no_paid_order',
          balance: credits.data.balance,
          cost: costCredits,
        });
        setPaywall(true);
        return;
      }
      generate.mutate();
    } catch (error) {
      track('generate_error', {
        stage: 'check',
        error: error instanceof Error ? error.message : 'unknown',
      });
      showFailure(
        error instanceof Error ? error.message : copy.serviceUnavailable
      );
    } finally {
      setCheckingGeneration(false);
    }
  }

  // The visitor clicked Generate before signing in: once the saved draft is
  // restored under their account, continue straight to the balance check
  // (paywall or generation) instead of making them click again.
  const resumed = useRef(false);
  useEffect(() => {
    if (resumed.current || !user || !canGenerate) return;
    if (!assetIsReady(lead) || !assetIsReady(referenceVideo)) return;
    // Wait for the restored reference effect to load; resuming earlier trips
    // the effect_loading guard in runGeneration.
    if (
      referenceSource === 'effect' &&
      !referenceClosed &&
      (effectQuery.isFetching || effectQuery.isError || !effectQuery.data)
    )
      return;
    let pending: string | null = null;
    try {
      pending = sessionStorage.getItem(RESUME_KEY);
      sessionStorage.removeItem(RESUME_KEY);
    } catch {
      /* Storage unavailable — the user can click again. */
    }
    resumed.current = true;
    if (!pending) return;
    track('signin_resume', { action: pending });
    if (pending === 'generate') void startGeneration();
  });

  const workUrl = task?.status === 'success' ? task.url : null;
  const showWork = previewMode === 'work';
  const sample =
    previewMode === 'example' && referenceSource === 'effect'
      ? theme?.samples?.find((item) => item.id === sampleId)
      : undefined;
  const [workDimensions, setWorkDimensions] = useState<{
    url: string;
    width: number;
    height: number;
  }>();
  const workRatioMismatch =
    workDimensions?.url === workUrl &&
    task?.aspect &&
    !matchesVideoAspect(
      workDimensions.width,
      workDimensions.height,
      task.aspect
    );
  const downloadMutation = useMutation({
    mutationFn: (id: string) =>
      apiDownload(`/api/studio/download?id=${encodeURIComponent(id)}`),
    onError: (error: Error) => toast.error(error.message),
  });

  const leadDisabled =
    !draftReady ||
    running ||
    checkingGeneration ||
    validatingPhoto ||
    savingDraft;
  const generateDisabled =
    !canGenerate ||
    (Boolean(theme) && !assetIsReady(lead)) ||
    (referenceSource === 'effect' &&
      (effectQuery.isFetching || effectQuery.isError || !effectQuery.data)) ||
    referenceClosed ||
    !referenceVideo;

  return (
    <>
      <div
        ref={generatorRef}
        id="generator"
        data-reference-only={referenceOnly}
        data-themed={Boolean(theme)}
        className="eg-generator border-border bg-muted text-foreground grid scroll-mt-24 grid-cols-1 gap-3 rounded-3xl border p-3 lg:grid-cols-[minmax(0,1fr)_320px]"
      >
        <section
          ref={createRef}
          id="genjutsu-upload"
          aria-label="Create"
          className="eg-generator-controls bg-card order-3 flex min-h-0 scroll-mt-24 flex-col gap-4 rounded-2xl p-4 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:gap-5 lg:p-5"
        >
          <h2 className="text-lg font-semibold max-lg:hidden">
            {theme?.title ??
              (referenceOnly ? copy.customReference : copy.ui.aiEffects)}
          </h2>
          {/* Desktop: the effect picked below the preview, echoed here so the
              panel reads as effect → photo → size → generate. */}
          {panelPicker && (
            <div className="flex flex-col gap-2 max-lg:hidden">
              <span className="text-sm font-medium">{theme?.choose}</span>
              <div
                className="grid grid-cols-3 gap-2"
                data-testid="panel-template-list"
              >
                {templates.map((template) => {
                  const active =
                    referenceSource === 'effect' && selected.id === template.id;
                  return (
                    <button
                      key={template.id}
                      type="button"
                      aria-pressed={active}
                      title={template.name}
                      disabled={selectionLocked}
                      onClick={() => chooseTemplate(template)}
                      className="group flex min-w-0 flex-col gap-1.5 text-left disabled:cursor-not-allowed"
                    >
                      <span
                        className={cn(
                          'bg-muted relative block aspect-[9/16] overflow-hidden rounded-lg ring-2 transition-all',
                          active
                            ? 'ring-primary'
                            : 'group-hover:ring-primary/40 ring-transparent'
                        )}
                      >
                        <img
                          src={template.thumb}
                          alt=""
                          loading="lazy"
                          decoding="async"
                          className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        {active ? (
                          <span className="bg-primary text-primary-foreground absolute top-1.5 right-1.5 flex size-5 items-center justify-center rounded-full">
                            <Check className="size-3.5" />
                          </span>
                        ) : null}
                      </span>
                      <span
                        className={cn(
                          'line-clamp-2 text-[11px] leading-tight font-medium',
                          active ? 'text-foreground' : 'text-muted-foreground'
                        )}
                      >
                        {template.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          <div
            className={cn(
              'flex flex-col gap-2 max-lg:hidden',
              (referenceOnly || panelPicker) && 'hidden lg:hidden'
            )}
          >
            <span className="text-sm font-medium">
              {theme?.choose ?? copy.ui.effect}
            </span>
            <a
              href={
                referenceOnly ? `#${referenceInputId}` : '#genjutsu-effects'
              }
              className="eg-generator-effect border-border bg-muted hover:border-primary/50 group flex items-center gap-3 rounded-xl border p-2 transition-colors"
            >
              {referenceSource === 'upload' ? (
                <span className="bg-primary/15 text-primary-text flex aspect-[3/4] w-12 shrink-0 items-center justify-center rounded-lg">
                  <Video className="size-5" aria-hidden="true" />
                </span>
              ) : (
                <img
                  src={selected.thumb}
                  alt=""
                  className="aspect-[3/4] w-12 shrink-0 rounded-lg object-cover"
                />
              )}
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm font-semibold">
                  {referenceSource === 'upload'
                    ? copy.customReference
                    : selected.name}
                </span>
                {referenceSource === 'effect' && (
                  <span className="text-muted-foreground text-xs">
                    {Math.min(selected.duration, durationTier)}s ·{' '}
                    {selected.ratios}
                  </span>
                )}
              </span>
              <ChevronDown
                aria-hidden
                className="text-muted-foreground group-hover:text-primary size-4 shrink-0 -rotate-90 transition-colors"
              />
            </a>
          </div>
          <div
            className={cn(
              'eg-generator-assets grid grid-cols-1 gap-4',
              panelPicker
                ? 'grid-cols-2 gap-3'
                : 'lg:flex lg:min-h-0 lg:flex-1 lg:flex-col-reverse lg:gap-2',
              // Themed (phones/tablets): video and photo uploads side by side;
              // with the in-panel picker they stay paired on desktop too.
              theme && 'grid-cols-2 gap-3'
            )}
          >
            <div
              className={cn(
                'flex min-w-0 flex-col gap-2',
                theme && !panelPicker && 'lg:hidden'
              )}
            >
              <div
                className={cn(
                  'flex flex-col',
                  !referenceOnly && !panelPicker && 'lg:hidden'
                )}
              >
                <label
                  htmlFor={referenceInputId}
                  className="text-sm font-medium"
                >
                  {copy.customReference}
                </label>
                <span className="text-muted-foreground text-xs">MP4, MOV</span>
              </div>
              <div
                style={referenceOnly ? { display: 'block' } : undefined}
                data-testid="selected-reference-video"
                className={cn(
                  'eg-generator-upload border-border bg-muted hover:border-primary/70 relative overflow-hidden rounded-xl border border-dashed transition-colors',
                  !panelPicker && 'lg:hidden',
                  theme ? 'aspect-square' : 'aspect-[2/1] sm:aspect-[4/3]',
                  panelPicker && 'lg:aspect-[3/4]'
                )}
              >
                <input
                  id={referenceInputId}
                  type="file"
                  accept="video/mp4,video/quicktime,video/x-m4v"
                  aria-label={copy.uploadReference}
                  data-testid="upload-video"
                  onPointerDown={warmVideoTools}
                  onFocus={warmVideoTools}
                  data-filled={assetIsReady(referenceVideo)}
                  disabled={
                    !draftReady ||
                    running ||
                    checkingGeneration ||
                    validatingMedia ||
                    savingDraft
                  }
                  className="absolute inset-0 z-20 size-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
                  onChange={(event) => {
                    void selectAsset(
                      event.target.files?.[0],
                      'video',
                      setReferenceVideo
                    );
                    event.currentTarget.value = '';
                  }}
                />
                {referenceClosed ||
                referenceSource === 'effect' ||
                !referenceVideo ? (
                  <div
                    data-testid="reference-video-empty"
                    className="flex size-full flex-col items-center justify-center gap-3 p-3 text-center"
                  >
                    <span className="bg-primary/15 text-primary-text ring-primary/40 relative flex size-11 items-center justify-center rounded-full ring-1">
                      <Video className="size-5" aria-hidden="true" />
                    </span>
                    <span className="text-sm font-medium">
                      {copy.uploadReference}
                    </span>
                    <span
                      className={cn(
                        'text-muted-foreground text-[11px]',
                        theme && 'hidden'
                      )}
                    >
                      {copy.referenceEmpty}
                    </span>
                  </div>
                ) : referenceVideo ? (
                  <PreviewAsset
                    asset={referenceVideo}
                    className="absolute inset-0"
                  />
                ) : (
                  <div className="flex size-full items-center justify-center">
                    <Loader2 className="size-5 animate-spin" />
                  </div>
                )}
                {!referenceClosed &&
                  referenceSource === 'upload' &&
                  referenceVideo && (
                    <button
                      type="button"
                      data-testid="remove-reference-video"
                      aria-label={copy.removeReference}
                      title={copy.removeReference}
                      disabled={
                        running ||
                        checkingGeneration ||
                        savingDraft ||
                        validatingMedia
                      }
                      onClick={() => {
                        setReferenceClosed(true);
                        setReferenceVideo(undefined);
                      }}
                      className="hover:bg-destructive focus-visible:ring-primary absolute top-2 right-2 z-30 flex size-7 items-center justify-center rounded-full bg-black/80 text-white transition-colors focus-visible:ring-2 disabled:opacity-50"
                    >
                      <X className="size-3.5" aria-hidden="true" />
                    </button>
                  )}
              </div>
              {referenceSource === 'effect' &&
                !referenceClosed &&
                effectQuery.isError && (
                  <button
                    type="button"
                    onClick={() => effectQuery.refetch()}
                    className="text-destructive text-xs"
                  >
                    {copy.ui.loadVideoFailed}
                  </button>
                )}
            </div>
            <UploadSlot
              label={theme?.photo ?? copy.ui.yourPhoto}
              hint={theme?.photoHint ?? copy.ui.photoHint}
              uploadLabel={copy.ui.uploadPhoto}
              kind="image"
              disabled={leadDisabled}
              accept="image/jpeg,image/png,image/webp"
              asset={lead}
              onFile={(file) => selectAsset(file, 'image', setLead)}
              onRemove={() => setLead(undefined)}
              removeLabel={copy.removePhoto}
              testId="upload-lead"
              rootClassName={panelPicker ? undefined : 'lg:min-h-0 lg:flex-1'}
              frameClassName={cn(
                !panelPicker && 'lg:aspect-auto lg:min-h-48 lg:flex-1',
                theme ? 'aspect-square' : 'aspect-[2/1] sm:aspect-[4/3]',
                panelPicker && 'lg:aspect-[3/4]'
              )}
            />
          </div>

          <button
            type="button"
            aria-expanded={moreOpen}
            onClick={() => setMoreOpen((open) => !open)}
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 self-start text-sm lg:hidden"
          >
            <ChevronDown
              aria-hidden
              className={cn(
                'size-4 transition-transform',
                moreOpen && 'rotate-180'
              )}
            />
            {copy.moreSettings}
          </button>

          <div
            className={cn(
              'flex flex-col gap-4 lg:contents',
              !moreOpen && 'max-lg:hidden'
            )}
          >
            <fieldset
              className={cn(
                'flex flex-col gap-2',
                // A built-in take fixes the framing; only an own clip needs it.
                panelPicker && referenceSource === 'effect' && 'lg:hidden'
              )}
            >
              <legend className="mb-2 text-sm font-medium">
                {copy.ui.videoSize}
              </legend>
              <div className="flex gap-2">
                {GENJUTSU_ASPECTS.map((ratio) => (
                  <button
                    key={ratio}
                    type="button"
                    aria-pressed={aspect === ratio}
                    data-testid={`ratio-${ratio.replace(':', '-')}`}
                    disabled={
                      running ||
                      checkingGeneration ||
                      savingDraft ||
                      validatingMedia ||
                      !draftReady ||
                      Boolean(readiness && !readiness.aspects.includes(ratio))
                    }
                    title={
                      readiness && !readiness.aspects.includes(ratio)
                        ? copy.ui.unsupportedRatio
                        : undefined
                    }
                    onClick={() => setAspect(ratio)}
                    className={cn(
                      'flex flex-1 items-center justify-center gap-2 rounded-lg border px-2 py-2 text-sm font-medium transition-colors disabled:opacity-60',
                      aspect === ratio
                        ? 'border-primary bg-primary/15 text-primary-text'
                        : 'border-border hover:border-primary/40'
                    )}
                  >
                    <span
                      className={cn(
                        'rounded-[2px] border-2 border-current',
                        ratio === '16:9' ? 'h-3 w-5' : 'h-5 w-3'
                      )}
                    />
                    {ratio}
                  </button>
                ))}
              </div>
            </fieldset>
          </div>

          <div className="mt-auto flex flex-col gap-2">
            <button
              type="button"
              disabled={generateDisabled}
              data-testid="generate-button"
              className="eg-generator-submit group/button bg-primary text-primary-foreground focus-visible:ring-ring focus-visible:ring-offset-card inline-flex h-12 w-full shrink-0 items-center justify-center gap-1.5 rounded-xl border border-transparent px-2.5 text-base font-semibold transition-colors outline-none hover:brightness-110 focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none"
              onClick={startGeneration}
            >
              {running ? (
                <Loader2 className="size-5 animate-spin" />
              ) : (
                <Sparkles className="size-5" />
              )}
              {running
                ? copy.generatingTitle
                : (theme?.generate ?? copy.ui.generateNow)}
            </button>
            {theme &&
              effectQueryEnabled &&
              (effectQuery.isPending || effectQuery.isError) && (
                <div
                  role="status"
                  className="text-muted-foreground text-center text-xs"
                >
                  {effectQuery.isError ? (
                    <button
                      type="button"
                      onClick={() => effectQuery.refetch()}
                      className="text-primary-text underline"
                    >
                      {theme.retry}
                    </button>
                  ) : (
                    theme.loading
                  )}
                </div>
              )}
            {/* 9 in 10 visitors who reached the paywall left without picking
                a plan (Oct 2026) — state the price before they invest the
                upload, not after. */}
            {!creditsQuery.data?.hasPaidOrder && (
              <p
                data-testid="first-price"
                className="text-muted-foreground text-center text-xs"
              >
                {copy.firstPrice}
              </p>
            )}
          </div>
        </section>

        <section
          style={referenceOnly ? { display: 'none' } : undefined}
          id="genjutsu-effects"
          aria-label={copy.ui.selectEffect}
          onMouseEnter={() => {
            effectsReturnPending.current = false;
            clearTimeout(effectsReturnTimer.current);
          }}
          onMouseLeave={() => {
            effectsReturnPending.current = true;
            returnToSelectedEffect();
          }}
          className={cn(
            'bg-card order-2 flex min-h-0 scroll-mt-24 flex-col gap-3 rounded-2xl p-4 lg:col-start-1 lg:row-start-2',
            panelPicker && 'lg:hidden'
          )}
        >
          <h2 className="text-sm font-semibold lg:text-lg">
            {theme?.choose ?? copy.ui.selectEffect}
          </h2>
          <div className="relative">
            <div
              data-testid="template-list"
              ref={effectsRef}
              onPointerDown={() => {
                effectsPointerDown.current = true;
              }}
              onScroll={() => {
                effectsLastScroll.current = performance.now();
                if (effectsReturnPending.current) returnToSelectedEffect();
              }}
              className="eg-generator-template-list flex snap-x scroll-pl-1 gap-3 overflow-x-auto overscroll-x-contain p-1 [scrollbar-color:rgb(255_255_255/0.2)_transparent] [scrollbar-width:thin] lg:scroll-pl-[9rem]"
            >
              {/* Opens the reference-video input kept in the Create column.
                  Pinned to the left edge so uploading stays one tap away while
                  the effects scroll underneath. */}
              <label
                htmlFor={referenceInputId}
                data-testid="template-own-video"
                data-selected={referenceSource === 'upload' && !ownVideo}
                onClick={() => track('effect_select', { effect: 'own_video' })}
                className={cn(
                  'border-border bg-muted hover:border-primary/70 before:bg-card sticky left-0 z-10 flex aspect-[3/4] w-28 shrink-0 cursor-pointer snap-start flex-col items-center justify-center gap-2 rounded-xl border border-dashed p-2 text-center ring-2 transition-colors before:absolute before:inset-y-[-0.25rem] before:right-[-0.75rem] before:left-[-1rem] before:-z-10 max-lg:hidden lg:w-32',
                  referenceSource === 'upload' && !ownVideo
                    ? 'ring-primary'
                    : 'ring-transparent'
                )}
              >
                <span className="bg-primary/15 text-primary-text ring-primary/40 flex size-10 items-center justify-center rounded-full ring-1">
                  <Video className="size-5" aria-hidden="true" />
                </span>
                <span className="text-sm leading-tight font-semibold">
                  {copy.uploadReference}
                </span>
                <span className="text-muted-foreground text-[11px]">
                  MP4, MOV
                </span>
              </label>
              {ownVideo ? (
                <button
                  type="button"
                  data-testid="template-saved-video"
                  aria-pressed={referenceSource === 'upload'}
                  disabled={
                    running ||
                    checkingGeneration ||
                    validatingMedia ||
                    savingDraft
                  }
                  onClick={selectOwnVideo}
                  className={cn(
                    'group bg-muted relative aspect-[3/4] w-20 shrink-0 snap-start overflow-hidden rounded-xl text-left ring-2 transition-all disabled:cursor-not-allowed lg:w-32',
                    referenceSource === 'upload'
                      ? 'ring-primary'
                      : 'ring-transparent'
                  )}
                >
                  <video
                    src={ownVideo.preview}
                    autoPlay
                    loop
                    muted
                    playsInline
                    preload="auto"
                    className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <span className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black via-black/60 to-transparent" />
                  {referenceSource === 'upload' ? (
                    <span className="bg-primary text-primary-foreground absolute top-2 right-2 flex size-6 items-center justify-center rounded-full">
                      <Check className="size-4" />
                    </span>
                  ) : null}
                  <span className="absolute inset-x-1.5 bottom-1.5 lg:inset-x-2 lg:bottom-2">
                    <span className="block text-[10px] leading-tight font-semibold [overflow-wrap:anywhere] hyphens-auto text-white drop-shadow-[0_1px_2px_rgb(0_0_0/0.9)] lg:text-sm">
                      {copy.customReference}
                    </span>
                    {ownVideo.duration ? (
                      <span className="block text-[9px] text-white/70 lg:text-[11px]">
                        {Math.round(ownVideo.duration)}s
                      </span>
                    ) : null}
                  </span>
                </button>
              ) : null}
              {templates.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  aria-pressed={
                    referenceSource === 'effect' && selected.id === template.id
                  }
                  data-testid={`template-${template.id}`}
                  className={cn(
                    'group relative aspect-[3/4] w-20 shrink-0 snap-start overflow-hidden rounded-xl text-left ring-2 transition-all disabled:cursor-not-allowed lg:w-32',
                    referenceSource === 'effect' && selected.id === template.id
                      ? 'ring-primary'
                      : 'ring-transparent'
                  )}
                  disabled={
                    running ||
                    checkingGeneration ||
                    validatingMedia ||
                    savingDraft
                  }
                  onClick={() => chooseTemplate(template)}
                >
                  <img
                    src={template.thumb}
                    alt={`${template.name} template`}
                    loading="lazy"
                    decoding="async"
                    className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <span className="absolute inset-0 bg-gradient-to-t from-neutral-950/90 via-neutral-700/50 to-neutral-400/20 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  <span className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black via-black/60 to-transparent" />
                  {template.tag ? (
                    <span className="bg-primary text-primary-foreground absolute top-2 left-2 rounded-full px-1.5 py-0.5 text-[8px] font-bold tracking-wider uppercase lg:px-2 lg:text-[10px]">
                      {template.tag}
                    </span>
                  ) : null}
                  {referenceSource === 'effect' &&
                  selected.id === template.id ? (
                    <span className="bg-primary text-primary-foreground absolute top-2 right-2 flex size-6 items-center justify-center rounded-full">
                      <Check className="size-4" />
                    </span>
                  ) : null}
                  <span className="absolute inset-x-1.5 bottom-1.5 lg:inset-x-2 lg:bottom-2">
                    <span className="block text-[10px] leading-tight font-semibold [overflow-wrap:anywhere] hyphens-auto text-white drop-shadow-[0_1px_2px_rgb(0_0_0/0.9)] lg:text-sm">
                      {template.name}
                    </span>
                    <span className="block text-[9px] text-white/70 lg:text-[11px]">
                      {Math.min(template.duration, durationTier)}s ·{' '}
                      {template.ratios}
                    </span>
                  </span>
                </button>
              ))}
              {theme?.samples?.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={sample?.id === item.id}
                  data-testid={`sample-${item.id}`}
                  className={cn(
                    'group relative aspect-[3/4] w-20 shrink-0 snap-start overflow-hidden rounded-xl text-left ring-2 transition-all lg:w-32',
                    sample?.id === item.id
                      ? 'ring-primary/70'
                      : 'hover:ring-primary/40 ring-transparent'
                  )}
                  onClick={() => {
                    track('sample_play', { sample: item.id });
                    setPreviewMode('example');
                    setSampleId((id) => (id === item.id ? undefined : item.id));
                  }}
                >
                  <img
                    src={item.poster}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <span className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black via-black/60 to-transparent" />
                  <span className="absolute top-2 right-2 flex size-6 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur">
                    <Play className="size-3 fill-current" aria-hidden="true" />
                  </span>
                  <span className="absolute inset-x-1.5 bottom-1.5 lg:inset-x-2 lg:bottom-2">
                    <span className="block text-[10px] leading-tight font-semibold [overflow-wrap:anywhere] hyphens-auto text-white drop-shadow-[0_1px_2px_rgb(0_0_0/0.9)] lg:text-sm">
                      {item.name}
                    </span>
                    <span className="block text-[9px] text-white/70 lg:text-[11px]">
                      {theme.sampleLabel}
                    </span>
                  </span>
                </button>
              ))}
              <div
                aria-hidden="true"
                className={cn(
                  'w-[calc(100%-5rem-0.75rem)] shrink-0 lg:w-[calc(100%-16rem-1.5rem)]',
                  theme && 'hidden'
                )}
              />
            </div>
          </div>
        </section>

        <section
          ref={previewRef}
          aria-label="Preview"
          className={cn(
            'eg-generator-preview bg-card @container order-1 flex min-h-0 scroll-mt-24 flex-col gap-3 rounded-2xl p-4 lg:col-start-1 lg:row-start-1',
            panelPicker && 'lg:row-span-2'
          )}
        >
          <div className="eg-generator-tabs bg-muted flex w-fit gap-1 rounded-xl p-1">
            <button
              type="button"
              data-testid="preview-example"
              aria-pressed={previewMode === 'example'}
              className={cn(
                'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                previewMode === 'example'
                  ? 'text-foreground bg-card shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
              onClick={() => setPreviewMode('example')}
            >
              {copy.ui.referenceExample}
            </button>
            <button
              type="button"
              data-testid="preview-work"
              aria-pressed={previewMode === 'work'}
              className={cn(
                'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                previewMode === 'work'
                  ? 'text-foreground bg-card shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
              onClick={() => setPreviewMode('work')}
            >
              {copy.ui.myWork}
            </button>
          </div>
          <div
            style={{ '--media-ratio': mediaRatio } as React.CSSProperties}
            data-empty={referenceOnly && !referenceVideo && !showWork}
            className="eg-generator-screen relative flex items-center justify-center overflow-hidden rounded-xl bg-black max-lg:aspect-(--media-ratio) lg:mx-auto lg:h-[min(560px,calc(100cqw/var(--media-ratio)))] lg:w-[min(100cqw,calc(560px*var(--media-ratio)))]"
          >
            {!referenceOnly && (
              <img
                src={example.image}
                alt=""
                aria-hidden="true"
                // LCP element on mobile: fetch it ahead of other images.
                fetchPriority="high"
                className="absolute inset-0 size-full scale-110 object-cover opacity-50 blur-2xl"
              />
            )}
            {referenceOnly && !referenceVideo && !showWork && (
              <label
                htmlFor={referenceInputId}
                className="eg-generator-empty relative z-10 flex max-w-md cursor-pointer flex-col items-center gap-4 p-8 text-center"
              >
                <span className="eg-generator-empty-icon flex size-16 items-center justify-center rounded-2xl">
                  <Video aria-hidden className="size-8" />
                </span>
                <p className="font-semibold">{copy.uploadReference}</p>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {copy.referenceRequirements}
                </p>
              </label>
            )}
            {showWork ? (
              workUrl ? (
                <video
                  data-testid="work-video"
                  src={workUrl || undefined}
                  poster={selected.image}
                  autoPlay
                  loop
                  muted={muted}
                  playsInline
                  onLoadedMetadata={(event) => {
                    const { videoWidth: width, videoHeight: height } =
                      event.currentTarget;
                    setWorkDimensions({ url: workUrl, width, height });
                    fitMedia(width, height);
                  }}
                  className="absolute inset-0 size-full object-contain"
                />
              ) : (
                <div
                  data-testid="work-state"
                  role="status"
                  className="relative z-10 flex flex-col items-center gap-3 p-6 text-center text-sm text-white"
                >
                  {running ? <Loader2 className="size-7 animate-spin" /> : null}
                  {taskQuery.isError ? (
                    <>
                      <span>{taskQuery.error.message}</span>
                      <button
                        type="button"
                        className="rounded-lg border border-white/30 px-4 py-2"
                        onClick={() => taskQuery.refetch()}
                      >
                        {copy.retry}
                      </button>
                    </>
                  ) : task?.status === 'failed' ? (
                    failureMessage(task.error)
                  ) : task?.status === 'canceled' ? (
                    copy.ui.generationCanceled
                  ) : running ? (
                    copy.generatingTitle
                  ) : (
                    copy.ui.noGeneratedVideo
                  )}
                </div>
              )
            ) : sample ? (
              <video
                key={sample.clip}
                data-testid="sample-video"
                src={sample.clip}
                poster={sample.poster}
                autoPlay
                loop
                muted={muted}
                playsInline
                onLoadedMetadata={(event) =>
                  fitMedia(
                    event.currentTarget.videoWidth,
                    event.currentTarget.videoHeight
                  )
                }
                className="absolute inset-0 size-full object-contain"
              />
            ) : showCompare ? (
              <BeforeAfterVideo
                before={{
                  src: effectPreviewSrc ?? effectClip,
                  poster: example.image,
                }}
                after={{
                  src: `${effectResult}.mp4`,
                  poster: `${effectResult}.jpg`,
                }}
                labels={copy.compare}
                width={1280}
                height={720}
                muted={muted}
                className="absolute inset-0 size-full rounded-none"
              />
            ) : (
              <video
                key={
                  referenceSource === 'upload'
                    ? referenceVideo?.preview
                    : (effectPreviewSrc ?? effectClip)
                }
                data-testid="reference-video"
                src={
                  referenceSource === 'upload'
                    ? referenceVideo?.preview
                    : effectPreviewSrc
                }
                poster={
                  referenceSource === 'upload' ? undefined : example.image
                }
                autoPlay
                loop
                muted={muted}
                playsInline
                onLoadedMetadata={(event) =>
                  fitMedia(
                    event.currentTarget.videoWidth,
                    event.currentTarget.videoHeight
                  )
                }
                className="absolute inset-0 size-full object-contain"
              />
            )}
            <button
              type="button"
              aria-label={muted ? 'Unmute' : 'Mute'}
              className="hover:bg-primary hover:text-primary-foreground absolute right-3 bottom-3 flex size-9 items-center justify-center rounded-full bg-black/70 text-white backdrop-blur transition"
              onClick={() => setMuted((value) => !value)}
            >
              {muted ? (
                <VolumeX className="size-4" />
              ) : (
                <Volume2 className="size-4" />
              )}
            </button>
            {sample && (
              <span className="absolute top-3 left-3 rounded-full bg-black/70 px-2.5 py-1 text-xs text-white backdrop-blur">
                {theme?.sampleLabel} · {sample.name}
              </span>
            )}
            {(showWork || referenceSource === 'upload') && (
              <span className="absolute top-3 left-3 rounded-full bg-black/70 px-2.5 py-1 text-xs text-white backdrop-blur">
                {showWork
                  ? task?.referenceName || copy.generatedVideo
                  : copy.customReference}{' '}
                · {showWork ? 'work' : copy.uploadReference}
              </span>
            )}
            {showWork && task && isDone(task) && (
              <button
                type="button"
                data-testid="close-work"
                aria-label={copy.ui.closeVideo}
                title={copy.ui.closeVideo}
                onClick={() => {
                  // The result stays in My videos; this only clears the panel.
                  if (user)
                    sessionStorage.removeItem(`genjutsu-task:${user.id}`);
                  sessionStorage.removeItem(submissionStorageKey);
                  setTaskId(undefined);
                  setPreviewMode('example');
                }}
                className="hover:bg-destructive absolute top-3 right-3 z-10 flex size-8 items-center justify-center rounded-full bg-black/70 text-white backdrop-blur transition-colors"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            )}
            {showWork &&
            task?.status === 'success' &&
            task.url &&
            !task.archivePending ? (
              <button
                type="button"
                disabled={downloadMutation.isPending}
                onClick={() => downloadMutation.mutate(task.id)}
                className="hover:bg-primary absolute bottom-3 left-3 inline-flex items-center gap-2 rounded-full bg-black/70 px-3 py-2 text-xs text-white backdrop-blur transition"
              >
                {downloadMutation.isPending ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Download className="size-3.5" />
                )}{' '}
                {copy.ui.download}
              </button>
            ) : null}
            {showWork && workRatioMismatch && (
              <p
                role="alert"
                className="absolute top-12 right-3 left-3 rounded-lg bg-black/80 p-2 text-xs text-white"
              >
                {copy.priorRatioMismatch(
                  workDimensions!.width,
                  workDimensions!.height,
                  task!.aspect!
                )}
              </p>
            )}
            {showWork && task?.archivePending ? (
              <p
                role="status"
                className="absolute top-12 right-3 left-3 rounded-lg bg-black/80 p-2 text-xs text-white"
              >
                {copy.archivePending}
              </p>
            ) : null}
            {videoJob ? (
              <div
                role="status"
                className="absolute inset-0 z-30 flex items-center justify-center overflow-hidden"
              >
                <video
                  src={videoJob}
                  autoPlay
                  loop
                  muted
                  playsInline
                  aria-hidden="true"
                  className="absolute inset-0 size-full scale-110 object-cover opacity-70 blur-2xl"
                />
                <div className="absolute inset-0 bg-black/45" />
                <ProgressPanel
                  onMedia
                  icon={<Video className="size-5" />}
                  title={
                    trimProgress === undefined
                      ? copy.videoReading
                      : copy.videoPreparing
                  }
                  percent={trimProgress}
                />
              </div>
            ) : failure ? (
              <div
                role="alert"
                data-testid="generation-failure"
                className="absolute inset-0 z-30 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
              >
                <button
                  type="button"
                  aria-label={copy.ui.dismiss}
                  onClick={() => setFailure(undefined)}
                  className="absolute top-3 right-3 flex size-8 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
                <div className="flex w-full max-w-md flex-col items-center gap-3 text-center text-white">
                  <span className="bg-destructive/20 text-destructive ring-destructive/50 flex size-12 items-center justify-center rounded-full ring-1">
                    <AlertTriangle className="size-6" aria-hidden="true" />
                  </span>
                  <p className="text-base font-semibold sm:text-lg">
                    {copy.failedTitle}
                  </p>
                  <p className="text-sm leading-relaxed text-white/80">
                    {failure.message}
                  </p>
                  {failure.retryable && (
                    <button
                      type="button"
                      disabled={generateDisabled}
                      onClick={startGeneration}
                      className="bg-primary text-primary-foreground mt-1 inline-flex h-10 items-center justify-center gap-1.5 rounded-xl px-5 text-sm font-semibold disabled:opacity-50"
                    >
                      <Sparkles className="size-4" aria-hidden="true" />
                      {copy.retry}
                    </button>
                  )}
                </div>
              </div>
            ) : generatingView ? (
              <div
                role="status"
                className="bg-muted absolute inset-0 z-30 flex items-center justify-center"
              >
                <ProgressPanel
                  icon={<Sparkles className="size-5 animate-pulse" />}
                  title={copy.generatingTitle}
                  hint={
                    preparingMedia
                      ? copy.generatingPreparing
                      : copy.generatingEta('3–6')
                  }
                  percent={generatingPercent}
                />
              </div>
            ) : null}
          </div>
        </section>
      </div>

      {generatorVisible && !createVisible && !paywall && (
        <div className="border-border bg-background/95 fixed inset-x-0 bottom-0 z-40 border-t px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur lg:hidden">
          {!lead ? (
            <button
              type="button"
              disabled={leadDisabled}
              onClick={() => {
                track('sticky_cta', { action: 'upload' });
                document
                  .querySelector<HTMLInputElement>(
                    '[data-testid="upload-lead"]'
                  )
                  ?.click();
              }}
              className="bg-primary text-primary-foreground inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl text-base font-semibold disabled:opacity-50"
            >
              <ImageIcon className="size-5" />
              {copy.uploadPhotoCta}
            </button>
          ) : (
            <div className="flex flex-col gap-1.5">
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={generateDisabled}
                  onClick={startGeneration}
                  className="bg-primary text-primary-foreground inline-flex h-12 flex-1 items-center justify-center gap-1.5 rounded-xl text-base font-semibold disabled:opacity-50"
                >
                  {running ? (
                    <Loader2 className="size-5 animate-spin" />
                  ) : (
                    <Sparkles className="size-5" />
                  )}
                  {running
                    ? copy.generatingTitle
                    : (theme?.generate ?? copy.ui.generateNow)}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <Dialog
        open={paywall}
        onOpenChange={(open) => {
          if (!open) track('paywall_closed');
          setPaywall(open);
        }}
      >
        <DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] overflow-y-auto p-5 sm:max-w-[40rem] sm:p-8">
          <Pricing
            variant="dialog"
            beforeCheckout={async () => {
              const current = await readinessQuery.refetch();
              if (current.isError || !current.data?.ready)
                throw new Error(copy.serviceUnavailable);
              // The draft only restores media after checkout returns; a failed
              // save must not block payment.
              await persistDraft().catch((error) => {
                trackDraftError('draft_checkout', error);
                toast.warning(copy.ui.saveMediaCheckout);
              });
            }}
            clipSeconds={referenceVideo?.duration || durationTier}
            balanceCredits={creditsQuery.data?.balance || 0}
            title={copy.paywallTitle}
            description={
              creditsQuery.data?.hasPaidOrder
                ? copy.paywallTopUp
                : copy.paywallFirst
            }
            summary={
              // The visitor's own inputs — what they already invested, and
              // what the purchase turns them into.
              <div
                aria-hidden="true"
                className="mb-5 flex items-start justify-center gap-2 sm:gap-3"
              >
                <figure className="flex flex-col items-center gap-1.5">
                  {referenceSource === 'effect' ? (
                    <video
                      src={effectPreviewSrc ?? effectClip}
                      poster={selected.image}
                      autoPlay
                      loop
                      muted
                      playsInline
                      className="size-20 rounded-xl bg-black object-cover sm:size-24"
                    />
                  ) : referenceVideo?.preview ? (
                    <video
                      src={referenceVideo.preview}
                      autoPlay
                      loop
                      muted
                      playsInline
                      className="size-20 rounded-xl bg-black object-cover sm:size-24"
                    />
                  ) : (
                    <span className="bg-muted size-20 rounded-xl sm:size-24" />
                  )}
                  <figcaption className="text-muted-foreground text-[11px]">
                    {copy.summaryMotion}
                  </figcaption>
                </figure>
                <Plus className="text-muted-foreground mt-8 size-4 shrink-0 sm:mt-10" />
                <figure className="flex flex-col items-center gap-1.5">
                  {lead?.preview ? (
                    <img
                      src={lead.preview}
                      alt=""
                      className="size-20 rounded-xl object-cover sm:size-24"
                    />
                  ) : (
                    <span className="bg-muted size-20 rounded-xl sm:size-24" />
                  )}
                  <figcaption className="text-muted-foreground text-[11px]">
                    {copy.summaryPhoto}
                  </figcaption>
                </figure>
                <ArrowRight className="text-primary mt-8 size-4 shrink-0 sm:mt-10" />
                <figure className="flex flex-col items-center gap-1.5">
                  <span className="border-primary/60 bg-primary/10 text-primary flex size-20 items-center justify-center rounded-xl border border-dashed sm:size-24">
                    <Sparkles className="size-6" />
                  </span>
                  <figcaption className="text-primary text-[11px] font-medium">
                    {copy.yourVideo}
                  </figcaption>
                </figure>
              </div>
            }
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
