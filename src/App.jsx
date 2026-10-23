import React, { useEffect, useState } from 'react';
import { Film, Mic, FolderOpen, Sparkles, Globe } from 'lucide-react';
import VideoStudio from './components/VideoStudio';
import VoiceStudio from './components/VoiceStudio';
import LibraryGallery from './components/LibraryGallery';

export default function App() {
  const [activeTab, setActiveTab] = useState('video');
  const [uiLang, setUiLang] = useState('ur'); // 'ur' = Roman Urdu + English friendly mode, 'en' = Pure English
  const [voices, setVoices] = useState([]);
  const [library, setLibrary] = useState({ videos: [], voices: [] });
  const [latestVideo, setLatestVideo] = useState(null);
  const [latestVoice, setLatestVoice] = useState(null);
  const [sharedScript, setSharedScript] = useState(null);

  const fetchInitialData = async () => {
    try {
      const [vResp, libResp] = await Promise.all([
        fetch('/api/voices'),
        fetch('/api/library'),
      ]);
      const vData = await vResp.json();
      const libData = await libResp.json();
      if (vData.voices) setVoices(vData.voices);
      if (libData) {
        setLibrary(libData);
        if (libData.videos?.length > 0) setLatestVideo((prev) => prev || libData.videos[0]);
        if (libData.voices?.length > 0) setLatestVoice((prev) => prev || libData.voices[0]);
      }
    } catch (err) {
      console.error('Failed to load initial studio data:', err);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  const handleVideoCreated = (videoObj) => {
    setLatestVideo(videoObj);
    setLibrary((prev) => ({
      ...prev,
      videos: [videoObj, ...(prev.videos || [])],
    }));
  };

  const handleVoiceCreated = (voiceObj) => {
    setLatestVoice(voiceObj);
    setLibrary((prev) => ({
      ...prev,
      voices: [voiceObj, ...(prev.voices || [])],
    }));
  };

  const handleDeleteMedia = async (type, id) => {
    try {
      const resp = await fetch(`/api/library/${type}/${id}`, { method: 'DELETE' });
      const data = await resp.json();
      if (data.ok && data.library) {
        setLibrary(data.library);
        if (type === 'video' && latestVideo?.id === id) {
          setLatestVideo(data.library.videos?.[0] || null);
        }
        if (type === 'voice' && latestVoice?.id === id) {
          setLatestVoice(data.library.voices?.[0] || null);
        }
      }
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const totalSaved = (library.videos?.length || 0) + (library.voices?.length || 0);

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-group">
          <div className="brand-logo">
            <Sparkles size={22} />
          </div>
          <div>
            <div className="brand-title">
              NoorStudio AI
              <span style={{ fontSize: '0.68rem', padding: '2px 8px', borderRadius: 999, background: 'rgba(245,158,11,0.18)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.35)' }}>
                PRO STUDIO
              </span>
            </div>
            <div className="brand-sub">
              {uiLang === 'ur'
                ? 'Sirf Apni Story Dein — AI Khud Full HD Video + Asli Voice Banayega!'
                : 'Just Paste Your Story — AI Automatically Creates Full Video + Voice!'}
            </div>
          </div>
        </div>

        <nav className="nav-tabs">
          <button
            type="button"
            className={`nav-tab ${activeTab === 'video' ? 'active' : ''}`}
            onClick={() => setActiveTab('video')}
          >
            <Film size={16} />
            {uiLang === 'ur' ? 'Story Se Video + Voice' : 'Story to Video'}
          </button>

          <button
            type="button"
            className={`nav-tab ${activeTab === 'voice' ? 'active' : ''}`}
            onClick={() => setActiveTab('voice')}
          >
            <Mic size={16} />
            {uiLang === 'ur' ? 'AI Voice Banayein' : 'AI Voice Studio'}
          </button>

          <button
            type="button"
            className={`nav-tab ${activeTab === 'library' ? 'active' : ''}`}
            onClick={() => setActiveTab('library')}
          >
            <FolderOpen size={16} />
            {uiLang === 'ur' ? 'My Library' : 'Library'}
            {totalSaved > 0 && <span className="badge-count">{totalSaved}</span>}
          </button>
        </nav>

        <div className="header-right">
          <div className="status-pill">
            <span className="status-dot" />
            <span>28 AI Voices Ready</span>
          </div>

          <button
            type="button"
            className="lang-switch-btn"
            onClick={() => setUiLang((prev) => (prev === 'ur' ? 'en' : 'ur'))}
            title="Switch interface language between Roman Urdu & English"
          >
            <Globe size={14} color="#fbbf24" />
            {uiLang === 'ur' ? 'UI: Roman Urdu' : 'UI: English'}
          </button>
        </div>
      </header>

      <main className="workspace-container">
        {activeTab === 'video' && (
          <VideoStudio
            voices={voices}
            uiLang={uiLang}
            latestVideo={latestVideo}
            recentVideos={library.videos || []}
            onVideoCreated={handleVideoCreated}
            onSelectVideo={(vid) => setLatestVideo(vid)}
            incomingScript={sharedScript}
          />
        )}

        {activeTab === 'voice' && (
          <VoiceStudio
            voices={voices}
            uiLang={uiLang}
            latestVoice={latestVoice}
            recentVoices={library.voices || []}
            onVoiceCreated={handleVoiceCreated}
            onSelectVoice={(vox) => setLatestVoice(vox)}
            onSendScriptToVideo={(payload) => {
              setSharedScript({ ...payload, ts: Date.now() });
              setActiveTab('video');
            }}
          />
        )}

        {activeTab === 'library' && (
          <LibraryGallery
            library={library}
            uiLang={uiLang}
            onDelete={handleDeleteMedia}
          />
        )}
      </main>
    </div>
  );
}
