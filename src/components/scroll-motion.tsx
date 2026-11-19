"use client";

import { useEffect } from "react";

export function ScrollMotion() {
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || !("IntersectionObserver" in window)) return;
    const targets = document.querySelectorAll<HTMLElement>(
      "main section:not(.editorial-hero), .commerce-page > *, .site-footer .footer-top > *"
    );
    targets.forEach((node, index) => {
      node.dataset.motionReveal = "pending";
      node.style.setProperty("--motion-delay", `${Math.min(index % 4, 3) * 65}ms`);
    });
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          (entry.target as HTMLElement).dataset.motionReveal = "visible";
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
    targets.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);
  return null;
}
