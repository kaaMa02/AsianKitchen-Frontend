// src/utils/audio.ts
export class CardSound {
  private audio: HTMLAudioElement;
  private timeout: number | null = null;

  constructor(src = "/sounds/incoming.mp3") {
    this.audio = new Audio(src);
    this.audio.loop = true;
    this.audio.preload = "auto";
    this.audio.volume = 1.0;
  }

  async start(durationMs = 60000) {
    try { await this.audio.play(); } catch {}
    this.timeout = window.setTimeout(() => this.stop(), durationMs);
  }

  stop() {
    try { this.audio.pause(); this.audio.currentTime = 0; } catch {}
    if (this.timeout !== null) { window.clearTimeout(this.timeout); this.timeout = null; }
  }
}

// Manage many cards
export class SoundRegistry {
  private map = new Map<string, CardSound>();
  constructor(private src = "/sounds/incoming.mp3") {}

  ensure(id: string) {
    if (this.map.has(id)) return this.map.get(id)!;
    const s = new CardSound(this.src);
    this.map.set(id, s);
    return s;
  }

  start(id: string) { this.ensure(id).start(); }

  stop(id: string) {
    const s = this.map.get(id);
    if (s) { s.stop(); this.map.delete(id); }
  }

  stopAll() {
    this.map.forEach((s) => s.stop());
    this.map.clear();
  }
}