/** Read the ISO BMFF movie header, skipping media data instead of searching
 * arbitrary payload bytes. Used server-side to price the actual uploaded file. */
export function mp4Duration(bytes: Uint8Array): number {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  function scan(start: number, end: number): number | undefined {
    for (let offset = start; offset + 8 <= end; ) {
      let size = view.getUint32(offset);
      const type = String.fromCharCode(
        ...bytes.subarray(offset + 4, offset + 8)
      );
      let header = 8;
      if (size === 1) {
        if (offset + 16 > end) throw new Error('Invalid video header');
        size = Number(view.getBigUint64(offset + 8));
        header = 16;
      } else if (size === 0) size = end - offset;
      if (!Number.isSafeInteger(size) || size < header || offset + size > end)
        throw new Error('Invalid video header');
      const payload = offset + header;
      if (type === 'moov') {
        const duration = scan(payload, offset + size);
        if (duration !== undefined) return duration;
      }
      if (type === 'mvhd') {
        const version = bytes[payload];
        const scaleOffset = payload + (version === 1 ? 20 : 12);
        const durationOffset = scaleOffset + 4;
        if (
          (version !== 0 && version !== 1) ||
          durationOffset + (version === 1 ? 8 : 4) > offset + size
        )
          throw new Error('Invalid movie duration');
        const scale = view.getUint32(scaleOffset);
        const ticks =
          version === 1
            ? Number(view.getBigUint64(durationOffset))
            : view.getUint32(durationOffset);
        const seconds = ticks / scale;
        if (!scale || !Number.isFinite(seconds) || seconds <= 0)
          throw new Error('Invalid movie duration');
        return seconds;
      }
      offset += size;
    }
  }
  const duration = scan(0, bytes.length);
  if (duration === undefined)
    throw new Error('Video duration metadata is missing');
  return duration;
}
