import { tDynamic } from '@/core/i18n/dynamic';
import { Link } from '@/core/i18n/navigation';
import { cn } from '@/lib/utils';
import { m } from '@/paraglide/messages.js';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

export const FAQ_KEYS = [
  'what',
  'higgsfield',
  'free',
  'shorts',
  'prompt',
  'ads',
  'models',
  'credits',
  'commercial',
  'formats',
] as const;

// Phones show a short FAQ: these questions only, with one-line answers.
const MOBILE_FAQ_KEYS = new Set<string>([
  'what',
  'free',
  'credits',
  'commercial',
  'higgsfield',
]);

export function FAQ() {
  return (
    <section
      id="faq"
      className="border-border scroll-mt-20 border-t px-4 py-24 sm:py-32"
    >
      <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-20">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <h2 className="eg-heading text-4xl leading-[1.05] sm:text-5xl">
            {m['landing.faq.title']()}
          </h2>
          <p className="text-muted-foreground mt-5 text-lg">
            <span className="max-md:hidden">
              {m['landing.faq.description']()}
            </span>
            <span className="md:hidden">
              {m['landing.faq.description_short']()}
            </span>
          </p>
        </div>
        <Accordion className="border-border w-full border-t">
          {FAQ_KEYS.map((key) => (
            <AccordionItem
              key={key}
              value={key}
              className={cn(!MOBILE_FAQ_KEYS.has(key) && 'max-md:hidden')}
            >
              <AccordionTrigger className="cursor-pointer py-6 text-left text-lg font-medium tracking-tight hover:no-underline">
                {tDynamic(`landing.faq.${key}.question`)}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground max-w-2xl pb-6 text-base leading-relaxed">
                {MOBILE_FAQ_KEYS.has(key) ? (
                  <>
                    <span className="max-md:hidden">
                      {tDynamic(`landing.faq.${key}.answer`)}
                    </span>
                    <span className="md:hidden">
                      {tDynamic(`landing.faq.${key}.answer_short`)}
                    </span>
                  </>
                ) : (
                  tDynamic(`landing.faq.${key}.answer`)
                )}
                {key === 'free' && (
                  <Link
                    href="/genjutsu-free"
                    className="text-primary focus-visible:outline-primary mt-3 block no-underline hover:no-underline focus-visible:outline-2 focus-visible:outline-offset-4"
                  >
                    {m['landing.resources.genjutsu-free.title']()}
                  </Link>
                )}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
