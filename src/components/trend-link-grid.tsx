import { ArrowUpRight } from 'lucide-react';

export type TrendLink = {
  href: string;
  label: string;
  description: string;
  image: string;
};

/** Plain anchors and eager markup keep discovery links readable without JS. */
export function TrendLinkGrid({
  id,
  title,
  description,
  items,
}: {
  id: string;
  title: string;
  description?: string;
  items: TrendLink[];
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className="border-border border-t px-4 py-12 sm:py-20"
    >
      <div className="mx-auto max-w-7xl">
        <h2 id={`${id}-title`} className="eg-heading text-3xl sm:text-4xl">
          {title}
        </h2>
        {description && (
          <p className="text-muted-foreground mt-3 max-w-2xl text-sm sm:text-base">
            {description}
          </p>
        )}
        <ul className="mt-7 grid grid-cols-[repeat(auto-fit,minmax(min(100%,20rem),1fr))] gap-3">
          {items.map((item) => (
            <li key={item.href}>
              <a
                href={item.href}
                className="group border-border bg-card hover:border-primary/50 focus-visible:outline-primary flex h-full items-center gap-4 rounded-xl border p-3 transition-colors focus-visible:outline-2 focus-visible:outline-offset-4"
              >
                <img
                  src={item.image}
                  alt=""
                  width={72}
                  height={88}
                  loading="lazy"
                  decoding="async"
                  className="h-22 w-18 shrink-0 rounded-lg object-cover"
                />
                <span className="min-w-0 flex-1">
                  <span className="text-foreground block text-base font-medium">
                    {item.label}
                  </span>
                  <span className="text-muted-foreground mt-1 block text-sm">
                    {item.description}
                  </span>
                </span>
                <ArrowUpRight
                  aria-hidden="true"
                  className="text-muted-foreground group-hover:text-primary size-4 shrink-0"
                />
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
