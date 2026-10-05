import { DEFAULT_FOOTER_BADGES } from '@/features/footer-badges/defaults';
import { parseStoredFooterBadges } from '@/features/footer-badges/validation';

import { cn } from '@/lib/utils';
import { usePublicConfig } from '@/hooks/use-public-config';

export function FooterBadgeList({ className }: { className?: string }) {
  const { data } = usePublicConfig();
  const badges =
    data?.footer_badges === undefined
      ? DEFAULT_FOOTER_BADGES
      : parseStoredFooterBadges(data.footer_badges);

  if (badges.length === 0) return null;

  // The list is rendered twice so translateX(-50%) loops seamlessly.
  const renderSet = (copy: boolean) =>
    badges.map((badge) => (
      <a
        key={`${copy ? 'b' : 'a'}:${badge.href}:${badge.src}`}
        href={badge.href}
        target="_blank"
        rel="noopener noreferrer"
        aria-hidden={copy || undefined}
        tabIndex={copy ? -1 : undefined}
        className="shrink-0 pr-4 opacity-70 transition-opacity hover:opacity-100"
      >
        <img
          src={badge.src}
          alt={copy ? '' : badge.alt}
          width={badge.width ?? 250}
          height={badge.height}
          loading="lazy"
          className="h-7 w-auto max-w-none"
        />
      </a>
    ));

  return (
    <div
      className={cn(
        'overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]',
        className
      )}
    >
      <div className="eg-marquee flex w-max items-center">
        {renderSet(false)}
        {renderSet(true)}
      </div>
    </div>
  );
}
