/**
 * MediaRecorderCapture — Real browser audio capture using MediaRecorder API.
 * Captures audio chunks and emits them for transcription.
 */

export interface AudioCaptureOptions {
  mimeType?: string;
  timesliceMs?: number;
  onChunk?: (chunk: Blob) => void;
  onError?: (error: Error) => void;
  onStop?: (finalBlob: Blob) => void;
}

export class MediaRecorderCapture {
  private stream: MediaStream | null = null;
  private recorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private options: AudioCaptureOptions;
  private state: 'idle' | 'requesting' | 'recording' | 'paused' | 'stopped' | 'error' = 'idle';

  constructor(options: AudioCaptureOptions = {}) {
    this.options = options;
  }

  getState(): string { return this.state; }
  isRecording(): boolean { return this.state === 'recording'; }

  async requestPermission(): Promise<boolean> {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices) {
      this.state = 'error';
      this.options.onError?.(new Error('MediaDevices API not available'));
      return false;
    }
    try {
      this.state = 'requesting';
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      return true;
    } catch (err) {
      this.state = 'error';
      this.options.onError?.(err as Error);
      return false;
    }
  }

  async start(): Promise<boolean> {
    if (!this.stream) {
      const ok = await this.requestPermission();
      if (!ok) return false;
    }

    try {
      const mimeType = this.options.mimeType ?? 'audio/webm';
      this.recorder = new MediaRecorder(this.stream!, { mimeType });
      this.chunks = [];

      this.recorder.ondataavailable = (e: BlobEvent) => {
        if (e.data && e.data.size > 0) {
          this.chunks.push(e.data);
          this.options.onChunk?.(e.data);
        }
      };

      this.recorder.onstop = () => {
        const final = new Blob(this.chunks, { type: mimeType });
        this.options.onStop?.(final);
      };

      this.recorder.onerror = (e: Event) => {
        this.state = 'error';
        this.options.onError?.(new Error(`MediaRecorder error: ${(e as ErrorEvent).message ?? 'unknown'}`));
      };

      this.recorder.start(this.options.timesliceMs ?? 1000);
      this.state = 'recording';
      return true;
    } catch (err) {
      this.state = 'error';
      this.options.onError?.(err as Error);
      return false;
    }
  }

  pause(): void {
    if (this.recorder && this.state === 'recording') {
      this.recorder.pause();
      this.state = 'paused';
    }
  }

  resume(): void {
    if (this.recorder && this.state === 'paused') {
      this.recorder.resume();
      this.state = 'recording';
    }
  }

  stop(): Blob | null {
    if (!this.recorder) return null;
    this.recorder.stop();
    this.state = 'stopped';
    const final = new Blob(this.chunks, { type: this.options.mimeType ?? 'audio/webm' });
    return final;
  }

  destroy(): void {
    if (this.recorder && this.recorder.state !== 'inactive') {
      try { this.recorder.stop(); } catch { /* noop */ }
    }
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
      this.stream = null;
    }
    this.recorder = null;
    this.chunks = [];
    this.state = 'idle';
  }
}
