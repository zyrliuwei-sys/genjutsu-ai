import { useEffect, useId, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  Download,
  ImageIcon,
  Loader2,
  Sparkles,
  Upload,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

import { useSession } from '@/core/auth/client';
import { useRouter } from '@/core/i18n/navigation';
import {
  GENJUTSU_ASPECTS,
  GENJUTSU_CREDITS_PER_GENERATION,
  GENJUTSU_DURATION_TIERS,
  genjutsuCredits,
  genjutsuDurationTier,
  genjutsuGenerations,
  type GenjutsuAspect,
  type GenjutsuReadiness,
} from '@/config/genjutsu';
import { PRACTICE_SAMPLES } from '@/config/practice-media';
import { apiGet, apiPost, apiPublicFile, apiUpload } from '@/lib/api-client';
import {
  loadGenjutsuDraft,
  saveGenjutsuDraft,
  type DraftAsset,
} from '@/lib/genjutsu-draft';
import { hasFreshVideoReceipt } from '@/lib/genjutsu-media';
import { readMediaMetadata } from '@/lib/media-metadata';
import { cn } from '@/lib/utils';
import { useFunnel } from '@/hooks/use-funnel';
import { useUserPermissions } from '@/hooks/use-user-permissions';
import { Pricing } from '@/blocks/pricing';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { VideoComparison } from '@/components/video-comparison';

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
  formats,
  onClear,
  clearLabel,
}: {
  label: string;
  hint: string;
  accept: string;
  asset?: Asset;
  kind: 'image' | 'video';
  disabled: boolean;
  onFile: (file: File | undefined) => void;
  testId: string;
  formats: string;
  onClear: () => void;
  clearLabel: string;
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
      <div className="overflow-hidden rounded-xl">
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
              <button
                type="button"
                aria-label={clearLabel}
                data-testid={`clear-${testId}`}
                disabled={disabled}
                onClick={onClear}
                className="absolute top-1 right-1 z-30 flex size-9 items-center justify-center rounded-full bg-black/70 text-white shadow-sm transition-colors hover:bg-black/90 focus-visible:ring-2 focus-visible:ring-white disabled:opacity-50"
              >
                <X className="size-4" />
              </button>
              <PreviewAsset
                asset={asset}
                className="pointer-events-none absolute inset-0"
              />
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
                  {formats}
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export type GeneratorCopy = {
  uploadTitle: string;
  backgroundLabel: string;
  keepBackground: string;
  changeBackground: string;
  backgroundDescription: string;
  backgroundPlaceholder: string;
  backgroundRequired: string;
  backgroundPresets: { id: string; label: string; description: string }[];
  moreSettings: string;
  originalLabel: string;
  previewTitle: string;
  previewEmpty: string;
  generationCost: (count: number) => string;
  remainingGenerations: (count: number) => string;
  generationRules: string;
  legacyBalance: string;
  referenceDisclaimer: string;
  intro: string;
  steps: string;
  buy: string;
  from: (price: string) => string;
  sample: string;
  sampleLoading: string;
  sampleDisclaimer: string;
  sampleError: string;
  sampleReplace: string;
  sampleReplaceHint: string;
  samplePickerTitle: string;
  sampleNames: Record<string, string>;
  removeVideo: string;
  removePhoto: string;
  keepFiles: string;
  videoFormats: (max: number) => string;
  videoRequirements: (max: number) => string;
  imageRequirements: string;
  draftWarning: string;
  generate: string;
  clipCost: (seconds: string, count: number) => string;
  referenceLabel: string;
  workLabel: string;
  compareLabel: string;
  compareHint: string;
  before: string;
  after: string;
  compareEmpty: string;
  compareMissing: string;
  comparePlay: string;
  referenceDuration: string;
  durationLabel: string;
  durationHint: string;
  durationOption: (seconds: number, count: number) => string;
  durationMismatch: string;
};

export function GenjutsuGenerator({ copy }: { copy: GeneratorCopy }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: session, isPending: sessionPending } = useSession();
  const user = session?.user;
  const { data: permissions } = useUserPermissions(Boolean(user));
  const { track, enabled: trackingEnabled } = useFunnel();
  const studioTracked = useRef(false);
  const completedTasks = useRef(new Set<string>());
  const samplePending = useRef(false);
  const [loadingSample, setLoadingSample] = useState(false);
  const [sampleId, setSampleId] = useState<string>();
  const [draftSaveFailed, setDraftSaveFailed] = useState(false);
  const [comparison, setComparison] = useState<{
    taskId: string;
    source: Asset;
  }>();
  const [backgroundMode, setBackgroundMode] = useState<'keep' | 'change'>(
    'keep'
  );
  const [backgroundDescription, setBackgroundDescription] = useState('');
  const [validatingMedia, setValidatingMedia] = useState(false);
  const [aspect, setAspect] = useState<GenjutsuAspect>('16:9');
  const [durationTier, setDurationTier] = useState(5);
  const [lead, setLead] = useState<Asset>();
  const [referenceVideo, setReferenceVideo] = useState<Asset>();
  const [taskId, setTaskId] = useState<string>();
  const [previewMode, setPreviewMode] = useState<
    'example' | 'work' | 'compare'
  >('example');
  const [muted, setMuted] = useState(true);
  const [paywall, setPaywall] = useState(false);
  const [draftReady, setDraftReady] = useState(false);
  const [draftOwner, setDraftOwner] = useState<string>();
  const [savingDraft, setSavingDraft] = useState(false);
  useEffect(() => {
    if (
      !studioTracked.current &&
      track('studio_view', {
        surface: window.location.pathname === '/' ? 'home' : 'create',
      })
    )
      studioTracked.current = true;
  }, [track, trackingEnabled]);
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
        setDurationTier(
          draft?.durationTier &&
            GENJUTSU_DURATION_TIERS.includes(draft.durationTier as 5 | 10)
            ? draft.durationTier
            : draft?.referenceVideo?.duration
              ? genjutsuDurationTier(draft.referenceVideo.duration)
              : 5
        );
        const source = restore(draft?.comparison?.source);
        setComparison(
          source && draft?.comparison
            ? { taskId: draft.comparison.taskId, source }
            : undefined
        );
        setBackgroundMode(
          draft?.backgroundMode === 'change' ? 'change' : 'keep'
        );
        setBackgroundDescription(draft?.backgroundDescription || '');
        setSampleId(
          PRACTICE_SAMPLES.find((sample) => sample.id === draft?.sampleId)?.id
        );
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
      selectedId: 'video-edit',
      sampleId,
      backgroundMode,
      backgroundDescription,
      aspect,
      durationTier,
      lead: store(lead),
      referenceVideo: store(referenceVideo),
      savedAt: Date.now(),
      comparison: comparison
        ? { taskId: comparison.taskId, source: store(comparison.source)! }
        : undefined,
    });
  }
  useEffect(() => {
    if (
      !draftReady ||
      sessionPending ||
      draftOwner !== (user?.id || 'anonymous')
    )
      return;
    // Local storage is best-effort; a failure must not silently block payment.
    void persistDraft()
      .then(() => setDraftSaveFailed(false))
      .catch(() => setDraftSaveFailed(true));
  }, [
    draftReady,
    draftOwner,
    sessionPending,
    user?.id,
    lead,
    referenceVideo,
    backgroundMode,
    backgroundDescription,
    sampleId,
    aspect,
    durationTier,
    comparison,
  ]);
  useEffect(
    () => () => {
      if (lead?.preview.startsWith('blob:')) URL.revokeObjectURL(lead.preview);
    },
    [lead?.preview]
  );
  useEffect(
    () => () => {
      if (comparison?.source.preview.startsWith('blob:'))
        URL.revokeObjectURL(comparison.source.preview);
    },
    [comparison?.source.preview]
  );
  useEffect(
    () => () => {
      if (referenceVideo?.preview.startsWith('blob:'))
        URL.revokeObjectURL(referenceVideo.preview);
    },
    [referenceVideo?.preview]
  );

  const readinessQuery = useQuery({
    queryKey: ['genjutsu-readiness'],
    queryFn: () => apiGet<GenjutsuReadiness>('/api/genjutsu/generate'),
    staleTime: 30000,
  });
  const readiness = readinessQuery.data;
  const maxVideoMB = readiness?.maxVideoMB || 100;
  const costCredits = genjutsuCredits(durationTier);
  const requiredGenerations = genjutsuGenerations(durationTier);
  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = user ? sessionStorage.getItem(`genjutsu-task:${user.id}`) : null;
    } catch {
      /* Private browsers may block storage. */
    }
    setTaskId(saved || undefined);
    if (saved) setPreviewMode('work');
  }, [user?.id]);
  useEffect(() => {
    try {
      if (taskId && user)
        sessionStorage.setItem(`genjutsu-task:${user.id}`, taskId);
    } catch {
      /* Generation still works without local recovery. */
    }
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

  async function loadPracticeMedia(sample: (typeof PRACTICE_SAMPLES)[number]) {
    if (samplePending.current || running) return;
    samplePending.current = true;
    setLoadingSample(true);
    try {
      const [video, image] = await Promise.all([
        apiPublicFile(
          sample.video,
          `practice-${sample.id}-5s.mp4`,
          'video/mp4'
        ),
        apiPublicFile(
          sample.image,
          `practice-${sample.id}-character.jpg`,
          'image/jpeg'
        ),
      ]);
      const videoPreview = URL.createObjectURL(video);
      const imagePreview = URL.createObjectURL(image);
      try {
        const [videoMetadata, imageMetadata] = await Promise.all([
          readMediaMetadata(videoPreview, 'video'),
          readMediaMetadata(imagePreview, 'image'),
        ]);
        if (
          videoMetadata.duration < 3 ||
          videoMetadata.duration > 5 ||
          video.size > maxVideoMB * 1024 * 1024
        )
          throw new Error('Invalid practice clip');
        setReferenceVideo({
          kind: 'video',
          file: video,
          preview: videoPreview,
          uploading: false,
          ...videoMetadata,
        });
        setDurationTier(5);
        setLead({
          kind: 'image',
          file: image,
          preview: imagePreview,
          uploading: false,
          ...imageMetadata,
        });
        setAspect(sample.aspect);
        setSampleId(sample.id);
        setPreviewMode('example');
        track('sample_loaded', { outcome: 'success', required_generations: 1 });
      } catch (error) {
        URL.revokeObjectURL(videoPreview);
        URL.revokeObjectURL(imagePreview);
        throw error;
      }
    } catch {
      toast.error(copy.sampleError);
      track('sample_loaded', { outcome: 'request_failed' });
    } finally {
      samplePending.current = false;
      setLoadingSample(false);
    }
  }

  const selectAsset = async (
    file: File | undefined,
    type: 'image' | 'video',
    setAsset: (asset: Asset | undefined) => void
  ) => {
    if (!file) return;
    const rejectFile = (message: string) => {
      toast.error(message);
      track('upload_result', { media_kind: type, outcome: 'invalid' });
    };
    const isVideo = ['video/mp4', 'video/quicktime', 'video/x-m4v'].includes(
      file.type
    );
    if (
      type === 'image' &&
      !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)
    ) {
      rejectFile(
        'Only JPG, PNG and WEBP photos are supported. Convert HEIC before uploading.'
      );
      return;
    }
    if (type === 'video' && !isVideo) {
      rejectFile('Only MP4 and MOV videos are supported');
      return;
    }
    const maxMB = isVideo ? readiness?.maxVideoMB || 100 : 10;
    const maxBytes = maxMB * 1024 * 1024;
    if (file.size > maxBytes) {
      rejectFile(`File exceeds the ${maxMB}MB limit`);
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
          metadata.duration > (readiness?.maxVideoSeconds || 10) + 0.05)
      )
        throw new Error(
          `Reference video must be 3–${readiness?.maxVideoSeconds || 10} seconds long`
        );
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
      // A custom source must not inherit unrelated practice choreography.
      if (isVideo) setSampleId(undefined);
      if (isVideo) {
        setDurationTier(genjutsuDurationTier(metadata.duration));
        const ratios = readiness?.aspects || GENJUTSU_ASPECTS;
        const closest = [...ratios].sort((a, b) => {
          const ratio = (x: string) => {
            const [w, h] = x.split(':').map(Number);
            return w / h;
          };
          return (
            Math.abs(ratio(a) - metadata.width / metadata.height) -
            Math.abs(ratio(b) - metadata.width / metadata.height)
          );
        })[0];
        if (closest) setAspect(closest);
      }
      track('upload_result', { media_kind: type, outcome: 'success' });
    } catch (error) {
      URL.revokeObjectURL(preview);
      toast.error(error instanceof Error ? error.message : 'Invalid media');
      track('upload_result', { media_kind: type, outcome: 'invalid' });
    } finally {
      setValidatingMedia(false);
    }
  };

  const uploadAsset = async (asset: Asset) => {
    if (
      asset.url &&
      (asset.kind === 'image' ||
        hasFreshVideoReceipt(asset.videoReceipt, asset.url))
    )
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
      if (
        !referenceVideo.duration ||
        genjutsuDurationTier(referenceVideo.duration) !== durationTier
      )
        throw new Error(copy.durationMismatch);
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
      if (referenceVideo.duration > current.data.maxVideoSeconds + 0.05)
        throw new Error('Reference video must be 3–10 seconds long');
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
        durationTier,
        sampleId,
        backgroundMode,
        backgroundDescription:
          backgroundMode === 'change' ? backgroundDescription.trim() : '',
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
      if (referenceVideo)
        setComparison({
          taskId: created.id,
          source: {
            ...referenceVideo,
            preview: referenceVideo.file
              ? URL.createObjectURL(referenceVideo.file)
              : referenceVideo.preview,
          },
        });
      track('generation_started', {
        required_generations: requiredGenerations,
      });
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
    if (
      !completedTasks.current.has(task.id) &&
      track(
        task.status === 'success' ? 'generation_complete' : 'generation_failed'
      )
    )
      completedTasks.current.add(task.id);
  }, [queryClient, task, track]);

  const running = generate.isPending || Boolean(taskId && !isDone(task));
  const uploading = Boolean(lead?.uploading || referenceVideo?.uploading);
  const canGenerate =
    draftReady &&
    draftOwner === (user?.id || 'anonymous') &&
    !sessionPending &&
    !savingDraft &&
    !uploading &&
    !running &&
    !validatingMedia &&
    !loadingSample;

  async function startGeneration() {
    track('generate_click', { required_generations: requiredGenerations });
    if (
      referenceVideo?.duration &&
      genjutsuDurationTier(referenceVideo.duration) !== durationTier
    ) {
      toast.error(copy.durationMismatch);
      return;
    }
    if (backgroundMode === 'change' && !backgroundDescription.trim()) {
      toast.error(copy.backgroundRequired);
      return;
    }
    setSavingDraft(true);
    try {
      await persistDraft();
    } catch {
      setDraftSaveFailed(true);
      track('draft_save_failed', { outcome: 'storage_unavailable' });
    } finally {
      setSavingDraft(false);
    }
    if (!user) {
      router.push(`/sign-in?callbackUrl=${encodeURIComponent('/create')}`);
      return;
    }
    if (!assetIsReady(lead) || !assetIsReady(referenceVideo)) {
      track('generate_blocked', {
        outcome: 'missing_media',
        required_generations: requiredGenerations,
      });
      toast.error('Upload a main character image and a reference video');
      return;
    }
    if (
      !permissions?.isAdmin &&
      creditsQuery.data &&
      creditsQuery.data.balance < costCredits
    ) {
      setPaywall(true);
      track('generate_blocked', {
        outcome: 'insufficient_credits',
        required_generations: requiredGenerations,
      });
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
        className="border-border bg-muted text-foreground grid scroll-mt-24 gap-3 rounded-3xl border p-3 lg:grid-cols-[360px_minmax(0,1fr)]"
      >
        <section
          aria-label="Create"
          className="bg-card order-1 flex min-h-0 flex-col gap-4 rounded-2xl p-4"
        >
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-lg font-semibold">{copy.uploadTitle}</h3>
            <span className="text-muted-foreground text-xs">{copy.sample}</span>
          </div>
          <div
            data-testid="practice-set-list"
            className="grid grid-cols-4 gap-2"
          >
            {PRACTICE_SAMPLES.map((sample) => (
              <button
                type="button"
                key={sample.id}
                data-testid={`practice-set-${sample.id}`}
                disabled={
                  !draftReady || running || loadingSample || validatingMedia
                }
                title={copy.sampleDisclaimer}
                className="group border-border hover:border-primary flex flex-col overflow-hidden rounded-lg border p-0 text-left transition-colors disabled:opacity-50"
                onClick={() => {
                  void loadPracticeMedia(sample);
                }}
              >
                <img
                  src={sample.poster}
                  alt=""
                  className="block aspect-[4/3] w-full shrink-0 object-cover"
                />
                <span className="block w-full flex-1 px-1.5 py-1.5 text-[10px] leading-snug">
                  {copy.sampleNames[sample.id]}
                </span>
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <UploadSlot
              label="Reference video"
              hint={`3–${readiness?.maxVideoSeconds || 10}s`}
              kind="video"
              disabled={
                !draftReady ||
                running ||
                validatingMedia ||
                savingDraft ||
                loadingSample
              }
              accept="video/mp4,video/quicktime,video/x-m4v"
              asset={referenceVideo}
              onFile={(file) => selectAsset(file, 'video', setReferenceVideo)}
              testId="upload-video"
              formats={copy.videoFormats(maxVideoMB)}
              clearLabel={copy.removeVideo}
              onClear={() => {
                setReferenceVideo(undefined);
                setSampleId(undefined);
              }}
            />
            <UploadSlot
              label="Main character"
              hint="Stays still"
              kind="image"
              disabled={
                !draftReady ||
                running ||
                validatingMedia ||
                savingDraft ||
                loadingSample
              }
              accept="image/jpeg,image/png,image/webp"
              asset={lead}
              onFile={(file) => selectAsset(file, 'image', setLead)}
              testId="upload-lead"
              formats="JPG, PNG, WEBP · 10MB"
              clearLabel={copy.removePhoto}
              onClear={() => setLead(undefined)}
            />
          </div>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-sm font-medium">
              {copy.durationLabel}
            </legend>
            <div className="grid grid-cols-2 gap-2">
              {GENJUTSU_DURATION_TIERS.map((seconds) => (
                <button
                  key={seconds}
                  type="button"
                  data-testid={`duration-${seconds}`}
                  aria-pressed={durationTier === seconds}
                  disabled={
                    !draftReady ||
                    sessionPending ||
                    running ||
                    Boolean(readiness && seconds > readiness.maxVideoSeconds)
                  }
                  onClick={() => setDurationTier(seconds)}
                  className={cn(
                    'min-h-11 rounded-lg border px-2 py-2 text-sm transition-colors disabled:opacity-50',
                    durationTier === seconds
                      ? 'border-primary bg-primary/15 text-primary-text'
                      : 'border-border hover:border-primary/40'
                  )}
                >
                  {copy.durationOption(seconds, seconds / 5)}
                </button>
              ))}
            </div>
            <p className="text-muted-foreground text-xs leading-relaxed">
              {copy.durationHint}
            </p>
          </fieldset>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-sm font-medium">
              {copy.backgroundLabel}
            </legend>
            <div className="bg-muted flex gap-1 rounded-lg p-1">
              {(['keep', 'change'] as const).map((mode) => (
                <button
                  type="button"
                  key={mode}
                  aria-pressed={backgroundMode === mode}
                  disabled={running}
                  data-testid={`background-${mode}`}
                  onClick={() => setBackgroundMode(mode)}
                  className={cn(
                    'min-h-10 flex-1 rounded-md px-2 text-sm transition-colors',
                    backgroundMode === mode
                      ? 'bg-card text-foreground shadow-sm'
                      : 'text-muted-foreground'
                  )}
                >
                  {mode === 'keep'
                    ? copy.keepBackground
                    : copy.changeBackground}
                </button>
              ))}
            </div>
            {backgroundMode === 'change' && (
              <div className="mt-1 flex flex-col gap-3">
                <div
                  className="grid grid-cols-3 gap-2"
                  role="group"
                  aria-label={copy.backgroundLabel}
                >
                  {copy.backgroundPresets.map((preset) => (
                    <button
                      type="button"
                      key={preset.id}
                      data-testid={`background-preset-${preset.id}`}
                      aria-pressed={
                        backgroundDescription === preset.description
                      }
                      title={preset.description}
                      disabled={running}
                      onClick={() =>
                        setBackgroundDescription(preset.description)
                      }
                      className={cn(
                        'min-h-10 rounded-lg border px-2 py-2 text-xs transition-colors disabled:opacity-50',
                        backgroundDescription === preset.description
                          ? 'border-primary/60 bg-primary/10 text-primary-text'
                          : 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground'
                      )}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
                <label htmlFor="background-description" className="sr-only">
                  {copy.backgroundDescription}
                </label>
                <textarea
                  id="background-description"
                  data-testid="background-description"
                  value={backgroundDescription}
                  onChange={(e) => setBackgroundDescription(e.target.value)}
                  maxLength={500}
                  disabled={running}
                  rows={3}
                  placeholder={copy.backgroundPlaceholder}
                  className="border-border bg-background placeholder:text-muted-foreground focus-visible:ring-primary w-full resize-y rounded-lg border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:outline-none"
                />
              </div>
            )}
          </fieldset>
          <details className="text-muted-foreground text-xs">
            <summary className="min-h-9 cursor-pointer py-2">
              {copy.moreSettings}
            </summary>
            <fieldset className="mt-2 flex flex-col gap-2">
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
                        ratio === '16:9' ? 'h-3 w-5' : 'h-5 w-3'
                      )}
                    />
                    {ratio}
                  </button>
                ))}
              </div>
            </fieldset>
          </details>

          <div className="mt-auto flex flex-col gap-2">
            {draftSaveFailed && (
              <p
                role="status"
                className="flex items-start gap-2 rounded-lg border border-amber-600/25 bg-amber-500/5 p-3 text-xs leading-relaxed text-amber-800 dark:text-amber-200"
              >
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                {copy.draftWarning}
              </p>
            )}
            <div className="text-muted-foreground flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-xs">
              <span
                className="flex items-center gap-1.5"
                title={copy.generationRules}
              >
                <Sparkles className="text-primary size-4" />
                <span data-testid="generator-cost">
                  {copy.generationCost(requiredGenerations)}
                </span>
              </span>
              <span className="flex items-center gap-2">
                <span data-testid="generator-balance" className="tabular-nums">
                  {copy.remainingGenerations(
                    Math.floor(
                      (creditsQuery.data?.balance ?? 0) /
                        GENJUTSU_CREDITS_PER_GENERATION
                    )
                  )}
                </span>
                <button
                  type="button"
                  data-testid="balance-buy-generations"
                  className="text-primary-text min-h-9 shrink-0 font-medium underline-offset-4 hover:underline"
                  onClick={() => setPaywall(true)}
                >
                  {copy.buy}
                </button>
              </span>
            </div>
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
              {copy.generate}
            </button>
          </div>
        </section>

        <section
          aria-label="Preview"
          className="bg-card order-2 flex min-h-0 flex-col gap-3 rounded-2xl p-4"
        >
          {taskId ? (
            <div className="bg-muted flex w-full flex-wrap gap-1 rounded-xl p-1">
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
                {copy.originalLabel}
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
                {copy.workLabel}
              </button>
              {workUrl && (
                <button
                  type="button"
                  data-testid="preview-compare"
                  aria-pressed={previewMode === 'compare'}
                  className={cn(
                    'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                    previewMode === 'compare'
                      ? 'text-foreground bg-card shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                  onClick={() => setPreviewMode('compare')}
                >
                  {copy.compareLabel}
                </button>
              )}
            </div>
          ) : (
            <h3 className="text-lg font-semibold">{copy.previewTitle}</h3>
          )}
          <div className="relative flex min-h-[420px] flex-1 items-center justify-center overflow-hidden rounded-xl bg-black lg:min-h-[500px]">
            {previewMode === 'compare' ? (
              <div className="relative z-10 flex w-full self-stretch">
                <VideoComparison
                  source={
                    taskId && comparison?.taskId === taskId
                      ? comparison.source.preview
                      : !taskId
                        ? referenceVideo?.preview
                        : undefined
                  }
                  result={workUrl}
                  copy={{
                    before: copy.before,
                    after: copy.after,
                    empty: copy.compareEmpty,
                    missing: copy.compareMissing,
                    play: copy.comparePlay,
                  }}
                />
              </div>
            ) : showWork ? (
              workUrl ? (
                <video
                  data-testid="work-video"
                  src={workUrl || undefined}
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
            ) : referenceVideo?.preview ? (
              <video
                data-testid="reference-video"
                src={referenceVideo.preview}
                controls
                playsInline
                muted={muted}
                className="absolute inset-0 size-full object-contain"
              />
            ) : (
              <p className="text-muted-foreground px-6 text-center text-sm">
                {copy.previewEmpty}
              </p>
            )}
            {showWork && workUrl && (
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
            )}
            {previewMode !== 'compare' &&
            task?.status === 'success' &&
            task.url ? (
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
          {previewMode === 'compare' && (
            <p className="text-muted-foreground text-xs leading-relaxed">
              {copy.compareHint}
            </p>
          )}
        </section>
      </div>

      <Dialog open={paywall} onOpenChange={setPaywall}>
        <DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] overflow-y-auto p-5 sm:max-w-6xl sm:p-8">
          <DialogTitle className="sr-only">{copy.buy}</DialogTitle>
          <DialogDescription className="sr-only">
            {copy.generationRules}
          </DialogDescription>
          <Pricing
            variant="dialog"
            beforeCheckout={persistDraft}
            requiredCredits={costCredits}
            balanceCredits={creditsQuery.data?.balance ?? 0}
            clipSeconds={referenceVideo?.duration}
            durationTier={durationTier as 5 | 10}
            trackingVisible={paywall}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
