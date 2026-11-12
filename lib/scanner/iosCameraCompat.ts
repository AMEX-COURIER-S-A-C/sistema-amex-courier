export const DESIRED_BARCODE_FORMATS = [
  'code_128',
  'code_39',
  'code_93',
  'itf',
  'codabar',
  'qr_code',
  'data_matrix',
  'pdf417',
  'aztec',
  'ean_13',
  'ean_8',
  'upc_a',
  'upc_e',
] as const;

export type DesiredBarcodeFormat = (typeof DESIRED_BARCODE_FORMATS)[number];

export interface NativeDetectorCheckParams {
  hasBarcodeDetector: boolean;
  isIOS: boolean;
  forceFallback?: boolean;
  supportedFormats?: readonly string[];
}

export interface VideoFitStyles {
  width: string;
  height: string;
  objectFit: string;
}

/** Detecta iOS / iPadOS (en iOS todos los navegadores, incluido Chrome CriOS, usan WebKit/WKWebView). */
export function isIOSPlatform(
  nav: Pick<Navigator, 'userAgent' | 'platform' | 'maxTouchPoints'> | undefined = typeof navigator !== 'undefined' ? navigator : undefined
): boolean {
  if (!nav) return false;
  const ua = nav.userAgent || '';
  return /iPad|iPhone|iPod/.test(ua) || (nav.platform === 'MacIntel' && (nav.maxTouchPoints || 0) > 1);
}

/** Verifica si los formatos reportados por BarcodeDetector incluyen simbologías 1D de almacén (Code 128 o Code 39). */
export function hasWarehouse1DSupport(supportedFormats: readonly string[]): boolean {
  const normalized = supportedFormats.map(f => f.toLowerCase());
  return normalized.includes('code_128') || normalized.includes('code_39');
}

/** Verifica si los formatos reportados incluyen simbologías 2D de paquetería (QR junto a PDF417 o DataMatrix). */
export function hasWarehouse2DSupport(supportedFormats: readonly string[]): boolean {
  const normalized = supportedFormats.map(f => f.toLowerCase());
  return normalized.includes('qr_code') && (normalized.includes('pdf417') || normalized.includes('data_matrix'));
}

/** Filtra los formatos deseados contra los soportados por el detector activo sin devolver un arreglo vacío. */
export function filterSupportedBarcodeFormats<T extends string>(
  desired: readonly T[],
  available?: readonly string[]
): T[] {
  if (!available || available.length === 0) {
    return [...desired];
  }
  const availableSet = new Set(available.map(f => f.toLowerCase()));
  const filtered = desired.filter(f => availableSet.has(f.toLowerCase()));
  return filtered.length > 0 ? filtered : [...desired];
}

/** Resuelve el binario zxing_reader.wasm auto-hospedado en /public/wasm/. */
export function locateLocalZXingWasm(fileName: string, prefix: string): string {
  if (fileName.endsWith('.wasm')) {
    const baseName = fileName.split('/').pop() || fileName;
    return `/wasm/${baseName}`;
  }
  return `${prefix}${fileName}`;
}

/** Decide si se debe usar BarcodeDetector nativo GPU o promover a WASM C++ / Html5Qrcode. */
export function shouldUseNativeDetector({
  hasBarcodeDetector,
  isIOS,
  forceFallback = false,
  supportedFormats,
}: NativeDetectorCheckParams): boolean {
  if (!hasBarcodeDetector || isIOS || forceFallback) {
    return false;
  }
  if (supportedFormats && (!hasWarehouse1DSupport(supportedFormats) || !hasWarehouse2DSupport(supportedFormats))) {
    return false;
  }
  return true;
}

/** Aplica los atributos nativos requeridos por iOS WebKit para reproducción inline sin pantalla negra. */
export function applyInlineVideoAttributes(video: HTMLVideoElement): void {
  video.setAttribute('playsinline', 'true');
  video.setAttribute('webkit-playsinline', 'true');
  video.setAttribute('autoplay', 'true');
  video.setAttribute('muted', 'true');
  video.playsInline = true;
  video.autoplay = true;
  video.muted = true;
  video.defaultMuted = true;
  video.style.transform = 'translate3d(0, 0, 0)';
}

/** Calcula width/height proporcionales para simular cover sin distorsionar el canvas de ZXing en Html5Qrcode. */
export function computeAspectFittedVideoStyles(
  videoWidth: number,
  videoHeight: number,
  containerWidth: number,
  containerHeight: number
): VideoFitStyles | null {
  if (!videoWidth || !videoHeight || !containerWidth || !containerHeight) {
    return null;
  }
  const videoAspect = videoWidth / videoHeight;
  const containerAspect = containerWidth / containerHeight;
  if (videoAspect < containerAspect) {
    return { width: '100%', height: 'auto', objectFit: 'initial' };
  }
  return { width: 'auto', height: '100%', objectFit: 'initial' };
}

/** Aplica el ajuste de proporción al elemento video dentro de su contenedor con overflow hidden. */
export function syncVideoCoverDimensions(video: HTMLVideoElement, container: HTMLElement | null): void {
  if (!container) return;
  const fit = computeAspectFittedVideoStyles(
    video.videoWidth,
    video.videoHeight,
    container.clientWidth,
    container.clientHeight
  );
  if (!fit) return;
  video.style.width = fit.width;
  video.style.height = fit.height;
  video.style.objectFit = fit.objectFit;
  video.style.maxWidth = 'none';
  video.style.maxHeight = 'none';
}

/** Espera a que el elemento video cargue metadatos y dimensiones reales antes de invocar play(). */
export function waitForVideoMetadata(video: HTMLVideoElement, timeoutMs = 450): Promise<void> {
  return new Promise(resolve => {
    if (video.readyState >= 1 && video.videoWidth > 0) {
      resolve();
      return;
    }
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      video.removeEventListener('loadedmetadata', finish);
      video.removeEventListener('canplay', finish);
      resolve();
    };
    video.addEventListener('loadedmetadata', finish);
    video.addEventListener('canplay', finish);
    setTimeout(finish, timeoutMs);
  });
}
