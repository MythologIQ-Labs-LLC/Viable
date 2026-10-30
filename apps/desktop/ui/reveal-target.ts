// Brings an opened destination into view so the person can see where they
// landed. Whole sections are entered at their heading (screen readers announce
// the heading, not the entire form). A target taller than most of the viewport
// is aligned to the top, because centring it hides its heading off-screen.
export function revealTarget(target: HTMLElement): HTMLElement {
  const heading = target.matches("section.panel, section") ? target.querySelector<HTMLElement>("h2, h3") : null;
  const focusable = heading ?? target;
  focusable.tabIndex = -1;
  focusable.focus({ preventScroll: true });
  const tall = target.getBoundingClientRect().height > window.innerHeight * 0.6;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  target.scrollIntoView({ block: tall ? "start" : "center", behavior: reduceMotion ? "auto" : "smooth" });
  return focusable;
}
