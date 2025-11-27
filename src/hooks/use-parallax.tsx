import { useEffect, useState, useRef } from "react";

export const useParallax = (speed: number = 0.5, enabled: boolean = true) => {
  const [offset, setOffset] = useState(0);
  const rafId = useRef<number | null>(null);
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  useEffect(() => {
    if (!enabled || isMobile) {
      setOffset(0);
      return;
    }

    const handleScroll = () => {
      if (rafId.current !== null) {
        cancelAnimationFrame(rafId.current);
      }

      rafId.current = requestAnimationFrame(() => {
        const scrollY = window.pageYOffset || window.scrollY || 0;
        setOffset(scrollY * speed);
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll(); // Initial call
    
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (rafId.current !== null) {
        cancelAnimationFrame(rafId.current);
      }
    };
  }, [speed, enabled, isMobile]);

  return offset;
};
