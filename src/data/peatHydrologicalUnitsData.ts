// Todo:
// -> Provide fixed peat-area examples; boundary provenance is not recorded here.

// --- Sample peat areas ---
export interface PeatHydrologicalUnitProperties {
  khg_id: string;
  nama_khg: string;
  sk_menlhk: string;
  provinsi: string;
  kabupaten: string;
  fungsi_ekosistem: "Fungsi Lindung (Kubah Gambut >3m)" | "Fungsi Budidaya Gambut (<3m)";
  kedalaman_rata_m: number;
  luas_ha: number;
  ambang_muka_air_cm: number;
  status_kerentanan: "Kritis Terbakar" | "Siaga Bara Bawah Tanah" | "Waspada Kering";
}

export interface PeatHydrologicalUnitGeoJson {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    id: string;
    properties: PeatHydrologicalUnitProperties;
    geometry: {
      type: "Polygon";
      coordinates: number[][][]; // [lng, lat]
    };
  }>;
}

export const peatHydrologicalUnitsData: PeatHydrologicalUnitGeoJson = {
  type: "FeatureCollection",
  features: [
    // 1. Kalbar - Kubu Raya (KHG Sungai Ambawang - Sungai Kubu)
    {
      type: "Feature",
      id: "khg-kb-01",
      properties: {
        khg_id: "KHG-61.12.01",
        nama_khg: "KHG Sungai Ambawang - Sungai Kubu",
        sk_menlhk: "SK.130/MENLHK/SETJEN/PKL.0/2/2017",
        provinsi: "Kalimantan Barat",
        kabupaten: "Kubu Raya",
        fungsi_ekosistem: "Fungsi Lindung (Kubah Gambut >3m)",
        kedalaman_rata_m: 4.2,
        luas_ha: 84500,
        ambang_muka_air_cm: -40,
        status_kerentanan: "Siaga Bara Bawah Tanah",
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [109.15, -0.15],
            [109.75, -0.15],
            [109.80, -0.55],
            [109.20, -0.58],
            [109.15, -0.15],
          ],
        ],
      },
    },
    // 2. Kalbar - Ketapang (KHG Sungai Putri - Sungai Tolak)
    {
      type: "Feature",
      id: "khg-kb-02",
      properties: {
        khg_id: "KHG-61.04.03",
        nama_khg: "KHG Sungai Putri - Sungai Tolak",
        sk_menlhk: "SK.130/MENLHK/SETJEN/PKL.0/2/2017",
        provinsi: "Kalimantan Barat",
        kabupaten: "Ketapang",
        fungsi_ekosistem: "Fungsi Lindung (Kubah Gambut >3m)",
        kedalaman_rata_m: 5.8,
        luas_ha: 57000,
        ambang_muka_air_cm: -40,
        status_kerentanan: "Kritis Terbakar",
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [110.05, -1.60],
            [110.55, -1.60],
            [110.58, -2.10],
            [110.02, -2.05],
            [110.05, -1.60],
          ],
        ],
      },
    },
    // 3. Kalteng - Pulang Pisau (KHG Sungai Kahayan - Sungai Sebangau)
    {
      type: "Feature",
      id: "khg-kt-01",
      properties: {
        khg_id: "KHG-62.11.02",
        nama_khg: "KHG Sungai Kahayan - Sungai Sebangau",
        sk_menlhk: "SK.130/MENLHK/SETJEN/PKL.0/2/2017",
        provinsi: "Kalimantan Tengah",
        kabupaten: "Pulang Pisau",
        fungsi_ekosistem: "Fungsi Lindung (Kubah Gambut >3m)",
        kedalaman_rata_m: 4.9,
        luas_ha: 142000,
        ambang_muka_air_cm: -40,
        status_kerentanan: "Kritis Terbakar",
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [113.85, -2.35],
            [114.45, -2.35],
            [114.48, -3.05],
            [113.80, -3.00],
            [113.85, -2.35],
          ],
        ],
      },
    },
    // 4. Kalteng - Kotim (KHG Sungai Mentaya - Sungai Katingan)
    {
      type: "Feature",
      id: "khg-kt-02",
      properties: {
        khg_id: "KHG-62.02.01",
        nama_khg: "KHG Sungai Mentaya - Sungai Katingan",
        sk_menlhk: "SK.130/MENLHK/SETJEN/PKL.0/2/2017",
        provinsi: "Kalimantan Tengah",
        kabupaten: "Kotawaringin Timur",
        fungsi_ekosistem: "Fungsi Budidaya Gambut (<3m)",
        kedalaman_rata_m: 2.8,
        luas_ha: 96000,
        ambang_muka_air_cm: -40,
        status_kerentanan: "Waspada Kering",
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [112.65, -1.95],
            [113.25, -1.95],
            [113.20, -2.55],
            [112.60, -2.50],
            [112.65, -1.95],
          ],
        ],
      },
    },
    // 5. Riau - Pelalawan (KHG Sungai Kampar - Sungai Gaung)
    {
      type: "Feature",
      id: "khg-ri-01",
      properties: {
        khg_id: "KHG-14.05.04",
        nama_khg: "KHG Sungai Kampar - Sungai Gaung",
        sk_menlhk: "SK.130/MENLHK/SETJEN/PKL.0/2/2017",
        provinsi: "Riau",
        kabupaten: "Pelalawan",
        fungsi_ekosistem: "Fungsi Lindung (Kubah Gambut >3m)",
        kedalaman_rata_m: 6.5,
        luas_ha: 178000,
        ambang_muka_air_cm: -40,
        status_kerentanan: "Siaga Bara Bawah Tanah",
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [101.85, 0.55],
            [102.55, 0.55],
            [102.60, -0.15],
            [101.80, -0.10],
            [101.85, 0.55],
          ],
        ],
      },
    },
    // 6. Sumsel - OKI (KHG Sungai Saleh - Sungai Sugihan)
    {
      type: "Feature",
      id: "khg-ss-01",
      properties: {
        khg_id: "KHG-16.02.02",
        nama_khg: "KHG Sungai Saleh - Sungai Sugihan",
        sk_menlhk: "SK.130/MENLHK/SETJEN/PKL.0/2/2017",
        provinsi: "Sumatera Selatan",
        kabupaten: "Ogan Komering Ilir",
        fungsi_ekosistem: "Fungsi Lindung (Kubah Gambut >3m)",
        kedalaman_rata_m: 4.5,
        luas_ha: 125000,
        ambang_muka_air_cm: -40,
        status_kerentanan: "Kritis Terbakar",
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [104.65, -3.05],
            [105.35, -3.05],
            [105.40, -3.80],
            [104.60, -3.75],
            [104.65, -3.05],
          ],
        ],
      },
    },
    // 7. Jambi - Muaro Jambi (KHG Sungai Mendahara - Sungai Batanghari)
    {
      type: "Feature",
      id: "khg-jb-01",
      properties: {
        khg_id: "KHG-15.05.01",
        nama_khg: "KHG Sungai Mendahara - Sungai Batanghari",
        sk_menlhk: "SK.130/MENLHK/SETJEN/PKL.0/2/2017",
        provinsi: "Jambi",
        kabupaten: "Muaro Jambi",
        fungsi_ekosistem: "Fungsi Budidaya Gambut (<3m)",
        kedalaman_rata_m: 2.6,
        luas_ha: 68000,
        ambang_muka_air_cm: -40,
        status_kerentanan: "Waspada Kering",
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [103.45, -1.30],
            [104.10, -1.30],
            [104.15, -1.85],
            [103.40, -1.80],
            [103.45, -1.30],
          ],
        ],
      },
    },
  ],
};
// --- end of Sample peat areas ---
