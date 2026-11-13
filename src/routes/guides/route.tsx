import { createFileRoute, Outlet } from '@tanstack/react-router';
import { MDXProvider } from '@mdx-js/react';

import { Footer } from '@/blocks/footer';
import { Header } from '@/blocks/header';
import { mdxComponents } from '@/components/mdx-components';

// Load article styling with the route so the server-rendered body is styled
// before its lazy MDX module hydrates. Selectors are scoped to this guide.
import '@/styles/sheru-guide.css';

export const Route = createFileRoute('/guides')({
  component: GuidesLayout,
});

function GuidesLayout() {
  return (
    <>
      <Header />
      <main className="px-4 pt-28 pb-20 sm:pt-32">
        <MDXProvider components={mdxComponents}>
          <Outlet />
        </MDXProvider>
      </main>
      <Footer />
    </>
  );
}
