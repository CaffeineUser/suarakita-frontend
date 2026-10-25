export function formatDate(dateString) {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch (_e) {
    return dateString;
  }
}

export function formatRelativeTime(dateString) {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return 'Baru saja';
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes} menit lalu`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} jam lalu`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 30) return `${diffInDays} hari lalu`;
    return formatDate(dateString);
  } catch (_e) {
    return dateString;
  }
}

export const STATUS_MAP = {
  diajukan: {
    label: 'Diajukan',
    description: 'Laporan baru masuk menunggu verifikasi',
    badgeClass: 'status-diajukan',
  },
  diverifikasi: {
    label: 'Diverifikasi',
    description: 'Laporan telah diverifikasi oleh petugas',
    badgeClass: 'status-diverifikasi',
  },
  diproses: {
    label: 'Diproses',
    description: 'Masalah sedang ditindaklanjuti di lapangan',
    badgeClass: 'status-diproses',
  },
  selesai: {
    label: 'Selesai',
    description: 'Penanganan masalah telah rampung',
    badgeClass: 'status-selesai',
  },
  ditolak: {
    label: 'Ditolak',
    description: 'Laporan tidak memenuhi kriteria atau dibatalkan',
    badgeClass: 'status-ditolak',
  },
};

export const URGENCY_MAP = {
  rendah: {
    label: 'Rendah',
    badgeClass: 'urgency-rendah',
  },
  sedang: {
    label: 'Sedang',
    badgeClass: 'urgency-sedang',
  },
  tinggi: {
    label: 'Tinggi',
    badgeClass: 'urgency-tinggi',
  },
  kritis: {
    label: 'Kritis',
    badgeClass: 'urgency-kritis',
  },
};

export function getPriorityTier(score) {
  const num = Number(score) || 0;
  if (num >= 80) return { label: 'Prioritas Utama', tierClass: 'priority-critical' };
  if (num >= 60) return { label: 'Prioritas Tinggi', tierClass: 'priority-high' };
  if (num >= 40) return { label: 'Prioritas Sedang', tierClass: 'priority-medium' };
  return { label: 'Prioritas Rendah', tierClass: 'priority-low' };
}
