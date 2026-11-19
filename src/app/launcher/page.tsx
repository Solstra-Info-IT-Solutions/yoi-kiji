"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import "./launcher.css";

export default function LauncherPage() {
  const stage = useRef<HTMLElement>(null);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    const node = stage.current;
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!node || !finePointer.matches || reducedMotion.matches) return;

    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;
    let velocityX = 0;
    let velocityY = 0;

    const stopFrame = () => {
      if (raf.current !== null) {
        window.cancelAnimationFrame(raf.current);
        raf.current = null;
      }
    };

    const animate = () => {
      raf.current = null;
      const stiffness = 0.085;
      const damping = 0.72;
      velocityX = (velocityX + (targetX - currentX) * stiffness) * damping;
      velocityY = (velocityY + (targetY - currentY) * stiffness) * damping;
      currentX += velocityX;
      currentY += velocityY;

      node.style.setProperty("--pointer-x", `${currentX.toFixed(2)}px`);
      node.style.setProperty("--pointer-y", `${currentY.toFixed(2)}px`);

      const unsettled =
        Math.abs(targetX - currentX) > 0.035 ||
        Math.abs(targetY - currentY) > 0.035 ||
        Math.abs(velocityX) > 0.035 ||
        Math.abs(velocityY) > 0.035;

      if (unsettled && !document.hidden) raf.current = window.requestAnimationFrame(animate);
      else {
        currentX = targetX;
        currentY = targetY;
        velocityX = 0;
        velocityY = 0;
        node.style.setProperty("--pointer-x", `${currentX.toFixed(2)}px`);
        node.style.setProperty("--pointer-y", `${currentY.toFixed(2)}px`);
      }
    };

    const schedule = () => {
      if (raf.current === null && !document.hidden) raf.current = window.requestAnimationFrame(animate);
    };

    const move = (event: PointerEvent) => {
      targetX = (event.clientX / window.innerWidth - 0.5) * 24;
      targetY = (event.clientY / window.innerHeight - 0.5) * 20;
      schedule();
    };

    const reset = () => {
      targetX = 0;
      targetY = 0;
      schedule();
    };

    const visibilityChange = () => {
      if (document.hidden) stopFrame();
      else schedule();
    };

    node.addEventListener("pointermove", move, { passive: true });
    node.addEventListener("pointerleave", reset, { passive: true });
    window.addEventListener("blur", reset);
    document.addEventListener("visibilitychange", visibilityChange);

    return () => {
      node.removeEventListener("pointermove", move);
      node.removeEventListener("pointerleave", reset);
      window.removeEventListener("blur", reset);
      document.removeEventListener("visibilitychange", visibilityChange);
      stopFrame();
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
        <Link className="yk-launcher__enter" href="/shop"><span>Enter the world of YOI KIJI</span><b aria-hidden="true">↗</b></Link>
      </section>
      <footer className="yk-launcher__bottom"><span>COMFORT, CONSIDERED.</span><span>MADE FOR THE MOMENTS THAT MATTER</span></footer>
    </main>
  );
}
