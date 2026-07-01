import React, { useState, useRef, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const PDFViewer = ({ url, onReadComplete }) => {
  const [numPages, setNumPages] = useState(null);
  const [hasReachedEnd, setHasReachedEnd] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const containerRef = useRef(null);

  const fullUrl = url?.startsWith('/static/') ? `http://localhost:8001${url}` : url;

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
  };

  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el || hasReachedEnd) return;
    const threshold = 50;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - threshold) {
      setHasReachedEnd(true);
    }
  }, [hasReachedEnd]);

  const handleAcknowledge = (e) => {
  setAcknowledged(e.target.checked);
  onReadComplete(e.target.checked);
};

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* PDF Container with scroll tracking */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        style={{
          height: '500px',
          overflowY: 'auto',
          border: '1px solid var(--border)',
          borderRadius: '0.5rem',
          background: '#f5f5f5',
          padding: '1rem',
        }}
      >
        <Document
          file={fullUrl}
          onLoadSuccess={onDocumentLoadSuccess}
          loading={<p style={{ color: '#666', textAlign: 'center', padding: '2rem' }}>Loading PDF...</p>}
          error={<p style={{ color: '#ef4444', textAlign: 'center', padding: '2rem' }}>Failed to load PDF. Please try again.</p>}
        >
          {numPages && Array.from({ length: numPages }, (_, i) => (
            <Page
              key={i + 1}
              pageNumber={i + 1}
              width={560}
              style={{ marginBottom: '1rem' }}
            />
          ))}
        </Document>
      </div>

      {/* Progress indicator */}
      {!hasReachedEnd && (
        <p style={{ fontSize: '0.8rem', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          ⚠️ Please read the entire document to continue
        </p>
      )}

      {/* Acknowledgement checkbox — only shows after scrolling to end */}
      {hasReachedEnd && (
        <label style={{
          display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
          padding: '1rem', borderRadius: '0.5rem', cursor: 'pointer',
          border: `1px solid ${acknowledged ? '#10b981' : 'var(--border)'}`,
          background: acknowledged ? 'rgba(16,185,129,0.05)' : 'transparent',
          transition: 'all 0.2s'
        }}>
          <input
            type="checkbox"
            checked={acknowledged}
            onChange={handleAcknowledge}
            style={{ marginTop: '2px', width: '16px', height: '16px', cursor: 'pointer' }}
          />
          <span style={{ fontSize: '0.9rem', lineHeight: '1.5' }}>
            I have read and understood the complete document and am ready to proceed.
          </span>
        </label>
      )}
    </div>
  );
};

export default PDFViewer;