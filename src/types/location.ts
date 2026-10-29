// Place results and the editable location attached to one evidence report.
export interface LocationMatch {
  id: string; name: string; label: string; province: string; city: string; coordinates: [number, number];
}
export interface EvidenceLocation {
  point: [number, number] | null; province: string; city: string; place_detail: string;
}

export interface LocationSuggestion {
  id: string; name: string; label: string;
  resolve: (signal: AbortSignal) => Promise<LocationMatch>;
}
