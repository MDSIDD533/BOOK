const path = require('path');
const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');

let fontsRegistered = false;
function ensureFonts() {
  if (fontsRegistered) return;
  const fontDir = path.join(__dirname, 'assets', 'fonts');
  const mapping = [
    ['PlusJakartaSans-ExtraBold.ttf', 'JakartaExtraBold'],
    ['PlusJakartaSans-Bold.ttf', 'JakartaBold'],
    ['PlusJakartaSans-Medium.ttf', 'JakartaMedium'],
    ['SpaceGrotesk-Bold.ttf', 'SpaceGrotesk'],
    ['NotoSansArabic-Bold.ttf', 'NotoArabic'],
    ['NotoSansDevanagari-Bold.ttf', 'NotoDevanagari'],
  ];
  for (const [file, family] of mapping) {
    try {
      GlobalFonts.registerFromPath(path.join(fontDir, file), family);
    } catch (err) {
      console.warn('[Fonts] Could not register', file, err.message);
    }
  }
  fontsRegistered = true;
}

function seededRand(seed) {
  let s = (seed >>> 0) || 1234567;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const STYLE_PALETTES = {
  cinematic: {
    skyTop: '#090d1a',
    skyMid: '#1c2541',
    skyLow: '#d97706',
    accent: '#fbbf24',
    accent2: '#38bdf8',
    fgDark: '#070a14',
  },
  cyberpunk: {
    skyTop: '#07041a',
    skyMid: '#240046',
    skyLow: '#f72585',
    accent: '#00f5d4',
    accent2: '#f72585',
    fgDark: '#050212',
  },
  '3d_glow': {
    skyTop: '#0f172a',
    skyMid: '#312e81',
    skyLow: '#ec4899',
    accent: '#60a5fa',
    accent2: '#f472b6',
    fgDark: '#090d1f',
  },
  anime: {
    skyTop: '#1d3557',
    skyMid: '#457b9d',
    skyLow: '#ff758f',
    accent: '#ffd166',
    accent2: '#a8dadc',
    fgDark: '#101b2d',
  },
  golden_luxury: {
    skyTop: '#090806',
    skyMid: '#261c10',
    skyLow: '#b45309',
    accent: '#fde68a',
    accent2: '#f59e0b',
    fgDark: '#050403',
  },
  documentary: {
    skyTop: '#0b131e',
    skyMid: '#1e3a4c',
    skyLow: '#64748b',
    accent: '#38bdf8',
    accent2: '#e2e8f0',
    fgDark: '#060a10',
  },
};

function renderProceduralBackdrop(width, height, archetype = 'golden_mountains', visualStyle = 'cinematic', seed = 42) {
  ensureFonts();
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  const rng = seededRand(seed);
  const basePal = STYLE_PALETTES[visualStyle] || STYLE_PALETTES.cinematic;

  // Storm scenes use dramatic slate-indigo brooding atmosphere automatically
  const pal =
    archetype === 'stormy_rain'
      ? { skyTop: '#050811', skyMid: '#162033', skyLow: '#334155', accent: '#93c5fd', accent2: '#e2e8f0', fgDark: '#04060c' }
      : basePal;

  const sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, pal.skyTop);
  sky.addColorStop(0.54, pal.skyMid);
  sky.addColorStop(0.84, pal.skyLow);
  sky.addColorStop(1, pal.fgDark);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);

  // Subtle background starlight
  ctx.save();
  const starCount = archetype === 'stormy_rain' ? 20 : 100;
  for (let i = 0; i < starCount; i++) {
    const sx = rng() * width;
    const sy = rng() * height * 0.54;
    const r = 0.6 + rng() * 1.8;
    ctx.fillStyle = `rgba(255,255,255,${(0.14 + rng() * 0.62).toFixed(2)})`;
    ctx.beginPath();
    ctx.arc(sx, sy, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  if (archetype === 'village_cottage') {
    // Warm morning sun + rolling hills + cozy glowing storybook cottages & winding path
    const sunX = width * 0.68;
    const sunY = height * 0.42;
    const sunGlow = ctx.createRadialGradient(sunX, sunY, 8, sunX, sunY, Math.max(width, height) * 0.5);
    sunGlow.addColorStop(0, 'rgba(254, 240, 138, 0.92)');
    sunGlow.addColorStop(0.32, 'rgba(251, 146, 60, 0.42)');
    sunGlow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = sunGlow;
    ctx.fillRect(0, 0, width, height);

    // Distant soft mountain range
    ctx.fillStyle = 'rgba(30, 41, 59, 0.65)';
    ctx.beginPath();
    ctx.moveTo(0, height * 0.56);
    for (let i = 0; i <= 10; i++) {
      ctx.lineTo((i / 10) * width, height * (0.46 + (rng() - 0.5) * 0.1));
    }
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.fill();

    // Rolling meadows
    const hillGrad = ctx.createLinearGradient(0, height * 0.55, 0, height);
    hillGrad.addColorStop(0, '#132a28');
    hillGrad.addColorStop(1, '#060c12');
    ctx.fillStyle = hillGrad;
    ctx.beginPath();
    ctx.moveTo(0, height * 0.60);
    ctx.quadraticCurveTo(width * 0.35, height * 0.53, width * 0.7, height * 0.61);
    ctx.quadraticCurveTo(width * 0.88, height * 0.65, width, height * 0.59);
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.fill();

    // Winding glowing country path
    ctx.fillStyle = 'rgba(217, 119, 6, 0.22)';
    ctx.beginPath();
    ctx.moveTo(width * 0.47, height * 0.61);
    ctx.bezierCurveTo(width * 0.32, height * 0.72, width * 0.66, height * 0.82, width * 0.40, height);
    ctx.lineTo(width * 0.58, height);
    ctx.bezierCurveTo(width * 0.76, height * 0.82, width * 0.40, height * 0.72, width * 0.52, height * 0.61);
    ctx.fill();

    // Cozy storybook cottages with warm glowing windows
    const drawCottage = (cx, cy, scale) => {
      const cw = width * 0.12 * scale;
      const ch = cw * 0.72;
      ctx.fillStyle = '#0d1526';
      ctx.fillRect(cx - cw * 0.5, cy - ch, cw, ch);
      // Pitched roof
      ctx.fillStyle = '#1e1b2e';
      ctx.beginPath();
      ctx.moveTo(cx - cw * 0.64, cy - ch);
      ctx.lineTo(cx, cy - ch - cw * 0.52);
      ctx.lineTo(cx + cw * 0.64, cy - ch);
      ctx.closePath();
      ctx.fill();
      // Chimney
      ctx.fillRect(cx + cw * 0.2, cy - ch - cw * 0.45, cw * 0.14, cw * 0.32);
      // Warm lit windows with glow
      const wg = ctx.createRadialGradient(cx, cy - ch * 0.48, 2, cx, cy - ch * 0.48, cw * 0.65);
      wg.addColorStop(0, 'rgba(253, 224, 71, 0.55)');
      wg.addColorStop(1, 'rgba(253, 224, 71, 0)');
      ctx.fillStyle = wg;
      ctx.fillRect(cx - cw, cy - ch * 1.2, cw * 2, ch * 1.5);

      ctx.fillStyle = '#fde047';
      ctx.fillRect(cx - cw * 0.28, cy - ch * 0.58, cw * 0.2, ch * 0.28);
      ctx.fillRect(cx + cw * 0.08, cy - ch * 0.58, cw * 0.2, ch * 0.28);
    };
    drawCottage(width * 0.26, height * 0.64, 1.15);
    drawCottage(width * 0.74, height * 0.66, 0.92);
  } else if (archetype === 'stormy_rain') {
    // Brooding storm clouds + jagged mountain ridge + dark trees
    for (let c = 0; c < 6; c++) {
      const cx = width * (0.1 + c * 0.18);
      const cy = height * (0.16 + (c % 2) * 0.08);
      const rad = width * 0.28;
      const cg = ctx.createRadialGradient(cx, cy, 10, cx, cy, rad);
      cg.addColorStop(0, 'rgba(148, 163, 184, 0.24)');
      cg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = cg;
      ctx.fillRect(0, 0, width, height);
    }

    // Jagged stormy ridge
    ctx.fillStyle = '#070b14';
    ctx.beginPath();
    ctx.moveTo(0, height);
    ctx.lineTo(0, height * 0.62);
    for (let i = 1; i <= 12; i++) {
      ctx.lineTo((i / 12) * width, height * (0.56 + (rng() - 0.5) * 0.11));
    }
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fill();
  } else if (archetype === 'royal_palace') {
    // Grand storybook palace silhouette with golden towers, arches & reflection pool
    const glow = ctx.createRadialGradient(width * 0.5, height * 0.48, 10, width * 0.5, height * 0.48, width * 0.55);
    glow.addColorStop(0, 'rgba(251, 191, 36, 0.55)');
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);

    const baseY = height * 0.68;
    ctx.fillStyle = '#080c18';
    ctx.fillRect(0, baseY, width, height - baseY);
    // Palace body & towers
    ctx.fillStyle = '#0c1224';
    ctx.fillRect(width * 0.22, baseY - height * 0.18, width * 0.56, height * 0.18);
    // Central grand onion dome
    ctx.beginPath();
    ctx.arc(width * 0.5, baseY - height * 0.18, width * 0.13, Math.PI, 0);
    ctx.fill();
    // Flanking palace spires
    for (const tx of [width * 0.24, width * 0.37, width * 0.63, width * 0.76]) {
      const th = tx === width * 0.24 || tx === width * 0.76 ? height * 0.28 : height * 0.23;
      ctx.fillRect(tx - 14, baseY - th, 28, th);
      ctx.beginPath();
      ctx.moveTo(tx - 18, baseY - th);
      ctx.lineTo(tx, baseY - th - 36);
      ctx.lineTo(tx + 18, baseY - th);
      ctx.fill();
    }
    // Glowing golden palace arches
    for (let i = -3; i <= 3; i++) {
      const ax = width * 0.5 + i * (width * 0.068);
      ctx.fillStyle = 'rgba(253, 224, 71, 0.82)';
      ctx.beginPath();
      ctx.arc(ax, baseY - 34, 9, Math.PI, 0);
      ctx.rect(ax - 9, baseY - 34, 18, 34);
      ctx.fill();
    }
  } else if (archetype === 'desert_dunes') {
    // Sweeping golden desert sand dunes under twilight moon
    const mx = width * 0.74;
    const my = height * 0.25;
    ctx.fillStyle = '#fef3c7';
    ctx.beginPath();
    ctx.arc(mx, my, Math.min(width, height) * 0.06, 0, Math.PI * 2);
    ctx.fill();

    const duneColors = ['#78350f', '#451a03', '#1c0a00'];
    for (let d = 0; d < 3; d++) {
      ctx.fillStyle = duneColors[d];
      ctx.beginPath();
      const y0 = height * (0.56 + d * 0.1);
      ctx.moveTo(0, y0);
      ctx.bezierCurveTo(width * 0.3, y0 - height * 0.08, width * 0.65, y0 + height * 0.06, width, y0 - height * 0.04);
      ctx.lineTo(width, height);
      ctx.lineTo(0, height);
      ctx.fill();
    }
  } else if (archetype === 'cosmos') {
    for (let i = 0; i < 5; i++) {
      const cx = width * (0.18 + rng() * 0.65);
      const cy = height * (0.2 + rng() * 0.55);
      const rad = Math.max(width, height) * (0.26 + rng() * 0.25);
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
      const col = i % 2 === 0 ? 'rgba(139, 92, 246, 0.34)' : 'rgba(14, 165, 233, 0.28)';
      g.addColorStop(0, col);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, width, height);
    }

    const px = width * 0.66;
    const py = height * 0.36;
    const pr = Math.min(width, height) * 0.16;
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(-0.34);
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.42)';
    ctx.lineWidth = pr * 0.14;
    ctx.beginPath();
    ctx.ellipse(0, 0, pr * 2.15, pr * 0.44, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    const pg = ctx.createRadialGradient(px - pr * 0.38, py - pr * 0.38, pr * 0.08, px, py, pr);
    pg.addColorStop(0, pal.accent);
    pg.addColorStop(0.55, '#4338ca');
    pg.addColorStop(1, '#050816');
    ctx.fillStyle = pg;
    ctx.beginPath();
    ctx.arc(px, py, pr, 0, Math.PI * 2);
    ctx.fill();
  } else if (archetype === 'cyber_city') {
    const sunX = width * 0.5;
    const sunY = height * 0.60;
    const sunR = Math.min(width, height) * 0.19;
    const halo = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunR * 2.5);
    halo.addColorStop(0, 'rgba(247, 37, 133, 0.82)');
    halo.addColorStop(0.45, 'rgba(0, 245, 212, 0.28)');
    halo.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, width, height);

    for (let layer = 0; layer < 2; layer++) {
      const baseH = height * (0.67 + layer * 0.06);
      const count = layer === 0 ? 17 : 12;
      const wStep = width / count;
      for (let i = 0; i <= count; i++) {
        const bw = wStep * (0.68 + rng() * 0.45);
        const bh = height * ((layer === 0 ? 0.14 : 0.21) + rng() * 0.20);
        const bx = i * wStep - bw * 0.2;
        const by = baseH - bh;
        ctx.fillStyle = layer === 0 ? '#12132e' : '#070818';
        ctx.fillRect(bx, by, bw, bh + height * 0.4);

        const cols = Math.max(2, Math.floor(bw / 14));
        const rows = Math.max(4, Math.floor(bh / 16));
        for (let r = 1; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            if (rng() > 0.62) {
              ctx.fillStyle = rng() > 0.45 ? 'rgba(56, 189, 248, 0.7)' : 'rgba(251, 191, 36, 0.75)';
              ctx.fillRect(bx + 5 + c * (bw / cols), by + 8 + r * 14, 5, 7);
            }
          }
        }
      }
    }
  } else if (archetype === 'mosque_spiritual') {
    const mx = width * 0.72;
    const my = height * 0.24;
    const mr = Math.min(width, height) * 0.075;
    const moonGlow = ctx.createRadialGradient(mx, my, 0, mx, my, mr * 4.2);
    moonGlow.addColorStop(0, 'rgba(253, 230, 138, 0.5)');
    moonGlow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = moonGlow;
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = '#fef3c7';
    ctx.beginPath();
    ctx.arc(mx, my, mr, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = pal.skyTop;
    ctx.beginPath();
    ctx.arc(mx + mr * 0.36, my - mr * 0.14, mr * 0.88, 0, Math.PI * 2);
    ctx.fill();

    const baseY = height * 0.68;
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, baseY, width, height - baseY);

    const drawDome = (cx, cy, rx, ry) => {
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, Math.PI, 0);
      ctx.closePath();
      ctx.fill();
    };
    ctx.fillStyle = '#0b1120';
    drawDome(width * 0.5, baseY, width * 0.19, height * 0.14);
    drawDome(width * 0.29, baseY, width * 0.10, height * 0.085);
    drawDome(width * 0.71, baseY, width * 0.10, height * 0.085);

    for (const xPos of [width * 0.15, width * 0.85, width * 0.36, width * 0.64]) {
      const mh = xPos < width * 0.2 || xPos > width * 0.8 ? height * 0.32 : height * 0.24;
      ctx.fillRect(xPos - 9, baseY - mh, 18, mh);
      ctx.beginPath();
      ctx.moveTo(xPos - 12, baseY - mh);
      ctx.lineTo(xPos, baseY - mh - 32);
      ctx.lineTo(xPos + 12, baseY - mh);
      ctx.fill();
    }
  } else if (archetype === 'ocean_sunset' || archetype === 'ocean_boat') {
    const sunX = width * 0.5;
    const sunY = height * 0.54;
    const sunR = Math.min(width, height) * 0.13;
    const glow = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunR * 4.5);
    glow.addColorStop(0, 'rgba(254, 240, 138, 0.95)');
    glow.addColorStop(0.35, 'rgba(251, 113, 133, 0.45)');
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = '#fef9c3';
    ctx.beginPath();
    ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
    ctx.fill();

    const seaY = height * 0.56;
    const seaGrad = ctx.createLinearGradient(0, seaY, 0, height);
    seaGrad.addColorStop(0, '#1e293b');
    seaGrad.addColorStop(0.4, '#0f172a');
    seaGrad.addColorStop(1, '#020617');
    ctx.fillStyle = seaGrad;
    ctx.fillRect(0, seaY, width, height - seaY);

    for (let i = 0; i < 65; i++) {
      const progress = i / 65;
      const y = seaY + progress * (height - seaY);
      const spread = (1 - progress * 0.65) * width * 0.28 + (rng() - 0.5) * 40;
      ctx.fillStyle = `rgba(253, 224, 71, ${(0.55 - progress * 0.42).toFixed(2)})`;
      ctx.fillRect(sunX - spread * 0.5, y, spread, 2.5 + progress * 4);
    }

    if (archetype === 'ocean_boat') {
      // Graceful storybook sailboat silhouette on water
      const bx = width * 0.36;
      const by = seaY + height * 0.08;
      const s = Math.min(width, height) * 0.09;
      ctx.fillStyle = '#070b14';
      ctx.beginPath();
      ctx.moveTo(bx - s, by);
      ctx.lineTo(bx + s, by);
      ctx.lineTo(bx + s * 0.68, by + s * 0.35);
      ctx.lineTo(bx - s * 0.68, by + s * 0.35);
      ctx.closePath();
      ctx.fill();
      // Mast & Billowing Sail
      ctx.beginPath();
      ctx.moveTo(bx, by - 4);
      ctx.lineTo(bx, by - s * 1.45);
      ctx.lineTo(bx + s * 0.85, by - 8);
      ctx.closePath();
      ctx.fill();
    }
  } else if (archetype === 'enchanted_forest') {
    ctx.save();
    for (let b = 0; b < 5; b++) {
      const grad = ctx.createLinearGradient(width * (0.1 + b * 0.18), 0, width * (0.35 + b * 0.18), height);
      grad.addColorStop(0, 'rgba(253, 230, 138, 0.24)');
      grad.addColorStop(1, 'rgba(16, 185, 129, 0.0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(width * (0.05 + b * 0.19), 0);
      ctx.lineTo(width * (0.17 + b * 0.19), 0);
      ctx.lineTo(width * (0.48 + b * 0.19), height);
      ctx.lineTo(width * (0.28 + b * 0.19), height);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    for (let layer = 0; layer < 3; layer++) {
      const count = 14 - layer * 3;
      const color = layer === 0 ? '#132a2e' : layer === 1 ? '#0b1d21' : '#050e11';
      ctx.fillStyle = color;
      for (let i = 0; i <= count; i++) {
        const tx = (i / count) * width + (rng() - 0.5) * 45;
        const th = height * (0.32 + layer * 0.12 + rng() * 0.15);
        const tw = 34 + layer * 18;
        ctx.fillRect(tx - tw * 0.12, height - th, tw * 0.24, th);
        for (let tier = 0; tier < 4; tier++) {
          const ty = height - th + tier * (th * 0.16);
          ctx.beginPath();
          ctx.moveTo(tx, ty - 38);
          ctx.lineTo(tx - tw * (0.6 + tier * 0.18), ty + 48);
          ctx.lineTo(tx + tw * (0.6 + tier * 0.18), ty + 48);
          ctx.closePath();
          ctx.fill();
        }
      }
    }

    // Solid lush forest meadow floor so characters stand cleanly on rich ground
    const floorGrad = ctx.createLinearGradient(0, height * 0.63, 0, height);
    floorGrad.addColorStop(0, '#0a1d1f');
    floorGrad.addColorStop(1, '#04090c');
    ctx.fillStyle = floorGrad;
    ctx.beginPath();
    ctx.moveTo(0, height * 0.65);
    ctx.quadraticCurveTo(width * 0.5, height * 0.61, width, height * 0.65);
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    ctx.fill();
  } else {
    // Golden Sunrise Mountain Ridges + Volumetric Sun Rays
    const sunX = width * 0.56;
    const sunY = height * 0.44;
    const glow = ctx.createRadialGradient(sunX, sunY, 10, sunX, sunY, Math.max(width, height) * 0.58);
    glow.addColorStop(0, 'rgba(254, 243, 199, 0.92)');
    glow.addColorStop(0.28, 'rgba(245, 158, 11, 0.44)');
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);

    const ridgeColors = ['rgba(30, 41, 59, 0.72)', 'rgba(15, 23, 42, 0.86)', '#090d1a', '#04060d'];
    for (let layer = 0; layer < 4; layer++) {
      const baseY = height * (0.50 + layer * 0.11);
      ctx.fillStyle = ridgeColors[layer];
      ctx.beginPath();
      ctx.moveTo(0, height);
      let y = baseY;
      ctx.lineTo(0, y);
      const steps = 16;
      for (let s = 1; s <= steps; s++) {
        const x = (s / steps) * width;
        const amp = (height * 0.11) * (1 - layer * 0.15);
        y = baseY + (rng() - 0.5) * amp;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(width, height);
      ctx.closePath();
      ctx.fill();
    }
  }

  const vig = ctx.createRadialGradient(
    width * 0.5,
    height * 0.45,
    Math.min(width, height) * 0.25,
    width * 0.5,
    height * 0.5,
    Math.max(width, height) * 0.78
  );
  vig.addColorStop(0, 'rgba(0,0,0,0.04)');
  vig.addColorStop(1, 'rgba(0,0,0,0.68)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, width, height);

  return canvas;
}

async function buildSceneSurface(scene, outW, outH, visualStyle, index) {
  const overW = Math.round(outW * 1.18);
  const overH = Math.round(outH * 1.18);

  if (scene.imageDataUrl && typeof scene.imageDataUrl === 'string') {
    try {
      const base64 = scene.imageDataUrl.startsWith('data:image')
        ? scene.imageDataUrl.split(',')[1]
        : scene.imageDataUrl;
      const buf = Buffer.from(base64, 'base64');
      const img = await loadImage(buf);
      const c = createCanvas(overW, overH);
      const ctx = c.getContext('2d');
      const scale = Math.max(overW / img.width, overH / img.height);
      const dw = img.width * scale;
      const dh = img.height * scale;
      ctx.drawImage(img, (overW - dw) * 0.5, (overH - dh) * 0.5, dw, dh);

      const g = ctx.createLinearGradient(0, 0, 0, overH);
      g.addColorStop(0, 'rgba(0,0,0,0.30)');
      g.addColorStop(0.5, 'rgba(0,0,0,0.05)');
      g.addColorStop(1, 'rgba(0,0,0,0.68)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, overW, overH);
      return c;
    } catch (err) {
      console.warn('[SceneRenderer] Custom image decode fallback to procedural:', err.message);
    }
  }

  return renderProceduralBackdrop(
    overW,
    overH,
    scene.archetype || 'golden_mountains',
    visualStyle || 'cinematic',
    (scene.customSeed || 1007) + index * 7919
  );
}

function drawRoundedRect(ctx, x, y, w, h, r) {
  const rad = Math.min(r, w * 0.5, h * 0.5);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.lineTo(x + w - rad, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rad);
  ctx.lineTo(x + w, y + h - rad);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rad, y + h);
  ctx.lineTo(x + rad, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rad);
  ctx.lineTo(x, y + rad);
  ctx.quadraticCurveTo(x, y, x + rad, y);
  ctx.closePath();
}

function getFontFamilyForText(text, bold = true) {
  if (/[\u0600-\u06FF]/.test(text)) return 'NotoArabic, JakartaBold';
  if (/[\u0900-\u097F]/.test(text)) return 'NotoDevanagari, JakartaBold';
  return bold ? 'JakartaExtraBold, JakartaBold' : 'JakartaMedium, JakartaBold';
}

function wrapWordsWithMetrics(ctx, words, maxWidth) {
  const lines = [];
  let current = [];
  for (let i = 0; i < words.length; i++) {
    const testArr = [...current, words[i]];
    const w = ctx.measureText(testArr.map((o) => o.word).join(' ')).width;
    if (w > maxWidth && current.length > 0) {
      lines.push(current);
      current = [words[i]];
    } else {
      current = testArr;
    }
  }
  if (current.length > 0) lines.push(current);
  return lines;
}

module.exports = {
  ensureFonts,
  renderProceduralBackdrop,
  buildSceneSurface,
  drawRoundedRect,
  getFontFamilyForText,
  wrapWordsWithMetrics,
};
