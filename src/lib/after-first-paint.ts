// Runs `callback` once the visitor interacts with the page, or once the page
// has loaded and gone idle for `delayMs` — whichever comes first. Used to
// keep third-party scripts (GA, Google One Tap) off the critical render path.
// Returns a cleanup that cancels the pending run.
export function afterFirstPaint(callback: () => void, delayMs = 3500) {
  if (typeof window === 'undefined') return () => {};
  let done = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const events = ['pointerdown', 'keydown', 'scroll', 'touchstart'] as const;

  const run = () => {
    if (done) return;
    done = true;
    cleanup();
    callback();
  };
  const startTimer = () => {
    timer = setTimeout(() => {
      if ('requestIdleCallback' in window) {
        window.requestIdleCallback(run, { timeout: 2000 });
      } else {
        run();
      }
    }, delayMs);
  };
  const cleanup = () => {
    events.forEach((name) => window.removeEventListener(name, run));
    window.removeEventListener('load', startTimer);
    if (timer) clearTimeout(timer);
  };

  events.forEach((name) =>
    window.addEventListener(name, run, { once: true, passive: true })
  );
  if (document.readyState === 'complete') startTimer();
  else window.addEventListener('load', startTimer, { once: true });

  return () => {
    done = true;
    cleanup();
  };
}
