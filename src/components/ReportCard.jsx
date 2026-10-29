import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Calendar,
  Heart,
  ImageOff,
  MapPin,
  Tag,
  User,
} from 'lucide-react';
import { api, getReportPhotoUrl } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { formatRelativeTime } from '../utils/formatters.js';
import PriorityBadge from './PriorityBadge.jsx';
import StatusBadge from './StatusBadge.jsx';
import UrgencyBadge from './UrgencyBadge.jsx';

export function getSupportRestrictionMessage({ isWarga, isOwner, isTerminal, status }) {
  if (!isWarga) return 'Hanya akun warga yang dapat memberikan dukungan laporan.';
  if (isOwner) return 'Anda tidak dapat memberikan dukungan pada laporan milik sendiri.';
  if (isTerminal) return `Laporan yang sudah ${status} tidak menerima dukungan baru.`;
  return '';
}

export function ReportCard({ report, onSupportChange }) {
  const navigate = useNavigate();
  const { user, isAuthenticated, isAdmin, isWarga } = useAuth();
  const [imgError, setImgError] = useState(false);
  const [isSubmittingSupport, setIsSubmittingSupport] = useState(false);
  const [supportCount, setSupportCount] = useState(report.support_count || 0);
  const [isSupported, setIsSupported] = useState(Boolean(report.is_supported_by_me));
  const [priorityScore, setPriorityScore] = useState(report.priority_score || 0);

  const isOwner = user && user.id === report.user_id;
  const isTerminal = ['selesai', 'ditolak'].includes(report.status);

  async function handleToggleSupport(e) {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      navigate('/login', { state: { message: 'Silakan login terlebih dahulu untuk memberikan dukungan.' } });
      return;
    }

    const restrictionMessage = getSupportRestrictionMessage({
      isWarga,
      isOwner,
      isTerminal,
      status: report.status,
    });
    if (restrictionMessage) {
      alert(restrictionMessage);
      return;
    }

    setIsSubmittingSupport(true);
    try {
      if (isSupported) {
        const res = await api.delete(`/reports/${report.id}/supports/me`);
        setIsSupported(false);
        setSupportCount(res.data.support_count);
        setPriorityScore(res.data.priority_score);
        if (onSupportChange) onSupportChange(report.id, res.data);
      } else {
        const res = await api.post(`/reports/${report.id}/supports`);
        setIsSupported(true);
        setSupportCount(res.data.support_count);
        setPriorityScore(res.data.priority_score);
        if (onSupportChange) onSupportChange(report.id, res.data);
      }
    } catch (err) {
      alert(err.message || 'Gagal memperbarui dukungan.');
    } finally {
      setIsSubmittingSupport(false);
    }
  }

  const photoUrl = getReportPhotoUrl(report.id);

  return (
    <article className="report-card" data-testid={`report-card-${report.id}`}>
      <Link
        to={`/reports/${report.id}`}
        className="report-card-image-wrap"
        tabIndex={-1}
        aria-label={`Lihat detail laporan: ${report.title}`}
      >
        {!imgError ? (
          <img
            src={photoUrl}
            alt={`Foto ${report.title}`}
            className="report-card-image"
            loading="lazy"
            decoding="async"
            width="400"
            height="300"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="report-image-placeholder">
            <ImageOff size={32} />
            <span>Foto tidak tersedia</span>
          </div>
        )}
        <div className="report-card-top-badges">
          <StatusBadge status={report.status} size="small" />
          <PriorityBadge score={priorityScore} showLabel={false} size="small" />
        </div>
      </Link>

      <div className="report-card-body">
        <div className="report-card-meta">
          <span className="meta-item category-meta">
            <Tag size={13} /> {report.category_name}
          </span>
          <span className="meta-item date-meta">
            <Calendar size={13} /> {formatRelativeTime(report.created_at)}
          </span>
        </div>

        <h3 className="report-card-title">
          <Link to={`/reports/${report.id}`} className="title-link" data-testid={`report-title-${report.id}`}>
            {report.title}
          </Link>
        </h3>

        <p className="report-card-desc">
          {report.description?.length > 110
            ? `${report.description.substring(0, 110)}...`
            : report.description}
        </p>

        <div className="report-card-location">
          <MapPin size={14} className="location-pin" />
          <span className="location-text" title={report.location_name}>
            {report.location_name}
          </span>
        </div>

        <div className="report-card-badges-row">
          <UrgencyBadge urgency={report.urgency} size="small" />
          {report.reporter_name && (
            <span className="reporter-meta" title={`Dilaporkan oleh ${report.reporter_name}`}>
              <User size={12} /> {report.reporter_name}
            </span>
          )}
        </div>
      </div>

      <div className="report-card-footer">
        {!isAdmin && (
          <button
            type="button"
            className={`btn-support ${isSupported ? 'supported' : ''} ${isOwner ? 'owner-disabled' : ''}`}
            onClick={handleToggleSupport}
            disabled={isSubmittingSupport || isOwner || isTerminal}
            aria-label={
              isOwner
                ? 'Laporan milik Anda'
                : isSupported
                ? 'Batalkan dukungan laporan'
                : 'Dukung laporan ini'
            }
            data-testid={`report-support-${report.id}`}
          >
            <Heart
              size={18}
              className={`heart-icon ${isSupported ? 'fill-current' : ''}`}
              aria-hidden="true"
            />
            <span className="support-label">
              {isOwner ? 'Laporan Anda' : isSupported ? 'Didukung' : 'Dukung'}
            </span>
            <span className="support-badge-count">{supportCount}</span>
          </button>
        )}

        <Link to={`/reports/${report.id}`} className="btn-detail-link" data-testid={`report-detail-${report.id}`}>
          Lihat Detail &rarr;
        </Link>
      </div>
    </article>
  );
}

export default ReportCard;
