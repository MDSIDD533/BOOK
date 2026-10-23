import React, { useState } from 'react';
import { Film, Mic, Download, Trash2, FolderOpen } from 'lucide-react';

export default function LibraryGallery({ library, uiLang, onDelete }) {
  const [filter, setFilter] = useState('ALL');

  const showVideos = filter === 'ALL' || filter === 'VIDEOS';
  const showVoices = filter === 'ALL' || filter === 'VOICES';

  const totalCount = (library.videos?.length || 0) + (library.voices?.length || 0);

  return (
    <div>
      <div className="section-header" style={{ marginBottom: 20 }}>
        <div className="section-title" style={{ fontSize: '1.2rem' }}>
          <FolderOpen size={22} color="#fbbf24" />
          {uiLang === 'ur'
            ? `Meri Banayi Gayi Videos Aur Voices (${totalCount})`
            : `My Generated Videos & Voiceovers (${totalCount})`}
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          {[
            { id: 'ALL', label: `All (${totalCount})` },
            { id: 'VIDEOS', label: `🎬 Videos (${library.videos?.length || 0})` },
            { id: 'VOICES', label: `🎙️ Voices (${library.voices?.length || 0})` },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              className="btn-secondary"
              style={{
                borderColor: filter === tab.id ? '#f59e0b' : undefined,
                background: filter === tab.id ? 'rgba(245, 158, 11, 0.16)' : undefined,
              }}
              onClick={() => setFilter(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {totalCount === 0 && (
        <div className="panel-card" style={{ textAlign: 'center', padding: '64px 24px' }}>
          <Film size={44} color="#f59e0b" style={{ marginBottom: 12 }} />
          <h3 style={{ marginBottom: 6 }}>
            {uiLang === 'ur' ? 'Abhi Koi Media Save Nahi Hai' : 'Your Studio Library Is Ready'}
          </h3>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
            {uiLang === 'ur'
              ? 'Video Studio ya Voice Studio tab se apni pehli AI video ya voice generate karein!'
              : 'Generate a video or voiceover and it will automatically appear here for replay & download.'}
          </p>
        </div>
      )}

      {showVideos && library.videos?.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <div className="field-label" style={{ marginBottom: 12 }}>
            🎬 HD MP4 Videos ({library.videos.length})
          </div>
          <div className="library-grid">
            {library.videos.map((vid) => (
              <div key={vid.id} className="media-item-card">
                <video
                  src={vid.url}
                  poster={vid.thumbUrl}
                  controls
                  preload="metadata"
                  style={{ width: '100%', height: 220, objectFit: 'cover', background: '#000' }}
                />
                <div style={{ padding: 15, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 12 }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.96rem', marginBottom: 4 }}>{vid.title}</div>
                    <div style={{ fontSize: '0.76rem', color: '#94a3b8' }}>
                      {vid.aspectRatio} · {vid.duration?.toFixed(1)}s · 🎙️ {vid.voiceName}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <a
                      href={vid.url}
                      download={`${vid.title || 'video'}.mp4`}
                      className="btn-secondary"
                      style={{ flex: 1 }}
                    >
                      <Download size={14} /> MP4
                    </a>
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{ color: '#f87171' }}
                      onClick={() => onDelete('video', vid.id)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showVoices && library.voices?.length > 0 && (
        <div>
          <div className="field-label" style={{ marginBottom: 12 }}>
            🎙️ Neural MP3 Voiceovers ({library.voices.length})
          </div>
          <div className="library-grid">
            {library.voices.map((vox) => (
              <div key={vox.id} className="media-item-card" style={{ padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <Mic size={20} color="#ec4899" />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontWeight: 800, fontSize: '0.94rem' }}>{vox.title}</div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                      {vox.voiceName} · {vox.duration?.toFixed(1)}s
                    </div>
                  </div>
                </div>

                <p style={{ fontSize: '0.82rem', color: '#cbd5e1', marginBottom: 12, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  “{vox.text}”
                </p>

                <audio src={vox.url} controls style={{ width: '100%', height: 36, marginBottom: 12 }} />

                <div style={{ display: 'flex', gap: 8 }}>
                  <a
                    href={vox.url}
                    download={`${vox.title || 'voice'}.mp3`}
                    className="btn-secondary"
                    style={{ flex: 1 }}
                  >
                    <Download size={14} /> Download MP3
                  </a>
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ color: '#f87171' }}
                    onClick={() => onDelete('voice', vox.id)}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
