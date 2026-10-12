import { useMutation, useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { Download, Loader2, Video } from 'lucide-react';
import { toast } from 'sonner';

import { Link } from '@/core/i18n/navigation';
import { apiDownload, apiGet } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { m } from '@/paraglide/messages.js';
import { buttonVariants } from '@/components/ui/button';

type StudioTask = {
  id: string;
  status: string;
  kind: 'video' | 'image';
  aspect: string;
  referenceName?: string;
  url: string | null;
  archivePending: boolean;
  createdAt: string;
};

function VideosPage() {
  const query = useQuery({
    queryKey: ['studio-tasks'],
    queryFn: () => apiGet<StudioTask[]>('/api/studio/tasks'),
    // Keep in-progress cards fresh until they finish.
    refetchInterval: (q) =>
      q.state.data?.some(
        (task) =>
          task.status === 'pending' ||
          task.status === 'processing' ||
          task.archivePending
      )
        ? 15000
        : false,
  });
  const download = useMutation({
    mutationFn: (id: string) =>
      apiDownload(`/api/studio/download?id=${encodeURIComponent(id)}`),
    onError: (error: Error) => toast.error(error.message),
  });
  const videos = (query.data ?? []).filter((task) => task.kind === 'video');

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">
          {m['settings.videos.title']()}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {m['settings.videos.description']()}
        </p>
      </div>

      {query.isPending ? (
        <div className="flex justify-center py-20">
          <Loader2 className="text-muted-foreground size-6 animate-spin" />
        </div>
      ) : videos.length === 0 ? (
        <div className="border-border flex flex-col items-center gap-4 rounded-xl border border-dashed py-20 text-center">
          <Video className="text-muted-foreground size-8" />
          <p className="text-muted-foreground text-sm">
            {m['settings.videos.empty']()}
          </p>
          <Link href="/create" className={cn(buttonVariants())}>
            {m['settings.videos.create']()}
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
          {videos.map((task) => {
            const ready =
              task.status === 'success' && task.url && !task.archivePending;
            return (
              <div
                key={task.id}
                className="border-border bg-card overflow-hidden rounded-xl border"
              >
                <div
                  style={{ aspectRatio: task.aspect.replace(':', ' / ') }}
                  className="bg-muted relative flex max-h-[420px] w-full items-center justify-center"
                >
                  {task.status === 'success' && task.url ? (
                    <video
                      src={task.url}
                      controls
                      playsInline
                      preload="metadata"
                      className="absolute inset-0 size-full object-contain"
                    />
                  ) : (
                    <span className="text-muted-foreground flex items-center gap-2 px-3 text-center text-xs">
                      {task.status === 'failed' ? (
                        m['settings.videos.failed']()
                      ) : (
                        <>
                          <Loader2 className="size-4 animate-spin" />
                          {m['settings.videos.processing']()}
                        </>
                      )}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between gap-2 p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {task.referenceName || 'Video'}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {new Date(task.createdAt).toLocaleString()}
                    </p>
                  </div>
                  {task.status === 'success' && (
                    <button
                      type="button"
                      disabled={!ready || download.isPending}
                      onClick={() => download.mutate(task.id)}
                      aria-label={m['settings.videos.download']()}
                      title={
                        ready
                          ? m['settings.videos.download']()
                          : m['settings.videos.saving']()
                      }
                      className={cn(
                        buttonVariants({ size: 'icon', variant: 'outline' }),
                        'shrink-0'
                      )}
                    >
                      {download.isPending && download.variables === task.id ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Download className="size-4" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export const Route = createFileRoute('/settings/videos')({
  component: VideosPage,
});
