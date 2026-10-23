const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { createCanvas } = require('@napi-rs/canvas');
const { voiceService, resolveFfmpegPath } = require('./voiceService');
const {
  ensureFonts,
  buildSceneSurface,
  drawRoundedRect,
  getFontFamilyForText,
  wrapWordsWithMetrics,
} = require('./sceneRenderer');
const { renderSceneStoryCast } = require('./storyCharacters');

const ASPECT_DIMENSIONS = {
  '9:16': { width: 720, height: 1280, label: 'Vertical HD (Reels / TikTok / Shorts)' },
  '16:9': { width: 1280, height: 720, label: 'Landscape HD (YouTube / Cinema)' },
  '1:1': { width: 960, height: 960, label: 'Square HD (Instagram / Feed)' },
};

function computeCameraTransform(surfaceW, surfaceH, outW, outH, motion, progress) {
  // Smooth ease-in-out curve
  const p = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;
  let scale = 1.0;
  let offsetX = 0;
  let offsetY = 0;
  const maxPanX = (surfaceW - outW) * 0.42;
  const maxPanY = (surfaceH - outH) * 0.42;

  switch (motion) {
    case 'zoom_out':
      scale = 1.12 - 0.12 * p;
      break;
    case 'pan_right':
      scale = 1.04;
      offsetX = -maxPanX + 2 * maxPanX * p;
      break;
    case 'pan_left':
      scale = 1.04;
      offsetX = maxPanX - 2 * maxPanX * p;
      break;
    case 'drift_up':
      scale = 1.05;
      offsetY = maxPanY - 2 * maxPanY * p;
      break;
    case 'zoom_in':
    default:
      scale = 1.0 + 0.13 * p;
      break;
  }

  const drawW = surfaceW * scale;
  const drawH = surfaceH * scale;
  const dx = (outW - drawW) * 0.5 + offsetX;
  const dy = (outH - drawH) * 0.5 + offsetY;
  return { dx, dy, drawW, drawH };
}

function drawSceneCameraFrame(ctx, surface, outW, outH, motion, progress, alpha = 1.0) {
  const { dx, dy, drawW, drawH } = computeCameraTransform(
    surface.width,
    surface.height,
    outW,
    outH,
    motion,
    progress
  );
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.drawImage(surface, dx, dy, drawW, drawH);
  ctx.restore();
}

function drawAtmosphericParticles(ctx, particles, timeSec, outW, outH) {
  ctx.save();
  for (const pt of particles) {
    const px = ((pt.x + pt.vx * timeSec) % 1 + 1) % 1 * outW;
    const py = ((pt.y + pt.vy * timeSec) % 1 + 1) % 1 * outH;
    const pulse = 0.55 + 0.45 * Math.sin(timeSec * 2.2 + pt.phase);
    ctx.fillStyle = `rgba(${pt.rgb}, ${(pt.alpha * pulse).toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(px, py, pt.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawCaptionOverlay(ctx, activeTiming, timeSec, outW, outH, captionStyle = 'karaoke_pill') {
  if (!activeTiming || captionStyle === 'none') return;

  const text = activeTiming.text || '';
  if (!text.trim()) return;

  const isRtl = /[\u0600-\u06FF]/.test(text);
  const wordsRaw = text.trim().split(/\s+/);
  const segDur = Math.max(0.25, activeTiming.end - activeTiming.start);
  const rel = Math.max(0, Math.min(1, (timeSec - activeTiming.start) / segDur));

  // Weighted character-proportional timing so longer words stay highlighted proportionally longer
  const totalChars = Math.max(1, wordsRaw.reduce((acc, w) => acc + w.length + 1, 0));
  let cum = 0;
  let activeWordIdx = 0;
  const wordObjs = wordsRaw.map((w, idx) => {
    const share = (w.length + 1) / totalChars;
    const startP = cum;
    const endP = cum + share;
    cum = endP;
    if (rel >= startP) activeWordIdx = idx;
    return { word: w, idx };
  });

  // Chunk long sentences into crisp 6–7 word phrase windows so captions stay big, punchy, & readable!
  const windowSize = isRtl ? 7 : 6;
  const winStart = Math.floor(activeWordIdx / windowSize) * windowSize;
  const visibleWords = wordObjs.slice(winStart, winStart + windowSize);

  const fontSize = Math.round(Math.min(outW, outH) * (outW < outH ? 0.056 : 0.062));
  const family = getFontFamilyForText(text, true);
  ctx.save();
  ctx.font = `800 ${fontSize}px ${family}`;
  ctx.textBaseline = 'middle';

  const maxBoxWidth = outW * 0.78;
  const lines = wrapWordsWithMetrics(ctx, visibleWords, maxBoxWidth);
  const lineHeight = fontSize * 1.42;
  const centerY = outW < outH ? outH * 0.77 : outH * 0.80;
  const startY = centerY - ((lines.length - 1) * lineHeight) * 0.5;

  if (isRtl) {
    // Clean, perfectly centered shaped RTL rendering (preserves full cursive Arabic/Urdu ligatures!)
    ctx.direction = 'rtl';
    ctx.textAlign = 'center';
    lines.forEach((lineArr, lIdx) => {
      const lineStr = lineArr.map((o) => o.word).join(' ');
      const y = startY + lIdx * lineHeight;
      const metricsW = Math.min(maxBoxWidth + 36, ctx.measureText(lineStr).width + 38);
      if (captionStyle === 'karaoke_pill') {
        ctx.fillStyle = 'rgba(10, 14, 28, 0.78)';
        drawRoundedRect(ctx, (outW - metricsW) * 0.5, y - lineHeight * 0.46, metricsW, lineHeight * 0.92, 16);
        ctx.fill();
        ctx.strokeStyle = 'rgba(251, 191, 36, 0.55)';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
      ctx.shadowBlur = 12;
      ctx.fillStyle = captionStyle === 'cinema_clean' ? '#fde047' : '#ffffff';
      ctx.fillText(lineStr, outW * 0.5, y);
    });
    ctx.restore();
    return;
  }

  ctx.direction = 'ltr';
  ctx.textAlign = 'left';

  lines.forEach((lineArr, lIdx) => {
    const spaceW = ctx.measureText(' ').width;
    const widths = lineArr.map((o) => ctx.measureText(o.word).width);
    const totalLineW = widths.reduce((a, b) => a + b, 0) + spaceW * Math.max(0, lineArr.length - 1);
    let cursorX = (outW - totalLineW) * 0.5;
    const y = startY + lIdx * lineHeight;

    // Subtle dark glass backdrop behind active line for ultra legibility
    if (captionStyle === 'cinema_clean') {
      ctx.fillStyle = 'rgba(8, 12, 24, 0.68)';
      drawRoundedRect(ctx, cursorX - 20, y - lineHeight * 0.44, totalLineW + 40, lineHeight * 0.88, 14);
      ctx.fill();
    }

    lineArr.forEach((item, wPos) => {
      const wWidth = widths[wPos];
      const isCurrent = item.idx === activeWordIdx;

      if (captionStyle === 'karaoke_pill' && isCurrent) {
        ctx.save();
        ctx.shadowColor = 'rgba(245, 158, 11, 0.6)';
        ctx.shadowBlur = 16;
        const grad = ctx.createLinearGradient(cursorX - 10, y - 20, cursorX + wWidth + 10, y + 20);
        grad.addColorStop(0, '#f59e0b');
        grad.addColorStop(1, '#ec4899');
        ctx.fillStyle = grad;
        drawRoundedRect(ctx, cursorX - 10, y - fontSize * 0.62, wWidth + 20, fontSize * 1.24, 13);
        ctx.fill();
        ctx.restore();
      }

      ctx.save();
      ctx.shadowColor = captionStyle === 'neon_glow' && isCurrent ? '#22d3ee' : 'rgba(0,0,0,0.92)';
      ctx.shadowBlur = captionStyle === 'neon_glow' && isCurrent ? 22 : 10;
      ctx.lineWidth = Math.max(3, Math.round(fontSize * 0.11));
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.82)';
      if (!(captionStyle === 'karaoke_pill' && isCurrent)) {
        ctx.strokeText(item.word, cursorX, y);
      }

      if (captionStyle === 'karaoke_pill') {
        ctx.fillStyle = isCurrent ? '#ffffff' : 'rgba(255,255,255,0.92)';
      } else if (captionStyle === 'neon_glow') {
        ctx.fillStyle = isCurrent ? '#22d3ee' : '#f8fafc';
      } else {
        ctx.fillStyle = isCurrent ? '#fde047' : '#ffffff';
      }
      ctx.fillText(item.word, cursorX, y);
      ctx.restore();

      cursorX += wWidth + spaceW;
    });
  });

  ctx.restore();
}

function drawHeadlineBadge(ctx, headline, sceneIdx, totalScenes, localTime, sceneDur, outW, outH) {
  if (!headline) return;
  const fadeIn = Math.min(1, localTime / 0.35);
  const fadeOut = Math.min(1, Math.max(0, (sceneDur - localTime) / 0.35));
  const alpha = Math.min(fadeIn, fadeOut) * 0.94;
  if (alpha <= 0.03) return;

  const isRtl = /[\u0600-\u06FF]/.test(headline);
  const fontSize = Math.round(Math.min(outW, outH) * 0.030);
  const family = getFontFamilyForText(headline, true);

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = `700 ${fontSize}px ${family}`;
  ctx.direction = isRtl ? 'rtl' : 'ltr';
  const label = headline.length > 42 ? headline.slice(0, 40) + '…' : headline;
  const textW = Math.min(outW * 0.80, ctx.measureText(label).width);
  const pillW = textW + 44;
  const pillH = fontSize * 2.0;
  const pillX = (outW - pillW) * 0.5;
  const pillY = outW < outH ? outH * 0.075 : outH * 0.07;

  ctx.fillStyle = 'rgba(15, 23, 42, 0.72)';
  drawRoundedRect(ctx, pillX, pillY, pillW, pillH, pillH * 0.5);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = '#f8fafc';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, outW * 0.5, pillY + pillH * 0.52);
  ctx.restore();
}

function drawAudioVisualizerAndProgress(ctx, globalTime, totalDuration, activeWaveform, sceneProgress, outW, outH) {
  // Subtle reactive soundwave bars at top-right corner
  const bars = 9;
  const barW = 4;
  const gap = 4;
  const maxH = Math.round(Math.min(outW, outH) * 0.032);
  const baseX = outW - (bars * (barW + gap)) - 28;
  const baseY = 38;

  ctx.save();
  for (let i = 0; i < bars; i++) {
    const waveIdx = Math.min(63, Math.floor(sceneProgress * 64 + i) % 64);
    const amp = activeWaveform ? activeWaveform[waveIdx] || 0.25 : 0.3;
    const dyn = Math.max(0.18, amp * (0.65 + 0.35 * Math.sin(globalTime * 11 + i * 1.1)));
    const bh = Math.max(5, maxH * dyn);
    ctx.fillStyle = 'rgba(251, 191, 36, 0.85)';
    drawRoundedRect(ctx, baseX + i * (barW + gap), baseY + (maxH - bh) * 0.5, barW, bh, 2);
    ctx.fill();
  }

  // Smooth bottom gradient progress bar
  const progW = outW * Math.max(0, Math.min(1, globalTime / Math.max(0.1, totalDuration)));
  const grad = ctx.createLinearGradient(0, 0, outW, 0);
  grad.addColorStop(0, '#f59e0b');
  grad.addColorStop(0.5, '#ec4899');
  grad.addColorStop(1, '#38bdf8');
  ctx.fillStyle = grad;
  ctx.fillRect(0, outH - 6, progW, 6);
  ctx.restore();
}

function drawStoryLiveElements(ctx, scene, localTime, globalTime, outW, outH) {
  if (scene.imageDataUrl) return;

  ctx.save();

  if (scene.hasBirds) {
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.72)';
    ctx.lineWidth = 2.2;
    for (let b = 0; b < 5; b++) {
      const bx = ((0.12 + b * 0.075 + localTime * 0.048) % 1.15) * outW - outW * 0.05;
      const by = outH * (0.24 + (b % 3) * 0.035) + Math.sin(globalTime * 2.5 + b) * 6;
      const flap = Math.sin(globalTime * 7.5 + b * 1.3) * 7;
      ctx.beginPath();
      ctx.moveTo(bx - 11, by - flap);
      ctx.quadraticCurveTo(bx - 5, by - 6, bx, by);
      ctx.quadraticCurveTo(bx + 5, by - 6, bx + 11, by - flap);
      ctx.stroke();
    }
  }

  if (scene.archetype === 'stormy_rain') {
    ctx.strokeStyle = 'rgba(186, 230, 253, 0.28)';
    ctx.lineWidth = 1.5;
    for (let r = 0; r < 95; r++) {
      const rx = ((r * 83 + globalTime * 260) % (outW + 120)) - 60;
      const ry = ((r * 137 + globalTime * 920) % outH);
      ctx.beginPath();
      ctx.moveTo(rx, ry);
      ctx.lineTo(rx - 12, ry + 34);
      ctx.stroke();
    }
    const flashCycle = localTime % 3.4;
    if (flashCycle > 1.1 && flashCycle < 1.26) {
      ctx.fillStyle = 'rgba(224, 242, 254, 0.26)';
      ctx.fillRect(0, 0, outW, outH);
    }
  }

  if (scene.character && scene.character !== 'none') {
    const walkBob = Math.abs(Math.sin(globalTime * 4.2)) * 4;
    const progressDrift = Math.min(1, localTime / 8) * (outW * 0.08);
    const cx = outW * 0.46 + progressDrift;
    const groundY = outH * 0.67 - walkBob;
    const hUnit = Math.min(outW, outH) * 0.085;

    const drawPerson = (px, py, scale = 1.0, holdingLantern = false) => {
      const hu = hUnit * scale;
      ctx.fillStyle = '#050811';
      ctx.beginPath();
      ctx.arc(px, py - hu * 0.88, hu * 0.14, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(px - hu * 0.16, py - hu * 0.72);
      ctx.lineTo(px + hu * 0.16, py - hu * 0.72);
      ctx.lineTo(px + hu * 0.26, py - hu * 0.16);
      ctx.lineTo(px - hu * 0.24, py - hu * 0.16);
      ctx.closePath();
      ctx.fill();
      const stride = Math.sin(globalTime * 4.2) * (hu * 0.14);
      ctx.lineWidth = Math.max(3, hu * 0.09);
      ctx.strokeStyle = '#050811';
      ctx.beginPath();
      ctx.moveTo(px - hu * 0.06, py - hu * 0.2);
      ctx.lineTo(px - hu * 0.08 - stride, py);
      ctx.moveTo(px + hu * 0.06, py - hu * 0.2);
      ctx.lineTo(px + hu * 0.08 + stride, py);
      ctx.stroke();

      if (holdingLantern) {
        const lx = px + hu * 0.34;
        const ly = py - hu * 0.52 + Math.sin(globalTime * 3.2) * 3;
        const halo = ctx.createRadialGradient(lx, ly, 2, lx, ly, hu * 1.45);
        halo.addColorStop(0, 'rgba(254, 240, 138, 0.95)');
        halo.addColorStop(0.35, 'rgba(245, 158, 11, 0.38)');
        halo.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(lx, ly, hu * 1.45, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#fef9c3';
        ctx.beginPath();
        ctx.arc(lx, ly, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    drawPerson(cx, groundY, 1.0, scene.character === 'lantern_hero' || scene.archetype === 'stormy_rain');
    if (scene.character === 'two_figures') {
      drawPerson(cx - hUnit * 0.52, groundY + 4, 0.88, false);
    }
  }

  ctx.restore();
}

async function generateCompleteVideo({
  title = 'NoorStudio Video',
  scenes = [],
  aspectRatio = '9:16',
  visualStyle = 'cinematic',
  captionStyle = 'karaoke_pill',
  showHeadlines = true,
  voice = 'af_heart',
  speed = 1.0,
  lang = 'auto',
  blendVoice = '',
  blendRatio = 0,
  pitchSemitones = 0,
  effectPreset = 'podcast_warm',
  musicStyle = 'cinematic_epic',
  musicVolume = 0.24,
  outMp4Path,
  outThumbPath,
  outAudioMp3Path,
  onProgress = () => {},
}) {
  ensureFonts();
  const dims = ASPECT_DIMENSIONS[aspectRatio] || ASPECT_DIMENSIONS['9:16'];
  const outW = dims.width;
  const outH = dims.height;
  const fps = 24;

  onProgress(8, 'Synthesizing neural AI voiceover & musical score...');

  const audioResult = await voiceService.generateVideoSoundtrack({
    scenes,
    voice,
    speed,
    lang,
    blendVoice,
    blendRatio,
    pitchSemitones,
    effectPreset,
    musicStyle,
    musicVolume,
    outMp3Path: outAudioMp3Path,
    onStep: ({ scene_done, scene_total }) => {
      const pct = 8 + Math.round((scene_done / Math.max(1, scene_total)) * 34);
      onProgress(pct, `Synthesized AI voice for scene ${scene_done} of ${scene_total}...`);
    },
  });

  onProgress(36, 'Painting high-definition cinema scene worlds...');

  const sceneMetas = [];
  for (let i = 0; i < scenes.length; i++) {
    const surface = await buildSceneSurface(scenes[i], outW, outH, visualStyle, i);
    const timingMeta = audioResult.scenes[i] || {
      start: 0,
      end: 4,
      duration: 4,
      timings: [],
      waveform: new Array(64).fill(0.35),
    };
    sceneMetas.push({
      ...scenes[i],
      ...timingMeta,
      surface,
    });
    onProgress(36 + Math.round(((i + 1) / scenes.length) * 14), `Prepared scene ${i + 1} of ${scenes.length}...`);
  }

  const allTimings = sceneMetas.flatMap((s) => s.timings || []);
  const totalDuration = Math.max(1.5, audioResult.total_duration);
  const totalFrames = Math.max(fps, Math.round(totalDuration * fps));

  // Floating bokeh / dust particles for organic cinema motion
  const particles = Array.from({ length: 34 }, (_, idx) => ({
    x: ((idx * 37) % 100) / 100,
    y: ((idx * 61) % 100) / 100,
    vx: ((idx % 5) - 2) * 0.008,
    vy: -0.012 - (idx % 4) * 0.006,
    r: 1.5 + (idx % 5) * 1.35,
    alpha: 0.14 + (idx % 4) * 0.08,
    phase: idx * 0.7,
    rgb: idx % 2 === 0 ? '253, 230, 138' : '125, 211, 252',
  }));

  const canvas = createCanvas(outW, outH);
  const ctx = canvas.getContext('2d');

  onProgress(52, 'Encoding 24fps HD H.264 motion frames & subtitles...');

  const ff = spawn(resolveFfmpegPath(), [
    '-y',
    '-f', 'rawvideo',
    '-pix_fmt', 'rgba',
    '-s', `${outW}x${outH}`,
    '-r', String(fps),
    '-i', 'pipe:0',
    '-i', outAudioMp3Path,
    '-c:v', 'libx264',
    '-preset', 'veryfast',
    '-crf', '21',
    '-pix_fmt', 'yuv420p',
    '-c:a', 'aac',
    '-b:a', '192k',
    '-shortest',
    '-movflags', '+faststart',
    outMp4Path,
  ]);

  let ffErr = '';
  let ffSpawnErr = null;
  ff.on('error', (err) => { ffSpawnErr = err; });
  ff.stdin.on('error', () => { /* safely ignore EPIPE if ffmpeg finishes early */ });
  ff.stderr.on('data', (d) => { ffErr += d.toString(); });

  const transitionDur = 0.42;
  let thumbSaved = false;
  const thumbTargetFrame = Math.min(totalFrames - 1, Math.round(fps * 1.1));

  for (let f = 0; f < totalFrames; f++) {
    const t = f / fps;

    // Identify active scene & optional incoming crossfade scene
    let scIdx = sceneMetas.length - 1;
    for (let i = 0; i < sceneMetas.length; i++) {
      if (t < sceneMetas[i].end || i === sceneMetas.length - 1) {
        scIdx = i;
        break;
      }
    }

    const cur = sceneMetas[scIdx];
    const curProgress = Math.max(0, Math.min(1, (t - cur.start) / Math.max(0.2, cur.duration)));

    drawSceneCameraFrame(ctx, cur.surface, outW, outH, cur.cameraMotion || 'zoom_in', curProgress, 1.0);

    // Smooth crossfade into next scene during last 0.42s of current scene
    if (scIdx < sceneMetas.length - 1 && cur.end - t < transitionDur) {
      const nextSc = sceneMetas[scIdx + 1];
      const blendAlpha = Math.max(0, Math.min(1, 1 - (cur.end - t) / transitionDur));
      drawSceneCameraFrame(ctx, nextSc.surface, outW, outH, nextSc.cameraMotion || 'zoom_in', 0.0, blendAlpha);
    }

    drawAtmosphericParticles(ctx, particles, t, outW, outH);
    renderSceneStoryCast(ctx, cur, t - cur.start, t, outW, outH);

    if (showHeadlines && cur.headline) {
      drawHeadlineBadge(ctx, cur.headline, scIdx, sceneMetas.length, t - cur.start, cur.duration, outW, outH);
    }

    // Active narration subtitle
    const activeSub = allTimings.find((tm) => t >= tm.start - 0.04 && t <= tm.end + 0.16);
    drawCaptionOverlay(ctx, activeSub, t, outW, outH, captionStyle);

    drawAudioVisualizerAndProgress(ctx, t, totalDuration, cur.waveform, curProgress, outW, outH);

    if (!thumbSaved && f >= thumbTargetFrame && outThumbPath) {
      thumbSaved = true;
      fs.writeFileSync(outThumbPath, canvas.toBuffer('image/jpeg', 86));
    }

    const raw = canvas.data();
    if (!ff.stdin.write(raw)) {
      await new Promise((r) => ff.stdin.once('drain', r));
    }

    if (f % 24 === 0) {
      const pct = 52 + Math.round((f / totalFrames) * 44);
      onProgress(pct, `Rendering HD frame ${f + 1} / ${totalFrames}...`);
    }
  }

  if (!thumbSaved && outThumbPath) {
    fs.writeFileSync(outThumbPath, canvas.toBuffer('image/jpeg', 86));
  }

  ff.stdin.end();
  await new Promise((resolve, reject) => {
    if (ffSpawnErr) {
      reject(new Error(`FFmpeg spawn error: ${ffSpawnErr.message}`));
      return;
    }
    ff.on('error', (err) => reject(new Error(`FFmpeg spawn error: ${err.message}`)));
    ff.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`FFmpeg video mux error (${code}): ${ffErr.slice(-350)}`));
    });
  });

  onProgress(100, 'Video ready!');

  return {
    duration: totalDuration,
    width: outW,
    height: outH,
    fps,
    totalFrames,
    scenesCount: sceneMetas.length,
    resolvedLang: sceneMetas[0]?.resolved_lang || lang,
  };
}

module.exports = { generateCompleteVideo, ASPECT_DIMENSIONS };
