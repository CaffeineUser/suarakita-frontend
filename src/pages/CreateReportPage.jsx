import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  Camera,
  CheckCircle2,
  Image,
  Info,
  MapPin,
  Upload,
  X,
} from 'lucide-react';
import { api, apiRequest } from '../api/client.js';
import { LoadingSpinner } from '../components/Feedback.jsx';

export function CreateReportPage() {
  const navigate = useNavigate();

  // Form states
  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [locationName, setLocationName] = useState('');
  const [urgency, setUrgency] = useState('sedang');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');

  // File upload state
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);

  // Status states
  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    async function loadCategories() {
      try {
        const res = await api.get('/categories');
        const cats = res.data || [];
        setCategories(cats);
        if (cats.length > 0) {
          setCategoryId(String(cats[0].id));
        }
      } catch (err) {
        setErrorMessage('Gagal memuat daftar kategori laporan.');
      } finally {
        setLoadingCategories(false);
      }
    }
    loadCategories();
  }, []);

  function handlePhotoSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validasi tipe file
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setErrorMessage('Format file harus berupa gambar JPEG, PNG, atau WebP.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // Validasi ukuran max 3 MB
    if (file.size > 3 * 1024 * 1024) {
      setErrorMessage('Ukuran file foto maksimal 3 MB.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setErrorMessage('');
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(reader.result);
    reader.readAsDataURL(file);
  }

  function handleRemovePhoto() {
    setPhotoFile(null);
    setPhotoPreview(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErrorMessage('');

    // Validasi kelengkapan form di frontend
    if (!title.trim() || title.trim().length < 5) {
      const msg = 'Judul laporan minimal harus 5 karakter.';
      setErrorMessage(msg);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const selectedCat = categoryId || (categories[0] ? String(categories[0].id) : '');
    if (!selectedCat) {
      const msg = 'Silakan pilih kategori laporan.';
      setErrorMessage(msg);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (!description.trim() || description.trim().length < 10) {
      const msg = 'Deskripsi masalah minimal harus 10 karakter.';
      setErrorMessage(msg);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (!locationName.trim() || locationName.trim().length < 3) {
      const msg = 'Nama / alamat lokasi minimal harus 3 karakter.';
      setErrorMessage(msg);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (!photoFile) {
      const msg = 'Foto bukti laporan wajib dilampirkan sebelum mengirim laporan.';
      setErrorMessage(msg);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('category_id', selectedCat);
      formData.append('description', description.trim());
      formData.append('location_name', locationName.trim());
      formData.append('urgency', urgency);
      formData.append('photo', photoFile);

      if (latitude && latitude.trim() !== '') {
        formData.append('latitude', latitude.trim());
      }
      if (longitude && longitude.trim() !== '') {
        formData.append('longitude', longitude.trim());
      }

      const res = await apiRequest('/reports', {
        method: 'POST',
        body: formData,
      });

      const createdReport = res.data;
      navigate(`/reports/${createdReport.id}`, {
        state: { successMessage: 'Laporan Anda berhasil dibuat dan diajukan ke sistem.' },
      });
    } catch (err) {
      const errorText = err.message || 'Gagal membuat laporan. Silakan periksa kembali input Anda.';
      setErrorMessage(errorText);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (loadingCategories) {
    return <LoadingSpinner text="Mempersiapkan formulir laporan..." />;
  }

  return (
    <div className="form-page-container" data-testid="create-report-page">
      <div className="form-header-bar">
        <button type="button" className="btn-back-link" onClick={() => navigate(-1)} data-testid="create-report-back">
          <ArrowLeft size={18} /> Kembali
        </button>
        <h1 className="form-page-title">Buat Laporan Lingkungan Baru</h1>
        <p className="form-page-subtitle">
          Sampaikan informasi masalah fasilitas umum atau lingkungan hidup dengan bukti foto yang jelas.
        </p>
      </div>

      <div className="form-card">
        {errorMessage && (
          <div className="alert-box alert-error" role="alert" style={{ scrollMarginTop: '100px' }}>
            <AlertCircle size={22} className="alert-icon" style={{ flexShrink: 0 }} />
            <div>
              <strong>Perhatian:</strong>
              <p>{errorMessage}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="report-create-form" noValidate data-testid="create-report-form">
          {/* Judul Laporan */}
          <div className="form-group">
            <label htmlFor="report-title" className="form-label">
              Judul Laporan <span className="required">*</span>
            </label>
            <input
              id="report-title"
              name="title"
              type="text"
              required
              minLength={5}
              maxLength={150}
              placeholder="Contoh: Aspal Amblas dan Berlubang Parah di Depan Sekolah"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="form-input"
              data-testid="report-title-input"
            />
            <div className="textarea-footer-info" style={{ marginTop: '0.25rem' }}>
              <span>Minimal 5 karakter. Judul singkat dan spesifik.</span>
              <span style={{ color: title.trim().length >= 5 ? 'var(--brand-green)' : 'inherit' }}>
                {title.trim().length} / 150 karakter
              </span>
            </div>
          </div>

          {/* Kategori dan Urgensi */}
          <div className="form-row-two-cols">
            <div className="form-group">
              <label htmlFor="report-category" className="form-label">
                Kategori Masalah <span className="required">*</span>
              </label>
              <select
                id="report-category"
                name="category_id"
                required
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="form-select"
                data-testid="report-category-select"
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="report-urgency" className="form-label">
                Tingkat Urgensi <span className="required">*</span>
              </label>
              <select
                id="report-urgency"
                name="urgency"
                required
                value={urgency}
                onChange={(e) => setUrgency(e.target.value)}
                className="form-select"
                data-testid="report-urgency-select"
              >
                <option value="rendah">Rendah (Dampak minim/estetika)</option>
                <option value="sedang">Sedang (Perlu penanganan standar)</option>
                <option value="tinggi">Tinggi (Mengganggu aktivitas umum)</option>
                <option value="kritis">Kritis (Membahayakan keselamatan jiwa)</option>
              </select>
            </div>
          </div>

          {/* Deskripsi Laporan */}
          <div className="form-group">
            <label htmlFor="report-desc" className="form-label">
              Deskripsi Masalah <span className="required">*</span>
            </label>
            <textarea
              id="report-desc"
              name="description"
              required
              minLength={10}
              maxLength={5000}
              rows={5}
              placeholder="Jelaskan kondisi kerusakan, potensi bahaya, atau kronologi masalah lingkungan yang terjadi secara rinci..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="form-textarea"
              data-testid="report-description-input"
            />
            <div className="textarea-footer-info">
              <span style={{ color: description.trim().length < 10 ? '#ef4444' : 'var(--neutral-500)' }}>
                {description.trim().length < 10
                  ? `Kurang ${10 - description.trim().length} karakter lagi (minimal 10)`
                  : 'Minimal 10 karakter terpenuhi'}
              </span>
              <span>{description.length} / 5000 karakter</span>
            </div>
          </div>

          {/* Lokasi */}
          <div className="form-group">
            <label htmlFor="report-location" className="form-label">
              Nama / Alamat Lokasi <span className="required">*</span>
            </label>
            <div className="input-with-icon">
              <MapPin size={18} className="field-icon" />
              <input
                id="report-location"
                name="location_name"
                type="text"
                required
                minLength={3}
                maxLength={300}
                placeholder="Contoh: Jl. Pahlawan RT 02/RW 04, Patokan depan Toko Roti"
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                className="form-input"
                data-testid="report-location-input"
              />
            </div>
            <span className="input-help-text">Alamat jelas atau patokan yang mudah dikenali petugas.</span>
          </div>

          {/* Koordinat Opsional */}
          <div className="coordinates-box">
            <div className="coordinates-header">
              <span className="coordinates-title">
                <Info size={16} /> Titik Koordinat GPS (Opsional)
              </span>
            </div>
            <div className="form-row-two-cols">
              <div className="form-group">
                <label htmlFor="report-lat" className="form-label-sub">
                  Latitude
                </label>
                <input
                  id="report-lat"
                  name="latitude"
                  type="number"
                  step="any"
                  placeholder="Contoh: -6.2088"
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                  className="form-input"
                  data-testid="report-latitude-input"
                />
              </div>
              <div className="form-group">
                <label htmlFor="report-lng" className="form-label-sub">
                  Longitude
                </label>
                <input
                  id="report-lng"
                  name="longitude"
                  type="number"
                  step="any"
                  placeholder="Contoh: 106.8456"
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                  className="form-input"
                  data-testid="report-longitude-input"
                />
              </div>
            </div>
          </div>

          {/* Upload Foto Bukti */}
          <div className="form-group">
            <label htmlFor="photo-upload-input" className="form-label">
              Foto Bukti Kerusakan / Masalah <span className="required">*</span>
            </label>

            {!photoPreview ? (
              <label htmlFor="photo-upload-input" className="file-dropzone">
                <div className="dropzone-content">
                  <div className="dropzone-icon-bg">
                    <Camera size={32} />
                  </div>
                  <span className="dropzone-main-text">Klik atau seret file foto ke sini</span>
                  <span className="dropzone-sub-text">Format: JPG, JPEG, PNG, WebP (Maksimal 3 MB)</span>
                </div>
                <input
                  id="photo-upload-input"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  aria-label="Foto bukti laporan"
                  required
                  onChange={handlePhotoSelect}
                  className="file-input-hidden"
                  data-testid="report-photo-input"
                />
              </label>
            ) : (
              <div className="photo-preview-box">
                <img src={photoPreview} alt="Pratinjau foto laporan yang dipilih" className="preview-image" width="800" height="600" />
                <div className="preview-actions">
                  <span className="preview-filename">{photoFile?.name}</span>
                  <button
                    type="button"
                    className="btn btn-sm btn-danger"
                    onClick={handleRemovePhoto}
                    title="Ganti foto"
                    data-testid="report-photo-remove"
                  >
                    <X size={16} /> Hapus & Ganti
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Error Message kedua yang tampil di dekat tombol submit jika terjadi kendala */}
          {errorMessage && (
            <div className="alert-box alert-error alert-compact" style={{ marginTop: '1rem', marginBottom: '0.5rem' }}>
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="form-actions-row">
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => navigate(-1)}
              disabled={isSubmitting}
              data-testid="create-report-cancel"
            >
              Batalkan
            </button>
            <button
              type="submit"
              className="btn btn-primary btn-submit-report"
              disabled={isSubmitting}
              style={{ minWidth: '160px' }}
              data-testid="create-report-submit"
            >
              {isSubmitting ? (
                <>
                  <Upload size={18} className="animate-spin" /> Mengirim Laporan...
                </>
              ) : (
                'Kirim Laporan'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateReportPage;
