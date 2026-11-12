import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  isIOSPlatform,
  hasWarehouse1DSupport,
  shouldUseNativeDetector,
  applyInlineVideoAttributes,
  computeAspectFittedVideoStyles,
  syncVideoCoverDimensions,
  waitForVideoMetadata,
} from '@/lib/scanner/iosCameraCompat';

function createMockVideo() {
  const attrs: Record<string, string> = {};
  const listeners: Record<string, Array<() => void>> = {};
  return {
    attrs,
    playsInline: false,
    autoplay: false,
    muted: false,
    defaultMuted: false,
    readyState: 0,
    videoWidth: 0,
    videoHeight: 0,
    style: {} as Record<string, string>,
    setAttribute(name: string, val: string) {
      attrs[name] = val;
    },
    addEventListener(evt: string, fn: () => void) {
      listeners[evt] = listeners[evt] || [];
      listeners[evt].push(fn);
    },
    removeEventListener(evt: string, fn: () => void) {
      listeners[evt] = (listeners[evt] || []).filter(f => f !== fn);
    },
    dispatch(evt: string) {
      (listeners[evt] || []).forEach(fn => fn());
    },
  };
}

describe('iosCameraCompat helpers', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  describe('isIOSPlatform', () => {
    it('detects Chrome on iOS (CriOS) and Safari iPhone as iOS', () => {
      const chromeIOS = {
        userAgent:
          'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0.6723.90 Mobile/15E148 Safari/604.1',
        platform: 'iPhone',
        maxTouchPoints: 5,
      };
      expect(isIOSPlatform(chromeIOS)).toBe(true);
    });

    it('detects iPadOS reporting MacIntel with touch points as iOS', () => {
      const iPadOS = {
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15',
        platform: 'MacIntel',
        maxTouchPoints: 5,
      };
      expect(isIOSPlatform(iPadOS)).toBe(true);
    });

    it('returns false for Android Chrome and Desktop Chrome', () => {
      const androidChrome = {
        userAgent:
          'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36',
        platform: 'Linux armv8l',
        maxTouchPoints: 5,
      };
      const windowsChrome = {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130.0.0.0 Safari/537.36',
        platform: 'Win32',
        maxTouchPoints: 0,
      };
      expect(isIOSPlatform(androidChrome)).toBe(false);
      expect(isIOSPlatform(windowsChrome)).toBe(false);
    });
  });

  describe('shouldUseNativeDetector & hasWarehouse1DSupport', () => {
    it('forces Html5Qrcode fallback on iOS even if BarcodeDetector exists', () => {
      expect(
        shouldUseNativeDetector({
          hasBarcodeDetector: true,
          isIOS: true,
          supportedFormats: ['code_128', 'qr_code'],
        })
      ).toBe(false);
    });

    it('rejects native BarcodeDetector when only qr_code is supported (no 1D Code 128/39)', () => {
      expect(hasWarehouse1DSupport(['qr_code', 'aztec'])).toBe(false);
      expect(
        shouldUseNativeDetector({
          hasBarcodeDetector: true,
          isIOS: false,
          supportedFormats: ['qr_code'],
        })
      ).toBe(false);
    });

    it('respects watchdog forceFallback override', () => {
      expect(
        shouldUseNativeDetector({
          hasBarcodeDetector: true,
          isIOS: false,
          forceFallback: true,
          supportedFormats: ['code_128', 'qr_code'],
        })
      ).toBe(false);
    });

    it('enables native GPU detector on Android/Desktop when Code 128 is supported', () => {
      expect(hasWarehouse1DSupport(['qr_code', 'CODE_128'])).toBe(true);
      expect(
        shouldUseNativeDetector({
          hasBarcodeDetector: true,
          isIOS: false,
          supportedFormats: ['qr_code', 'code_128', 'ean_13'],
        })
      ).toBe(true);
    });
  });

  describe('applyInlineVideoAttributes', () => {
    it('sets all required WebKit inline playback and GPU compositing attributes', () => {
      const mockVideo = createMockVideo();
      applyInlineVideoAttributes(mockVideo as unknown as HTMLVideoElement);

      expect(mockVideo.attrs['playsinline']).toBe('true');
      expect(mockVideo.attrs['webkit-playsinline']).toBe('true');
      expect(mockVideo.attrs['autoplay']).toBe('true');
      expect(mockVideo.attrs['muted']).toBe('true');
      expect(mockVideo.playsInline).toBe(true);
      expect(mockVideo.autoplay).toBe(true);
      expect(mockVideo.muted).toBe(true);
      expect(mockVideo.defaultMuted).toBe(true);
      expect(mockVideo.style.transform).toBe('translate3d(0, 0, 0)');
    });
  });

  describe('computeAspectFittedVideoStyles & syncVideoCoverDimensions', () => {
    it('prevents vertical squashing on portrait iPhone streams inside square/landscape viewports', () => {
      const fit = computeAspectFittedVideoStyles(720, 1280, 340, 300);
      expect(fit).toEqual({ width: '100%', height: 'auto', objectFit: 'initial' });
    });

    it('fits height to 100% on landscape streams without distorting aspect ratio', () => {
      const mockVideo = createMockVideo();
      mockVideo.videoWidth = 1280;
      mockVideo.videoHeight = 720;
      const container = { clientWidth: 340, clientHeight: 300 } as HTMLElement;

      syncVideoCoverDimensions(mockVideo as unknown as HTMLVideoElement, container);
      expect(mockVideo.style.width).toBe('auto');
      expect(mockVideo.style.height).toBe('100%');
      expect(mockVideo.style.objectFit).toBe('initial');
    });

    it('returns null safely when video or container has zero dimensions', () => {
      expect(computeAspectFittedVideoStyles(0, 0, 340, 300)).toBeNull();
      expect(computeAspectFittedVideoStyles(1280, 720, 0, 300)).toBeNull();
    });
  });

  describe('waitForVideoMetadata', () => {
    it('resolves immediately when metadata and videoWidth are already ready', async () => {
      const mockVideo = createMockVideo();
      mockVideo.readyState = 2;
      mockVideo.videoWidth = 1280;
      await expect(waitForVideoMetadata(mockVideo as unknown as HTMLVideoElement)).resolves.toBeUndefined();
    });

    it('waits for loadedmetadata event and cleans up listeners', async () => {
      const mockVideo = createMockVideo();
      const promise = waitForVideoMetadata(mockVideo as unknown as HTMLVideoElement, 2000);
      mockVideo.videoWidth = 720;
      mockVideo.dispatch('loadedmetadata');
      await expect(promise).resolves.toBeUndefined();
    });

    it('resolves via safety timeout if WebKit stalls metadata event', async () => {
      vi.useFakeTimers();
      const mockVideo = createMockVideo();
      let resolved = false;
      const p = waitForVideoMetadata(mockVideo as unknown as HTMLVideoElement, 450).then(() => {
        resolved = true;
      });
      await vi.advanceTimersByTimeAsync(450);
      await p;
      expect(resolved).toBe(true);
    });
  });
});
