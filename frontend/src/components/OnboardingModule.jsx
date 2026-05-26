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
            if (e.data === window.YT.PlayerState.PLAYING) {
              startTracking();
            } else if (
              e.data === window.YT.PlayerState.PAUSED ||
              e.data === window.YT.PlayerState.ENDED
            ) {
              stopTracking();
              if (e.data === window.YT.PlayerState.ENDED) {
                setCompleted(true);
                setPercentWatched(100);
                onComplete();
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

  const startTracking = () => {
    if (intervalRef.current) return;
    intervalRef.current = setInterval(() => {
      if (!playerRef.current?.getDuration) return;
      const duration = playerRef.current.getDuration();
      const current = playerRef.current.getCurrentTime();
      if (duration > 0) {
        const pct = Math.floor((current / duration) * 100);
        setPercentWatched(pct);
        if (pct >= 95) {
          setCompleted(true);
          onComplete();
          stopTracking();
        }
      }
    }, 2000);
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

// ─── PDF / PPT Viewer ────────────────────────────────────────────────────────
const DocumentViewer = ({ url, onComplete }) => {
  const [opened, setOpened] = useState(false);
  const fullUrl = isUploadedFile(url) ? `http://localhost:8001${url}` : url;
  const ext = getFileExtension(url);

  const handleOpen = () => {
    setOpened(true);
    onComplete(); // count as viewed once opened
    window.open(fullUrl, '_blank');
  };

  return (
    <div style={{
      minHeight: '300px', borderRadius: '0.75rem', border: '2px dashed var(--border)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: '1rem', background: 'rgba(16,185,129,0.03)', cursor: 'pointer',
    }} onClick={!opened ? handleOpen : undefined}>
      <FileText size={64} color={opened ? '#10b981' : '#6366f1'} />
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontWeight: '600', marginBottom: '0.25rem' }}>
          {opened ? '✅ Document Opened' : `Click to open ${ext.toUpperCase()}`}
        </p>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{fullUrl}</p>
      </div>
      {!opened && (
        <button
          className="btn"
          style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          onClick={handleOpen}
        >
          <ExternalLink size={16} /> Open {ext.toUpperCase()}
        </button>
      )}
    </div>
  );
};

// ─── Generic Video (non-YouTube, local upload) ──────────────────────────────
const LocalVideoPlayer = ({ url, onComplete }) => {
  const fullUrl = isUploadedFile(url) ? `http://localhost:8001${url}` : url;
  const [completed, setCompleted] = useState(false);

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
        onTimeUpdate={(e) => {
          const v = e.currentTarget;
          if (v.duration > 0 && v.currentTime / v.duration >= 0.95 && !completed) {
            setCompleted(true);
            onComplete();
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
const MCQAssessment = ({ contentId, contentTitle, mcqs, onFinish }) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selected, setSelected] = useState(null);        // reset per question
  const [submitted, setSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);

  // Reset all state when module changes
  useEffect(() => {
    setCurrentIdx(0);
    setSelected(null);
    setSubmitted(false);
    setIsCorrect(false);
    setCorrectCount(0);
  }, [contentId]);

  const q = mcqs[currentIdx];
  if (!q) return null;

  const handleSubmit = () => {
    const right = selected === q.correct_answer;
    setIsCorrect(right);
    setSubmitted(true);
    if (right) setCorrectCount(prev => prev + 1);
  };

  const handleNext = () => {
    if (currentIdx < mcqs.length - 1) {
      setCurrentIdx(prev => prev + 1);
      setSelected(null);
      setSubmitted(false);
      setIsCorrect(false);
    } else {
      // all done — compute final score including this question
      onFinish(correctCount + (isCorrect ? 1 : 0), mcqs.length);
    }
  };

  const handleRetry = () => {
    setSelected(null);
    setSubmitted(false);
  };

  const OPTIONS = ['A', 'B', 'C', 'D'];

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
          const isSelected = selected === key;
          const isWrong = submitted && isSelected && !isCorrect;
          const isRight = submitted && key === q.correct_answer;

          return (
            <label
              key={key}
              className={`radio-option ${isSelected ? 'selected' : ''}`}
              style={{
                pointerEvents: submitted ? 'none' : 'auto',
                borderColor: isRight ? '#10b981' : isWrong ? '#ef4444' : undefined,
                background: isRight ? 'rgba(16,185,129,0.08)' : isWrong ? 'rgba(239,68,68,0.08)' : undefined,
              }}
            >
              <input type="radio" checked={isSelected} onChange={() => setSelected(key)} />
              <span style={{ fontWeight: 'bold', marginRight: '0.5rem' }}>{key}.</span> {text}
            </label>
          );
        })}
      </div>

      {submitted && (
        <div
          className={`alert ${isCorrect ? 'alert-success' : 'alert-error'}`}
          style={{ marginTop: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}
        >
          {isCorrect ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
          <span>
            {isCorrect
              ? 'Correct! Well done.'
              : `Incorrect. The correct answer is ${q.correct_answer}. Please try again.`}
          </span>
        </div>
      )}

      <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
        {!submitted ? (
          <button className="btn" style={{ width: 'auto' }} disabled={!selected} onClick={handleSubmit}>
            Submit Answer
          </button>
        ) : isCorrect ? (
          <button className="btn" style={{ width: 'auto' }} onClick={handleNext}>
            {currentIdx === mcqs.length - 1 ? 'Finish Module ✓' : 'Next Question →'}
          </button>
        ) : (
          <button
            className="btn"
            style={{ width: 'auto', background: 'transparent', border: '1px solid var(--border)' }}
            onClick={handleRetry}
          >
            Retry Question
          </button>
        )}
      </div>
    </div>
  );
};

// ─── Main Module Component ────────────────────────────────────────────────────
const OnboardingModule = ({ content, alreadyCompleted, onNext }) => {
  const [contentViewed, setContentViewed] = useState(false);
  const [phase, setPhase] = useState('content'); // 'content' | 'assessment'
  const [mcqs, setMcqs] = useState([]);

  // reset fully whenever the content changes
  useEffect(() => {
    setContentViewed(false);
    setPhase('content');
    setMcqs([]);
    fetchMcqs();
  }, [content.id]);

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
