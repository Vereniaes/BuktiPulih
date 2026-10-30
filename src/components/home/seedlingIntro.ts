// Todo:
// -> Run the once-only seedling intro inside its own hero.
// -> Keep words, media and action entrances smooth and interruptible.

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
  const managed = [...words, media, tone, video, kicker, cue, ...actions];
  const animations: ReturnType<typeof animate>[] = [];
  const preference = matchMedia("(prefers-reduced-motion: reduce)");
  let finished = false, merging = false, disposed = false, watchdog = 0;
  const track = (animation: ReturnType<typeof animate>) => { animations.push(animation); return animation; };
  const clearStyles = () => managed.forEach(element => ["transform", "opacity", "color"].forEach(property => element.style.removeProperty(property)));

  function finish() {
    if (finished || disposed) return;
    finished = true;
    clearTimeout(watchdog);
    animations.splice(0).forEach(animation => animation.stop());
    root.dataset.opening = "false";
    root.dataset.phase = "settled";
    [...actions, cue].forEach(element => { element.inert = false; });
    clearStyles();
    frame.postRender(clearStyles);
    video.pause();
    video.removeAttribute("src");
    video.load();
  }

  function measure() {
    const header = document.querySelector("header.portal-header");
    root.style.setProperty("--header-height", (header?.getBoundingClientRect().height ?? 73) + "px");
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
  const header = document.querySelector("header.portal-header");
  const size = new ResizeObserver(measure);
  if (header) size.observe(header);
  window.addEventListener("resize", measure);
  preference.addEventListener("change", reduced);
  video.addEventListener("playing", playing, { once: true });
  video.addEventListener("ended", ended, { once: true });
  video.addEventListener("error", failed, { once: true });
  const visibility = new IntersectionObserver(([entry]) => { if (!entry.isIntersecting) finish(); });
  visibility.observe(root);

  let seen = seenInPage;
  try { seen ||= localStorage.getItem(SEEN_KEY) === "yes"; } catch {}
  if (seen || preference.matches || root.dataset.opening === "false") finish();
  else {
    root.dataset.phase = "loading";
    [...actions, cue].forEach(element => { element.inert = true; });
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
    size.disconnect();
    visibility.disconnect();
    window.removeEventListener("resize", measure);
    preference.removeEventListener("change", reduced);
    video.removeEventListener("playing", playing);
    video.removeEventListener("ended", ended);
    video.removeEventListener("error", failed);
    animations.splice(0).forEach(animation => animation.stop());
    clearStyles();
    frame.postRender(clearStyles);
    video.pause();
    video.removeAttribute("src");
    video.load();
  };
}
// --- end of Seedling motion ---
