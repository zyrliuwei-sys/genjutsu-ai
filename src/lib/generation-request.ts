/** A client retry must keep the same key; a new deliberate render gets a new key. */
export function validGenerationRequestId(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value
    )
  );
}

export async function generationTaskId(userId: string, requestId: string) {
  const bytes = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(JSON.stringify([userId, requestId]))
  );
  return (
    'gen_' +
    [...new Uint8Array(bytes)]
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
  );
}
