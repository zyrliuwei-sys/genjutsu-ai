import { createFileRoute, Outlet } from '@tanstack/react-router';
import { MDXProvider } from '@mdx-js/react';

import { mdxComponents } from '@/components/mdx-components';

export const Route = createFileRoute('/(pages)')({
  component: PagesLayout,
});

function PagesLayout() {
  return (
    <div className="bg-background min-h-screen">
      <div className="mx-auto max-w-3xl px-6 pt-8 pb-12 md:px-8 md:pb-16">
        <MDXProvider components={mdxComponents}>
          <Outlet />
        </MDXProvider>
      </div>
    </div>
  );
}
