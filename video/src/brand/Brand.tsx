import React from "react";
import { AbsoluteFill } from "remotion";
import { INK, rnd, Toon } from "../lib/core";
import type { Outfit } from "../lib/toon";

export const NAME = "SKETCHY CASES";
const SHOW_SAFE = false;
const NAVY = "#14213d", NAVY_D = "#0a1124", YELLOW = "#ffd23f", RED = "#e2262d", LINE = "#2c3f6e";

/** Mascot: a bean-head detective in a fedora and trench coat. */
export const DETECTIVE: Outfit = { jacket: "#c9a46a", pants: "#3b3f52", boots: "#3a2a22", hat: "fedora", cap: "#2e2a36", skin: "#ffe2c2", buttons: "#5a3a1a" };

/** Mascot bust wearing a gold monocle with a chain. (cx, cy) = head centre, s = scale (1 = 236 px head). */
const Mascot: React.FC<{ cx: number; cy: number; s: number }> = ({ cx, cy, s }) => {
  const HC = 286; // head centre of seed 7 in the 1000-unit design canvas
  const h = 1000 * s, x = cx, y = cy + (975 - HC) * s;
  const ex = cx + 32 * s, ey = cy - 1 * s, R = 19 * s;
  const c0x = ex + R * 0.72, c0y = ey + R * 0.72;
  const chain = `M ${c0x} ${c0y} C ${c0x + 30 * s} ${c0y + 70 * s}, ${cx + 95 * s} ${cy + 150 * s}, ${cx + 40 * s} ${cy + 215 * s}`;
  return (
    <>
      <Toon outfit={DETECTIVE} x={x} y={y} h={h} shadow={0} opts={{ mode: "stand", expr: "smile", seed: 7, facing: 0, look: 0.3 }} />
      <svg style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }} width={1} height={1}>
        <path d={chain} fill="none" stroke={INK} strokeWidth={7 * s} strokeLinecap="round" />
        <path d={chain} fill="none" stroke="#e8c45a" strokeWidth={4 * s} strokeLinecap="round" strokeDasharray={`${5 * s} ${3 * s}`} />
        <circle cx={cx + 40 * s} cy={cy + 215 * s} r={5 * s} fill="#e8c45a" stroke={INK} strokeWidth={2.5 * s} />
        <circle cx={ex} cy={ey} r={R} fill="#cfe6ff" opacity={0.35} />
        <path d={`M ${ex - R * 0.6} ${ey - R * 0.25} A ${R * 0.65} ${R * 0.65} 0 0 1 ${ex - R * 0.1} ${ey - R * 0.62}`} fill="none" stroke="#fff" strokeWidth={3.5 * s} strokeLinecap="round" opacity={0.9} />
        <circle cx={ex} cy={ey} r={R} fill="none" stroke={INK} strokeWidth={8 * s} />
        <circle cx={ex} cy={ey} r={R} fill="none" stroke="#e8c45a" strokeWidth={4.5 * s} />
      </svg>
    </>
  );
};

/** Faint line-art doodles: fingerprints, diamonds, keys, question marks, footprints, map pins, cipher glyphs. */
const Doodles: React.FC<{ w: number; h: number; cell: number; seed?: number; color?: string; opacity?: number }> = ({ w, h, cell, seed = 3, color = LINE, opacity = 1 }) => {
  const cols = Math.ceil(w / cell) + 1, rows = Math.ceil(h / cell) + 1, items: React.ReactNode[] = [];
  const sw = cell * 0.035;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const i = r * cols + c, kind = Math.floor(rnd(seed, i) * 8), x = c * cell + (r % 2) * cell * 0.5, y = r * cell, rot = (rnd(seed, i + 99) - 0.5) * 50, k = cell * 0.28;
    let g: React.ReactNode;
    switch (kind) {
      case 0: g = <>{[0, 1, 2, 3].map(j => <ellipse key={j} cx={0} cy={0} rx={k * (0.3 + j * 0.22)} ry={k * (0.42 + j * 0.24)} fill="none" stroke={color} strokeWidth={sw} strokeDasharray={`${k * 0.5} ${k * 0.12}`} />)}</>; break;
      case 1: g = <path d={`M ${-k} ${-k * 0.3} L ${-k * 0.5} ${-k * 0.8} L ${k * 0.5} ${-k * 0.8} L ${k} ${-k * 0.3} L 0 ${k} Z M ${-k} ${-k * 0.3} L ${k} ${-k * 0.3}`} fill="none" stroke={color} strokeWidth={sw} strokeLinejoin="round" />; break;
      case 2: g = <><circle cx={-k * 0.5} cy={0} r={k * 0.4} fill="none" stroke={color} strokeWidth={sw} /><path d={`M ${-k * 0.1} 0 L ${k} 0 M ${k * 0.6} 0 L ${k * 0.6} ${k * 0.35} M ${k * 0.9} 0 L ${k * 0.9} ${k * 0.3}`} stroke={color} strokeWidth={sw} fill="none" /></>; break;
      case 3: g = <text x={0} y={k * 0.6} textAnchor="middle" fontFamily="Anton" fontSize={k * 2} fill="none" stroke={color} strokeWidth={sw}>?</text>; break;
      case 4: g = <><ellipse cx={0} cy={k * 0.2} rx={k * 0.35} ry={k * 0.55} fill="none" stroke={color} strokeWidth={sw} />{[0, 1, 2, 3].map(j => <circle key={j} cx={-k * 0.3 + j * k * 0.2} cy={-k * 0.55 - (j % 3 === 0 ? 0 : k * 0.08)} r={k * 0.09} fill="none" stroke={color} strokeWidth={sw * 0.8} />)}</>; break;
      case 5: g = <path d={`M 0 ${k} L ${-k * 0.55} ${-k * 0.1} A ${k * 0.62} ${k * 0.62} 0 1 1 ${k * 0.55} ${-k * 0.1} Z`} fill="none" stroke={color} strokeWidth={sw} strokeLinejoin="round" />; break;
      case 6: g = <><circle cx={0} cy={0} r={k * 0.6} fill="none" stroke={color} strokeWidth={sw} /><line x1={-k} y1={0} x2={k} y2={0} stroke={color} strokeWidth={sw} /><line x1={0} y1={-k} x2={0} y2={k} stroke={color} strokeWidth={sw} /></>; break;
      default: g = <><circle cx={-k * 0.2} cy={-k * 0.2} r={k * 0.55} fill="none" stroke={color} strokeWidth={sw} /><line x1={k * 0.2} y1={k * 0.2} x2={k} y2={k} stroke={color} strokeWidth={sw * 1.6} strokeLinecap="round" /></>;
    }
    items.push(<g key={i} transform={`translate(${x} ${y}) rotate(${rot})`}>{g}</g>);
  }
  return <svg width={w} height={h} style={{ position: "absolute", left: 0, top: 0, opacity }}>{items}</svg>;
};

/** yellow crime-scene tape across a corner */
const Tape: React.FC<{ x: number; y: number; len: number; rot: number; h?: number }> = ({ x, y, len, rot, h = 90 }) => (
  <div style={{ position: "absolute", left: x, top: y, width: len, height: h, transform: `rotate(${rot}deg)`, transformOrigin: "0 0", background: YELLOW,
    borderTop: `8px solid ${INK}`, borderBottom: `8px solid ${INK}`, display: "flex", alignItems: "center", overflow: "hidden", whiteSpace: "nowrap",
    boxShadow: "0 12px 0 rgba(0,0,0,0.35)" }}>
    <span style={{ fontFamily: "Anton", fontSize: h * 0.58, color: INK, letterSpacing: 6 }}>
      {Array.from({ length: 12 }, () => `${NAME}  •  DO NOT CROSS  •  `).join("")}
    </span>
  </div>
);

/** 800 x 800 profile picture (YouTube shows it as a circle) */
export const Avatar: React.FC = () => (
  <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 45%, #22355f 0%, ${NAVY} 55%, ${NAVY_D} 100%)` }}>
    <Doodles w={800} h={800} cell={150} seed={11} />
    <div style={{ position: "absolute", left: 40, top: 40, width: 720, height: 720, borderRadius: "50%", border: `16px solid ${YELLOW}`, boxShadow: `0 0 0 10px ${INK} inset, 0 0 0 10px ${INK}` }} />
    <AbsoluteFill style={{ clipPath: "circle(352px at 400px 400px)" }}>
      <Mascot cx={390} cy={360} s={1.75} />
    </AbsoluteFill>
  </AbsoluteFill>
);

/** 2560 x 1440 channel banner; everything essential sits in the 1546 x 423 safe area (x 507-2053, y 508-931) */
export const Banner: React.FC = () => (
  <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 50%, #22355f 0%, ${NAVY} 50%, ${NAVY_D} 100%)`, overflow: "hidden" }}>
    <Doodles w={2560} h={1440} cell={190} seed={11} />
    <Tape x={-120} y={420} len={1100} rot={-24} />
    <Tape x={1700} y={1300} len={1200} rot={-24} />
    <div style={{ position: "absolute", left: 560, top: 512, width: 416, height: 416, borderRadius: "50%", background: `radial-gradient(circle, #2a4170 0%, ${NAVY} 70%)`,
      border: `14px solid ${YELLOW}`, boxShadow: `0 0 0 9px ${INK} inset, 0 0 0 9px ${INK}`, overflow: "hidden" }}>
      <div style={{ position: "absolute", left: -560, top: -512, width: 2560, height: 1440 }}>
        <Mascot cx={768} cy={680} s={0.92} />
      </div>
    </div>
    <div style={{ position: "absolute", left: 1040, top: 560, fontFamily: "Anton", fontSize: 158, lineHeight: 1, color: YELLOW, letterSpacing: 4,
      WebkitTextStroke: "26px #000", paintOrder: "stroke fill", textShadow: "0 14px 0 rgba(0,0,0,0.45)", whiteSpace: "nowrap" }}>{NAME}</div>
    <div style={{ position: "absolute", left: 1046, top: 748, fontFamily: "Montserrat", fontWeight: 900, fontSize: 44, color: "#fff", letterSpacing: 2,
      WebkitTextStroke: "12px #000", paintOrder: "stroke fill", whiteSpace: "nowrap" }}>TRUE CRIMES • HEISTS • MYSTERIES</div>
    <div style={{ position: "absolute", left: 1046, top: 822, padding: "8px 28px", borderRadius: 40, background: RED, border: `6px solid ${INK}`,
      fontFamily: "Montserrat", fontWeight: 900, fontSize: 32, color: "#fff", letterSpacing: 2, whiteSpace: "nowrap" }}>NEW CASE FILES EVERY WEEK</div>
    <div data-safe-area style={{ position: "absolute", left: 507, top: 508, width: 1546, height: 423, outline: SHOW_SAFE ? "4px dashed #ff00ff" : undefined }} />
  </AbsoluteFill>
);
