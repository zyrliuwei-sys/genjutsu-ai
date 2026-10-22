import { useMemo, useState } from 'react';

import {
  CRAZY_FROG_THEMES,
  FLYING_CAR_THEMES,
  OZIL_THEMES,
} from '@/config/genjutsu';
import { pricingCatalog } from '@/config/pricing';
import { m } from '@/paraglide/messages.js';
import { getLocale } from '@/paraglide/runtime.js';
import { GenjutsuGenerator as Generator } from '@/components/genjutsu-generator';
import { TextVideoGenerator } from '@/components/text-video-generator';

export function GenjutsuGenerator({
  referenceOnly = false,
  returnPath,
  theme,
}: {
  referenceOnly?: boolean;
  returnPath?: string;
  theme?: 'crazy-frog' | 'flying-car' | 'ozil';
} = {}) {
  // Mode switcher (Video Character Swap / Text to Video) is hidden for now.
  const [mode] = useState<'text' | 'edit'>('edit');
  const locale = getLocale();
  const themed = useMemo(() => {
    if (theme === 'flying-car') {
      const names = [m['flycar.examples.ramp_flip']()];
      return {
        title: m['flycar.generator.title'](),
        choose: m['flycar.generator.choose'](),
        photo: m['flycar.generator.photo'](),
        photoHint: m['flycar.generator.photo_hint'](),
        generate: m['flycar.generator.generate'](),
        loading: m['flycar.generator.loading'](),
        retry: m['flycar.generator.retry'](),
        uploadTemplateId: 'flying-car-ai',
        sampleLabel: m['flycar.generator.sample'](),
        samples: (
          [
            ['car', m['flycar.examples.car']()],
            ['bicycle', m['flycar.examples.bicycle']()],
            ['carriage', m['flycar.examples.carriage']()],
            ['skateboard', m['flycar.examples.skateboard']()],
          ] as const
        ).map(([slug, name]) => ({
          id: slug,
          name,
          clip: `/videos/flying-car/${slug}.mp4`,
          poster: `/videos/flying-car/${slug}.jpg`,
        })),
        templates: FLYING_CAR_THEMES.map((item, i) => ({
          id: `flying-car-${item.slug}`,
          name: names[i],
          asset: `flying-car-${item.slug}`,
          image: `/videos/flying-car/references/${item.slug}.jpg`,
          thumb: `/videos/flying-car/references/${item.slug}.jpg`,
          clip: `/videos/flying-car/references/${item.slug}.mp4`,
          duration: 10,
          ratios: '16:9',
          prompt: '',
        })),
      };
    }
    if (theme === 'ozil') {
      const names = [
        m['ozil.examples.red_hoodie'](),
        m['ozil.examples.five_a_side'](),
        m['ozil.examples.office_shirt'](),
      ];
      return {
        title: m['ozil.generator.title'](),
        choose: m['ozil.generator.choose'](),
        photo: m['ozil.generator.photo'](),
        photoHint: m['ozil.generator.photo_hint'](),
        generate: m['ozil.generator.generate'](),
        loading: m['ozil.generator.loading'](),
        retry: m['ozil.generator.retry'](),
        uploadTemplateId: 'ozil-ai',
        pickerInPanel: true,
        templates: OZIL_THEMES.map((item, i) => ({
          id: `ozil-${item.slug}`,
          name: names[i],
          asset: `ozil-${item.slug}`,
          image: `/videos/ozil/${item.slug}.jpg`,
          thumb: `/videos/ozil/${item.slug}.jpg`,
          clip: `/videos/ozil/references/${item.slug}.mp4`,
          duration: 10,
          ratios: '9:16',
          prompt: '',
        })),
      };
    }
    if (theme !== 'crazy-frog') return undefined;
    const names = [
      m['frog.examples.overpass'](),
      m['frog.examples.neon'](),
      m['frog.examples.chocolate'](),
      m['frog.examples.pixel'](),
      m['frog.examples.circuit'](),
      m['frog.examples.halloween'](),
    ];
    return {
      title: m['frog.generator.title'](),
      choose: m['frog.generator.choose'](),
      photo: m['frog.generator.photo'](),
      photoHint: m['frog.generator.photo_hint'](),
      generate: m['frog.generator.generate'](),
      loading: m['frog.generator.loading'](),
      retry: m['frog.generator.retry'](),
      uploadTemplateId: 'crazy-frog-ai',
      templates: CRAZY_FROG_THEMES.map((item, i) => ({
        id: `crazy-frog-${item.slug}`,
        name: names[i],
        asset: `crazy-frog-${item.slug}`,
        image: `/videos/crazy-frog/${item.slug}.jpg`,
        thumb: `/videos/crazy-frog/${item.slug}.jpg`,
        clip: `/videos/crazy-frog/references/${item.slug}.mp4?v=fill`,
        duration: 10,
        ratios: '16:9',
        prompt: '',
      })),
    };
  }, [theme, locale]);

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
          referenceOnly={referenceOnly}
          returnPath={returnPath}
          theme={themed}
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
            moreSettings: m['landing.generator.more_settings'](),
            generatingTitle: m['landing.generator.generating_title'](),
            generatingPreparing: m['landing.generator.generating_preparing'](),
            generatingEta: (minutes) =>
              m['landing.generator.generating_eta']({ minutes }),
            videoReading: m['landing.generator.video_reading'](),
            videoPreparing: m['landing.generator.video_preparing'](),
            uploadPhotoCta: m['landing.hero.cta'](),
            remainingGenerations: (count) =>
              m['landing.generator.remaining_generations']({ count }),
            generationRules: m['landing.pricing.per_video'](),
            contentPolicy: m['landing.generator.content_policy'](),
            generationBusy: m['landing.generator.generation_busy'](),
            generationFailed: m['landing.generator.generation_failed'](),
            failedTitle: m['landing.generator.failed_title'](),
            retry: m['landing.generator.retry'](),
            paywallTitle: m['landing.generator.paywall_title'](),
            paywallFirst: m['landing.generator.paywall_first']({
              price: `$${(pricingCatalog.pack_starter.priceInCents / 100).toFixed(2)}`,
            }),
            paywallTopUp: m['landing.generator.paywall_top_up'](),
            yourVideo: m['landing.generator.your_video'](),
            summaryMotion: m['landing.generator.summary_motion'](),
            summaryPhoto: m['landing.generator.summary_photo'](),
            firstPrice: m['landing.generator.first_price']({
              price: `$${(pricingCatalog.pack_starter.priceInCents / 100).toFixed(2)}`,
            }),
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
            compare: {
              before: m['landing.swap.before'](),
              after: m['landing.swap.after'](),
              slider: m['landing.swap.slider'](),
            },
            ui: {
              aiEffects: m['landing.generator.ui.ai_effects'](),
              effect: m['landing.generator.ui.effect'](),
              selectEffect: m['landing.generator.ui.select_effect'](),
              yourPhoto: m['landing.generator.ui.your_photo'](),
              photoHint: m['landing.generator.ui.photo_hint'](),
              uploadPhoto: m['landing.generator.ui.upload_photo'](),
              generateNow: m['landing.generator.ui.generate_now'](),
              videoSize: m['landing.generator.ui.video_size'](),
              referenceExample: m['landing.generator.ui.reference_example'](),
              myWork: m['landing.generator.ui.my_work'](),
              download: m['landing.generator.ui.download'](),
              loadVideoFailed: m['landing.generator.ui.load_video_failed'](),
              restoreFailed: m['landing.generator.ui.restore_failed'](),
              onlyImages: m['landing.generator.ui.only_images'](),
              onlyVideos: m['landing.generator.ui.only_videos'](),
              imageTooSmall: m['landing.generator.ui.image_too_small'](),
              needAssets: m['landing.generator.ui.need_assets'](),
              waitReference: m['landing.generator.ui.wait_reference'](),
              unsupportedSize: m['landing.generator.ui.unsupported_size'](),
              unsupportedRatio: m['landing.generator.ui.unsupported_ratio'](),
              verifyBalanceFailed:
                m['landing.generator.ui.verify_balance_failed'](),
              saveMediaSignIn: m['landing.generator.ui.save_media_sign_in'](),
              saveMediaCheckout:
                m['landing.generator.ui.save_media_checkout'](),
              generationCanceled:
                m['landing.generator.ui.generation_canceled'](),
              noGeneratedVideo: m['landing.generator.ui.no_generated_video'](),
              closeVideo: m['landing.generator.ui.close_video'](),
              dismiss: m['landing.generator.ui.dismiss'](),
            },
          }}
        />
      )}
    </div>
  );
}
