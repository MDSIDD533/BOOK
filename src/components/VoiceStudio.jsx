import React, { useState, useRef } from 'react';
import {
  Mic,
  Volume2,
  Play,
  Pause,
  Download,
  Loader2,
  Sliders,
  Sparkles,
  Film,
  Music,
} from 'lucide-react';
import {
  VOICE_SAMPLE_SCRIPTS,
  MUSIC_STYLES,
  AUDIO_EFFECTS,
  LANGUAGES,
} from '../constants/presets';

export default function VoiceStudio({
  voices,
  uiLang,
  latestVoice,
  recentVoices,
  onVoiceCreated,
  onSelectVoice,
  onSendScriptToVideo,
}) {
  const [title, setTitle] = useState('NoorStudio Voiceover');
  const [text, setText] = useState(VOICE_SAMPLE_SCRIPTS[0].text);
  const [lang, setLang] = useState('roman-urdu');
  const [voice, setVoice] = useState('am_adam');
  const [genderFilter, setGenderFilter] = useState('ALL');

  // Custom Dual-Voice Blender & Studio DSP Controls
  const [blendVoice, setBlendVoice] = useState('');
  const [blendRatio, setBlendRatio] = useState(0.35);
  const [speed, setSpeed] = useState(1.0);
  const [pitchSemitones, setPitchSemitones] = useState(0);
  const [effectPreset, setEffectPreset] = useState('podcast_warm');
  const [musicStyle, setMusicStyle] = useState('none');
  const [musicVolume, setMusicVolume] = useState(0.2);

  const [generating, setGenerating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState('');

  const audioRef = useRef(null);

  const filteredVoices = voices.filter((v) => {
    if (genderFilter === 'ALL') return true;
    if (genderFilter === 'FEATURED') return v.featured;
    return v.gender.toUpperCase() === genderFilter;
  });

  const handleApplyScript = (item) => {
    setTitle(item.title);
    setText(item.text);
    setLang(item.lang);
    if (item.voice) setVoice(item.voice);
  };

  // Instant zero-wait browser Web Speech preview option alongside Neural Studio synthesis!
  const handleQuickBrowserSpeak = () => {
    if (!('speechSynthesis' in window) || !text.trim()) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = speed;
    window.speechSynthesis.speak(utter);
  };

  const handleGenerateNeuralVoice = async () => {
    if (!text.trim()) return;
    setError('');
    setGenerating(true);
    try {
      const resp = await fetch('/api/voice/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          text,
          voice,
          speed,
          lang,
          blendVoice,
          blendRatio: blendVoice ? blendRatio : 0,
          pitchSemitones,
          effectPreset,
          musicStyle,
          musicVolume,
        }),
      });
      const data = await resp.json();
      if (!data.ok) throw new Error(data.error || 'Voice generation failed');
      onVoiceCreated(data.voiceClip);
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.play().catch(() => {});
        }
      }, 120);
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (audioRef.current.paused) {
      audioRef.current.play().catch(() => {});
    } else {
      audioRef.current.pause();
    }
  };

  return (
    <div className="studio-grid">
      {/* LEFT COLUMN: Script + 28 Neural Voices + Custom Voice Lab */}
      <div>
        {error && <div className="error-banner">⚠️ {error}</div>}

        <div className="panel-card">
          <div className="section-header">
            <div className="section-title">
              <Mic size={19} color="#fbbf24" />
              {uiLang === 'ur'
                ? 'AI Voiceover & Text-to-Speech Script'
                : 'Neural Text-to-Speech Script'}
            </div>
            <button
              type="button"
              className="btn-secondary"
              onClick={handleQuickBrowserSpeak}
              title="Instant browser speaker check"
            >
              <Volume2 size={14} />
              {uiLang === 'ur' ? 'Quick Read' : 'Instant Preview'}
            </button>
          </div>

          <div className="preset-chips">
            {VOICE_SAMPLE_SCRIPTS.map((s, idx) => (
              <button
                key={idx}
                type="button"
                className="preset-chip"
                onClick={() => handleApplyScript(s)}
              >
                {s.label}
              </button>
            ))}
          </div>

          <div className="controls-row" style={{ marginBottom: 12 }}>
            <div>
              <label className="field-label">{uiLang === 'ur' ? 'Audio Title' : 'Clip Title'}</label>
              <input
                className="text-input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div>
              <label className="field-label">{uiLang === 'ur' ? 'Zaban (Language)' : 'Language & Accent Engine'}</label>
              <select
                className="select-input"
                value={lang}
                onChange={(e) => setLang(e.target.value)}
              >
                {LANGUAGES.map((l) => (
                  <option key={l.id} value={l.id}>{l.label}</option>
                ))}
              </select>
            </div>
          </div>

          <label className="field-label">
            {uiLang === 'ur'
              ? `Apni Script Yahan Likhein (${text.length} haroof)`
              : `Enter Speech Script (${text.length} chars)`}
          </label>
          <textarea
            className="text-area"
            style={{ minHeight: 145, fontSize: '0.96rem' }}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Yahan Roman Urdu, اردو, English ya हिंदी mein apni script likhein..."
          />
        </div>

        {/* 28 Studio Voices Grid */}
        <div className="panel-card">
          <div className="section-header">
            <div className="section-title">
              <Sparkles size={18} color="#ec4899" />
              {uiLang === 'ur'
                ? `28 Asli Neural Voices (${filteredVoices.length})`
                : `28 Studio Neural Voices (${filteredVoices.length})`}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {[
                { id: 'ALL', label: 'All (28)' },
                { id: 'FEATURED', label: 'Top Picks' },
                { id: 'FEMALE', label: 'Female' },
                { id: 'MALE', label: 'Male' },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  className="mini-btn"
                  style={{
                    padding: '5px 10px',
                    borderColor: genderFilter === f.id ? '#f59e0b' : undefined,
                    color: genderFilter === f.id ? '#fbbf24' : undefined,
                  }}
                  onClick={() => setGenderFilter(f.id)}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="voice-grid">
            {filteredVoices.map((v) => (
              <div
                key={v.id}
                className={`voice-card ${voice === v.id ? 'selected' : ''}`}
                onClick={() => setVoice(v.id)}
              >
                <div
                  className="voice-avatar"
                  style={{
                    background: `linear-gradient(135deg, ${v.color?.[0] || '#6366f1'}, ${v.color?.[1] || '#06b6d4'})`,
                  }}
                >
                  {v.name.trim()[0]}
                </div>
                <div className="voice-meta">
                  <div className="voice-name">{v.name}</div>
                  <div className="voice-desc">{v.accent || v.gender} · {v.style}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Custom Voice Lab: Voice Blender + Pitch + EQ + Background Music */}
        <div className="panel-card">
          <div className="section-header">
            <div className="section-title">
              <Sliders size={18} color="#38bdf8" />
              {uiLang === 'ur'
                ? 'Custom Voice Mixer, Pitch Aur Studio Music'
                : 'Custom Voice Designer, Pitch & Music Bed'}
            </div>
          </div>

          <div className="controls-row">
            <div>
              <label className="field-label">{uiLang === 'ur' ? 'Studio Mic EQ' : 'Studio Mic Mastering'}</label>
              <select
                className="select-input"
                value={effectPreset}
                onChange={(e) => setEffectPreset(e.target.value)}
              >
                {AUDIO_EFFECTS.map((ef) => (
                  <option key={ef.id} value={ef.id}>{ef.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="field-label">{uiLang === 'ur' ? 'Background Music' : 'Optional Music Bed'}</label>
              <select
                className="select-input"
                value={musicStyle}
                onChange={(e) => setMusicStyle(e.target.value)}
              >
                {MUSIC_STYLES.map((m) => (
                  <option key={m.id} value={m.id}>{m.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="field-label">{uiLang === 'ur' ? '2nd Voice Mix (Custom Clone)' : 'Blend With 2nd Voice'}</label>
              <select
                className="select-input"
                value={blendVoice}
                onChange={(e) => setBlendVoice(e.target.value)}
              >
                <option value="">— Single Pure Voice —</option>
                {voices.map((v) => (
                  <option key={v.id} value={v.id}>Mix + {v.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="controls-row" style={{ marginTop: 14 }}>
            <div>
              <label className="field-label">Speed ({speed.toFixed(2)}x)</label>
              <input
                type="range"
                min="0.65"
                max="1.55"
                step="0.05"
                value={speed}
                onChange={(e) => setSpeed(Number(e.target.value))}
                style={{ width: '100%', accentColor: '#f59e0b' }}
              />
            </div>

            <div>
              <label className="field-label">Pitch ({pitchSemitones > 0 ? `+${pitchSemitones}` : pitchSemitones} st)</label>
              <input
                type="range"
                min="-4"
                max="4"
                step="0.5"
                value={pitchSemitones}
                onChange={(e) => setPitchSemitones(Number(e.target.value))}
                style={{ width: '100%', accentColor: '#38bdf8' }}
              />
            </div>

            {blendVoice && (
              <div>
                <label className="field-label">Voice Blend ({Math.round(blendRatio * 100)}%)</label>
                <input
                  type="range"
                  min="0.1"
                  max="0.9"
                  step="0.05"
                  value={blendRatio}
                  onChange={(e) => setBlendRatio(Number(e.target.value))}
                  style={{ width: '100%', accentColor: '#ec4899' }}
                />
              </div>
            )}
          </div>

          <div style={{ marginTop: 20, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn-primary"
              style={{ flex: 1, minWidth: 240, padding: '14px 24px', fontSize: '0.98rem' }}
              disabled={generating}
              onClick={handleGenerateNeuralVoice}
            >
              {generating ? (
                <>
                  <Loader2 size={18} className="spin" />
                  {uiLang === 'ur' ? 'AI Aawaz Ban Rahi Hai...' : 'Synthesizing Studio Neural Voice...'}
                </>
              ) : (
                <>
                  <Mic size={18} />
                  {uiLang === 'ur' ? '🎙️ Asli AI Voice Generate Karein (.MP3)' : '🎙️ Generate Studio Neural Voice (.MP3)'}
                </>
              )}
            </button>

            <button
              type="button"
              className="btn-secondary"
              onClick={() => onSendScriptToVideo({ title, text, lang, voice })}
            >
              <Film size={15} />
              {uiLang === 'ur' ? 'Is Script Se Video Banayein' : 'Turn Into HD Video'}
            </button>
          </div>
        </div>
      </div>

      {/* RIGHT STICKY STUDIO MONITOR PLAYER */}
      <div className="sticky-stage">
        <div className="panel-card">
          <div className="section-header">
            <div className="section-title">
              <Music size={18} color="#fbbf24" />
              {uiLang === 'ur' ? 'Studio Voice Player & Download' : 'Mastered Voice Output'}
            </div>
          </div>

          {latestVoice ? (
            <div>
              <div style={{ padding: 16, borderRadius: 15, background: '#070b18', border: '1px solid rgba(245,158,11,0.28)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                  <button
                    type="button"
                    onClick={togglePlay}
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: '50%',
                      border: 'none',
                      background: 'linear-gradient(135deg, #f59e0b, #ec4899)',
                      color: '#fff',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {isPlaying ? <Pause size={20} /> : <Play size={20} />}
                  </button>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontWeight: 800, fontSize: '0.98rem' }}>{latestVoice.title}</div>
                    <div style={{ fontSize: '0.77rem', color: '#94a3b8' }}>
                      {latestVoice.voiceName} · {latestVoice.duration?.toFixed(1)}s · 192kbps Stereo MP3
                    </div>
                  </div>
                </div>

                {/* Real 64-bar neural waveform envelope */}
                <div className="waveform-row" style={{ marginBottom: 12 }}>
                  {(latestVoice.waveform || new Array(48).fill(0.4)).map((val, idx) => (
                    <div
                      key={idx}
                      className="wave-bar"
                      style={{
                        height: `${Math.max(12, Math.round(val * 100))}%`,
                        opacity: isPlaying ? 0.95 : 0.72,
                      }}
                    />
                  ))}
                </div>

                <audio
                  ref={audioRef}
                  key={latestVoice.url}
                  src={latestVoice.url}
                  controls
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  onEnded={() => setIsPlaying(false)}
                  style={{ width: '100%', height: 38 }}
                />
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                <a
                  href={latestVoice.url}
                  download={`${latestVoice.title || 'noorstudio-voice'}.mp3`}
                  className="btn-primary"
                  style={{ flex: 1, textDecoration: 'none', padding: '11px 16px', fontSize: '0.88rem' }}
                >
                  <Download size={16} />
                  {uiLang === 'ur' ? 'Download MP3 Audio' : 'Download Studio MP3'}
                </a>
              </div>
            </div>
          ) : (
            <div style={{ padding: '48px 20px', textAlign: 'center', background: '#060913', borderRadius: 14, border: '1px dashed rgba(148,163,184,0.2)' }}>
              <Mic size={38} color="#ec4899" style={{ marginBottom: 10 }} />
              <div style={{ fontWeight: 800, marginBottom: 6 }}>
                {uiLang === 'ur' ? 'AI Voice Ready Hai!' : 'Ready to Synthesize Neural Speech'}
              </div>
              <p style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
                {uiLang === 'ur'
                  ? 'Apni script likhein aur "Generate AI Voice (.MP3)" par click karein!'
                  : 'Type English, Roman Urdu, Urdu, or Hindi and generate crystal-clear 192kbps studio audio.'}
              </p>
            </div>
          )}

          {recentVoices.length > 0 && (
            <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid rgba(148,163,184,0.14)' }}>
              <div className="field-label">
                {uiLang === 'ur' ? 'Recent Generated Voices' : 'Recent Voiceover Clips'}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {recentVoices.slice(0, 5).map((item) => (
                  <div
                    key={item.id}
                    onClick={() => onSelectVoice(item)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 10,
                      padding: '9px 12px',
                      borderRadius: 10,
                      background: latestVoice?.id === item.id ? 'rgba(236,72,153,0.14)' : 'rgba(18,26,51,0.8)',
                      border: '1px solid rgba(148,163,184,0.14)',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: '0.83rem', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.title}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                        {item.voiceName} · {item.duration?.toFixed(1)}s
                      </div>
                    </div>
                    <Play size={14} color="#fbbf24" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
