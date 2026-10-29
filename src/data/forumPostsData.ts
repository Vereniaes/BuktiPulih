// Todo:
// -> Provide sample posts and their lookup helpers.

// --- Sample posts ---
import { ForumPost } from "@/types";

export const initialForumPosts: ForumPost[] = [
  {
    id: "post-kb-001",
    author: {
      username: "Pak Suwardi",
      age: 52,
      city: "Kubu Raya",
    },
    location_name: "Parit Tokaya, Rasau Jaya, Kubu Raya",
    region_key: "kalbar",
    created_at: "2026-10-14T03:30:00.000Z",
    time_ago: "3 jam yang lalu",
    caption:
      "Alhamdulillah, sekat kanal jalur 4 terisi air hujan semalam. Bibit jelutung rawa di baris utara mulai keluar pucuk daun muda segar. Tanah gambut lembab aman dari bara sisa kebakaran bulan lalu.",
    status_condition: "tumbuh subur",
    water_table_depth_cm: -25,
    water_table_status: "aman",
    media: {
      type: "image",
      url: "/journal/pl-kalbar-001/m6.jpg",
      aspect_ratio: "portrait",
    },
    comparative_media: {
      before_url: "/journal/pl-kalbar-001/m1.jpg",
      before_label: "Kondisi Lahan Awal (Bulan 1 — Pasca-Bara Api)",
      after_url: "/journal/pl-kalbar-001/m6.jpg",
      after_label: "Revegetasi Jelutung Rawa (Bulan 6 — Kubah Basah)",
    },
    kader_badge: {
      cert_id: "KMPG-KB/2026/041",
      organization: "Manggala Agni Daops Pontianak & KMPG Rasau Jaya",
      role_title: "Kader Pengendali Ekosistem Gambut",
    },
    field_verifications: [
      {
        id: "vf-kb-01",
        verifier_name: "Hendri Irawan",
        role_label: "Pengawas Lapangan BRGM",
        is_kader_certified: true,
        condition_status: "tumbuh subur",
        water_table_depth_cm: -25,
        water_table_status: "aman",
        notes: "Pemeriksaan sekat kanal nomor 4: tinggi muka air gambut stabil di kedalaman -0.25m. Pucuk daun jelutung tumbuh normal tanpa bercak jamur.",
        created_at: "2026-10-14T05:20:00.000Z",
      },
    ],
    metrics: {
      likes: 142,
      views: 890,
      comments_count: 5,
      user_has_liked: false,
    },
    comments: [
      {
        id: "com-001-1",
        post_id: "post-kb-001",
        author: { username: "Dimas", age: 24, city: "Pontianak" },
        content: "Sehat terus Pak Suwardi dan tim kelompok tani! Minggu depan kami dari mapala mau bantu penyulaman 50 bibit tambahan.",
        created_at: "2026-10-14T04:10:00.000Z",
      },
      {
        id: "com-001-2",
        post_id: "post-kb-001",
        author: { username: "Ibu Nurul", age: 41, city: "Kubu Raya" },
        content: "Alhamdulillah kabut asap di dekat SMP 2 sudah jauh berkurang dibanding hari Senin kemarin.",
        created_at: "2026-10-14T05:00:00.000Z",
      },
    ],
  },
  {
    id: "post-bks-002",
    author: {
      username: "Rian Anggara",
      age: 27,
      city: "Bekasi Timur",
    },
    location_name: "Hutan Kota Patriot Bina Bangsa, Bekasi",
    region_key: "bekasi",
    created_at: "2026-10-13T16:20:00.000Z",
    time_ago: "kemarin sore",
    caption:
      "Pohon trembesi yang ditanam warga RT 04 sudah mencapai tinggi 110 cm. Area bekas pembuangan puing liar sekarang mulai rindang dan tidak gersang lagi. Warga rutin menyiram setiap Minggu pagi.",
    status_condition: "tumbuh subur",
    media: {
      type: "image",
      url: "/journal/pl-bekasi-002/m5.jpg",
      aspect_ratio: "landscape",
    },
    comparative_media: {
      before_url: "/journal/pl-bekasi-002/m1.jpg",
      before_label: "Awal Penanaman (Bulan 1 — Timbunan Puing Kering)",
      after_url: "/journal/pl-bekasi-002/m5.jpg",
      after_label: "Kondisi Terkini (Bulan 5 — Rindang Berkanopi)",
    },
    kader_badge: {
      cert_id: "KTH-BKS/2026/102",
      organization: "Kelompok Tani Hutan Patriot Bekasi",
      role_title: "Kader Penghijauan Perkotaan",
    },
    field_verifications: [
      {
        id: "vf-bks-01",
        verifier_name: "dr. Amanda W.",
        role_label: "Relawan Tim Audit Pohon",
        is_kader_certified: true,
        condition_status: "tumbuh subur",
        notes: "Pengukuran lingkar batang trembesi rata-rata bertambah 2.4 cm. Kanopi daun mulai menyatu memberikan naungan efektif.",
        created_at: "2026-10-13T17:40:00.000Z",
      },
    ],
    metrics: {
      likes: 98,
      views: 640,
      comments_count: 3,
      user_has_liked: false,
    },
    comments: [
      {
        id: "com-002-1",
        post_id: "post-bks-002",
        author: { username: "Pak Joko", age: 58, city: "Bekasi" },
        content: "Keren inisiatif anak-anak mudanya. Nanti Minggu depan bapak sediakan selang dari musholla.",
        created_at: "2026-10-13T17:00:00.000Z",
      },
    ],
  },
  {
    id: "post-kt-003",
    author: {
      username: "Hendra Kahayan",
      age: 34,
      city: "Palangka Raya",
    },
    location_name: "Zona Penyangga TN Sebangau, Pulang Pisau",
    region_key: "kalteng",
    created_at: "2026-10-14T01:15:00.000Z",
    time_ago: "5 jam yang lalu",
    caption:
      "Kondisi parit gambut mulai surut sekitar 15 cm. Daun bibit belangeran di sisi timur agak menguning karena terpapar panas terik. Tim kami butuh pompa apung portabel untuk siram darurat dari sungai kecil.",
    status_condition: "perlu rawat",
    water_table_depth_cm: -38,
    water_table_status: "waspada",
    media: {
      type: "image",
      url: "/journal/pl-kalteng-003/m4.jpg",
      aspect_ratio: "square",
    },
    comparative_media: {
      before_url: "/journal/pl-kalteng-003/m1.jpg",
      before_label: "Kondisi Penanaman Awal (Bulan 1)",
      after_url: "/journal/pl-kalteng-003/m4.jpg",
      after_label: "Kondisi Saat Ini (Bulan 4 — Siaga Kering)",
    },
    kader_badge: {
      cert_id: "FMPR-KT/2026/018",
      organization: "Forum Masyarakat Peduli Rawa Palangka",
      role_title: "Kader Patroli Kebasahan Gambut",
    },
    field_verifications: [
      {
        id: "vf-kt-01",
        verifier_name: "Wahyu Saputra",
        role_label: "Kader Posko Bereng Bengkel",
        is_kader_certified: true,
        condition_status: "perlu rawat",
        water_table_depth_cm: -38,
        water_table_status: "waspada",
        notes: "Verifikasi lapangan: kedalaman air parit mendekati ambang kritis -40 cm. Direkomendasikan penyiraman intensif 2 hari sekali.",
        created_at: "2026-10-14T02:30:00.000Z",
      },
    ],
    metrics: {
      likes: 215,
      views: 1420,
      comments_count: 8,
      user_has_liked: false,
    },
    comments: [
      {
        id: "com-003-1",
        post_id: "post-kt-003",
        author: { username: "Bayu", age: 29, city: "Banjarmasin" },
        content: "Bisa kontak posko relawan gabungan di Bereng Bengkel mas Hendra, ada 2 unit pompa standby.",
        created_at: "2026-10-14T02:00:00.000Z",
      },
      {
        id: "com-003-2",
        post_id: "post-kt-003",
        author: { username: "Dr. Siti Rahma", age: 46, city: "Palangka Raya" },
        content: "Gambut Sebangau memang sangat sensitif jika jeda hujan lewat dari 5 hari. Semangat rekan-rekan penjaga lahan!",
        created_at: "2026-10-14T03:10:00.000Z",
      },
    ],
  },
  {
    id: "post-kb-004",
    author: {
      username: "Sari Melati",
      age: 22,
      city: "Mempawah",
    },
    location_name: "Lahan Gambut Bekas Terbakar Km 18, Kalbar",
    region_key: "kalbar",
    created_at: "2026-10-12T09:00:00.000Z",
    time_ago: "2 hari yang lalu",
    caption:
      "Perbandingan bibit 5 bulan lalu pasca-padam vs sekarang. Tanahnya dulu hitam arang gosong, sekarang rumput pakis alami mulai tumbuh menaungi bibit jelutung.",
    status_condition: "tumbuh subur",
    media: {
      type: "image",
      url: "/journal/pl-kalbar-001/m4.jpg",
      aspect_ratio: "portrait",
    },
    comparative_media: {
      before_url: "/journal/pl-kalbar-001/m1.jpg",
      before_label: "Bulan 1 (Hitam Gosong Bekas Karhutla)",
      after_url: "/journal/pl-kalbar-001/m4.jpg",
      after_label: "Bulan 4 (Vegetasi Alami & Jelutung Rawa)",
    },
    kader_badge: {
      cert_id: "KMPG-MPW/2026/029",
      organization: "KMPG Mempawah Lestari",
      role_title: "Relawan Monitoring Revegetasi",
    },
    metrics: {
      likes: 310,
      views: 2200,
      comments_count: 12,
      user_has_liked: false,
    },
    comments: [
      {
        id: "com-004-1",
        author: { username: "Arif Wicaksono", age: 31, city: "Jakarta Selatan" },
        content: "Senang sekali melihat donasi bibit kami beneran dirawat dan difoto secara berkala seperti ini.",
        created_at: "2026-10-12T10:15:00.000Z",
        post_id: "post-kb-004",
      },
    ],
  },
  {
    id: "post-bks-005",
    author: {
      username: "Ibu Ratna Dewi",
      age: 48,
      city: "Bekasi",
    },
    location_name: "Koridor Hijau Kali Malang, Bekasi",
    region_key: "bekasi",
    created_at: "2026-10-11T14:45:00.000Z",
    time_ago: "3 hari yang lalu",
    caption:
      "Bibit mahoni setinggi 60 cm ini sempat layu terkena debu proyek jalan. Kami beri mulsa jerami basah di pangkal batang, alhamdulillah daun barunya mulai hijau segar kembali.",
    status_condition: "perlu rawat",
    media: {
      type: "image",
      url: "/journal/pl-bekasi-002/m4.jpg",
      aspect_ratio: "square",
    },
    metrics: {
      likes: 76,
      views: 450,
      comments_count: 2,
      user_has_liked: false,
    },
    comments: [],
  },
  {
    id: "post-kt-006",
    author: {
      username: "Yusuf Relawan",
      age: 26,
      city: "Sampit",
    },
    location_name: "Kanal Gambut Mentaya Seberang, Kalteng",
    region_key: "kalteng",
    created_at: "2026-10-10T11:00:00.000Z",
    time_ago: "4 hari yang lalu",
    caption:
      "Patroli sekat kanal mandiri bersama warga desa. Permukaan air masih bertahan di ketinggian minus 25 cm dari muka gambut. Selama kanal tidak kering, risiko api bawah tanah bisa dicegah.",
    status_condition: "lahan basah",
    water_table_depth_cm: -25,
    water_table_status: "aman",
    media: {
      type: "image",
      url: "/journal/pl-kalteng-003/m6.jpg",
      aspect_ratio: "landscape",
    },
    metrics: {
      likes: 188,
      views: 1100,
      comments_count: 6,
      user_has_liked: false,
    },
    comments: [],
  },
  {
    id: "post-riau-007",
    author: {
      username: "Pak Zulkifli",
      age: 49,
      city: "Pelalawan",
    },
    location_name: "Teluk Meranti, Semenanjung Kampar, Riau",
    region_key: "riau",
    created_at: "2026-10-14T06:15:00.000Z",
    time_ago: "4 jam yang lalu",
    caption:
      "Sekat kanal komunal nomor 3 di Parit Belanda terisi penuh air gambut jernih kecokelatan. Penanaman 250 bibit ramin dan jelutung rawa di zona inti pemulihan sudah masuk minggu ke-16. Suhu tanah sejuk, nihil titik bara.",
    status_condition: "tumbuh subur",
    water_table_depth_cm: -18,
    water_table_status: "aman",
    media: {
      type: "image",
      url: "https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=800&auto=format&fit=crop&q=80",
      aspect_ratio: "landscape",
    },
    comparative_media: {
      before_url: "/journal/pl-kalbar-001/m1.jpg",
      before_label: "Bulan 1 (Lahan Kering Bekas Terbakar)",
      after_url: "https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=800&auto=format&fit=crop&q=80",
      after_label: "Bulan 4 (Pembasahan Sekat Kanal Kampar)",
    },
    kader_badge: {
      cert_id: "KTG-RIAU/2026/088",
      organization: "Kelompok Tani Gambut Teluk Meranti & Daops Manggala Agni Dumai",
      role_title: "Kader Konservasi Gambut Semenanjung Kampar",
    },
    field_verifications: [
      {
        id: "vf-riau-01",
        verifier_name: "Tengku Firdaus",
        role_label: "Inspektur Lapangan BRGM Riau",
        is_kader_certified: true,
        condition_status: "tumbuh subur",
        water_table_depth_cm: -18,
        water_table_status: "aman",
        notes: "Pengukuran tinggi muka air parit kanal berada di -0.18 m (kategori basah aman). Bibit ramin menunjukkan tunas daun lateral baru.",
        created_at: "2026-10-14T07:30:00.000Z",
      },
    ],
    metrics: {
      likes: 178,
      views: 1120,
      comments_count: 7,
      user_has_liked: false,
    },
    comments: [
      {
        id: "com-007-1",
        post_id: "post-riau-007",
        author: { username: "Rian Hidayat", age: 31, city: "Pekanbaru" },
        content: "Keren sekali Pak Zul! Kami di Pekanbaru bersyukur asap kiriman dari arah Pelalawan sudah bersih seminggu ini.",
        created_at: "2026-10-14T08:00:00.000Z",
      },
    ],
  },
  {
    id: "post-sumsel-008",
    author: {
      username: "Ibu Nurhayati",
      age: 43,
      city: "Ogan Komering Ilir",
    },
    location_name: "Suaka Gambut Padang Sugihan, OKI, Sumsel",
    region_key: "sumsel",
    created_at: "2026-10-13T20:45:00.000Z",
    time_ago: "kemarin malam",
    caption:
      "Patroli malam bersama regu KMPG Lempuing. Pompa celup apung berhasil menyuplai air dari kanal primer ke petak demplot jelutung seluas 2 hektar. Kelembapan gambut terjaga di atas 78%.",
    status_condition: "lahan basah",
    water_table_depth_cm: -22,
    water_table_status: "aman",
    media: {
      type: "image",
      url: "https://images.unsplash.com/photo-1448375240586-882707db888b?w=800&auto=format&fit=crop&q=80",
      aspect_ratio: "portrait",
    },
    comparative_media: {
      before_url: "/journal/pl-kalteng-003/m1.jpg",
      before_label: "Bulan 1 (Kubah Gambut Gersang Kering)",
      after_url: "https://images.unsplash.com/photo-1448375240586-882707db888b?w=800&auto=format&fit=crop&q=80",
      after_label: "Bulan 5 (Genangan Sekat Kanal Terjaga)",
    },
    kader_badge: {
      cert_id: "KMPG-OKI/2026/012",
      organization: "KMPG Lempuing Jaya & Manggala Agni Daops OKI",
      role_title: "Kader Patroli Kebasahan Gambut",
    },
    field_verifications: [
      {
        id: "vf-sumsel-01",
        verifier_name: "Bripka Syamsul",
        role_label: "Babinkamtibmas & Satgas Karhutla OKI",
        is_kader_certified: true,
        condition_status: "lahan basah",
        water_table_depth_cm: -22,
        water_table_status: "aman",
        notes: "Pengecekan fisik sumur pantau nomor 7: debit air mencukupi, nihil asap sulfat di bawah permukaan gambut.",
        created_at: "2026-10-13T22:00:00.000Z",
      },
    ],
    metrics: {
      likes: 230,
      views: 1650,
      comments_count: 9,
      user_has_liked: false,
    },
    comments: [
      {
        id: "com-008-1",
        post_id: "post-sumsel-008",
        author: { username: "Fajar Palembang", age: 28, city: "Palembang" },
        content: "Terima kasih ibu dan bapak relawan OKI yang tidak kenal lelah menjaga gambut Sumsel tetap basah.",
        created_at: "2026-10-13T23:15:00.000Z",
      },
    ],
  },
  {
    id: "post-kalsel-009",
    author: {
      username: "Pak Hasanuddin",
      age: 51,
      city: "Banjarbaru",
    },
    location_name: "Sekat Kanal Gambut Guntung Manggis, Banjarbaru, Kalsel",
    region_key: "kalsel",
    created_at: "2026-10-14T02:00:00.000Z",
    time_ago: "7 jam yang lalu",
    caption:
      "Kawasan Liang Anggang cuaca cukup terik, namun sekat kanal kantong lumpur di blok B berhasil menahan air resapan. Daun bibit tumih sebagian mengalami layu ringan akibat angin kencang siang hari, sore ini kami lakukan penyiraman tambahan.",
    status_condition: "perlu rawat",
    water_table_depth_cm: -32,
    water_table_status: "waspada",
    media: {
      type: "image",
      url: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=800&auto=format&fit=crop&q=80",
      aspect_ratio: "square",
    },
    comparative_media: {
      before_url: "/journal/pl-kalbar-001/m1.jpg",
      before_label: "Bulan 1 (Tunggul Kayu Terbakar)",
      after_url: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=800&auto=format&fit=crop&q=80",
      after_label: "Bulan 3 (Penyulaman Bibit Tumih)",
    },
    kader_badge: {
      cert_id: "RBHM-KSL/2026/044",
      organization: "Relawan Banjar Hijau Mandiri & BPBD Kalsel",
      role_title: "Kader Re-vegetasi Gambut Kalsel",
    },
    field_verifications: [
      {
        id: "vf-kalsel-01",
        verifier_name: "drh. Lukman Hakim",
        role_label: "Pendamping Restorasi BPBD Banjarbaru",
        is_kader_certified: true,
        condition_status: "perlu rawat",
        water_table_depth_cm: -32,
        water_table_status: "waspada",
        notes: "Tinggi muka air minus 32 cm. Diperlukan penambahan timbunan serasah basah di sekitar perakaran bibit muda.",
        created_at: "2026-10-14T04:15:00.000Z",
      },
    ],
    metrics: {
      likes: 145,
      views: 980,
      comments_count: 4,
      user_has_liked: false,
    },
    comments: [
      {
        id: "com-009-1",
        post_id: "post-kalsel-009",
        author: { username: "Anisa Putri", age: 23, city: "Banjarmasin" },
        content: "Siap bantu bawa serasah jerami dari martapura besok sabtu pak!",
        created_at: "2026-10-14T05:30:00.000Z",
      },
    ],
  },
  {
    id: "post-jambi-010",
    author: {
      username: "Pak Ridwan",
      age: 39,
      city: "Muaro Jambi",
    },
    location_name: "Hutan Gambut Lindung Bram Itam, Muaro Jambi",
    region_key: "jambi",
    created_at: "2026-10-13T11:30:00.000Z",
    time_ago: "kemarin siang",
    caption:
      "Kemitraan konservasi dengan masyarakat desa berjalan kompak. Sebanyak 400 batang bibit jelutung rawa dan pulai darat tumbuh subur di bekas areal karhutla 2023. Kanopi vegetasi perintis mulai menutup permukaan tanah.",
    status_condition: "tumbuh subur",
    water_table_depth_cm: -20,
    water_table_status: "aman",
    media: {
      type: "image",
      url: "https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?w=800&auto=format&fit=crop&q=80",
      aspect_ratio: "landscape",
    },
    comparative_media: {
      before_url: "/journal/pl-bekasi-002/m1.jpg",
      before_label: "Bulan 1 (Areal Kosong Semak Belukar Kering)",
      after_url: "https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?w=800&auto=format&fit=crop&q=80",
      after_label: "Bulan 6 (Pohon Jelutung Tinggi 1.4 Meter)",
    },
    kader_badge: {
      cert_id: "KMPG-JMB/2026/019",
      organization: "KMPG Muaro Jambi Bersatu & KPHP Unit IX Bram Itam",
      role_title: "Kader Perintis Pemulihan Gambut",
    },
    field_verifications: [
      {
        id: "vf-jambi-01",
        verifier_name: "Yogi Pratama, S.Hut",
        role_label: "Penyuluh Kehutanan KPHP Bram Itam",
        is_kader_certified: true,
        condition_status: "tumbuh subur",
        water_table_depth_cm: -20,
        water_table_status: "aman",
        notes: "Kondisi tegakan bibit jelutung dan pulai sangat sehat. Indeks kelangsungan hidup petak mencapai 85.9%.",
        created_at: "2026-10-13T13:00:00.000Z",
      },
    ],
    metrics: {
      likes: 285,
      views: 1890,
      comments_count: 11,
      user_has_liked: false,
    },
    comments: [
      {
        id: "com-010-1",
        post_id: "post-jambi-010",
        author: { username: "Ilham Jambi", age: 26, city: "Kota Jambi" },
        content: "Alhamdulillah Bram Itam lestari. Bukti nyata kolaborasi warga dan kehutanan.",
        created_at: "2026-10-13T14:20:00.000Z",
      },
    ],
  },
  {
    id: "post-kb-011",
    author: {
      username: "Bang Dedi",
      age: 37,
      city: "Ketapang",
    },
    location_name: "Kanal Sekat 9, Hutan Gambut Sungai Putri, Ketapang",
    region_key: "kalbar",
    created_at: "2026-10-14T08:45:00.000Z",
    time_ago: "1 jam yang lalu",
    caption:
      "Laporan kewaspadaan dini: Tinggi muka air kanal sekat 9 surut ke angka minus 48 cm dari permukaan tanah gambut. Lapisan serasah atas mulai mengering dan bersuhu hangat. Dibutuhkan tambahan selang spiral dan bantuan pompa apung untuk pembasahan darurat.",
    status_condition: "rawan kering",
    water_table_depth_cm: -48,
    water_table_status: "kritis bahaya",
    media: {
      type: "image",
      url: "/journal/pl-kalbar-001/m1.jpg",
      aspect_ratio: "portrait",
    },
    comparative_media: {
      before_url: "/journal/pl-kalbar-001/m1.jpg",
      before_label: "Areal Kubah Kering (Muka Air -48 cm)",
      after_url: "/journal/pl-kalbar-001/m4.jpg",
      after_label: "Target Pembasahan Sekat Kanal",
    },
    kader_badge: {
      cert_id: "KMPG-KTP/2026/015",
      organization: "KMPG Sungai Putri & Manggala Agni Daops Ketapang",
      role_title: "Kader Siaga Kebasahan Gambut",
    },
    field_verifications: [
      {
        id: "vf-ktp-01",
        verifier_name: "Yusuf Habibi",
        role_label: "Petugas Lapangan Daops Ketapang",
        is_kader_certified: true,
        condition_status: "rawan kering",
        water_table_depth_cm: -48,
        water_table_status: "kritis bahaya",
        notes: "Verifikasi lapangan: kedalaman air parit berada di bawah ambang batas kritis (-48 cm). Rekomendasi pembasahan sekat darurat segera sebelum bara merambat ke kubah dalam.",
        created_at: "2026-10-14T09:15:00.000Z",
      },
    ],
    metrics: {
      likes: 320,
      views: 2450,
      comments_count: 14,
      user_has_liked: false,
    },
    comments: [
      {
        id: "com-011-1",
        post_id: "post-kb-011",
        author: { username: "Agus Pontianak", age: 33, city: "Pontianak" },
        content: "Posko gabungan Daops Ketapang sudah menginfokan ada 2 unit pompa portabel siap digeser ke Sungai Putri sore ini.",
        created_at: "2026-10-14T09:30:00.000Z",
      },
    ],
  },
];

export function getForumPostById(id: string): ForumPost | undefined {
  return initialForumPosts.find((p) => p.id === id);
}

export function getAllForumPostIds(): string[] {
  return initialForumPosts.map((p) => p.id);
}
// --- end of Sample posts ---
