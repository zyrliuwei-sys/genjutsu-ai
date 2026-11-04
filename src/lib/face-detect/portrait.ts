import {
  clusterDetections,
  runCascade,
  unpackCascade,
  type ClassifyRegion,
} from './pico';

/**
 * Auto-crop an uploaded portrait around the detected face so the swap model
 * always receives a usable close-up — no matter how small the person is in
 * the original frame. Returns null (and keeps the original file) when no face
 * is found or the photo is already a close-up.
 */

const CASCADE_URL = '/models/facefinder.cascade';
// Small enough to scan fast, large enough for a ~25px face to register.
const DETECT_MAX_SIDE = 720;
const DETECT_MIN_FACE = 24;
// Clusters below this pico score are treated as noise, not faces. Small
// faces score ~4–5 on a single frame (noise and gradients stay near zero).
const MIN_SCORE = 3.5;
// Face should fill roughly a third of the cropped portrait.
const FACE_CROP_RATIO = 3.2;
// Photos whose face already covers this share of the short side pass through.
const CLOSE_UP_FACE_RATIO = 0.28;
const OUTPUT_MAX_SIDE = 1024;
// Must clear the generator's minimum-image check (300px).
const MIN_CROP_SIDE = 320;

let classifierPromise: Promise<ClassifyRegion | null> | null = null;

function loadClassifier() {
  if (!classifierPromise) {
    classifierPromise = fetch(CASCADE_URL, {
      signal: AbortSignal.timeout(5000),
    })
      .then((response) => {
        if (!response.ok) throw new Error(`cascade ${response.status}`);
        return response.arrayBuffer();
      })
      .then((buffer) => unpackCascade(new Uint8Array(buffer)))
      .catch((error) => {
        console.error('[face-detect] cascade load failed', error);
        classifierPromise = null;
        return null;
      });
  }
  return classifierPromise;
}

/** Find the largest confident face, in downscaled-image coordinates. */
function detectFace(
  data: ImageData,
  classify: ClassifyRegion
): [row: number, col: number, size: number] | null {
  const { width, height } = data;
  const gray = new Float32Array(width * height);
  for (let i = 0, p = 0; i < gray.length; ++i, p += 4) {
    gray[i] =
      0.299 * data.data[p] +
      0.587 * data.data[p + 1] +
      0.114 * data.data[p + 2];
  }
  const detections = runCascade(
    { pixels: gray, nrows: height, ncols: width, ldim: width },
    classify,
    {
      shiftfactor: 0.1,
      minsize: DETECT_MIN_FACE,
      maxsize: Math.min(width, height),
      scalefactor: 1.15,
    }
  );
  const clusters = clusterDetections(detections, 0.2);
  let best: [number, number, number, number] | null = null;
  for (const det of clusters) {
    if (det[3] < MIN_SCORE) continue;
    if (!best || det[2] > best[2]) best = det;
  }
  if (!best) return null;
  return [best[0], best[1], best[2]];
}

/**
 * Crop the file into a square portrait centered on the face. Returns null
 * when the photo should be kept as-is (no face detected / already close-up).
 */
export async function cropPortraitPhoto(file: File): Promise<File | null> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return null;
  const classify = await loadClassifier();
  if (!classify) return null;

  const bitmap = await createImageBitmap(file, {
    imageOrientation: 'from-image',
  }).catch(() => null);
  if (!bitmap) return null;

  try {
    // Scale by the SHORT side: a 720px short side keeps small faces at a
    // size the cascade scores reliably (long-side scaling would shrink them
    // back below its practical ~30px floor for portrait/landscape photos).
    const detectScale = Math.min(
      1,
      DETECT_MAX_SIDE / Math.min(bitmap.width, bitmap.height)
    );
    const smallW = Math.max(1, Math.round(bitmap.width * detectScale));
    const smallH = Math.max(1, Math.round(bitmap.height * detectScale));
    const canvas = new OffscreenCanvas(smallW, smallH);
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(bitmap, 0, 0, smallW, smallH);
    const face = detectFace(ctx.getImageData(0, 0, smallW, smallH), classify);
    if (!face) return null;

    const up = 1 / detectScale;
    const faceRow = face[0] * up;
    const faceCol = face[1] * up;
    const faceSize = face[2] * up;
    const shortSide = Math.min(bitmap.width, bitmap.height);
    if (faceSize / shortSide >= CLOSE_UP_FACE_RATIO) return null;

    const cropSide = Math.min(
      shortSide,
      Math.max(MIN_CROP_SIDE, Math.round(faceSize * FACE_CROP_RATIO))
    );
    const cropX = Math.min(
      Math.max(0, Math.round(faceCol - cropSide / 2)),
      bitmap.width - cropSide
    );
    const cropY = Math.min(
      Math.max(0, Math.round(faceRow - cropSide / 2)),
      bitmap.height - cropSide
    );

    const outSide = Math.min(cropSide, OUTPUT_MAX_SIDE);
    const out = new OffscreenCanvas(outSide, outSide);
    const outCtx = out.getContext('2d');
    if (!outCtx) return null;
    outCtx.drawImage(
      bitmap,
      cropX,
      cropY,
      cropSide,
      cropSide,
      0,
      0,
      outSide,
      outSide
    );
    const blob = await out.convertToBlob({ type: 'image/jpeg', quality: 0.92 });
    const base = file.name.replace(/\.[^.]+$/, '') || 'photo';
    return new File([blob], `${base}-portrait.jpg`, {
      type: 'image/jpeg',
      lastModified: Date.now(),
    });
  } finally {
    bitmap.close();
  }
}
