import React from "react";
import { H, INK, rnd, W } from "./core";

const SW = 6; // world ink width at 1080 wide

export const Svg: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute", left: 0, top: 0, overflow: "visible", ...style }}>
    {children}
  </svg>
);

let gid = 0;
const uid = (p: string) => `${p}${++gid}`;

export const Sky: React.FC<{ top: string; bottom: string; y0?: number; y1?: number }> = ({ top, bottom, y0 = -400, y1 = H }) => {
  const id = React.useMemo(() => uid("sky"), []);
  return (<>
    <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={top} /><stop offset="1" stopColor={bottom} /></linearGradient></defs>
    <rect x={-600} y={y0} width={W + 1200} height={y1 - y0} fill={`url(#${id})`} />
  </>);
};

export const Stars: React.FC<{ seed?: number; n?: number; y1?: number; f?: number }> = ({ seed = 1, n = 70, y1 = 900, f = 0 }) => (
  <g>{Array.from({ length: n }, (_, i) => {
    const x = -300 + rnd(seed, i) * (W + 600), y = -300 + rnd(seed, i + 500) * (y1 + 300), r = 1.5 + rnd(seed, i + 900) * 2.5;
    const tw = 0.55 + 0.45 * Math.sin(f * 0.15 + i);
    return <circle key={i} cx={x} cy={y} r={r} fill="#fdf6d8" opacity={tw} />;
  })}</g>
);

export const Moon: React.FC<{ x: number; y: number; r: number; glow?: string }> = ({ x, y, r, glow = "#fff2c4" }) => {
  const id = React.useMemo(() => uid("moon"), []);
  return (<>
    <defs><radialGradient id={id}><stop offset="0" stopColor={glow} stopOpacity="0.55" /><stop offset="1" stopColor={glow} stopOpacity="0" /></radialGradient></defs>
    <circle cx={x} cy={y} r={r * 3.2} fill={`url(#${id})`} />
    <circle cx={x} cy={y} r={r} fill="#fbf1cf" stroke={INK} strokeWidth={SW} />
    <circle cx={x - r * 0.3} cy={y - r * 0.2} r={r * 0.18} fill="#e8dbb0" />
    <circle cx={x + r * 0.28} cy={y + r * 0.3} r={r * 0.12} fill="#e8dbb0" />
  </>);
};

export const Ground: React.FC<{ y: number; color: string; edge?: string }> = ({ y, color, edge }) => (
  <>
    <rect x={-600} y={y} width={W + 1200} height={H - y + 800} fill={color} />
    <line x1={-600} y1={y} x2={W + 600} y2={y} stroke={edge ?? INK} strokeWidth={SW} />
  </>
);

export const Hills: React.FC<{ base: number; color: string; seed?: number; amp?: number; n?: number }> = ({ base, color, seed = 3, amp = 120, n = 7 }) => {
  const pts: string[] = [`M -600 ${base + 400}`, `L -600 ${base}`];
  for (let i = 0; i <= n; i++) {
    const x = -600 + ((W + 1200) * i) / n, y = base - amp * (0.4 + 0.6 * rnd(seed, i));
    const xm = x + (W + 1200) / n / 2, ym = base - amp * 0.25 * rnd(seed, i + 50);
    pts.push(`Q ${x} ${y} ${xm} ${ym}`);
  }
  pts.push(`L ${W + 600} ${base + 400} Z`);
  return <path d={pts.join(" ")} fill={color} stroke={INK} strokeWidth={SW} strokeLinejoin="round" />;
};

export const Building: React.FC<{ x: number; base: number; w: number; h: number; color: string; seed?: number; lit?: number;
  cols?: number; rows?: number; roof?: "flat" | "gable"; sign?: string; signColor?: string; door?: boolean; litColor?: string }> =
  ({ x, base, w, h, color, seed = 1, lit = 0.35, cols = 3, rows = 4, roof = "flat", sign, signColor = "#d9e7ff", door = true, litColor = "#ffcf6b" }) => {
    const top = base - h, ww = (w * 0.62) / cols, wh = (h * 0.5) / rows, gx = (w - cols * ww) / (cols + 1), gy = (h * 0.72 - rows * wh) / (rows + 1);
    return (
      <g>
        {roof === "gable" && <path d={`M ${x - 12} ${top} L ${x + w / 2} ${top - w * 0.38} L ${x + w + 12} ${top} Z`} fill="#3a2f3a" stroke={INK} strokeWidth={SW} strokeLinejoin="round" />}
        <rect x={x} y={top} width={w} height={h} fill={color} stroke={INK} strokeWidth={SW} />
        {roof === "flat" && <rect x={x - 10} y={top - 16} width={w + 20} height={18} fill="#2b2733" stroke={INK} strokeWidth={SW} />}
        {Array.from({ length: rows * cols }, (_, i) => {
          const c = i % cols, r = Math.floor(i / cols), on = rnd(seed, i) < lit;
          return <rect key={i} x={x + gx + c * (ww + gx)} y={top + gy + r * (wh + gy) + 10} width={ww} height={wh}
            fill={on ? litColor : "#1a2033"} stroke={INK} strokeWidth={SW * 0.7} />;
        })}
        {door && <rect x={x + w / 2 - w * 0.09} y={base - h * 0.2} width={w * 0.18} height={h * 0.2} fill="#2a1f22" stroke={INK} strokeWidth={SW * 0.8} />}
        {sign && (<g>
          <rect x={x + w * 0.12} y={base - h * 0.34} width={w * 0.76} height={h * 0.09} rx={8} fill="#141a2b" stroke={INK} strokeWidth={SW * 0.8} />
          <text x={x + w / 2} y={base - h * 0.34 + h * 0.068} textAnchor="middle" fontFamily="Anton" fontSize={h * 0.062} fill={signColor} letterSpacing={3}>{sign}</text>
        </g>)}
      </g>
    );
  };

export const Tree: React.FC<{ x: number; base: number; s?: number; color?: string; trunk?: string; seed?: number }> =
  ({ x, base, s = 1, color = "#1f3b33", trunk = "#3b2a26", seed = 2 }) => {
    const r = 95 * s;
    const blobs = [[0, -2.3], [-0.7, -1.7], [0.7, -1.75], [0, -1.35]].map(([dx, dy], i) =>
      <circle key={i} cx={x + dx * r} cy={base + dy * r} r={r * (0.78 + 0.18 * rnd(seed, i))} fill={color} stroke={INK} strokeWidth={SW} />);
    return (<g>
      <rect x={x - 14 * s} y={base - 1.2 * r} width={28 * s} height={1.2 * r} fill={trunk} stroke={INK} strokeWidth={SW} />
      {blobs}
      {[[0, -2.3], [-0.7, -1.7], [0.7, -1.75], [0, -1.35]].map(([dx, dy], i) =>
        <circle key={`f${i}`} cx={x + dx * r} cy={base + dy * r} r={r * (0.78 + 0.18 * rnd(seed, i)) - SW / 2} fill={color} />)}
    </g>);
  };

export const Pine: React.FC<{ x: number; base: number; s?: number; color?: string }> = ({ x, base, s = 1, color = "#16302b" }) => (
  <g>
    <rect x={x - 10 * s} y={base - 50 * s} width={20 * s} height={50 * s} fill="#2c211e" stroke={INK} strokeWidth={SW} />
    {[0, 1, 2].map(i => {
      const w = (150 - i * 38) * s, y0 = base - 40 * s - i * 95 * s;
      return <path key={i} d={`M ${x - w} ${y0} L ${x} ${y0 - 190 * s} L ${x + w} ${y0} Z`} fill={color} stroke={INK} strokeWidth={SW} strokeLinejoin="round" />;
    })}
  </g>
);

export const StreetLamp: React.FC<{ x: number; base: number; h?: number; on?: boolean }> = ({ x, base, h = 520, on = true }) => {
  const id = React.useMemo(() => uid("lamp"), []);
  return (<g>
    {on && <defs><radialGradient id={id}><stop offset="0" stopColor="#ffdf8a" stopOpacity="0.6" /><stop offset="1" stopColor="#ffdf8a" stopOpacity="0" /></radialGradient></defs>}
    {on && <ellipse cx={x + 60} cy={base - 20} rx={220} ry={60} fill="#ffdf8a" opacity={0.18} />}
    <rect x={x - 9} y={base - h} width={18} height={h} fill="#2b2a33" stroke={INK} strokeWidth={SW} />
    <path d={`M ${x} ${base - h} Q ${x} ${base - h - 60} ${x + 70} ${base - h - 50}`} fill="none" stroke={INK} strokeWidth={22} />
    <path d={`M ${x} ${base - h} Q ${x} ${base - h - 60} ${x + 70} ${base - h - 50}`} fill="none" stroke="#2b2a33" strokeWidth={10} />
    <path d={`M ${x + 40} ${base - h - 52} L ${x + 100} ${base - h - 52} L ${x + 88} ${base - h - 28} L ${x + 52} ${base - h - 28} Z`} fill={on ? "#ffe9a8" : "#555"} stroke={INK} strokeWidth={SW} strokeLinejoin="round" />
    {on && <circle cx={x + 70} cy={base - h - 20} r={170} fill={`url(#${id})`} />}
  </g>);
};

/** 1960s sedan, side view, facing right. base = road y under the wheels. */
export const Car: React.FC<{ x: number; base: number; s?: number; color?: string; lights?: boolean; flip?: boolean; taxi?: boolean; beams?: number }> =
  ({ x, base, s = 1, color = "#c9c2b0", lights = false, flip = false, taxi = false, beams = 0 }) => {
    const k = (v: number) => v * s;
    const body = `M ${k(-250)} ${k(-40)} L ${k(-250)} ${k(-95)} Q ${k(-240)} ${k(-115)} ${k(-200)} ${k(-118)} L ${k(-130)} ${k(-120)}
      L ${k(-90)} ${k(-185)} Q ${k(-80)} ${k(-195)} ${k(-60)} ${k(-195)} L ${k(80)} ${k(-195)} Q ${k(100)} ${k(-195)} ${k(110)} ${k(-185)}
      L ${k(150)} ${k(-122)} L ${k(225)} ${k(-115)} Q ${k(255)} ${k(-110)} ${k(258)} ${k(-80)} L ${k(258)} ${k(-40)} Z`;
    return (
      <g transform={`translate(${x} ${base}) scale(${flip ? -1 : 1} 1)`}>
        {beams > 0 && <path d={`M ${k(250)} ${k(-80)} L ${k(900)} ${k(-200)} L ${k(900)} ${k(60)} Z`} fill="#fff4c2" opacity={0.28 * beams} />}
        <ellipse cx={0} cy={4} rx={k(270)} ry={k(18)} fill="rgba(0,0,0,0.45)" />
        <path d={body} fill={taxi ? "#f2c230" : color} stroke={INK} strokeWidth={SW} strokeLinejoin="round" />
        <path d={`M ${k(-75)} ${k(-125)} L ${k(-48)} ${k(-178)} L ${k(5)} ${k(-178)} L ${k(5)} ${k(-125)} Z`} fill="#1b2438" stroke={INK} strokeWidth={SW * 0.8} strokeLinejoin="round" />
        <path d={`M ${k(22)} ${k(-125)} L ${k(22)} ${k(-178)} L ${k(85)} ${k(-178)} L ${k(118)} ${k(-125)} Z`} fill="#1b2438" stroke={INK} strokeWidth={SW * 0.8} strokeLinejoin="round" />
        <line x1={k(-250)} y1={k(-70)} x2={k(258)} y2={k(-70)} stroke="#e9e6dc" strokeWidth={k(6)} opacity={0.7} />
        {taxi && <><rect x={k(-35)} y={k(-225)} width={k(70)} height={k(30)} rx={k(6)} fill="#ffe9a0" stroke={INK} strokeWidth={SW * 0.8} />
          <text x={0} y={k(-203)} textAnchor="middle" fontFamily="Anton" fontSize={k(22)} fill={INK}>TAXI</text></>}
        <circle cx={k(250)} cy={k(-88)} r={k(13)} fill={lights ? "#fff1a8" : "#77736a"} stroke={INK} strokeWidth={SW * 0.7} />
        <rect x={k(-258)} y={k(-92)} width={k(14)} height={k(22)} fill={lights ? "#ff4a3d" : "#6b2a2a"} stroke={INK} strokeWidth={SW * 0.6} />
        {[-150, 150].map(cx => (<g key={cx}>
          <circle cx={k(cx)} cy={k(-38)} r={k(44)} fill="#16141a" stroke={INK} strokeWidth={SW} />
          <circle cx={k(cx)} cy={k(-38)} r={k(19)} fill="#b8b6ae" stroke={INK} strokeWidth={SW * 0.6} />
        </g>))}
      </g>
    );
  };

export const PhoneBooth: React.FC<{ x: number; base: number; s?: number; lit?: boolean; doorOpen?: number }> = ({ x, base, s = 1, lit = true, doorOpen = 0 }) => {
  const k = (v: number) => v * s, w = k(220), h = k(560);
  return (<g>
    {lit && <ellipse cx={x} cy={base - 10} rx={w * 1.4} ry={k(40)} fill="#fff1b8" opacity={0.18} />}
    <rect x={x - w / 2} y={base - h} width={w} height={h} fill="#b8b2a2" stroke={INK} strokeWidth={SW} />
    <rect x={x - w / 2 + k(18)} y={base - h + k(70)} width={w - k(36)} height={h - k(110)} fill={lit ? "#fff3c4" : "#2a3146"} stroke={INK} strokeWidth={SW * 0.8} opacity={0.92} />
    <rect x={x - w / 2 - k(8)} y={base - h - k(40)} width={w + k(16)} height={k(50)} fill="#2d4c88" stroke={INK} strokeWidth={SW} />
    <text x={x} y={base - h - k(4)} textAnchor="middle" fontFamily="Anton" fontSize={k(34)} fill="#f4f1ea" letterSpacing={2}>PHONE</text>
    <rect x={x - k(28)} y={base - h + k(180)} width={k(56)} height={k(90)} rx={k(8)} fill="#2a2a30" stroke={INK} strokeWidth={SW * 0.7} />
    {doorOpen > 0 && <rect x={x + w / 2 - k(4)} y={base - h + k(10)} width={k(14) + doorOpen * k(60)} height={h - k(20)} fill="#9c968a" stroke={INK} strokeWidth={SW * 0.8} />}
  </g>);
};

export const ZodiacSymbol: React.FC<{ x: number; y: number; r: number; color?: string; sw?: number; glow?: number; ink?: boolean }> =
  ({ x, y, r, color = "#e2262d", sw, glow = 0, ink = true }) => {
    const w = sw ?? r * 0.13, e = r * 1.38;
    const shapes = (c: string, ww: number) => (<>
      <circle cx={x} cy={y} r={r} fill="none" stroke={c} strokeWidth={ww} />
      <line x1={x - e} y1={y} x2={x + e} y2={y} stroke={c} strokeWidth={ww} strokeLinecap="round" />
      <line x1={x} y1={y - e} x2={x} y2={y + e} stroke={c} strokeWidth={ww} strokeLinecap="round" />
    </>);
    return (<g>
      {glow > 0 && <g opacity={glow} style={{ filter: `blur(${r * 0.12}px)` }}>{shapes(color, w * 2.4)}</g>}
      {ink && shapes(INK, w + SW * 1.6)}
      {shapes(color, w)}
    </g>);
  };

export const Envelope: React.FC<{ x: number; y: number; w?: number; rot?: number; open?: number; color?: string; stamp?: boolean }> =
  ({ x, y, w = 300, rot = 0, open = 0, color = "#efe6cf", stamp = true }) => {
    const h = w * 0.62;
    return (<g transform={`translate(${x} ${y}) rotate(${rot})`}>
      <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={8} fill={color} stroke={INK} strokeWidth={SW} />
      <path d={`M ${-w / 2} ${-h / 2} L 0 ${-h / 2 + h * 0.55 * (1 - 2 * open)} L ${w / 2} ${-h / 2}`} fill={open > 0.5 ? "#e2d6b8" : color} stroke={INK} strokeWidth={SW} strokeLinejoin="round" />
      {stamp && <rect x={w / 2 - w * 0.2} y={-h / 2 + h * 0.1} width={w * 0.13} height={h * 0.2} fill="#c0353a" stroke={INK} strokeWidth={SW * 0.6} />}
      <line x1={-w * 0.25} y1={h * 0.15} x2={w * 0.12} y2={h * 0.15} stroke="#8a826e" strokeWidth={6} />
      <line x1={-w * 0.25} y1={h * 0.28} x2={w * 0.05} y2={h * 0.28} stroke="#8a826e" strokeWidth={6} />
    </g>);
  };

export const Paper: React.FC<{ x: number; y: number; w: number; h: number; rot?: number; color?: string; children?: React.ReactNode }> =
  ({ x, y, w, h, rot = 0, color = "#f6f0df", children }) => (
    <g transform={`translate(${x} ${y}) rotate(${rot})`}>
      <rect x={-w / 2 + 10} y={-h / 2 + 14} width={w} height={h} fill="rgba(0,0,0,0.35)" />
      <rect x={-w / 2} y={-h / 2} width={w} height={h} fill={color} stroke={INK} strokeWidth={SW} />
      {children}
    </g>
  );

const GLYPHS = ["Δ", "Θ", "Λ", "Π", "Σ", "Φ", "Ψ", "Ω", "▲", "●", "■", "○", "◆", "+", "/", "K", "R", "Я", "Ǝ", "Ɔ", "q", "ɘ", "⊕", "⌐", "L", "J", "Ⅎ", "∆", "◐", "◑"];
/** grid of cipher-like symbols (not the real Zodiac ciphers) */
export const Glyphs: React.FC<{ x: number; y: number; cols: number; rows: number; cell: number; seed?: number; color?: string; count?: number; hl?: (i: number) => string | null }> =
  ({ x, y, cols, rows, cell, seed = 7, color = "#1f1a24", count, hl }) => (
    <g>{Array.from({ length: Math.min(count ?? rows * cols, rows * cols) }, (_, i) => {
      const c = i % cols, r = Math.floor(i / cols), g = GLYPHS[Math.floor(rnd(seed, i) * GLYPHS.length)];
      const col = hl?.(i) ?? color;
      return <text key={i} x={x + c * cell + cell / 2} y={y + r * cell + cell * 0.78} textAnchor="middle"
        fontFamily="DejaVu Sans" fontWeight={700} fontSize={cell * 0.8} fill={col}>{g}</text>;
    })}</g>
  );

/** handwriting-ish scribble lines standing in for unreadable text */
export const Scribble: React.FC<{ x: number; y: number; w: number; rows: number; gap: number; seed?: number; color?: string; sw?: number; reveal?: number }> =
  ({ x, y, w, rows, gap, seed = 4, color = "#3a3348", sw = 5, reveal = 1 }) => (
    <g>{Array.from({ length: rows }, (_, r) => {
      const len = w * (0.65 + 0.35 * rnd(seed, r)), segs = 14, pts: string[] = [];
      const shown = Math.max(0, Math.min(1, reveal * rows - r));
      if (shown <= 0) return null;
      for (let i = 0; i <= segs * shown; i++) pts.push(`${x + (len * i) / segs},${y + r * gap + Math.sin(i * 1.9 + r) * gap * 0.12}`);
      return <polyline key={r} points={pts.join(" ")} fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />;
    })}</g>
  );

export const Desk: React.FC<{ x: number; top: number; w: number; h?: number; color?: string }> = ({ x, top, w, h = 360, color = "#7a5236" }) => (
  <g>
    <rect x={x} y={top} width={w} height={34} fill={color} stroke={INK} strokeWidth={SW} />
    <rect x={x + 20} y={top + 34} width={w - 40} height={h} fill="#5e3e2a" stroke={INK} strokeWidth={SW} />
    <rect x={x + w * 0.55} y={top + 70} width={w * 0.35} height={70} fill="#6d4a33" stroke={INK} strokeWidth={SW * 0.8} />
    <circle cx={x + w * 0.725} cy={top + 105} r={9} fill="#d9c27a" stroke={INK} strokeWidth={3} />
  </g>
);

export const RotaryPhone: React.FC<{ x: number; y: number; s?: number; shake?: number; handset?: boolean; color?: string }> =
  ({ x, y, s = 1, shake = 0, handset = true, color = "#1c1b21" }) => {
    const k = (v: number) => v * s, dx = shake * Math.sin(shake * 40) * k(6);
    return (<g transform={`translate(${x + dx} ${y}) rotate(${shake * Math.sin(shake * 33) * 4})`}>
      <path d={`M ${k(-110)} 0 L ${k(-80)} ${k(-90)} L ${k(80)} ${k(-90)} L ${k(110)} 0 Z`} fill={color} stroke={INK} strokeWidth={SW} strokeLinejoin="round" />
      <circle cx={0} cy={k(-45)} r={k(36)} fill="#e9e4d6" stroke={INK} strokeWidth={SW * 0.8} />
      {Array.from({ length: 10 }, (_, i) => <circle key={i} cx={Math.cos(i * 0.55 - 1) * k(24)} cy={k(-45) + Math.sin(i * 0.55 - 1) * k(24)} r={k(5)} fill="#bdb6a4" />)}
      {handset && <path d={`M ${k(-120)} ${k(-100)} Q 0 ${k(-150)} ${k(120)} ${k(-100)} L ${k(120)} ${k(-80)} Q 0 ${k(-125)} ${k(-120)} ${k(-80)} Z`} fill={color} stroke={INK} strokeWidth={SW} strokeLinejoin="round" />}
    </g>);
  };

/** soft drifting fog bank */
export const Fog: React.FC<{ f: number; y: number; color?: string; opacity?: number; speed?: number }> = ({ f, y, color = "#8ea0c8", opacity = 0.35, speed = 1.2 }) => (
  <g opacity={opacity} style={{ filter: "blur(40px)" }}>
    {[0, 1, 2, 3, 4].map(i => (
      <ellipse key={i} cx={((i * 380 + f * speed * (i % 2 ? 1 : -0.7)) % (W + 800)) - 400} cy={y + (i % 3) * 60} rx={420} ry={90} fill={color} />
    ))}
  </g>
);

export const Water: React.FC<{ y: number; color?: string; f?: number; shine?: string }> = ({ y, color = "#1d3a5c", f = 0, shine = "#ffcf8a" }) => (
  <g>
    <rect x={-600} y={y} width={W + 1200} height={H - y + 800} fill={color} />
    <line x1={-600} y1={y} x2={W + 600} y2={y} stroke={INK} strokeWidth={SW} />
    {Array.from({ length: 16 }, (_, i) => {
      const yy = y + 40 + i * 48, xx = ((i * 173 + f * 1.5) % (W + 400)) - 200;
      return <line key={i} x1={xx} y1={yy} x2={xx + 120 + (i % 3) * 40} y2={yy} stroke={shine} strokeWidth={5} opacity={0.35} strokeLinecap="round" />;
    })}
  </g>
);

/** simplified California outline in a 600 x 900 box (approximate, for a stylised map) */
export const CALIFORNIA = "M 40 0 L 330 0 L 330 280 L 560 640 L 575 700 L 560 760 L 578 862 L 340 880 L 320 840 L 290 780 L 245 735 L 200 700 L 150 665 L 128 640 L 112 590 L 92 520 L 80 470 L 62 430 L 46 400 L 30 372 L 20 330 L 8 270 L 0 200 L 4 150 L 14 100 L 30 40 Z";
