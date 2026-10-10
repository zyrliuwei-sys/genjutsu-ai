import { m } from '@/paraglide/messages.js';
import { GenjutsuGenerator as Generator } from '@/components/genjutsu-generator';

export function GenjutsuGenerator() {
  return (
    <Generator
      copy={{
        uploadTitle: m['landing.generator.upload_title'](),
        backgroundLabel: m['landing.generator.background_label'](),
        keepBackground: m['landing.generator.keep_background'](),
        changeBackground: m['landing.generator.change_background'](),
        backgroundDescription: m['landing.generator.background_description'](),
        backgroundPlaceholder: m['landing.generator.background_placeholder'](),
        backgroundRequired: m['landing.generator.background_required'](),
        backgroundPresets: [
          {
            id: 'rooftop',
            label: m['landing.generator.background_rooftop'](),
            description:
              m['landing.generator.background_rooftop_description'](),
          },
          {
            id: 'neon',
            label: m['landing.generator.background_neon'](),
            description: m['landing.generator.background_neon_description'](),
          },
          {
            id: 'beach',
            label: m['landing.generator.background_beach'](),
            description: m['landing.generator.background_beach_description'](),
          },
          {
            id: 'forest',
            label: m['landing.generator.background_forest'](),
            description: m['landing.generator.background_forest_description'](),
          },
          {
            id: 'studio',
            label: m['landing.generator.background_studio'](),
            description: m['landing.generator.background_studio_description'](),
          },
          {
            id: 'cafe',
            label: m['landing.generator.background_cafe'](),
            description: m['landing.generator.background_cafe_description'](),
          },
        ],
        moreSettings: m['landing.generator.more_settings'](),
        originalLabel: m['landing.generator.original_label'](),
        previewTitle: m['landing.generator.preview_title'](),
        previewEmpty: m['landing.generator.preview_empty'](),
        generationCost: (count) =>
          m['landing.generator.generation_cost']({ count }),
        remainingGenerations: (count) =>
          m['landing.generator.remaining_generations']({ count }),
        generationRules: m['landing.pricing.per_video'](),
        durationLabel: m['landing.generator.duration_label'](),
        durationHint: m['landing.generator.duration_hint'](),
        durationOption: (seconds, count) =>
          m['landing.generator.duration_option']({ seconds, count }),
        durationMismatch: m['landing.generator.duration_mismatch'](),
        legacyBalance: m['landing.generator.legacy_balance'](),
        referenceDisclaimer: m['landing.generator.reference_disclaimer'](),
        intro: m['landing.generator.intro'](),
        steps: m['landing.generator.steps'](),
        buy: m['landing.generator.buy'](),
        from: (price) => m['landing.generator.from']({ price }),
        sample: m['landing.generator.sample'](),
        samplePickerTitle: m['landing.generator.sample_picker_title'](),
        sampleNames: {
          dance: m['landing.generator.sample_dance'](),
          action: m['landing.generator.sample_action'](),
          parkour: m['landing.generator.sample_parkour'](),
          walk: m['landing.generator.sample_walk'](),
        },
        removeVideo: m['landing.generator.remove_video'](),
        removePhoto: m['landing.generator.remove_photo'](),
        sampleLoading: m['landing.generator.sample_loading'](),
        sampleDisclaimer: m['landing.generator.sample_disclaimer'](),
        sampleError: m['landing.generator.sample_error'](),
        sampleReplace: m['landing.generator.sample_replace'](),
        sampleReplaceHint: m['landing.generator.sample_replace_hint'](),
        keepFiles: m['landing.generator.keep_files'](),
        videoFormats: (max) => m['landing.generator.video_formats']({ max }),
        videoRequirements: (max) =>
          m['landing.generator.video_requirements']({ max }),
        imageRequirements: m['landing.generator.image_requirements'](),
        draftWarning: m['landing.generator.draft_warning'](),
        generate: m['landing.generator.generate'](),
        clipCost: (seconds, count) =>
          m['landing.generator.clip_cost']({ seconds, count }),
        referenceLabel: m['landing.generator.reference_label'](),
        workLabel: m['landing.generator.work_label'](),
        compareLabel: m['landing.generator.compare_label'](),
        compareHint: m['landing.generator.compare_hint'](),
        before: m['landing.generator.before'](),
        after: m['landing.generator.after'](),
        compareEmpty: m['landing.generator.compare_empty'](),
        compareMissing: m['landing.generator.compare_missing'](),
        comparePlay: m['landing.generator.compare_play'](),
        referenceDuration: m['landing.generator.reference_duration'](),
      }}
    />
  );
}
