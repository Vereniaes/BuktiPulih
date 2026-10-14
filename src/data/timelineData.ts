// src/data/timelineData.ts
// -> penyedia data mock linimasa partisipasi relawan
//      -> 6 log bulanan per petak (5 riwayat + 1 terbaru) untuk kalender pertumbuhan
//      -> foto lokal per bulan di public/journal/{plot_code}/m{n}.jpg
//      -> data upvote konfirmasi warga dan catatan autentik kader

import { TimelineItem, TreeStatus } from "@/types";
import { STATUS_DISPLAY, formatDateId } from "@/utils/plotDisplay";

// helper --------------------------------------------------------------------------
// function buat path foto bulanan lokal
// input param : plotCode, month (1-6)
// output : string path public
function journalPhoto(plotCode: string, month: number): string {
  return `/journal/${plotCode.toLowerCase()}/m${month}.jpg`;
}

interface MonthEntry {
  height: number;
  status: TreeStatus;
  note: string;
}

// function buat bikin log bulanan sebelumnya dari log terbaru satu petak
// input param : latest (log terbaru), history (data per bulan, urut dari terlama)
// output : TimelineItem[] urut dari terlama, tanpa log terbaru
function buildHistory(latest: TimelineItem, history: MonthEntry[]): TimelineItem[] {
  const plotTag = latest.postmark_badge.split("•")[1]?.trim() ?? latest.plot_code;
  return history.map((entry, i) => {
    const month = i + 1;
    const date = new Date(latest.monitoring_date);
    date.setMonth(date.getMonth() - (history.length - i));
    const iso = date.toISOString();
    return {
      ...latest,
      id: `${latest.id}-m${month}`,
      monitoring_date: iso,
      postmark_badge: `${formatDateId(iso)} • ${plotTag}`,
      tree_metrics: {
        ...latest.tree_metrics,
        height_cm: entry.height,
        condition_status: entry.status,
        condition_label: STATUS_DISPLAY[entry.status].label,
      },
      field_notes: entry.note,
      images: {
        ...latest.images,
        current_photo_url: journalPhoto(latest.plot_code, month),
        current_label: `${formatDateId(iso)} (${entry.height} cm)`,
      },
      community_verifications: { confirmed_subur_count: month * 5, dispute_count: 0, user_has_verified: false },
      comment_count: 0,
    };
  });
}
// end of helper ------------------------------------------------------------------

// log terbaru per petak (bulan ke-6) ----------------------------------------------
const latestLogs: TimelineItem[] = [
  {
    id: "670c6a2b1d8f8a001a222221",
    plot_id: "670c5e1b1d8f8a001a111111",
    plot_code: "PL-KALBAR-001",
    plot_name: "Petak Gambut Parit Tokaya",
    reporter: {
      user_id: "670c50001d8f8a001a000001",
      full_name: "Pak Suwardi",
      role_label: "Kader Lapangan Terdaftar",
      is_verified: true,
    },
    monitoring_date: "2026-10-12T07:15:00.000Z",
    postmark_badge: "12 Okt 2026 • Petak #KB-04",
    tree_metrics: {
      height_cm: 85,
      condition_status: "subur",
      condition_label: "Tumbuh Subur 🌿",
      estimated_survival_rate: 88.5,
    },
    field_notes:
      "Alhamdulillah, bibit jelutung rawa petak utara sudah berdaun lebat. Sekat kanal gambut berfungsi menjaga kelembaban tanah sehingga tidak terbakar di kemarau.",
    images: {
      initial_photo_url: journalPhoto("PL-KALBAR-001", 1),
      initial_label: "10 Mei 2026 (Bibit 20cm)",
      current_photo_url: journalPhoto("PL-KALBAR-001", 6),
      current_label: "12 Okt 2026 (Pohon 85cm)",
    },
    community_verifications: {
      confirmed_subur_count: 42,
      dispute_count: 0,
      user_has_verified: false,
    },
    comment_count: 8,
  },
  {
    id: "670c6a2b1d8f8a001a222222",
    plot_id: "670c5e1b1d8f8a001a111112",
    plot_code: "PL-BEKASI-002",
    plot_name: "Hutan Kota Patriot Bina Bangsa",
    reporter: {
      user_id: "670c50001d8f8a001a000002",
      full_name: "Ibu Ratna Dewi",
      role_label: "Kader Lapangan Terdaftar",
      is_verified: true,
    },
    monitoring_date: "2026-10-11T10:00:00.000Z",
    postmark_badge: "11 Okt 2026 • Petak #BK-02",
    tree_metrics: {
      height_cm: 110,
      condition_status: "subur",
      condition_label: "Tumbuh Subur 🌿",
      estimated_survival_rate: 83.5,
    },
    field_notes:
      "Penyiraman rutin bersama warga komplek berjalan lancar tiap akhir pekan. Pohon trembesi dan mahoni sudah mulai meneduhi area bekas pembuangan sampah liar.",
    images: {
      initial_photo_url: journalPhoto("PL-BEKASI-002", 1),
      initial_label: "05 Mei 2026 (Bibit 30cm)",
      current_photo_url: journalPhoto("PL-BEKASI-002", 6),
      current_label: "11 Okt 2026 (Pohon 110cm)",
    },
    community_verifications: {
      confirmed_subur_count: 31,
      dispute_count: 1,
      user_has_verified: false,
    },
    comment_count: 5,
  },
  {
    id: "670c6a2b1d8f8a001a222223",
    plot_id: "670c5e1b1d8f8a001a111113",
    plot_code: "PL-KALTENG-003",
    plot_name: "Zona Pemulihan Sebangau Kahayan",
    reporter: {
      user_id: "670c50001d8f8a001a000003",
      full_name: "Bapak Markus",
      role_label: "Kader Lapangan Terdaftar",
      is_verified: true,
    },
    monitoring_date: "2026-10-09T14:20:00.000Z",
    postmark_badge: "09 Okt 2026 • Petak #SB-01",
    tree_metrics: {
      height_cm: 65,
      condition_status: "perlu_rawat",
      condition_label: "Perlu Dirawat 🍂",
      estimated_survival_rate: 80.5,
    },
    field_notes:
      "Debit air gambut sedikit menyusut akibat jeda hujan sepekan. Perlu tambahan tim pemompaan air dari sungai Kahayan agar bibit tidak layu.",
    images: {
      initial_photo_url: journalPhoto("PL-KALTENG-003", 1),
      initial_label: "02 Mei 2026 (Bibit 25cm)",
      current_photo_url: journalPhoto("PL-KALTENG-003", 6),
      current_label: "09 Okt 2026 (Pohon 65cm)",
    },
    community_verifications: {
      confirmed_subur_count: 18,
      dispute_count: 0,
      user_has_verified: false,
    },
    comment_count: 3,
  },
];
// end of log terbaru --------------------------------------------------------------

// riwayat bulan ke-1 sampai ke-5 per petak ----------------------------------------
const [kalbar, bekasi, kalteng] = latestLogs;

export const mockTimelineData: TimelineItem[] = [
  ...buildHistory(kalbar, [
    { height: 20, status: "subur", note: "Bibit jelutung baru ditanam di bekas lahan terbakar. Tanah masih hitam, ajir bambu sudah dipasang." },
    { height: 32, status: "subur", note: "Tiga daun baru keluar. Kanal disekat supaya gambut tetap basah." },
    { height: 45, status: "subur", note: "Rumput mulai tumbuh di sekitar bibit. Tanda tanahnya mulai pulih." },
    { height: 58, status: "subur", note: "Tinggi sudah setengah meter. Dua bibit di baris timur mati, sudah diganti." },
    { height: 72, status: "subur", note: "Daun makin lebat. Warga ikut cek tiap Jumat sore." },
  ]),
  kalbar,
  ...buildHistory(bekasi, [
    { height: 30, status: "subur", note: "Bekas tempat buang sampah dibersihkan, bibit mahoni ditanam dan diikat ke ajir." },
    { height: 45, status: "subur", note: "Sisa sampah plastik sudah diangkut. Penyiraman tiap Sabtu bareng warga komplek." },
    { height: 58, status: "subur", note: "Rumput mulai tumbuh. Anak-anak RT ikut bantu menyiram." },
    { height: 72, status: "subur", note: "Gembor ditaruh di dekat petak supaya siapa saja bisa ikut menyiram." },
    { height: 90, status: "subur", note: "Daun rimbun, rumput sudah rapat. Tidak ada sampah baru." },
  ]),
  bekasi,
  ...buildHistory(kalteng, [
    { height: 25, status: "subur", note: "Bibit ditanam di tepi kanal. Gambut masih basah sisa kebakaran." },
    { height: 32, status: "subur", note: "Daun baru tumbuh. Air kanal masih tinggi." },
    { height: 40, status: "subur", note: "Bibit sehat, tinggi 40 cm." },
    { height: 52, status: "subur", note: "Air kanal mulai turun. Ketinggian air dicatat tiap minggu." },
    { height: 60, status: "perlu_rawat", note: "Beberapa daun bawah menguning. Gambut mulai retak karena kemarau." },
  ]),
  kalteng,
];
// end of riwayat bulanan ----------------------------------------------------------
