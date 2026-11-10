// Utilidad de sintetizador de audio y voz hablada (TTS) para escaneo con pistola láser y feedback háptico

class SoundSynthesizer {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private volume: number = 0.95;
  private voiceEnabled: boolean = true;
  private cachedVoices: SpeechSynthesisVoice[] = [];
  // Referencia fuerte para evitar que el Garbage Collector de V8/Chrome destruya el utterance a mitad de locución
  private activeUtterance: SpeechSynthesisUtterance | null = null;
  private speechTimer: ReturnType<typeof setTimeout> | null = null;
  private watchdogTimer: ReturnType<typeof setTimeout> | null = null;
  private lastSpokenText: string = '';
  private lastSpokenAt: number = 0;
  private unlocked: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.initVoices();
      this.setupAutoUnlock();
    }
  }

  private initVoices() {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    const loadVoices = () => {
      try {
        const voices = window.speechSynthesis.getVoices();
        if (voices && voices.length > 0) {
          this.cachedVoices = voices;
        }
      } catch {
        // ignore
      }
    };

    loadVoices();
    try {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    } catch {
      // ignore
    }
  }

  private setupAutoUnlock() {
    if (typeof window === 'undefined') return;

    const unlock = () => {
      if (this.unlocked) return;
      this.unlocked = true;
      try {
        const ctx = this.getAudioContext();
        if (ctx && ctx.state === 'suspended') {
          void ctx.resume();
        }
        if ('speechSynthesis' in window) {
          this.initVoices();
          if (window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
          }
        }
      } catch {
        // ignore
      }
    };

    window.addEventListener('pointerdown', unlock, { passive: true });
    window.addEventListener('keydown', unlock, { passive: true });
  }

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      void this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private getBestSpanishVoice(): SpeechSynthesisVoice | null {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
    const voices =
      this.cachedVoices.length > 0
        ? this.cachedVoices
        : window.speechSynthesis.getVoices();

    if (!voices || voices.length === 0) return null;

    // Priorizar voces naturales en español (Perú, Latinoamérica, México, EE.UU., España)
    const esVoices = voices.filter(v => v.lang.toLowerCase().startsWith('es'));
    if (esVoices.length === 0) return null;

    return (
      // Preferir voces locales (offline) en Windows/Mac para evitar que una voz online de Google se cuelgue sin red
      esVoices.find(v => v.localService && (v.lang === 'es-PE' || v.lang === 'es-MX' || v.lang === 'es-419')) ||
      esVoices.find(v => v.localService && v.lang.toLowerCase().startsWith('es')) ||
      esVoices.find(v => v.lang === 'es-PE') ||
      esVoices.find(v => v.lang === 'es-419') ||
      esVoices.find(v => v.lang === 'es-MX') ||
      esVoices.find(v => v.lang === 'es-US') ||
      esVoices.find(v => v.lang === 'es-ES') ||
      esVoices[0]
    );
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (muted && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // ignore
      }
    }
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
  }

  public getVolume(): number {
    return this.volume;
  }

  public setVoiceEnabled(enabled: boolean) {
    this.voiceEnabled = enabled;
  }

  public getVoiceEnabled(): boolean {
    return this.voiceEnabled;
  }

  // 1. Sonido de Éxito: Bip agudo doble y limpio (Match encontrado)
  public playSuccess() {
    if (this.isMuted) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(this.volume * 0.4, now);
      masterGain.connect(ctx.destination);

      // Primer tono (880 Hz - La 5)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(880, now);
      gain1.gain.setValueAtTime(0.3, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc1.connect(gain1);
      gain1.connect(masterGain);
      osc1.start(now);
      osc1.stop(now + 0.08);

      // Segundo tono más agudo (1320 Hz - Mi 6)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1320, now + 0.07);
      gain2.gain.setValueAtTime(0.35, now + 0.07);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      osc2.connect(gain2);
      gain2.connect(masterGain);
      osc2.start(now + 0.07);
      osc2.stop(now + 0.2);

      this.triggerHaptic([60, 40, 80]);
    } catch (e) {
      console.warn('Audio playSuccess error:', e);
    }
  }

  // 2. Sonido de Duplicado: Advertencia de código ya escaneado
  public playDuplicate() {
    if (this.isMuted) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(this.volume * 0.45, now);
      masterGain.connect(ctx.destination);

      // Tono de advertencia doble
      [0, 0.13].forEach((offset) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(587.33, now + offset); // D5
        gain.gain.setValueAtTime(0.35, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.01, now + offset + 0.1);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(now + offset);
        osc.stop(now + offset + 0.1);
      });

      this.triggerHaptic([100, 50, 100]);
    } catch (e) {
      console.warn('Audio playDuplicate error:', e);
    }
  }

  // 3. Sonido de Error / No Encontrado: Zumbido grave de rechazo
  public playNotFound() {
    if (this.isMuted) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(this.volume * 0.45, now);
      masterGain.connect(ctx.destination);

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(240, now);
      osc.frequency.linearRampToValueAtTime(150, now + 0.28);

      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.28);

      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(now);
      osc.stop(now + 0.28);

      this.triggerHaptic([250]);
    } catch (e) {
      console.warn('Audio playNotFound error:', e);
    }
  }

  // 4. Sonido de Importación / Carga de Lista
  public playBulkLoaded() {
    if (this.isMuted) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(this.volume * 0.35, now);
      masterGain.connect(ctx.destination);

      const freqs = [440, 554.37, 659.25, 880]; // Acorde mayor alegre
      freqs.forEach((freq, idx) => {
        const offset = idx * 0.06;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + offset);
        gain.gain.setValueAtTime(0.25, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.15);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(now + offset);
        osc.stop(now + offset + 0.15);
      });
    } catch (e) {
      console.warn('Audio playBulkLoaded error:', e);
    }
  }

  // 5. Sonido sutil cuando un compañero escanea en tiempo real
  public playPeerScan() {
    if (this.isMuted) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(this.volume * 0.2, now);
      masterGain.connect(ctx.destination);

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1046.5, now); // C6
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(now);
      osc.stop(now + 0.09);
    } catch (e) {
      console.warn('Audio playPeerScan error:', e);
    }
  }

  // 6. Síntesis de voz hablada en español blindada contra bloqueos de Chrome y GC
  public speak(text: string, options?: { force?: boolean }) {
    if (this.isMuted || (!this.voiceEnabled && !options?.force)) return;
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    const cleanText = text
      .replace(/^\[|\]$/g, '')
      .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, (email) => {
        return email.split('@')[0].replace(/[._-]/g, ' ').trim();
      })
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleanText) return;

    const nowMs = Date.now();
    // Evitar doble disparo idéntico (< 250ms) por eventos Enter + Blur simultáneos
    if (!options?.force && cleanText === this.lastSpokenText && nowMs - this.lastSpokenAt < 250) {
      return;
    }
    this.lastSpokenText = cleanText;
    this.lastSpokenAt = nowMs;

    if (this.speechTimer) {
      clearTimeout(this.speechTimer);
      this.speechTimer = null;
    }
    if (this.watchdogTimer) {
      clearTimeout(this.watchdogTimer);
      this.watchdogTimer = null;
    }

    const executeSpeak = () => {
      try {
        const synth = window.speechSynthesis;
        if (synth.paused) {
          synth.resume();
        }

        const utterance = new SpeechSynthesisUtterance(cleanText);
        this.activeUtterance = utterance; // Mantener referencia fuerte anti-GC

        const bestVoice = this.getBestSpanishVoice();
        if (bestVoice) {
          utterance.voice = bestVoice;
          utterance.lang = bestVoice.lang || 'es-PE';
        } else {
          utterance.lang = 'es-PE';
        }

        utterance.rate = 1.06;
        utterance.pitch = 1.0;
        utterance.volume = Math.max(0.85, this.volume);

        const clearRefs = () => {
          if (this.activeUtterance === utterance) {
            this.activeUtterance = null;
          }
          if (this.watchdogTimer) {
            clearTimeout(this.watchdogTimer);
            this.watchdogTimer = null;
          }
        };

        utterance.onend = clearRefs;
        utterance.onerror = () => {
          clearRefs();
        };

        synth.speak(utterance);

        // Watchdog por si una voz remota de Chrome queda colgada en cola
        this.watchdogTimer = setTimeout(() => {
          try {
            if (synth.speaking) {
              synth.cancel();
            }
          } catch {
            // ignore
          }
        }, 5500);
      } catch (err) {
        console.warn('Speech synthesis speak error:', err);
      }
    };

    // Diferir la llamada IPC de speechSynthesis fuera del ciclo síncrono de teclado/pistola USB (evita micro-bloqueos en ráfagas)
    this.speechTimer = setTimeout(() => {
      try {
        const synth = window.speechSynthesis;
        if (synth.speaking || synth.pending) {
          synth.cancel();
          // En Chromium es necesario esperar ~55ms tras cancel() para que no cancele también el nuevo utterance
          this.speechTimer = setTimeout(executeSpeak, 55);
        } else {
          executeSpeak();
        }
      } catch (e) {
        console.warn('Speech synthesis error:', e);
      }
    }, 35);
  }

  // Feedback integral de escaneo WR en Columna D: Bip instantáneo + Voz hablada (Nombre del cliente o 'No encontrado')
  public announceScanResult(params: {
    status: 'FOUND' | 'NOT_FOUND';
    clientName?: string;
  }) {
    if (this.isMuted) return;

    if (params.status === 'FOUND') {
      this.playSuccess();
      if (this.voiceEnabled) {
        const spokenName =
          params.clientName &&
          params.clientName !== 'CLIENTE AMEX' &&
          params.clientName !== 'NO ASIGNADO' &&
          params.clientName !== '[NOMBRE]'
            ? params.clientName
            : 'Encontrado';
        this.speak(spokenName);
      }
      return;
    }

    // NOT_FOUND
    this.playNotFound();
    if (this.voiceEnabled) {
      this.speak('No encontrado');
    }
  }

  // Botón de prueba rápida de voz para verificar parlantes y síntesis en el navegador
  public testVoice() {
    const wasMuted = this.isMuted;
    if (wasMuted) this.isMuted = false;
    this.playSuccess();
    this.speak('Voz de escáner Amex activada', { force: true });
    if (wasMuted) this.isMuted = true;
  }

  // 7. Vibración háptica en celulares y tablets
  public triggerHaptic(pattern: number[] = [80]) {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch {
        // Ignorar si el navegador bloquea vibración
      }
    }
  }
}

export const soundEffects = new SoundSynthesizer();
