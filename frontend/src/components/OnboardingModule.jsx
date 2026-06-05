import React, { useState, useEffect, useRef, useCallback } from 'react';
import { PlayCircle, FileText, CheckCircle, AlertCircle, HelpCircle, ExternalLink } from 'lucide-react';
import api from '../api';

// ─── Helpers ────────────────────────────────────────────────────────────────

const getYouTubeEmbedId = (url) => {
  const patterns = [
    /youtu\.be\/([^?&]+)/,
    /youtube\.com\/watch\?v=([^&]+)/,
    /youtube\.com\/embed\/([^?&]+)/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
};

const isYouTubeUrl = (url) =>
  url && (url.includes('youtube.com') || url.includes('youtu.be'));

const isUploadedFile = (url) =>
  url && url.startsWith('/static/uploads/');

const getFileExtension = (url) => url.split('.').pop().toLowerCase();

// ─── YouTube Player Component ────────────────────────────────────────────────
const YouTubeEnforcedPlayer = ({ url, onComplete }) => {
  const playerRef = useRef(null);
  const containerRef = useRef(null);
  const intervalRef = useRef(null);
  const maxTimeRef = useRef(0);
  const lastVideoTimeRef = useRef(0);
  const lastRealTimeRef = useRef(Date.now());
  const [ready, setReady] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [percentWatched, setPercentWatched] = useState(0);

  const videoId = getYouTubeEmbedId(url);

  useEffect(() => {
    if (!videoId) return;

    const loadYT = () => {
      if (!window.YT) {
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        document.head.appendChild(tag);
        window.onYouTubeIframeAPIReady = initPlayer;
      } else {
        initPlayer();
      }
    };

    const initPlayer = () => {
      if (playerRef.current) {
        playerRef.current.destroy();
      }
      playerRef.current = new window.YT.Player(containerRef.current, {
        videoId,
        playerVars: {
          rel: 0,
          disablekb: 1,       // disable keyboard seek
          fs: 0,              // no fullscreen button (can't hide progress bar but disables controls)
          controls: 1,
          modestbranding: 1,
        },
        events: {
          onReady: () => setReady(true),
          onStateChange: (e) => {
            if (e.data === window.YT.PlayerState.PLAYING || e.data === window.YT.PlayerState.BUFFERING) {
              lastRealTimeRef.current = Date.now();
              if (playerRef.current?.getCurrentTime) {
                lastVideoTimeRef.current = playerRef.current.getCurrentTime();
              }
              checkTime();
              if (e.data === window.YT.PlayerState.PLAYING) {
                startTracking();
              }
            } else if (
              e.data === window.YT.PlayerState.PAUSED ||
              e.data === window.YT.PlayerState.ENDED
            ) {
              stopTracking();
              if (e.data === window.YT.PlayerState.ENDED) {
                // Confirm they really finished
                if (maxTimeRef.current >= playerRef.current.getDuration() * 0.95) {
                  setCompleted(true);
                  setPercentWatched(100);
                  onComplete();
                } else {
                  // Force seek back if they seeked to the end
                  playerRef.current.seekTo(maxTimeRef.current, true);
                  playerRef.current.playVideo();
                }
              }
            }
          },
        },
      });
    };

    loadYT();
    return () => {
      stopTracking();
      if (playerRef.current) playerRef.current.destroy();
    };
  }, [videoId]);

  const checkTime = () => {
    if (!playerRef.current?.getCurrentTime || !playerRef.current?.getDuration) return;
    const current = playerRef.current.getCurrentTime();
    const duration = playerRef.current.getDuration();
    if (duration <= 0) return;

    const now = Date.now();
    const elapsedReal = (now - lastRealTimeRef.current) / 1000;
    lastRealTimeRef.current = now;

    const lastVideo = lastVideoTimeRef.current;
    lastVideoTimeRef.current = current;

    if (current > maxTimeRef.current) {
      const jump = current - maxTimeRef.current;
      const diff = current - lastVideo;
      // If they skipped forward by more than 1.5 seconds, or if the time advanced
      // faster than real-time (diff > elapsedReal * 1.5 + 0.5)
      if (jump > 1.5 || diff > elapsedReal * 1.5 + 0.5) {
        playerRef.current.seekTo(maxTimeRef.current, true);
        lastVideoTimeRef.current = maxTimeRef.current;
        return;
      } else {
        maxTimeRef.current = current;
      }
    }

    const pct = Math.floor((maxTimeRef.current / duration) * 100);
    setPercentWatched(pct);
    if (pct >= 95 && !completed) {
      setCompleted(true);
      onComplete();
      stopTracking();
    }
  };

  const startTracking = () => {
    if (intervalRef.current) return;
    lastRealTimeRef.current = Date.now();
    if (playerRef.current?.getCurrentTime) {
      lastVideoTimeRef.current = playerRef.current.getCurrentTime();
    }
    intervalRef.current = setInterval(() => {
      checkTime();
    }, 200); // Check every 200ms for extremely fast response
  };

  const stopTracking = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      <div ref={containerRef} style={{ width: '100%', aspectRatio: '16/9', borderRadius: '0.5rem', overflow: 'hidden' }} />
      {!completed && (
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          background: 'rgba(0,0,0,0.8)', padding: '0.5rem 1rem',
          display: 'flex', alignItems: 'center', gap: '0.75rem',
          borderBottomLeftRadius: '0.5rem', borderBottomRightRadius: '0.5rem',
          pointerEvents: 'none',
        }}>
          <div style={{ flex: 1, height: '6px', background: 'rgba(255,255,255,0.2)', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{ width: `${percentWatched}%`, height: '100%', background: 'var(--primary-color)', transition: 'width 1s linear' }} />
          </div>
          <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)', whiteSpace: 'nowrap' }}>
            {percentWatched}% watched – must complete to proceed
          </span>
        </div>
      )}
      {completed && (
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          background: 'rgba(16,185,129,0.15)', padding: '0.5rem 1rem',
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          borderBottomLeftRadius: '0.5rem', borderBottomRightRadius: '0.5rem',
          pointerEvents: 'none',
        }}>
          <CheckCircle size={16} color="#10b981" />
          <span style={{ fontSize: '0.85rem', color: '#10b981' }}>Video complete – you may now proceed</span>
        </div>
      )}
    </div>
  );
};

const DocumentViewer = ({ url, onComplete }) => {
  const fullUrl = isUploadedFile(url) ? `http://localhost:8001${url}` : url;
  const ext = getFileExtension(url);

  // Automatically mark content as viewed when loaded
  useEffect(() => {
    onComplete();
  }, [url, onComplete]);

  if (ext === 'pdf') {
    return (
      <div style={{ width: '100%', height: '550px', borderRadius: '0.5rem', overflow: 'hidden', border: '1px solid var(--border)' }}>
        <iframe 
          src={fullUrl} 
          style={{ width: '100%', height: '100%', border: 'none' }} 
          title="PDF Viewer" 
        />
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '300px', borderRadius: '0.75rem', border: '2px dashed var(--border)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: '1rem', background: 'rgba(16,185,129,0.03)',
    }}>
      <FileText size={64} color="#6366f1" />
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontWeight: '600', marginBottom: '0.25rem' }}>
          Document ready
        </p>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{fullUrl}</p>
      </div>
      <a
        href={fullUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="btn"
        style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}
      >
        <ExternalLink size={16} /> Open / Download {ext.toUpperCase()}
      </a>
    </div>
  );
};

// ─── Generic Video (non-YouTube, local upload) ──────────────────────────────
const LocalVideoPlayer = ({ url, onComplete }) => {
  const fullUrl = isUploadedFile(url) ? `http://localhost:8001${url}` : url;
  const [completed, setCompleted] = useState(false);
  const maxTimeRef = useRef(0);

  const handleEnded = () => {
    setCompleted(true);
    onComplete();
  };

  return (
    <div>
      <video
        controls
        controlsList="nodownload"
        onContextMenu={e => e.preventDefault()}
        onEnded={handleEnded}
        onSeeking={(e) => {
          const v = e.currentTarget;
          if (v.currentTime > maxTimeRef.current + 0.01) {
            v.currentTime = maxTimeRef.current;
          }
        }}
        onTimeUpdate={(e) => {
          const v = e.currentTarget;
          if (v.duration > 0) {
            if (v.currentTime > maxTimeRef.current + 1.0) {
              v.currentTime = maxTimeRef.current;
            } else {
              if (v.currentTime > maxTimeRef.current) {
                maxTimeRef.current = v.currentTime;
              }
            }

            if (maxTimeRef.current / v.duration >= 0.95 && !completed) {
              setCompleted(true);
              onComplete();
            }
          }
        }}
        style={{ width: '100%', borderRadius: '0.5rem', maxHeight: '420px' }}
      >
        <source src={fullUrl} />
      </video>
      {completed && (
        <p style={{ color: '#10b981', fontSize: '0.85rem', marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <CheckCircle size={16} /> Video complete
        </p>
      )}
    </div>
  );
};


// ─── MCQ Assessment ───────────────────────────────────────────────────────────
const MCQAssessment = ({ contentId, contentTitle, mcqs, onFinish, onRestartModule }) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState({});
  const [showScore, setShowScore] = useState(false);
  const [scoreData, setScoreData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setCurrentIdx(0);
    setAnswers({});
    setShowScore(false);
    setScoreData(null);
  }, [contentId]);

  const q = mcqs[currentIdx];
  if (!q) return null;

  const handleSelect = (key) => {
    setAnswers(prev => ({ ...prev, [currentIdx]: key }));
  };

  const handleNext = () => {
    if (currentIdx < mcqs.length - 1) {
      setCurrentIdx(prev => prev + 1);
    }
  };

  const handleSubmitQuiz = async () => {
    setLoading(true);
    const correctCount = mcqs.reduce((acc, q, idx) => {
      return acc + (answers[idx] === q.correct_answer ? 1 : 0);
    }, 0);

    try {
      const res = await api.post('/content/complete-module', {
        content_id: contentId,
        score: correctCount,
        total_questions: mcqs.length,
      });
      setScoreData({
        score: correctCount,
        total: mcqs.length,
        passed: res.data.completed,
        attemptCount: res.data.attempt_count,
      });
    } catch (err) {
      if (err.response?.status === 403) {
        setScoreData({
          score: correctCount,
          total: mcqs.length,
          passed: false,
          attemptCount: 2,
          maxAttempts: true,
        });
      }
    } finally {
      setLoading(false);
      setShowScore(true);
    }
  };

  const OPTIONS = ['A', 'B', 'C', 'D'];

  // ── Score Screen ──
  if (showScore && scoreData) {
    const passingScore = Math.ceil(scoreData.total * 0.5);
    return (
      <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1.5rem' }}>
        <div style={{ textAlign: 'center' }}>
          {scoreData.passed ? (
            <CheckCircle size={64} color="#10b981" style={{ marginBottom: '1rem' }} />
          ) : (
            <AlertCircle size={64} color="#ef4444" style={{ marginBottom: '1rem' }} />
          )}
          <h2 style={{ fontSize: '1.75rem', fontWeight: '700', marginBottom: '0.5rem' }}>
            {scoreData.passed ? 'Quiz Passed! 🎉' : 'Quiz Failed'}
          </h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
            Assessment: {contentTitle}
          </p>
        </div>

        {/* Score Card */}
        <div style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid var(--border)',
          borderRadius: '0.75rem',
          padding: '1.5rem 3rem',
          textAlign: 'center',
          minWidth: '300px'
        }}>
          <div style={{ fontSize: '3rem', fontWeight: '800', color: scoreData.passed ? '#10b981' : '#ef4444' }}>
            {scoreData.score}/{scoreData.total}
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
            Passing score: {passingScore}/{scoreData.total}
          </p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.5rem' }}>
            Attempt: {scoreData.attemptCount} of 2
          </p>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          {scoreData.passed ? (
            <button className="btn" style={{ width: 'auto' }} onClick={() => onFinish(scoreData.score, scoreData.total)}>
              Next Module →
            </button>
          ) : scoreData.maxAttempts ? (
            <button className="btn" style={{ width: 'auto', background: '#ef4444', border: 'none' }} onClick={onRestartModule}>
              Restart Module 🔄
            </button>
          ) : (
            <>
              <button
                className="btn"
                style={{ width: 'auto', background: 'transparent', border: '1px solid var(--border)' }}
                onClick={onRestartModule}
              >
                Rewatch Module 📺
              </button>
              <button
                className="btn"
                style={{ width: 'auto' }}
                onClick={() => {
                  setAnswers({});
                  setCurrentIdx(0);
                  setShowScore(false);
                  setScoreData(null);
                }}
              >
                Retry Quiz →
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  // ── Question Screen ──
  return (
    <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <div className="flex-between" style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <HelpCircle color="var(--primary-color)" /> Assessment: {contentTitle}
        </h2>
        <span style={{
          fontSize: '0.85rem', color: 'var(--text-muted)',
          background: 'rgba(255,255,255,0.05)', padding: '0.25rem 0.75rem', borderRadius: '1rem'
        }}>
          Question {currentIdx + 1} / {mcqs.length}
        </span>
      </div>

      <p style={{ fontSize: '1.15rem', fontWeight: '500', marginBottom: '1.5rem' }}>{q.question}</p>

      <div className="radio-group">
        {OPTIONS.map((key) => {
          const text = q[`option_${key.toLowerCase()}`];
          if (!text) return null;
          const isSelected = answers[currentIdx] === key;

          return (
            <label
              key={key}
              className={`radio-option ${isSelected ? 'selected' : ''}`}
              onClick={() => handleSelect(key)}
              style={{ cursor: 'pointer' }}
            >
              <input type="radio" checked={isSelected} onChange={() => handleSelect(key)} />
              <span style={{ fontWeight: 'bold', marginRight: '0.5rem' }}>{key}.</span> {text}
            </label>
          );
        })}
      </div>

      <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
        {currentIdx < mcqs.length - 1 ? (
          <button
            className="btn"
            style={{ width: 'auto' }}
            disabled={!answers[currentIdx]}
            onClick={handleNext}
          >
            Next Question →
          </button>
        ) : (
          <button
            className="btn"
            style={{ width: 'auto' }}
            disabled={!answers[currentIdx] || loading}
            onClick={handleSubmitQuiz}
          >
            {loading ? 'Submitting...' : 'Submit Quiz ✓'}
          </button>
        )}
      </div>
    </div>
  );
};

// ─── Main Module Component ────────────────────────────────────────────────────
const OnboardingModule = ({ content, alreadyCompleted, onNext }) => {
  const [contentViewed, setContentViewed] = useState(content.content_type !== 'video' || alreadyCompleted);
  const [phase, setPhase] = useState('content'); // 'content' | 'assessment'
  const [mcqs, setMcqs] = useState([]);

  // reset fully whenever the content changes
  useEffect(() => {
    setContentViewed(content.content_type !== 'video' || alreadyCompleted);
    setPhase('content');
    setMcqs([]);
    fetchMcqs();
  }, [content.id, content.content_type, alreadyCompleted]);

  const fetchMcqs = async () => {
    try {
      const res = await api.get(`/content/${content.id}/mcqs`);
      setMcqs(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleContentComplete = useCallback(() => {
    setContentViewed(true);
  }, []);

  const handleStartAssessment = () => {
    if (mcqs.length > 0) {
      setPhase('assessment');
    } else {
      // no MCQs — just save progress and advance
      saveProgressAndNext(0, 0);
    }
  };

  const saveProgressAndNext = async (score, total) => {
    try {
      await api.post('/content/complete-module', {
        content_id: content.id,
        score,
        total_questions: total,
      });
    } catch (err) {
      console.error('Progress save failed:', err);
    }
    onNext();
  };

  if (phase === 'assessment') {
    return (
      <MCQAssessment
        key={content.id}
        contentId={content.id}
        contentTitle={content.title}
        mcqs={mcqs}
        onFinish={(score, total) => saveProgressAndNext(score, total)}
        onRestartModule={async () => {
          try {
            await api.post(`/content/reset-attempts/${content.id}`);
          } catch (err) {
            console.error('Reset failed:', err);
          }
          setPhase('content');
        }}
      />
    );
  }

  // ── Content phase ──
  const renderMedia = () => {
    if (content.content_type === 'video') {
      if (isYouTubeUrl(content.file_url)) {
        return <YouTubeEnforcedPlayer url={content.file_url} onComplete={handleContentComplete} />;
      } else {
        return <LocalVideoPlayer url={content.file_url} onComplete={handleContentComplete} />;
      }
    } else {
      // pdf / ppt
      return <DocumentViewer url={content.file_url} onComplete={handleContentComplete} />;
    }
  };

  return (
    <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      {alreadyCompleted && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          background: 'rgba(16,185,129,0.1)', borderRadius: '0.5rem',
          padding: '0.5rem 1rem', marginBottom: '1rem', fontSize: '0.85rem', color: '#10b981'
        }}>
          <CheckCircle size={16} /> You already completed this module previously.
        </div>
      )}

      <h2 style={{ fontSize: '1.5rem', marginBottom: '0.35rem' }}>{content.title}</h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>{content.description}</p>

      {renderMedia()}

      <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '1rem' }}>
        {!contentViewed && (
          <span style={{ fontSize: '0.8rem', color: '#f59e0b' }}>
            {content.content_type === 'video'
              ? '⚠ Watch the full video to continue'
              : '⚠ Open the document to continue'}
          </span>
        )}
        <button
          className="btn"
          style={{ width: 'auto' }}
          disabled={!contentViewed}
          onClick={handleStartAssessment}
        >
          {mcqs.length > 0 ? 'Start Assessment →' : 'Next Module →'}
        </button>
      </div>
    </div>
  );
};

export default OnboardingModule;
