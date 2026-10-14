// src/components/ForumPostDetailClient.tsx
// -> komponen tampilan halaman penuh postingan forum pulih (client view)
//      -> tajuk narasi warga & kartu profil kader lapangan terverifikasi (kader_badge)
//      -> foto & video dokumentasi dengan rasio aspek alami bebas distorsi
//      -> komparasi foto sebelum vs sesudah rehabilitasi (comparative_media toggle)
//      -> formulir unggah bukti verifikasi lapangan langsung ke cdn vercel blob
//      -> rekam jejak audit verifikasi lapangan (field_verifications) & utas komentar warga
//      -> interaksi suka (like), bagikan tautan whatsapp (web share api), dan sticky bar mobile

"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { ForumPost, ForumComment, FieldVerification } from "@/types";

interface ForumPostDetailClientProps {
  post: ForumPost;
}

const STORAGE_KEY_POSTS = "buktipulih_forum_posts_v1";

// helper --------------------------------------------------------------------------
// function penentu kelas warna lencana kondisi lahan
function getConditionBadgeClass(status?: string): string {
  if (!status) return "badge-condition-flourishing";
  if (status === "tumbuh subur") return "badge-condition-flourishing";
  if (status === "lahan basah") return "badge-condition-wetland";
  if (status === "perlu rawat") return "badge-condition-warning";
  return "badge-condition-danger";
}

// function pemformat tanggal bahasa indonesia terstandarisasi
function formatDetailDate(isoString: string): string {
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return isoString;
  }
}

// function penentu rincian status tinggi muka air tanah gambut (tmat)
// input param : depthCm (number | undefined)
// output : objek status, label, badgeClass, deskripsi regulasi pp 57/2016, dan flag bahaya
function getWaterTableStatusInfo(depthCm?: number) {
  if (depthCm === undefined || depthCm === null) return null;
  if (depthCm < -40) {
    return {
      status: "kritis bahaya" as const,
      label: "Kritis Bahaya (< -40 cm)",
      badgeClass: "badge-tmat-danger",
      description: "Melampaui ambang batas baku kerusakan gambut PP 57/2016. Rawan kebakaran bawah tanah.",
      isDanger: true,
    };
  }
  if (depthCm <= -30) {
    return {
      status: "waspada" as const,
      label: "Waspada Kering (-30 s/d -40 cm)",
      badgeClass: "badge-tmat-warning",
      description: "Penurunan kelembapan serasah atas gambut. Pintu sekat kanal perlu ditutup rapat.",
      isDanger: false,
    };
  }
  return {
    status: "aman" as const,
    label: "Aman Lembap (> -30 cm)",
    badgeClass: "badge-tmat-safe",
    description: "Kondisi basah ideal. Sekat kanal berfungsi optimal menahan air resapan gambut.",
    isDanger: false,
  };
}
// end of helper ------------------------------------------------------------------

export const ForumPostDetailClient: React.FC<ForumPostDetailClientProps> = ({ post: initialPost }) => {
  const [post, setPost] = useState<ForumPost>(initialPost);
  const [hasLiked, setHasLiked] = useState<boolean>(initialPost.metrics.user_has_liked || false);
  const [likesCount, setLikesCount] = useState<number>(initialPost.metrics.likes);
  const [comments, setComments] = useState<ForumComment[]>(initialPost.comments || []);
  const [fieldVerifications, setFieldVerifications] = useState<FieldVerification[]>(
    initialPost.field_verifications || []
  );

  // state komparasi foto sebelum vs sesudah
  const [activeMediaTab, setActiveMediaTab] = useState<"after" | "before">("after");

  // state formulir komentar
  const [newCommentText, setNewCommentText] = useState<string>("");
  const [commenterName, setCommenterName] = useState<string>("");
  const [commenterCity, setCommenterCity] = useState<string>("");

  // state formulir verifikasi lapangan baru & upload vercel blob
  const [isVerificationFormOpen, setIsVerificationFormOpen] = useState<boolean>(false);
  const [verifierName, setVerifierName] = useState<string>("");
  const [verifierRole, setVerifierRole] = useState<string>("Kader Pemantau Lapangan");
  const [verifierStatus, setVerifierStatus] = useState<FieldVerification["condition_status"]>("tumbuh subur");
  const [verifierTmat, setVerifierTmat] = useState<string>("");
  const [verificationNotes, setVerificationNotes] = useState<string>("");
  const [verificationFile, setVerificationFile] = useState<File | null>(null);
  const [verificationPreview, setVerificationPreview] = useState<string | null>(null);
  const [isUploadingBlob, setIsUploadingBlob] = useState<boolean>(false);
  const [integrityChecked, setIntegrityChecked] = useState<boolean>(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // sinkronisasi komentar, verifikasi, dan like dari penyimpanan lokal
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_POSTS);
      if (stored) {
        const parsed: ForumPost[] = JSON.parse(stored);
        const current = parsed.find((p) => p.id === initialPost.id);
        if (current) {
          setPost(current);
          setComments(current.comments || []);
          setFieldVerifications(current.field_verifications || initialPost.field_verifications || []);
          setLikesCount(current.metrics.likes);
          setHasLiked(current.metrics.user_has_liked || false);
        }
      }
    } catch (err) {
      console.warn("Gagal membaca status tersimpan:", err);
    }
  }, [initialPost.id]);

  // notifikasi toast singkat
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // penanganan aksi suka (like)
  const handleToggleLike = () => {
    const nextLiked = !hasLiked;
    const nextCount = nextLiked ? likesCount + 1 : Math.max(0, likesCount - 1);

    setHasLiked(nextLiked);
    setLikesCount(nextCount);

    try {
      const stored = localStorage.getItem(STORAGE_KEY_POSTS);
      const list: ForumPost[] = stored ? JSON.parse(stored) : [];
      const updatedList = list.map((p) => {
        if (p.id === post.id) {
          return {
            ...p,
            metrics: {
              ...p.metrics,
              likes: nextCount,
              user_has_liked: nextLiked,
            },
          };
        }
        return p;
      });
      localStorage.setItem(STORAGE_KEY_POSTS, JSON.stringify(updatedList));
    } catch (err) {
      console.warn("Gagal menyimpan like:", err);
    }
  };

  // penanganan bagikan tautan (web share api / salin url)
  const handleSharePost = async () => {
    const shareUrl = typeof window !== "undefined" ? window.location.href : `https://buktipulih.id/forum/${post.id}`;
    const shareData = {
      title: `${post.author.username}: ${post.caption.slice(0, 60)}...`,
      text: `Bukti pemulihan lingkungan di ${post.location_name} melalui BuktiPulih:`,
      url: shareUrl,
    };

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch {
        // batalkan tanpa aksi jika pengguna menutup dialog share
      }
    }

    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
        showToast("Tautan postingan berhasil disalin ke papan klip");
      }
    } catch {
      showToast("Tautan: " + shareUrl);
    }
  };

  // penanganan pemilihan berkas foto verifikasi
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showToast("Hanya berkas gambar (JPG, PNG, WebP) yang diizinkan");
      return;
    }

    setVerificationFile(file);
    const objectUrl = URL.createObjectURL(file);
    setVerificationPreview(objectUrl);
  };

  // pengiriman formulir verifikasi lapangan baru (upload ke vercel blob)
  const handleSubmitVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verificationNotes.trim()) return;

    let finalPhotoUrl = verificationPreview || undefined;

    if (verificationFile) {
      setIsUploadingBlob(true);
      try {
        const formData = new FormData();
        formData.append("file", verificationFile);

        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (res.ok) {
          const data = await res.json();
          finalPhotoUrl = data.url;
          showToast("Foto bukti berhasil diunggah ke Vercel Blob");
        } else {
          console.warn("Upload Vercel Blob menghasilkan respon non-200, menggunakan pratinjau lokal.");
        }
      } catch (err) {
        console.warn("Gagal menghubungi endpoint Vercel Blob:", err);
      } finally {
        setIsUploadingBlob(false);
      }
    }

    const parsedTmat = verifierTmat.trim() !== "" ? Number(verifierTmat) : undefined;
    const tmatStatus =
      parsedTmat !== undefined
        ? parsedTmat < -40
          ? ("kritis bahaya" as const)
          : parsedTmat <= -30
          ? ("waspada" as const)
          : ("aman" as const)
        : undefined;

    const newVerification: FieldVerification = {
      id: `vf-${Date.now()}`,
      verifier_name: verifierName.trim() || "Kader Independen",
      role_label: verifierRole.trim() || "Relawan Pemantau Lapangan",
      is_kader_certified: true,
      condition_status: verifierStatus,
      water_table_depth_cm: parsedTmat,
      water_table_status: tmatStatus,
      photo_url: finalPhotoUrl,
      notes: verificationNotes.trim(),
      created_at: new Date().toISOString(),
    };

    const nextVerifications = [newVerification, ...fieldVerifications];
    setFieldVerifications(nextVerifications);

    // reset form
    setVerificationNotes("");
    setVerifierTmat("");
    setVerificationFile(null);
    setVerificationPreview(null);
    setIsVerificationFormOpen(false);

    try {
      const stored = localStorage.getItem(STORAGE_KEY_POSTS);
      const list: ForumPost[] = stored ? JSON.parse(stored) : [];
      const updatedList = list.map((p) => {
        if (p.id === post.id) {
          return {
            ...p,
            field_verifications: nextVerifications,
          };
        }
        return p;
      });
      localStorage.setItem(STORAGE_KEY_POSTS, JSON.stringify(updatedList));
      showToast("Verifikasi lapangan baru berhasil disimpan");
    } catch (err) {
      console.warn("Gagal menyimpan verifikasi:", err);
    }
  };

  // penambahan komentar baru
  const handleSubmitComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;

    const newComment: ForumComment = {
      id: `com-${Date.now()}`,
      post_id: post.id,
      author: {
        username: commenterName.trim() || "Warga Peduli",
        age: 30,
        city: commenterCity.trim() || "Warga Lokal",
      },
      content: newCommentText.trim(),
      created_at: new Date().toISOString(),
    };

    const nextComments = [...comments, newComment];
    setComments(nextComments);
    setNewCommentText("");

    try {
      const stored = localStorage.getItem(STORAGE_KEY_POSTS);
      const list: ForumPost[] = stored ? JSON.parse(stored) : [];
      const updatedList = list.map((p) => {
        if (p.id === post.id) {
          return {
            ...p,
            comments: nextComments,
            metrics: {
              ...p.metrics,
              comments_count: nextComments.length,
            },
          };
        }
        return p;
      });
      localStorage.setItem(STORAGE_KEY_POSTS, JSON.stringify(updatedList));
      showToast("Tanggapan Anda berhasil diterbitkan");
    } catch (err) {
      console.warn("Gagal menyimpan komentar:", err);
    }
  };

  const displayedMediaUrl =
    activeMediaTab === "before" && post.comparative_media
      ? post.comparative_media.before_url
      : post.media.url;

  const displayedMediaLabel =
    activeMediaTab === "before" && post.comparative_media
      ? post.comparative_media.before_label
      : post.comparative_media?.after_label || "Dokumentasi terkini pemulihan lahan";

  return (
    <div className="forum-article-page-wrap">
      {/* notifikasi toast */}
      {toastMessage && (
        <div className="forum-toast-banner" role="status">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. bilah navigasi atas (breadcrumb & kembali) */}
      <nav className="forum-article-nav" aria-label="Navigasi Halaman">
        <Link href="/?tab=forum" className="forum-btn-back">
          <span aria-hidden="true">&larr;</span>
          <span>Kembali ke Forum Pulih</span>
        </Link>

        <div className="forum-breadcrumb-trail">
          <span>BuktiPulih</span>
          <span className="sep">/</span>
          <Link href="/?tab=forum">Forum Pulih</Link>
          <span className="sep">/</span>
          <span className="current">Laporan #{post.id}</span>
        </div>
      </nav>

      {/* 2. artikel utama */}
      <article className="forum-article-container" itemScope itemType="https://schema.org/SocialMediaPosting">
        {/* tajuk & profil pembuat kiriman */}
        <header className="forum-article-header">
          <div className="forum-author-meta-block">
            <div className="forum-author-avatar-badge">
              <span>{post.author.username.slice(0, 2).toUpperCase()}</span>
            </div>

            <div className="forum-author-details">
              <div className="forum-author-row">
                <h2 className="forum-author-name" itemProp="author">
                  {post.author.username}
                </h2>
                <span className="forum-badge-verified" title="Kader / Warga Terverifikasi Lapangan">
                  ✓ Kader Terverifikasi
                </span>
              </div>

              <div className="forum-author-subline">
                <span>{post.author.age ? `${post.author.age} tahun · ` : ""}{post.author.city}</span>
                <span className="dot-sep">•</span>
                <time dateTime={post.created_at} title={formatDetailDate(post.created_at)}>
                  {post.time_ago || formatDetailDate(post.created_at)}
                </time>
              </div>
            </div>
          </div>

          {post.status_condition && (
            <div className="forum-header-pills">
              <span className={`forum-condition-pill ${getConditionBadgeClass(post.status_condition)}`}>
                {post.status_condition}
              </span>
            </div>
          )}
        </header>

        {/* kartu lencana sertifikasi kader lapangan */}
        {post.kader_badge && (
          <div className="kader-cert-card">
            <div className="kader-cert-head">
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span className="cert-shield-icon">🛡️</span>
                <div>
                  <div style={{ fontSize: "12.5px", fontWeight: 800, color: "var(--ink)" }}>
                    {post.kader_badge.role_title}
                  </div>
                  <div style={{ fontSize: "11px", color: "#64748B" }}>
                    {post.kader_badge.organization}
                  </div>
                </div>
              </div>
              <span className="cert-id-tag">{post.kader_badge.cert_id}</span>
            </div>
            <div className="kader-cert-footer">
              <span>✓ Sertifikasi Audit Lapangan Aktif</span>
              <span>• Terhubung ke Satgas BNPB & BRGM</span>
            </div>
          </div>
        )}

        {/* lokasi petak restorasi terkait */}
        <div className="forum-location-bar">
          <span className="loc-icon">📍</span>
          <span className="loc-text">{post.location_name}</span>
          <span className="region-tag">({post.region_key.toUpperCase()})</span>
        </div>

        {/* widget indikator tinggi muka air gambut (tmat) regulasi pp 57/2016 */}
        {post.water_table_depth_cm !== undefined && (() => {
          const tmatInfo = getWaterTableStatusInfo(post.water_table_depth_cm);
          if (!tmatInfo) return null;
          const depth = post.water_table_depth_cm;
          const pointerPct = Math.min(100, Math.max(0, (Math.abs(depth) / 60) * 100));

          return (
            <div className="tmat-monitor-card">
              <div className="tmat-monitor-head">
                <div className="tmat-title-group">
                  <span className="tmat-droplet-icon">💧</span>
                  <div>
                    <h3 className="tmat-card-title">
                      Tinggi Muka Air Gambut (TMAT) Terukur
                    </h3>
                    <span className="tmat-reg-sub">
                      Titik Penaatan Sumur Pantau / Sekat Kanal • PP 57/2016 jo PP 71/2014
                    </span>
                  </div>
                </div>
                <span className={`tmat-status-badge ${tmatInfo.badgeClass}`}>
                  {tmatInfo.label}
                </span>
              </div>

              {/* peringatan siaga darurat jika melebihi batas bahaya karhutla -40 cm */}
              {tmatInfo.isDanger && (
                <div className="tmat-danger-alert-banner" role="alert">
                  <span className="tmat-alert-icon">⚠️</span>
                  <div className="tmat-alert-content">
                    <strong className="tmat-alert-title">
                      PERINGATAN SIAGA DARURAT: AMBANG BATAS BAHAYA BRGM TERLAMPAUI
                    </strong>
                    <p className="tmat-alert-text">
                      Kedalaman air gambut berada di angka <strong>{depth} cm</strong> (melewati batas kritis <strong>-40 cm</strong>). Lapisan serasah atas kering rentan bara api bawah tanah (smoldering). Sekat kanal darurat & pemompaan air apung perlu segera diaktifkan.
                    </p>
                  </div>
                </div>
              )}

              {/* metrik ringkasan terukur */}
              <div className="tmat-numbers-row">
                <div className="tmat-num-item current">
                  <span className="tmat-num-lbl">Muka Air Terukur</span>
                  <span className={`tmat-num-val ${tmatInfo.isDanger ? "danger" : ""}`}>
                    {depth} <span className="tmat-unit">cm</span>
                  </span>
                </div>
                <div className="tmat-num-item limit">
                  <span className="tmat-num-lbl">Batas Baku Kerusakan</span>
                  <span className="tmat-num-val limit">-40 <span className="tmat-unit">cm</span></span>
                </div>
                <div className="tmat-num-item status">
                  <span className="tmat-num-lbl">Status Hidrologis</span>
                  <span className="tmat-status-text">{tmatInfo.description}</span>
                </div>
              </div>

              {/* skala kedalaman linear visual */}
              <div className="tmat-scale-container" aria-label="Skala Kedalaman Muka Air Gambut">
                <div className="tmat-scale-track">
                  {/* zona aman (0 s/d -40 cm) */}
                  <div className="tmat-zone safe" style={{ width: "66.7%" }} title="Zona Aman / Lembap (0 s/d -40 cm)" />
                  {/* zona kritis (-40 s/d -60 cm) */}
                  <div className="tmat-zone danger" style={{ width: "33.3%" }} title="Zona Kritis Bahaya Karhutla (< -40 cm)" />

                  {/* penanda batas kritis -40 cm */}
                  <div className="tmat-threshold-marker" style={{ left: "66.7%" }}>
                    <div className="tmat-threshold-line" />
                    <span className="tmat-threshold-tag">-40 cm (Batas BRGM)</span>
                  </div>

                  {/* jarum indikator terukur */}
                  <div
                    className={`tmat-indicator-pointer ${tmatInfo.isDanger ? "danger" : ""}`}
                    style={{ left: `${pointerPct}%` }}
                  >
                    <div className="tmat-pointer-bubble">{depth} cm</div>
                    <div className="tmat-pointer-pin" />
                  </div>
                </div>

                <div className="tmat-scale-labels">
                  <span>0 cm (Permukaan)</span>
                  <span>-20 cm</span>
                  <span style={{ color: "#DC2626", fontWeight: 700 }}>-40 cm</span>
                  <span>-60 cm (Kering Ekstrem)</span>
                </div>
              </div>
            </div>
          );
        })()}

        {/* bilah tab komparasi foto sebelum vs sesudah */}
        {post.comparative_media && (
          <div className="comparative-toggle-bar" role="group" aria-label="Pilih Foto Komparasi">
            <button
              type="button"
              className={`comp-toggle-btn ${activeMediaTab === "after" ? "active" : ""}`}
              onClick={() => setActiveMediaTab("after")}
            >
              <span>🌿 Perkembangan Sekarang (M6)</span>
            </button>
            <button
              type="button"
              className={`comp-toggle-btn ${activeMediaTab === "before" ? "active" : ""}`}
              onClick={() => setActiveMediaTab("before")}
            >
              <span>🔥 Kondisi Awal Pasca-Karhutla (M1)</span>
            </button>
          </div>
        )}

        {/* media foto / video skala alami bebas distorsi */}
        <figure className="forum-article-media">
          {post.media.type === "video" && activeMediaTab === "after" ? (
            <video
              src={post.media.url}
              controls
              playsInline
              className="forum-media-element"
              aria-label={`Video bukti dari ${post.author.username}`}
            />
          ) : (
            <img
              src={displayedMediaUrl}
              alt={displayedMediaLabel}
              className="forum-media-element"
              loading="eager"
            />
          )}
          <figcaption className="forum-media-caption">
            {displayedMediaLabel} · Diambil di lokasi oleh {post.author.username}
          </figcaption>
        </figure>

        {/* teks narasi kesaksian warga */}
        <div className="forum-article-body" itemProp="articleBody">
          <p className="forum-article-paragraph">{post.caption}</p>
        </div>

        {/* bilah aksi interaksi publik */}
        <section className="forum-article-actions" aria-label="Tindakan kiriman">
          <div className="forum-action-left">
            <button
              type="button"
              className={`forum-btn-action like-btn ${hasLiked ? "liked" : ""}`}
              onClick={handleToggleLike}
              aria-label={hasLiked ? "Batalkan suka" : "Sukai postingan"}
            >
              <span className="action-icon">{hasLiked ? "❤️" : "🤍"}</span>
              <span className="action-count">{likesCount} Suka</span>
            </button>

            <a href="#comments-section" className="forum-btn-action comment-btn">
              <span className="action-icon">💬</span>
              <span className="action-count">{comments.length} Tanggapan</span>
            </a>

            <button
              type="button"
              className="forum-btn-action verify-toggle-btn"
              onClick={() => setIsVerificationFormOpen(!isVerificationFormOpen)}
              title="Unggah bukti audit verifikasi lapangan baru"
            >
              <span className="action-icon">📷</span>
              <span>+ Bukti Lapangan</span>
            </button>
          </div>

          <button
            type="button"
            className="forum-btn-action share-btn"
            onClick={handleSharePost}
            title="Bagikan bukti ke WhatsApp atau media sosial"
          >
            <span className="action-icon">🔗</span>
            <span>Bagikan ke WhatsApp</span>
          </button>
        </section>

        {/* 3. formulir unggah bukti verifikasi lapangan baru (vercel blob) */}
        {isVerificationFormOpen && (
          <section className="field-verification-form-box" aria-label="Formulir Verifikasi Lapangan">
            <div className="form-box-head">
              <div>
                <h4 style={{ margin: 0, fontSize: "14px", fontWeight: 800, color: "var(--ink)" }}>
                  Tambah Bukti Audit Verifikasi Lapangan
                </h4>
                <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#64748B" }}>
                  Foto akan diunggah langsung ke penyimpanan CDN Vercel Blob untuk transparansi publik.
                </p>
              </div>
              <button
                type="button"
                className="btn-close-clean"
                onClick={() => setIsVerificationFormOpen(false)}
                aria-label="Tutup formulir"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitVerification} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div className="form-row-author">
                <input
                  type="text"
                  placeholder="Nama Lengkap Pemeriksa"
                  value={verifierName}
                  onChange={(e) => setVerifierName(e.target.value)}
                  className="comment-input-author"
                  required
                />
                <input
                  type="text"
                  placeholder="Peran / Instansi (misal: Relawan KMPG)"
                  value={verifierRole}
                  onChange={(e) => setVerifierRole(e.target.value)}
                  className="comment-input-author"
                  required
                />
              </div>

              <div>
                <label className="input-label" style={{ marginBottom: "4px", display: "block" }}>
                  Status Kondisi Vegetasi Teramati:
                </label>
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                  {(["tumbuh subur", "perlu rawat", "lahan basah", "rawan kering"] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      className={`verif-status-pill ${verifierStatus === st ? "active" : ""}`}
                      onClick={() => setVerifierStatus(st)}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* input tinggi muka air tanah (tmat) gambut */}
              <div className="form-tmat-field-wrap">
                <label className="input-label" htmlFor="input-verif-tmat" style={{ marginBottom: "4px", display: "block" }}>
                  Tinggi Muka Air Gambut (TMAT) Terukur (cm):
                </label>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                  <input
                    id="input-verif-tmat"
                    type="number"
                    step="1"
                    placeholder="Contoh: -25 atau -48"
                    value={verifierTmat}
                    onChange={(e) => setVerifierTmat(e.target.value)}
                    className="comment-input-author"
                    style={{ maxWidth: "220px" }}
                  />
                  <span style={{ fontSize: "11px", color: "#64748B" }}>
                    PP 57/2016: Ambang batas kritis bahaya karhutla adalah <strong>-40 cm</strong>
                  </span>
                </div>
              </div>

              {/* upload foto lapangan */}
              <div className="photo-upload-container">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileChange}
                  style={{ display: "none" }}
                  id="verification-photo-input"
                />
                <label htmlFor="verification-photo-input" className="photo-upload-label">
                  <span style={{ fontSize: "18px" }}>📸</span>
                  <span>{verificationFile ? verificationFile.name : "Pilih Foto Lapangan (JPG / PNG, Maks 10MB)"}</span>
                </label>

                {verificationPreview && (
                  <div className="photo-preview-box">
                    <img src={verificationPreview} alt="Pratinjau Foto" className="photo-preview-img" />
                    <button
                      type="button"
                      className="btn-remove-preview"
                      onClick={() => {
                        setVerificationFile(null);
                        setVerificationPreview(null);
                      }}
                    >
                      Hapus Foto
                    </button>
                  </div>
                )}
              </div>

              <textarea
                rows={3}
                placeholder="Catatan hasil pengamatan fisik (tinggi bibit, kedalaman muka air sekat kanal, dsb.)..."
                value={verificationNotes}
                onChange={(e) => setVerificationNotes(e.target.value)}
                className="comment-textarea"
                required
              />

              <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "11.5px", color: "#64748B", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={integrityChecked}
                  onChange={(e) => setIntegrityChecked(e.target.checked)}
                  required
                />
                <span>Saya menyatakan bahwa informasi dan dokumentasi ini diambil langsung di lokasi petak.</span>
              </label>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                <button
                  type="button"
                  className="btn-cancel-clean"
                  onClick={() => setIsVerificationFormOpen(false)}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn-submit-comment"
                  disabled={isUploadingBlob}
                >
                  {isUploadingBlob ? "Mengunggah ke Vercel Blob..." : "Kirim Bukti Verifikasi"}
                </button>
              </div>
            </form>
          </section>
        )}

        {/* 4. rekam jejak audit verifikasi lapangan */}
        <section className="field-audit-section" aria-label="Rekam Jejak Verifikasi Lapangan">
          <div className="audit-section-head">
            <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 800, color: "var(--ink)" }}>
              Rekam Jejak Verifikasi Lapangan ({fieldVerifications.length})
            </h3>
            <span style={{ fontSize: "11px", color: "#64748B" }}>
              Divalidasi langsung oleh kader dan relawan setempat
            </span>
          </div>

          <div className="audit-cards-grid">
            {fieldVerifications.map((vf) => (
              <div key={vf.id} className="audit-entry-card">
                <div className="audit-card-top">
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span className="audit-shield-icon">🛡️</span>
                    <div>
                      <div style={{ fontSize: "12.5px", fontWeight: 800, color: "var(--ink)" }}>
                        {vf.verifier_name}
                      </div>
                      <div style={{ fontSize: "11px", color: "#64748B" }}>
                        {vf.role_label}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap", justifyContent: "flex-end" }}>
                    <span className={`forum-condition-pill ${getConditionBadgeClass(vf.condition_status)}`}>
                      {vf.condition_status}
                    </span>
                    {vf.water_table_depth_cm !== undefined && (
                      <span
                        className={`audit-tmat-pill ${
                          vf.water_table_depth_cm < -40
                            ? "danger"
                            : vf.water_table_depth_cm <= -30
                            ? "warning"
                            : "safe"
                        }`}
                        title={`Tinggi Muka Air Gambut: ${vf.water_table_depth_cm} cm`}
                      >
                        💧 TMAT {vf.water_table_depth_cm} cm
                      </span>
                    )}
                  </div>
                </div>

                {vf.photo_url && (
                  <div className="audit-photo-wrap">
                    <img src={vf.photo_url} alt="Foto Verifikasi" className="audit-photo-img" />
                  </div>
                )}

                <p className="audit-notes-text">{vf.notes}</p>

                <div className="audit-card-bottom">
                  <span>Audit Terkonfirmasi</span>
                  <time dateTime={vf.created_at}>{formatDetailDate(vf.created_at)}</time>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 5. utas komentar warga & kader */}
        <section id="comments-section" className="forum-comments-section" aria-labelledby="comments-title">
          <div className="forum-comments-head">
            <h3 id="comments-title" className="forum-comments-title">
              Tanggapan Komunitas & Warga ({comments.length})
            </h3>
            <p className="forum-comments-subtitle">
              Saling berbagi informasi kondisi kanal, bibit sulaman, dan kesiapsiagaan lingkungan setempat.
            </p>
          </div>

          {/* formulir kirim tanggapan */}
          <form className="forum-comment-form" onSubmit={handleSubmitComment}>
            <div className="form-row-author">
              <input
                type="text"
                placeholder="Nama Anda (opsional)"
                value={commenterName}
                onChange={(e) => setCommenterName(e.target.value)}
                className="comment-input-author"
                aria-label="Nama pengirim komentar"
              />
              <input
                type="text"
                placeholder="Kota / Domisili"
                value={commenterCity}
                onChange={(e) => setCommenterCity(e.target.value)}
                className="comment-input-author"
                aria-label="Kota domisili"
              />
            </div>

            <textarea
              rows={3}
              placeholder="Tulis tanggapan atau laporkan kondisi lahan sekitar Anda..."
              value={newCommentText}
              onChange={(e) => setNewCommentText(e.target.value)}
              className="comment-textarea"
              required
              aria-label="Teks tanggapan"
            />

            <div className="form-submit-row">
              <button type="submit" className="btn-submit-comment">
                Kirim Tanggapan
              </button>
            </div>
          </form>

          {/* daftar komentar tersusun */}
          <div className="forum-comments-list">
            {comments.length === 0 ? (
              <div className="forum-comments-empty">
                <p>Belum ada tanggapan. Jadilah yang pertama memberikan respon bagi kader ini.</p>
              </div>
            ) : (
              comments.map((c) => (
                <div key={c.id} className="forum-comment-card">
                  <div className="comment-header-row">
                    <div className="comment-author-group">
                      <span className="comment-author-name">{c.author.username}</span>
                      <span className="comment-author-city">({c.author.city})</span>
                    </div>
                    <time className="comment-timestamp" dateTime={c.created_at}>
                      {formatDetailDate(c.created_at)}
                    </time>
                  </div>
                  <p className="comment-text-body">{c.content}</p>
                </div>
              ))
            )}
          </div>
        </section>
      </article>

      {/* 6. bilah aksi lengket di layar ponsel (mobile sticky bottom bar) */}
      <aside className="forum-mobile-sticky-bar" aria-label="Bilah Aksi Seluler">
        <button
          type="button"
          className={`mobile-sticky-btn ${hasLiked ? "liked" : ""}`}
          onClick={handleToggleLike}
        >
          <span>{hasLiked ? "❤️" : "🤍"}</span>
          <span>{likesCount}</span>
        </button>

        <a href="#comments-section" className="mobile-sticky-btn">
          <span>💬</span>
          <span>{comments.length}</span>
        </a>

        <button
          type="button"
          className="mobile-sticky-btn"
          onClick={() => setIsVerificationFormOpen(true)}
        >
          <span>📷</span>
          <span>Audit</span>
        </button>

        <button
          type="button"
          className="mobile-sticky-btn share"
          onClick={handleSharePost}
        >
          <span>🔗</span>
          <span>Bagikan</span>
        </button>
      </aside>
    </div>
  );
};
