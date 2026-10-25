import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  CheckCircle,
  Clock,
  Edit3,
  ExternalLink,
  Heart,
  ImageOff,
  MapPin,
  MessageSquare,
  Shield,
  Tag,
  Trash2,
  User,
} from 'lucide-react';
import { api, getReportPhotoUrl } from '../api/client.js';
import { ErrorMessage, LoadingSpinner } from '../components/Feedback.jsx';
import PriorityBadge from '../components/PriorityBadge.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import UrgencyBadge from '../components/UrgencyBadge.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { formatDate, formatRelativeTime, STATUS_MAP } from '../utils/formatters.js';

// Transisi status sah
const ALLOWED_NEXT_STATUSES = {
  diajukan: ['diverifikasi', 'diproses', 'selesai', 'ditolak'],
  diverifikasi: ['diproses', 'selesai', 'ditolak'],
  diproses: ['selesai', 'ditolak'],
  selesai: [],
  ditolak: [],
};

export function ReportDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, isAdmin, isWarga } = useAuth();

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successNotice, setSuccessNotice] = useState(location.state?.successMessage || '');

  // Support local state
  const [isSubmittingSupport, setIsSubmittingSupport] = useState(false);

  // Admin status update state
  const [newStatus, setNewStatus] = useState('');
  const [statusNote, setStatusNote] = useState('');
  const [isSubmittingStatus, setIsSubmittingStatus] = useState(false);
  const [statusActionError, setStatusActionError] = useState('');

  // Admin urgency update state
  const [newUrgency, setNewUrgency] = useState('');
  const [isSubmittingUrgency, setIsSubmittingUrgency] = useState(false);
  const [urgencyActionError, setUrgencyActionError] = useState('');
  const [urgencySuccessNotice, setUrgencySuccessNotice] = useState(false);

  // Delete modal state
  const [isDeleting, setIsDeleting] = useState(false);

  async function fetchReportDetail() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/reports/${id}`);
      setReport(res.data);
      if (!res.data) return;
      setNewUrgency(res.data.urgency);
      const nextAllowed = ALLOWED_NEXT_STATUSES[res.data.status] || [];
      if (nextAllowed.length > 0) {
        setNewStatus(nextAllowed[0]);
      }
    } catch (err) {
      setError(err.message || 'Laporan tidak ditemukan atau gagal dimuat.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchReportDetail();
  }, [id]);

  async function handleToggleSupport() {
    if (!isAuthenticated) {
      navigate('/login', { state: { message: 'Silakan login terlebih dahulu untuk memberi dukungan.' } });
      return;
    }

    if (!isWarga) {
      alert('Hanya akun warga yang dapat memberikan dukungan laporan.');
      return;
    }

    setIsSubmittingSupport(true);
    try {
      if (report.is_supported_by_me) {
        const res = await api.delete(`/reports/${id}/supports/me`);
        setReport((prev) => ({
          ...prev,
          is_supported_by_me: false,
          support_count: res.data.support_count,
          priority_score: res.data.priority_score,
        }));
      } else {
        const res = await api.post(`/reports/${id}/supports`);
        setReport((prev) => ({
          ...prev,
          is_supported_by_me: true,
          support_count: res.data.support_count,
          priority_score: res.data.priority_score,
        }));
      }
    } catch (err) {
      alert(err.message || 'Gagal mengubah dukungan.');
    } finally {
      setIsSubmittingSupport(false);
    }
  }

  async function handleAdminUpdateStatus(e) {
    e.preventDefault();
    if (!newStatus) return;
    setStatusActionError('');
    setIsSubmittingStatus(true);

    try {
      const res = await api.patch(`/reports/${id}/status`, {
        status: newStatus,
        note: statusNote.trim() || undefined,
      });
      setReport(res.data);
      const nextAllowed = ALLOWED_NEXT_STATUSES[res.data.status] || [];
      setNewStatus(nextAllowed[0] || '');
      setStatusNote('');
      setSuccessNotice(`Status berhasil diperbarui menjadi "${res.data.status}".`);
    } catch (err) {
      setStatusActionError(err.message || 'Gagal memperbarui status.');
    } finally {
      setIsSubmittingStatus(false);
    }
  }

  async function handleAdminUpdateUrgency(e) {
    e.preventDefault();
    setUrgencyActionError('');
    setUrgencySuccessNotice(false);
    setSuccessNotice('');
    setIsSubmittingUrgency(true);

    try {
      const res = await api.patch(`/reports/${id}/urgency`, {
        urgency: newUrgency,
      });
      setReport(res.data);
      setNewUrgency(res.data.urgency);
      setUrgencySuccessNotice(true);
    } catch (err) {
      setUrgencyActionError(err.message || 'Gagal memperbarui urgensi.');
    } finally {
      setIsSubmittingUrgency(false);
    }
  }

  async function handleDeleteReport() {
    if (!window.confirm('Apakah Anda yakin ingin menghapus laporan ini secara permanen?')) {
      return;
    }

    setIsDeleting(true);
    try {
      await api.delete(`/reports/${id}`);
      navigate('/', { replace: true });
    } catch (err) {
      alert(err.message || 'Gagal menghapus laporan.');
      setIsDeleting(false);
    }
  }

  if (loading) {
    return <LoadingSpinner text="Memuat detail laporan..." fullPage />;
  }

  if (error || !report) {
    return (
      <div className="detail-error-wrap">
        <ErrorMessage
          title="Laporan Tidak Ditemukan"
          message={error || 'Laporan yang Anda cari tidak tersedia.'}
          onRetry={fetchReportDetail}
        />
        <div style={{ textAlign: 'center', marginTop: '1rem' }}>
          <button type="button" className="btn btn-outline" onClick={() => navigate('/')}>
            Kembali ke Beranda
          </button>
        </div>
      </div>
    );
  }

  const isOwner = user && user.id === report.user_id;
  const canEdit = isOwner && report.status === 'diajukan';
  const isTerminal = ['selesai', 'ditolak'].includes(report.status);
  const nextStatuses = ALLOWED_NEXT_STATUSES[report.status] || [];

  const photoUrl = getReportPhotoUrl(report.id);
  const hasCoordinates = report.latitude !== null && report.longitude !== null;

  return (
    <div className="report-detail-page">
      {/* Back button & Title bar */}
      <div className="detail-nav-bar">
        <button type="button" className="btn-back-link" onClick={() => navigate('/')}>
          <ArrowLeft size={18} /> Kembali ke Beranda
        </button>

        {canEdit && (
          <div className="owner-actions-top">
            <Link to={`/reports/${report.id}/edit`} className="btn btn-outline btn-sm">
              <Edit3 size={15} /> Edit Laporan
            </Link>
            <button
              type="button"
              className="btn btn-danger btn-sm"
              onClick={handleDeleteReport}
              disabled={isDeleting}
            >
              <Trash2 size={15} /> {isDeleting ? 'Menghapus...' : 'Hapus Laporan'}
            </button>
          </div>
        )}
      </div>

      {successNotice && (
        <div className="alert-box alert-success" role="alert">
          <CheckCircle size={18} className="alert-icon" />
          <span>{successNotice}</span>
          <button type="button" className="alert-dismiss-btn" onClick={() => setSuccessNotice('')}>
            &times;
          </button>
        </div>
      )}

      {/* Main Grid: Left Details & Right Side Panels */}
      <div className="detail-layout-grid">
        {/* Left Column: Media, Information, Description */}
        <div className="detail-main-content">
          <div className="detail-image-card">
            <img
              src={photoUrl}
              alt={`Foto masalah ${report.title}`}
              className="detail-hero-image"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.nextElementSibling.style.display = 'flex';
              }}
            />
            <div className="detail-image-fallback" style={{ display: 'none' }}>
              <ImageOff size={48} />
              <span>Foto tidak dapat dimuat atau telah diperbarui.</span>
            </div>
          </div>

          <div className="detail-info-card">
            <div className="detail-badges-bar">
              <StatusBadge status={report.status} />
              <UrgencyBadge urgency={report.urgency} />
              <span className="category-tag-chip">
                <Tag size={13} /> {report.category_name}
              </span>
            </div>

            <h1 className="detail-title">{report.title}</h1>

            <div className="detail-meta-list">
              <span className="detail-meta-item">
                <User size={15} className="meta-icon" />
                <span>Pelapor: <strong>{report.reporter_name || 'Warga'}</strong></span>
              </span>
              <span className="detail-meta-item">
                <Calendar size={15} className="meta-icon" />
                <span>Waktu Dibuat: <strong>{formatDate(report.created_at)}</strong></span>
              </span>
              <span className="detail-meta-item">
                <Clock size={15} className="meta-icon" />
                <span>({formatRelativeTime(report.created_at)})</span>
              </span>
            </div>

            <div className="detail-location-section">
              <div className="location-info-row">
                <MapPin size={18} className="pin-icon" />
                <div>
                  <span className="location-name-label">{report.location_name}</span>
                  {hasCoordinates && (
                    <div className="coordinates-display">
                      <span>Lat: {report.latitude}, Lng: {report.longitude}</span>
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${report.latitude},${report.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="google-maps-link"
                      >
                        <ExternalLink size={13} /> Buka di Google Maps
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="detail-desc-section">
              <h3 className="section-subheading">Deskripsi Masalah</h3>
              <p className="detail-description-text">{report.description}</p>
            </div>
          </div>

          {/* Timeline Riwayat Status */}
          <div className="detail-timeline-card">
            <h3 className="section-subheading">Riwayat Perjalanan Laporan</h3>
            <p className="timeline-subtitle">
              Setiap pembaruan status dicatat secara transparan bersama waktu dan catatan petugas.
            </p>

            {report.history && report.history.length > 0 ? (
              <div className="status-timeline">
                {report.history.map((event, idx) => {
                  const statusObj = STATUS_MAP[event.new_status] || { label: event.new_status };
                  return (
                    <div key={event.id || idx} className="timeline-item">
                      <div className="timeline-marker"></div>
                      <div className="timeline-content">
                        <div className="timeline-header-row">
                          <StatusBadge status={event.new_status} size="small" />
                          <span className="timeline-timestamp">{formatDate(event.created_at)}</span>
                        </div>
                        <div className="timeline-actor">
                          Diperbarui oleh:{' '}
                          <strong>{event.changed_by_name || 'Sistem / Pelapor'}</strong>
                          {event.changed_by_role && (
                            <span className={`actor-role-tag role-${event.changed_by_role}`}>
                              {event.changed_by_role === 'admin' ? 'Petugas' : 'Warga'}
                            </span>
                          )}
                        </div>
                        {event.note && (
                          <div className="timeline-note-box">
                            <MessageSquare size={13} className="note-icon" />
                            <span>{event.note}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="timeline-empty">Belum ada riwayat perubahan status.</p>
            )}
          </div>
        </div>

        {/* Right Column: Interaction Sidebar, Support, Admin Control Panel */}
        <aside className="detail-sidebar">
          {/* Priority & Support Box */}
          <div className="sidebar-card priority-support-box">
            <h3 className="sidebar-card-title">Skor Prioritas & Dukungan</h3>
            <p className="sidebar-card-desc">
              Skor dihitung otomatis berdasarkan tingkat urgensi (60%) dan jumlah dukungan warga (40%).
            </p>

            <div className="priority-score-showcase">
              <PriorityBadge score={report.priority_score} size="large" />
              <div className="score-details-list">
                <div className="score-detail-row">
                  <span>Tingkat Urgensi:</span>
                  <strong style={{ textTransform: 'capitalize' }}>{report.urgency}</strong>
                </div>
                <div className="score-detail-row">
                  <span>Total Dukungan:</span>
                  <strong>{report.support_count} Warga</strong>
                </div>
              </div>
            </div>

            {!isAdmin && (
              <div className="support-action-area">
                <button
                  type="button"
                  className={`btn-support-large ${report.is_supported_by_me ? 'supported' : ''} ${
                    isOwner ? 'owner-disabled' : ''
                  }`}
                  onClick={handleToggleSupport}
                  disabled={isSubmittingSupport || isOwner || isTerminal}
                >
                  <Heart size={20} className={report.is_supported_by_me ? 'fill-current' : ''} />
                  <span>
                    {isOwner
                      ? 'Laporan Milik Anda'
                      : report.is_supported_by_me
                      ? 'Dukungan Diberikan (Klik Batalkan)'
                      : 'Dukung Laporan Ini'}
                  </span>
                </button>
                {isOwner && (
                  <p className="support-note-text">
                    Pelapor tidak dapat memberikan dukungan pada laporannya sendiri.
                  </p>
                )}
                {isTerminal && !isOwner && (
                  <p className="support-note-text">
                    Laporan dengan status {report.status} tidak lagi menerima dukungan baru.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Admin Verification & Management Panel */}
          {isAdmin && (
            <div className="sidebar-card admin-action-card">
              <div className="admin-panel-badge">
                <Shield size={16} /> Panel Pengelolaan Petugas
              </div>

              {/* Status Transition Form */}
              <div className="admin-sub-section">
                <h4 className="admin-sub-title">Perbarui Status Laporan</h4>

                {statusActionError && (
                  <div className="alert-box alert-error alert-compact">
                    <AlertCircle size={15} />
                    <span>{statusActionError}</span>
                  </div>
                )}

                {nextStatuses.length > 0 ? (
                  <form onSubmit={handleAdminUpdateStatus} className="admin-form">
                    <div className="form-group">
                      <label htmlFor="admin-select-status" className="form-label-sub">
                        Status Lanjutan yang Sah:
                      </label>
                      <select
                        id="admin-select-status"
                        className="form-select select-sm"
                        value={newStatus}
                        onChange={(e) => setNewStatus(e.target.value)}
                        required
                      >
                        {nextStatuses.map((st) => (
                          <option key={st} value={st}>
                            {STATUS_MAP[st]?.label || st}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label htmlFor="admin-status-note" className="form-label-sub">
                        Catatan Petugas (Opsional):
                      </label>
                      <textarea
                        id="admin-status-note"
                        rows={3}
                        className="form-textarea textarea-sm"
                        placeholder="Contoh: Tim DPU telah dikerahkan ke lokasi untuk penambalan aspal."
                        value={statusNote}
                        onChange={(e) => setStatusNote(e.target.value)}
                      />
                    </div>

                    <button
                      type="submit"
                      className="btn btn-primary btn-sm btn-full"
                      disabled={isSubmittingStatus}
                    >
                      {isSubmittingStatus ? 'Menyimpan...' : 'Perbarui Status'}
                    </button>
                  </form>
                ) : (
                  <p className="admin-terminal-note">
                    Laporan ini sudah mencapai status terminal (<strong>{report.status}</strong>). Tidak ada
                    transisi lanjutan yang diizinkan.
                  </p>
                )}
              </div>

              {/* Urgency Update Form */}
              <div className="admin-sub-section urgency-edit-section">
                <h4 className="admin-sub-title">Sesuaikan Tingkat Urgensi</h4>

                {urgencyActionError && (
                  <div className="alert-box alert-error alert-compact">
                    <AlertCircle size={15} />
                    <span>{urgencyActionError}</span>
                  </div>
                )}

                {urgencySuccessNotice && (
                  <div className="alert-box alert-success urgency-success-notice" role="status" aria-live="polite">
                    <CheckCircle size={20} className="urgency-success-icon" />
                    <div className="urgency-success-content">
                      <strong className="urgency-success-title">Pembaruan berhasil</strong>
                      <span className="urgency-success-message">
                        Tingkat urgensi dan skor prioritas laporan telah diperbarui.
                      </span>
                      <div className="urgency-success-values">
                        <span>
                          Urgensi: <strong>{report.urgency}</strong>
                        </span>
                        <span>
                          Skor prioritas:{' '}
                          <strong>
                            {typeof report.priority_score === 'number'
                              ? report.priority_score.toFixed(1)
                              : report.priority_score ?? '-'}
                          </strong>
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <form onSubmit={handleAdminUpdateUrgency} className="admin-form">
                  <div className="form-group">
                    <select
                      id="admin-select-urgency"
                      className="form-select select-sm"
                      value={newUrgency}
                      onChange={(e) => {
                        setNewUrgency(e.target.value);
                        setUrgencySuccessNotice(false);
                      }}
                      required
                    >
                      <option value="rendah">Rendah</option>
                      <option value="sedang">Sedang</option>
                      <option value="tinggi">Tinggi</option>
                      <option value="kritis">Kritis</option>
                    </select>
                  </div>
                  <button
                    type="submit"
                    className="btn btn-outline btn-sm btn-full"
                    disabled={isSubmittingUrgency || newUrgency === report.urgency}
                  >
                    {isSubmittingUrgency ? 'Menyimpan...' : 'Perbarui Urgensi & Skor'}
                  </button>
                </form>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

export default ReportDetailPage;
