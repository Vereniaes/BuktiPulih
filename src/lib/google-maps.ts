// Load the Google browser SDK once, only when the location picker needs it.
import { setOptions } from "@googlemaps/js-api-loader";
export const GOOGLE_MAPS_AUTH_ERROR = "buktipulih-google-maps-auth-error";
let configured = false;
export function googleLibrary<K extends keyof google.maps.ImportLibraryMap>(name: K) {
  if (!configured) {
    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!key) return Promise.reject(new Error("GOOGLE_MAPS_NOT_CONFIGURED"));
    if (!window.google?.maps?.importLibrary) setOptions({ key, v: "weekly", language: "id", region: "ID", authReferrerPolicy: "origin" });
    (window as Window & { gm_authFailure?: () => void }).gm_authFailure = () => window.dispatchEvent(new Event(GOOGLE_MAPS_AUTH_ERROR));
    configured = true;
  }
  return google.maps.importLibrary(name);
}
