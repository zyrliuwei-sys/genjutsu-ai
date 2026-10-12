import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Check,
  ChevronDown,
  Download,
  Eye,
  ImageIcon,
  Loader2,
  Sparkles,
  Upload,
  Video,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

import { signIn, useSession } from '@/core/auth/client';
import { useRouter } from '@/core/i18n/navigation';
import {
  GENJUTSU_ASPECTS,
  GENJUTSU_CREDITS_PER_GENERATION,
  GENJUTSU_DIRECTIONS,
  genjutsuCredits,
  genjutsuGenerations,
  type GenjutsuAspect,
  type GenjutsuReadiness,
} from '@/config/genjutsu';
import { REFERENCE_VIDEOS } from '@/config/reference-videos';
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
import { captureVideoFrame } from '@/lib/video-frame';
import { MAX_REFERENCE_VIDEO_MB } from '@/lib/video-trim-plan';
import { Pricing } from '@/blocks/pricing';
import { Dialog, DialogContent } from '@/components/ui/dialog';

type Template = {
  id: string;
  name: string;
  image: string;
  video: string;
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

type FreePreview = {
  status: 'processing' | 'success' | 'failed';
  url: string | null;
  aspect: string;
};

const PREVIEW_ERRORS = [
  'PREVIEW_USED',
  'PREVIEW_BUSY',
  'PREVIEW_UNAVAILABLE',
  'PREVIEW_GOOGLE_ONLY',
];

type GenjutsuTask = {
  id: string;
  status: 'pending' | 'processing' | 'success' | 'failed' | 'canceled';
  url: string | null;
  error: string | null;
  archivePending?: boolean;
  aspect?: string;
  referenceName?: string;
};

const ART = REFERENCE_VIDEOS;

const TEMPLATE_NAMES = [
  'Genjutsu STORM',
  'Smalltown Boy',
  'Burning Bridges',
  'Thriller Dance',
  'Alors On Danse',
  'Toc Toc',
  'Knight Cat',
  'Knight Cat & Gym Bro',
  'Car Dance Duo',
  'Hotel Lobby',
  'Rumpelstiltskin',
  'Clapping Cat',
  'Gas Station Dance',
  'Car Jump',
  'Vikas Edit',
  'Turn the Lights Off',
  'Cheba Man',
  'Raindance',
  'Zombie Love Story',
] as const;

const TEMPLATE_META = [
  ['28', '16:9 / 4:3 / 9:16', 'Trending'],
  ['22', '9:16', 'Trending'],
  ['18', '16:9', 'Trending'],
  ['21', '9:16', 'New'],
  ['20', '16:9 / 9:16', 'Trending'],
  ['11', '9:16', 'Trending'],
  ['5', '9:16', 'New'],
  ['9', '4:3', 'New'],
  ['15', '16:9', 'New'],
  ['15', '16:9', 'New'],
  ['15', '16:9', 'Trending'],
  ['11', '9:16', 'New'],
  ['18', '9:16', 'Trending'],
  ['12', '9:16', 'New'],
  ['28', '1:1', 'New'],
  ['11', '16:9', 'New'],
  ['15', '9:16', 'New'],
  ['15', '16:9 / 4:3 / 9:16', undefined],
  ['15', '9:16 / 16:9', undefined],
] as const;

const TEMPLATE_PROMPTS = [
  'Turn the reference performance into a storm-lit Genjutsu reality with dramatic wind, rain, practical light streaks, and a controlled cinematic push-in.',
  'Keep the exact motion and camera timing while rebuilding the scene as a quiet small-town night with natural street light and restrained film grain.',
  'Preserve the source choreography and transform the environment into a tense cinematic bridge at dusk with wet surfaces and deep atmospheric contrast.',
  'Maintain every dance beat and camera move, restaging the performance as a high-contrast monochrome music video with crisp silhouette separation.',
  'Keep the original performance locked to the timeline and shift the world into an energetic European dance-film look with bold color and clean motion.',
  'Preserve the subject identity and timing while adding a playful close-up reaction, expressive lighting, and a polished short-form comedy finish.',
  'Keep the action unchanged and transform the character into a small armored cat hero in a miniature cinematic world with believable scale.',
  'Preserve the two performers and camera path while creating a clean gym-bro transformation with punchy lighting and stable anatomy.',
  'Keep the vehicle, choreography, and camera timing coherent while turning the source into a stylized car-dance sequence with controlled reflections.',
  'Preserve the motion and framing while rebuilding the environment as a warm hotel lobby with elegant practical lights and premium commercial polish.',
  'Keep the source movement and subject identity while transforming the world into a dark fairytale with theatrical shadows and subtle magic.',
  'Maintain the original timing and camera motion while turning the main subject into a charming clapping cat with clean paws and no flicker.',
  'Preserve the source choreography while restaging it at a cinematic gas station at night with reflective pavement and practical neon accents.',
  'Keep the original motion and camera path while creating a believable airborne car jump with controlled dust, scale, and cinematic impact.',
  'Preserve the exact edit rhythm and transform the subject into a polished creator-style fashion sequence with confident color grading.',
  'Keep movement, framing, and timing fixed while shifting the scene into a dramatic lights-off reveal with a precise final beat.',
  'Preserve the performance and create a playful surreal character treatment with stable facial identity, soft shadows, and editorial timing.',
  'Keep the original motion and restage the scene as a rain-driven cinematic performance with wet highlights, atmospheric depth, and natural physics.',
  'Preserve the source performance while creating a tender cinematic zombie love story with restrained makeup, soft moonlight, and stable expressions.',
] as const;

const TEMPLATE_CANDIDATES: Template[] = TEMPLATE_NAMES.map((name, index) => {
  const art = ART[index % ART.length];
  const meta = TEMPLATE_META[index];
  return {
    id: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    name,
    image: art.image,
    video: art.video,
    duration: art.duration,
    ratios: art.ratios,
    tag: meta[2] as Template['tag'],
    prompt: TEMPLATE_PROMPTS[index],
  };
});

// Original third-party reference clips; provenance is recorded alongside assets.
// Keep generation directions and the other effects unchanged.
const REFERENCE_EXAMPLES: Record<
  string,
  { asset: string; duration: number; prompt: string }
> = {
  'genjutsu-storm': {
    asset: 'crowd',
    duration: 14,
    prompt:
      'Keep the central performer still and use the reference image for their appearance. Introduce identical copies in separate rows behind them, performing a synchronized arm raise. Preserve the source camera path, timing and realistic physical scale. Blue-hour cinematic lighting, clean silhouettes, consistent faces and wardrobe, no overlapping bodies or extra limbs.',
  },
  'alors-on-danse': {
    asset: 'dream',
    duration: 9,
    prompt:
      'Preserve the source performance, camera movement and timing. Use the reference image for the main character and seamlessly transform the surroundings into a dreamlike island above pastel clouds with giant sculptural flowers and floating lanterns. Photoreal skin and fabric, grounded feet, soft moonlight, stable identity and fluid motion, no cartoon rendering or flicker.',
  },
  raindance: {
    asset: 'motion',
    duration: 10,
    prompt:
      'Preserve the source choreography, camera movement and timing. Use the reference image for the main character and transform the surroundings into a rain-soaked Tokyo street at night with red and cyan practical lighting reflected in puddles. Natural rain, realistic shadows and skin, coherent silhouettes, stable face and clothing, no extra limbs or flicker.',
  },
};

for (const template of TEMPLATE_CANDIDATES) {
  const sample = REFERENCE_EXAMPLES[template.id];
  if (!sample) continue;
  template.image = `/videos/higgsfield-reference/${sample.asset}.webp`;
  template.video = `/videos/higgsfield-reference/${sample.asset}.mp4`;
  template.duration = sample.duration;
  template.ratios = '16:9';
  template.prompt = sample.prompt;
}

// A source clip appears only once in Select Effect, even if multiple names
// were previously mapped to it. Keep the first card's existing copy.
const seenVideos = new Set<string>();
const TEMPLATES = TEMPLATE_CANDIDATES.filter((template) => {
  if (seenVideos.has(template.video)) return false;
  seenVideos.add(template.video);
  return true;
});
for (const template of TEMPLATES) {
  const assetId = template.video.split('/').pop()?.replace('.mp4', '');
  if (assetId && GENJUTSU_DIRECTIONS[assetId])
    template.prompt = GENJUTSU_DIRECTIONS[assetId];
}

const isDone = (task?: GenjutsuTask) =>
  task?.status === 'success' ||
  task?.status === 'failed' ||
  task?.status === 'canceled';

const RESUME_KEY = 'genjutsu-resume-after-signin';

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
  testId,
  frameClassName,
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
  testId: string;
  frameClassName?: string;
}) {
  const inputId = useId();
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="flex flex-col">
        <label htmlFor={inputId} className="truncate text-sm font-medium">
          {label}
        </label>
        <span className="text-muted-foreground truncate text-xs">{hint}</span>
      </div>
      <div
        className={cn(
          'group hover:border-primary/70 border-border bg-muted relative aspect-[3/4] overflow-hidden rounded-xl border border-dashed transition-colors',
          disabled && 'opacity-70',
          frameClassName
        )}
      >
        <input
          id={inputId}
          aria-label={kind === 'video' ? 'Upload video' : 'Upload photo'}
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
              <span className="bg-primary/15 text-primary ring-primary/40 relative flex size-11 items-center justify-center rounded-full ring-1 transition-transform duration-300 group-hover:scale-110">
                {kind === 'video' ? (
                  <Upload className="size-5" />
                ) : (
                  <ImageIcon className="size-5" />
                )}
              </span>
              <span className="relative text-sm font-medium">
                {kind === 'video' ? 'Upload video' : 'Upload photo'}
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

export function GenjutsuGenerator({
  copy,
}: {
  copy: {
    generationCost: (count: number) => string;
    moreSettings: string;
    uploadPhotoCta: string;
    remainingGenerations: (count: number) => string;
    generationRules: string;
    legacyBalance: string;
    contentPolicy: string;
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
    preview: {
      button: string;
      hint: string;
      working: string;
      tab: string;
      cta: string;
      failed: string;
      used: string;
      busy: string;
      unavailable: string;
      googleOnly: string;
      watermark: string;
      label: string;
    };
  };
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: session, isPending: sessionPending } = useSession();
  const user = session?.user;
  const [selectedId, setSelectedId] = useState(TEMPLATES[0].id);
  const [exampleId, setExampleId] = useState(TEMPLATES[0].id);
  const [validatingMedia, setValidatingMedia] = useState(false);
  const [trimProgress, setTrimProgress] = useState<number>();
  const clipController = useRef<AbortController | undefined>(undefined);
  useEffect(() => () => clipController.current?.abort(), []);
  const [aspect, setAspect] = useState<GenjutsuAspect>('16:9');
  const [durationTier, setDurationTier] = useState<5 | 10>(5);
  const [lead, setLead] = useState<Asset>();
  const [referenceVideo, setReferenceVideo] = useState<Asset>();
  const [referenceClosed, setReferenceClosed] = useState(false);
  const [referenceSource, setReferenceSource] = useState<'effect' | 'upload'>(
    'effect'
  );
  const referenceInputId = useId();
  const [taskId, setTaskId] = useState<string>();
  const [previewMode, setPreviewMode] = useState<'example' | 'work' | 'still'>(
    'example'
  );
  const [muted, setMuted] = useState(true);
  const [paywall, setPaywall] = useState(false);
  // Phones only: length, size and own-video upload sit behind a toggle.
  const [moreOpen, setMoreOpen] = useState(false);
  // Phones size the preview box to the media shown, so 16:9 clips get no bars.
  const [mediaRatio, setMediaRatio] = useState(16 / 9);
  const fitMedia = (width: number, height: number) => {
    if (width && height) setMediaRatio(width / height);
  };
  const generatorRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLElement>(null);
  const [generatorVisible, setGeneratorVisible] = useState(false);
  useEffect(() => track('create_view'), []);
  useEffect(() => {
    const node = generatorRef.current;
    if (!node || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(([entry]) =>
      setGeneratorVisible(entry.isIntersecting)
    );
    observer.observe(node);
    return () => observer.disconnect();
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
          return {
            ...asset,
            uploading: false,
            preview: asset.file ? URL.createObjectURL(asset.file) : asset.url!,
          };
        };
        setLead(restore(draft?.lead));
        setReferenceVideo(restore(draft?.referenceVideo));
        setReferenceClosed(draft?.referenceClosed === true);
        setReferenceSource(
          draft?.referenceSource === 'upload' ? 'upload' : 'effect'
        );
        setDurationTier(draft?.durationTier === 10 ? 10 : 5);
        if (draft && TEMPLATES.some((t) => t.id === draft.selectedId)) {
          setSelectedId(draft.selectedId);
          setExampleId(draft.selectedId);
        }
        if (draft && GENJUTSU_ASPECTS.includes(draft.aspect as GenjutsuAspect))
          setAspect(draft.aspect as GenjutsuAspect);
      })
      .catch(() => {
        if (active) {
          setLead(undefined);
          setReferenceVideo(undefined);
          toast.error('Could not restore saved media');
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
  }, [sessionPending, user?.id]);

  function persistDraft() {
    if (!draftReady || draftOwner !== (user?.id || 'anonymous'))
      return Promise.reject(new Error('Wait for media recovery to finish'));
    const store = (asset?: Asset): DraftAsset | undefined =>
      asset && {
        kind: asset.kind,
        file: asset.file,
        sourceFile: asset.sourceFile,
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
      savedAt: Date.now(),
    });
  }
  useEffect(() => {
    if (
      !draftReady ||
      sessionPending ||
      draftOwner !== (user?.id || 'anonymous')
    )
      return;
    // A committed binary save is required before the checkout dialog opens.
    // Autosave also covers ordinary navigation and reloads.
    void persistDraft().catch(() =>
      toast.error('Could not save media for your return')
    );
  }, [
    draftReady,
    draftOwner,
    sessionPending,
    user?.id,
    lead,
    referenceVideo,
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

  const selected = useMemo(
    () =>
      TEMPLATES.find((template) => template.id === selectedId) ?? TEMPLATES[0],
    [selectedId]
  );
  const example =
    TEMPLATES.find((template) => template.id === exampleId) ?? TEMPLATES[0];
  const effectAssetId = selected.video.split('/').pop()!.replace('.mp4', '');
  const effectClip = `/videos/effect-clips/${effectAssetId}-${durationTier}s.mp4`;
  const effectQuery = useQuery({
    queryKey: ['effect-clip', effectClip],
    enabled: draftReady && !referenceClosed && referenceSource === 'effect',
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
  }, [
    effectQuery.data,
    draftReady,
    effectClip,
    referenceClosed,
    referenceSource,
  ]);
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
  const previewKey = ['genjutsu-preview', user?.id ?? 'anonymous'];
  const previewQuery = useQuery({
    queryKey: previewKey,
    enabled: !sessionPending,
    queryFn: () =>
      apiGet<{ eligible: boolean; preview: FreePreview | null }>(
        '/api/genjutsu/preview'
      ),
    refetchInterval: (query) =>
      query.state.data?.preview?.status === 'processing' ? 3000 : false,
  });
  const freePreview =
    previewQuery.data?.preview?.status === 'failed'
      ? null
      : (previewQuery.data?.preview ?? null);
  const previewStatus = useRef<string | undefined>(undefined);
  useEffect(() => {
    const status = previewQuery.data?.preview?.status;
    if (previewStatus.current === 'processing' && status === 'success')
      track('preview_ready');
    if (previewStatus.current === 'processing' && status === 'failed') {
      track('preview_failed');
      toast.error(copy.preview.failed);
    }
    previewStatus.current = status;
  }, [previewQuery.data?.preview?.status]);
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
      toast.error('Only image files are supported');
      return;
    }
    if (type === 'video' && !isVideo) {
      toast.error('Only video files are supported');
      return;
    }
    const maxMB = isVideo ? MAX_REFERENCE_VIDEO_MB : 10;
    const maxBytes = maxMB * 1024 * 1024;
    if (file.size > maxBytes) {
      toast.error(`File exceeds the ${maxMB}MB limit`);
      return;
    }

    let preview = URL.createObjectURL(file);
    const controller = new AbortController();
    clipController.current = controller;
    setValidatingMedia(true);
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
        throw new Error(
          'Character image must be at least 300×300px with a supported aspect ratio'
        );
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
        setDurationTier(tier);
        const sourceRatio = metadata.width / metadata.height;
        const closest = [...(readiness?.aspects || GENJUTSU_ASPECTS)].sort(
          (a, b) => {
            const ratio = (value: string) => {
              const [w, h] = value.split(':').map(Number);
              return w / h;
            };
            return (
              Math.abs(ratio(a) - sourceRatio) -
              Math.abs(ratio(b) - sourceRatio)
            );
          }
        )[0];
        if (closest && !preserveAspect) setAspect(closest);
        setPreviewMode('example');
      }
    } catch (error) {
      URL.revokeObjectURL(preview);
      if (!controller.signal.aborted)
        toast.error(error instanceof Error ? error.message : 'Invalid media');
    } finally {
      if (clipController.current === controller)
        clipController.current = undefined;
      setValidatingMedia(false);
      setTrimProgress(undefined);
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

  const previewMutation = useMutation({
    mutationFn: async () => {
      if (!assetIsReady(lead) || !assetIsReady(referenceVideo))
        throw new Error('Upload a main character image and a reference video');
      const frameFile = await captureVideoFrame(referenceVideo!.preview);
      const leadUpload = await uploadAsset(lead!);
      if (leadUpload.url !== lead!.url) {
        const uploaded = lead!;
        setLead((current) =>
          current?.preview === uploaded.preview
            ? { ...current, url: leadUpload.url }
            : current
        );
        // The image upload endpoint allows one upload per second.
        await new Promise((resolve) => setTimeout(resolve, 1100));
      }
      const frame = await apiUpload<{ urls: string[] }>(
        '/api/storage/upload-image',
        frameFile
      );
      if (!frame.urls[0]?.startsWith('https://'))
        throw new Error(copy.serviceUnavailable);
      return apiPost<{ preview: FreePreview }>('/api/genjutsu/preview', {
        leadImage: leadUpload.url,
        frameImage: frame.urls[0],
        aspect,
        templateId: referenceSource === 'effect' ? selected.id : undefined,
      });
    },
    onSuccess: ({ preview }) => {
      queryClient.setQueryData(previewKey, { eligible: false, preview });
      setPreviewMode('still');
      revealResult();
    },
    onError: (error: Error) => {
      const known: Record<string, string> = {
        PREVIEW_USED: copy.preview.used,
        PREVIEW_BUSY: copy.preview.busy,
        PREVIEW_UNAVAILABLE: copy.preview.unavailable,
        PREVIEW_GOOGLE_ONLY: copy.preview.googleOnly,
        PREVIEW_FAILED: copy.preview.failed,
      };
      toast.error(known[error.message] || error.message);
      if (PREVIEW_ERRORS.includes(error.message))
        queryClient.invalidateQueries({ queryKey: previewKey });
    },
  });

  async function startPreview() {
    track('preview_click', { signedIn: Boolean(user) });
    if (!user) {
      try {
        await persistDraft();
      } catch {
        toast.error('Could not save media for your return');
        return;
      }
      sessionStorage.setItem(RESUME_KEY, 'preview');
      // Free previews are Google-only, so skip the generic sign-in page.
      try {
        await signIn.social({ provider: 'google', callbackURL: '/create' });
      } catch {
        router.push(`/sign-in?callbackUrl=${encodeURIComponent('/create')}`);
      }
      return;
    }
    previewMutation.mutate();
  }

  const generate = useMutation({
    mutationFn: async () => {
      if (!lead || !referenceVideo)
        throw new Error('Upload a main character image and a reference video');
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
        throw new Error('This API does not support the selected video size');
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
      const signature = JSON.stringify([leadImage, videoUrl, aspect]);
      let submission: { signature: string; requestId: string } | undefined;
      try {
        submission = JSON.parse(
          sessionStorage.getItem(submissionStorageKey) || 'null'
        );
      } catch {
        /* New submission. */
      }
      if (!submission || submission.signature !== signature) {
        submission = { signature, requestId: crypto.randomUUID() };
        sessionStorage.setItem(
          submissionStorageKey,
          JSON.stringify(submission)
        );
      }
      return apiPost<GenjutsuTask>('/api/genjutsu/generate', {
        requestId: submission.requestId,
        aspect,
        templateId: referenceSource === 'effect' ? selected.id : undefined,
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
      } else toast.error(error.message);
    },
  });

  const failureMessage = (error?: string | null) =>
    error?.startsWith('Content policy violation')
      ? copy.contentPolicy
      : error || 'Generation failed';

  useEffect(() => {
    if (!task || !isDone(task)) return;
    sessionStorage.removeItem(submissionStorageKey);
    queryClient.invalidateQueries({ queryKey: ['credits'] });
    if (task.status === 'failed') toast.error(failureMessage(task.error));
  }, [queryClient, task]);

  const running = generate.isPending || Boolean(taskId && !isDone(task));
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
    !validatingMedia;

  async function startGeneration() {
    if (
      referenceSource === 'effect' &&
      !referenceClosed &&
      (effectQuery.isFetching || effectQuery.isError || !effectQuery.data)
    ) {
      toast.error('Wait for the selected reference video to load');
      return;
    }
    track('generate_click', {
      signedIn: Boolean(user),
      leadReady: assetIsReady(lead),
      referenceReady: assetIsReady(referenceVideo),
    });
    setSavingDraft(true);
    try {
      await persistDraft();
    } catch {
      toast.error('Could not save media for your return');
      return;
    } finally {
      setSavingDraft(false);
    }
    if (!user) {
      if (assetIsReady(lead) && assetIsReady(referenceVideo))
        sessionStorage.setItem(RESUME_KEY, 'generate');
      track('signin_redirect');
      router.push(`/sign-in?callbackUrl=${encodeURIComponent('/create')}`);
      return;
    }
    if (!assetIsReady(lead) || !assetIsReady(referenceVideo)) {
      toast.error('Upload a main character image and a reference video');
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
        throw new Error('This API does not support the selected video size');
      const credits = await creditsQuery.refetch();
      if (credits.isError || !credits.data)
        throw new Error('Could not verify your balance. Please retry.');
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
      toast.error(
        error instanceof Error ? error.message : copy.serviceUnavailable
      );
    } finally {
      setCheckingGeneration(false);
    }
  }

  // The visitor clicked Generate before signing in: once the saved draft is
  // restored under their account, continue straight to the balance check
  // (paywall or generation) instead of making them click again.
  // Same for a free preview requested while signed out.
  const resumed = useRef(false);
  useEffect(() => {
    if (resumed.current || !user || !canGenerate || !previewQuery.data) return;
    if (!assetIsReady(lead) || !assetIsReady(referenceVideo)) return;
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
    if (pending !== 'preview') void startGeneration();
    else if (previewQuery.data.eligible) previewMutation.mutate();
    else if (previewQuery.data.preview) setPreviewMode('still');
    else toast.error(copy.preview.googleOnly);
  });

  const workUrl = task?.status === 'success' ? task.url : null;
  const showWork = previewMode === 'work';
  const showStill = previewMode === 'still' && Boolean(freePreview);
  const canPreview = Boolean(previewQuery.data?.eligible) && !freePreview;
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
    validatingMedia ||
    savingDraft;
  const previewDisabled =
    !canGenerate ||
    previewMutation.isPending ||
    referenceClosed ||
    !lead ||
    !referenceVideo;
  const generateDisabled =
    !canGenerate ||
    (referenceSource === 'effect' &&
      (effectQuery.isFetching || effectQuery.isError || !effectQuery.data)) ||
    referenceClosed ||
    !referenceVideo;
  // Phones show only the photo slot while a built-in effect clip is in use.
  const compactReference =
    !moreOpen && referenceSource === 'effect' && !referenceClosed;

  return (
    <>
      <div
        ref={generatorRef}
        id="generator"
        className="border-border bg-muted text-foreground grid scroll-mt-24 gap-3 rounded-3xl border p-3 max-lg:pb-24 lg:grid-cols-[300px_minmax(0,340px)_minmax(0,1fr)]"
      >
        <section
          id="genjutsu-upload"
          aria-label="Create"
          className="bg-card order-3 flex min-h-0 scroll-mt-24 flex-col gap-4 rounded-2xl p-4 lg:order-1"
        >
          <h2 className="text-lg font-semibold max-lg:hidden">AI Effects</h2>
          <div
            className={cn(
              'grid grid-cols-2 gap-2',
              compactReference && 'max-lg:grid-cols-1'
            )}
          >
            <div
              className={cn(
                'flex flex-col gap-2',
                compactReference && 'max-lg:hidden'
              )}
            >
              <div className="flex flex-col">
                <label
                  htmlFor={referenceInputId}
                  className="text-sm font-medium"
                >
                  Reference video
                </label>
                <span className="text-muted-foreground text-xs">
                  {referenceSource === 'upload'
                    ? copy.customReference
                    : selected.name}
                </span>
              </div>
              <div
                data-testid="selected-reference-video"
                className="border-border bg-muted relative aspect-[3/4] overflow-hidden rounded-xl border"
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
                (referenceSource === 'upload' && !referenceVideo) ? (
                  <div
                    data-testid="reference-video-empty"
                    className="flex size-full flex-col items-center justify-center gap-3 p-3 text-center"
                  >
                    <span className="bg-primary/15 text-primary ring-primary/40 relative flex size-11 items-center justify-center rounded-full ring-1">
                      <Video className="size-5" aria-hidden="true" />
                    </span>
                    <span className="text-sm font-medium">
                      {copy.uploadReference}
                    </span>
                    <span className="text-muted-foreground text-[11px]">
                      {copy.referenceEmpty}
                    </span>
                  </div>
                ) : referenceSource === 'effect' ? (
                  <video
                    key={effectClip}
                    data-testid="selected-reference-preview"
                    src={effectClip}
                    poster={selected.image}
                    preload="metadata"
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="absolute inset-0 size-full object-cover"
                  />
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
                  (referenceVideo || referenceSource === 'effect') && (
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
              {trimProgress !== undefined && (
                <p
                  role="status"
                  data-testid="video-trim-status"
                  className="text-primary flex items-center gap-2 text-xs"
                >
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  {copy.trimming(trimProgress)}
                </p>
              )}
              {referenceSource === 'upload' &&
                referenceVideo?.sourceDuration &&
                !validatingMedia && (
                  <p
                    data-testid="video-trim-range"
                    className="text-muted-foreground text-xs"
                  >
                    {copy.trimmedReference(
                      (referenceVideo.trimStart || 0).toFixed(2),
                      (
                        (referenceVideo.trimStart || 0) +
                        (referenceVideo.duration || 0)
                      ).toFixed(2),
                      referenceVideo.sourceDuration.toFixed(2)
                    )}
                  </p>
                )}
              {referenceSource === 'effect' &&
                !referenceClosed &&
                effectQuery.isError && (
                  <button
                    type="button"
                    onClick={() => effectQuery.refetch()}
                    className="text-destructive text-xs"
                  >
                    Could not load video. Retry
                  </button>
                )}
            </div>
            <UploadSlot
              label="Main character"
              hint="Stays still"
              kind="image"
              disabled={leadDisabled}
              accept="image/jpeg,image/png,image/webp"
              asset={lead}
              onFile={(file) => selectAsset(file, 'image', setLead)}
              onRemove={() => setLead(undefined)}
              removeLabel={copy.removePhoto}
              testId="upload-lead"
              frameClassName={
                compactReference ? 'max-lg:aspect-[4/3]' : undefined
              }
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
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-2 text-sm font-medium">Video length</legend>
              <div className="flex gap-2">
                {([5, 10] as const).map((seconds) => (
                  <button
                    type="button"
                    key={seconds}
                    data-testid={`duration-${seconds}`}
                    aria-pressed={durationTier === seconds}
                    disabled={
                      !draftReady ||
                      running ||
                      checkingGeneration ||
                      savingDraft ||
                      validatingMedia ||
                      (referenceSource === 'upload' &&
                        !!referenceVideo &&
                        !referenceVideo.sourceFile &&
                        durationTier !== seconds)
                    }
                    onClick={() => {
                      if (
                        referenceSource === 'upload' &&
                        referenceVideo?.sourceFile &&
                        durationTier !== seconds
                      ) {
                        void selectAsset(
                          referenceVideo.sourceFile,
                          'video',
                          setReferenceVideo,
                          seconds,
                          true
                        );
                        return;
                      }
                      if (
                        referenceSource === 'effect' &&
                        durationTier !== seconds
                      )
                        setReferenceVideo(undefined);
                      setDurationTier(seconds);
                    }}
                    className={cn(
                      'min-h-11 flex-1 rounded-lg border px-2 py-2 text-sm',
                      durationTier === seconds
                        ? 'border-primary bg-primary/15 text-primary'
                        : 'border-border'
                    )}
                  >
                    {seconds === 5 ? '5s' : 'Up to 10s'}
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset className="flex flex-col gap-2">
              <legend className="mb-2 text-sm font-medium">Video size</legend>
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
                        ? 'This editing API does not support this ratio'
                        : undefined
                    }
                    onClick={() => setAspect(ratio)}
                    className={cn(
                      'flex flex-1 items-center justify-center gap-2 rounded-lg border px-2 py-2 text-sm font-medium transition-colors disabled:opacity-60',
                      aspect === ratio
                        ? 'border-primary bg-primary/15 text-primary'
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
            {Boolean(
              (creditsQuery.data?.balance ?? 0) %
              GENJUTSU_CREDITS_PER_GENERATION
            ) && (
              <p className="text-muted-foreground text-[11px]">
                {copy.legacyBalance}
              </p>
            )}
            {canPreview && (
              <div className="flex flex-col gap-1.5">
                <button
                  type="button"
                  disabled={previewDisabled}
                  data-testid="preview-button"
                  className="border-primary/60 text-foreground hover:bg-primary/10 inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-xl border px-2.5 text-sm font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50"
                  onClick={startPreview}
                >
                  {previewMutation.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                  {copy.preview.button}
                </button>
              </div>
            )}
            <button
              type="button"
              disabled={generateDisabled}
              data-testid="generate-button"
              className="group/button bg-primary text-primary-foreground shadow-primary/70 hover:bg-primary/80 hover:shadow-primary inline-flex h-12 w-full shrink-0 items-center justify-center gap-1.5 rounded-xl border border-transparent px-2.5 text-base font-semibold shadow-[0_0_30px_-6px] transition-shadow outline-none disabled:pointer-events-none disabled:opacity-50"
              onClick={startGeneration}
            >
              {running ? (
                <Loader2 className="size-5 animate-spin" />
              ) : (
                <Sparkles className="size-5" />
              )}
              Generate Now
            </button>
          </div>
        </section>

        <section
          id="genjutsu-effects"
          aria-label="Select effect"
          className="bg-card @container order-2 flex min-h-0 scroll-mt-24 flex-col gap-3 rounded-2xl p-4 lg:order-2"
        >
          <h2 className="text-lg font-semibold">Select Effect</h2>
          <div className="relative lg:min-h-[calc((100cqw-1.25rem)*2+2rem)] lg:flex-1">
            <div
              data-testid="template-list"
              className="flex snap-x gap-3 overflow-x-auto overscroll-x-contain p-1 [scrollbar-color:rgb(255_255_255/0.2)_transparent] [scrollbar-width:thin] lg:absolute lg:inset-0 lg:grid lg:snap-none lg:auto-rows-max lg:grid-cols-2 lg:content-start lg:overflow-x-visible lg:overflow-y-auto lg:overscroll-contain"
            >
              {TEMPLATES.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  aria-pressed={selected.id === template.id}
                  data-testid={`template-${template.id}`}
                  className={cn(
                    'group relative aspect-[3/4] w-28 shrink-0 snap-start overflow-hidden rounded-xl text-left ring-2 transition-all disabled:cursor-not-allowed lg:w-auto',
                    selected.id === template.id
                      ? 'ring-primary'
                      : 'ring-transparent'
                  )}
                  disabled={
                    running ||
                    checkingGeneration ||
                    validatingMedia ||
                    savingDraft
                  }
                  onClick={() => {
                    track('effect_select', { effect: template.id });
                    setReferenceSource('effect');
                    setReferenceClosed(false);
                    if (
                      selectedId !== template.id ||
                      referenceSource === 'upload'
                    )
                      setReferenceVideo(undefined);
                    setSelectedId(template.id);
                    setExampleId(template.id);
                    setPreviewMode('example');
                  }}
                >
                  <img
                    src={template.image}
                    alt={`${template.name} template`}
                    loading="lazy"
                    className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <span className="absolute inset-0 bg-gradient-to-t from-neutral-950/90 via-neutral-700/50 to-neutral-400/20 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  <span className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black via-black/60 to-transparent" />
                  {template.tag ? (
                    <span className="bg-primary text-primary-foreground absolute top-2 left-2 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase">
                      {template.tag}
                    </span>
                  ) : null}
                  {selected.id === template.id ? (
                    <span className="bg-primary text-primary-foreground absolute top-2 right-2 flex size-6 items-center justify-center rounded-full">
                      <Check className="size-4" />
                    </span>
                  ) : null}
                  <span className="absolute inset-x-2 bottom-2">
                    <span className="block text-sm leading-tight font-semibold text-white drop-shadow-[0_1px_2px_rgb(0_0_0/0.9)]">
                      {template.name}
                    </span>
                    <span className="block text-[11px] text-white/70">
                      {Math.min(template.duration, durationTier)}s ·{' '}
                      {template.ratios}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section
          ref={previewRef}
          aria-label="Preview"
          className="bg-card order-1 flex min-h-0 scroll-mt-24 flex-col gap-3 rounded-2xl p-4 lg:order-3"
        >
          <div className="bg-muted flex w-fit gap-1 rounded-xl p-1">
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
              Reference Example
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
              My Work
            </button>
            {freePreview && (
              <button
                type="button"
                data-testid="preview-still"
                aria-pressed={previewMode === 'still'}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                  previewMode === 'still'
                    ? 'text-foreground bg-card shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
                onClick={() => setPreviewMode('still')}
              >
                {copy.preview.tab}
              </button>
            )}
          </div>
          <div
            style={{ '--media-ratio': mediaRatio } as React.CSSProperties}
            className="relative flex flex-1 items-center justify-center overflow-hidden rounded-xl bg-black max-lg:aspect-(--media-ratio) lg:min-h-[500px]"
          >
            <img
              src={example.image}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 size-full scale-110 object-cover opacity-50 blur-2xl"
            />
            {showStill ? (
              freePreview!.status === 'success' && freePreview!.url ? (
                <div
                  className="absolute inset-0 select-none"
                  onContextMenu={(event) => event.preventDefault()}
                >
                  <img
                    data-testid="preview-image"
                    src={freePreview!.url}
                    alt={copy.preview.tab}
                    draggable={false}
                    onLoad={(event) =>
                      fitMedia(
                        event.currentTarget.naturalWidth,
                        event.currentTarget.naturalHeight
                      )
                    }
                    className="absolute inset-0 size-full object-contain"
                  />
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 flex flex-wrap content-center items-center justify-center gap-x-10 gap-y-16 overflow-hidden"
                  >
                    {Array.from({ length: 12 }, (_, i) => (
                      <span
                        key={i}
                        className="-rotate-[24deg] text-base font-bold tracking-widest whitespace-nowrap text-white/30 drop-shadow-[0_1px_1px_rgb(0_0_0/0.5)]"
                      >
                        {copy.preview.watermark}
                      </span>
                    ))}
                  </div>
                  <div className="absolute inset-x-3 bottom-14 flex flex-col items-center gap-2">
                    <span className="rounded-full bg-black/70 px-3 py-1 text-center text-[11px] text-white/80 backdrop-blur">
                      {copy.preview.label}
                    </span>
                    <button
                      type="button"
                      data-testid="preview-cta"
                      disabled={!canGenerate}
                      onClick={() => {
                        track('preview_cta');
                        void startGeneration();
                      }}
                      className="bg-primary text-primary-foreground shadow-primary/70 inline-flex h-11 items-center gap-1.5 rounded-xl px-5 text-sm font-semibold shadow-[0_0_30px_-6px] disabled:opacity-50"
                    >
                      <Sparkles className="size-4" />
                      {copy.preview.cta}
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  role="status"
                  className="relative z-10 flex flex-col items-center gap-3 p-6 text-center text-sm text-white"
                >
                  {freePreview!.status === 'processing' ? (
                    <>
                      <Loader2 className="size-7 animate-spin" />
                      {copy.preview.working}
                    </>
                  ) : (
                    copy.preview.failed
                  )}
                </div>
              )
            ) : showWork ? (
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
                        Retry
                      </button>
                    </>
                  ) : task?.status === 'failed' ? (
                    failureMessage(task.error)
                  ) : task?.status === 'canceled' ? (
                    'Generation canceled'
                  ) : running ? (
                    'Generating…'
                  ) : (
                    'No generated video yet'
                  )}
                </div>
              )
            ) : (
              <video
                key={
                  referenceSource === 'upload'
                    ? referenceVideo?.preview
                    : effectClip
                }
                data-testid="reference-video"
                src={
                  referenceSource === 'upload'
                    ? referenceVideo?.preview
                    : effectClip
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
            {!showStill && (
              <>
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
                {(showWork || referenceSource === 'upload') && (
                  <span className="absolute top-3 left-3 rounded-full bg-black/70 px-2.5 py-1 text-xs text-white backdrop-blur">
                    {showWork
                      ? task?.referenceName || copy.generatedVideo
                      : copy.customReference}{' '}
                    · {showWork ? 'work' : copy.uploadReference}
                  </span>
                )}
              </>
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
                Download
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
          </div>
        </section>
      </div>

      {generatorVisible && !paywall && (
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
              <p className="text-muted-foreground text-center text-xs">
                {copy.generationCost(
                  Math.ceil(costCredits / GENJUTSU_CREDITS_PER_GENERATION)
                )}
              </p>
              <div className="flex gap-2">
                {canPreview && (
                  <button
                    type="button"
                    disabled={previewDisabled}
                    onClick={startPreview}
                    className="border-primary/60 inline-flex h-12 flex-1 items-center justify-center gap-1.5 rounded-xl border text-sm font-semibold disabled:opacity-50"
                  >
                    {previewMutation.isPending ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                    {copy.preview.button}
                  </button>
                )}
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
                  Generate Now
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <Dialog open={paywall} onOpenChange={setPaywall}>
        <DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] overflow-y-auto p-5 sm:max-w-6xl sm:p-8">
          <Pricing
            variant="dialog"
            beforeCheckout={async () => {
              const current = await readinessQuery.refetch();
              if (current.isError || !current.data?.ready)
                throw new Error(copy.serviceUnavailable);
              await persistDraft();
            }}
            clipSeconds={referenceVideo?.duration || durationTier}
            balanceCredits={creditsQuery.data?.balance || 0}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
