import { tDynamic } from '@/core/i18n/dynamic';
import { TREND_PAGES } from '@/config/trends';
import { m } from '@/paraglide/messages.js';
import { localizeHref } from '@/paraglide/runtime.js';
import { TrendLinkGrid } from '@/components/trend-link-grid';

export function TrendingEffects() {
  return (
    <TrendLinkGrid
      id="trending-ai-video-effects"
      title={m['landing.trends.title']()}
      description={m['landing.trends.description']()}
      items={TREND_PAGES.map((trend) => ({
        href: localizeHref(`/${trend.slug}`),
        label: tDynamic(`${trend.key}.nav`),
        description: tDynamic(
          trend.key === 'dime'
            ? 'dime.nav_description'
            : `landing.hero.${trend.key}_tag`
        ),
        image: trend.image,
      }))}
    />
  );
}
