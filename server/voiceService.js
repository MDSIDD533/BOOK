const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const readline = require('readline');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;

class VoiceService {
  constructor() {
    this.worker = null;
    this.readyPromise = null;
    this.pending = new Map();
    this.reqCounter = 1;
    this.queue = Promise.resolve();
  }

  ensureWorker() {
    if (this.worker && this.readyPromise) {
      return this.readyPromise;
    }

    this.readyPromise = new Promise((resolve, reject) => {
      const scriptPath = path.join(__dirname, 'tts_worker.py');
      const proc = spawn('python3', ['-u', scriptPath], {
        cwd: path.join(__dirname, '..'),
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      this.worker = proc;
      let started = false;

      const rl = readline.createInterface({ input: proc.stdout });
      rl.on('line', (line) => {
        let msg;
        try {
          msg = JSON.parse(line);
        } catch {
          return;
        }
        if (msg.ready && !started) {
          started = true;
          console.log(`[VoiceEngine] Kokoro-82M Neural Engine ready (${msg.voices.length} studio voices loaded)`);
          resolve(msg);
          return;
        }
        if (msg.progress_id && this.pending.has(msg.progress_id)) {
          const { onStep } = this.pending.get(msg.progress_id);
          if (onStep) onStep(msg);
          return;
        }
        if (msg.id && this.pending.has(msg.id)) {
          const { res, rej } = this.pending.get(msg.id);
          this.pending.delete(msg.id);
          if (msg.ok) res(msg);
          else rej(new Error(msg.error || 'Voice synthesis failed'));
        }
      });

      proc.stderr.on('data', (chunk) => {
        const txt = chunk.toString().trim();
        if (txt && !txt.includes('UserWarning')) {
          console.warn('[VoiceEngine stderr]', txt);
        }
      });

      proc.on('exit', (code) => {
        console.warn(`[VoiceEngine] Worker exited (${code})`);
        this.worker = null;
        this.readyPromise = null;
        if (!started) {
          reject(new Error(`TTS worker failed to start (code ${code})`));
        }
        for (const [, { rej }] of this.pending.entries()) {
          rej(new Error('TTS worker restarted'));
        }
        this.pending.clear();
      });
    });

    return this.readyPromise;
  }

  sendCommand(payload, onStep = null) {
    const run = async () => {
      await this.ensureWorker();
      return new Promise((res, rej) => {
        const id = `req_${this.reqCounter++}`;
        this.pending.set(id, { res, rej, onStep });
        this.worker.stdin.write(JSON.stringify({ ...payload, id }) + '\n');
      });
    };
    this.queue = this.queue.then(run, run);
    return this.queue;
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
      const ff = spawn(ffmpegPath, args);
      let errOut = '';
      ff.stderr.on('data', (d) => { errOut += d.toString(); });
      ff.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`FFmpeg audio master error (${code}): ${errOut.slice(-300)}`));
      });
    });

    try {
      fs.unlinkSync(inWavPath);
    } catch {
      // ignore
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
    const tmpWav = outMp3Path.replace(/\.mp3$/i, '.raw.wav');
    const result = await this.sendCommand({
      cmd: 'tts',
      text,
      voice,
      speed: Number(speed) || 1.0,
      lang: lang || 'auto',
      blend_voice: blendVoice || null,
      blend_ratio: Number(blendRatio) || 0,
      music_style: musicStyle || 'none',
      music_volume: Number(musicVolume) || 0.22,
      out_wav: tmpWav,
    });

    await this.masterAudioToMp3(tmpWav, outMp3Path, {
      pitchSemitones: Number(pitchSemitones) || 0,
      effectPreset: effectPreset || 'clean',
    });

    return result;
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
    const tmpWav = outMp3Path.replace(/\.mp3$/i, '.raw.wav');
    const result = await this.sendCommand(
      {
        cmd: 'batch_scenes',
        scenes,
        voice,
        speed: Number(speed) || 1.0,
        lang: lang || 'auto',
        blend_voice: blendVoice || null,
        blend_ratio: Number(blendRatio) || 0,
        music_style: musicStyle || 'cinematic_epic',
        music_volume: Number(musicVolume) || 0.24,
        out_wav: tmpWav,
      },
      onStep
    );

    await this.masterAudioToMp3(tmpWav, outMp3Path, {
      pitchSemitones: Math.abs(Number(pitchSemitones)) >= 0.1 ? Number(pitchSemitones) : 0,
      effectPreset: effectPreset || 'podcast_warm',
    });

    return result;
  }
}

const voiceService = new VoiceService();
module.exports = { voiceService };
