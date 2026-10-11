import { Link } from '@/core/i18n/navigation';
import { m } from '@/paraglide/messages.js';

export function Guide() {
  return (
    <section
      id="guide"
      className="border-border scroll-mt-20 border-t px-4 py-16"
    >
      <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-2">
        <h2 className="eg-heading text-4xl">{m['landing.guide.title']()}</h2>
        <div className="text-muted-foreground space-y-4 text-lg leading-relaxed">
          <p>{m['landing.guide.p1']()}</p>
          <p>{m['landing.guide.p2']()}</p>
          <Link
            href="/higgsfield-genjutsu-alternative"
            className="text-primary focus-visible:outline-primary no-underline hover:no-underline focus-visible:outline-2 focus-visible:outline-offset-4"
          >
            {m['landing.resources.higgsfield-genjutsu-alternative.title']()}
          </Link>
        </div>
      </div>
    </section>
  );
}

export function Compare() {
  return (
    <section
      id="compare"
      className="border-border bg-muted/40 scroll-mt-20 border-y px-4 py-16"
    >
      <div className="mx-auto max-w-7xl space-y-12">
        <div className="grid gap-8 lg:grid-cols-2">
          <h2 className="eg-heading text-4xl">
            {m['landing.compare.title']()}
          </h2>
          <div className="text-muted-foreground space-y-4 text-lg leading-relaxed">
            <p>{m['landing.compare.description']()}</p>
            <Link
              href="/higgsfield-genjutsu-alternative"
              className="text-primary focus-visible:outline-primary no-underline hover:no-underline focus-visible:outline-2 focus-visible:outline-offset-4"
            >
              {m['landing.compare.link']()}
            </Link>
          </div>
        </div>
        <div className="grid gap-8 lg:grid-cols-2">
          <h2 className="eg-heading text-4xl">{m['landing.free.title']()}</h2>
          <div className="text-muted-foreground space-y-4 text-lg leading-relaxed">
            <p>{m['landing.free.p1']()}</p>
            <p>{m['landing.free.p2']()}</p>
            <Link
              href="/genjutsu-free"
              className="text-primary focus-visible:outline-primary no-underline hover:no-underline focus-visible:outline-2 focus-visible:outline-offset-4"
            >
              {m['landing.resources.genjutsu-free.title']()}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
