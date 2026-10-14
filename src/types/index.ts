// src/types/index.ts
// -> definisi tipe data global aplikasi buktipulih
//      -> tipe data spasial petak restorasi (plots)
//      -> tipe data linimasa memo catatan relawan
//      -> tipe data metrik impact ledger
//      -> tipe data sinkronisasi karhutla bnpb

// model data spasial petak --------------------------------------------------------
export type EcosystemType = "gambut" | "hutan_kota" | "mineral";
export type TreeStatus = "subur" | "perlu_rawat" | "kritis" | "mati";

export interface PlotProperties {
  plot_code: string;
  name: string;
  region: string;
  ecosystem_type: EcosystemType;
  community_name: string;
  coordinator_name: string;
  total_planted: number;
  current_alive: number;
  survival_rate: number;
  latest_status: TreeStatus;
  last_monitored_at: string;
  cover_image_url: string;
}

export interface PlotFeature {
  type: "Feature";
  id: string;
  geometry: {
    type: "Point";
    coordinates: [number, number]; // [lng, lat]
  };
  properties: PlotProperties;
}

export interface PlotFeatureCollection {
  type: "FeatureCollection";
  features: PlotFeature[];
}
// end of model spasial petak ------------------------------------------------------

// model data metrik impact ledger -------------------------------------------------
export interface ImpactLedgerData {
  total_planted_trees: number;
  total_alive_trees: number;
  overall_survival_rate: number;
  restored_area_hectares: number;
  active_plots_count: number;
  active_communities_count: number;
  total_field_reports: number;
  last_updated_at: string;
}
// end of model metrik impact ledger -----------------------------------------------

// model data linimasa relawan -----------------------------------------------------
export interface TimelineItem {
  id: string;
  plot_id: string;
  plot_code: string;
  plot_name: string;
  reporter: {
    user_id: string;
    full_name: string;
    role_label: string;
    is_verified: boolean;
  };
  monitoring_date: string;
  postmark_badge: string;
  tree_metrics: {
    height_cm: number;
    condition_status: TreeStatus;
    condition_label: string;
    estimated_survival_rate: number;
  };
  field_notes: string;
  images: {
    initial_photo_url: string;
    initial_label: string;
    current_photo_url: string;
    current_label: string;
  };
  community_verifications: {
    confirmed_subur_count: number;
    dispute_count: number;
    user_has_verified?: boolean;
  };
  comment_count: number;
}
// end of model linimasa relawan ---------------------------------------------------

// model data bnpb karhutla --------------------------------------------------------
export interface BnpbProvinceItem {
  provinsi: string;
  tgl_update: string;
  today_luas_terbakar_ha: number;
  total_hotspot: number;
  relawan_lapangan: number;
  kualitas_udara_pm25: string;
  buktipulih_coverage: {
    active_plots: number;
    restored_area_ha: number;
    alive_trees: number;
  };
}

export interface BnpbSyncData {
  source: string;
  layer: string;
  sync_timestamp: string;
  provinces: BnpbProvinceItem[];
}
// end of model bnpb karhutla ------------------------------------------------------

// model profil warga ringan untuk komentar & posting ------------------------------
export interface UserProfileLight {
  username: string;
  age: number;
  city: string;
}

// model komentar forum partisipasi ------------------------------------------------
export interface ForumComment {
  id: string;
  post_id: string;
  author: UserProfileLight;
  content: string;
  created_at: string;
}

// model verifikasi lapangan oleh kader bersertifikat ------------------------------
export interface FieldVerification {
  id: string;
  verifier_name: string;
  role_label: string;
  is_kader_certified: boolean;
  condition_status: "tumbuh subur" | "perlu rawat" | "lahan basah" | "rawan kering";
  water_table_depth_cm?: number; // kedalaman muka air tanah gambut (misal: -25, -48)
  water_table_status?: "aman" | "waspada" | "kritis bahaya";
  photo_url?: string;
  notes: string;
  created_at: string;
}

// model media komparasi sebelum dan sesudah restorasi ------------------------------
export interface ComparativeMedia {
  before_url: string;
  before_label: string;
  after_url: string;
  after_label: string;
}

// model postingan forum partisipasi tumblr-style ----------------------------------
export interface ForumPost {
  id: string;
  author: UserProfileLight;
  location_name: string;
  region_key: "kalbar" | "kalteng" | "bekasi" | "riau" | "sumsel" | "kalsel" | "jambi" | "lainnya";
  created_at: string;
  time_ago: string;
  caption: string;
  status_condition?: string;
  water_table_depth_cm?: number; // indikator tinggi muka air tanah gambut (tmat) terukur
  water_table_status?: "aman" | "waspada" | "kritis bahaya";
  media: {
    type: "image" | "video";
    url: string;
    aspect_ratio: "square" | "portrait" | "landscape";
    thumbnail_url?: string;
  };
  comparative_media?: ComparativeMedia;
  kader_badge?: {
    cert_id: string;
    organization: string;
    role_title: string;
  };
  field_verifications?: FieldVerification[];
  metrics: {
    likes: number;
    views: number;
    comments_count: number;
    user_has_liked?: boolean;
  };
  comments: ForumComment[];
}

// model titik api & sebaran kabut asap bnpb ----------------------------------------
export interface HotspotPoint {
  id: string;
  provinsi: string;
  kabupaten: string;
  coordinates: [number, number]; // [lat, lng]
  confidence: "tinggi" | "sedang" | "rendah";
  smoke_radius_km: number;
  pm25_index: number;
  status_kebakaran: "aktif membara" | "berasap tebal" | "tahap pendinginan";
  satellite_sensor?: "MODIS Terra/Aqua" | "VIIRS SNPP" | "NOAA-20";
  confidence_pct?: number; // 50% - 99%
  brightness_temp_k?: number; // 310K - 365K
  frp_mw?: number; // Fire Radiative Power (MW)
  ground_status?: "Verifikasi Manggala Agni" | "Pemantauan Sensor Satelit" | "Kubah Gambut Kering";
  last_overpass?: string;
}

// model observasi satelit termal & sebaran asap riil -------------------------------
export type WindDirection = "N" | "NE" | "E" | "SE" | "S" | "SW" | "W" | "NW";
export type MapViewMode = "both" | "satellite" | "haze_wind";
export type SatelliteTimeWindowHours = 6 | 12 | 24;
export type TimeWindowMinutes = 15 | 60 | 180 | 1440; // kompatibilitas backwards

// model data cuaca aktual (live weather bmkg / open-meteo) -----------------------
export interface LiveWeatherData {
  wind_speed_kmh: number;
  wind_direction_deg: number;
  wind_direction_cardinal: WindDirection;
  wind_direction_label_id: string;
  relative_humidity: number;
  temperature_c?: number;
  source_label: string;
  fetched_at: string;
  is_live: boolean;
}



