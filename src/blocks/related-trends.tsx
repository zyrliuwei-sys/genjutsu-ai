import { tDynamic } from '@/core/i18n/dynamic';
import { RELATED_TRENDS, TREND_PAGES, type TrendSlug } from '@/config/trends';
import { m } from '@/paraglide/messages.js';
import { localizeHref } from '@/paraglide/runtime.js';
import { TrendLinkGrid } from '@/components/trend-link-grid';

export function RelatedTrends({ currentSlug }: { currentSlug: TrendSlug }) {
  return (
    <TrendLinkGrid
      id="related-trends"
      title={m['landing.trends.related_title']()}
      items={RELATED_TRENDS[currentSlug].map((slug) => {
        const trend = TREND_PAGES.find((item) => item.slug === slug)!;
        return {
          href: localizeHref(`/${trend.slug}`),
          label: tDynamic(`${trend.key}.nav`),
          description: tDynamic(
            trend.key === 'dime'
              ? 'dime.nav_description'
              : `landing.hero.${trend.key}_tag`
          ),
          image: trend.image,
        };
      })}
    />
  );
}
