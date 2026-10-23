/**
 * 24-FPS Illustrated Storybook Character & Prop Renderer (@napi-rs/canvas)
 * Draws rich, multi-tone anti-aliased vector storybook characters & props:
 * - Royal Golden Lion (prowling, roaring, angry face-off, peering into well, leaping splash!)
 * - Clever Cream-White Rabbit (twitching inner-pink ears, glowing idea bulb, talking, celebrating!)
 * - Forest Animals Council (Spotted Fawn Deer + Woodland Red Fox)
 * - Deep Stone Well ('kuan') with roof, rope, water surface, reflection bubble & splash droplets!
 * - Human Travelers, Lantern Bearers, Flapping Birds & Storm Lightning!
 */

function drawContactShadow(ctx, cx, cy, rx, ry, alpha = 0.38) {
  ctx.save();
  ctx.fillStyle = `rgba(3, 6, 15, ${alpha})`;
  ctx.beginPath();
  ctx.ellipse(cx, cy, Math.max(2, rx), Math.max(2, ry), 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/**
 * Draws an expressive illustrated Golden Lion!
 * facing: 1 = facing right, -1 = facing left
 * mood: 'fierce' | 'angry' | 'roar' | 'curious'
 */
function drawLion(ctx, cx, groundY, size, timeSec, { facing = 1, mood = 'fierce', walking = false, tilt = 0 } = {}) {
  const s = size;
  const walkCycle = walking ? Math.sin(timeSec * 6.5) : 0;
  const breathe = Math.sin(timeSec * 3.0) * (s * 0.015);
  const bob = walking ? Math.abs(Math.cos(timeSec * 6.5)) * (s * 0.03) : 0;

  drawContactShadow(ctx, cx, groundY + s * 0.03, s * 0.56, s * 0.11, 0.44);

  ctx.save();
  ctx.translate(cx, groundY - bob);
  ctx.scale(facing, 1);
  if (tilt) ctx.rotate(tilt);

  // Swaying tufted tail at back (-x)
  const tailWag = Math.sin(timeSec * (mood === 'angry' ? 9.0 : 4.2)) * 0.25;
  ctx.save();
  ctx.strokeStyle = '#ca8a04';
  ctx.lineWidth = Math.max(4, s * 0.075);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-s * 0.42, -s * 0.42);
  ctx.bezierCurveTo(
    -s * 0.72,
    -s * 0.52 + tailWag * s * 0.3,
    -s * 0.78,
    -s * 0.80,
    -s * 0.62,
    -s * 0.88 + tailWag * s * 0.2
  );
  ctx.stroke();
  // Dark brown tail tuft
  ctx.fillStyle = '#5c1d0c';
  ctx.beginPath();
  ctx.ellipse(-s * 0.62, -s * 0.89 + tailWag * s * 0.2, s * 0.10, s * 0.07, -0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Back legs (darker golden ochre for 3D depth)
  const legW = s * 0.13;
  const legH = s * 0.36;
  const drawLeg = (lx, swing, color) => {
    ctx.save();
    ctx.translate(lx, -s * 0.34);
    ctx.rotate(swing * 0.28);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(-legW * 0.5, 0, legW, legH, legW * 0.45);
    ctx.fill();
    // Paw pad
    ctx.beginPath();
    ctx.ellipse(legW * 0.22, legH - s * 0.02, legW * 0.62, s * 0.055, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  drawLeg(-s * 0.26, -walkCycle, '#b45309');
  drawLeg(s * 0.24, walkCycle, '#b45309');

  // Muscular torso & chest gradient
  const bodyGrad = ctx.createLinearGradient(-s * 0.45, -s * 0.7, s * 0.45, -s * 0.2);
  bodyGrad.addColorStop(0, '#d97706');
  bodyGrad.addColorStop(0.55, '#f59e0b');
  bodyGrad.addColorStop(1, '#fbbf24');
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.ellipse(0, -s * 0.45 + breathe, s * 0.46, s * 0.25, -0.06, 0, Math.PI * 2);
  ctx.fill();

  // Broad royal chest
  ctx.beginPath();
  ctx.ellipse(s * 0.24, -s * 0.50 + breathe, s * 0.26, s * 0.27, 0.2, 0, Math.PI * 2);
  ctx.fill();

  // Foreground legs
  drawLeg(-s * 0.34, walkCycle, '#eab308');
  drawLeg(s * 0.32, -walkCycle, '#eab308');

  // Head & Royal Fluffy Dark-Auburn Mane
  const hx = s * 0.38;
  const hy = -s * 0.68 + breathe;
  ctx.save();
  ctx.translate(hx, hy);

  // Outer multi-lobed royal mane
  const maneScallops = 14;
  const maneR = s * 0.34;
  const maneGrad = ctx.createRadialGradient(0, 0, s * 0.08, 0, 0, maneR * 1.15);
  maneGrad.addColorStop(0, '#9a3412');
  maneGrad.addColorStop(0.75, '#7c2d12');
  maneGrad.addColorStop(1, '#431407');
  ctx.fillStyle = maneGrad;
  ctx.beginPath();
  for (let i = 0; i <= maneScallops; i++) {
    const ang = (i / maneScallops) * Math.PI * 2;
    const r = maneR * (1 + 0.14 * Math.sin(i * 3.0 + timeSec * 1.8));
    const px = Math.cos(ang) * r * 0.96 - s * 0.03;
    const py = Math.sin(ang) * r * 1.05 + s * 0.02;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();

  // Rounded Lion Ears peeking from mane
  for (const ex of [-s * 0.15, s * 0.14]) {
    ctx.fillStyle = '#d97706';
    ctx.beginPath();
    ctx.arc(ex, -s * 0.20, s * 0.085, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#78350f';
    ctx.beginPath();
    ctx.arc(ex, -s * 0.20, s * 0.045, 0, Math.PI * 2);
    ctx.fill();
  }

  // Golden Lion Face
  ctx.fillStyle = '#fbbf24';
  ctx.beginPath();
  ctx.ellipse(s * 0.05, 0, s * 0.21, s * 0.19, 0, 0, Math.PI * 2);
  ctx.fill();

  // Cream muzzle pads
  ctx.fillStyle = '#fef3c7';
  ctx.beginPath();
  ctx.ellipse(s * 0.11, s * 0.075, s * 0.10, s * 0.075, 0, 0, Math.PI * 2);
  ctx.fill();

  // Open roaring mouth vs closed fierce mouth
  if (mood === 'roar' || (mood === 'angry' && Math.sin(timeSec * 5) > 0.25)) {
    ctx.fillStyle = '#450a0a';
    ctx.beginPath();
    ctx.ellipse(s * 0.12, s * 0.12, s * 0.085, s * 0.065, 0, 0, Math.PI * 2);
    ctx.fill();
    // White fangs
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(s * 0.07, s * 0.075);
    ctx.lineTo(s * 0.09, s * 0.125);
    ctx.lineTo(s * 0.11, s * 0.075);
    ctx.moveTo(s * 0.14, s * 0.075);
    ctx.lineTo(s * 0.16, s * 0.125);
    ctx.lineTo(s * 0.18, s * 0.075);
    ctx.fill();

    // Pulsing roar shockwave arcs
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.42)';
    ctx.lineWidth = 2.5;
    for (let ring = 1; ring <= 2; ring++) {
      const rr = s * (0.26 + ring * 0.14 + ((timeSec * 0.8) % 0.14));
      ctx.beginPath();
      ctx.arc(s * 0.2, s * 0.06, rr, -0.55, 0.55);
      ctx.stroke();
    }
  }

  // Dark triangle nose
  ctx.fillStyle = '#291509';
  ctx.beginPath();
  ctx.moveTo(s * 0.10, s * 0.02);
  ctx.lineTo(s * 0.19, s * 0.02);
  ctx.lineTo(s * 0.145, s * 0.065);
  ctx.closePath();
  ctx.fill();

  // Expressive glowing eyes + angry/fierce eyebrows
  for (const eyeX of [0.01, 0.15]) {
    ctx.fillStyle = '#1e1b18';
    ctx.beginPath();
    ctx.arc(s * eyeX, -s * 0.04, s * 0.028, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.arc(s * eyeX + s * 0.007, -s * 0.046, s * 0.01, 0, Math.PI * 2);
    ctx.fill();
  }

  if (mood === 'angry' || mood === 'fierce' || mood === 'roar') {
    ctx.strokeStyle = '#431407';
    ctx.lineWidth = Math.max(2.5, s * 0.028);
    ctx.beginPath();
    ctx.moveTo(-s * 0.03, -s * 0.095);
    ctx.lineTo(s * 0.05, -s * 0.065);
    ctx.moveTo(s * 0.20, -s * 0.095);
    ctx.lineTo(s * 0.12, -s * 0.065);
    ctx.stroke();
  }

  ctx.restore();
  ctx.restore();
}

/**
 * Draws an adorable, clever cream-white Storybook Rabbit!
 */
function drawRabbit(ctx, cx, groundY, size, timeSec, { facing = 1, hopping = false, ideaSparkle = false, celebrating = false } = {}) {
  const s = size;
  const hopJump = celebrating
    ? Math.abs(Math.sin(timeSec * 6.2)) * (s * 0.36)
    : hopping
    ? Math.abs(Math.sin(timeSec * 5.4)) * (s * 0.18)
    : Math.sin(timeSec * 2.8) * (s * 0.02);

  drawContactShadow(ctx, cx, groundY + s * 0.02, s * 0.36, s * 0.085, 0.36);

  ctx.save();
  ctx.translate(cx, groundY - hopJump);
  ctx.scale(facing, 1);

  // Fluffy cotton tail at back
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(-s * 0.30, -s * 0.20, s * 0.13, 0, Math.PI * 2);
  ctx.fill();

  // Back foot
  ctx.fillStyle = '#e2e8f0';
  ctx.beginPath();
  ctx.ellipse(-s * 0.06, -s * 0.05, s * 0.22, s * 0.08, 0, 0, Math.PI * 2);
  ctx.fill();

  // Soft plump cream-white body
  const bGrad = ctx.createRadialGradient(s * 0.04, -s * 0.34, s * 0.04, 0, -s * 0.30, s * 0.38);
  bGrad.addColorStop(0, '#ffffff');
  bGrad.addColorStop(0.75, '#f1f5f9');
  bGrad.addColorStop(1, '#cbd5e1');
  ctx.fillStyle = bGrad;
  ctx.beginPath();
  ctx.ellipse(-s * 0.02, -s * 0.30, s * 0.28, s * 0.26, -0.2, 0, Math.PI * 2);
  ctx.fill();

  // Cute front paws (raised slightly when talking/thinking!)
  const pawLift = Math.sin(timeSec * 4.5) * (s * 0.04);
  ctx.fillStyle = '#f8fafc';
  ctx.beginPath();
  ctx.ellipse(s * 0.22, -s * 0.32 + pawLift, s * 0.11, s * 0.065, -0.3, 0, Math.PI * 2);
  ctx.fill();

  // Head
  const hx = s * 0.12;
  const hy = -s * 0.58;
  ctx.save();
  ctx.translate(hx, hy);

  // Long expressive twitching rabbit ears!
  const earTwitch = Math.sin(timeSec * 4.0) * 0.09;
  const drawEar = (angle, offsetX) => {
    ctx.save();
    ctx.translate(offsetX, -s * 0.12);
    ctx.rotate(angle);
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.ellipse(0, -s * 0.24, s * 0.085, s * 0.26, 0, 0, Math.PI * 2);
    ctx.fill();
    // Soft rose-pink inner ear
    ctx.fillStyle = '#fda4af';
    ctx.beginPath();
    ctx.ellipse(s * 0.01, -s * 0.23, s * 0.046, s * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };
  drawEar(-0.26 - earTwitch, -s * 0.06);
  drawEar(0.10 + earTwitch, s * 0.06);

  // Round cute head
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(0, 0, s * 0.21, s * 0.185, 0, 0, Math.PI * 2);
  ctx.fill();

  // Bright clever sparkling eye
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(s * 0.08, -s * 0.025, s * 0.036, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(s * 0.092, -s * 0.038, s * 0.013, 0, Math.PI * 2);
  ctx.fill();

  // Rosy cheek & pink twitching nose
  ctx.fillStyle = 'rgba(251, 113, 133, 0.34)';
  ctx.beginPath();
  ctx.arc(s * 0.05, s * 0.05, s * 0.045, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#fb7185';
  ctx.beginPath();
  ctx.arc(s * 0.195, s * 0.02, s * 0.028, 0, Math.PI * 2);
  ctx.fill();

  // Glowing golden idea bulb / sparkles above head when hatching clever plan!
  if (ideaSparkle) {
    const pulse = 0.75 + 0.25 * Math.sin(timeSec * 5.5);
    const gx = s * 0.08;
    const gy = -s * 0.64;
    const halo = ctx.createRadialGradient(gx, gy, 2, gx, gy, s * 0.42);
    halo.addColorStop(0, `rgba(254, 240, 138, ${0.95 * pulse})`);
    halo.addColorStop(0.5, `rgba(251, 191, 36, ${0.35 * pulse})`);
    halo.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(gx, gy, s * 0.42, 0, Math.PI * 2);
    ctx.fill();

    // Bulb globe
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(gx, gy, s * 0.11, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(gx - s * 0.045, gy + s * 0.09, s * 0.09, s * 0.055);
  }

  ctx.restore();
  ctx.restore();
}

/**
 * Graceful Spotted Fawn Deer & Woodland Red Fox for Forest Animals Council / Celebration
 */
function drawDeer(ctx, cx, groundY, size, timeSec, { facing = 1 } = {}) {
  const s = size;
  const nod = Math.sin(timeSec * 2.6) * 0.06;
  drawContactShadow(ctx, cx, groundY + s * 0.02, s * 0.42, s * 0.08, 0.34);

  ctx.save();
  ctx.translate(cx, groundY);
  ctx.scale(facing, 1);

  // Slender legs
  ctx.strokeStyle = '#92400e';
  ctx.lineWidth = Math.max(3, s * 0.055);
  ctx.lineCap = 'round';
  for (const lx of [-s * 0.22, -s * 0.10, s * 0.14, s * 0.24]) {
    ctx.beginPath();
    ctx.moveTo(lx, -s * 0.38);
    ctx.lineTo(lx, 0);
    ctx.stroke();
  }

  // Warm fawn body + white spots
  ctx.fillStyle = '#d97706';
  ctx.beginPath();
  ctx.ellipse(0, -s * 0.42, s * 0.32, s * 0.16, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#fef3c7';
  for (const [sx, sy] of [[-0.14, -0.45], [-0.03, -0.40], [-0.09, -0.37], [0.05, -0.46]]) {
    ctx.beginPath();
    ctx.arc(s * sx, s * sy, s * 0.024, 0, Math.PI * 2);
    ctx.fill();
  }

  // Graceful neck & head + antlers
  ctx.save();
  ctx.translate(s * 0.22, -s * 0.50);
  ctx.rotate(nod);
  ctx.fillStyle = '#d97706';
  ctx.beginPath();
  ctx.moveTo(-s * 0.07, 0);
  ctx.lineTo(s * 0.06, -s * 0.26);
  ctx.lineTo(s * 0.14, -s * 0.22);
  ctx.lineTo(s * 0.04, s * 0.04);
  ctx.fill();

  // Head
  ctx.beginPath();
  ctx.ellipse(s * 0.16, -s * 0.27, s * 0.13, s * 0.085, 0.15, 0, Math.PI * 2);
  ctx.fill();

  // Antlers
  ctx.strokeStyle = '#fde68a';
  ctx.lineWidth = Math.max(2, s * 0.026);
  ctx.beginPath();
  ctx.moveTo(s * 0.10, -s * 0.34);
  ctx.lineTo(s * 0.06, -s * 0.50);
  ctx.moveTo(s * 0.08, -s * 0.43);
  ctx.lineTo(s * 0.15, -s * 0.47);
  ctx.stroke();

  // Eye
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(s * 0.20, -s * 0.28, s * 0.022, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.restore();
}

/**
 * Detailed Illustrated Stone Well ('Kuan') with glowing water, roof, rope & optional reflection/splash!
 */
function drawStoneWell(ctx, cx, groundY, size, timeSec, { showLionReflection = false, splashIntensity = 0 } = {}) {
  const s = size;
  drawContactShadow(ctx, cx, groundY + s * 0.04, s * 0.62, s * 0.13, 0.48);

  ctx.save();
  ctx.translate(cx, groundY);

  // Wooden support posts & pitched shingle roof
  ctx.fillStyle = '#5c2d16';
  ctx.fillRect(-s * 0.42, -s * 1.05, s * 0.07, s * 0.72);
  ctx.fillRect(s * 0.35, -s * 1.05, s * 0.07, s * 0.72);
  ctx.fillRect(-s * 0.44, -s * 0.92, s * 0.88, s * 0.045);

  // Hanging rope into well
  ctx.strokeStyle = '#d6d3d1';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(0, -s * 0.90);
  ctx.lineTo(0, -s * 0.36);
  ctx.stroke();

  // Roof canopy
  ctx.fillStyle = '#3f1d0d';
  ctx.beginPath();
  ctx.moveTo(-s * 0.58, -s * 0.98);
  ctx.lineTo(0, -s * 1.32);
  ctx.lineTo(s * 0.58, -s * 0.98);
  ctx.closePath();
  ctx.fill();

  // Cylindrical Stone Base
  const wallW = s * 0.92;
  const wallH = s * 0.42;
  const stoneGrad = ctx.createLinearGradient(-wallW * 0.5, 0, wallW * 0.5, 0);
  stoneGrad.addColorStop(0, '#334155');
  stoneGrad.addColorStop(0.45, '#64748b');
  stoneGrad.addColorStop(1, '#1e293b');
  ctx.fillStyle = stoneGrad;
  ctx.beginPath();
  ctx.roundRect(-wallW * 0.5, -wallH, wallW, wallH, 10);
  ctx.fill();

  // Masonry stone bricks texture
  ctx.strokeStyle = 'rgba(15, 23, 42, 0.55)';
  ctx.lineWidth = 2;
  for (let row = 1; row < 4; row++) {
    const ry = -wallH + (row * wallH) / 4;
    ctx.beginPath();
    ctx.moveTo(-wallW * 0.48, ry);
    ctx.lineTo(wallW * 0.48, ry);
    ctx.stroke();
    for (let col = -2; col <= 2; col++) {
      const rx = col * (wallW * 0.19) + (row % 2 ? wallW * 0.08 : 0);
      ctx.beginPath();
      ctx.moveTo(rx, ry);
      ctx.lineTo(rx, ry + wallH / 4);
      ctx.stroke();
    }
  }

  // Rim & Glowing Deep Water Surface inside Well Mouth
  ctx.fillStyle = '#475569';
  ctx.beginPath();
  ctx.ellipse(0, -wallH, wallW * 0.54, s * 0.13, 0, 0, Math.PI * 2);
  ctx.fill();

  const waterGrad = ctx.createRadialGradient(0, -wallH, s * 0.04, 0, -wallH, wallW * 0.44);
  waterGrad.addColorStop(0, '#38bdf8');
  waterGrad.addColorStop(0.6, '#0284c7');
  waterGrad.addColorStop(1, '#082f49');
  ctx.fillStyle = waterGrad;
  ctx.beginPath();
  ctx.ellipse(0, -wallH, wallW * 0.44, s * 0.095, 0, 0, Math.PI * 2);
  ctx.fill();

  // Shimmering water ripples
  ctx.strokeStyle = 'rgba(186, 230, 253, 0.65)';
  ctx.lineWidth = 1.6;
  const rippleR = wallW * (0.16 + 0.18 * ((timeSec * 0.7) % 1));
  ctx.beginPath();
  ctx.ellipse(0, -wallH, rippleR, rippleR * 0.2, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Special Visual Storytelling Bubble: Shimmering Lion Reflection ('Apna Hi Saya'!) inside the water!
  if (showLionReflection) {
    ctx.save();
    const bob = Math.sin(timeSec * 3.6) * 3;
    const rx = 0;
    const ry = -wallH - s * 0.24 + bob;
    const bubbleR = s * 0.24;

    const rg = ctx.createRadialGradient(rx, ry, 4, rx, ry, bubbleR * 1.25);
    rg.addColorStop(0, 'rgba(56, 189, 248, 0.45)');
    rg.addColorStop(1, 'rgba(14, 165, 233, 0.05)');
    ctx.fillStyle = rg;
    ctx.beginPath();
    ctx.arc(rx, ry, bubbleR * 1.15, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(125, 211, 252, 0.75)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Reflected ghostly Lion head inside water vision circle
    ctx.globalAlpha = 0.78;
    ctx.fillStyle = '#7c2d12';
    ctx.beginPath();
    ctx.arc(rx, ry, s * 0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(rx, ry + s * 0.01, s * 0.10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(rx - s * 0.035, ry - s * 0.01, s * 0.016, 0, Math.PI * 2);
    ctx.arc(rx + s * 0.035, ry - s * 0.01, s * 0.016, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Animated water splash droplets shooting up when the Lion leaps into the well!
  if (splashIntensity > 0.02) {
    ctx.save();
    for (let i = 0; i < 14; i++) {
      const angle = -Math.PI * 0.85 + (i / 13) * Math.PI * 0.7;
      const dist = s * (0.18 + splashIntensity * 0.78) * (0.7 + (i % 3) * 0.2);
      const dx = Math.cos(angle) * dist;
      const dy = -wallH + Math.sin(angle) * dist + splashIntensity * splashIntensity * s * 0.42;
      ctx.fillStyle = `rgba(186, 230, 253, ${(1 - splashIntensity * 0.65).toFixed(2)})`;
      ctx.beginPath();
      ctx.arc(dx, dy, Math.max(3, s * 0.035 * (1 - splashIntensity * 0.4)), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  ctx.restore();
}

/**
 * Master Scene Cast Director: Renders animated characters & props matched to the scene beat!
 */
function renderSceneStoryCast(ctx, scene, localTime, globalTime, outW, outH) {
  if (scene.imageDataUrl) return;

  const minDim = Math.min(outW, outH);
  const stageY = outW < outH ? outH * 0.665 : outH * 0.70;
  const action = scene.stageAction || 'none';
  const sceneDur = Math.max(1.5, scene.duration || 5);
  const relP = Math.max(0, Math.min(1, localTime / sceneDur));

  // Ambient sky birds whenever appropriate
  if (scene.hasBirds) {
    ctx.save();
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.70)';
    ctx.lineWidth = 2.2;
    for (let b = 0; b < 5; b++) {
      const bx = ((0.10 + b * 0.08 + localTime * 0.05) % 1.15) * outW - outW * 0.05;
      const by = outH * (0.21 + (b % 3) * 0.035) + Math.sin(globalTime * 2.6 + b) * 6;
      const flap = Math.sin(globalTime * 7.5 + b * 1.3) * 7;
      ctx.beginPath();
      ctx.moveTo(bx - 11, by - flap);
      ctx.quadraticCurveTo(bx - 5, by - 6, bx, by);
      ctx.quadraticCurveTo(bx + 5, by - 6, bx + 11, by - flap);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Storm rain & lightning flashes
  if (scene.archetype === 'stormy_rain') {
    ctx.save();
    ctx.strokeStyle = 'rgba(186, 230, 253, 0.28)';
    ctx.lineWidth = 1.5;
    for (let r = 0; r < 95; r++) {
      const rx = ((r * 83 + globalTime * 260) % (outW + 120)) - 60;
      const ry = (r * 137 + globalTime * 920) % outH;
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
    ctx.restore();
  }

  // Rich Fable & Story Cast Actions!
  if (action === 'lion_roar') {
    const drift = (relP - 0.5) * outW * 0.08;
    drawLion(ctx, outW * 0.48 + drift, stageY, minDim * 0.27, globalTime, {
      facing: 1,
      mood: 'roar',
      walking: true,
    });
  } else if (action === 'animals_council') {
    drawDeer(ctx, outW * 0.27, stageY, minDim * 0.24, globalTime, { facing: 1 });
    drawRabbit(ctx, outW * 0.53, stageY + 6, minDim * 0.16, globalTime, { facing: -1 });
    drawDeer(ctx, outW * 0.75, stageY + 4, minDim * 0.20, globalTime + 1.1, { facing: -1 });
  } else if (action === 'clever_rabbit_plan') {
    drawRabbit(ctx, outW * 0.50, stageY, minDim * 0.23, globalTime, {
      facing: 1,
      ideaSparkle: true,
    });
  } else if (action === 'rabbit_meets_angry_lion') {
    drawLion(ctx, outW * 0.31, stageY, minDim * 0.26, globalTime, {
      facing: 1,
      mood: 'angry',
      walking: false,
    });
    const hopIn = Math.min(0, -outW * 0.12 * (1 - Math.min(1, relP * 3)));
    drawRabbit(ctx, outW * 0.72 - hopIn, stageY + 6, minDim * 0.16, globalTime, {
      facing: -1,
      hopping: relP < 0.35,
    });
  } else if (action === 'lion_and_rabbit_walking') {
    const travelX = outW * (0.20 + relP * 0.38);
    drawLion(ctx, travelX, stageY, minDim * 0.24, globalTime, {
      facing: 1,
      mood: 'angry',
      walking: true,
    });
    drawRabbit(ctx, travelX + outW * 0.24, stageY + 6, minDim * 0.15, globalTime, {
      facing: 1,
      hopping: true,
    });
  } else if (action === 'well_peering_reflection') {
    const wellX = outW * 0.62;
    drawStoneWell(ctx, wellX, stageY + 6, minDim * 0.27, globalTime, {
      showLionReflection: true,
    });
    drawLion(ctx, outW * 0.31, stageY, minDim * 0.24, globalTime, {
      facing: 1,
      mood: 'angry',
      walking: false,
      tilt: 0.10,
    });
    drawRabbit(ctx, outW * 0.13, stageY + 10, minDim * 0.13, globalTime, {
      facing: 1,
    });
  } else if (action === 'well_leap_and_splash') {
    const wellX = outW * 0.58;
    // Parabolic leap into the stone well across the scene!
    const jumpT = Math.min(1, relP * 1.45);
    if (jumpT < 0.92) {
      const lx = outW * 0.24 + (wellX - outW * 0.24) * jumpT;
      const arcLift = Math.sin(jumpT * Math.PI) * (outH * 0.19);
      const diveDrop = jumpT > 0.65 ? Math.pow((jumpT - 0.65) / 0.35, 2) * (outH * 0.12) : 0;
      const shrink = jumpT > 0.65 ? Math.max(0.35, 1 - (jumpT - 0.65) * 2.1) : 1.0;
      drawLion(ctx, lx, stageY - arcLift + diveDrop, minDim * 0.23 * shrink, globalTime, {
        facing: 1,
        mood: 'roar',
        tilt: -0.35 + jumpT * 1.05,
      });
    }
    const splashP = jumpT >= 0.72 ? Math.min(1, (relP - 0.50) * 2.2) : 0;
    drawStoneWell(ctx, wellX, stageY + 8, minDim * 0.28, globalTime, {
      showLionReflection: false,
      splashIntensity: Math.max(0, splashP),
    });
    drawRabbit(ctx, outW * 0.20, stageY + 8, minDim * 0.15, globalTime, {
      facing: 1,
      celebrating: jumpT >= 0.85,
    });
  } else if (action === 'animals_celebration') {
    drawDeer(ctx, outW * 0.23, stageY, minDim * 0.23, globalTime, { facing: 1 });
    drawRabbit(ctx, outW * 0.50, stageY + 4, minDim * 0.20, globalTime, {
      facing: 1,
      celebrating: true,
    });
    drawDeer(ctx, outW * 0.77, stageY + 4, minDim * 0.21, globalTime + 0.8, { facing: -1 });
  } else if (scene.character && scene.character !== 'none') {
    // Human protagonist walker / lantern bearer for human stories!
    const walkBob = Math.abs(Math.sin(globalTime * 4.2)) * 4;
    const progressDrift = relP * (outW * 0.09);
    const cx = outW * 0.45 + progressDrift;
    const gy = stageY - walkBob;
    const hu = minDim * 0.09;

    ctx.save();
    ctx.fillStyle = '#050811';
    ctx.beginPath();
    ctx.arc(cx, gy - hu * 0.88, hu * 0.14, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx - hu * 0.16, gy - hu * 0.72);
    ctx.lineTo(cx + hu * 0.16, gy - hu * 0.72);
    ctx.lineTo(cx + hu * 0.26, gy - hu * 0.16);
    ctx.lineTo(cx - hu * 0.24, gy - hu * 0.16);
    ctx.closePath();
    ctx.fill();

    const stride = Math.sin(globalTime * 4.2) * (hu * 0.14);
    ctx.lineWidth = Math.max(3, hu * 0.09);
    ctx.strokeStyle = '#050811';
    ctx.beginPath();
    ctx.moveTo(cx - hu * 0.06, gy - hu * 0.2);
    ctx.lineTo(cx - hu * 0.08 - stride, gy);
    ctx.moveTo(cx + hu * 0.06, gy - hu * 0.2);
    ctx.lineTo(cx + hu * 0.08 + stride, gy);
    ctx.stroke();

    if (scene.character === 'lantern_hero' || scene.archetype === 'stormy_rain') {
      const lx = cx + hu * 0.34;
      const ly = gy - hu * 0.52 + Math.sin(globalTime * 3.2) * 3;
      const halo = ctx.createRadialGradient(lx, ly, 2, lx, ly, hu * 1.5);
      halo.addColorStop(0, 'rgba(254, 240, 138, 0.95)');
      halo.addColorStop(0.35, 'rgba(245, 158, 11, 0.38)');
      halo.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(lx, ly, hu * 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

module.exports = { renderSceneStoryCast };
