// Small, dependency-free motion helpers for the dashboard. Every effect is switched off when the user has
// "reduce motion" enabled in their system settings.
import { forwardRef, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";

export const reducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** True once the element has scrolled into view (stays true). */
export function useInView(options = { threshold: 0.15 }) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || inView) return undefined;
    if (typeof IntersectionObserver === "undefined" || reducedMotion()) {
      setInView(true);
      return undefined;
    }
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        setInView(true);
        io.disconnect();
      }
    }, options);
    io.observe(el);
    return () => io.disconnect();
  }, [inView, options]);
  return [ref, inView];
}

/** Slides its children up and fades them in when they scroll into view. */
export function Reveal({ as: Tag = "div", delay = 0, className = "", children, ...rest }) {
  const [ref, inView] = useInView();
  return (
    <Tag ref={ref} className={`reveal ${inView ? "reveal-in" : ""} ${className}`} style={{ transitionDelay: `${delay}ms` }} {...rest}>
      {children}
    </Tag>
  );
}

/** Tilts towards the mouse in 3D with a soft light sheen that follows the cursor. */
export function Tilt({ as: Tag = "div", max = 7, className = "", children, ...rest }) {
  const ref = useRef(null);
  const move = (e) => {
    const el = ref.current;
    if (!el || reducedMotion()) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    el.style.setProperty("--rx", `${(0.5 - y) * max}deg`);
    el.style.setProperty("--ry", `${(x - 0.5) * max}deg`);
    el.style.setProperty("--mx", `${x * 100}%`);
    el.style.setProperty("--my", `${y * 100}%`);
    el.dataset.tilting = "true";
  };
  const leave = () => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
    el.dataset.tilting = "false";
  };
  return (
    <Tag ref={ref} onMouseMove={move} onMouseLeave={leave} className={`tilt group ${className}`} {...rest}>
      {children}
      <span className="tilt-shine" aria-hidden />
    </Tag>
  );
}

/** Link-button that leans towards the cursor and sends out a ripple when clicked. */
export const MagneticLink = forwardRef(function MagneticLink({ className = "", children, strength = 0.3, ...rest }, _ref) {
  const ref = useRef(null);
  const [ripples, setRipples] = useState([]);
  const move = (e) => {
    const el = ref.current;
    if (!el || reducedMotion()) return;
    const r = el.getBoundingClientRect();
    const dx = (e.clientX - (r.left + r.width / 2)) * strength;
    const dy = (e.clientY - (r.top + r.height / 2)) * strength;
    el.style.transform = `translate(${Math.max(-10, Math.min(10, dx))}px, ${Math.max(-8, Math.min(8, dy))}px)`;
  };
  const leave = () => {
    if (ref.current) ref.current.style.transform = "";
  };
  const click = (e) => {
    const r = ref.current.getBoundingClientRect();
    const id = Date.now() + Math.random();
    setRipples((list) => [...list, { id, x: e.clientX - r.left, y: e.clientY - r.top }]);
    setTimeout(() => setRipples((list) => list.filter((p) => p.id !== id)), 650);
  };
  return (
    <Link ref={ref} onMouseMove={move} onMouseLeave={leave} onClick={click} className={`magnetic relative overflow-hidden ${className}`} {...rest}>
      {children}
      {ripples.map((p) => (
        <span key={p.id} className="ripple" style={{ left: p.x, top: p.y }} aria-hidden />
      ))}
    </Link>
  );
});

/** A burst of gold crescents and stars falling over the parent (which must be `relative overflow-hidden`). */
export function Confetti({ count = 46 }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 350,
        duration: 1600 + Math.random() * 1400,
        drift: (Math.random() - 0.5) * 140,
        spin: (Math.random() - 0.5) * 720,
        size: 10 + Math.random() * 12,
        glyph: i % 3 === 0 ? "☾" : i % 3 === 1 ? "✦" : "★",
        color: ["#d4a64a", "#c08f2f", "#e2c27a", "#763a52", "#36582b"][i % 5],
      })),
    [count]
  );
  const [show, setShow] = useState(!reducedMotion());
  useEffect(() => {
    const t = setTimeout(() => setShow(false), 3400);
    return () => clearTimeout(t);
  }, []);
  if (!show) return null;
  return (
    <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden" aria-hidden>
      {pieces.map((p) => (
        <span
          key={p.id}
          className="confetti"
          style={{
            left: `${p.left}%`,
            fontSize: p.size,
            color: p.color,
            animationDelay: `${p.delay}ms`,
            animationDuration: `${p.duration}ms`,
            "--drift": `${p.drift}px`,
            "--spin": `${p.spin}deg`,
          }}
        >
          {p.glyph}
        </span>
      ))}
    </div>
  );
}
