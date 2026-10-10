import { useEffect, useId, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Check,
  Download,
  ImageIcon,
  Loader2,
  Sparkles,
  Upload,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { toast } from 'sonner';

import { useSession } from '@/core/auth/client';
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
import { apiGet, apiPost, apiUpload } from '@/lib/api-client';
import {
  loadGenjutsuDraft,
  saveGenjutsuDraft,
  type DraftAsset,
} from '@/lib/genjutsu-draft';
import { readMediaMetadata } from '@/lib/media-metadata';
import { cn } from '@/lib/utils';
import { useUserPermissions } from '@/hooks/use-user-permissions';
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

const SAMPLE_PLAYLIST = [
  'genjutsu-storm',
  'smalltown-boy',
  'burning-bridges',
] as const;

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
  testId,
}: {
  label: string;
  hint: string;
  accept: string;
  asset?: Asset;
  kind: 'image' | 'video';
  disabled: boolean;
  onFile: (file: File | undefined) => void;
  testId: string;
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
          disabled && 'opacity-70'
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
            <span className="pointer-events-none absolute inset-x-2 bottom-2 rounded-md bg-black/70 px-2 py-1 text-[10px] text-white backdrop-blur">
              {asset.uploading ? 'Uploading…' : asset.file?.name || 'Ready'}
            </span>
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
                {kind === 'video'
                  ? 'MP4, MOV · 200MB'
                  : 'JPG, PNG, WEBP · 10MB'}
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
    remainingGenerations: (count: number) => string;
    generationRules: string;
    legacyBalance: string;
    referenceDisclaimer: string;
  };
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: session, isPending: sessionPending } = useSession();
  const user = session?.user;
  const { data: permissions } = useUserPermissions(Boolean(user));
  const [selectedId, setSelectedId] = useState(TEMPLATES[0].id);
  const [exampleId, setExampleId] = useState(TEMPLATES[0].id);
  const [validatingMedia, setValidatingMedia] = useState(false);
  const [aspect, setAspect] = useState<GenjutsuAspect>('16:9');
  const [lead, setLead] = useState<Asset>();
  const [referenceVideo, setReferenceVideo] = useState<Asset>();
  const [taskId, setTaskId] = useState<string>();
  const [previewMode, setPreviewMode] = useState<'example' | 'work'>('example');
  const [muted, setMuted] = useState(true);
  const [paywall, setPaywall] = useState(false);
  const [draftReady, setDraftReady] = useState(false);
  const [draftOwner, setDraftOwner] = useState<string>();
  const [savingDraft, setSavingDraft] = useState(false);
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
  const readinessQuery = useQuery({
    queryKey: ['genjutsu-readiness'],
    queryFn: () => apiGet<GenjutsuReadiness>('/api/genjutsu/generate'),
    staleTime: 30000,
  });
  const readiness = readinessQuery.data;
  const costCredits = genjutsuCredits(referenceVideo?.duration || 5);
  const requiredGenerations = genjutsuGenerations(
    referenceVideo?.duration || 5
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
    queryFn: () => apiGet<{ balance: number }>('/api/credits'),
    enabled: Boolean(user),
  });
  const taskQuery = useQuery({
    queryKey: ['genjutsu-task', taskId],
    queryFn: () => apiGet<GenjutsuTask>(`/api/studio/task?id=${taskId}`),
    enabled: Boolean(taskId && user),
    refetchInterval: (query) => (isDone(query.state.data) ? false : 5000),
  });
  const task = taskQuery.data;

  const selectAsset = async (
    file: File | undefined,
    type: 'image' | 'video',
    setAsset: (asset: Asset | undefined) => void
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
    const maxMB = isVideo ? readiness?.maxVideoMB || 100 : 10;
    const maxBytes = maxMB * 1024 * 1024;
    if (file.size > maxBytes) {
      toast.error(`File exceeds the ${maxMB}MB limit`);
      return;
    }

    const preview = URL.createObjectURL(file);
    setValidatingMedia(true);
    try {
      const metadata = await readMediaMetadata(preview, type);
      if (
        isVideo &&
        (!Number.isFinite(metadata.duration) ||
          metadata.duration < 3 ||
          metadata.duration > 10.05)
      )
        throw new Error('Reference video must be 3–10 seconds long');
      if (
        isVideo &&
        (metadata.width < 720 ||
          metadata.height < 720 ||
          metadata.width > 2160 ||
          metadata.height > 2160)
      )
        throw new Error('Reference video dimensions must be 720–2160px');
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
      setAsset({
        kind: isVideo ? 'video' : 'image',
        file,
        preview,
        uploading: false,
        ...metadata,
      });
    } catch (error) {
      URL.revokeObjectURL(preview);
      toast.error(error instanceof Error ? error.message : 'Invalid media');
    } finally {
      setValidatingMedia(false);
    }
  };

  const uploadAsset = async (asset: Asset) => {
    if (asset.url && (asset.kind === 'image' || asset.videoReceipt))
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
      if (!lead || !referenceVideo)
        throw new Error('Upload a main character image and a reference video');
      const current = await readinessQuery.refetch();
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
      if (
        current.data.provider === 'fal' &&
        referenceVideo.width &&
        referenceVideo.height
      ) {
        const [w, h] = aspect.split(':').map(Number);
        if (
          Math.abs(referenceVideo.width / referenceVideo.height - w / h) > 0.03
        )
          throw new Error(
            'This editing API preserves the uploaded video size; select its original ratio'
          );
      }
      setLead({ ...lead, uploading: true });
      setReferenceVideo({ ...referenceVideo, uploading: true });
      let leadImage: string;
      let videoUrl: string;
      let videoReceipt: Asset['videoReceipt'];
      try {
        // Keep successful uploads on retry rather than sending the file again.
        leadImage = (await uploadAsset(lead)).url;
        setLead({ ...lead, url: leadImage, uploading: false });
        const videoUpload = await uploadAsset(referenceVideo);
        videoUrl = videoUpload.url;
        videoReceipt = videoUpload.videoReceipt;
        setReferenceVideo({
          ...referenceVideo,
          url: videoUrl,
          videoReceipt,
          uploading: false,
        });
      } catch (error) {
        setLead((value) => (value ? { ...value, uploading: false } : value));
        setReferenceVideo((value) =>
          value ? { ...value, uploading: false } : value
        );
        throw error;
      }
      return apiPost<GenjutsuTask>('/api/genjutsu/generate', {
        aspect,
        prompt: selected.prompt,
        leadImage,
        referenceVideo: videoUrl,
        videoReceipt,
        referenceWidth: referenceVideo.width,
        referenceHeight: referenceVideo.height,
      });
    },
    onSuccess: (created) => {
      setTaskId(created.id);
      setPreviewMode('work');
      queryClient.setQueryData(['genjutsu-task', created.id], created);
      queryClient.invalidateQueries({ queryKey: ['credits'] });
    },
    onError: (error: Error) => {
      if (error.message === 'Insufficient credits') setPaywall(true);
      else toast.error(error.message);
    },
  });

  useEffect(() => {
    if (!task || !isDone(task)) return;
    queryClient.invalidateQueries({ queryKey: ['credits'] });
    if (task.status === 'failed')
      toast.error(task.error || 'Generation failed');
  }, [queryClient, task]);

  const running = generate.isPending || Boolean(taskId && !isDone(task));
  const uploading = Boolean(lead?.uploading || referenceVideo?.uploading);
  const canGenerate =
    draftReady &&
    draftOwner === (user?.id || 'anonymous') &&
    !sessionPending &&
    !savingDraft &&
    !uploading &&
    !running &&
    !validatingMedia;

  async function startGeneration() {
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
      router.push(`/sign-in?callbackUrl=${encodeURIComponent('/create')}`);
      return;
    }
    if (!assetIsReady(lead) || !assetIsReady(referenceVideo)) {
      toast.error('Upload a main character image and a reference video');
      return;
    }
    if (
      !permissions?.isAdmin &&
      creditsQuery.data &&
      creditsQuery.data.balance < costCredits
    ) {
      setPaywall(true);
      return;
    }
    generate.mutate();
  }

  const workUrl = task?.status === 'success' ? task.url : null;
  const showWork = previewMode === 'work';

  return (
    <>
      <div
        id="generator"
        className="border-border bg-muted text-foreground grid scroll-mt-24 gap-3 rounded-3xl border p-3 lg:grid-cols-[300px_minmax(0,340px)_minmax(0,1fr)]"
      >
        <section
          aria-label="Create"
          className="bg-card order-2 flex min-h-0 flex-col gap-4 rounded-2xl p-4 lg:order-1"
        >
          <h2 className="text-lg font-semibold">AI Effects</h2>
          <div className="border-primary/40 bg-primary/10 flex items-center gap-3 rounded-xl border p-2">
            <img
              src={selected.image}
              alt=""
              aria-hidden="true"
              className="size-11 rounded-lg object-cover"
            />
            <div className="min-w-0 flex-1">
              <p
                data-testid="selected-template"
                className="truncate text-sm font-semibold"
              >
                {selected.name}
              </p>
              <p className="text-muted-foreground text-xs">
                {referenceVideo?.duration
                  ? Number(referenceVideo.duration.toFixed(2))
                  : 5}
                s · {copy.generationCost(requiredGenerations)} · Kling O1
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <UploadSlot
              label="Reference video"
              hint="3–10s"
              kind="video"
              disabled={
                !draftReady || running || validatingMedia || savingDraft
              }
              accept="video/mp4,video/quicktime,video/x-m4v"
              asset={referenceVideo}
              onFile={(file) => selectAsset(file, 'video', setReferenceVideo)}
              testId="upload-video"
            />
            <UploadSlot
              label="Main character"
              hint="Stays still"
              kind="image"
              disabled={
                !draftReady || running || validatingMedia || savingDraft
              }
              accept="image/jpeg,image/png,image/webp"
              asset={lead}
              onFile={(file) => selectAsset(file, 'image', setLead)}
              testId="upload-lead"
            />
          </div>

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
                      ratio === '16:9'
                        ? 'h-3 w-5'
                        : ratio === '4:3'
                          ? 'h-3.5 w-4.5'
                          : 'h-5 w-3'
                    )}
                  />
                  {ratio}
                </button>
              ))}
            </div>
          </fieldset>

          <div className="mt-auto flex flex-col gap-2">
            <div className="text-muted-foreground flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5">
                <Sparkles className="text-primary size-4" />
                <span data-testid="generator-cost">
                  {copy.generationCost(requiredGenerations)}
                </span>
              </span>
              <span data-testid="generator-balance" className="tabular-nums">
                {copy.remainingGenerations(
                  Math.floor(
                    (creditsQuery.data?.balance ?? 0) /
                      GENJUTSU_CREDITS_PER_GENERATION
                  )
                )}
              </span>
            </div>
            <p className="text-muted-foreground text-[11px]">
              {copy.generationRules}
            </p>
            {Boolean(
              (creditsQuery.data?.balance ?? 0) %
              GENJUTSU_CREDITS_PER_GENERATION
            ) && (
              <p className="text-muted-foreground text-[11px]">
                {copy.legacyBalance}
              </p>
            )}
            <button
              type="button"
              disabled={!canGenerate}
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
          aria-label="Select effect"
          className="bg-card @container order-1 flex min-h-0 flex-col gap-3 rounded-2xl p-4 lg:order-2"
        >
          <h2 className="text-lg font-semibold">Select Effect</h2>
          <div className="relative lg:min-h-[calc((100cqw-1.25rem)*2+2rem)] lg:flex-1">
            <div
              data-testid="template-list"
              className="grid max-h-[calc((100cqw-1.25rem)*2+2rem)] auto-rows-max grid-cols-2 content-start gap-3 overflow-y-auto overscroll-contain p-1 [scrollbar-color:rgb(255_255_255/0.2)_transparent] [scrollbar-width:thin] lg:absolute lg:inset-0 lg:max-h-none"
            >
              {TEMPLATES.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  aria-pressed={selected.id === template.id}
                  data-testid={`template-${template.id}`}
                  className={cn(
                    'group relative aspect-[3/4] overflow-hidden rounded-xl text-left ring-2 transition-all disabled:cursor-not-allowed',
                    selected.id === template.id
                      ? 'ring-primary'
                      : 'ring-transparent'
                  )}
                  disabled={running}
                  onClick={() => {
                    setSelectedId(template.id);
                    setExampleId(template.id);
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
                      {template.duration}s · {template.ratios}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section
          aria-label="Preview"
          className="bg-card order-3 flex min-h-0 flex-col gap-3 rounded-2xl p-4"
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
          </div>
          <div className="relative flex min-h-[420px] flex-1 items-center justify-center overflow-hidden rounded-xl bg-black lg:min-h-[500px]">
            <img
              src={example.image}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 size-full scale-110 object-cover opacity-50 blur-2xl"
            />
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
                  className="absolute inset-0 size-full object-cover"
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
                    task.error || 'Generation failed'
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
                key={example.video}
                data-testid="reference-video"
                src={example.video}
                poster={example.image}
                autoPlay
                loop={!SAMPLE_PLAYLIST.some((id) => id === example.id)}
                onEnded={() => {
                  const index = SAMPLE_PLAYLIST.findIndex(
                    (id) => id === example.id
                  );
                  if (index >= 0) {
                    setExampleId(
                      SAMPLE_PLAYLIST[(index + 1) % SAMPLE_PLAYLIST.length]
                    );
                  }
                }}
                muted={muted}
                playsInline
                className="absolute inset-0 size-full object-cover"
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
            <span className="absolute top-3 left-3 rounded-full bg-black/70 px-2.5 py-1 text-xs text-white backdrop-blur">
              {showWork ? selected.name : example.name} ·{' '}
              {showWork ? 'work' : 'Higgsfield reference'}
            </span>
            {task?.status === 'success' && task.url ? (
              <a
                href={task.url}
                target="_blank"
                rel="noopener noreferrer"
                download
                className="hover:bg-primary absolute bottom-3 left-3 inline-flex items-center gap-2 rounded-full bg-black/70 px-3 py-2 text-xs text-white backdrop-blur transition"
              >
                <Download className="size-3.5" /> Download
              </a>
            ) : null}
          </div>
          {!showWork && (
            <p className="text-muted-foreground text-xs">
              {copy.referenceDisclaimer}
            </p>
          )}
        </section>
      </div>

      <Dialog open={paywall} onOpenChange={setPaywall}>
        <DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] overflow-y-auto p-5 sm:max-w-6xl sm:p-8">
          <Pricing variant="dialog" beforeCheckout={persistDraft} />
        </DialogContent>
      </Dialog>
    </>
  );
}
