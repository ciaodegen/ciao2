import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame } from "remotion";
import { at, buildCaptions, Camera, Captions, clamp01, FadeIn, INK, lerp, ramp, rnd, Stamp, Toon, Vignette, W, Word } from "../lib/core";
import { Desk, Glyphs, Paper, Scribble, Svg, ZodiacSymbol } from "../lib/props";
import type { Outfit } from "../lib/toon";
import { blink, folk } from "./Part1";
import wordsJson from "./part3_words.json";

const WORDS = (wordsJson as { words: Word[] }).words;
export const PART3_FRAMES = 1620;

const AGENT: Outfit = { jacket: "#2f3440", pants: "#23262f", boots: INK, hat: "fedora", cap: "#3d3a44", skin: "#f5c9a0" };
const NERD: Outfit = { jacket: "#e9e4d6", pants: "#3b3f52", boots: "#3a2a22", hat: "hair", hair: "#3a2c24", skin: "#ffe2c2", glasses: true };
const SOLVERS: Outfit[] = [
  { jacket: "#3f6fb5", pants: "#3b3f52", boots: "#3a2a22", hat: "hair", hair: "#5a4a3a", skin: "#ffe2c2", glasses: true },
  { jacket: "#5d7a3a", pants: "#3b3f52", boots: "#3a2a22", hat: "hair", hair: "#b98a4a", skin: "#f5c9a0" },
  { jacket: "#8c3b4a", pants: "#3b3f52", boots: "#3a2a22", hat: "hair", hair: "#2a201a", skin: "#ecd0b6", glasses: true },
];

/** The 13-symbol "My name is" cipher, after the commonly published transcription. */
const Z13: string[] = ["A", "E", "N", "⊕", "8o", "K", "8o", "M", "8o", "⊥", "N", "A", "M"];
const Z13Glyph: React.FC<{ g: string; x: number; y: number; s: number; color?: string }> = ({ g, x, y, s, color = "#1d1830" }) => {
  if (g === "⊕") return <ZodiacSymbol x={x} y={y - s * 0.3} r={s * 0.3} color={color} sw={s * 0.07} ink={false} />;
  if (g === "8o") return (<g>
    <circle cx={x} cy={y - s * 0.3} r={s * 0.36} fill="none" stroke={color} strokeWidth={s * 0.06} />
    <text x={x} y={y - s * 0.08} textAnchor="middle" fontFamily="DejaVu Sans" fontWeight={700} fontSize={s * 0.55} fill={color}>8</text>
  </g>);
  return <text x={x} y={y} textAnchor="middle" fontFamily="DejaVu Sans" fontWeight={700} fontSize={s * 0.8} fill={color}>{g}</text>;
};
const Z13Row: React.FC<{ x: number; y: number; cell: number; count?: number; color?: string }> = ({ x, y, cell, count = 13, color }) => (
  <g>{Z13.slice(0, count).map((g, i) => <Z13Glyph key={i} g={g} x={x + i * cell + cell / 2} y={y} s={cell} color={color} />)}</g>
);

const Flag: React.FC<{ kind: "us" | "au" | "be"; x: number; y: number; w: number }> = ({ kind, x, y, w }) => {
  const h = w * 0.6;
  if (kind === "be") return (<g transform={`translate(${x} ${y})`}>
    {["#1b1a1d", "#f2c230", "#d6242c"].map((c, i) => <rect key={i} x={(i * w) / 3} y={0} width={w / 3} height={h} fill={c} />)}
    <rect x={0} y={0} width={w} height={h} fill="none" stroke={INK} strokeWidth={6} />
  </g>);
  if (kind === "us") return (<g transform={`translate(${x} ${y})`}>
    {Array.from({ length: 7 }, (_, i) => <rect key={i} x={0} y={(i * h) / 7} width={w} height={h / 7} fill={i % 2 ? "#f4f1ea" : "#c4242c"} />)}
    <rect x={0} y={0} width={w * 0.42} height={h * 0.55} fill="#27406e" />
    {Array.from({ length: 12 }, (_, i) => <circle key={i} cx={w * 0.06 + (i % 4) * w * 0.1} cy={h * 0.08 + Math.floor(i / 4) * h * 0.17} r={w * 0.018} fill="#fff" />)}
    <rect x={0} y={0} width={w} height={h} fill="none" stroke={INK} strokeWidth={6} />
  </g>);
  return (<g transform={`translate(${x} ${y})`}>
    <rect x={0} y={0} width={w} height={h} fill="#22346e" />
    <line x1={0} y1={0} x2={w / 2} y2={h / 2} stroke="#fff" strokeWidth={w * 0.05} /><line x1={w / 2} y1={0} x2={0} y2={h / 2} stroke="#fff" strokeWidth={w * 0.05} />
    <line x1={w / 4} y1={0} x2={w / 4} y2={h / 2} stroke="#c4242c" strokeWidth={w * 0.04} /><line x1={0} y1={h / 4} x2={w / 2} y2={h / 4} stroke="#c4242c" strokeWidth={w * 0.04} />
    {[[0.25, 0.76, 0.07], [0.75, 0.2, 0.035], [0.65, 0.45, 0.035], [0.85, 0.5, 0.035], [0.75, 0.8, 0.035]].map(([a, b, r], i) =>
      <circle key={i} cx={w * a} cy={h * b} r={w * r} fill="#fff" />)}
    <rect x={0} y={0} width={w} height={h} fill="none" stroke={INK} strokeWidth={6} />
  </g>);
};

/** A: the 340 — unsolved for 51 years */
const OpenCode: React.FC<{ s0: number }> = ({ s0 }) => {
  const f = useCurrentFrame(), L = (t: number) => at(t) - s0;
  return (
    <Camera keys={[{ f: 0, z: 1.18, y: 900 }, { f: 84, z: 1.05, y: 960 }]} kicks={[L(1.62)]}>
      <AbsoluteFill style={{ background: "radial-gradient(circle at 50% 45%, #2a2436 0%, #0d0a12 85%)" }} />
      <Svg><Paper x={540} y={960} w={940} h={1180} rot={1}><Glyphs x={-442} y={-560} cols={17} rows={20} cell={52} seed={340} /></Paper></Svg>
      <AbsoluteFill style={{ background: "#000", opacity: 0.35 }} />
      <Stamp text="51 YEARS" at={L(1.62)} y={760} size={190} />
      <Stamp text="PART 3" at={1} y={230} size={110} color="#ffd23f" rot={-4} />
    </Camera>
  );
};

/** B: the FBI tried, codebreakers tried, thousands of amateurs tried */
const TriedShot: React.FC<{ s0: number }> = ({ s0 }) => {
  const f = useCurrentFrame(), L = (t: number) => at(t) - s0;
  const c1 = L(4.3), c2 = L(5.5);
  const years = ["1975", "1984", "1993", "2002", "2011"];
  const yi = Math.min(years.length - 1, Math.floor(clamp01(f / 130) * years.length));
  const yearTag = <div style={{ position: "absolute", top: 150, width: W, textAlign: "center", fontFamily: "Anton", fontSize: 120, color: "#ffd23f",
    WebkitTextStroke: "14px #000", paintOrder: "stroke fill" }}>{years[yi]}</div>;
  if (f < c1) return (
    <Camera keys={[{ f: 0, z: 1.1, y: 960 }, { f: c1, z: 1.22, y: 920 }]} kicks={[L(3.03)]}>
      <AbsoluteFill style={{ background: "#2c3a4e" }} />
      <Svg>
        <rect x={140} y={420} width={800} height={150} rx={14} fill="#141a2b" stroke={INK} strokeWidth={6} />
        <text x={540} y={530} textAnchor="middle" fontFamily="Anton" fontSize={110} fill="#e8c45a" letterSpacing={20}>F B I</text>
      </Svg>
      <Toon outfit={AGENT} x={540} y={1760} h={1250} opts={{ mode: "stand", prop: "paper", expr: "stern", seed: 101, blink: blink(f, 1) }} />
      <Svg><Desk x={40} top={1420} w={1000} h={520} /></Svg>
      {yearTag}
      <Vignette strength={0.5} />
    </Camera>
  );
  if (f < c2) return (
    <Camera keys={[{ f: c1, z: 1.1, y: 960 }, { f: c2, z: 1.2, y: 930 }]} kicks={[c1]}>
      <AbsoluteFill style={{ background: "#3a3448" }} />
      <Svg>
        {[0, 1, 2, 3].map(i => <g key={i} transform={`translate(${60 + i * 250} 380)`}>
          <rect x={0} y={0} width={210} height={760} fill="#c9ccd2" stroke={INK} strokeWidth={6} />
          {[0, 1].map(k => <g key={k}><circle cx={60 + k * 90} cy={120} r={50} fill="#2a2a30" stroke={INK} strokeWidth={5} />
            <line x1={60 + k * 90} y1={120} x2={60 + k * 90 + 40 * Math.cos(f * 0.4 + k)} y2={120 + 40 * Math.sin(f * 0.4 + k)} stroke="#c9ccd2" strokeWidth={6} /></g>)}
          {Array.from({ length: 6 }, (_, r) => <circle key={r} cx={40 + (r % 3) * 65} cy={300 + Math.floor(r / 3) * 60} r={14} fill={rnd(i, r + Math.floor(f / 4)) > 0.5 ? "#ff5a5a" : "#5aff8a"} stroke={INK} strokeWidth={4} />)}
        </g>)}
      </Svg>
      <Toon outfit={NERD} x={540} y={1790} h={1200} opts={{ mode: "stand", prop: "scratch", expr: "nervous", seed: 102, blink: blink(f, 2) }} />
      {yearTag}
      <Vignette strength={0.5} />
    </Camera>
  );
  return (
    <Camera keys={[{ f: c2, z: 1.0, y: 960 }, { f: 132, z: 1.12, y: 960 }]} kicks={[c2]}>
      <AbsoluteFill style={{ background: "#7fb2e6" }} />
      <Svg><rect x={0} y={1250} width={W} height={700} fill="#9a9488" /></Svg>
      {[0, 1, 2, 3, 4, 5, 6, 7, 8].map(i => {
        const row = Math.floor(i / 3), col = i % 3;
        return <Toon key={i} outfit={folk(i + 3)} x={190 + col * 350 + (row % 2) * 60} y={1050 + row * 330} h={620} opts={{ mode: "stand", prop: i % 2 ? "newspaper" : "scratch", expr: i % 3 ? "nervous" : "stern", seed: 120 + i, blink: blink(f, i) }} />;
      })}
      {yearTag}
      <Vignette strength={0.4} />
    </Camera>
  );
};

/** C: 2020 — three amateurs on a video call crack it */
const CrackedShot: React.FC<{ s0: number }> = ({ s0 }) => {
  const f = useCurrentFrame(), L = (t: number) => at(t) - s0;
  const cracked = f >= L(10.14);
  const flags: ("us" | "au" | "be")[] = ["us", "au", "be"];
  const fl = [L(11.51), L(12.06), L(12.84)];
  return (
    <Camera keys={[{ f: 0, z: 1.0 }, { f: 201, z: 1.06 }]} kicks={[L(7.89), L(10.14), ...fl]}>
      <AbsoluteFill style={{ background: "#151a26" }} />
      {[0, 1, 2].map(i => (
        <div key={i} style={{ position: "absolute", left: 40, top: 60 + i * 600, width: W - 80, height: 560, overflow: "hidden", borderRadius: 28, border: `10px solid ${f >= fl[i] ? "#5aff8a" : INK}` }}>
          <AbsoluteFill style={{ background: ["#c98b5a", "#a7b6c9", "#b9a0c9"][i] }} />
          <Toon outfit={SOLVERS[i]} x={300} y={1050} h={1050} opts={{ mode: "stand", expr: cracked ? (i === 1 ? "laugh" : "grin") : "stern", seed: 130 + i, blink: blink(f, i), facing: 1 }} />
          <svg width={W - 80} height={560} style={{ position: "absolute", left: 0, top: 0 }}>
            <rect x={560} y={160} width={360} height={260} rx={14} fill="#1b2438" stroke={INK} strokeWidth={6} />
            {cracked ? <text x={740} y={320} textAnchor="middle" fontFamily="Anton" fontSize={64} fill="#5aff8a">SOLVED</text>
              : <Glyphs x={580} y={185} cols={7} rows={4} cell={46} seed={150 + i} color="#9ab4ff" />}
            <rect x={600} y={420} width={280} height={30} fill="#9aa4a8" stroke={INK} strokeWidth={5} />
            {f >= fl[i] && <g transform={`translate(30 30) scale(${Math.min(1, (f - fl[i]) / 5)})`}><Flag kind={flags[i]} x={0} y={0} w={200} /></g>}
          </svg>
        </div>
      ))}
      <Stamp text="2020" at={L(7.89)} y={960} size={200} until={L(10.0)} />
      <Stamp text="CRACKED" at={L(10.14)} y={960} size={170} color="#2fd06a" until={L(11.4)} />
    </Camera>
  );
};

/** D: written diagonally, with a mistake inside */
const DiagShot: React.FC<{ s0: number }> = ({ s0 }) => {
  const f = useCurrentFrame(), L = (t: number) => at(t) - s0;
  const sweep = clamp01((f - L(16.0)) / (L(16.9) - L(16.0)));
  const err = f >= L(17.15), shift = ramp(f, L(17.6), L(18.2));
  const N = 9, cell = 100, x0 = 90, y0 = 470;
  return (
    <Camera keys={[{ f: 0, z: 1.0, y: 960 }, { f: L(17.0), z: 1.08, y: 940 }, { f: 141, z: 1.25, y: 900 }]} kicks={[L(17.15)]}>
      <AbsoluteFill style={{ background: "radial-gradient(circle at 50% 45%, #2a2436 0%, #0d0a12 85%)" }} />
      <Svg>
        <rect x={x0 - 30} y={y0 - 30} width={N * cell + 60} height={N * cell + 60} fill="#f6f0df" stroke={INK} strokeWidth={8} />
        {Array.from({ length: N * N }, (_, i) => {
          const r = Math.floor(i / N), c = i % N, d = (r + c) / (2 * N - 2);
          const on = sweep > 0 && d <= sweep && (r + c) % 2 === 0;
          const isErr = err && r === 4 && c === 6;
          const fill = isErr ? "#ff3b3b" : on ? "#ffd23f" : null;
          const dx = isErr ? lerp(0, cell, shift) : 0;
          return (<g key={i}>
            {fill && <rect x={x0 + c * cell + 6 + dx} y={y0 + r * cell + 6} width={cell - 12} height={cell - 12} rx={10} fill={fill} opacity={0.85} />}
            <Glyphs x={x0 + c * cell + dx} y={y0 + r * cell} cols={1} rows={1} cell={cell} seed={900 + i} />
          </g>);
        })}
        {f >= L(14.1) && f < L(15.9) && <text x={540} y={340} textAnchor="middle" fontFamily="Anton" fontSize={150} fill="#ffd23f" stroke={INK} strokeWidth={10} paintOrder="stroke">THE TRICK?</text>}
      </Svg>
      <Vignette strength={0.5} />
    </Camera>
  );
};

/** E: the decoded taunt — and again no name */
const TauntShot: React.FC<{ s0: number }> = ({ s0 }) => {
  const f = useCurrentFrame(), L = (t: number) => at(t) - s0;
  const msg = ["I HOPE YOU ARE", "HAVING LOTS OF", "FUN IN TRYING", "TO CATCH ME"];
  const total = msg.join(" ").length;
  const n = Math.round(clamp01((f - L(19.8)) / (L(22.5) - L(19.8))) * total);
  let used = 0;
  return (
    <Camera keys={[{ f: 0, z: 1.0, y: 960 }, { f: L(23.4), z: 1.1, y: 920 }, { f: 207, z: 1.2, y: 900 }]} kicks={[L(24.65)]}>
      <AbsoluteFill style={{ background: "radial-gradient(circle at 50% 40%, #3a2f20 0%, #0b0806 80%)" }} />
      <Svg>
        <circle cx={860} cy={1560} r={260} fill="#000" opacity={0.6} style={{ filter: "blur(30px)" }} />
        <Paper x={540} y={760} w={900} h={760} rot={-1} color="#f6eed6">
          <text x={0} y={-290} textAnchor="middle" fontFamily="Anton" fontSize={54} fill="#2a2140" letterSpacing={4}>Z340 — DECODED</text>
          {msg.map((ln, i) => {
            const show = Math.max(0, Math.min(ln.length, n - used)); used += ln.length + 1;
            return <text key={i} x={-380} y={-150 + i * 110} fontFamily="Special Elite" fontSize={80} fill="#1d1830">{ln.slice(0, show)}</text>;
          })}
        </Paper>
      </Svg>
      <Toon outfit={{ jacket: "#3b3846", pants: "#26242e", boots: "#0b0a0e", hat: "hood", skin: "#d8c2ae" }} x={860} y={1980} h={900} filter="brightness(0.7)"
        opts={{ mode: "stand", facing: -1, seed: 5, light: -2.2 }} style={{ opacity: ramp(f, L(22.0), L(22.6)) }} />
      <Stamp text="NO NAME" at={L(24.65)} y={1260} size={170} />
      <Vignette strength={0.55} />
    </Camera>
  );
};

/** F: the main suspect — no match — died 1992, never charged */
const SuspectShot: React.FC<{ s0: number }> = ({ s0 }) => {
  const f = useCurrentFrame(), L = (t: number) => at(t) - s0;
  const fp = ramp(f, L(29.6), L(29.9)), hw = ramp(f, L(30.3), L(30.6));
  return (
    <Camera keys={[{ f: 0, z: 1.05, y: 960 }, { f: L(29.5), z: 1.1, y: 900 }, { f: L(31.0), z: 1.0, y: 1000 }, { f: 288, z: 1.08, y: 980 }]} kicks={[L(27.77), L(31.2), L(32.7), L(33.83)]}>
      <AbsoluteFill style={{ background: "#3d4a3a" }} />
      <Svg>
        <path d="M 120 260 L 420 260 L 460 310 L 960 310 L 960 1200 L 120 1200 Z" fill="#d9b87a" stroke={INK} strokeWidth={8} strokeLinejoin="round" />
        <text x={180} y={400} fontFamily="Anton" fontSize={84} fill="#5a3a1a" letterSpacing={6}>SUSPECT FILE</text>
        <rect x={180} y={460} width={300} height={380} fill="#2a2630" stroke={INK} strokeWidth={6} />
        <circle cx={330} cy={580} r={80} fill="#4a4652" /><path d="M 210 840 Q 330 640 450 840 Z" fill="#4a4652" />
        <text x={400} y={700} textAnchor="middle" fontFamily="Anton" fontSize={160} fill="#ffd23f" stroke={INK} strokeWidth={8} paintOrder="stroke">?</text>
        {f >= L(27.7) && <g opacity={ramp(f, L(27.7), L(28.0))}>
          <text x={520} y={540} fontFamily="Special Elite" fontSize={52} fill="#2a2140">ARTHUR</text>
          <text x={520} y={610} fontFamily="Special Elite" fontSize={52} fill="#2a2140">LEIGH</text>
          <text x={520} y={680} fontFamily="Special Elite" fontSize={52} fill="#2a2140">ALLEN</text>
        </g>}
        <Scribble x={180} y={920} w={720} rows={4} gap={60} seed={17} color="#6a5030" />
        {fp > 0 && <g transform={`translate(${lerp(-400, 290, fp)} 1380) rotate(-5)`}>
          <rect x={-200} y={-180} width={400} height={360} fill="#f4f1ea" stroke={INK} strokeWidth={6} />
          {Array.from({ length: 9 }, (_, i) => <ellipse key={i} cx={0} cy={0} rx={30 + i * 15} ry={40 + i * 15} fill="none" stroke="#2a2630" strokeWidth={6} strokeDasharray={`${40 + i * 6} 12`} />)}
          <text x={0} y={-140} textAnchor="middle" fontFamily="Anton" fontSize={34} fill="#2a2630">FINGERPRINTS</text>
        </g>}
        {hw > 0 && <g transform={`translate(${lerp(1480, 790, hw)} 1380) rotate(4)`}>
          <rect x={-200} y={-180} width={400} height={360} fill="#f4f1ea" stroke={INK} strokeWidth={6} />
          <Scribble x={-170} y={-90} w={340} rows={5} gap={55} seed={33} color="#2a2140" />
          <text x={0} y={-140} textAnchor="middle" fontFamily="Anton" fontSize={34} fill="#2a2630">HANDWRITING</text>
        </g>}
        {f >= L(31.2) && [290, 790].map(x => <g key={x} opacity={ramp(f, L(31.2), L(31.2) + 4)}>
          <line x1={x - 150} y1={1240} x2={x + 150} y2={1520} stroke="#e2262d" strokeWidth={26} strokeLinecap="round" />
          <line x1={x + 150} y1={1240} x2={x - 150} y2={1520} stroke="#e2262d" strokeWidth={26} strokeLinecap="round" />
        </g>)}
      </Svg>
      <Stamp text="NO MATCH" at={L(31.2)} y={1080} size={130} until={L(32.6)} />
      <Stamp text="1992" at={L(32.7)} y={800} x={720} size={170} rot={6} />
      <Stamp text="NEVER CHARGED" at={L(33.83)} y={1080} size={110} />
      <Vignette strength={0.45} />
    </Camera>
  );
};

/** G: 1974 — "Me 37, SFPD 0" — police confirm five */
const ScoreShot: React.FC<{ s0: number }> = ({ s0 }) => {
  const f = useCurrentFrame(), L = (t: number) => at(t) - s0;
  const board = ramp(f, L(37.0), L(37.6));
  const n = Math.round(37 * clamp01((f - L(37.9)) / 10));
  const five = f >= L(40.18);
  return (
    <Camera keys={[{ f: 0, z: 1.0, y: 960 }, { f: 192, z: 1.1, y: 940 }]} kicks={[L(35.43), L(38.09), L(40.18)]}>
      <AbsoluteFill style={{ background: "radial-gradient(circle at 50% 45%, #2a2436 0%, #0d0a12 85%)" }} />
      <Svg>
        <Paper x={540} y={lerp(960, 1560, board)} w={760} h={900} rot={-3} color="#f3ecd8">
          <Scribble x={-320} y={-360} w={640} rows={10} gap={70} seed={74} />
        </Paper>
        {board > 0 && <g transform={`translate(540 ${lerp(-600, 640, board)})`}>
          <rect x={-460} y={-300} width={920} height={600} rx={30} fill="#141820" stroke={INK} strokeWidth={10} />
          <rect x={-430} y={-270} width={860} height={540} rx={20} fill="#1d2330" />
          <text x={-220} y={-170} textAnchor="middle" fontFamily="Anton" fontSize={70} fill="#f4f1ea" letterSpacing={4}>ME</text>
          <text x={220} y={-170} textAnchor="middle" fontFamily="Anton" fontSize={70} fill="#f4f1ea" letterSpacing={4}>SFPD</text>
          <text x={-220} y={150} textAnchor="middle" fontFamily="Anton" fontSize={260} fill="#ff3b3b" style={{ filter: "drop-shadow(0 0 16px #ff2a2a)" }}>{n}</text>
          <text x={220} y={150} textAnchor="middle" fontFamily="Anton" fontSize={260} fill="#ffd23f" style={{ filter: "drop-shadow(0 0 16px #ffc02a)" }}>0</text>
          <line x1={0} y1={-240} x2={0} y2={240} stroke="#3a4256" strokeWidth={8} />
        </g>}
        {five && <g opacity={ramp(f, L(40.18), L(40.18) + 5)}>
          <rect x={160} y={1420} width={760} height={180} rx={24} fill="#f4f1ea" stroke={INK} strokeWidth={8} />
          <text x={540} y={1545} textAnchor="middle" fontFamily="Anton" fontSize={110} fill="#2a2630" letterSpacing={4}>CONFIRMED: 5</text>
        </g>}
      </Svg>
      <Stamp text="1974" at={L(35.43)} y={260} size={170} until={L(37.6)} />
      <Vignette strength={0.5} />
    </Camera>
  );
};

/** H: the 13-symbol cipher — "My name is..." */
const Z13Shot: React.FC<{ s0: number }> = ({ s0 }) => {
  const f = useCurrentFrame(), L = (t: number) => at(t) - s0;
  const count = Math.round(13 * clamp01((f - L(43.25)) / (L(44.2) - L(43.25))));
  const hl = f >= L(46.0);
  return (
    <Camera keys={[{ f: 0, z: 1.0, y: 960 }, { f: L(45.9), z: 1.12, y: 900 }, { f: 171, z: 1.2, y: 880 }]} kicks={[L(43.63), L(46.05)]}>
      <AbsoluteFill style={{ background: "radial-gradient(circle at 50% 40%, #3a2f20 0%, #0b0806 80%)" }} />
      <Svg>
        <Paper x={540} y={900} w={980} h={820} rot={1} color="#f6eed6">
          <Scribble x={-420} y={-330} w={840} rows={2} gap={70} seed={13} />
          <rect x={-440} y={-220} width={560} height={110} rx={12} fill={hl ? "#ffd23f" : "none"} opacity={0.8} />
          <text x={-420} y={-140} fontFamily="Special Elite" fontSize={84} fill="#1d1830">My name is —</text>
          <Z13Row x={-403} y={70} cell={62} count={count} />
        </Paper>
      </Svg>
      {f >= L(43.63) && <div style={{ position: "absolute", top: 230, width: W, textAlign: "center", fontFamily: "Anton", fontSize: 130, color: "#ff3b3b",
        WebkitTextStroke: "14px #000", paintOrder: "stroke fill" }}>13 SYMBOLS</div>}
      <Vignette strength={0.5} />
    </Camera>
  );
};

/** I: 57 years later the case is still open — maybe the answer is right there. CAN YOU SOLVE IT? */
const OpenShot: React.FC<{ s0: number }> = ({ s0 }) => {
  const f = useCurrentFrame(), L = (t: number) => at(t) - s0;
  const push = ramp(f, L(50.2), L(52.0));
  const ask = f >= L(52.0);
  const bob = Math.sin(f * 0.25) * 18;
  return (
    <AbsoluteFill>
      <Camera keys={[{ f: 0, z: 1.0, y: 960 }, { f: L(50.2), z: 1.03, y: 950 }]} kicks={[L(47.26), L(49.45)]} creep={0.0003}>
        <AbsoluteFill style={{ background: "radial-gradient(circle at 50% 45%, #2a1418 0%, #0a0507 85%)" }} />
        <Svg>
          <ZodiacSymbol x={540} y={600} r={210} glow={0.4 + 0.2 * Math.sin(f * 0.2)} />
          <g transform={`translate(540 ${lerp(1010, 960, push)}) scale(${lerp(1, 1.08, push)}) translate(-540 -995)`}>
            <rect x={100} y={900} width={880} height={190} rx={20} fill="#f6eed6" stroke={INK} strokeWidth={8} />
            <Z13Row x={137} y={1035} cell={62} />
          </g>
          {ask && <g opacity={ramp(f, L(52.0), L(52.0) + 5)}>
            <path d={`M 540 ${1760 + bob} l -70 -80 h 45 v -110 h 50 v 110 h 45 z`} fill="#ffd23f" stroke={INK} strokeWidth={8} strokeLinejoin="round" />
          </g>}
        </Svg>
        <Stamp text="57 YEARS" at={L(47.26)} y={250} size={160} until={L(49.4)} />
        <Stamp text="CASE: OPEN" at={L(49.45)} y={250} size={150} color="#2fd06a" />
        <FadeIn n={3} />
        <Vignette strength={0.55} />
      </Camera>
      {ask && <div style={{ position: "absolute", top: 1420, width: W, textAlign: "center", whiteSpace: "nowrap", fontFamily: "Montserrat", fontWeight: 900, fontSize: 84, color: "#ffd23f",
        WebkitTextStroke: "18px #000", paintOrder: "stroke fill", transform: `scale(${lerp(0.7, 1, ramp(f, L(52.0), L(52.0) + 5))})` }}>CAN YOU SOLVE IT?</div>}
    </AbsoluteFill>
  );
};

const SHOTS: { from: number; to: number; C: React.FC<{ s0: number }> }[] = [
  { from: 0, to: 84, C: OpenCode },
  { from: 84, to: 216, C: TriedShot },
  { from: 216, to: 417, C: CrackedShot },
  { from: 417, to: 558, C: DiagShot },
  { from: 558, to: 765, C: TauntShot },
  { from: 765, to: 1053, C: SuspectShot },
  { from: 1053, to: 1245, C: ScoreShot },
  { from: 1245, to: 1416, C: Z13Shot },
  { from: 1416, to: PART3_FRAMES, C: OpenShot },
];

const CAPS = buildCaptions(WORDS, {
  merge: { 18: "2020", 66: ["Arthur Leigh Allen", 3], 79: "1992", 84: "1974", 106: ["My name is", 3] },
  replace: { 5: "51", 27: "U.S.", 88: "37", 93: "5", 101: "13", 109: "57" },
  yellow: [8, 10, 14, 23, 27, 28, 30, 32, 37, 51, 65, 66, 86, 99, 106, 116, 122],
  red: [5, 18, 40, 56, 60, 75, 79, 82, 84, 88, 93, 101, 109],
});

export const ZodiacPart3: React.FC<{ audio?: string }> = ({ audio = "zodiac/part3_voice.mp3" }) => (
  <AbsoluteFill style={{ background: "#000" }}>
    {SHOTS.map(({ from, to, C }) => (
      <Sequence key={from} from={from} durationInFrames={to - from} layout="none">
        <AbsoluteFill><C s0={from} /></AbsoluteFill>
      </Sequence>
    ))}
    <Captions words={CAPS} />
    {audio && <Audio src={staticFile(audio)} />}
  </AbsoluteFill>
);
