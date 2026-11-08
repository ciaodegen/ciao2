import React, { useLayoutEffect, useRef } from "react";
import { AbsoluteFill, interpolate, staticFile, useCurrentFrame } from "remotion";
import { loadFont } from "@remotion/fonts";
import { bodyFront, FrontOpts, Outfit, Pen } from "./toon";

export const FPS = 30;
export const W = 1080;
export const H = 1920;
export const INK = "#0b0a0c";
export const at = (sec: number) => Math.round(sec * FPS);

loadFont({ family: "Montserrat", url: staticFile("fonts/montserrat-latin-900-normal.woff2"), weight: "900" });
loadFont({ family: "Anton", url: staticFile("fonts/anton-latin-400-normal.woff2"), weight: "400" });
loadFont({ family: "Special Elite", url: staticFile("fonts/special-elite-latin-400-normal.woff2"), weight: "400" });

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smoother = (t: number) => { const x = clamp01(t); return x * x * x * (x * (6 * x - 15) + 10); };
export const ramp = (f: number, a: number, b: number) => smoother((f - a) / Math.max(1, b - a));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** deterministic random in [0,1) */
export const rnd = (seed: number, k = 0) => { const x = Math.sin(seed * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); };

// ---------------- characters ----------------
type ToonProps = {
  outfit: Outfit; opts?: FrontOpts; x: number; y: number; h: number; flip?: boolean;
  filter?: string; shadow?: number; style?: React.CSSProperties;
};
/** A flat cartoon character drawn on its own canvas. (x, y) = point between the feet, h = canvas height (~1.08 x figure). */
export const Toon: React.FC<ToonProps> = ({ outfit, opts = {}, x, y, h, flip, filter, shadow = 0.45, style }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const s = h / 1000, cw = Math.ceil(600 * s), ch = Math.ceil(1000 * s);
  useLayoutEffect(() => {
    const c = ref.current; if (!c) return;
    const g = c.getContext("2d")!;
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cw, ch);
    g.setTransform(s, 0, 0, s, 0, 0);
    if (shadow > 0 && opts.mode !== "sit") {
      g.beginPath(); g.ellipse(300, 978, 120, 22, 0, 0, Math.PI * 2);
      g.fillStyle = `rgba(5,4,10,${shadow})`; g.fill();
    }
    bodyFront(new Pen(g), outfit, opts);
  });
  return (
    <canvas ref={ref} width={cw} height={ch}
      style={{ position: "absolute", left: x - 300 * s, top: y - 975 * s, width: cw, height: ch,
        transform: flip ? "scaleX(-1)" : undefined, filter, ...style }} />
  );
};

// ---------------- camera ----------------
export type CamKey = { f: number; z?: number; x?: number; y?: number; r?: number };
/** Keyframed camera (zoom about a focus point x,y in scene px, roll in degrees) with smootherstep glides,
 *  a continuous creep so no hold is static, and flip-sign impact kicks that decay over 7 frames. */
export const Camera: React.FC<{ keys: CamKey[]; kicks?: number[]; creep?: number; children: React.ReactNode; bg?: string }> =
  ({ keys, kicks = [], creep = 0.0009, children, bg = "#05040a" }) => {
    const f = useCurrentFrame();
    let z = keys[0].z ?? 1, x = keys[0].x ?? W / 2, y = keys[0].y ?? H / 2, r = keys[0].r ?? 0;
    for (let i = 1; i < keys.length; i++) {
      const a = keys[i - 1], b = keys[i], t = ramp(f, a.f, b.f);
      if (f <= a.f) break;
      z = lerp(a.z ?? z, b.z ?? a.z ?? z, t); x = lerp(a.x ?? x, b.x ?? a.x ?? x, t);
      y = lerp(a.y ?? y, b.y ?? a.y ?? y, t); r = lerp(a.r ?? r, b.r ?? a.r ?? r, t);
    }
    z *= 1 + creep * f;
    let kx = 0, ky = 0, kr = 0;
    for (const k of kicks) {
      const d = f - k;
      if (d >= 0 && d < 8) { const amp = (1 - d / 8) ** 1.5, s = d % 2 ? -1 : 1; kx += s * 22 * amp; ky += -s * 14 * amp; kr += s * 1.2 * amp; z *= 1 + 0.03 * amp; }
    }
    const tx = W / 2 - x, ty = H / 2 - y;
    return (
      <AbsoluteFill style={{ background: bg, overflow: "hidden" }}>
        <AbsoluteFill style={{ transformOrigin: `${W / 2}px ${H / 2}px`,
          transform: `translate(${kx}px, ${ky}px) rotate(${r + kr}deg) scale(${z}) translate(${tx}px, ${ty}px)` }}>
          {children}
        </AbsoluteFill>
      </AbsoluteFill>
    );
  };

// ---------------- overlays ----------------
/** Slammed stamp text: drops from 2.3x to 1x in 5 frames with a small overshoot. */
export const Stamp: React.FC<{ text: string; at: number; x?: number; y?: number; size?: number; color?: string; rot?: number; box?: boolean; until?: number }> =
  ({ text, at: f0, x = W / 2, y = 330, size = 210, color = "#e2262d", rot = -6, box = true, until }) => {
    const f = useCurrentFrame();
    if (f < f0 || (until !== undefined && f >= until)) return null;
    const d = f - f0, s = d < 5 ? lerp(2.3, 0.94, smoother(d / 5)) : d < 8 ? lerp(0.94, 1, (d - 5) / 3) : 1;
    const o = clamp01(d / 2);
    return (
      <div style={{ position: "absolute", left: x, top: y, transform: `translate(-50%,-50%) rotate(${rot}deg) scale(${s})`, opacity: o,
        fontFamily: "Anton", fontSize: size, color, letterSpacing: 6, lineHeight: 1, whiteSpace: "nowrap",
        padding: box ? "18px 40px 10px" : 0, border: box ? `14px solid ${color}` : undefined, borderRadius: 18,
        textShadow: "0 8px 0 rgba(0,0,0,0.35)", boxShadow: box ? "0 10px 0 rgba(0,0,0,0.25)" : undefined }}>
        {text}
      </div>
    );
  };

export const Flash: React.FC<{ at: number; len?: number; color?: string }> = ({ at: f0, len = 7, color = "#ffffff" }) => {
  const f = useCurrentFrame();
  const o = f < f0 || f > f0 + len ? 0 : 1 - (f - f0) / len;
  return o > 0 ? <AbsoluteFill style={{ background: color, opacity: o }} /> : null;
};

export const Vignette: React.FC<{ strength?: number; color?: string }> = ({ strength = 0.65, color = "5,4,12" }) => (
  <AbsoluteFill style={{ background: `radial-gradient(ellipse 75% 60% at 50% 48%, rgba(${color},0) 55%, rgba(${color},${strength}) 100%)`, pointerEvents: "none" }} />
);

/** fades the shot in from black over n frames */
export const FadeIn: React.FC<{ n?: number }> = ({ n = 6 }) => {
  const f = useCurrentFrame();
  return f < n ? <AbsoluteFill style={{ background: "#000", opacity: 1 - f / n }} /> : null;
};

// ---------------- captions ----------------
export type Word = { word: string; start: number; end: number };
export type CapWord = { text: string; start: number; end: number; color: string };
export const YELLOW = "#ffd23f", RED = "#ff3b3b", WHITE = "#ffffff";

export const buildCaptions = (words: Word[], opts: { merge?: Record<number, string | [string, number]>; replace?: Record<number, string>;
  yellow?: number[]; red?: number[] }): CapWord[] => {
  const out: CapWord[] = [];
  for (let i = 0; i < words.length; i++) {
    const w = words[i], idx = i;
    let text = w.word, end = w.end;
    const m = opts.merge?.[i];
    if (m !== undefined) {
      const [t, n] = typeof m === "string" ? [m, 2] : m;
      text = t; end = words[Math.min(words.length - 1, i + n - 1)].end; i += n - 1;
    }
    if (opts.replace?.[i] !== undefined) text = opts.replace[i];
    else text = text.replace(/["“”]/g, "").replace(/\.\.\.$/, "").replace(/[.,:;!]+$/g, "");
    const color = opts.red?.includes(idx) ? RED : opts.yellow?.includes(idx) ? YELLOW : WHITE;
    out.push({ text, start: w.start, end, color });
  }
  return out;
};

/** One word at a time, centred, white with a heavy black outline; pops in over 4 frames. */
export const Captions: React.FC<{ words: CapWord[]; y?: number; size?: number; hold?: number }> = ({ words, y = 1250, size = 128, hold = 0.35 }) => {
  const f = useCurrentFrame(), t = f / FPS;
  let cur: CapWord | null = null, idx = -1;
  for (let i = 0; i < words.length; i++) {
    const w = words[i], next = words[i + 1];
    const until = next ? Math.min(next.start, w.end + hold) : w.end + hold;
    if (t >= w.start - 0.02 && t < until) { cur = w; idx = i; }
  }
  if (!cur) return null;
  const d = f - Math.round(cur.start * FPS), s = d < 4 ? lerp(0.72, 1.06, d / 4) : d < 7 ? lerp(1.06, 1, (d - 4) / 3) : 1;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div key={idx} style={{ position: "absolute", left: 0, right: 0, top: y, textAlign: "center", transform: `translateY(-50%) scale(${s})`,
        fontFamily: "Montserrat", fontWeight: 900, fontSize: size, color: cur.color, lineHeight: 1,
        WebkitTextStroke: "22px #000", paintOrder: "stroke fill", letterSpacing: -1,
        textShadow: "0 10px 18px rgba(0,0,0,0.55)" }}>
        {cur.text}
      </div>
    </AbsoluteFill>
  );
};

/** Night colour wash over a whole shot (multiply) */
export const Wash: React.FC<{ color: string; opacity?: number; mode?: React.CSSProperties["mixBlendMode"] }> = ({ color, opacity = 1, mode = "multiply" }) => (
  <AbsoluteFill style={{ background: color, opacity, mixBlendMode: mode, pointerEvents: "none" }} />
);

export const fadeOut = (f: number, end: number, n = 8) => interpolate(f, [end - n, end], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
