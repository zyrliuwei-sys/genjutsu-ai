import { useEffect } from 'react';

import { afterFirstPaint } from '@/lib/after-first-paint';

// Microsoft Clarity (session recordings + heatmaps). Same loading strategy as
// GA: the tag is injected after first interaction or once the page is idle,
// keeping it off the critical rendering path.
export function Clarity({ projectId }: { projectId: string }) {
  const valid = /^[a-z0-9]{1,32}$/i.test(projectId);

  useEffect(() => {
    if (!valid) return;
    return afterFirstPaint(() => {
      if (document.getElementById('clarity-loader')) return;
      const w = window as any;
      // Queue stub from Clarity's official snippet: buffers clarity() calls
      // until the tag loads.
      w.clarity =
        w.clarity ||
        function (...args: unknown[]) {
          (w.clarity.q = w.clarity.q || []).push(args);
        };
      const script = document.createElement('script');
      script.id = 'clarity-loader';
      script.async = true;
      script.src = `https://www.clarity.ms/tag/${encodeURIComponent(projectId)}`;
      document.head.appendChild(script);
    });
  }, [projectId, valid]);

  return null;
}
