// Show a profile photo, with initials when the image is missing or unavailable.
"use client";
import { useState } from "react";
import Image from "next/image";
import styles from "./avatar.module.css";
export function ProfileAvatar({ username, src, className = "" }: { username?: string | null; src?: string | null; className?: string }) {
  const [failed, setFailed] = useState(false);
  return <span className={`${styles.avatar} ${className}`} aria-hidden="true">
    <span>{Array.from(username ?? "").slice(0, 2).join("").toUpperCase() || "BP"}</span>
    {src && !failed && <Image src={src} alt="" width={512} height={512} unoptimized decoding="async" onError={() => setFailed(true)} />}
  </span>;
}
