// Private account content is read by the authenticated client session.
import type { Metadata } from "next";
import { ProfileClient } from "@/components/account/ProfileClient";
export const metadata: Metadata = { title: "Profil", robots: { index: false, follow: false } };
export default function ProfilePage() {
  return <ProfileClient />;
}
