import React from 'react';
import { AlertCircle, AlertTriangle, Flame, Info } from 'lucide-react';
import { URGENCY_MAP } from '../utils/formatters.js';

export function UrgencyBadge({ urgency, showIcon = true, size = 'normal' }) {
  const info = URGENCY_MAP[urgency] || {
    label: urgency || 'Normal',
    badgeClass: 'urgency-sedang',
  };

  function renderIcon() {
    if (!showIcon) return null;
    const iconProps = { size: size === 'small' ? 12 : 14, className: 'badge-icon' };
    switch (urgency) {
      case 'kritis':
        return <Flame {...iconProps} />;
      case 'tinggi':
        return <AlertTriangle {...iconProps} />;
      case 'sedang':
        return <AlertCircle {...iconProps} />;
      case 'rendah':
        return <Info {...iconProps} />;
      default:
        return null;
    }
  }

  return (
    <span className={`badge urgency-badge ${info.badgeClass} badge-${size}`}>
      {renderIcon()}
      <span>Urgensi: {info.label}</span>
    </span>
  );
}

export default UrgencyBadge;
