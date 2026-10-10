import { m } from '@/paraglide/messages.js';
import { GenjutsuGenerator as Generator } from '@/components/genjutsu-generator';

export function GenjutsuGenerator() {
  return (
    <Generator
      copy={{
        generationCost: (count) =>
          m['landing.generator.generation_cost']({ count }),
        remainingGenerations: (count) =>
          m['landing.generator.remaining_generations']({ count }),
        generationRules: m['landing.pricing.per_video'](),
        legacyBalance: m['landing.generator.legacy_balance'](),
        referenceDisclaimer: m['landing.generator.reference_disclaimer'](),
      }}
    />
  );
}
