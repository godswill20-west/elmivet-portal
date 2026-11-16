import { useEffect, useState } from 'react';

/* Floating "back to top" button.
   - Appears a moment after the visitor starts scrolling, on every page that renders it.
   - Stays fixed at the bottom-right of the screen.
   - The red ring around it fills as the visitor moves down the page. */
const SHOW_AFTER_PX = 80;
const RADIUS = 20;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function BackToTop() {
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0); // 0 to 1

  useEffect(() => {
    let frame = 0;

    const update = () => {
      frame = 0;
      const y = window.scrollY || document.documentElement.scrollTop || 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setVisible(y > SHOW_AFTER_PX);
      setProgress(max > 0 ? Math.round(Math.min(1, Math.max(0, y / max)) * 100) / 100 : 0);
    };

    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };

    update(); // correct state if the page loads already scrolled (refresh, back button)
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  const scrollToTop = () => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
  };

  return (
    <button
      type="button"
      onClick={scrollToTop}
      aria-label="Back to top"
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
      style={{
        bottom: 'max(1.25rem, env(safe-area-inset-bottom, 0px))',
        right: 'max(1.25rem, env(safe-area-inset-right, 0px))',
      }}
      className={`group fixed z-40 flex h-12 w-12 cursor-pointer items-center justify-center rounded-full bg-[#0A2540] text-white shadow-lg shadow-black/30 ring-1 ring-white/10 transition-all duration-300 hover:-translate-y-1 hover:bg-[#D9232D] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D9232D] motion-reduce:transition-none ${
        visible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-4 opacity-0'
      }`}
    >
      {/* Scroll-progress ring */}
      <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 48 48" aria-hidden="true">
        <circle cx="24" cy="24" r={RADIUS} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="2.5" />
        <circle
          cx="24"
          cy="24"
          r={RADIUS}
          fill="none"
          stroke="#D9232D"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - progress)}
          className="transition-[stroke-dashoffset] duration-150 group-hover:stroke-white"
        />
      </svg>

      <svg
        className="relative h-5 w-5 transition-transform duration-200 group-hover:-translate-y-0.5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12 19V5M5 12l7-7 7 7" />
      </svg>
    </button>
  );
}
