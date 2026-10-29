// Todo:
// -> Define plot, timeline, post, and environmental data shapes.

// --- Shared types ---
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
  weather_summary?: {
    temperature_c: number;
    relative_humidity: number;
    condition_label: string;
    zone_centroid: string;
  };
}

export interface BnpbSyncData {
  source: string;
  layer: string;
  sync_timestamp: string;
  provinces: BnpbProvinceItem[];
}

export interface UserProfileLight {
  user_id?: string;
  avatar_url?: string | null;
  participation?: "affected" | "volunteer" | "observer" | null;
  username: string;
  age: number;
  city: string;
}

export interface ForumComment {
  id: string;
  post_id: string;
  author: UserProfileLight;
  content: string;
  created_at: string;
}

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

export interface ComparativeMedia {
  before_url: string;
  before_label: string;
  after_url: string;
  after_label: string;
}

export interface ForumPost {
  persisted?: boolean;
  location?: { type: "Point"; coordinates: [number, number] };
  ecosystem_type?: EcosystemType;
  condition?: TreeStatus;
  verification_status?: "unverified";
  is_anonymous?: boolean;
  id: string;
  author: UserProfileLight;
  location_name: string;
  province?: string;
  city?: string;
  place_detail?: string;
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

export type WindDirection = "N" | "NE" | "E" | "SE" | "S" | "SW" | "W" | "NW";
export type MapViewMode = "both" | "satellite" | "haze_wind";
export type SatelliteTimeWindowHours = 6 | 12 | 24;
export type TimeWindowMinutes = 15 | 60 | 180 | 1440; // kompatibilitas backwards

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

export interface RecoveryReport extends ForumPost {
  location: { type: "Point"; coordinates: [number, number] };
  ecosystem_type: EcosystemType;
  condition: TreeStatus;
  verification_status: "unverified";
}
export type EvidenceSubmission = Pick<RecoveryReport, "location_name" | "region_key" | "caption" | "media" | "location" | "ecosystem_type" | "condition" | "province" | "city" | "place_detail"> & { submission_id: string; is_anonymous: boolean };
// --- end of Shared types ---
