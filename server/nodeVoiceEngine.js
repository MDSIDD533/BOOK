/*
 * Pure-Node.js Neural Voice & Polyphonic Cinema Music Engine (Kokoro-82M ONNX)
 * Runs 100% inside Node.js on Windows, macOS, and Linux with ZERO Python needed:
 *   1. Native C++ fast-path via `onnxruntime-node` (Windows win32-x64 DLL / macOS / Linux)
 *   2. Automatic zero-install fallback via `onnxruntime-web` (SIMD WebAssembly)
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { pathToFileURL } = require('url');
const VOCAB = require('./kokoroVocab.json');
const { textToKokoroPhonemes, detectLanguage } = require('./romanUrduPhonetics');
const { renderTimelineFoleySfx } = require('./cinemaSfx');

const SAMPLE_RATE = 24000;
const STYLE_DIM = 256;
const ROOT_DIR = path.join(__dirname, '..');
const CACHE_DIR = path.join(ROOT_DIR, 'data', '.kokoro-cache');
const SHARDS_DIR = path.join(ROOT_DIR, 'node_modules', 'kokoro-q8-shards');
const VOICES_DIR = path.join(ROOT_DIR, 'node_modules', 'kokoro-local-runtime', 'voices');

const MUSIC_PRESETS = {
  cinematic_epic: {
    chords: [[130.81, 196.00, 261.63, 311.13], [103.83, 155.56, 207.65, 311.13], [116.54, 174.61, 233.08, 293.66], [98.00, 146.83, 196.00, 293.66]],
    bpm: 72, arpMult: 2.0, bass: 0.42, pad: 0.55, pulse: 0.28,
  },
  inspirational_piano: {
    chords: [[261.63, 329.63, 392.00, 523.25], [196.00, 246.94, 392.00, 493.88], [220.00, 261.63, 329.63, 440.00], [174.61, 220.00, 261.63, 349.23]],
    bpm: 84, arpMult: 1.0, bass: 0.25, pad: 0.45, pulse: 0.35,
  },
  lofi_chill: {
    chords: [[220.00, 261.63, 329.63, 392.00], [174.61, 220.00, 261.63, 329.63], [196.00, 246.94, 293.66, 369.99], [164.81, 196.00, 246.94, 329.63]],
    bpm: 76, arpMult: 1.0, bass: 0.34, pad: 0.50, pulse: 0.22,
  },
  tech_pulse: {
    chords: [[146.83, 220.00, 293.66, 440.00], [130.81, 196.00, 261.63, 392.00], [110.00, 164.81, 220.00, 329.63], [130.81, 196.00, 293.66, 440.00]],
    bpm: 112, arpMult: 2.0, bass: 0.45, pad: 0.38, pulse: 0.44,
  },
  spiritual_ambient: {
    chords: [[146.83, 220.00, 293.66, 329.63], [130.81, 196.00, 261.63, 329.63], [116.54, 174.61, 261.63, 293.66], [146.83, 220.00, 293.66, 440.00]],
    bpm: 60, arpMult: 1.0, bass: 0.30, pad: 0.65, pulse: 0.10,
  },
  dramatic_tension: {
    chords: [[110.00, 164.81, 220.00, 261.63], [103.83, 155.56, 207.65, 246.94], [98.00, 146.83, 220.00, 261.63], [87.31, 130.81, 174.61, 261.63]],
    bpm: 90, arpMult: 1.0, bass: 0.52, pad: 0.48, pulse: 0.36,
  },
  upbeat_pop: {
    chords: [[261.63, 329.63, 392.00, 523.25], [293.66, 369.99, 440.00, 587.33], [220.00, 261.63, 329.63, 440.00], [196.00, 246.94, 293.66, 392.00]],
    bpm: 118, arpMult: 2.0, bass: 0.38, pad: 0.40, pulse: 0.45,
  },
};

function splitSentences(text) {
  const cleaned = String(text || '').replace(/\s+/g, ' ').trim();
  if (!cleaned) return [];
  const rawParts = cleaned.split(/(?<=[.!?۔।])\s+/);
  const chunks = [];
  for (const raw of rawParts) {
    const part = raw.trim();
    if (!part) continue;
    const words = part.split(' ');
    if (words.length <= 28) {
      chunks.push(part);
    } else {
      for (let i = 0; i < words.length; i += 24) {
        chunks.push(words.slice(i, i + 24).join(' '));
      }
    }
  }
  return chunks;
}

function computeWaveformEnvelope(samples, bars = 64) {
  if (!samples || !samples.length) return new Array(bars).fill(0.25);
  const step = Math.max(1, Math.floor(samples.length / bars));
  const vals = [];
  let maxVal = 1e-5;
  for (let b = 0; b < bars; b++) {
    const from = b * step;
    const to = Math.min(samples.length, from + step);
    let sumSq = 0;
    for (let i = from; i < to; i++) sumSq += samples[i] * samples[i];
    const rms = to > from ? Math.sqrt(sumSq / (to - from)) : 0;
    vals.push(rms);
    if (rms > maxVal) maxVal = rms;
  }
  return vals.map((v) => Number(Math.max(0.08, Math.min(1.0, v / maxVal)).toFixed(3)));
}

function trimEdgeSilence(samples, threshold = 0.004, padSamples = 1200) {
  let start = 0;
  let end = samples.length - 1;
  while (start < samples.length && Math.abs(samples[start]) < threshold) start++;
  while (end > start && Math.abs(samples[end]) < threshold) end--;
  if (start >= end) return samples;
  const from = Math.max(0, start - padSamples);
  const to = Math.min(samples.length, end + padSamples);
  return samples.subarray(from, to);
}

function concatFloat32(arrays) {
  let total = 0;
  for (const a of arrays) total += a.length;
  const out = new Float32Array(total);
  let offset = 0;
  for (const a of arrays) {
    out.set(a, offset);
    offset += a.length;
  }
  return out;
}

function composeStereoMusic(exactSamples, style = 'cinematic_epic') {
  const n = Math.max(1, exactSamples);
  const cfg = MUSIC_PRESETS[style] || MUSIC_PRESETS.cinematic_epic;
  const beatSec = 60.0 / cfg.bpm;
  const barSec = beatSec * 4.0;
  const left = new Float32Array(n);
  const right = new Float32Array(n);

  const numBars = Math.ceil(n / SAMPLE_RATE / barSec) + 1;
  const fadeSamples = Math.min(Math.floor(0.18 * SAMPLE_RATE), Math.floor(barSec * SAMPLE_RATE * 0.25));
  const twoPiOverSr = (2.0 * Math.PI) / SAMPLE_RATE;

  for (let b = 0; b < numBars; b++) {
    const start = Math.floor(b * barSec * SAMPLE_RATE);
    const end = Math.min(n, Math.floor((b + 1) * barSec * SAMPLE_RATE) + fadeSamples);
    if (start >= n || end <= start) break;
    const segLen = end - start;
    const chord = cfg.chords[b % cfg.chords.length];
    const root = chord[0] * 0.5;

    for (let i = 0; i < segLen; i++) {
      let win = 1.0;
      if (fadeSamples > 0 && segLen > fadeSamples * 2) {
        if (i < fadeSamples) win = i / fadeSamples;
        else if (i >= segLen - fadeSamples) win = (segLen - 1 - i) / fadeSamples;
      }

      const ph = twoPiOverSr * i;
      let padL = 0;
      let padR = 0;
      for (let c = 0; c < chord.length; c++) {
        const f = chord[c];
        padL += 0.55 * Math.sin(ph * f * 0.998) + 0.18 * Math.sin(ph * f * 2.0);
        padR += 0.55 * Math.sin(ph * f * 1.002) + 0.18 * Math.sin(ph * f * 2.003);
      }
      const bass = Math.sin(ph * root) + 0.35 * Math.sin(ph * chord[0]);

      const idx = start + i;
      left[idx] += win * (cfg.pad * padL * 0.22 + cfg.bass * bass * 0.28);
      right[idx] += win * (cfg.pad * padR * 0.22 + cfg.bass * bass * 0.28);
    }

    const stepSamples = Math.floor(beatSec * 0.5 * SAMPLE_RATE);
    const noteDurSamples = Math.floor(beatSec * 0.8 * SAMPLE_RATE);
    for (let s = 0; s < 8; s++) {
      const ns = start + s * stepSamples;
      const ne = Math.min(end, ns + noteDurSamples);
      if (ns >= end || ne <= ns) continue;
      const noteFreq = chord[s % chord.length] * cfg.arpMult;
      const panL = s % 2 === 0 ? 0.65 : 0.35;
      const panR = 1.0 - panL;
      const attackSamples = Math.max(1, Math.floor(0.012 * SAMPLE_RATE));
      for (let k = 0; k < ne - ns; k++) {
        const nt = k / SAMPLE_RATE;
        const env = Math.exp(-4.2 * nt) * Math.min(1.0, k / attackSamples);
        const ph = twoPiOverSr * k * noteFreq;
        const tone = (Math.sin(ph) + 0.28 * Math.sin(ph * 2.0)) * env * cfg.pulse * 0.30;
        left[ns + k] += tone * panL;
        right[ns + k] += tone * panR;
      }
    }
  }

  const edgeFade = Math.min(Math.floor(0.5 * SAMPLE_RATE), Math.floor(n / 4));
  for (let i = 0; i < edgeFade; i++) {
    const g = i / edgeFade;
    left[i] *= g;
    right[i] *= g;
    left[n - 1 - i] *= g;
    right[n - 1 - i] *= g;
  }

  let peak = 1e-6;
  for (let i = 0; i < n; i++) {
    if (Math.abs(left[i]) > peak) peak = Math.abs(left[i]);
    if (Math.abs(right[i]) > peak) peak = Math.abs(right[i]);
  }
  const scale = 0.85 / peak;
  for (let i = 0; i < n; i++) {
    left[i] *= scale;
    right[i] *= scale;
  }

  return { left, right };
}

function writeStereoWav16(filePath, leftF32, rightF32, sampleRate = SAMPLE_RATE) {
  const numFrames = Math.min(leftF32.length, rightF32.length);
  const numChannels = 2;
  const bytesPerSample = 2;
  const dataBytes = numFrames * numChannels * bytesPerSample;
  const header = Buffer.alloc(44);

  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataBytes, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * numChannels * bytesPerSample, 28);
  header.writeUInt16LE(numChannels * bytesPerSample, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(dataBytes, 40);

  const pcm = Buffer.allocUnsafe(dataBytes);
  let offset = 0;
  for (let i = 0; i < numFrames; i++) {
    const sl = Math.max(-1, Math.min(1, leftF32[i]));
    const sr = Math.max(-1, Math.min(1, rightF32[i]));
    pcm.writeInt16LE(Math.round(sl * 32767), offset);
    pcm.writeInt16LE(Math.round(sr * 32767), offset + 2);
    offset += 4;
  }

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, Buffer.concat([header, pcm]));
}

class NodeKokoroEngine {
  constructor() {
    this.ort = null;
    this.session = null;
    this.backendName = 'uninitialized';
    this.voiceTensors = new Map();
    this.availableVoices = [];
    this.initPromise = null;
  }

  ensureModelBuffer() {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    const cachedModel = path.join(CACHE_DIR, 'kokoro-q8.onnx');
    if (fs.existsSync(cachedModel) && fs.statSync(cachedModel).size > 90_000_000) {
      return fs.readFileSync(cachedModel);
    }
    const shardFiles = fs
      .readdirSync(SHARDS_DIR)
      .filter((f) => f.startsWith('kokoro-q8.part') && f.endsWith('.bin'))
      .sort();
    if (!shardFiles.length) {
      throw new Error('kokoro-q8-shards not found in node_modules — please run `npm install`');
    }
    const buf = Buffer.concat(shardFiles.map((f) => fs.readFileSync(path.join(SHARDS_DIR, f))));
    try {
      fs.writeFileSync(cachedModel, buf);
    } catch {
      // Safe fallback to in-memory buffer
    }
    return buf;
  }

  loadVoicesList() {
    const files = fs
      .readdirSync(VOICES_DIR)
      .filter((f) => f.endsWith('.bin'))
      .sort();
    this.availableVoices = files.map((f) => path.basename(f, '.bin'));
    return this.availableVoices;
  }

  getVoiceTensor(voiceId) {
    const safeId = this.availableVoices.includes(voiceId) ? voiceId : 'af_heart';
    if (this.voiceTensors.has(safeId)) {
      return this.voiceTensors.get(safeId);
    }
    const bytes = fs.readFileSync(path.join(VOICES_DIR, `${safeId}.bin`));
    const exact = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    const arr = new Float32Array(exact);
    this.voiceTensors.set(safeId, arr);
    return arr;
  }

  getStyleVector(voiceId, blendVoice, blendRatio, tokenLenWithPad) {
    const primary = this.getVoiceTensor(voiceId);
    const tokenIdx = Math.min(Math.max(tokenLenWithPad - 2, 0), 509);
    const offset = tokenIdx * STYLE_DIM;
    const s1 = primary.subarray(offset, offset + STYLE_DIM);

    const r = Math.max(0, Math.min(1, Number(blendRatio) || 0));
    if (blendVoice && this.availableVoices.includes(blendVoice) && r > 0.01) {
      const secondary = this.getVoiceTensor(blendVoice);
      const s2 = secondary.subarray(offset, offset + STYLE_DIM);
      const mixed = new Float32Array(STYLE_DIM);
      for (let i = 0; i < STYLE_DIM; i++) {
        mixed[i] = (1 - r) * s1[i] + r * s2[i];
      }
      return mixed;
    }
    return Float32Array.from(s1);
  }

  async init() {
    if (this.session) return this;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      const modelBuf = this.ensureModelBuffer();
      this.loadVoicesList();

      // 1. Prefer native C++ ONNX Runtime (Windows win32-x64 / macOS / Linux native DLL/SO)
      try {
        const ortNode = require('onnxruntime-node');
        this.session = await ortNode.InferenceSession.create(modelBuf, {
          intraOpNumThreads: Math.max(1, Math.min(8, os.cpus().length)),
        });
        this.ort = ortNode;
        this.backendName = `onnxruntime-node (${process.platform}-${process.arch} native C++)`;
        console.log(`[VoiceEngine] Kokoro-82M Neural Engine ready via ${this.backendName} (${this.availableVoices.length} studio voices loaded)`);
        return this;
      } catch {
        // Native addon unavailable -> automatic universal SIMD WASM fallback!
      }

      // 2. Universal zero-install fallback: pure V8 SIMD WebAssembly (Windows, macOS, & Linux)
      const ortWeb = require('onnxruntime-web');
      const wasmDir = path.join(ROOT_DIR, 'node_modules', 'onnxruntime-web', 'dist');
      ortWeb.env.wasm.wasmPaths = pathToFileURL(wasmDir + path.sep).href;
      ortWeb.env.wasm.wasmBinary = fs.readFileSync(path.join(wasmDir, 'ort-wasm-simd-threaded.wasm'));
      ortWeb.env.wasm.numThreads = 1;
      this.session = await ortWeb.InferenceSession.create(modelBuf, {
        executionProviders: ['wasm'],
      });
      this.ort = ortWeb;
      this.backendName = `onnxruntime-web WASM (${process.platform}-${process.arch} pure JS)`;
      console.log(`[VoiceEngine] Kokoro-82M Neural Engine ready via ${this.backendName} (${this.availableVoices.length} studio voices loaded)`);
      return this;
    })();

    return this.initPromise;
  }

  async synthesizePhonemeChunk(phonemes, voiceId, speed, blendVoice, blendRatio) {
    await this.init();
    const rawIds = [];
    for (const ch of phonemes) {
      if (VOCAB[ch] !== undefined) rawIds.push(VOCAB[ch]);
    }
    if (!rawIds.length) {
      return new Float32Array(Math.floor(0.25 * SAMPLE_RATE));
    }

    const parts = [];
    for (let start = 0; start < rawIds.length; start += 480) {
      const sub = rawIds.slice(start, start + 480);
      const padded = [0, ...sub, 0];
      const styleVec = this.getStyleVector(voiceId, blendVoice, blendRatio, padded.length);
      const safeSpeed = Math.max(0.55, Math.min(1.8, Number(speed) || 1.0));

      const out = await this.session.run({
        input_ids: new this.ort.Tensor('int64', BigInt64Array.from(padded.map(BigInt)), [1, padded.length]),
        style: new this.ort.Tensor('float32', styleVec, [1, STYLE_DIM]),
        speed: new this.ort.Tensor('float32', Float32Array.from([safeSpeed]), [1]),
      });
      parts.push(trimEdgeSilence(out.waveform.data));
    }

    return parts.length === 1 ? parts[0] : concatFloat32(parts);
  }

  async synthesizeText(text, { voice = 'af_heart', speed = 1.0, lang = 'auto', blendVoice = null, blendRatio = 0.0, offsetSec = 0 } = {}) {
    await this.init();
    const sentences = splitSentences(text);
    const detectedLang = detectLanguage(text, lang);
    if (!sentences.length) {
      const silent = new Float32Array(Math.floor(0.5 * SAMPLE_RATE));
      return { audio: silent, detectedLang, timings: [] };
    }

    const segments = [];
    const timings = [];
    const pause = new Float32Array(Math.floor(0.16 * SAMPLE_RATE));
    let localSamples = 0;

    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i];
      const { phonemes } = await textToKokoroPhonemes(sentence, detectedLang, voice);
      const audio = await this.synthesizePhonemeChunk(phonemes, voice, speed, blendVoice, blendRatio);
      const sStart = offsetSec + localSamples / SAMPLE_RATE;
      localSamples += audio.length;
      const sEnd = offsetSec + localSamples / SAMPLE_RATE;

      timings.push({
        text: sentence,
        start: Number(sStart.toFixed(3)),
        end: Number(sEnd.toFixed(3)),
      });

      segments.push(audio);
      if (i < sentences.length - 1) {
        segments.push(pause);
        localSamples += pause.length;
      }
    }

    const combined = concatFloat32(segments);
    let peak = 1e-6;
    for (let i = 0; i < combined.length; i++) {
      const a = Math.abs(combined[i]);
      if (a > peak) peak = a;
    }
    const norm = 0.90 / peak;
    for (let i = 0; i < combined.length; i++) {
      combined[i] *= norm;
    }
    return { audio: combined, detectedLang, timings };
  }

  mixAndSaveWav(voiceMono, outWavPath, { musicStyle = 'none', musicVolume = 0.22, sfxStereo = null } = {}) {
    const n = voiceMono.length;
    const hasMusic = Boolean(musicStyle && musicStyle !== 'none');
    if (hasMusic || sfxStereo) {
      const vol = hasMusic ? Math.max(0.0, Math.min(0.85, Number(musicVolume) || 0.22)) : 0;
      const music = hasMusic ? composeStereoMusic(n, musicStyle) : null;
      const mixL = new Float32Array(n);
      const mixR = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        const mL = music ? music.left[i] * vol : 0;
        const mR = music ? music.right[i] * vol : 0;
        const fxL = sfxStereo && i < sfxStereo.left.length ? sfxStereo.left[i] : 0;
        const fxR = sfxStereo && i < sfxStereo.right.length ? sfxStereo.right[i] : 0;
        mixL[i] = Math.tanh((voiceMono[i] * 0.94 + mL + fxL) * 1.06);
        mixR[i] = Math.tanh((voiceMono[i] * 0.94 + mR + fxR) * 1.06);
      }
      writeStereoWav16(outWavPath, mixL, mixR, SAMPLE_RATE);
    } else {
      const clean = new Float32Array(n);
      for (let i = 0; i < n; i++) clean[i] = Math.tanh(voiceMono[i] * 0.95);
      writeStereoWav16(outWavPath, clean, clean, SAMPLE_RATE);
    }
  }

  async synthesizeClipToWav({
    text,
    voice = 'af_heart',
    speed = 1.0,
    lang = 'auto',
    blendVoice = null,
    blendRatio = 0.0,
    musicStyle = 'none',
    musicVolume = 0.22,
    outWavPath,
  }) {
    const { audio, detectedLang, timings } = await this.synthesizeText(text, {
      voice,
      speed,
      lang,
      blendVoice,
      blendRatio,
    });
    this.mixAndSaveWav(audio, outWavPath, { musicStyle, musicVolume });
    return {
      ok: true,
      duration: Number((audio.length / SAMPLE_RATE).toFixed(3)),
      resolved_lang: detectedLang,
      timings,
      waveform: computeWaveformEnvelope(audio, 64),
    };
  }

  async synthesizeBatchScenesToWav({
    scenes = [],
    voice = 'af_heart',
    speed = 1.0,
    lang = 'auto',
    blendVoice = null,
    blendRatio = 0.0,
    musicStyle = 'cinematic_epic',
    musicVolume = 0.24,
    outWavPath,
    onStep = null,
  }) {
    await this.init();
    const introSilence = new Float32Array(Math.floor(0.35 * SAMPLE_RATE));
    const interPause = new Float32Array(Math.floor(0.35 * SAMPLE_RATE));
    const outroTail = new Float32Array(Math.floor(0.65 * SAMPLE_RATE));

    const parts = [introSilence];
    const sceneMetas = [];
    let cursorSamples = introSilence.length;
    let detectedLang = lang;

    for (let idx = 0; idx < scenes.length; idx++) {
      const sc = scenes[idx];
      const sceneVoice = sc.voice || voice;
      const startSec = cursorSamples / SAMPLE_RATE;

      const res = await this.synthesizeText(sc.narration || '', {
        voice: sceneVoice,
        speed,
        lang,
        blendVoice,
        blendRatio,
        offsetSec: startSec,
      });
      detectedLang = res.detectedLang;

      parts.push(res.audio);
      cursorSamples += res.audio.length;
      const endSec = cursorSamples / SAMPLE_RATE;

      sceneMetas.push({
        index: idx,
        start: Number(startSec.toFixed(3)),
        end: Number(endSec.toFixed(3)),
        duration: Number((res.audio.length / SAMPLE_RATE).toFixed(3)),
        resolved_lang: detectedLang,
        timings: res.timings,
        waveform: computeWaveformEnvelope(res.audio, 64),
      });

      if (onStep) {
        onStep({ scene_done: idx + 1, scene_total: scenes.length });
      }

      if (idx < scenes.length - 1) {
        parts.push(interPause);
        cursorSamples += interPause.length;
      }
    }

    parts.push(outroTail);
    const fullVoice = concatFloat32(parts);
    const sfxStereo = renderTimelineFoleySfx(fullVoice.length, scenes, sceneMetas);
    this.mixAndSaveWav(fullVoice, outWavPath, { musicStyle, musicVolume, sfxStereo });

    return {
      ok: true,
      total_duration: Number((fullVoice.length / SAMPLE_RATE).toFixed(3)),
      resolved_lang: detectedLang,
      scenes: sceneMetas,
    };
  }
}

const nodeKokoroEngine = new NodeKokoroEngine();

module.exports = {
  SAMPLE_RATE,
  nodeKokoroEngine,
};
