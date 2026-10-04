import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import {
  Clapperboard,
  Coins,
  Download,
  ImageIcon,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';

import { useSession } from '@/core/auth/client';
import { tDynamic } from '@/core/i18n/dynamic';
import { useRouter } from '@/core/i18n/navigation';
import { envConfigs } from '@/config';
import {
  getStudioModel,
  STUDIO_ASPECTS,
  STUDIO_MODELS,
  studioCredits,
  VIDEO_DURATIONS,
  VIDEO_RESOLUTIONS,
  type StudioAspect,
  type StudioKind,
  type VideoDuration,
  type VideoResolution,
} from '@/config/studio-models';
import { apiGet, apiPost } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { m } from '@/paraglide/messages.js';
import { getLocale, locales, localizeUrl } from '@/paraglide/runtime.js';
import { useUserPermissions } from '@/hooks/use-user-permissions';
import { Footer } from '@/blocks/footer';
import { Header } from '@/blocks/header';
import { Pricing } from '@/blocks/pricing';
import { Dialog, DialogContent } from '@/components/ui/dialog';

type StudioTask = {
  id: string;
  status: 'pending' | 'processing' | 'success' | 'failed';
  kind: StudioKind;
  model: string;
  prompt: string;
  aspect: StudioAspect;
  credits: number;
  url: string | null;
  error: string | null;
};

type Search = { kind?: StudioKind; prompt?: string; model?: string };

const INSUFFICIENT_CREDITS = 'Insufficient credits';
const isDone = (t?: StudioTask) =>
  t?.status === 'success' || t?.status === 'failed';

export const Route = createFileRoute('/create')({
  validateSearch: (search: Record<string, unknown>): Search => ({
    kind:
      search.kind === 'image' || search.kind === 'video'
        ? search.kind
        : undefined,
    prompt:
      typeof search.prompt === 'string'
        ? search.prompt.slice(0, 2000)
        : undefined,
    model: typeof search.model === 'string' ? search.model : undefined,
  }),
  loader: () => {
    const locale = getLocale();
    return {
      locale,
      title: m['create.meta_title']({}, { locale }),
      description: m['create.meta_description']({}, { locale }),
    };
  },
  head: ({ loaderData }) => {
    if (!loaderData) return {};
    // Prompt/model query params create endless variants; all point here.
    const urlFor = (loc: string) =>
      localizeUrl(`${envConfigs.app_url}/create`, { locale: loc as any }).href;
    return {
      meta: [
        { title: loaderData.title },
        { name: 'description', content: loaderData.description },
        { property: 'og:title', content: loaderData.title },
        { property: 'og:description', content: loaderData.description },
        {
          property: 'og:image',
          content: `${envConfigs.app_url}/imgs/showcase/og.jpg`,
        },
        { name: 'twitter:card', content: 'summary_large_image' },
      ],
      links: [
        { rel: 'canonical', href: urlFor(loaderData.locale) },
        ...locales.map((loc) => ({
          rel: 'alternate',
          hrefLang: loc,
          href: urlFor(loc),
        })),
      ],
    };
  },
  component: CreatePage,
});

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'h-9 rounded-md border px-3.5 text-sm transition',
        active
          ? 'border-primary/50 bg-primary/10 text-primary-text'
          : 'text-muted-foreground hover:text-foreground'
      )}
    >
      {children}
    </button>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
        {label}
      </p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function Media({ task, className }: { task: StudioTask; className?: string }) {
  if (!task.url) return null;
  return task.kind === 'video' ? (
    <video
      src={task.url}
      controls
      autoPlay
      loop
      playsInline
      className={cn('size-full object-contain', className)}
    />
  ) : (
    <img
      src={task.url}
      alt={task.prompt}
      className={cn('size-full object-contain', className)}
    />
  );
}

function CreatePage() {
  const search = Route.useSearch();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: session, isPending: sessionPending } = useSession();
  const user = session?.user;
  const { data: permissions } = useUserPermissions(!!user);

  const initialModel =
    getStudioModel(search.model) ??
    STUDIO_MODELS.find((model) => model.kind === (search.kind ?? 'video'))!;
  const [kind, setKind] = useState<StudioKind>(initialModel.kind);
  const [modelId, setModelId] = useState(initialModel.id);
  const [prompt, setPrompt] = useState(search.prompt ?? '');
  const [aspect, setAspect] = useState<StudioAspect>('9:16');
  const [resolution, setResolution] = useState<VideoResolution>('720p');
  const [duration, setDuration] = useState<VideoDuration>(5);
  const [taskId, setTaskId] = useState<string>();
  const [paywall, setPaywall] = useState(false);

  const models = STUDIO_MODELS.filter((model) => model.kind === kind);
  const model = getStudioModel(modelId) ?? models[0]!;
  const price = studioCredits(model, { aspect, resolution, duration });

  function switchKind(next: StudioKind) {
    setKind(next);
    setModelId(STUDIO_MODELS.find((item) => item.kind === next)!.id);
  }

  const creditsQuery = useQuery({
    queryKey: ['credits'],
    queryFn: () => apiGet<{ balance: number }>('/api/credits'),
    enabled: !!user,
  });
  const historyQuery = useQuery({
    queryKey: ['studio-tasks'],
    queryFn: () => apiGet<StudioTask[]>('/api/studio/tasks'),
    enabled: !!user,
  });

  // Resume an unfinished task after a reload.
  useEffect(() => {
    if (taskId) return;
    const pending = historyQuery.data?.find((task) => !isDone(task));
    if (pending) setTaskId(pending.id);
  }, [historyQuery.data, taskId]);

  const taskQuery = useQuery({
    queryKey: ['studio-task', taskId],
    queryFn: () => apiGet<StudioTask>(`/api/studio/task?id=${taskId}`),
    enabled: !!taskId,
    refetchInterval: (query) => (isDone(query.state.data) ? false : 5000),
  });
  const task = taskQuery.data;

  useEffect(() => {
    if (!task || !isDone(task)) return;
    queryClient.invalidateQueries({ queryKey: ['studio-tasks'] });
    queryClient.invalidateQueries({ queryKey: ['credits'] });
    if (task.status === 'failed') {
      toast.error(`${m['create.failed']()}: ${task.error ?? ''}`);
    }
  }, [task?.id, task?.status]);

  const generate = useMutation({
    mutationFn: () =>
      apiPost<StudioTask>('/api/studio/generate', {
        model: model.id,
        prompt: prompt.trim(),
        aspect,
        resolution,
        duration,
      }),
    onSuccess: (created) => {
      queryClient.setQueryData(['studio-task', created.id], created);
      setTaskId(created.id);
      queryClient.invalidateQueries({ queryKey: ['credits'] });
      queryClient.invalidateQueries({ queryKey: ['studio-tasks'] });
    },
    onError: (e: Error) => {
      if (e.message === INSUFFICIENT_CREDITS) setPaywall(true);
      else toast.error(e.message);
    },
  });

  const running = generate.isPending || (!!taskId && !!task && !isDone(task));

  function start() {
    if (!prompt.trim()) {
      toast.error(m['create.prompt_required']());
      return;
    }
    if (!user) {
      const params = new URLSearchParams({ kind, prompt: prompt.trim() });
      const back = `/create?${params.toString()}`;
      router.push(`/sign-in?callbackUrl=${encodeURIComponent(back)}`);
      return;
    }
    const balance = creditsQuery.data?.balance;
    if (!permissions?.isAdmin && balance !== undefined && balance < price) {
      setPaywall(true);
      return;
    }
    generate.mutate();
  }

  const history = useMemo(
    () => (historyQuery.data ?? []).filter((item) => item.id !== task?.id),
    [historyQuery.data, task?.id]
  );

  return (
    <>
      <Header />
      <main className="relative px-4 pt-8 pb-20">
        <div
          aria-hidden
          className="eg-glow pointer-events-none absolute inset-x-0 top-0 -z-10 h-[700px] opacity-40"
        />
        <div className="mx-auto max-w-7xl">
          <p className="eg-eyebrow">{envConfigs.app_name}</p>
          <h1 className="eg-heading mt-3 text-5xl sm:text-6xl">
            {m['create.title']()}
          </h1>
          <p className="text-muted-foreground mt-2">{m['create.subtitle']()}</p>

          <div className="mt-8 grid gap-6 lg:grid-cols-[420px_1fr]">
            {/* Controls */}
            <section className="bg-card space-y-6 rounded-lg border p-5 shadow-sm sm:p-6">
              <div className="bg-muted grid grid-cols-2 gap-1 rounded-md p-1">
                {(
                  [
                    ['video', Clapperboard, m['create.kind_video']()],
                    ['image', ImageIcon, m['create.kind_image']()],
                  ] as const
                ).map(([value, Icon, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => switchKind(value)}
                    className={cn(
                      'flex h-10 items-center justify-center gap-2 rounded-sm text-sm font-medium transition',
                      kind === value
                        ? 'bg-card shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <Icon className="size-4" />
                    {label}
                  </button>
                ))}
              </div>

              <Field label={m['create.model']()}>
                {models.map((item) => (
                  <Chip
                    key={item.id}
                    active={item.id === model.id}
                    onClick={() => setModelId(item.id)}
                  >
                    {item.name}
                  </Chip>
                ))}
              </Field>

              <div>
                <label
                  htmlFor="studio-prompt"
                  className="text-muted-foreground mb-2 block text-xs font-medium tracking-wide uppercase"
                >
                  {m['create.prompt']()}
                </label>
                <textarea
                  id="studio-prompt"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={6}
                  maxLength={2000}
                  placeholder={tDynamic(`create.placeholder_${kind}`)}
                  className="bg-background focus:border-primary/50 focus:ring-primary/15 w-full resize-none rounded-md border p-3.5 text-[15px] leading-relaxed transition outline-none focus:ring-4"
                />
              </div>

              <Field label={m['create.aspect']()}>
                {STUDIO_ASPECTS.map((value) => (
                  <Chip
                    key={value}
                    active={aspect === value}
                    onClick={() => setAspect(value)}
                  >
                    {value}
                  </Chip>
                ))}
              </Field>

              {kind === 'video' && (
                <div className="grid grid-cols-2 gap-4">
                  <Field label={m['create.resolution']()}>
                    {VIDEO_RESOLUTIONS.map((value) => (
                      <Chip
                        key={value}
                        active={resolution === value}
                        onClick={() => setResolution(value)}
                      >
                        {value}
                      </Chip>
                    ))}
                  </Field>
                  <Field label={m['create.duration']()}>
                    {VIDEO_DURATIONS.map((value) => (
                      <Chip
                        key={value}
                        active={duration === value}
                        onClick={() => setDuration(value)}
                      >
                        {value}s
                      </Chip>
                    ))}
                  </Field>
                </div>
              )}

              <div className="space-y-3 border-t pt-5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <Coins className="size-4" />
                    {m['create.cost']({ credits: price })}
                  </span>
                  {user && creditsQuery.data && (
                    <span className="text-muted-foreground">
                      {m['create.balance']({
                        credits: creditsQuery.data.balance,
                      })}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={start}
                  disabled={running || sessionPending}
                  className="eg-pill-primary h-12 w-full text-base disabled:opacity-60"
                >
                  {running ? (
                    <Loader2 className="size-5 animate-spin" />
                  ) : (
                    <Sparkles className="size-5" />
                  )}
                  {running
                    ? m['create.generating']()
                    : user
                      ? m['create.generate']()
                      : m['create.sign_in_to_generate']()}
                </button>
              </div>
            </section>

            {/* Output */}
            <section className="space-y-6">
              <div className="eg-screen flex aspect-video items-center justify-center overflow-hidden rounded-lg text-white/80 lg:aspect-auto lg:h-[560px]">
                {task?.status === 'success' && task.url ? (
                  <div className="relative size-full bg-black/90">
                    <Media task={task} />
                    <a
                      href={task.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      download
                      className="eg-pill-light absolute top-4 right-4 px-4 py-2 text-sm"
                    >
                      <Download className="size-4" />
                      {m['create.download']()}
                    </a>
                  </div>
                ) : running ? (
                  <div className="flex flex-col items-center gap-3 p-8 text-center text-white/60">
                    <Loader2 className="text-primary size-8 animate-spin" />
                    <p className="eg-heading text-2xl text-white">
                      {m['create.generating']()}
                    </p>
                    <p className="max-w-sm text-sm">
                      {tDynamic(`create.wait_${kind}`)}
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3 p-8 text-center text-white/60">
                    <Sparkles className="text-primary size-8" />
                    <p className="eg-heading text-2xl text-white">
                      {m['create.empty_title']()}
                    </p>
                    <p className="max-w-sm text-sm">
                      {m['create.empty_description']()}
                    </p>
                  </div>
                )}
              </div>

              {user && history.length > 0 && (
                <div>
                  <h2 className="mb-3 text-lg font-medium tracking-tight">
                    {m['create.history']()}
                  </h2>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                    {history.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setTaskId(item.id)}
                        title={item.prompt}
                        className="bg-muted group relative aspect-square overflow-hidden rounded-md border text-left"
                      >
                        {item.status === 'success' && item.url ? (
                          item.kind === 'video' ? (
                            <video
                              src={item.url}
                              muted
                              playsInline
                              preload="metadata"
                              className="size-full object-cover"
                            />
                          ) : (
                            <img
                              src={item.url}
                              alt={item.prompt}
                              loading="lazy"
                              className="size-full object-cover"
                            />
                          )
                        ) : (
                          <span className="text-muted-foreground flex size-full items-center justify-center p-3 text-center text-xs">
                            {item.status === 'failed'
                              ? m['create.failed']()
                              : m['create.generating']()}
                          </span>
                        )}
                        <span className="absolute inset-x-0 bottom-0 line-clamp-2 bg-gradient-to-t from-black/70 to-transparent p-2 pt-6 text-xs text-white opacity-0 transition group-hover:opacity-100">
                          {item.prompt}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </section>
          </div>
        </div>

        <Dialog open={paywall} onOpenChange={setPaywall}>
          <DialogContent className="max-h-[90vh] overflow-y-auto p-6 sm:max-w-5xl">
            <Pricing variant="dialog" title={m['create.paywall_title']()} />
          </DialogContent>
        </Dialog>
      </main>
      <Footer />
    </>
  );
}
