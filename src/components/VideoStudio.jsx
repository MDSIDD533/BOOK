import React, { useState, useRef, useEffect } from 'react';
import {
  Wand2,
  Film,
  Sparkles,
  Play,
  Download,
  Loader2,
  CheckCircle2,
  Music,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Volume2,
  Eye,
} from 'lucide-react';
import {
  READY_STORIES,
  SCENE_ARCHETYPES,
  CAMERA_MOTIONS,
  VISUAL_STYLES,
  CAPTION_STYLES,
  MUSIC_STYLES,
  LANGUAGES,
} from '../constants/presets';

export default function VideoStudio({
  voices,
  uiLang,
  latestVideo,
  onVideoCreated,
  recentVideos,
  onSelectVideo,
  incomingScript,
}) {
  // Primary 1-Step Story Input State!
  const [storyText, setStoryText] = useState(READY_STORIES[0].story);
  const [title, setTitle] = useState(READY_STORIES[0].title);
  const [lang, setLang] = useState('auto');
  const [voice, setVoice] = useState('am_adam');
  const [aspectRatio, setAspectRatio] = useState('9:16');

  // Optional 1-line AI Story Generator helper
  const [shortIdea, setShortIdea] = useState('');
  const [writingStory, setWritingStory] = useState(false);

  // Optional Advanced Drawer (hidden by default so user ONLY needs to paste a story & click 1 button!)
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [visualStyle, setVisualStyle] = useState('cinematic');
  const [captionStyle, setCaptionStyle] = useState('karaoke_pill');
  const [musicStyle, setMusicStyle] = useState('auto');
  const [speed, setSpeed] = useState(1.0);
  const [useCloudAiArt, setUseCloudAiArt] = useState(false);
  const [previewScenes, setPreviewScenes] = useState(null);

  const [auditioningId, setAuditioningId] = useState(null);
  const [jobState, setJobState] = useState(null);
  const [isMuted, setIsMuted] = useState(true);
  const [error, setError] = useState('');

  const previewAudioRef = useRef(null);
  const stageRef = useRef(null);
  const mainVideoRef = useRef(null);

  const handlePlayWithSound = () => {
    setIsMuted(false);
    if (mainVideoRef.current) {
      mainVideoRef.current.muted = false;
      mainVideoRef.current.currentTime = 0;
      mainVideoRef.current.play().catch(() => {});
    }
  };

  useEffect(() => {
    if (!incomingScript || !incomingScript.text) return;
    setStoryText(incomingScript.text);
    if (incomingScript.title) setTitle(incomingScript.title);
    if (incomingScript.lang) setLang(incomingScript.lang);
    if (incomingScript.voice) setVoice(incomingScript.voice);
    setPreviewScenes(null);
  }, [incomingScript]);

  // Estimate scene count & approximate video duration automatically as user types their story
  const wordCount = storyText.trim() ? storyText.trim().split(/\s+/).length : 0;
  const estScenes = Math.max(1, Math.min(10, Math.ceil(wordCount / 18)));
  const estSeconds = Math.max(4, Math.round(wordCount / 2.4));

  const handlePickSampleStory = (s) => {
    setError('');
    setStoryText(s.story);
    setTitle(s.title);
    setLang(s.lang);
    setVoice(s.voice);
    setAspectRatio(s.aspectRatio);
    setPreviewScenes(null);
  };

  const handleWriteStoryFromIdea = async () => {
    if (!shortIdea.trim()) return;
    setError('');
    setWritingStory(true);
    try {
      const resp = await fetch('/api/story/write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: shortIdea, language: lang }),
      });
      const data = await resp.json();
      if (data.ok && data.story) {
        setStoryText(data.story);
        if (data.title) setTitle(data.title);
        setPreviewScenes(null);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setWritingStory(false);
    }
  };

  const handlePreviewAutoScenes = async () => {
    if (!storyText.trim()) return;
    try {
      const resp = await fetch('/api/story/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storyText, visualStyle }),
      });
      const data = await resp.json();
      if (data.ok) {
        setPreviewScenes(data.scenes);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAuditionSelectedVoice = async () => {
    const vObj = voices.find((v) => v.id === voice) || voices[0];
    if (!vObj || auditioningId) return;
    setAuditioningId(vObj.id);
    try {
      const snippet = storyText.trim().split(/(?<=[.!?۔।])\s+/)[0] || vObj.sampleUr || 'Assalam o Alaikum dosto!';
      const resp = await fetch('/api/voice/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: snippet.slice(0, 180),
          title: `Voice Preview — ${vObj.name}`,
          voice: vObj.id,
          speed,
          lang,
          effectPreset: 'podcast_warm',
        }),
      });
      const data = await resp.json();
      if (data.ok && data.voiceClip?.url && previewAudioRef.current) {
        previewAudioRef.current.src = data.voiceClip.url;
        previewAudioRef.current.play().catch(() => {});
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setAuditioningId(null);
    }
  };

  // ONE-CLICK STORY -> FULL ANIMATED HD VIDEO WITH AI VOICE!
  const handleCreateStoryVideo = async () => {
    if (!storyText.trim()) {
      setError(uiLang === 'ur' ? 'Barah-e-karam pehle apni story likhein ya paste karein!' : 'Please write or paste your story first!');
      return;
    }

    setError('');
    setIsMuted(false);
    if (stageRef.current) {
      stageRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    setJobState({
      progress: 4,
      message:
        uiLang === 'ur'
          ? 'Story ko scenes mein samajh kar AI voice aur visuals tayyar ho rahe hain...'
          : 'Analyzing your story scenes, voiceover & music...',
    });

    try {
      let scenesToRender = previewScenes;

      // If user enabled Cloud AI Diffusion Art, parse story & fetch scene illustrations in parallel first
      if (useCloudAiArt) {
        const parseResp = await fetch('/api/story/parse', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ storyText, visualStyle }),
        });
        const parsed = await parseResp.json();
        if (parsed.ok && parsed.scenes) {
          setJobState({ progress: 12, message: 'Generating AI Storybook Illustrations for each scene...' });
          const dims = aspectRatio === '9:16' ? [576, 1024] : aspectRatio === '1:1' ? [768, 768] : [1024, 576];
          scenesToRender = await Promise.all(
            parsed.scenes.map(async (sc, idx) => {
              try {
                const controller = new AbortController();
                const timer = setTimeout(() => controller.abort(), 9500);
                const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(
                  sc.visualPrompt
                )}?width=${dims[0]}&height=${dims[1]}&seed=${4000 + idx * 71}&nologo=true`;
                const r = await fetch(url, { signal: controller.signal });
                clearTimeout(timer);
                if (!r.ok) return sc;
                const blob = await r.blob();
                const dataUrl = await new Promise((res, rej) => {
                  const reader = new FileReader();
                  reader.onload = () => res(String(reader.result));
                  reader.onerror = rej;
                  reader.readAsDataURL(blob);
                });
                return { ...sc, imageDataUrl: dataUrl };
              } catch {
                return sc; // Automatic seamless fallback to built-in animated HD storybook scene!
              }
            })
          );
        }
      }

      const resp = await fetch('/api/video/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          storyText,
          scenes: scenesToRender || undefined,
          aspectRatio,
          visualStyle,
          captionStyle,
          showHeadlines: false,
          voice,
          speed,
          lang,
          effectPreset: 'podcast_warm',
          musicStyle,
          musicVolume: 0.24,
        }),
      });

      const startData = await resp.json();
      if (!startData.ok) throw new Error(startData.error || 'Could not start story video generation');

      const { jobId } = startData;
      while (true) {
        await new Promise((r) => setTimeout(r, 750));
        const pollResp = await fetch(`/api/jobs/${jobId}`);
        const pollData = await pollResp.json();
        if (!pollData.ok) throw new Error(pollData.error || 'Polling error');

        const { job } = pollData;
        setJobState({ progress: job.progress, message: job.message });

        if (job.status === 'completed' && job.video) {
          setJobState(null);
          onVideoCreated(job.video);
          break;
        }
        if (job.status === 'failed') {
          throw new Error(job.error || 'Video render failed');
        }
      }
    } catch (err) {
      setJobState(null);
      setError(err.message);
    }
  };

  return (
    <div className="studio-grid">
      <audio ref={previewAudioRef} style={{ display: 'none' }} />

      {/* LEFT SIDE: SUPER CLEAN "PASTE YOUR STORY -> CLICK 1 BUTTON -> VIDEO + VOICE READY" */}
      <div>
        {error && <div className="error-banner">⚠️ {error}</div>}

        <div className="panel-card" style={{ border: '1px solid rgba(245, 158, 11, 0.32)' }}>
          <div className="section-header" style={{ marginBottom: 10 }}>
            <div className="section-title" style={{ fontSize: '1.14rem' }}>
              <BookOpen size={22} color="#fbbf24" />
              {uiLang === 'ur'
                ? 'Apni Story Yahan Likhein — AI Khud Video + Voice Banayega!'
                : 'Paste Your Story — AI Automatically Creates Full Video + Voice!'}
            </div>
          </div>

          <p style={{ fontSize: '0.84rem', color: '#94a3b8', marginBottom: 14 }}>
            {uiLang === 'ur'
              ? 'Bas apni kahani Roman Urdu, اردو, English ya हिंदी mein neeche likhein (ya ready kahani select karein) aur "Story Se Video + Voice Banayein" button dabayein. App khud har line ke mutabiq scenes, characters, mausam, AI voiceover, subtitles aur background music bana degi!'
              : 'Just paste any story below and click Generate. The app automatically splits your story into scenes, paints matching worlds & characters, narrates every word in a lifelike voice, adds captions & music, and builds an HD MP4 video!'}
          </p>

          {/* 1-Click Ready Sample Stories */}
          <label className="field-label">
            {uiLang === 'ur' ? '⚡ 1-Click Ready Kahaniyan (Try Karein):' : '⚡ Try a 1-Click Sample Story:'}
          </label>
          <div className="preset-chips">
            {READY_STORIES.map((s) => (
              <button
                key={s.id}
                type="button"
                className="preset-chip"
                onClick={() => handlePickSampleStory(s)}
              >
                {s.badge}
              </button>
            ))}
          </div>

          {/* Optional Tiny Topic -> Full Story Helper */}
          <div
            style={{
              display: 'flex',
              gap: 8,
              marginBottom: 14,
              padding: '9px 11px',
              borderRadius: 12,
              background: 'rgba(99, 102, 241, 0.09)',
              border: '1px solid rgba(99, 102, 241, 0.25)',
              flexWrap: 'wrap',
            }}
          >
            <input
              className="text-input"
              style={{ flex: 1, minWidth: 200, padding: '8px 12px', fontSize: '0.84rem' }}
              value={shortIdea}
              onChange={(e) => setShortIdea(e.target.value)}
              placeholder={
                uiLang === 'ur'
                  ? 'Story nahi likhi? Sirf topic likhein (maslan: Ek ghareeb larke ki kamyabi)...'
                  : 'No story yet? Type a 3-word idea and let AI write the full story...'
              }
            />
            <button
              type="button"
              className="btn-secondary"
              onClick={handleWriteStoryFromIdea}
              disabled={writingStory || !shortIdea.trim()}
            >
              {writingStory ? <Loader2 size={14} className="spin" /> : <Wand2 size={14} color="#fbbf24" />}
              {uiLang === 'ur' ? 'AI Se Story Likhwao' : 'Write Story With AI'}
            </button>
          </div>

          {/* THE HERO STORY BOX */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <label className="field-label" style={{ marginBottom: 0 }}>
              {uiLang === 'ur' ? '✍️ Aapki Mukammal Story / Kahani:' : '✍️ Your Full Story:'}
            </label>
            <span style={{ fontSize: '0.75rem', color: '#fbbf24', fontWeight: 700 }}>
              🎬 Auto {estScenes} Scenes · ~{estSeconds}s Video + Voice
            </span>
          </div>

          <textarea
            className="text-area"
            style={{ minHeight: 168, fontSize: '0.98rem', lineHeight: 1.65, padding: '14px 16px' }}
            value={storyText}
            onChange={(e) => {
              setStoryText(e.target.value);
              setPreviewScenes(null);
            }}
            placeholder="Yahan apni poori kahani likhein ya paste karein... Maslan: Ek gaon mein ek mehnti larka rehta tha..."
          />

          {/* Simple Essential 3 Picks Row */}
          <div className="controls-row" style={{ marginTop: 15 }}>
            <div>
              <label className="field-label">{uiLang === 'ur' ? '🎙️ Story Sunane Wali Aawaz' : '🎙️ Story Narrator Voice'}</label>
              <div style={{ display: 'flex', gap: 6 }}>
                <select
                  className="select-input"
                  value={voice}
                  onChange={(e) => setVoice(e.target.value)}
                >
                  {voices.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} ({v.gender})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ padding: '0 12px', flexShrink: 0 }}
                  title="Listen to narrator sample"
                  onClick={handleAuditionSelectedVoice}
                >
                  {auditioningId ? <Loader2 size={15} className="spin" /> : <Volume2 size={15} color="#fbbf24" />}
                </button>
              </div>
            </div>

            <div>
              <label className="field-label">{uiLang === 'ur' ? '📱 Video Size' : '📱 Video Format'}</label>
              <select
                className="select-input"
                value={aspectRatio}
                onChange={(e) => setAspectRatio(e.target.value)}
              >
                <option value="9:16">📱 9:16 Vertical (TikTok / Reels / Shorts)</option>
                <option value="16:9">🖥️ 16:9 Landscape (YouTube Full Video)</option>
                <option value="1:1">🟦 1:1 Square (Instagram / Facebook)</option>
              </select>
            </div>

            <div>
              <label className="field-label">{uiLang === 'ur' ? '🌐 Zaban (Language)' : '🌐 Story Language'}</label>
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

          {/* BIG ONE-CLICK PRIMARY BUTTON */}
          <div style={{ marginTop: 20 }}>
            <button
              type="button"
              className="btn-primary"
              style={{ width: '100%', padding: '16px 28px', fontSize: '1.06rem', borderRadius: 14 }}
              disabled={Boolean(jobState)}
              onClick={handleCreateStoryVideo}
            >
              {jobState ? (
                <>
                  <Loader2 size={21} className="spin" />
                  {uiLang === 'ur'
                    ? `Story Video + Voice Ban Rahi Hai (${jobState.progress}%)...`
                    : `Generating Story Video + Voice (${jobState.progress}%)...`}
                </>
              ) : (
                <>
                  <Film size={21} />
                  {uiLang === 'ur'
                    ? '🎬 Story Se Video + Voice Banayein! (1-Click)'
                    : '🎬 Create Full Story Video With Voice! (1-Click)'}
                </>
              )}
            </button>
          </div>

          {/* Optional Advanced Customization Toggle */}
          <div style={{ marginTop: 14, textAlign: 'center' }}>
            <button
              type="button"
              onClick={() => {
                const next = !showAdvanced;
                setShowAdvanced(next);
                if (next && !previewScenes) handlePreviewAutoScenes();
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                fontSize: '0.81rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              {showAdvanced ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
              {uiLang === 'ur'
                ? 'Optional Settings: Style, Music, Subtitles & Auto-Scenes Dekhein'
                : 'Optional Settings: Visual Style, Music, Subtitles & Scene Preview'}
            </button>
          </div>
        </div>

        {/* OPTIONAL ADVANCED DRAWER */}
        {showAdvanced && (
          <div className="panel-card">
            <div className="controls-row" style={{ marginBottom: 14 }}>
              <div>
                <label className="field-label">Video Title</label>
                <input
                  className="text-input"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div>
                <label className="field-label">Background Music</label>
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
                <label className="field-label">Subtitles Style</label>
                <select
                  className="select-input"
                  value={captionStyle}
                  onChange={(e) => setCaptionStyle(e.target.value)}
                >
                  {CAPTION_STYLES.map((c) => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="field-label">Visual Color Look</label>
                <select
                  className="select-input"
                  value={visualStyle}
                  onChange={(e) => setVisualStyle(e.target.value)}
                >
                  {VISUAL_STYLES.map((v) => (
                    <option key={v.id} value={v.id}>{v.title}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: '0.84rem', color: '#e2e8f0', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={useCloudAiArt}
                  onChange={(e) => setUseCloudAiArt(e.target.checked)}
                  style={{ accentColor: '#f59e0b', width: 16, height: 16 }}
                />
                🎨 Cloud AI Diffusion Images (Flux) Bhi Use Karein (Browser Internet Se)
              </label>

              <button type="button" className="btn-secondary" onClick={handlePreviewAutoScenes}>
                <Eye size={14} /> Refresh Auto-Detected Scenes
              </button>
            </div>

            {previewScenes && previewScenes.length > 0 && (
              <div className="scene-list">
                {previewScenes.map((sc, idx) => (
                  <div key={sc.id || idx} className="scene-card">
                    <div className="scene-thumb-wrap">
                      <img
                        src={`/api/scene-preview?archetype=${encodeURIComponent(sc.archetype)}&action=${encodeURIComponent(sc.stageAction || 'none')}&style=${encodeURIComponent(visualStyle)}&seed=${1007 + idx * 7919}`}
                        alt={`Scene ${idx + 1}`}
                      />
                      <span className="scene-num-badge">Scene {idx + 1}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ fontSize: '0.86rem', color: '#f1f5f9' }}>“{sc.narration}”</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        <select
                          className="select-input"
                          style={{ padding: '6px 10px', fontSize: '0.79rem' }}
                          value={sc.archetype}
                          onChange={(e) =>
                            setPreviewScenes((prev) =>
                              prev.map((item, i) => (i === idx ? { ...item, archetype: e.target.value } : item))
                            )
                          }
                        >
                          {SCENE_ARCHETYPES.map((a) => (
                            <option key={a.id} value={a.id}>{a.label}</option>
                          ))}
                        </select>

                        <select
                          className="select-input"
                          style={{ padding: '6px 10px', fontSize: '0.79rem' }}
                          value={sc.cameraMotion}
                          onChange={(e) =>
                            setPreviewScenes((prev) =>
                              prev.map((item, i) => (i === idx ? { ...item, cameraMotion: e.target.value } : item))
                            )
                          }
                        >
                          {CAMERA_MOTIONS.map((m) => (
                            <option key={m.id} value={m.id}>{m.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* RIGHT / TOP HERO COLUMN: LIVE STORY VIDEO PLAYER & INSTANT MP4 / MP3 DOWNLOAD */}
      <div className="sticky-stage" ref={stageRef}>
        <div
          className="panel-card"
          style={{
            border: '2px solid rgba(245, 158, 11, 0.55)',
            boxShadow: '0 16px 48px rgba(245, 158, 11, 0.16)',
          }}
        >
          <div className="section-header">
            <div className="section-title" style={{ fontSize: '1.08rem' }}>
              <Sparkles size={20} color="#fbbf24" />
              {uiLang === 'ur' ? '🎬 Aapki Ready Story Video (Yahan Play Karein!)' : '🎬 Your Story Video Player'}
            </div>
            {latestVideo && (
              <span style={{ fontSize: '0.76rem', color: '#34d399', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <CheckCircle2 size={14} /> {latestVideo.scenesCount || 12} Scenes · {latestVideo.duration?.toFixed(0)}s HD
              </span>
            )}
          </div>

          {jobState ? (
            <div style={{ padding: '54px 24px', textAlign: 'center', background: '#060913', borderRadius: 16, border: '1px solid rgba(245,158,11,0.3)' }}>
              <Loader2 size={44} color="#fbbf24" className="spin" style={{ marginBottom: 14 }} />
              <div style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: 6 }}>
                {jobState.progress}% — {uiLang === 'ur' ? 'Story Se Video + Voice Ban Rahi Hai...' : 'Creating Story Video & Voice...'}
              </div>
              <div style={{ fontSize: '0.84rem', color: '#94a3b8', marginBottom: 18 }}>
                {jobState.message}
              </div>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${jobState.progress}%` }} />
              </div>
            </div>
          ) : latestVideo ? (
            <>
              <div className="video-stage-box" style={{ position: 'relative' }}>
                <video
                  ref={mainVideoRef}
                  key={latestVideo.url}
                  src={latestVideo.url}
                  poster={latestVideo.thumbUrl}
                  controls
                  autoPlay
                  muted={isMuted}
                  loop
                  playsInline
                  style={{ maxHeight: 470, width: 'auto', maxWidth: '100%', margin: '0 auto' }}
                />

                {isMuted && (
                  <button
                    type="button"
                    onClick={handlePlayWithSound}
                    style={{
                      position: 'absolute',
                      top: 14,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      padding: '10px 18px',
                      borderRadius: 999,
                      border: '2px solid #fff',
                      background: 'linear-gradient(135deg, #f59e0b 0%, #ec4899 100%)',
                      color: '#fff',
                      fontWeight: 800,
                      fontSize: '0.86rem',
                      cursor: 'pointer',
                      boxShadow: '0 10px 28px rgba(0, 0, 0, 0.75)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      whiteSpace: 'nowrap',
                      zIndex: 10,
                    }}
                  >
                    <Volume2 size={17} />
                    🔊 Aawaz On Karein (Play With Voice)
                  </button>
                )}
              </div>

              <div style={{ marginTop: 14 }}>
                <div style={{ fontWeight: 800, fontSize: '1.05rem', marginBottom: 4 }}>
                  🦁 {latestVideo.title}
                </div>
                <div style={{ fontSize: '0.79rem', color: '#94a3b8', marginBottom: 14 }}>
                  🎙️ {latestVideo.voiceName} · 🎞️ {latestVideo.aspectRatio} HD ({latestVideo.duration?.toFixed(0)} sec)
                </div>

                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {isMuted && (
                    <button
                      type="button"
                      onClick={handlePlayWithSound}
                      className="btn-primary"
                      style={{ flex: 1, minWidth: 190, padding: '12px 16px', fontSize: '0.9rem' }}
                    >
                      <Volume2 size={17} />
                      🔊 Aawaz Ke Saath Chalaein
                    </button>
                  )}

                  <a
                    href={latestVideo.url}
                    download={`${latestVideo.title || 'Sher_Aur_Samajhdar_Khargosh'}.mp4`}
                    className={isMuted ? 'btn-secondary' : 'btn-primary'}
                    style={{ flex: 1, minWidth: 180, textDecoration: 'none', padding: '12px 16px', fontSize: '0.9rem' }}
                  >
                    <Download size={16} />
                    ⬇️ Download Video (.MP4)
                  </a>

                  {latestVideo.audioUrl && (
                    <a
                      href={latestVideo.audioUrl}
                      download={`${latestVideo.title || 'story-voice'}.mp3`}
                      className="btn-secondary"
                    >
                      <Music size={15} />
                      Voice (.MP3)
                    </a>
                  )}
                </div>
              </div>
            </>
          ) : null}

          {recentVideos.length > 0 && (
            <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid rgba(148,163,184,0.14)' }}>
              <div className="field-label">
                {uiLang === 'ur' ? 'Pichli Banayi Gayi Story Videos' : 'Previous Story Videos'}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {recentVideos.slice(0, 4).map((vid) => (
                  <div
                    key={vid.id}
                    onClick={() => onSelectVideo(vid)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: 8,
                      borderRadius: 11,
                      background: latestVideo?.id === vid.id ? 'rgba(245,158,11,0.12)' : 'rgba(18,26,51,0.8)',
                      border: '1px solid rgba(148,163,184,0.15)',
                      cursor: 'pointer',
                    }}
                  >
                    {vid.thumbUrl ? (
                      <img
                        src={vid.thumbUrl}
                        alt={vid.title}
                        style={{ width: 56, height: 40, objectFit: 'cover', borderRadius: 7 }}
                      />
                    ) : (
                      <div style={{ width: 56, height: 40, borderRadius: 7, background: '#1e293b' }} />
                    )}
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: '0.82rem', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {vid.title}
                      </div>
                      <div style={{ fontSize: '0.71rem', color: '#94a3b8' }}>
                        {vid.aspectRatio} · {vid.duration?.toFixed(1)}s · {vid.voiceName}
                      </div>
                    </div>
                    <Play size={15} color="#fbbf24" />
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
