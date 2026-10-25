import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowUpDown,
  Filter,
  PlusCircle,
  RotateCcw,
  Search,
  Sparkles,
} from 'lucide-react';
import { api } from '../api/client.js';
import { EmptyState, ErrorMessage, LoadingSpinner } from '../components/Feedback.jsx';
import Pagination from '../components/Pagination.jsx';
import ReportCard from '../components/ReportCard.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export function HomePage() {
  const { isAuthenticated, isWarga } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // State parameter query
  const queryQ = searchParams.get('q') || '';
  const queryCategory = searchParams.get('category_id') || '';
  const queryStatus = searchParams.get('status') || '';
  const queryUrgency = searchParams.get('urgency') || '';
  const querySort = searchParams.get('sort') || 'priority_score';
  const queryOrder = searchParams.get('order') || 'desc';
  const queryPage = Number(searchParams.get('page')) || 1;

  // Local state untuk search input debounce
  const [searchInput, setSearchInput] = useState(queryQ);

  // Data state
  const [categories, setCategories] = useState([]);
  const [reports, setReports] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 9, total: 0, total_pages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Ambil daftar kategori sekali di awal
  useEffect(() => {
    async function fetchCategories() {
      try {
        const res = await api.get('/categories');
        setCategories(res.data || []);
      } catch (err) {
        console.error('Gagal memuat kategori:', err);
      }
    }
    fetchCategories();
  }, []);

  // Ambil daftar laporan saat parameter berubah
  useEffect(() => {
    async function fetchReports() {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (queryQ) params.set('q', queryQ);
        if (queryCategory) params.set('category_id', queryCategory);
        if (queryStatus) params.set('status', queryStatus);
        if (queryUrgency) params.set('urgency', queryUrgency);
        params.set('sort', querySort);
        params.set('order', queryOrder);
        params.set('page', String(queryPage));
        params.set('limit', '9');

        const res = await api.get(`/reports?${params.toString()}`);
        setReports(res.data || []);
        if (res.pagination) {
          setPagination(res.pagination);
        }
      } catch (err) {
        setError(err.message || 'Gagal memuat laporan lingkungan.');
      } finally {
        setLoading(false);
      }
    }

    fetchReports();
  }, [queryQ, queryCategory, queryStatus, queryUrgency, querySort, queryOrder, queryPage]);

  function updateQuery(newParams) {
    const updated = new URLSearchParams(searchParams);
    Object.entries(newParams).forEach(([key, val]) => {
      if (val === null || val === undefined || val === '') {
        updated.delete(key);
      } else {
        updated.set(key, String(val));
      }
    });
    // Bila filter diubah dan bukan pergantian halaman spesifik, reset ke halaman 1
    if (!('page' in newParams)) {
      updated.set('page', '1');
    }
    setSearchParams(updated);
  }

  function handleSearchSubmit(e) {
    e.preventDefault();
    updateQuery({ q: searchInput.trim() });
  }

  function handleResetFilters() {
    setSearchInput('');
    setSearchParams({});
  }

  function handleSupportChange(reportId, updateData) {
    setReports((prev) =>
      prev.map((r) =>
        r.id === reportId
          ? {
              ...r,
              support_count: updateData.support_count,
              priority_score: updateData.priority_score,
            }
          : r,
      ),
    );
  }

  const hasActiveFilters = Boolean(
    queryQ || queryCategory || queryStatus || queryUrgency || querySort !== 'priority_score',
  );

  return (
    <div className="home-page-container">
      {/* Hero Section */}
      <section className="hero-banner" aria-labelledby="hero-title">
        <div className="hero-badge">
          <Sparkles size={14} /> Partisipasi Warga untuk Lingkungan
        </div>
        <h1 id="hero-title" className="hero-headline">
          Suara Warga, Lingkungan Lebih Baik.
        </h1>
        <p className="hero-subtext">
          Laporkan jalan rusak, tumpukan sampah liar, drainase tersumbat, dan lampu jalan padam di
          lingkungan Anda. Bersama kita pantau perbaikan dengan skala prioritas transparan.
        </p>
        <div className="hero-cta-buttons">
          {(!isAuthenticated || isWarga) && (
            <Link to="/reports/new" className="btn btn-primary btn-lg">
              <PlusCircle size={20} /> Buat Laporan Baru
            </Link>
          )}
          <a href="#reports-explorer" className="btn btn-outline btn-lg">
            Jelajahi Laporan Warga
          </a>
        </div>
      </section>

      {/* Main Explorer Section */}
      <section id="reports-explorer" className="reports-explorer-section">
        <div className="explorer-header">
          <div>
            <h2 className="section-title">Daftar Laporan Lingkungan</h2>
            <p className="section-subtitle">
              Laporan diurutkan berdasarkan skor prioritas yang menggabungkan urgensi dan dukungan warga.
            </p>
          </div>
        </div>

        {/* Filter Bar Controls */}
        <div className="filter-controls-card">
          <form onSubmit={handleSearchSubmit} className="search-form-row">
            <div className="search-input-group">
              <Search size={18} className="search-input-icon" />
              <input
                type="text"
                placeholder="Cari kata kunci judul, deskripsi, atau nama lokasi..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="search-input-field"
                aria-label="Pencarian laporan"
              />
              {searchInput && (
                <button
                  type="button"
                  className="search-clear-btn"
                  onClick={() => {
                    setSearchInput('');
                    updateQuery({ q: '' });
                  }}
                  aria-label="Hapus kata kunci"
                >
                  &times;
                </button>
              )}
            </div>
            <button type="submit" className="btn btn-primary btn-search">
              Cari
            </button>
          </form>

          {/* Category Filter Pills */}
          <div className="category-pills-row" role="tablist" aria-label="Filter Kategori">
            <button
              type="button"
              className={`category-pill ${queryCategory === '' ? 'active' : ''}`}
              onClick={() => updateQuery({ category_id: '' })}
              role="tab"
              aria-selected={queryCategory === ''}
            >
              Semua Kategori
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                className={`category-pill ${queryCategory === String(cat.id) ? 'active' : ''}`}
                onClick={() => updateQuery({ category_id: cat.id })}
                role="tab"
                aria-selected={queryCategory === String(cat.id)}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Secondary Filters: Status, Urgensi, Pengurutan */}
          <div className="secondary-filters-row">
            <div className="filter-dropdown-item">
              <label htmlFor="filter-status" className="filter-label">
                <Filter size={13} /> Status:
              </label>
              <select
                id="filter-status"
                className="filter-select"
                value={queryStatus}
                onChange={(e) => updateQuery({ status: e.target.value })}
              >
                <option value="">Semua Status</option>
                <option value="diajukan">Diajukan</option>
                <option value="diverifikasi">Diverifikasi</option>
                <option value="diproses">Diproses</option>
                <option value="selesai">Selesai</option>
                <option value="ditolak">Ditolak</option>
              </select>
            </div>

            <div className="filter-dropdown-item">
              <label htmlFor="filter-urgency" className="filter-label">
                Urgensi:
              </label>
              <select
                id="filter-urgency"
                className="filter-select"
                value={queryUrgency}
                onChange={(e) => updateQuery({ urgency: e.target.value })}
              >
                <option value="">Semua Urgensi</option>
                <option value="kritis">Kritis</option>
                <option value="tinggi">Tinggi</option>
                <option value="sedang">Sedang</option>
                <option value="rendah">Rendah</option>
              </select>
            </div>

            <div className="filter-dropdown-item">
              <label htmlFor="filter-sort" className="filter-label">
                <ArrowUpDown size={13} /> Urutkan:
              </label>
              <select
                id="filter-sort"
                className="filter-select"
                value={`${querySort}_${queryOrder.toLowerCase()}`}
                onChange={(e) => {
                  const [s, o] = e.target.value.split('_');
                  updateQuery({ sort: s, order: o });
                }}
              >
                <option value="priority_score_desc">Prioritas Tertinggi (Default)</option>
                <option value="created_at_desc">Terbaru</option>
                <option value="created_at_asc">Terlama</option>
                <option value="support_count_desc">Dukungan Terbanyak</option>
                <option value="title_asc">Judul (A - Z)</option>
              </select>
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                className="btn btn-ghost btn-reset-filters"
                onClick={handleResetFilters}
                title="Kembalikan semua filter ke awal"
              >
                <RotateCcw size={14} /> Reset Filter
              </button>
            )}
          </div>
        </div>

        {/* Content Section: 4 States (Loading, Error, Empty, Success Data) */}
        {loading ? (
          <LoadingSpinner text="Memuat daftar laporan lingkungan..." />
        ) : error ? (
          <ErrorMessage
            title="Gagal Memuat Laporan"
            message={error}
            onRetry={() => updateQuery({ page: queryPage })}
          />
        ) : reports.length === 0 ? (
          <EmptyState
            title="Tidak Ada Laporan Ditemukan"
            message={
              hasActiveFilters
                ? 'Tidak ada laporan yang sesuai dengan kriteria pencarian dan filter Anda.'
                : 'Belum ada laporan lingkungan yang dibuat warga saat ini.'
            }
            actionLabel={hasActiveFilters ? 'Reset Filter' : 'Buat Laporan Pertama'}
            onAction={hasActiveFilters ? handleResetFilters : () => (window.location.href = '/reports/new')}
          />
        ) : (
          <>
            <div className="reports-grid">
              {reports.map((report) => (
                <ReportCard
                  key={report.id}
                  report={report}
                  onSupportChange={handleSupportChange}
                />
              ))}
            </div>

            {/* Pagination Controls */}
            <Pagination
              page={pagination.page}
              totalPages={pagination.total_pages}
              total={pagination.total}
              limit={pagination.limit}
              onPageChange={(newPage) => updateQuery({ page: newPage })}
            />
          </>
        )}
      </section>
    </div>
  );
}

export default HomePage;
