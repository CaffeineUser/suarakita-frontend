import React from 'react';
import { Sparkles, TrendingUp } from 'lucide-react';
import { getPriorityTier } from '../utils/formatters.js';

export function PriorityBadge({ score, showLabel = true, size = 'normal' }) {
  const numericScore = typeof score === 'number' ? score : Number(score) || 0;
  const { label, tierClass } = getPriorityTier(numericScore);

  return (
    <div className={`priority-indicator ${tierClass} size-${size}`} title={`Skor Prioritas: ${numericScore} (${label})`}>
      <div className="priority-pill">
        <TrendingUp size={size === 'small' ? 12 : 14} className="priority-icon" />
        <span className="priority-score-number">{numericScore.toFixed(1)}</span>
      </div>
      {showLabel && <span className="priority-tier-label">{label}</span>}
    </div>
  );
}

export default PriorityBadge;
