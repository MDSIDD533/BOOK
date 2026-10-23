/*
 * Hollywood Physical-Modeling Foley Sound Effects & Action Percussion Synthesizer
 * Generates authentic 24kHz stereo sound effects in pure Node.js (100% Royalty-Free):
 *   - Referee metal pea-whistle ("TWEEEET!")
 *   - Stadium crowd roar & swell
 *   - Heavy giant footsteps, leather punch whooshes, bone-rattling kick & mat slam
 *   - Tense knockdown heartbeat + referee count ticks
 *   - Rising golden aura sub-bass swell
 *   - Knockout jaw uppercut sonic boom + brass boxing ring bell ("DING! DING! DING!")
 */

const SAMPLE_RATE = 24000;

function seededNoise(i) {
  const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
  return (x - Math.floor(x)) * 2 - 1;
}

function addInto(left, right, startSample, monoOrLeft, gainL = 1.0, gainR = 1.0, rightArr = null) {
  const srcR = rightArr || monoOrLeft;
  const maxLen = Math.min(monoOrLeft.length, left.length - startSample);
  for (let i = 0; i < maxLen; i++) {
    if (startSample + i < 0) continue;
    left[startSample + i] += monoOrLeft[i] * gainL;
    right[startSample + i] += srcR[i] * gainR;
  }
}

// One-pole lowpass filter on a Float32Array for realistic air absorption / thuds / crowd roar
function lowpass(arr, cutoffHz) {
  const out = new Float32Array(arr.length);
  const rc = 1.0 / (2 * Math.PI * cutoffHz);
  const dt = 1.0 / SAMPLE_RATE;
  const alpha = dt / (rc + dt);
  let prev = 0;
  for (let i = 0; i < arr.length; i++) {
    prev = prev + alpha * (arr[i] - prev);
    out[i] = prev;
  }
  return out;
}

// 1. Authentic Sports Referee Pea-Whistle
function makeRefereeWhistle(durSec = 0.72) {
  const n = Math.floor(durSec * SAMPLE_RATE);
  const out = new Float32Array(n);
  let ph1 = 0;
  let ph2 = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    const pea = 0.68 + 0.32 * Math.sin(2 * Math.PI * 29.0 * t);
    const f1 = 2780 + 45 * Math.sin(2 * Math.PI * 29.0 * t);
    const f2 = 3115 + 50 * Math.cos(2 * Math.PI * 27.0 * t);
    ph1 += (2 * Math.PI * f1) / SAMPLE_RATE;
    ph2 += (2 * Math.PI * f2) / SAMPLE_RATE;
    const attack = Math.min(1, t / 0.025);
    const release = t > durSec - 0.14 ? Math.max(0, (durSec - t) / 0.14) : 1.0;
    const breath = seededNoise(i) * 0.16;
    out[i] = (0.58 * Math.sin(ph1) + 0.42 * Math.sin(ph2) + breath) * pea * attack * release * 0.48;
  }
  return out;
}

// 2. Roaring Stadium Crowd Swell
function makeCrowdRoar(durSec = 2.2, intensity = 0.35) {
  const n = Math.floor(durSec * SAMPLE_RATE);
  const rawL = new Float32Array(n);
  const rawR = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    const env = Math.sin((Math.PI * Math.min(t, durSec)) / durSec);
    const cheerMod = 0.8 + 0.2 * Math.sin(2 * Math.PI * 5.3 * t);
    rawL[i] = seededNoise(i * 1.13) * env * cheerMod;
    rawR[i] = seededNoise(i * 1.71 + 99) * env * cheerMod;
  }
  const filtL = lowpass(rawL, 1150);
  const filtR = lowpass(rawR, 1150);
  for (let i = 0; i < n; i++) {
    filtL[i] *= intensity;
    filtR[i] *= intensity;
  }
  return { left: filtL, right: filtR };
}

// 3. Fast Fist / Dodge Air Whoosh
function makeAirWhoosh(durSec = 0.42, highPitch = false) {
  const n = Math.floor(durSec * SAMPLE_RATE);
  const raw = new Float32Array(n);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const p = i / n;
    const env = Math.sin(Math.PI * p) ** 1.6;
    const sweepHz = highPitch ? 920 - 520 * p : 540 - 340 * p;
    ph += (2 * Math.PI * sweepHz) / SAMPLE_RATE;
    raw[i] = (seededNoise(i * 2.1) * 0.72 + Math.sin(ph) * 0.35) * env;
  }
  return lowpass(raw, highPitch ? 2400 : 1200);
}

// 4. Heavy Punch / Kick / Mat Slam Impact
function makeHeavyImpact(durSec = 0.55, subPower = 1.0) {
  const n = Math.floor(durSec * SAMPLE_RATE);
  const out = new Float32Array(n);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    const freq = 46 + 155 * Math.exp(-t * 28.0);
    ph += (2 * Math.PI * freq) / SAMPLE_RATE;
    const subBody = Math.sin(ph) * Math.exp(-t * 8.5) * subPower;
    const leatherSnap = seededNoise(i * 3.7) * Math.exp(-t * 42.0) * 0.95;
    out[i] = Math.tanh((subBody + leatherSnap) * 1.35) * 0.72;
  }
  return out;
}

// 5. Tense Double Heartbeat ("LUB-DUB")
function makeHeartbeatSequence(durSec = 3.2) {
  const n = Math.floor(durSec * SAMPLE_RATE);
  const out = new Float32Array(n);
  const period = 0.92;
  for (let beatStart = 0.1; beatStart + 0.4 < durSec; beatStart += period) {
    const lub = makeHeavyImpact(0.24, 0.75);
    const dub = makeHeavyImpact(0.22, 0.55);
    const s1 = Math.floor(beatStart * SAMPLE_RATE);
    const s2 = Math.floor((beatStart + 0.24) * SAMPLE_RATE);
    for (let i = 0; i < lub.length && s1 + i < n; i++) out[s1 + i] += lub[i] * 0.45;
    for (let i = 0; i < dub.length && s2 + i < n; i++) out[s2 + i] += dub[i] * 0.38;
  }
  return lowpass(out, 260);
}

// 6. Rising Heroic Power Swell
function makeHeroicRiser(durSec = 2.6) {
  const n = Math.floor(durSec * SAMPLE_RATE);
  const out = new Float32Array(n);
  let ph1 = 0;
  let ph2 = 0;
  for (let i = 0; i < n; i++) {
    const p = i / n;
    const f = 65.4 * (1 + p * 1.0); // C2 -> C3 octave rise
    ph1 += (2 * Math.PI * f) / SAMPLE_RATE;
    ph2 += (2 * Math.PI * f * 1.5) / SAMPLE_RATE;
    const env = Math.pow(p, 1.8) * (p > 0.92 ? (1 - p) / 0.08 : 1.0);
    const shimmer = seededNoise(i * 1.9) * 0.14 * env;
    out[i] = (0.55 * Math.sin(ph1) + 0.35 * Math.sin(ph2) + shimmer) * env * 0.44;
  }
  return out;
}

// 7. Classic Brass Boxing Ring Bell ("DING! DING! DING!")
function makeBoxingRingBell() {
  const durSec = 1.9;
  const n = Math.floor(durSec * SAMPLE_RATE);
  const out = new Float32Array(n);
  // Metallic inharmonic bell partials around F#5 / C#6
  const partials = [
    [742, 1.0, 4.2],
    [1118, 0.65, 5.5],
    [1496, 0.50, 6.8],
    [2210, 0.35, 8.5],
    [2980, 0.22, 11.0],
  ];
  for (const hitSec of [0.0, 0.34, 0.68]) {
    const start = Math.floor(hitSec * SAMPLE_RATE);
    for (let i = 0; i < n - start; i++) {
      const t = i / SAMPLE_RATE;
      let sample = 0;
      for (const [freq, amp, decay] of partials) {
        sample += amp * Math.sin(2 * Math.PI * freq * t) * Math.exp(-t * decay);
      }
      out[start + i] += sample * 0.24;
    }
  }
  return out;
}

/**
 * Renders full-length synchronized Foley SFX stereo stem across all scenes in the timeline!
 */
function renderTimelineFoleySfx(totalSamples, scenes = [], sceneMetas = []) {
  const left = new Float32Array(totalSamples);
  const right = new Float32Array(totalSamples);

  for (let i = 0; i < scenes.length; i++) {
    const action = scenes[i]?.stageAction || 'none';
    const meta = sceneMetas[i];
    if (!meta || action === 'none') continue;

    const startS = Math.floor(meta.start * SAMPLE_RATE);
    const durSec = Math.max(1.2, meta.duration || 3.5);
    const midS = Math.floor((meta.start + durSec * 0.42) * SAMPLE_RATE);

    if (action === 'fighter_champion_intro') {
      const crowd = makeCrowdRoar(Math.min(durSec, 3.0), 0.16);
      addInto(left, right, startS, crowd.left, 1, 1, crowd.right);
      const snap1 = makeHeavyImpact(0.28, 0.55);
      addInto(left, right, midS, snap1, 0.34, 0.30);
      addInto(left, right, midS + Math.floor(0.24 * SAMPLE_RATE), snap1, 0.30, 0.36);
    } else if (action === 'challenger_shadow_enters') {
      const step = makeHeavyImpact(0.42, 1.15);
      addInto(left, right, startS + Math.floor(0.25 * SAMPLE_RATE), step, 0.36, 0.42);
      addInto(left, right, startS + Math.floor(1.05 * SAMPLE_RATE), step, 0.42, 0.36);
    } else if (action === 'referee_whistle_start') {
      const whistle = makeRefereeWhistle(0.68);
      addInto(left, right, startS + Math.floor(durSec * 0.48 * SAMPLE_RATE), whistle, 0.42, 0.42);
      const roar = makeCrowdRoar(Math.min(durSec, 3.4), 0.24);
      addInto(left, right, startS, roar.left, 1, 1, roar.right);
    } else if (action === 'shadow_throws_punch') {
      const whoosh = makeAirWhoosh(0.45, false);
      const punch = makeHeavyImpact(0.45, 0.9);
      addInto(left, right, midS, whoosh, 0.45, 0.55);
      addInto(left, right, midS + Math.floor(0.18 * SAMPLE_RATE), punch, 0.42, 0.42);
    } else if (action === 'leo_ducks_punch') {
      const fastWhoosh = makeAirWhoosh(0.48, true);
      addInto(left, right, midS, fastWhoosh, 0.55, 0.38);
    } else if (action === 'shadow_kicks_leo_down') {
      const kick = makeHeavyImpact(0.50, 1.25);
      const matSlam = makeHeavyImpact(0.60, 1.35);
      addInto(left, right, startS + Math.floor(durSec * 0.30 * SAMPLE_RATE), kick, 0.55, 0.50);
      addInto(left, right, startS + Math.floor(durSec * 0.62 * SAMPLE_RATE), matSlam, 0.52, 0.55);
    } else if (action === 'referee_countdown') {
      const hb = makeHeartbeatSequence(durSec);
      addInto(left, right, startS, hb, 0.55, 0.55);
    } else if (action === 'leo_rises_aura') {
      const riser = makeHeroicRiser(Math.min(durSec, 3.0));
      addInto(left, right, startS + Math.floor(0.2 * SAMPLE_RATE), riser, 0.55, 0.55);
    } else if (action === 'leo_crushing_jaw_punch') {
      const dashWhoosh = makeAirWhoosh(0.32, true);
      const koHit = makeHeavyImpact(0.75, 1.55);
      const hitAt = startS + Math.floor(durSec * 0.46 * SAMPLE_RATE);
      addInto(left, right, hitAt - Math.floor(0.16 * SAMPLE_RATE), dashWhoosh, 0.45, 0.45);
      addInto(left, right, hitAt, koHit, 0.68, 0.68);
    } else if (action === 'leo_ultimate_champion') {
      const matThud = makeHeavyImpact(0.55, 1.2);
      const bell = makeBoxingRingBell();
      const victoryRoar = makeCrowdRoar(Math.min(durSec, 4.2), 0.28);
      addInto(left, right, startS + Math.floor(0.25 * SAMPLE_RATE), matThud, 0.48, 0.48);
      addInto(left, right, startS + Math.floor(0.85 * SAMPLE_RATE), bell, 0.50, 0.50);
      addInto(left, right, startS + Math.floor(0.70 * SAMPLE_RATE), victoryRoar.left, 1, 1, victoryRoar.right);
    }
  }

  return { left, right };
}

module.exports = {
  renderTimelineFoleySfx,
};
