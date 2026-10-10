import { pricingCatalog } from '@/config/pricing';

export const VIDEO_PACKS = [
  'pack_starter',
  'pack_creator',
  'pack_pro',
] as const;
export function purchaseGuidance(requiredCredits: number, balanceCredits = 0) {
  const missing = Math.max(0, requiredCredits - Math.max(0, balanceCredits));
  const recommended =
    missing > 0
      ? VIDEO_PACKS.find((id) => pricingCatalog[id].credits >= missing)
      : undefined;
  return {
    recommended,
    coversClip: (id: string) =>
      Boolean(pricingCatalog[id] && pricingCatalog[id].credits >= missing),
  };
}
