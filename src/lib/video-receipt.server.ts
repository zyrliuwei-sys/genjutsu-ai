import { envConfigs } from '@/config';

async function key() {
  if (!envConfigs.auth_secret) throw new Error('Server signing key is missing');
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(envConfigs.auth_secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}
export async function signVideoReceipt(
  url: string,
  duration: number,
  owner: string
) {
  const payload = JSON.stringify({
    url,
    duration,
    owner,
    expires: Date.now() + 48 * 60 * 60 * 1000,
  });
  const signature = new Uint8Array(
    await crypto.subtle.sign(
      'HMAC',
      await key(),
      new TextEncoder().encode(payload)
    )
  );
  return {
    payload,
    signature: Array.from(signature, (b) =>
      b.toString(16).padStart(2, '0')
    ).join(''),
  };
}
export async function verifyVideoReceipt(
  receipt: unknown,
  url: string,
  owner: string
): Promise<number> {
  if (!receipt || typeof receipt !== 'object')
    throw new Error('Upload the reference video again to verify its price');
  const { payload, signature } = receipt as {
    payload: string;
    signature: string;
  };
  if (
    typeof payload !== 'string' ||
    payload.length > 4096 ||
    typeof signature !== 'string' ||
    !/^[a-f0-9]{64}$/.test(signature)
  )
    throw new Error('Invalid video receipt');
  const bytes = Uint8Array.from(signature.match(/../g)!, (hex) =>
    parseInt(hex, 16)
  );
  if (
    !(await crypto.subtle.verify(
      'HMAC',
      await key(),
      bytes,
      new TextEncoder().encode(payload)
    ))
  )
    throw new Error('Invalid video receipt');
  const data = JSON.parse(payload);
  if (
    data.owner !== owner ||
    data.url !== url ||
    data.expires < Date.now() ||
    !Number.isFinite(data.duration) ||
    data.duration < 3 ||
    data.duration > 10.05
  )
    throw new Error(
      'Expired or invalid video receipt; upload the reference video again'
    );
  return data.duration;
}
