import React from 'react';
import { CheckCheck, CheckCircle2, Clock, Wrench, XCircle } from 'lucide-react';
import { STATUS_MAP } from '../utils/formatters.js';

export function StatusBadge({ status, showIcon = true, size = 'normal' }) {
  const info = STATUS_MAP[status] || {
    label: status || 'Tidak diketahui',
    badgeClass: 'status-default',
  };

  function renderIcon() {
    if (!showIcon) return null;
    const iconProps = { size: size === 'small' ? 12 : 14, className: 'badge-icon' };
    switch (status) {
      case 'diajukan':
        return <Clock {...iconProps} />;
      case 'diverifikasi':
        return <CheckCircle2 {...iconProps} />;
      case 'diproses':
        return <Wrench {...iconProps} />;
      case 'selesai':
        return <CheckCheck {...iconProps} />;
      case 'ditolak':
        return <XCircle {...iconProps} />;
      default:
        return null;
    }
  }

  return (
    <span className={`badge status-badge ${info.badgeClass} badge-${size}`}>
      {renderIcon()}
      <span>{info.label}</span>
    </span>
  );
}

export default StatusBadge;
