import { createFileRoute } from '@tanstack/react-router';

import { buildLlmsTxt } from '@/lib/llms';

export const Route = createFileRoute('/llms-full.txt')({
  server: {
    handlers: {
      GET: async () =>
        new Response(buildLlmsTxt({ full: true }), {
          headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        }),
    },
  },
});
