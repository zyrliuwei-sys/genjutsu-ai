import { m } from '@/paraglide/messages.js';
import { GenjutsuGenerator as Generator } from '@/components/genjutsu-generator';

export function GenjutsuGenerator() {
  return (
    <Generator
      copy={{
        serviceUnavailable: m['landing.generator.service_unavailable'](),
        archivePending: m['landing.generator.archive_pending'](),
        generationCost: (count) =>
          m['landing.generator.generation_cost']({ count }),
        remainingGenerations: (count) =>
          m['landing.generator.remaining_generations']({ count }),
        generationRules: m['landing.pricing.per_video'](),
        legacyBalance: m['landing.generator.legacy_balance'](),
        referenceDisclaimer: m['landing.generator.reference_disclaimer'](),
        removeReference: m['landing.generator.remove_reference'](),
        removePhoto: m['landing.generator.remove_photo'](),
        referenceEmpty: m['landing.generator.reference_empty'](),
        uploadReference: m['landing.generator.upload_reference'](),
        customReference: m['landing.generator.custom_reference'](),
        referenceRequirements: m['landing.generator.reference_requirements'](),
        invalidVideoDuration: m['landing.generator.invalid_video_duration'](),
        videoDurationRange: (seconds) =>
          m['landing.generator.video_duration_range']({ seconds }),
        trimming: (percent) => m['landing.generator.trimming']({ percent }),
        trimFailed: m['landing.generator.trim_failed'](),
        trimmedReference: (start, end, total) =>
          m['landing.generator.trimmed_reference']({ start, end, total }),
        chargeDetails: (credits, price) =>
          m['landing.generator.charge_details']({ credits, price }),
      }}
    />
  );
}
