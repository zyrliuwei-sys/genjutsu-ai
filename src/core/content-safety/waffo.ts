import {
  Environment,
  ScanAction,
  ScanSemanticMode,
  WaffoPancake,
  type ScanResult,
} from '@waffo/pancake-ts';

export type PromptSafetyConfigs = Record<string, string | undefined>;

export type PromptSafetyLocale = 'en' | 'zh' | 'ja';

const SUPPORTED_LOCALES = new Set<PromptSafetyLocale>(['en', 'zh', 'ja']);

function resolveLocale(value?: string): PromptSafetyLocale {
  const locale = value?.toLowerCase().split('-')[0] as PromptSafetyLocale;
  return SUPPORTED_LOCALES.has(locale) ? locale : 'en';
}

function resolveSemanticMode(value?: string): ScanSemanticMode {
  switch (value) {
    case ScanSemanticMode.Off:
      return ScanSemanticMode.Off;
    case ScanSemanticMode.Shadow:
      return ScanSemanticMode.Shadow;
    case ScanSemanticMode.Enforce:
    default:
      return ScanSemanticMode.Enforce;
  }
}

/**
 * Scan a prompt before it reaches an image/video provider.
 *
 * Waffo's content-safety service is stateless. We intentionally fail closed:
 * a missing credential, provider error, review verdict, or block verdict must
 * never turn into an unmoderated generation request.
 */
export async function scanPromptWithWaffo(
  prompt: string,
  configs: PromptSafetyConfigs,
  locale?: string
): Promise<ScanResult | null> {
  if (configs.waffo_prompt_safety_enabled === 'false') return null;

  const merchantId = configs.waffo_merchant_id?.trim();
  const privateKey = configs.waffo_private_key?.trim();
  if (!merchantId || !privateKey) {
    throw new Error('Prompt safety screening is not configured');
  }

  const environment =
    configs.waffo_environment === 'test' ? Environment.Test : Environment.Prod;
  const client = new WaffoPancake({
    merchantId,
    privateKey,
    environment,
  });

  try {
    return await client.contentSafety.scanPrompt({
      prompt,
      locale: resolveLocale(locale),
      semantic: resolveSemanticMode(configs.waffo_prompt_safety_semantic),
    });
  } catch (error) {
    console.error('[prompt-safety] Waffo screening failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw new Error('Prompt safety screening is temporarily unavailable');
  }
}

export function promptSafetyError(result: ScanResult): string {
  return result.action === ScanAction.Block
    ? 'This prompt cannot be used for generation.'
    : 'This prompt requires safety review before generation.';
}
