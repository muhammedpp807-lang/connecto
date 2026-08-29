/**
 * Utility to generate a realistic synthetic voice / audio waveform Blob
 * using the Web Audio API (OfflineAudioContext).
 */
export async function generateSyntheticAudioBlob(durationSeconds: number = 3): Promise<Blob> {
  const sampleRate = 44100;
  const length = Math.max(1, Math.round(sampleRate * durationSeconds));
  
  const offlineCtx = new (window.OfflineAudioContext || (window as any).webkitOfflineAudioContext)(
    1,
    length,
    sampleRate
  );

  // Harmonized voice formant generator
  const osc1 = offlineCtx.createOscillator();
  const osc2 = offlineCtx.createOscillator();
  const gainNode = offlineCtx.createGain();
  const filter = offlineCtx.createBiquadFilter();

  osc1.type = 'triangle';
  osc1.frequency.setValueAtTime(220, 0); // A3 voice baseline
  osc1.frequency.exponentialRampToValueAtTime(330, durationSeconds * 0.4);
  osc1.frequency.exponentialRampToValueAtTime(260, durationSeconds);

  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(440, 0);
  osc2.frequency.exponentialRampToValueAtTime(520, durationSeconds * 0.5);
  osc2.frequency.exponentialRampToValueAtTime(392, durationSeconds);

  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(800, 0);
  filter.Q.setValueAtTime(2, 0);

  // Smooth attack and release envelope
  gainNode.gain.setValueAtTime(0.001, 0);
  gainNode.gain.exponentialRampToValueAtTime(0.3, 0.1);
  gainNode.gain.setValueAtTime(0.3, Math.max(0.1, durationSeconds - 0.2));
  gainNode.gain.exponentialRampToValueAtTime(0.001, durationSeconds);

  osc1.connect(filter);
  osc2.connect(filter);
  filter.connect(gainNode);
  gainNode.connect(offlineCtx.destination);

  osc1.start(0);
  osc2.start(0);
  osc1.stop(durationSeconds);
  osc2.stop(durationSeconds);

  const renderedBuffer = await offlineCtx.startRendering();
  return bufferToWaveBlob(renderedBuffer, renderedBuffer.length);
}

function bufferToWaveBlob(abuffer: AudioBuffer, len: number): Blob {
  const numOfChan = abuffer.numberOfChannels;
  const length = len * numOfChan * 2 + 44;
  const out = new DataView(new ArrayBuffer(length));
  const channels: Float32Array[] = [];
  let sample = 0;
  let offset = 0;
  let pos = 0;

  // RIFF identifier
  writeString(out, pos, 'RIFF'); pos += 4;
  out.setUint32(pos, length - 8, true); pos += 4;
  writeString(out, pos, 'WAVE'); pos += 4;
  writeString(out, pos, 'fmt '); pos += 4;
  out.setUint32(pos, 16, true); pos += 4; // SubChunk1Size (16 for PCM)
  out.setUint16(pos, 1, true); pos += 2;  // AudioFormat (1 for PCM)
  out.setUint16(pos, numOfChan, true); pos += 2;
  out.setUint32(pos, abuffer.sampleRate, true); pos += 4;
  out.setUint32(pos, abuffer.sampleRate * 2 * numOfChan, true); pos += 4; // byte rate
  out.setUint16(pos, numOfChan * 2, true); pos += 2; // block align
  out.setUint16(pos, 16, true); pos += 2; // bits per sample
  writeString(out, pos, 'data'); pos += 4;
  out.setUint32(pos, length - pos - 4, true); pos += 4;

  for (let i = 0; i < abuffer.numberOfChannels; i++) {
    channels.push(abuffer.getChannelData(i));
  }

  while (offset < len) {
    for (let i = 0; i < numOfChan; i++) {
      sample = Math.max(-1, Math.min(1, channels[i][offset]));
      sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0;
      out.setInt16(pos, sample, true);
      pos += 2;
    }
    offset++;
  }

  return new Blob([out.buffer], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}
