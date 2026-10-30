// file ini buat orkestrasi animasi pembuka tunas hero beranda
// - memutar video tunas berdurasi tiga detik sekali saja per peramban
// - menyembunyikan bilah navigasi selama intro lalu memudar masuk secara mulus
// - menggabungkan kata judul misi ke posisi akhir dengan kurva pegas tanpa pantulan

// --- Seedling motion ---
import { animate, frame, spring } from "motion";

const SEEN_KEY = "buktipulih-home-seedling-v1-seen";
let seenInPage = false;

function headlinePath(x: number, y: number, index: number) {
  const leading = spring({ keyframes: [0, 1], duration: 550, bounce: 0 });
  const settling = spring({ keyframes: [0, 1], duration: 1150, bounce: 0 });
  return Array.from({ length: 97 }, (_, step) => {
    const time = step * 1850 / 96;
    const across = index < 2 ? leading.next(time).value : settling.next(Math.max(0, time - 650)).value;
    const down = index < 2 ? leading.next(Math.max(0, time - 400)).value : leading.next(time).value;
    return "translate3d(" + (step === 96 ? 0 : x * (1 - across)) + "px," + (step === 96 ? 0 : y * (1 - down)) + "px,0)";
  });
}

/** Input: mounted hero. Output: cleanup for media, observers and scoped animations. */
export function attachSeedlingIntro(root: HTMLElement): () => void {
  const find = <T extends HTMLElement>(selector: string) => root.querySelector<T>(selector)!;
  const video = find<HTMLVideoElement>("[data-video]");
  const still = find<HTMLImageElement>("[data-still]");
  const media = find("[data-scene]"), tone = find("[data-tone]");
  const kicker = find("[data-kicker]"), cue = find("[data-cue]");
  const words = [...root.querySelectorAll<HTMLElement>("[data-word]")];
  const actions = [...root.querySelectorAll<HTMLElement>("[data-intro-action]")];
  const header = document.querySelector<HTMLElement>("header.portal-header");
  const managed = [...words, media, tone, video, kicker, cue, ...actions];
  if (header) managed.push(header);
  const animations: ReturnType<typeof animate>[] = [];
  const preference = matchMedia("(prefers-reduced-motion: reduce)");
  let finished = false, merging = false, disposed = false, watchdog = 0;
  const track = (animation: ReturnType<typeof animate>) => { animations.push(animation); return animation; };
  const clearStyles = () => {
    managed.forEach(element => ["transform", "opacity", "color", "pointer-events"].forEach(property => element.style.removeProperty(property)));
    document.body.style.removeProperty("overflow");
  };

  function finish() {
    if (finished || disposed) return;
    finished = true;
    clearTimeout(watchdog);
    animations.splice(0).forEach(animation => animation.stop());
    root.dataset.opening = "false";
    root.dataset.phase = "settled";
    document.documentElement.dataset.heroOpening = "done";
    [...actions, cue].forEach(element => { element.inert = false; });
    if (header) {
      header.inert = false;
      header.style.removeProperty("pointer-events");
      header.style.removeProperty("opacity");
    }
    clearStyles();
    frame.postRender(clearStyles);
    video.pause();
    video.removeAttribute("src");
    video.load();
  }

  function measure() {
    root.style.setProperty("--scene-width", document.body.clientWidth + "px");
    if (merging) finish();
  }

  async function merge() {
    if (finished || merging || disposed) return;
    merging = true;
    clearTimeout(watchdog);
    video.pause();
    if (preference.matches) { finish(); return; }
    const before = words.map(word => ({ rect: word.getBoundingClientRect(), color: getComputedStyle(word).color }));
    const from = getComputedStyle(media).transform, toneFrom = getComputedStyle(tone).opacity;
    root.dataset.opening = "false";
    root.dataset.phase = "merging";
    document.documentElement.dataset.heroOpening = "merging";
    words.forEach((word, index) => {
      const after = word.getBoundingClientRect(), previous = before[index];
      const x = previous.rect.x - after.x, y = previous.rect.y - after.y;
      const transforms = innerWidth <= 600 ? ["translate3d(" + x + "px," + y + "px,0)", "translate3d(0px,0px,0)"] : headlinePath(x, y, index);
      track(animate(word, { transform: transforms, color: [previous.color, getComputedStyle(word).color] }, {
        duration: innerWidth <= 600 ? 1.6 : 1.85, ease: "linear", ...(innerWidth <= 600 ? { type: "spring", bounce: 0 } : {}),
        color: { duration: .85, ease: [.22, 1, .36, 1] },
      }));
    });
    track(animate(media, { transform: [from, getComputedStyle(media).transform] }, { type: "spring", bounce: 0, duration: 1.6, delay: .25 }));
    track(animate(tone, { opacity: [Number(toneFrom), 1] }, { duration: .45, ease: [.22, 1, .36, 1] }));
    track(animate(video, { opacity: [1, 0] }, { duration: .45, ease: [.4, 0, .2, 1] }));
    const currentHeader = header ?? document.querySelector<HTMLElement>("header.portal-header");
    if (currentHeader) {
      currentHeader.style.removeProperty("opacity");
      const headerEntry = track(animate(currentHeader, { opacity: [0, 1] }, { duration: .75, delay: .65, ease: [.4, 0, .2, 1] }));
      headerEntry.finished.then(() => {
        if (!disposed && currentHeader) {
          currentHeader.inert = false;
          currentHeader.style.opacity = "1";
          currentHeader.style.removeProperty("pointer-events");
        }
      });
    }
    track(animate(kicker, { opacity: [0, 1] }, { duration: .7, delay: .8, ease: [.4, 0, .2, 1] }));
    actions.forEach((action, index) => {
      const entry = track(animate(action, { opacity: [0, 1], transform: ["translate3d(0,14px,0)", "translate3d(0,0,0)"] }, { type: "spring", bounce: 0, duration: .7, delay: 1.25 + index * 1.15 }));
      entry.finished.then(() => { if (!disposed) action.inert = false; });
    });
    track(animate(cue, { opacity: [0, 1] }, { duration: .7, delay: 2.4, ease: [.4, 0, .2, 1] })).finished.then(() => { if (!disposed) cue.inert = false; });
    await Promise.allSettled(animations.map(animation => animation.finished));
    finish();
  }

  function playing() {
    if (disposed || finished) return;
    root.dataset.phase = "playing";
    document.documentElement.dataset.heroOpening = "pending";
    seenInPage = true;
    try { localStorage.setItem(SEEN_KEY, "yes"); } catch {}
    words.forEach((word, index) => track(animate(word, { opacity: [0, 1], transform: [innerWidth <= 600 ? "translateY(12px)" : "translateX(" + (index < 2 ? -18 : 18) + "px)", "translate(0px,0px)"] }, { type: "spring", bounce: 0, duration: .55 })));
    clearTimeout(watchdog);
    watchdog = window.setTimeout(finish, 6000);
  }
  const ended = () => { void merge(); };
  const failed = () => finish();
  const reduced = () => { if (preference.matches) finish(); };
  measure();
  window.addEventListener("resize", measure);
  preference.addEventListener("change", reduced);
  video.addEventListener("playing", playing, { once: true });
  video.addEventListener("ended", ended, { once: true });
  video.addEventListener("error", failed, { once: true });

  let seen = seenInPage;
  try { seen ||= localStorage.getItem(SEEN_KEY) === "yes"; } catch {}
  if (seen || preference.matches || root.dataset.opening === "false") {
    document.documentElement.dataset.heroOpening = "done";
    finish();
  } else {
    document.documentElement.dataset.heroOpening = "pending";
    root.dataset.phase = "loading";
    [...actions, cue].forEach(element => { element.inert = true; });
    if (header) {
      header.inert = true;
      header.style.opacity = "0";
      header.style.pointerEvents = "none";
    }
    document.body.style.overflow = "hidden";
    video.preload = "auto";
    video.src = "/home/seedling-intro.mp4";
    video.muted = true;
    watchdog = window.setTimeout(finish, 8000);
    void Promise.all([document.fonts.ready, still.decode()]).then(async () => {
      if (!disposed && !finished) await video.play();
    }).catch(failed);
  }

  return () => {
    disposed = true;
    clearTimeout(watchdog);
    window.removeEventListener("resize", measure);
    preference.removeEventListener("change", reduced);
    video.removeEventListener("playing", playing);
    video.removeEventListener("ended", ended);
    video.removeEventListener("error", failed);
    animations.splice(0).forEach(animation => animation.stop());
    delete document.documentElement.dataset.heroOpening;
    if (header) {
      header.inert = false;
      header.style.removeProperty("pointer-events");
      header.style.removeProperty("opacity");
    }
    clearStyles();
    frame.postRender(clearStyles);
    video.pause();
    video.removeAttribute("src");
    video.load();
  };
}
// --- end of Seedling motion ---
