// Single-channel looped bell with per-card TTL.
// API: sound.enable(), sound.start(id), sound.stop(id), sound.stopAll()

export class SingleBell {
  private audio: HTMLAudioElement;
  private unlocked = false;
  private active = new Map<string, number>(); // id -> expiresAt (ms)
  private timer: number | null = null;

  // ✅ default matches your actual file in /public/incoming.mp3
  constructor(src = "/incoming.mp3") {
    this.audio = new Audio(src);
    this.audio.loop = true;
    this.audio.preload = "auto";
    this.audio.volume = 1.0;
  }

  private ensureTimer() {
    if (this.timer !== null) return;
    this.timer = window.setInterval(() => this.pulse(), 250);
  }

  private async playIfNeeded() {
    if (this.audio.paused) {
      try {
        await this.audio.play();
      } catch {}
    }
  }

  private stopIfPlaying() {
    try {
      this.audio.pause();
      this.audio.currentTime = 0;
    } catch {}
  }

  private pulse() {
    const now = Date.now();
    const toDelete: string[] = [];
    this.active.forEach((until, id) => {
      if (until <= now) toDelete.push(id);
    });
    for (let i = 0; i < toDelete.length; i++) this.active.delete(toDelete[i]);

    if (this.active.size > 0) void this.playIfNeeded();
    else this.stopIfPlaying();
  }

  async enable() {
    if (this.unlocked) return;
    this.unlocked = true;
    try {
      this.audio.muted = true;
      await this.audio.play();
      this.audio.pause();
      this.audio.currentTime = 0;
      this.audio.muted = false;
    } catch {}
  }

  /** Start/refresh TTL for this id. Default 60s. */
  start(id: string, durationMs = 60000) {
    const until = Date.now() + Math.max(0, durationMs);
    this.active.set(id, until);
    this.ensureTimer();
    this.pulse();
  }

  /** Stop ringing on behalf of this id (e.g., card removed). */
  stop(id: string) {
    if (this.active.has(id)) {
      this.active.delete(id);
      this.pulse();
    }
  }

  /** Hard stop everything. */
  stopAll() {
    this.active.clear();
    this.pulse();
  }
}

// ✅ use default (no custom /sounds prefix)
export const sound = new SingleBell();
