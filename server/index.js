const express = require('express');
const http = require('http');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const { VOICE_CATALOG } = require('./voiceCatalog');
const { voiceService } = require('./voiceService');
const { generateLocalStoryboard, detectSceneArchetype } = require('./scriptDirector');
const { FIGHT_ACTION_PLATES, parseStoryIntoScenes, generateStoryFromTopic } = require('./storyAnalyzer');
const { generateCompleteVideo, ASPECT_DIMENSIONS } = require('./videoGenerator');
const { renderProceduralBackdrop } = require('./sceneRenderer');
const { renderSceneStoryCast } = require('./storyCharacters');

const ROOT_DIR = path.join(__dirname, '..');
const DATA_DIR = path.join(ROOT_DIR, 'data');
const MEDIA_DIR = path.join(DATA_DIR, 'media');
const VIDEOS_DIR = path.join(ROOT_DIR, 'videos');
const PREVIEW_DIR = path.join(ROOT_DIR, 'preview');
const LIB_FILE = path.join(DATA_DIR, 'library.json');

if (process.argv.includes('--production')) {
  process.env.NODE_ENV = 'production';
}

fs.mkdirSync(MEDIA_DIR, { recursive: true });

function buildDefaultDemoVideos() {
  const items = [];
  const leoMp4 = path.join(VIDEOS_DIR, 'Leo_vs_Shadow_Street_Fighter.mp4');
  if (fs.existsSync(leoMp4)) {
    items.push({
      id: 'demo_leo_vs_shadow',
      title: 'Leo vs. Shadow: Ultimate Street Fighter Champion (HD Cinema + Foley SFX)',
      aspectRatio: '9:16',
      visualStyle: 'cinematic',
      captionStyle: 'karaoke_pill',
      voice: 'am_michael',
      voiceName: 'Michael (Cinema Trailer + Foley SFX)',
      musicStyle: 'driving_pulse',
      duration: 49.1,
      width: 720,
      height: 1280,
      scenesCount: 10,
      lang: 'en-us',
      url: '/videos/Leo_vs_Shadow_Street_Fighter.mp4',
      audioUrl: fs.existsSync(path.join(VIDEOS_DIR, 'Leo_vs_Shadow_Street_Fighter.mp3'))
        ? '/videos/Leo_vs_Shadow_Street_Fighter.mp3'
        : null,
      thumbUrl: fs.existsSync(path.join(VIDEOS_DIR, 'Leo_vs_Shadow_Thumb.jpg'))
        ? '/videos/Leo_vs_Shadow_Thumb.jpg'
        : null,
      createdAt: new Date().toISOString(),
    });
  }
  const demoMp4 = path.join(VIDEOS_DIR, 'Sher_Aur_Samajhdar_Khargosh.mp4');
  if (fs.existsSync(demoMp4)) {
    items.push({
      id: 'demo_sher_aur_khargosh',
      title: 'Sher Aur Samajhdar Khargosh',
      aspectRatio: '9:16',
      visualStyle: 'cinematic',
      captionStyle: 'karaoke_pill',
      voice: 'am_adam',
      voiceName: 'Zain (Adam)',
      musicStyle: 'cinematic_epic',
      duration: 75.18,
      width: 720,
      height: 1280,
      scenesCount: 12,
      lang: 'roman-urdu',
      url: '/videos/Sher_Aur_Samajhdar_Khargosh.mp4',
      audioUrl: fs.existsSync(path.join(VIDEOS_DIR, 'Sher_Aur_Samajhdar_Khargosh.mp3'))
        ? '/videos/Sher_Aur_Samajhdar_Khargosh.mp3'
        : null,
      thumbUrl: null,
      createdAt: new Date().toISOString(),
    });
  }
  return items;
}

function readLibrary() {
  const defaults = buildDefaultDemoVideos();
  try {
    if (fs.existsSync(LIB_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(LIB_FILE, 'utf8'));
      if (parsed && Array.isArray(parsed.videos) && parsed.videos.length > 0) {
        const existingUrls = new Set(parsed.videos.map((v) => v.url));
        const merged = [...parsed.videos];
        for (const d of defaults) {
          if (!existingUrls.has(d.url)) merged.unshift(d);
        }
        return { ...parsed, videos: merged };
      }
    }
  } catch (err) {
    console.warn('[Library] Read error:', err.message);
  }
  return { videos: defaults, voices: [] };
}

function writeLibrary(data) {
  fs.writeFileSync(LIB_FILE, JSON.stringify(data, null, 2));
}

const jobs = new Map();

async function createApp(httpServer) {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '45mb' }));
  app.use('/media', express.static(MEDIA_DIR, { maxAge: '1h' }));
  app.use('/videos', express.static(VIDEOS_DIR, { maxAge: '1h' }));
  app.use('/preview', express.static(PREVIEW_DIR, { maxAge: '1h' }));

  // Warm up Kokoro-82M neural engine asynchronously right on server startup!
  voiceService.ensureWorker().catch((err) => {
    console.error('[Startup] Voice worker init warning:', err.message);
  });

  app.get('/api/health', (req, res) => {
    res.json({
      ok: true,
      engine: 'Kokoro-82M Neural Voice + Skia/FFmpeg 24fps Cinema Renderer',
      voicesCount: VOICE_CATALOG.length,
      aspectRatios: ASPECT_DIMENSIONS,
    });
  });

  app.get('/api/voices', (req, res) => {
    res.json({ voices: VOICE_CATALOG });
  });

  app.get('/api/library', (req, res) => {
    res.json(readLibrary());
  });

  app.delete('/api/library/:type/:id', (req, res) => {
    const { type, id } = req.params;
    const lib = readLibrary();
    const listKey = type === 'voice' ? 'voices' : 'videos';
    const target = (lib[listKey] || []).find((item) => item.id === id);
    if (target) {
      for (const rel of [target.url, target.audioUrl, target.thumbUrl]) {
        if (rel && rel.startsWith('/media/')) {
          const fp = path.join(MEDIA_DIR, path.basename(rel));
          try { fs.unlinkSync(fp); } catch { /* ignore */ }
        }
      }
      lib[listKey] = lib[listKey].filter((item) => item.id !== id);
      writeLibrary(lib);
    }
    res.json({ ok: true, library: lib });
  });

  // Instant procedural or high-res cinema plate scene preview endpoint!
  app.get('/api/scene-preview', (req, res) => {
    const stageAction = String(req.query.action || 'none');
    const platePath = FIGHT_ACTION_PLATES && FIGHT_ACTION_PLATES[stageAction];
    if (platePath && fs.existsSync(platePath)) {
      res.setHeader('Content-Type', 'image/jpeg');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      return res.sendFile(platePath);
    }
    const archetype = String(req.query.archetype || detectSceneArchetype(String(req.query.prompt || ''), 0));
    const style = String(req.query.style || 'cinematic');
    const seed = Number(req.query.seed) || 42;
    const ratio = String(req.query.aspect || '16:9');
    const w = ratio === '9:16' ? 360 : ratio === '1:1' ? 420 : 560;
    const h = ratio === '9:16' ? 640 : ratio === '1:1' ? 420 : 315;
    const canvas = renderProceduralBackdrop(w, h, archetype, style, seed);
    if (stageAction && stageAction !== 'none') {
      const ctx = canvas.getContext('2d');
      renderSceneStoryCast(ctx, { archetype, stageAction, duration: 5, hasBirds: true }, 1.5, 1.5, w, h);
    }
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(canvas.toBuffer('image/jpeg', 86));
  });

  // AI Story Writer (Topic -> Full Story) & Story-to-Scenes Analyzer
  app.post('/api/story/write', (req, res) => {
    try {
      const { topic, language } = req.body || {};
      const result = generateStoryFromTopic(topic, language);
      res.json({ ok: true, ...result });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.post('/api/story/parse', (req, res) => {
    try {
      const { storyText, visualStyle } = req.body || {};
      if (!storyText || !String(storyText).trim()) {
        return res.status(400).json({ ok: false, error: 'Story text is required.' });
      }
      const parsed = parseStoryIntoScenes(String(storyText), { visualStyle });
      res.json({ ok: true, ...parsed });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // AI Script & Multi-Scene Storyboard Generator
  app.post('/api/storyboard', (req, res) => {
    try {
      const { prompt, language, sceneCount, tone, visualStyle } = req.body || {};
      const board = generateLocalStoryboard({
        prompt,
        language,
        sceneCount,
        tone,
        visualStyle,
      });
      res.json({ ok: true, storyboard: board });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // Neural Voice Synthesis Endpoint (/api/voice/generate)
  app.post('/api/voice/generate', async (req, res) => {
    try {
      const {
        text,
        title,
        voice = 'af_heart',
        speed = 1.0,
        lang = 'auto',
        blendVoice = '',
        blendRatio = 0,
        pitchSemitones = 0,
        effectPreset = 'podcast_warm',
        musicStyle = 'none',
        musicVolume = 0.22,
      } = req.body || {};

      if (!text || !String(text).trim()) {
        return res.status(400).json({ ok: false, error: 'Please enter text to generate voice.' });
      }

      const id = `vox_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
      const filename = `${id}.mp3`;
      const outMp3Path = path.join(MEDIA_DIR, filename);

      const meta = await voiceService.generateVoiceClip({
        text: String(text).trim(),
        voice,
        speed: Number(speed) || 1.0,
        lang,
        blendVoice,
        blendRatio: Number(blendRatio) || 0,
        pitchSemitones: Number(pitchSemitones) || 0,
        effectPreset,
        musicStyle,
        musicVolume: Number(musicVolume) || 0.22,
        outMp3Path,
      });

      const voiceInfo = VOICE_CATALOG.find((v) => v.id === voice) || VOICE_CATALOG[0];
      const record = {
        id,
        title: (title && String(title).trim()) || String(text).trim().slice(0, 48),
        text: String(text).trim(),
        voice,
        voiceName: voiceInfo.name,
        speed: Number(speed) || 1.0,
        lang: meta.resolved_lang || lang,
        effectPreset,
        musicStyle,
        duration: meta.duration,
        waveform: meta.waveform,
        url: `/media/${filename}`,
        createdAt: new Date().toISOString(),
      };

      const lib = readLibrary();
      lib.voices.unshift(record);
      lib.voices = lib.voices.slice(0, 50);
      writeLibrary(lib);

      res.json({ ok: true, voiceClip: record });
    } catch (err) {
      console.error('[Voice Generate Error]', err);
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // Asynchronous + Pollable HD Video Generation Endpoint (/api/video/generate)
  app.post('/api/video/generate', async (req, res) => {
    try {
      const {
        title,
        prompt,
        storyText,
        scenes: inputScenes,
        aspectRatio = '9:16',
        visualStyle = 'cinematic',
        captionStyle = 'karaoke_pill',
        showHeadlines = false,
        voice = 'am_adam',
        speed = 1.0,
        lang = 'auto',
        blendVoice = '',
        blendRatio = 0,
        pitchSemitones = 0,
        effectPreset = 'podcast_warm',
        musicStyle = 'auto',
        musicVolume = 0.24,
        sceneCount = 3,
      } = req.body || {};

      let finalScenes = Array.isArray(inputScenes) && inputScenes.length > 0 ? inputScenes : null;
      let resolvedTitle = (title && String(title).trim()) || '';
      let resolvedMusic = musicStyle;

      if (!finalScenes && storyText && String(storyText).trim()) {
        const parsed = parseStoryIntoScenes(String(storyText).trim(), { visualStyle });
        finalScenes = parsed.scenes;
        if (!resolvedTitle) resolvedTitle = parsed.title;
        if (!resolvedMusic || resolvedMusic === 'auto') {
          resolvedMusic = parsed.recommendedMusic || 'cinematic_epic';
        }
      } else if (!finalScenes) {
        const board = generateLocalStoryboard({
          prompt: prompt || 'Shandar Kamyabi Aur AI Future',
          language: lang,
          sceneCount: Number(sceneCount) || 3,
          visualStyle,
        });
        finalScenes = board.scenes;
        if (!resolvedTitle) resolvedTitle = board.title;
      }

      if (!resolvedMusic || resolvedMusic === 'auto') {
        resolvedMusic = 'cinematic_epic';
      }

      if (!resolvedTitle) {
        resolvedTitle = (finalScenes[0]?.headline || prompt || 'NoorStudio AI Video').slice(0, 54);
      }

      const jobId = `job_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
      const vidId = `vid_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
      const mp4Name = `${vidId}.mp4`;
      const mp3Name = `${vidId}.mp3`;
      const thumbName = `${vidId}.jpg`;

      const jobState = {
        jobId,
        status: 'processing',
        progress: 4,
        message: 'Initializing AI Voice & Cinema Video pipeline...',
        video: null,
        error: null,
      };
      jobs.set(jobId, jobState);

      // Run rendering asynchronously so browser gets live real-time progress updates!
      (async () => {
        try {
          const result = await generateCompleteVideo({
            title: resolvedTitle,
            scenes: finalScenes,
            aspectRatio,
            visualStyle,
            captionStyle,
            showHeadlines: Boolean(showHeadlines),
            voice,
            speed: Number(speed) || 1.0,
            lang,
            blendVoice,
            blendRatio: Number(blendRatio) || 0,
            pitchSemitones: Number(pitchSemitones) || 0,
            effectPreset,
            musicStyle: resolvedMusic,
            musicVolume: Number(musicVolume) || 0.24,
            outMp4Path: path.join(MEDIA_DIR, mp4Name),
            outThumbPath: path.join(MEDIA_DIR, thumbName),
            outAudioMp3Path: path.join(MEDIA_DIR, mp3Name),
            onProgress: (pct, msg) => {
              jobState.progress = pct;
              jobState.message = msg;
            },
          });

          const voiceInfo = VOICE_CATALOG.find((v) => v.id === voice) || VOICE_CATALOG[0];
          const videoRecord = {
            id: vidId,
            title: resolvedTitle,
            aspectRatio,
            visualStyle,
            captionStyle,
            voice,
            voiceName: voiceInfo.name,
            musicStyle,
            duration: result.duration,
            width: result.width,
            height: result.height,
            scenesCount: result.scenesCount,
            lang: result.resolvedLang,
            scenes: finalScenes.map(({ imageDataUrl, ...rest }) => rest),
            url: `/media/${mp4Name}`,
            audioUrl: `/media/${mp3Name}`,
            thumbUrl: `/media/${thumbName}`,
            createdAt: new Date().toISOString(),
          };

          const lib = readLibrary();
          lib.videos.unshift(videoRecord);
          lib.videos = lib.videos.slice(0, 40);
          writeLibrary(lib);

          jobState.status = 'completed';
          jobState.progress = 100;
          jobState.message = 'Video completed successfully!';
          jobState.video = videoRecord;
        } catch (err) {
          console.error('[Video Job Error]', err);
          jobState.status = 'failed';
          jobState.error = err.message || 'Video rendering failed';
        }
      })();

      res.json({ ok: true, jobId });
    } catch (err) {
      console.error('[Video Start Error]', err);
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.get('/api/jobs/:jobId', (req, res) => {
    const job = jobs.get(req.params.jobId);
    if (!job) {
      return res.status(404).json({ ok: false, error: 'Job not found' });
    }
    res.json({ ok: true, job });
  });

  // Serve Vite HMR in dev or built dist/ in production on the exact same port!
  const isProd = process.env.NODE_ENV === 'production' && fs.existsSync(path.join(ROOT_DIR, 'dist'));
  if (isProd) {
    const distPath = path.join(ROOT_DIR, 'dist');
    app.use(express.static(distPath));
    app.get('/{*splat}', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      root: ROOT_DIR,
      server: {
        middlewareMode: true,
        allowedHosts: true,
        hmr: httpServer ? { server: httpServer } : true,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  return app;
}

const PORT = Number(process.env.PORT) || 3000;
const httpServer = http.createServer();
createApp(httpServer)
  .then((app) => {
    httpServer.on('request', app);
    httpServer.listen(PORT, '0.0.0.0', () => {
      console.log(`\n✨ NoorStudio AI (Video + Voice Generator) is LIVE!`);
      console.log(`👉 Browser mein yeh link kholein: http://localhost:${PORT}\n`);
    });
  })
  .catch((err) => {
    console.error('Fatal server error:', err);
    process.exit(1);
  });
