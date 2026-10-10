/** Client-side freshness only; the server still verifies the HMAC and owner. */
export function hasFreshVideoReceipt(
  receipt: { payload: string; signature: string } | undefined,
  url: string,
  now = Date.now()
) {
  try {
    if (!receipt || !/^[a-f0-9]{64}$/.test(receipt.signature)) return false;
    const data = JSON.parse(receipt.payload);
    return (
      data.url === url &&
      Number.isFinite(data.expires) &&
      data.expires > now + 60_000
    );
  } catch {
    return false;
  }
}
