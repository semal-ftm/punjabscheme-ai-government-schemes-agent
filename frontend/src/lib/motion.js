import { useEffect, useRef, useState } from "react";

const reducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** Animates 0 -> target once the element scrolls into view. Returns [ref, value]. */
export function useCountUp(target, duration = 1400) {
  const ref = useRef(null);
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (typeof target !== "number" || !Number.isFinite(target)) return undefined;
    if (reducedMotion()) {
      setValue(target);
      return undefined;
    }
    let frame;
    let started = false;
    const run = () => {
      started = true;
      const t0 = performance.now();
      const tick = (now) => {
        const p = Math.min(1, (now - t0) / duration);
        setValue(Math.round(target * (1 - Math.pow(1 - p, 3)))); // ease-out cubic
        if (p < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    };
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      run();
      return () => cancelAnimationFrame(frame);
    }
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started) {
        run();
        io.disconnect();
      }
    });
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [target, duration]);
  return [ref, value];
}

/** Types each phrase, pauses, deletes it and moves to the next. Paused while `active` is false. */
export function useTypewriter(phrases, { active = true, typeMs = 45, deleteMs = 22, holdMs = 1800 } = {}) {
  const [text, setText] = useState(reducedMotion() ? phrases[0] : "");
  const state = useRef({ i: 0, len: 0, deleting: false });
  useEffect(() => {
    if (!active || reducedMotion() || !phrases.length) return undefined;
    let timer;
    const step = () => {
      const s = state.current;
      const phrase = phrases[s.i % phrases.length];
      if (!s.deleting && s.len < phrase.length) {
        s.len += 1;
        timer = setTimeout(step, typeMs);
      } else if (!s.deleting) {
        s.deleting = true;
        timer = setTimeout(step, holdMs);
        return;
      } else if (s.len > 0) {
        s.len -= 1;
        timer = setTimeout(step, deleteMs);
      } else {
        s.deleting = false;
        s.i += 1;
        timer = setTimeout(step, 300);
      }
      setText(phrase.slice(0, s.len));
    };
    timer = setTimeout(step, 400);
    return () => clearTimeout(timer);
  }, [active, phrases, typeMs, deleteMs, holdMs]);
  return text;
}
