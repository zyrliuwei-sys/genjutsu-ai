/**
 * Face detection with pico.js (MIT, https://github.com/nenadmarkus/picojs).
 * Vendored and typed: ~200 lines of pure JS, no dependencies, runs on any
 * grayscale pixel array — used to auto-crop uploaded portraits so the swap
 * model always receives a usable close-up of the person's face.
 */

export type ClassifyRegion = (
  r: number,
  c: number,
  s: number,
  pixels: Float32Array | Uint8Array,
  ldim: number
) => number;

/** Detection: [row (center), column (center), scale (≈ face size), score]. */
export type Detection = [number, number, number, number];

export type GrayImage = {
  pixels: Float32Array | Uint8Array;
  nrows: number;
  ncols: number;
  ldim: number;
};

export type ScanParams = {
  shiftfactor: number;
  minsize: number;
  maxsize: number;
  scalefactor: number;
};

/** Unpack the facefinder cascade binary into a region classifier. */
export function unpackCascade(bytes: Uint8Array): ClassifyRegion {
  const dview = new DataView(new ArrayBuffer(4));
  // The first 8 bytes (cascade version + learning metadata) are skipped.
  let p = 8;
  dview.setUint8(0, bytes[p]);
  dview.setUint8(1, bytes[p + 1]);
  dview.setUint8(2, bytes[p + 2]);
  dview.setUint8(3, bytes[p + 3]);
  const tdepth = dview.getInt32(0, true);
  p += 4;
  dview.setUint8(0, bytes[p]);
  dview.setUint8(1, bytes[p + 1]);
  dview.setUint8(2, bytes[p + 2]);
  dview.setUint8(3, bytes[p + 3]);
  const ntrees = dview.getInt32(0, true);
  p += 4;

  const tcodesLs: number[] = [];
  const tpredsLs: number[] = [];
  const threshLs: number[] = [];
  for (let t = 0; t < ntrees; ++t) {
    Array.prototype.push.apply(tcodesLs, [0, 0, 0, 0]);
    const ncodes = 4 * Math.pow(2, tdepth) - 4;
    for (let b = 0; b < ncodes; ++b) tcodesLs.push(bytes[p + b]);
    p += ncodes;
    for (let i = 0; i < Math.pow(2, tdepth); ++i) {
      dview.setUint8(0, bytes[p]);
      dview.setUint8(1, bytes[p + 1]);
      dview.setUint8(2, bytes[p + 2]);
      dview.setUint8(3, bytes[p + 3]);
      tpredsLs.push(dview.getFloat32(0, true));
      p += 4;
    }
    dview.setUint8(0, bytes[p]);
    dview.setUint8(1, bytes[p + 1]);
    dview.setUint8(2, bytes[p + 2]);
    dview.setUint8(3, bytes[p + 3]);
    threshLs.push(dview.getFloat32(0, true));
    p += 4;
  }
  const tcodes = new Int8Array(tcodesLs);
  const tpreds = new Float32Array(tpredsLs);
  const thresh = new Float32Array(threshLs);

  return function classifyRegion(r, c, s, pixels, ldim) {
    r = 256 * r;
    c = 256 * c;
    let root = 0;
    let o = 0.0;
    const pow2tdepth = Math.pow(2, tdepth) >> 0;

    for (let i = 0; i < ntrees; ++i) {
      let idx = 1;
      for (let j = 0; j < tdepth; ++j) {
        // '>> 8' is an integer division — important for performance.
        idx =
          2 * idx +
          (pixels[
            ((r + tcodes[root + 4 * idx + 0] * s) >> 8) * ldim +
              ((c + tcodes[root + 4 * idx + 1] * s) >> 8)
          ] <=
          pixels[
            ((r + tcodes[root + 4 * idx + 2] * s) >> 8) * ldim +
              ((c + tcodes[root + 4 * idx + 3] * s) >> 8)
          ]
            ? 1
            : 0);
      }
      o = o + tpreds[pow2tdepth * i + idx - pow2tdepth];
      if (o <= thresh[i]) return -1;
      root += 4 * pow2tdepth;
    }
    return o - thresh[ntrees - 1];
  };
}

/** Sliding-window scan over a grayscale image at multiple scales. */
export function runCascade(
  image: GrayImage,
  classifyRegion: ClassifyRegion,
  params: ScanParams
): Detection[] {
  const pixels = image.pixels;
  const nrows = image.nrows;
  const ncols = image.ncols;
  const ldim = image.ldim;

  const shiftfactor = params.shiftfactor;
  const minsize = params.minsize;
  const maxsize = params.maxsize;
  const scalefactor = params.scalefactor;

  let scale = minsize;
  const detections: Detection[] = [];

  while (scale <= maxsize) {
    const step = Math.max(shiftfactor * scale, 1) >> 0;
    const offset = (scale / 2 + 1) >> 0;
    for (let r = offset; r <= nrows - offset; r += step) {
      for (let c = offset; c <= ncols - offset; c += step) {
        const q = classifyRegion(r, c, scale, pixels, ldim);
        if (q > 0.0) detections.push([r, c, scale, q]);
      }
    }
    scale = scale * scalefactor;
  }
  return detections;
}

/** Merge overlapping detections via non-maximum suppression. */
export function clusterDetections(
  dets: Detection[],
  iouthreshold: number
): Detection[] {
  dets = dets.sort((a, b) => b[3] - a[3]);

  function calculateIou(det1: Detection, det2: Detection) {
    const r1 = det1[0],
      c1 = det1[1],
      s1 = det1[2];
    const r2 = det2[0],
      c2 = det2[1],
      s2 = det2[2];
    const overr = Math.max(
      0,
      Math.min(r1 + s1 / 2, r2 + s2 / 2) - Math.max(r1 - s1 / 2, r2 - s2 / 2)
    );
    const overc = Math.max(
      0,
      Math.min(c1 + s1 / 2, c2 + s2 / 2) - Math.max(c1 - s1 / 2, c2 - s2 / 2)
    );
    return (overr * overc) / (s1 * s1 + s2 * s2 - overr * overc);
  }

  const assignments = new Array(dets.length).fill(0);
  const clusters: Detection[] = [];
  for (let i = 0; i < dets.length; ++i) {
    if (assignments[i] === 0) {
      let r = 0.0,
        c = 0.0,
        s = 0.0,
        n = 0;
      for (let j = i; j < dets.length; ++j) {
        if (calculateIou(dets[i], dets[j]) > iouthreshold) {
          assignments[j] = 1;
          r += dets[j][0];
          c += dets[j][1];
          s += dets[j][2];
          n += 1;
        }
      }
      clusters.push([r / n, c / n, s / n, dets[i][3]]);
    }
  }
  return clusters;
}
