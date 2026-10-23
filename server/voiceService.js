const { spawn } = require('child_process');
const fs = require('fs');
const { nodeKokoroEngine } = require('./nodeVoiceEngine');

function resolveFfmpegPath() {
  try {
    const p = require('@ffmpeg-installer/ffmpeg').path;
    if (p && fs.existsSync(p)) return p;
  } catch {
    // Fallback to system PATH ffmpeg if optional binary skipped
  }
  return process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg';
}

class VoiceService {
  constructor() {
    this.queue = Promise.resolve();
  }

  ensureWorker() {
    return nodeKokoroEngine.init();
  }

  enqueue(fn) {
    const next = this.queue.then(fn, fn);
    this.queue = next.catch(() => {});
    return next;
  }

  async masterAudioToMp3(inWavPath, outMp3Path, { pitchSemitones = 0, effectPreset = 'clean' } = {}) {
    const filters = [];

    if (Math.abs(pitchSemitones) >= 0.1) {
      const factor = Math.pow(2, pitchSemitones / 12);
      const invTempo = Math.max(0.5, Math.min(2.0, 1 / factor));
      filters.push(`asetrate=${Math.round(24000 * factor)},aresample=24000,atempo=${invTempo.toFixed(4)}`);
    }

    if (effectPreset === 'podcast_warm') {
      filters.push('equalizer=f=140:t=q:w=1.1:g=3.5,equalizer=f=5500:t=q:w=1.4:g=2.2,acompressor=threshold=-18dB:ratio=3:attack=10:release=120');
    } else if (effectPreset === 'cinema_deep') {
      filters.push('equalizer=f=95:t=q:w=1.0:g=5.0,equalizer=f=4500:t=q:w=1.3:g=2.5,aecho=0.8:0.86:45:0.14');
    } else if (effectPreset === 'crisp_broadcast') {
      filters.push('highpass=f=75,equalizer=f=3800:t=q:w=1.2:g=3.2,acompressor=threshold=-16dB:ratio=3.5:attack=6:release=90');
    } else if (effectPreset === 'radio_echo') {
      filters.push('aecho=0.8:0.88:75|135:0.22|0.12');
    }

    const args = ['-y', '-i', inWavPath];
    if (filters.length > 0) {
      args.push('-af', filters.join(','));
    }
    args.push('-ar', '44100', '-ac', '2', '-c:a', 'libmp3lame', '-b:a', '192k', outMp3Path);

    await new Promise((resolve, reject) => {
      const ff = spawn(resolveFfmpegPath(), args);
      let errOut = '';
      ff.on('error', (err) => reject(new Error(`FFmpeg spawn error: ${err.message}`)));
      ff.stderr.on('data', (d) => { errOut += d.toString(); });
      ff.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`FFmpeg audio master error (${code}): ${errOut.slice(-300)}`));
      });
    });

    try {
      fs.unlinkSync(inWavPath);
    } catch {
      // Ignore cleanup race on Windows file handles
    }
  }

  async generateVoiceClip({
    text,
    voice = 'af_heart',
    speed = 1.0,
    lang = 'auto',
    blendVoice = '',
    blendRatio = 0,
    pitchSemitones = 0,
    effectPreset = 'clean',
    musicStyle = 'none',
    musicVolume = 0.22,
    outMp3Path,
  }) {
    return this.enqueue(async () => {
      const tmpWav = outMp3Path.replace(/\.mp3$/i, '.raw.wav');
      const result = await nodeKokoroEngine.synthesizeClipToWav({
        text,
        voice,
        speed: Number(speed) || 1.0,
        lang: lang || 'auto',
        blendVoice: blendVoice || null,
        blendRatio: Number(blendRatio) || 0,
        musicStyle: musicStyle || 'none',
        musicVolume: Number(musicVolume) || 0.22,
        outWavPath: tmpWav,
      });

      await this.masterAudioToMp3(tmpWav, outMp3Path, {
        pitchSemitones: Number(pitchSemitones) || 0,
        effectPreset: effectPreset || 'clean',
      });

      return result;
    });
  }

  async generateVideoSoundtrack({
    scenes,
    voice = 'af_heart',
    speed = 1.0,
    lang = 'auto',
    blendVoice = '',
    blendRatio = 0,
    pitchSemitones = 0,
    effectPreset = 'podcast_warm',
    musicStyle = 'cinematic_epic',
    musicVolume = 0.24,
    outMp3Path,
    onStep = null,
  }) {
    return this.enqueue(async () => {
      const tmpWav = outMp3Path.replace(/\.mp3$/i, '.raw.wav');
      const result = await nodeKokoroEngine.synthesizeBatchScenesToWav({
        scenes,
        voice,
        speed: Number(speed) || 1.0,
        lang: lang || 'auto',
        blendVoice: blendVoice || null,
        blendRatio: Number(blendRatio) || 0,
        musicStyle: musicStyle || 'cinematic_epic',
        musicVolume: Number(musicVolume) || 0.24,
        outWavPath: tmpWav,
        onStep,
      });

      await this.masterAudioToMp3(tmpWav, outMp3Path, {
        pitchSemitones: Math.abs(Number(pitchSemitones)) >= 0.1 ? Number(pitchSemitones) : 0,
        effectPreset: effectPreset || 'podcast_warm',
      });

      return result;
    });
  }
}

const voiceService = new VoiceService();
module.exports = { voiceService, resolveFfmpegPath };
