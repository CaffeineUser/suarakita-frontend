import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  Camera,
  CheckCircle,
  Save,
  Upload,
} from 'lucide-react';
import { api, apiRequest, getReportPhotoUrl } from '../api/client.js';
import { LoadingSpinner } from '../components/Feedback.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export function EditReportPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState(null);
  const [categories, setCategories] = useState([]);

  // Form states
  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [locationName, setLocationName] = useState('');
  const [urgency, setUrgency] = useState('sedang');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');

  // Photo update state
  const [newPhotoFile, setNewPhotoFile] = useState(null);
  const [newPhotoPreview, setNewPhotoPreview] = useState(null);
  const [isUpdatingPhoto, setIsUpdatingPhoto] = useState(false);
  const [photoUpdateSuccess, setPhotoUpdateSuccess] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [reportRes, catRes] = await Promise.all([
          api.get(`/reports/${id}`),
          api.get('/categories'),
        ]);

        const rep = reportRes.data;
        if (user && rep.user_id !== user.id) {
          alert('Anda tidak memiliki izin untuk mengedit laporan ini.');
          navigate(`/reports/${id}`, { replace: true });
          return;
        }

        if (rep.status !== 'diajukan') {
          alert('Laporan hanya dapat diedit ketika masih dalam status "diajukan".');
          navigate(`/reports/${id}`, { replace: true });
          return;
        }

        setReport(rep);
        setCategories(catRes.data || []);

        setTitle(rep.title);
        setCategoryId(String(rep.category_id));
        setDescription(rep.description);
        setLocationName(rep.location_name);
        setUrgency(rep.urgency);
        setLatitude(rep.latitude !== null ? String(rep.latitude) : '');
        setLongitude(rep.longitude !== null ? String(rep.longitude) : '');
      } catch (err) {
        setErrorMessage(err.message || 'Gagal memuat data laporan.');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [id, user, navigate]);

  function handlePhotoSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      alert('Format foto harus berupa JPG, PNG, atau WebP.');
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      alert('Ukuran file foto maksimal 3 MB.');
      return;
    }

    setNewPhotoFile(file);
    const reader = new FileReader();
    reader.onload = () => setNewPhotoPreview(reader.result);
    reader.readAsDataURL(file);
  }

  async function handleUploadNewPhoto() {
    setIsUpdatingPhoto(true);
    try {
      const formData = new FormData();
      formData.append('photo', newPhotoFile);
      await apiRequest(`/reports/${id}/photo`, {
        method: 'PATCH',
        body: formData,
      });
      setPhotoUpdateSuccess(true);
      setTimeout(() => setPhotoUpdateSuccess(false), 4000);
      setNewPhotoFile(null);
      setNewPhotoPreview(null);
    } catch (err) {
      alert(err.message || 'Gagal memperbarui foto laporan.');
    } finally {
      setIsUpdatingPhoto(false);
    }
  }

  async function handleUpdateData(e) {
    e.preventDefault();
    setErrorMessage('');
    setIsSubmitting(true);

    try {
      await api.patch(`/reports/${id}`, {
        title: title.trim(),
        category_id: Number(categoryId),
        description: description.trim(),
        location_name: locationName.trim(),
        urgency,
        latitude: latitude.trim() ? Number(latitude) : null,
        longitude: longitude.trim() ? Number(longitude) : null,
      });

      navigate(`/reports/${id}`, {
        state: { successMessage: 'Laporan Anda berhasil diperbarui.' },
      });
    } catch (err) {
      setErrorMessage(err.message || 'Gagal menyimpan perubahan laporan.');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (loading) {
    return <LoadingSpinner text="Memuat data formulir edit..." />;
  }

  return (
    <div className="form-page-container">
      <div className="form-header-bar">
        <button type="button" className="btn-back-link" onClick={() => navigate(`/reports/${id}`)}>
          <ArrowLeft size={18} /> Kembali ke Detail
        </button>
        <h1 className="form-page-title">Edit Laporan Lingkungan</h1>
        <p className="form-page-subtitle">
          Perbarui rincian informasi laporan selama masih berada dalam status <strong>Diajukan</strong>.
        </p>
      </div>

      <div className="form-card">
        {errorMessage && (
          <div className="alert-box alert-error" role="alert">
            <AlertCircle size={20} className="alert-icon" />
            <div>
              <strong>Kendala:</strong>
              <p>{errorMessage}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleUpdateData} className="report-create-form">
          <div className="form-group">
            <label htmlFor="edit-title" className="form-label">
              Judul Laporan <span className="required">*</span>
            </label>
            <input
              id="edit-title"
              type="text"
              required
              minLength={5}
              maxLength={150}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="form-input"
            />
          </div>

          <div className="form-row-two-cols">
            <div className="form-group">
              <label htmlFor="edit-cat" className="form-label">
                Kategori Masalah <span className="required">*</span>
              </label>
              <select
                id="edit-cat"
                required
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="form-select"
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="edit-urgency" className="form-label">
                Tingkat Urgensi <span className="required">*</span>
              </label>
              <select
                id="edit-urgency"
                required
                value={urgency}
                onChange={(e) => setUrgency(e.target.value)}
                className="form-select"
              >
                <option value="rendah">Rendah</option>
                <option value="sedang">Sedang</option>
                <option value="tinggi">Tinggi</option>
                <option value="kritis">Kritis</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="edit-desc" className="form-label">
              Deskripsi Masalah <span className="required">*</span>
            </label>
            <textarea
              id="edit-desc"
              required
              minLength={10}
              maxLength={5000}
              rows={5}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="form-textarea"
            />
          </div>

          <div className="form-group">
            <label htmlFor="edit-loc" className="form-label">
              Nama / Alamat Lokasi <span className="required">*</span>
            </label>
            <input
              id="edit-loc"
              type="text"
              required
              minLength={3}
              maxLength={300}
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              className="form-input"
            />
          </div>

          <div className="coordinates-box">
            <span className="coordinates-title">Titik Koordinat GPS (Opsional)</span>
            <div className="form-row-two-cols" style={{ marginTop: '0.75rem' }}>
              <div className="form-group">
                <label htmlFor="edit-lat" className="form-label-sub">Latitude</label>
                <input
                  id="edit-lat"
                  type="number"
                  step="any"
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label htmlFor="edit-lng" className="form-label-sub">Longitude</label>
                <input
                  id="edit-lng"
                  type="number"
                  step="any"
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                  className="form-input"
                />
              </div>
            </div>
          </div>

          <div className="form-actions-row">
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => navigate(`/reports/${id}`)}
              disabled={isSubmitting}
            >
              Batal
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              <Save size={18} /> {isSubmitting ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
          </div>
        </form>

        {/* Section Ganti Foto Terpisah */}
        <div className="edit-photo-section">
          <h3 className="section-subheading">Perbarui Foto Laporan</h3>
          <p className="input-help-text" style={{ marginBottom: '1rem' }}>
            Anda dapat mengganti foto yang sudah diunggah dengan foto terbaru.
          </p>

          {photoUpdateSuccess && (
            <div className="alert-box alert-success" style={{ marginBottom: '1rem' }}>
              <CheckCircle size={16} /> Foto laporan berhasil diperbarui di server.
            </div>
          )}

          <div className="edit-photo-grid">
            <div className="current-photo-wrap">
              <span className="photo-label">Foto Saat Ini:</span>
              <img
                src={getReportPhotoUrl(id)}
                alt="Foto Laporan Saat Ini"
                className="edit-thumbnail"
              />
            </div>

            <div className="upload-new-photo-wrap">
              <span className="photo-label">Pilih Foto Pengganti:</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handlePhotoSelect}
                className="form-input file-input"
              />
              {newPhotoPreview && (
                <div style={{ marginTop: '0.75rem' }}>
                  <img src={newPhotoPreview} alt="Preview Foto Baru" className="edit-thumbnail" />
                  <div style={{ marginTop: '0.5rem' }}>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={handleUploadNewPhoto}
                      disabled={isUpdatingPhoto}
                    >
                      <Upload size={14} /> {isUpdatingPhoto ? 'Mengunggah...' : 'Unggah Foto Baru'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EditReportPage;
