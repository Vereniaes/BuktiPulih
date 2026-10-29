// Todo:
// -> Show the forest image, mission, and primary actions.

// --- Homepage intro ---
"use client";
import { useRef } from "react";
import { useReducedMotion, useScroll, useSpring, useTransform, type Variants } from "motion/react";
import * as m from "motion/react-m";
import { HomeActionButton } from "./HomeActionButton";

const entrance: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1] } },
};

interface Props {
  onOpenRecovery: () => void;
  onOpenForum: () => void;
  onOpenReport?: () => void;
  language?: "id" | "en";
}

export function HomeIdentityHero({ onOpenRecovery, onOpenForum, onOpenReport, language = "id" }: Props) {
  const isEn = language === "en";
  const heroRef = useRef<HTMLElement>(null);
  const reducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const progress = useSpring(scrollYProgress, { stiffness: 80, damping: 30 });
  const photoY = useTransform(progress, [0, 1], ["-4%", "4%"]);

  return (
    <section ref={heroRef} className="home-identity-hero" aria-label="Identitas BuktiPulih">
      <div className="home-hero-card">
        <m.div
          className="home-hero-content"
          initial="hidden"
          animate="visible"
          transition={{ staggerChildren: reducedMotion ? 0 : 0.12 }}
        >
          <m.p className="home-hero-kicker" variants={entrance}>
            {isEn ? "TRACE THE TRACKS, SAFEGUARD RESTORATION" : "KARHUTLA DAN PEMULIHAN, DIPANTAU BERSAMA"}
          </m.p>

          <m.h1 className="home-hero-title" variants={entrance}>
            {isEn ? (
              <>
                Seeing <span className="hero-highlight-green">forests recover</span>,<br />
                through data and <br />
                <span className="hero-highlight-orange">human voices</span>.
              </>
            ) : (
              <>
                Melihat <span className="hero-highlight-green">hutan pulih</span>,<br />
                lewat data dan <br />
                <span className="hero-highlight-orange">suara manusia</span>.
              </>
            )}
          </m.h1>

          <m.div className="home-hero-actions" variants={entrance}>
            <HomeActionButton language={language} type="button" className="home-hero-btn-primary" onClick={onOpenRecovery}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
              </svg>
              <span>{isEn ? "View restoration map" : "Lihat peta pemulihan"}</span>
            </HomeActionButton>

            <HomeActionButton language={language} type="button" className="home-hero-btn-secondary" onClick={onOpenReport || onOpenForum}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
              <span>{isEn ? "Submit field evidence" : "Kirim bukti dari lapangan"}</span>
            </HomeActionButton>
          </m.div>
        </m.div>
      </div>
      <div className="home-hero-visual" aria-hidden="true">
        <m.img
          initial={{ scale: 1.16 }}
          animate={{ scale: reducedMotion ? 1 : 1.12 }}
          transition={{ duration: reducedMotion ? 0 : 1.2, ease: [0.22, 1, 0.36, 1] }}
          style={{ y: photoY }}
          src="/hero-peat-seedling.jpg"
          width={1376}
          height={768}
          alt=""
          className="home-hero-photo"
          loading="eager"
          fetchPriority="high"
        />
      </div>
    </section>
  );
}
// --- end of Homepage intro ---
