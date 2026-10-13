import { useEffect } from 'react';

import { afterFirstPaint } from '@/lib/after-first-paint';

// GA4 (gtag.js). The tiny `gtag()` queue stub ships in the SSR HTML so
// track() calls made before the library arrives are buffered in dataLayer;
// the ~175 KiB gtag.js loader itself is injected after first interaction or
// once the page is idle, keeping it off the critical rendering path.
export function GoogleAnalytics({ measurementId }: { measurementId: string }) {
  const valid = /^[A-Za-z0-9_-]{1,64}$/.test(measurementId);

  useEffect(() => {
    if (!valid) return;
    return afterFirstPaint(() => {
      if (document.getElementById('ga-loader')) return;
      const script = document.createElement('script');
      script.id = 'ga-loader';
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
      document.head.appendChild(script);
    });
  }, [measurementId, valid]);

  if (!valid) return null;
  return (
    // async={true} flags this to React 19 as a hoistable resource — without
    // it, React logs the "Encountered a script tag while rendering React
    // component" warning.
    <script
      id="ga-init"
      async
      dangerouslySetInnerHTML={{
        __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config',${JSON.stringify(measurementId)});`,
      }}
    />
  );
}
