import React from 'react';
import { AlertCircle, FileQuestion, Loader2, RefreshCw } from 'lucide-react';

export function LoadingSpinner({ text = 'Memuat data...', fullPage = false }) {
  return (
    <div className={`feedback-container loading-state ${fullPage ? 'full-page' : ''}`}>
      <Loader2 className="spinner-icon animate-spin" size={36} />
      <p className="feedback-text">{text}</p>
    </div>
  );
}

export function EmptyState({
  title = 'Tidak Ada Data',
  message = 'Belum ada data yang tersedia untuk ditampilkan.',
  actionLabel,
  onAction,
}) {
  return (
    <div className="feedback-container empty-state">
      <div className="feedback-icon-wrapper">
        <FileQuestion size={40} className="empty-icon" />
      </div>
      <h3 className="feedback-title">{title}</h3>
      <p className="feedback-text">{message}</p>
      {actionLabel && onAction && (
        <button type="button" className="btn btn-outline" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}

export function ErrorMessage({
  title = 'Terjadi Kesalahan',
  message = 'Gagal memuat data dari server. Silakan coba kembali.',
  onRetry,
}) {
  return (
    <div className="feedback-container error-state" role="alert">
      <div className="feedback-icon-wrapper error-icon-bg">
        <AlertCircle size={40} className="error-icon" />
      </div>
      <h3 className="feedback-title">{title}</h3>
      <p className="feedback-text">{message}</p>
      {onRetry && (
        <button type="button" className="btn btn-primary btn-retry" onClick={onRetry}>
          <RefreshCw size={16} /> Coba Lagi
        </button>
      )}
    </div>
  );
}
