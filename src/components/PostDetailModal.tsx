// src/components/PostDetailModal.tsx
// -> dialog detail postingan forum partisipasi dan kolom komentar warga
//      -> foto/video skala penuh dan caption catatan lapangan lengkap
//      -> autentikasi ringan warga sebelum komentar (nama/username, usia, kota)
//      -> penyimpanan profil warga di localstorage untuk kenyamanan interaksi

"use client";

import React, { useState, useEffect } from "react";
import { ForumPost, UserProfileLight, ForumComment } from "@/types";
import { formatId } from "@/utils/plotDisplay";

interface PostDetailModalProps {
  post: ForumPost | null;
  isOpen: boolean;
  onClose: () => void;
  onAddComment: (postId: string, comment: ForumComment) => void;
  onToggleLike: (postId: string) => void;
}

const STORAGE_KEY_PROFILE = "buktipulih_citizen_profile";

export const PostDetailModal: React.FC<PostDetailModalProps> = ({
  post,
  isOpen,
  onClose,
  onAddComment,
  onToggleLike,
}) => {
  const [profile, setProfile] = useState<UserProfileLight | null>(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  // state formulir profil ---------------------------------------------------------
  const [inputUsername, setInputUsername] = useState("");
  const [inputAge, setInputAge] = useState("");
  const [inputCity, setInputCity] = useState("");

  // state formulir komentar -------------------------------------------------------
  const [commentText, setCommentText] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // ambil profil warga dari localstorage saat pertama dibuka -----------------------
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_PROFILE);
      if (stored) {
        const parsed: UserProfileLight = JSON.parse(stored);
        setProfile(parsed);
        setInputUsername(parsed.username);
        setInputAge(String(parsed.age));
        setInputCity(parsed.city);
      }
    } catch (e) {
      console.warn("Gagal membaca profil warga:", e);
    }
  }, [isOpen]);

  if (!isOpen || !post) return null;

  // handler simpan profil baru / ganti profil -------------------------------------
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputUsername.trim() || !inputAge.trim() || !inputCity.trim()) {
      setErrorMessage("Mohon lengkapi nama, usia, dan kota domisili Anda.");
      return;
    }
    const ageNum = parseInt(inputAge, 10);
    if (isNaN(ageNum) || ageNum < 10 || ageNum > 110) {
      setErrorMessage("Mohon masukkan angka usia yang wajar (10-110).");
      return;
    }

    const newProfile: UserProfileLight = {
      username: inputUsername.trim(),
      age: ageNum,
      city: inputCity.trim(),
    };

    setProfile(newProfile);
    localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(newProfile));
    setIsEditingProfile(false);
    setErrorMessage(null);
  };

  // handler kirim komentar warga --------------------------------------------------
  const handleSubmitComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) {
      setIsEditingProfile(true);
      setErrorMessage("Silakan lengkapi nama, usia, dan kota Anda terlebih dahulu.");
      return;
    }
    if (!commentText.trim()) {
      setErrorMessage("Isi komentar tidak boleh kosong.");
      return;
    }

    const newComment: ForumComment = {
      id: `comm-${Date.now()}`,
      post_id: post.id,
      author: profile,
      content: commentText.trim(),
      created_at: new Date().toISOString(),
    };

    onAddComment(post.id, newComment);
    setCommentText("");
    setErrorMessage(null);
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="post-detail-modal-card"
        onClick={(e) => e.stopPropagation()}
      >
        {/* tombol tutup sudut kanan atas ---------------------------------------- */}
        <button
          type="button"
          className="modal-close-btn"
          onClick={onClose}
          aria-label="Tutup dialog"
        >
          &times;
        </button>

        <div className="post-detail-grid">
          {/* kolom media visual ------------------------------------------------- */}
          <div className="detail-media-pane">
            <img
              src={post.media.url}
              alt={`Dokumentasi lapangan oleh ${post.author.username}`}
              className="detail-large-img"
            />
            <div className="media-caption-overlay">
              <span>{post.location_name}</span>
            </div>
          </div>

          {/* kolom narasi & utas komentar --------------------------------------- */}
          <div className="detail-content-pane">
            {/* profil pembuat postingan ----------------------------------------- */}
            <div className="detail-author-header">
              <div>
                <h3 className="detail-author-name">{post.author.username}</h3>
                <p className="detail-author-meta">
                  {post.author.age} tahun · Asal {post.author.city} · {post.time_ago}
                </p>
              </div>

              <button
                type="button"
                className={`btn-like-pill ${post.metrics.user_has_liked ? "liked" : ""}`}
                onClick={() => onToggleLike(post.id)}
              >
                <span>♥</span>
                <span>{formatId(post.metrics.likes)} Suka</span>
              </button>
            </div>

            {/* teks lengkap catatan lapangan ------------------------------------ */}
            <div className="detail-caption-box">
              <p>{post.caption}</p>
            </div>

            <div className="detail-metrics-row">
              <span>{formatId(post.metrics.views)} total tayangan</span>
              <span>•</span>
              <span>{post.comments.length} komentar warga</span>
            </div>

            <hr className="detail-divider" />

            {/* daftar komentar warga yang sudah ada ----------------------------- */}
            <div className="comments-thread-container">
              <h4 className="comments-heading">Tanggapan Warga Lapangan:</h4>

              {post.comments.length === 0 ? (
                <p className="empty-comment-text">
                  Belum ada komentar pada kiriman ini. Jadilah warga pertama yang memberi catatan dukungan!
                </p>
              ) : (
                <div className="comments-list">
                  {post.comments.map((comm) => (
                    <div key={comm.id} className="comment-item-card">
                      <div className="comment-author-row">
                        <span className="comment-author-name">{comm.author.username}</span>
                        <span className="comment-author-profile">
                          ({comm.author.age} th, {comm.author.city})
                        </span>
                      </div>
                      <p className="comment-content-text">{comm.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* area form komentar / identitas warga ----------------------------- */}
            <div className="comment-action-section">
              {errorMessage && (
                <div className="comment-error-alert">{errorMessage}</div>
              )}

              {/* jika belum ada profil atau sedang edit profil ------------------- */}
              {(!profile || isEditingProfile) ? (
                <form onSubmit={handleSaveProfile} className="quick-profile-form">
                  <div className="profile-form-head">
                    <span style={{ fontWeight: 700, fontSize: "13px" }}>
                      Identitas Warga untuk Berkomentar:
                    </span>
                    {profile && (
                      <button
                        type="button"
                        className="btn-text-sm"
                        onClick={() => setIsEditingProfile(false)}
                      >
                        Batal
                      </button>
                    )}
                  </div>

                  <div className="profile-inputs-row">
                    <input
                      type="text"
                      placeholder="Nama / Username"
                      value={inputUsername}
                      onChange={(e) => setInputUsername(e.target.value)}
                      className="clean-input"
                      required
                    />
                    <input
                      type="number"
                      placeholder="Usia"
                      value={inputAge}
                      onChange={(e) => setInputAge(e.target.value)}
                      className="clean-input age-input"
                      min={10}
                      max={110}
                      required
                    />
                    <input
                      type="text"
                      placeholder="Kota Tinggal"
                      value={inputCity}
                      onChange={(e) => setInputCity(e.target.value)}
                      className="clean-input"
                      required
                    />
                  </div>

                  <button type="submit" className="btn-save-profile">
                    Simpan Identitas & Mulai Komentar
                  </button>
                </form>
              ) : (
                /* jika sudah ada profil tersimpan di browser ------------------- */
                <form onSubmit={handleSubmitComment} className="comment-submit-form">
                  <div className="active-profile-bar">
                    <span className="active-user-badge">
                      Komentar sebagai: <strong>{profile.username}</strong> ({profile.age} th, {profile.city})
                    </span>
                    <button
                      type="button"
                      className="btn-text-sm"
                      onClick={() => setIsEditingProfile(true)}
                    >
                      Ubah Profil
                    </button>
                  </div>

                  <div className="comment-input-row">
                    <input
                      type="text"
                      placeholder="Tulis tanggapan atau konfirmasi kondisi lapangan..."
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      className="clean-input comment-field"
                    />
                    <button type="submit" className="btn-send-comment">
                      Kirim
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
