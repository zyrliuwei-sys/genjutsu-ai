import { useState } from 'react';

import { m } from '@/paraglide/messages.js';
import { getLocale } from '@/paraglide/runtime.js';
import { GenjutsuGenerator as Generator } from '@/components/genjutsu-generator';
import { TextVideoGenerator } from '@/components/text-video-generator';

export function GenjutsuGenerator() {
  // Mode switcher (Video Character Swap / Text to Video) is hidden for now.
  const [mode] = useState<'text' | 'edit'>('edit');
  return (
    <div>
      {mode === 'text' && (
        <TextVideoGenerator
          locale={getLocale()}
          copy={{
            title: m['landing.text_video.title'](),
            intro: m['landing.text_video.intro'](),
            prompt: m['landing.text_video.prompt'](),
            placeholder: m['landing.text_video.placeholder'](),
            duration: m['landing.text_video.duration'](),
            size: m['landing.text_video.size'](),
            quality: m['landing.text_video.quality'](),
            audio: m['landing.text_video.audio'](),
            generate: m['landing.text_video.generate'](),
            working: m['landing.text_video.working'](),
            empty: m['landing.text_video.empty'](),
            result: m['landing.text_video.result'](),
            download: m['landing.text_video.download'](),
            newVideo: m['landing.text_video.new_video'](),
            unavailable: m['landing.generator.service_unavailable'](),
            refund: m['landing.text_video.refund'](),
            retry: m['landing.text_video.retry'](),
            saveError: m['landing.text_video.save_error'](),
            history: m['landing.text_video.history'](),
            failed: m['landing.text_video.failed'](),
            restore: m['landing.text_video.restore'](),
            firstFrame: m['landing.text_video.first_frame'](),
            lastFrame: m['landing.text_video.last_frame'](),
            frameHint: m['landing.text_video.frame_hint'](),
            uploadFrame: m['landing.text_video.upload_frame'](),
            removeFrame: m['landing.text_video.remove_frame'](),
            invalidFrame: m['landing.text_video.invalid_frame'](),
            missingFirst: m['landing.text_video.missing_first'](),
            price: (price) => m['landing.text_video.price']({ price }),
          }}
        />
      )}
      {mode === 'edit' && (
        <Generator
          copy={{
            serviceUnavailable: m['landing.generator.service_unavailable'](),
            archivePending: m['landing.generator.archive_pending'](),
            generatedVideo: m['landing.generator.generated_video'](),
            priorRatioMismatch: (width, height, aspect) =>
              m['landing.generator.prior_ratio_mismatch']({
                width,
                height,
                aspect,
              }),
            ratioPadding: m['landing.generator.ratio_padding'](),
            generationCost: (count) =>
              m['landing.generator.generation_cost']({ count }),
            moreSettings: m['landing.generator.more_settings'](),
            uploadPhotoCta: m['landing.hero.cta'](),
            remainingGenerations: (count) =>
              m['landing.generator.remaining_generations']({ count }),
            generationRules: m['landing.pricing.per_video'](),
            legacyBalance: m['landing.generator.legacy_balance'](),
            contentPolicy: m['landing.generator.content_policy'](),
            referenceDisclaimer: m['landing.generator.reference_disclaimer'](),
            removeReference: m['landing.generator.remove_reference'](),
            removePhoto: m['landing.generator.remove_photo'](),
            referenceEmpty: m['landing.generator.reference_empty'](),
            uploadReference: m['landing.generator.upload_reference'](),
            customReference: m['landing.generator.custom_reference'](),
            referenceRequirements:
              m['landing.generator.reference_requirements'](),
            invalidVideoDuration:
              m['landing.generator.invalid_video_duration'](),
            videoDurationRange: (seconds) =>
              m['landing.generator.video_duration_range']({ seconds }),
            trimming: (percent) => m['landing.generator.trimming']({ percent }),
            trimFailed: m['landing.generator.trim_failed'](),
            trimmedReference: (start, end, total) =>
              m['landing.generator.trimmed_reference']({ start, end, total }),
            chargeDetails: (credits, price) =>
              m['landing.generator.charge_details']({ price }),
          }}
        />
      )}
    </div>
  );
}
