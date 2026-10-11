/** Read display dimensions from ISO BMFF track headers, never payload string matches. */
export function mp4Dimensions(bytes: Uint8Array): {
  width: number;
  height: number;
} {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  function scan(
    start: number,
    end: number
  ): { width: number; height: number } | undefined {
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
      if (type === 'moov' || type === 'trak') {
        const found = scan(payload, offset + size);
        if (found) return found;
      } else if (type === 'tkhd') {
        const version = bytes[payload];
        const position = version === 1 ? 88 : 76;
        if (
          (version !== 0 && version !== 1) ||
          payload + position + 8 > offset + size
        )
          throw new Error('Invalid track dimensions');
        let width = view.getUint32(payload + position) / 65536;
        let height = view.getUint32(payload + position + 4) / 65536;
        const matrix = payload + (version === 1 ? 52 : 40);
        if (
          view.getInt32(matrix) === 0 &&
          view.getInt32(matrix + 16) === 0 &&
          Math.abs(view.getInt32(matrix + 4)) === 65536 &&
          Math.abs(view.getInt32(matrix + 12)) === 65536
        )
          [width, height] = [height, width];
        if (width > 0 && height > 0) return { width, height };
      }
      offset += size;
    }
  }
  const dimensions = scan(0, bytes.length);
  if (!dimensions) throw new Error('Video dimension metadata is missing');
  return dimensions;
}

export function matchesVideoAspect(
  width: number,
  height: number,
  aspect: string
) {
  const [w, h] = aspect.split(':').map(Number);
  return (
    width > 0 &&
    height > 0 &&
    w > 0 &&
    h > 0 &&
    Math.abs(width / height / (w / h) - 1) < 0.01
  );
}
