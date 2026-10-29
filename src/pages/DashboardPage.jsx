import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Clock,
  Eye,
  FileText,
  Heart,
  RefreshCw,
  Shield,
  TrendingUp,
  Users,
  Wrench,
  XCircle,
} from 'lucide-react';
import { api } from '../api/client.js';
import { EmptyState, ErrorMessage, LoadingSpinner } from '../components/Feedback.jsx';
import PriorityBadge from '../components/PriorityBadge.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import UrgencyBadge from '../components/UrgencyBadge.jsx';
import { STATUS_MAP } from '../utils/formatters.js';

// Skema warna chart status
const STATUS_COLORS = {
  diajukan: '#d97706',      // amber
  diverifikasi: '#2563eb',  // blue
  diproses: '#8b5cf6',      // purple
  selesai: '#059669',       // emerald green
  ditolak: '#dc2626',       // red
};

export function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [summary, setSummary] = useState(null);
  const [byCategory, setByCategory] = useState([]);
  const [byStatus, setByStatus] = useState([]);
  const [priorityReports, setPriorityReports] = useState([]);

  async function fetchDashboardData() {
    setLoading(true);
    setError(null);
    try {
      const [sumRes, catRes, statRes, prioRes] = await Promise.all([
        api.get('/dashboard/summary'),
        api.get('/dashboard/by-category'),
        api.get('/dashboard/by-status'),
        api.get('/dashboard/priority?limit=10'),
      ]);

      setSummary(sumRes.data);
      setByCategory(catRes.data || []);
      setByStatus(statRes.data || []);
      setPriorityReports(prioRes.data || []);
    } catch (err) {
      setError(err.message || 'Gagal memuat data analitik dashboard.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) {
    return <LoadingSpinner text="Memuat statistik dan grafik dashboard admin..." fullPage />;
  }

  if (error) {
    return (
      <div className="dashboard-container" data-testid="dashboard-page">
        <ErrorMessage
          title="Gagal Memuat Dashboard"
          message={error}
          onRetry={fetchDashboardData}
        />
      </div>
    );
  }

  // Siapkan data grafik status dengan label manusiawi
  const statusChartData = byStatus.map((item) => ({
    name: STATUS_MAP[item.status]?.label || item.status,
    rawStatus: item.status,
    count: item.count,
  }));

  // Siapkan data grafik kategori
  const categoryChartData = byCategory.map((cat) => ({
    name: cat.category_name,
    Laporan: cat.count,
  }));

  return (
    <div className="dashboard-container" data-testid="dashboard-page">
      {/* Dashboard Top Header */}
      <div className="dashboard-header-bar">
        <div>
          <div className="admin-chip">
            <Shield size={14} /> Panel Administrator
          </div>
          <h1 className="dashboard-title">Ringkasan Statistik & Prioritas Laporan</h1>
          <p className="dashboard-subtitle">
            Pantau sebaran masalah lingkungan masyarakat dan tangani laporan dengan prioritas tertinggi.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-outline btn-refresh"
          onClick={fetchDashboardData}
          title="Perbarui Data"
          data-testid="dashboard-refresh"
        >
          <RefreshCw size={16} /> Segarkan Data
        </button>
      </div>

      {/* Metrics Cards Grid */}
      <div className="metrics-grid">
        <div className="metric-card card-total" data-testid="dashboard-metric-total-reports">
          <div className="metric-icon-wrap bg-blue-subtle" aria-hidden="true">
            <FileText size={22} className="text-blue" />
          </div>
          <div className="metric-content">
            <span className="metric-label">Total Laporan</span>
            <span className="metric-value">{summary?.total_reports || 0}</span>
          </div>
        </div>

        <div className="metric-card card-pending" data-testid="dashboard-metric-pending">
          <div className="metric-icon-wrap bg-amber-subtle" aria-hidden="true">
            <Clock size={22} className="text-amber" />
          </div>
          <div className="metric-content">
            <span className="metric-label">Menunggu Verifikasi</span>
            <span className="metric-value">{summary?.pending_reports || 0}</span>
          </div>
        </div>

        <div className="metric-card card-process" data-testid="dashboard-metric-in-progress">
          <div className="metric-icon-wrap bg-purple-subtle" aria-hidden="true">
            <Wrench size={22} className="text-purple" />
          </div>
          <div className="metric-content">
            <span className="metric-label">Sedang Ditangani</span>
            <span className="metric-value">{summary?.in_progress_reports || 0}</span>
          </div>
        </div>

        <div className="metric-card card-done" data-testid="dashboard-metric-completed">
          <div className="metric-icon-wrap bg-green-subtle" aria-hidden="true">
            <CheckCircle2 size={22} className="text-green" />
          </div>
          <div className="metric-content">
            <span className="metric-label">Selesai Ditangani</span>
            <span className="metric-value">{summary?.completed_reports || 0}</span>
          </div>
        </div>

        <div className="metric-card card-supports" data-testid="dashboard-metric-supports">
          <div className="metric-icon-wrap bg-pink-subtle" aria-hidden="true">
            <Heart size={22} className="text-pink" />
          </div>
          <div className="metric-content">
            <span className="metric-label">Total Dukungan Warga</span>
            <span className="metric-value">{summary?.total_supports || 0}</span>
          </div>
        </div>

        <div className="metric-card card-users" data-testid="dashboard-metric-users">
          <div className="metric-icon-wrap bg-emerald-subtle" aria-hidden="true">
            <Users size={22} className="text-emerald" />
          </div>
          <div className="metric-content">
            <span className="metric-label">Pengguna Terdaftar</span>
            <span className="metric-value">{summary?.total_users || 0}</span>
          </div>
        </div>
      </div>

      {/* Analytics Charts Grid */}
      <div className="charts-grid">
        {/* Category Bar Chart */}
        <div className="chart-card">
          <div className="chart-card-header">
            <h2 className="chart-title">Distribusi Laporan per Kategori</h2>
            <span className="chart-subtitle">Jumlah masalah yang tercatat di setiap kategori</span>
          </div>
          <div className="chart-body" role="img" aria-label="Grafik distribusi laporan berdasarkan kategori">
            {categoryChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={categoryChartData} margin={{ top: 20, right: 20, left: -10, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} interval={0} angle={-15} textAnchor="end" />
                  <YAxis tick={{ fontSize: 12, fill: '#64748b' }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: '1px solid #cbd5e1' }}
                    cursor={{ fill: '#f1f5f9' }}
                  />
                  <Bar dataKey="Laporan" fill="#176b4d" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState title="Belum Ada Data Kategori" message="Belum ada laporan yang dapat dipetakan." />
            )}
          </div>
        </div>

        {/* Status Pie Chart */}
        <div className="chart-card">
          <div className="chart-card-header">
            <h2 className="chart-title">Status Penanganan Laporan</h2>
            <span className="chart-subtitle">Proporsi laporan dari diajukan hingga selesai</span>
          </div>
          <div className="chart-body" role="img" aria-label="Grafik proporsi status penanganan laporan">
            {statusChartData.some((s) => s.count > 0) ? (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={statusChartData}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                  >
                    {statusChartData.map((entry) => (
                      <Cell
                        key={`cell-${entry.rawStatus}`}
                        fill={STATUS_COLORS[entry.rawStatus] || '#94a3b8'}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: '1px solid #cbd5e1' }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState title="Belum Ada Data Status" message="Belum ada laporan aktif." />
            )}
          </div>
        </div>
      </div>

      {/* Priority Reports Table Section */}
      <section className="priority-table-card">
        <div className="table-header-row">
          <div>
            <h2 className="chart-title">10 Laporan Prioritas Tertinggi</h2>
            <p className="chart-subtitle">
              Disortir berdasarkan formula bisnis resmi gabungan tingkat urgensi dan kuantitas dukungan warga.
            </p>
          </div>
          <Link to="/" className="btn btn-outline btn-sm">
            Lihat Semua di Beranda &rarr;
          </Link>
        </div>

        {priorityReports.length > 0 ? (
          <div className="table-responsive-wrapper" data-testid="dashboard-priority-table">
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th>Skor</th>
                  <th>Judul Laporan</th>
                  <th>Kategori</th>
                  <th>Lokasi</th>
                  <th>Urgensi</th>
                  <th>Dukungan</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {priorityReports.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <PriorityBadge score={item.priority_score} showLabel={false} size="small" />
                    </td>
                    <td className="table-title-cell">
                      <Link to={`/reports/${item.id}`} className="table-link">
                        {item.title}
                      </Link>
                    </td>
                    <td>
                      <span className="table-chip">{item.category_name}</span>
                    </td>
                    <td className="table-location-cell">{item.location_name}</td>
                    <td>
                      <UrgencyBadge urgency={item.urgency} size="small" />
                    </td>
                    <td className="table-count-cell">
                      <span className="support-cell-count">
                        <Heart size={13} className="text-pink fill-current" /> {item.support_count}
                      </span>
                    </td>
                    <td>
                      <StatusBadge status={item.status} size="small" />
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <Link to={`/reports/${item.id}`} className="btn btn-sm btn-ghost btn-action-table">
                        <Eye size={14} /> Kelola
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="Tidak Ada Laporan Prioritas" message="Belum ada data laporan yang masuk." />
        )}
      </section>
    </div>
  );
}

export default DashboardPage;
