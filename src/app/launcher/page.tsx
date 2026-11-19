"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

export default function LauncherPage() {
  const stage = useRef<HTMLDivElement>(null);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    const node = stage.current;
    if (!node || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let targetX = 0, targetY = 0, currentX = 0, currentY = 0;
    const move = (event: PointerEvent) => {
      targetX = (event.clientX / window.innerWidth - .5) * 22;
      targetY = (event.clientY / window.innerHeight - .5) * 18;
    };
    const animate = () => {
      currentX += (targetX - currentX) * .075;
      currentY += (targetY - currentY) * .075;
      node.style.setProperty("--pointer-x", `${currentX.toFixed(2)}px`);
      node.style.setProperty("--pointer-y", `${currentY.toFixed(2)}px`);
      raf.current = window.requestAnimationFrame(animate);
    };
    window.addEventListener("pointermove", move, { passive: true });
    raf.current = window.requestAnimationFrame(animate);
    return () => {
      window.removeEventListener("pointermove", move);
      if (raf.current !== null) window.cancelAnimationFrame(raf.current);
    };
  }, []);

  return (
    <main className="yk-launcher" ref={stage}>
      <div className="yk-launcher__grain" aria-hidden="true" />
      <div className="yk-launcher__orbit yk-launcher__orbit--one" aria-hidden="true" />
      <div className="yk-launcher__orbit yk-launcher__orbit--two" aria-hidden="true" />
      <div className="yk-launcher__orb" aria-hidden="true"><span /><i /></div>
      <header className="yk-launcher__top"><span>YOI KIJI</span><span>THE ART OF TEXTILE LIVING</span></header>
      <section className="yk-launcher__center">
        <p className="yk-launcher__eyebrow"><span /> A MORE CONSIDERED EVERYDAY</p>
        <h1>Feel at <em>home.</em></h1>
        <p className="yk-launcher__description">A study in softness, texture and the quiet beauty of living well.</p>
        <Link className="yk-launcher__enter" href="/shop"><span>Enter the world of YOI KIJI</span><b>↗</b></Link>
      </section>
      <footer className="yk-launcher__bottom"><span>COMFORT, CONSIDERED.</span><span>MADE FOR THE MOMENTS THAT MATTER</span></footer>
    </main>
  );
}
