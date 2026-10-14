// src/components/CreatePostModal.tsx
// -> dialog pembuatan postingan bukti pemulihan baru oleh warga (tombol '+')
//      -> input identitas warga: username/nama, usia, kota tempat tinggal
//      -> input lokasi & objek pemulihan inklusif (rumah, fasilitas umum, lahan, sekat kanal)
//      -> unggah berkas foto/video nyata dari perangkat (maksimal 10 MB) dengan deteksi skala otomatis
//      -> catatan cerita lapangan autentik tanpa pembatasan kategori sempit

"use client";

import React, { useState, useEffect } from "react";
import { ForumPost, UserProfileLight } from "@/types";

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitPost: (newPost: ForumPost) => void;
}

const STORAGE_KEY_PROFILE = "buktipulih_citizen_profile";

export const CreatePostModal: React.FC<CreatePostModalProps> = ({
  isOpen,
  onClose,
  onSubmitPost,
}) => {
  const [username, setUsername] = useState("");
  const [age, setAge] = useState("");
  const [city, setCity] = useState("");

  const [locationName, setLocationName] = useState("");
  const [regionKey, setRegionKey] = useState<ForumPost["region_key"]>("kalbar");
  const [caption, setCaption] = useState("");
  const [detectedAspectRatio, setDetectedAspectRatio] = useState<ForumPost["media"]["aspect_ratio"]>("portrait");

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // muat profil tersimpan jika ada ------------------------------------------------
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_PROFILE);
      if (stored) {
        const parsed: UserProfileLight = JSON.parse(stored);
        setUsername(parsed.username);
        setAge(String(parsed.age));
        setCity(parsed.city);
      }
    } catch (e) {
      console.warn("Gagal membaca profil warga:", e);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // handler saat warga memilih berkas foto/video dari perangkat ------------------
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setErrorMessage("Ukuran berkas melebihi batas 10 MB.");
        return;
      }
      setSelectedFile(file);
      const preview = URL.createObjectURL(file);
      setFilePreview(preview);
      setErrorMessage(null);

      // deteksi rasio aspek alami foto secara otomatis
      if (file.type.startsWith("image/")) {
        const img = new Image();
        img.onload = () => {
          const ratio = img.naturalWidth / img.naturalHeight;
          if (ratio > 1.25) {
            setDetectedAspectRatio("landscape");
          } else if (ratio < 0.85) {
            setDetectedAspectRatio("portrait");
          } else {
            setDetectedAspectRatio("square");
          }
        };
        img.src = preview;
      } else {
        setDetectedAspectRatio("landscape");
      }
    }
  };

  // handler submit postingan baru -------------------------------------------------
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !age.trim() || !city.trim() || !locationName.trim() || !caption.trim()) {
      setErrorMessage("Mohon lengkapi semua kolom yang bertanda bintang (*).");
      return;
    }

    if (!selectedFile) {
      setErrorMessage("Mohon pilih berkas foto atau video dokumentasi nyata dari perangkat.");
      return;
    }

    const ageNum = parseInt(age, 10);
    if (isNaN(ageNum) || ageNum < 10 || ageNum > 110) {
      setErrorMessage("Mohon masukkan angka usia yang valid (10-110).");
      return;
    }

    let finalMediaUrl = "";
    let finalMediaType: "image" | "video" = selectedFile.type.startsWith("video") ? "video" : "image";

    // unggah berkas nyata langsung ke penyimpanan ---------------------------------
    setIsUploading(true);
    setErrorMessage(null);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) {
        const errData = await uploadRes.json().catch(() => ({}));
        throw new Error(errData.error || "Gagal mengunggah berkas.");
      }

      const uploadData = await uploadRes.json();
      finalMediaUrl = uploadData.url;
    } catch (err: unknown) {
      setIsUploading(false);
      const errMsg = err instanceof Error ? err.message : "Gagal mengunggah berkas.";
      setErrorMessage(`Gagal mengunggah berkas: ${errMsg}`);
      return;
    }
    setIsUploading(false);

    // simpan profil warga untuk kemudahan pengisian berikutnya ---------------------
    const authorProfile: UserProfileLight = {
      username: username.trim(),
      age: ageNum,
      city: city.trim(),
    };
    localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(authorProfile));

    const newPost: ForumPost = {
      id: `post-${Date.now()}`,
      author: authorProfile,
      location_name: locationName.trim(),
      region_key: regionKey,
      created_at: new Date().toISOString(),
      time_ago: "baru saja",
      caption: caption.trim(),
      media: {
        type: finalMediaType,
        url: finalMediaUrl,
        aspect_ratio: detectedAspectRatio,
      },
      metrics: {
        likes: 1,
        views: 12,
        comments_count: 0,
        user_has_liked: true,
      },
      comments: [],
    };

    onSubmitPost(newPost);
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="create-post-modal-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head-row">
          <div>
            <h3 className="modal-title-text">+ Unggah Bukti Pemulihan Warga</h3>
            <p className="modal-sub-text">
              Bagikan dokumentasi nyata dari lapangan (rumah, lahan, jembatan, fasilitas desa) pasca-karhutla.
            </p>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Tutup dialog"
          >
            &times;
          </button>
        </div>

        {errorMessage && (
          <div className="comment-error-alert">{errorMessage}</div>
        )}

        <form onSubmit={handleSubmit} className="create-post-form">
          {/* baris identitas warga ---------------------------------------------- */}
          <div className="form-group-box">
            <span className="box-section-title">1. Identitas Pengirim</span>
            <div className="three-cols-grid">
              <div>
                <label className="input-label">Nama / Username *</label>
                <input
                  type="text"
                  placeholder="Contoh: Pak Suwardi"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="clean-input"
                  required
                />
              </div>
              <div>
                <label className="input-label">Usia *</label>
                <input
                  type="number"
                  placeholder="Contoh: 35"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  className="clean-input"
                  min={10}
                  max={110}
                  required
                />
              </div>
              <div>
                <label className="input-label">Kota Tinggal *</label>
                <input
                  type="text"
                  placeholder="Contoh: Kubu Raya"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="clean-input"
                  required
                />
              </div>
            </div>
          </div>

          {/* baris lokasi & objek pemulihan ------------------------------------- */}
          <div className="form-group-box">
            <span className="box-section-title">2. Lokasi & Objek Pemulihan</span>
            <div className="two-cols-grid">
              <div>
                <label className="input-label">Nama Lokasi / Objek Pemulihan *</label>
                <input
                  type="text"
                  placeholder="Contoh: Rumah Warga RT 03, Jembatan Desa, Jalur 4 Parit Tokaya"
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  className="clean-input"
                  required
                />
              </div>
              <div>
                <label className="input-label">Wilayah Provinsi</label>
                <select
                  value={regionKey}
                  onChange={(e) => setRegionKey(e.target.value as ForumPost["region_key"])}
                  className="clean-select"
                >
                  <option value="kalbar">Kalimantan Barat</option>
                  <option value="kalteng">Kalimantan Tengah</option>
                  <option value="riau">Riau</option>
                  <option value="sumsel">Sumatera Selatan</option>
                  <option value="kalsel">Kalimantan Selatan</option>
                  <option value="jambi">Jambi</option>
                  <option value="bekasi">Bekasi / Jabodetabek</option>
                  <option value="lainnya">Wilayah Lainnya</option>
                </select>
              </div>
            </div>
          </div>

          {/* baris pilihan foto / media dokumentasi nyata ----------------------- */}
          <div className="form-group-box">
            <span className="box-section-title">3. Dokumentasi Visual Lapangan</span>
            
            <div>
              <label className="input-label">Pilih Foto atau Video Nyata dari Perangkat *</label>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"
                onChange={handleFileChange}
                className="clean-input"
                style={{ padding: "8px" }}
                required
              />
              <span style={{ fontSize: "12px", color: "#64748B", marginTop: "6px", display: "block" }}>
                Mendukung foto (JPEG, PNG, WebP) atau video (MP4) · Maksimal 10 MB.
              </span>
            </div>

            {filePreview && (
              <div style={{ marginTop: "12px", display: "flex", alignItems: "center", gap: "12px", backgroundColor: "var(--surface-bg)", padding: "10px 14px", borderRadius: "var(--radius-sm)", border: "1px solid var(--surface-border)" }}>
                <img src={filePreview} alt="Pratinjau berkas" style={{ width: "52px", height: "52px", objectFit: "cover", borderRadius: "4px" }} />
                <div style={{ flex: 1, fontSize: "12px" }}>
                  <div style={{ fontWeight: 700, color: "var(--ink)" }}>{selectedFile?.name}</div>
                  <div style={{ color: "#64748B" }}>{(Number(selectedFile?.size) / (1024 * 1024)).toFixed(2)} MB</div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFile(null);
                    setFilePreview(null);
                  }}
                  className="btn-text-sm"
                  style={{ color: "#DC2626", fontWeight: 700, background: "none", border: "none", cursor: "pointer" }}
                >
                  Hapus
                </button>
              </div>
            )}
          </div>

          {/* catatan cerita pemulihan ------------------------------------------- */}
          <div className="form-group-box">
            <span className="box-section-title">4. Catatan Pemulihan Lapangan *</span>
            <textarea
              placeholder="Ceritakan proses pemulihan (pembangunan kembali rumah warga, perbaikan jembatan, perkembangan tanaman, atau kendala yang dihadapi)..."
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="clean-textarea"
              rows={3}
              required
            />
          </div>

          <div className="modal-action-footer">
            <button
              type="button"
              className="btn-cancel"
              onClick={onClose}
              disabled={isUploading}
            >
              Batal
            </button>
            <button type="submit" className="btn-submit-post" disabled={isUploading}>
              {isUploading ? "Mengunggah Berkas..." : "Kirim Bukti ke Forum Pulih"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
