import { ReactNode, useEffect, useRef, useState } from "react";

type DeferredRenderProps = {
  children: ReactNode;
  fallback?: ReactNode;
  rootMargin?: string;
  threshold?: number;
  className?: string;
};

export default function DeferredRender({
  children,
  fallback = null,
  rootMargin = "320px 0px",
  threshold = 0.01,
  className,
}: DeferredRenderProps) {
  const [visible, setVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (visible) return;
    const element = containerRef.current;
    if (!element) return;
    if (typeof window === "undefined" || !("IntersectionObserver" in window)) {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setVisible(true);
      },
      { root: null, rootMargin, threshold }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [rootMargin, threshold, visible]);

  return (
    <div ref={containerRef} className={className}>
      {visible ? children : fallback}
    </div>
  );
}
