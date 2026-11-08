import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame } from "remotion";
import {
  at, buildCaptions, Camera, Captions, clamp01, FadeIn, Flash, H, INK, lerp, ramp, rnd, smoother, Stamp, Toon, Vignette, W, Wash, Word,
} from "../lib/core";
import {
  Building, Car, CALIFORNIA, Desk, Envelope, Fog, Glyphs, Ground, Hills, Moon, Paper, PhoneBooth, Pine, RotaryPhone, Scribble, Sky, Stars,
  StreetLamp, Svg, Tree, Water, ZodiacSymbol,
} from "../lib/props";
import type { Outfit } from "../lib/toon";
import wordsJson from "./part1_words.json";

const WORDS = (wordsJson as { words: Word[] }).words;
export const PART1_FRAMES = 1650;

// ---------------- cast ----------------
export const NIGHT = "brightness(0.8) saturate(0.82)";
export const ZODIAC: Outfit = { jacket: "#5d5970", pants: "#383644", boots: "#0b0a0e", hat: "hood", skin: "#d8c2ae" };
export const SHADOW: Outfit = { jacket: "#1b1922", pants: "#141218", boots: "#0b0a0e", hat: "fedora", cap: "#1c1a20", skin: "#2a2630" };
export const OFFICER: Outfit = { jacket: "#2a3a66", pants: "#1f2a48", boots: INK, hat: "police", buttons: "#e8c45a", skin: "#f5c9a0" };
export const REPORTERS: Outfit[] = [
  { jacket: "#7a6a58", pants: "#3b3f52", boots: "#3a2a22", hat: "fedora", cap: "#5b4a3c", skin: "#ffe2c2" },
  { jacket: "#4a5a7a", pants: "#2e3446", boots: "#2a2228", hat: "fedora", cap: "#3d3a44", skin: "#ecd0b6", moustache: "#4a3426" },
  { jacket: "#8c3b4a", pants: "#3b3f52", boots: "#3a2a22", hat: "fedora", cap: "#6b5a4a", skin: "#c99067" },
];
export const EDITOR: Outfit = { jacket: "#e9e4d6", pants: "#3b3f52", boots: "#3a2a22", hat: "hair", hair: "#6b6560", skin: "#f5c9a0", glasses: true, build: "stout" };
export const EXPERT: Outfit[] = [
  { jacket: "#2f3440", pants: "#23262f", boots: INK, hat: "hair", hair: "#3a2c24", skin: "#ffe2c2", glasses: true },
  { jacket: "#3b3040", pants: "#23262f", boots: INK, hat: "hair", hair: "#b9b2a8", skin: "#f5c9a0", moustache: "#9a948c", build: "stout" },
];
export const TEACHER: Outfit = { jacket: "#8a6a3c", pants: "#3b3f52", boots: "#3a2a22", hat: "hair", hair: "#3a2c24", skin: "#ffe2c2", glasses: true };
export const WIFE: Outfit = { jacket: "#c25a7a", pants: "#3b3f52", boots: "#5a3b2a", hat: "hair", hair: "#7a4a2a", skin: "#ffe2c2", glasses: true, dress: "#c25a7a" };
export const folk = (v: number): Outfit => {
  const coats = ["#3f6fb5", "#8c3b4a", "#5d7a3a", "#b5653f", "#2f5f6a", "#7b5ac9", "#a08a3a"];
  const skins = ["#ffe2c2", "#f5c9a0", "#ecd0b6", "#c99067", "#8d5a3a"];
  const hats = ["fedora", "hair", "cap", "hair", "fedora"] as const;
  return { jacket: coats[v % 7], pants: "#3b3f52", boots: "#4a3426", skin: skins[v % 5], hat: hats[v % 5], cap: ["#5b4a3c", "#c0353a", "#2f5f6a"][v % 3], hair: ["#3a2c24", "#7a4a2a", "#1e1a18"][v % 3] };
};
export const blink = (f: number, seed: number) => { const p = 40 + Math.floor(rnd(seed, 1) * 35); return (f + seed * 7) % p < 3; };

// ---------------- shots ----------------
/** S1 hook: red symbol slams out of the dark, 57 YEARS */
const Hook: React.FC = () => {
  const f = useCurrentFrame();
  const s = f < 4 ? 0 : f < 9 ? lerp(2.6, 0.95, smoother((f - 4) / 5)) : lerp(0.95, 1, clamp01((f - 9) / 4));
  return (
    <Camera keys={[{ f: 0, z: 1 }, { f: 87, z: 1.06 }]} kicks={[9]}>
      <AbsoluteFill style={{ background: "radial-gradient(circle at 50% 42%, #3a0d14 0%, #0a0609 55%, #030205 100%)" }} />
      <Svg>
        <Fog f={f} y={1500} color="#5a2030" opacity={0.35} />
        {s > 0 && <g transform={`translate(540 760) scale(${s}) translate(-540 -760)`}>
          <ZodiacSymbol x={540} y={760} r={250} glow={0.5 + 0.3 * Math.sin(f * 0.2)} />
        </g>}
      </Svg>
      <Stamp text="57 YEARS" at={12} y={330} size={190} />
      <Stamp text="UNSOLVED" at={40} y={1540} size={120} color="#f4f1ea" rot={4} />
      <Vignette strength={0.8} />
    </Camera>
  );
};

/** S2: the hooded figure turns to camera — "They call him... the Zodiac." */
const Reveal: React.FC<{ s0: number }> = ({ s0 }) => {
  const f = useCurrentFrame(), L = (t: number) => at(t) - s0;
  const turn = ramp(f, L(4.1), L(4.6));
  return (
    <Camera keys={[{ f: 0, z: 1.0, y: 1060 }, { f: L(4.4), z: 1.08, y: 1020 }, { f: 95, z: 1.2, y: 960 }]} kicks={[L(4.61)]}>
      <Svg>
        <Sky top="#05070f" bottom="#1b2440" />
        <Stars seed={4} n={40} y1={700} f={f} />
        <Building x={-60} base={1700} w={330} h={1250} color="#232a3d" seed={3} lit={0.2} cols={3} rows={6} />
        <Building x={800} base={1700} w={340} h={1100} color="#2a2738" seed={8} lit={0.25} cols={3} rows={5} />
        <Building x={300} base={1650} w={220} h={700} color="#1c2131" seed={11} lit={0.1} cols={2} rows={4} door={false} />
        <StreetLamp x={720} base={1700} h={760} />
        <circle cx={540} cy={900} r={420} fill="#6d7fb0" opacity={0.22} style={{ filter: "blur(60px)" }} />
        <Ground y={1700} color="#151a28" />
        <Fog f={f} y={1560} color="#7d8db5" opacity={0.3} />
      </Svg>
      <Toon outfit={ZODIAC} x={540} y={1560} h={1050} filter={NIGHT}
        opts={{ mode: "stand", facing: turn < 0.5 ? -1 : 0, look: turn < 0.5 ? -0.6 : 0, light: -2.2, seed: 5, tilt: lerp(-4, 0, turn) }} />
      <Svg>
                {f >= L(4.61) && <circle cx={540} cy={1050} r={150} fill="#ff3030" opacity={0.25 * clamp01(1 - (f - L(4.61)) / 20)} style={{ filter: "blur(30px)" }} />}
      </Svg>
      <Vignette strength={0.75} />
    </Camera>
  );
};

/** S3a: stylised California map, pin drops on the Bay Area, 1968 */
const MapShot: React.FC<{ s0: number }> = ({ s0 }) => {
  const f = useCurrentFrame(), L = (t: number) => at(t) - s0;
  const mx = 230, my = 470, k = 1.45, px = mx + 52 * k, py = my + 392 * k;
  const drop = ramp(f, L(6.25), L(6.25) + 7);
  return (
    <Camera keys={[{ f: 0, z: 1, x: 540, y: 960 }, { f: 75, z: 1.55, x: px + 60, y: py - 40 }]} kicks={[L(6.25) + 7, L(7.11)]}>
      <AbsoluteFill style={{ background: "radial-gradient(circle at 50% 45%, #183358 0%, #0b1730 70%, #070d1d 100%)" }} />
      <Svg>
        {Array.from({ length: 14 }, (_, i) => <line key={i} x1={0} y1={i * 150} x2={W} y2={i * 150} stroke="#24406a" strokeWidth={2} />)}
        {Array.from({ length: 9 }, (_, i) => <line key={`v${i}`} x1={i * 150} y1={0} x2={i * 150} y2={H} stroke="#24406a" strokeWidth={2} />)}
        <g transform={`translate(${mx} ${my}) scale(${k})`}>
          <path d={CALIFORNIA} fill="#d9c48f" stroke={INK} strokeWidth={6 / k} strokeLinejoin="round" />
          <path d="M 330 0 L 900 0 L 900 1000 L 578 862 L 575 700 L 560 640 L 330 280 Z" fill="#b6a273" stroke={INK} strokeWidth={6 / k} strokeLinejoin="round" opacity={0.6} />
        </g>
        <text x={mx + 250 * k} y={my + 520 * k} textAnchor="middle" fontFamily="Anton" fontSize={70} fill="#5a4a2a" letterSpacing={6}>CALIFORNIA</text>
        <text x={mx - 120} y={my + 600} textAnchor="middle" fontFamily="Anton" fontSize={44} fill="#3d6aa0" letterSpacing={4} transform={`rotate(-70 ${mx - 120} ${my + 600})`}>PACIFIC OCEAN</text>
        {drop > 0 && <g transform={`translate(${px} ${lerp(py - 700, py, drop)})`}>
          <path d="M 0 0 L -34 -80 A 42 42 0 1 1 34 -80 Z" fill="#e2262d" stroke={INK} strokeWidth={6} strokeLinejoin="round" />
          <circle cx={0} cy={-95} r={16} fill="#fff" stroke={INK} strokeWidth={4} />
        </g>}
        {drop >= 1 && [0, 1].map(i => { const d = (f - L(6.25) - 7 - i * 8) / 24; return d > 0 && d < 1 ?
          <ellipse key={i} cx={px} cy={py} rx={40 + d * 140} ry={(40 + d * 140) * 0.4} fill="none" stroke="#e2262d" strokeWidth={6} opacity={1 - d} /> : null; })}
      </Svg>
      <Stamp text="1968" at={L(7.11)} x={px + 60} y={py - 320} size={170} />
      <Vignette strength={0.6} />
    </Camera>
  );
};

/** S3b: a quiet country road at night, one parked car. Nothing violent shown. */
const RoadShot: React.FC<{ s0: number }> = ({ s0 }) => {
  const f = useCurrentFrame(), L = (t: number) => at(t) - s0;
  const pulse = clamp01(1 - Math.abs(f - L(9.45)) / 14);
  return (
    <Camera keys={[{ f: 0, z: 1, x: 540, y: 1000 }, { f: 78, z: 1.18, x: 600, y: 1080 }]} kicks={[L(9.4)]}>
      <Svg>
        <Sky top="#04060d" bottom="#1d2a4a" />
        <Stars seed={9} n={80} y1={900} f={f} />
        <Moon x={820} y={330} r={70} />
        <Hills base={1080} color="#121a2b" seed={5} amp={180} />
        <Hills base={1180} color="#172238" seed={8} amp={110} />
        <Ground y={1180} color="#1b2436" />
        <path d={`M 420 1180 L 660 1180 L 1500 ${H} L -400 ${H} Z`} fill="#262a33" stroke={INK} strokeWidth={6} />
        {[0, 1, 2, 3, 4].map(i => { const t = (i + ((f * 0.02) % 1)) / 5, y = 1180 + t * t * 760, w = 6 + t * 30;
          return <rect key={i} x={540 - w / 2} y={y} width={w} height={20 + t * 80} fill="#c9b884" opacity={0.7} />; })}
        {[0, 1, 2, 3, 4, 5].map(i => <rect key={i} x={140 - i * 60} y={1150 + i * 40} width={14 + i * 3} height={70 + i * 14} fill="#3b2f2a" stroke={INK} strokeWidth={4} />)}
        <Tree x={180} base={1190} s={0.9} color="#14261f" seed={4} />
        <Tree x={930} base={1200} s={1.1} color="#15281f" seed={6} />
        <Car x={700} base={1330} s={0.85} color="#8f9aa6" />
        <Fog f={f} y={1150} color="#6a7aa0" opacity={0.25} />
      </Svg>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 70% 55% at 50% 50%, rgba(160,0,0,0) 40%, rgba(160,0,10,0.75) 100%)", opacity: pulse }} />
      <Vignette strength={0.7} />
    </Camera>
  );
};

/** S4a: parking lot, 1969, headlights — hard cut to black on "again." */
const LotShot: React.FC<{ s0: number }> = ({ s0 }) => {
  const f = useCurrentFrame(), L = (t: number) => at(t) - s0;
  const beams = f < L(12.05) ? 0 : clamp01((f - L(12.05)) / 3);
  if (f >= L(12.48)) return <AbsoluteFill style={{ background: "#000" }} />;
  return (
    <Camera keys={[{ f: 0, z: 1.05, x: 540, y: 1100 }, { f: 40, z: 1.22, x: 560, y: 1120 }]} kicks={[L(12.05)]}>
      <Svg>
        <Sky top="#05070f" bottom="#1a2238" />
        <Stars seed={13} n={50} y1={800} f={f} />
        <Pine x={120} base={1120} s={1.2} />
        <Pine x={330} base={1100} s={0.9} />
        <Pine x={960} base={1110} s={1.3} />
        <Ground y={1120} color="#22252e" />
        {[0, 1, 2, 3].map(i => <line key={i} x1={80 + i * 300} y1={1240} x2={-40 + i * 360} y2={1700} stroke="#d8d2b8" strokeWidth={8} opacity={0.6} />)}
        <StreetLamp x={880} base={1180} h={620} on={f % 23 > 2} />
        <Car x={520} base={1420} s={1.05} color="#9a7a5a" lights={beams > 0} beams={beams} />
      </Svg>
      <Stamp text="1969" at={L(11.23)} y={420} size={180} />
      <Flash at={L(12.05)} len={5} color="#fff6d0" />
      <Vignette strength={0.7} />
    </Camera>
  );
};

/** S4b: hospital — "This time, one victim survives." */
const HospitalShot: React.FC<{ s0: number }> = ({ s0 }) => {
  const f = useCurrentFrame(), L = (t: number) => at(t) - s0;
  const signOn = f >= L(13.7), beat = f >= L(15.13);
  const ecg = clamp01((f - L(15.13)) / 18);
  const pts: string[] = [];
  for (let i = 0; i <= 60 * ecg; i++) { const x = 120 + i * 14, ph = i % 20; const y = 380 + (ph === 8 ? -120 : ph === 9 ? 90 : ph === 10 ? -30 : 0); pts.push(`${x},${y}`); }
  return (
    <Camera keys={[{ f: 0, z: 1.12, x: 540, y: 980 }, { f: 81, z: 1.0, x: 540, y: 960 }]} kicks={[L(15.13)]}>
      <Svg>
        <Sky top="#060912" bottom="#1d2742" />
        <Stars seed={21} n={40} y1={600} f={f} />
        <Building x={90} base={1300} w={900} h={820} color="#d9d3c4" seed={5} lit={beat ? 0.7 : 0.4} cols={6} rows={4} door={false} litColor="#fff0b8" />
        <rect x={390} y={1100} width={300} height={200} fill={signOn ? "#fff3c4" : "#3a3e4a"} stroke={INK} strokeWidth={6} />
        <rect x={300} y={960} width={480} height={86} rx={10} fill="#141a2b" stroke={INK} strokeWidth={6} />
        <text x={540} y={1026} textAnchor="middle" fontFamily="Anton" fontSize={64} letterSpacing={6} fill={signOn ? "#ff3b3b" : "#4a2a2a"}
          style={signOn ? { filter: "drop-shadow(0 0 14px #ff2a2a)" } : undefined}>EMERGENCY</text>
        <Ground y={1300} color="#2a2d36" />
        <g transform="translate(250 1500)">
          <rect x={-200} y={-200} width={400} height={170} rx={16} fill="#f2efe6" stroke={INK} strokeWidth={6} />
          <rect x={-40} y={-170} width={80} height={60} fill="#e2262d" stroke={INK} strokeWidth={4} />
          <rect x={-12} y={-182} width={24} height={84} fill="#e2262d" />
          <rect x={-30} y={-232} width={60} height={30} rx={6} fill={Math.floor(f / 5) % 2 ? "#ff3030" : "#3060ff"} stroke={INK} strokeWidth={4} />
          {[-120, 120].map(cx => <circle key={cx} cx={cx} cy={-30} r={38} fill="#16141a" stroke={INK} strokeWidth={6} />)}
        </g>
        <circle cx={250} cy={1280} r={160} fill={Math.floor(f / 5) % 2 ? "#ff3030" : "#3060ff"} opacity={0.18} style={{ filter: "blur(40px)" }} />
        {beat && <polyline points={pts.join(" ")} fill="none" stroke="#5cff8a" strokeWidth={10} strokeLinejoin="round" style={{ filter: "drop-shadow(0 0 10px #5cff8a)" }} />}
      </Svg>
      <FadeIn n={5} />
      <Vignette strength={0.6} />
    </Camera>
  );
};

/** S5a: police desk, phone rings, officer picks up — "Then he calls the police and confesses" */
const PoliceShot: React.FC<{ s0: number }> = ({ s0 }) => {
  const f = useCurrentFrame(), L = (t: number) => at(t) - s0;
  const pick = L(17.1), ring = f < pick ? 1 : 0;
  const expr = f >= L(17.66) ? "shock" : f >= pick ? "stern" : "neutral";
  return (
    <Camera keys={[{ f: 0, z: 1.05, x: 560, y: 1000 }, { f: pick, z: 1.12, x: 560, y: 980 }, { f: 66, z: 1.32, x: 560, y: 920 }]} kicks={[L(17.66)]}>
      <AbsoluteFill style={{ background: "#3a4a5e" }} />
      <Svg>
        <rect x={0} y={1380} width={W} height={600} fill="#4a3a30" />
        <rect x={620} y={300} width={360} height={420} fill="#0e1424" stroke={INK} strokeWidth={6} />
        {Array.from({ length: 9 }, (_, i) => <rect key={i} x={620} y={310 + i * 46} width={360} height={22} fill="#c9c2a8" stroke={INK} strokeWidth={3} />)}
        <circle cx={250} cy={420} r={95} fill="#f4f1ea" stroke={INK} strokeWidth={6} />
        <line x1={250} y1={420} x2={250} y2={355} stroke={INK} strokeWidth={8} strokeLinecap="round" />
        <line x1={250} y1={420} x2={300} y2={440} stroke={INK} strokeWidth={8} strokeLinecap="round" />
        <rect x={110} y={600} width={300} height={70} fill="#1f2c52" stroke={INK} strokeWidth={6} />
        <text x={260} y={650} textAnchor="middle" fontFamily="Anton" fontSize={44} fill="#e8c45a" letterSpacing={4}>POLICE</text>
      </Svg>
      <Toon outfit={OFFICER} x={540} y={1760} h={1300} opts={{ mode: "stand", expr, prop: f >= pick ? "phone" : null, seed: 3, blink: blink(f, 3), facing: 0 }} />
      <Svg>
        <Desk x={40} top={1300} w={1000} h={640} />
        <RotaryPhone x={760} y={1300} s={1.3} shake={ring ? (Math.floor(f / 3) % 2 ? 1 : 0.6) : 0} handset={f < pick} />
        <Paper x={330} y={1272} w={260} h={70} rot={-4} />
        {ring > 0 && f % 10 < 6 && <g>
          <text x={820} y={1080} textAnchor="middle" fontFamily="Anton" fontSize={96} fill="#ffd23f" stroke={INK} strokeWidth={8} paintOrder="stroke" transform="rotate(10 820 1080)">RING!</text>
          {[0, 1, 2].map(i => <line key={i} x1={880 + i * 40} y1={1190 - i * 30} x2={930 + i * 50} y2={1150 - i * 40} stroke="#ffd23f" strokeWidth={10} strokeLinecap="round" />)}
        </g>}
      </Svg>
      <Vignette strength={0.55} />
    </Camera>
  );
};

/** S5b: payphone at night; the caller hangs up and walks off; the police station is just down the street */
const PayphoneShot: React.FC<{ s0: number }> = ({ s0 }) => {
  const f = useCurrentFrame(), L = (t: number) => at(t) - s0;
  const hang = L(18.95), walk = clamp01((f - hang) / 50);
  return (
    <Camera keys={[{ f: 0, z: 1.5, x: 330, y: 1050 }, { f: L(19.4), z: 1.15, x: 520, y: 1000 }, { f: 75, z: 1.0, x: 600, y: 960 }]}>
      <Svg>
        <Sky top="#04060c" bottom="#1a2238" />
        <Stars seed={31} n={40} y1={600} f={f} />
        <Building x={-40} base={1500} w={420} h={900} color="#262b3c" seed={5} lit={0.3} cols={3} rows={5} />
        <Building x={720} base={1330} w={300} h={520} color="#33405e" seed={9} lit={0.6} cols={3} rows={3} sign="POLICE" signColor="#9cc8ff" litColor="#d6e8ff" />
        <Building x={470} base={1330} w={240} h={430} color="#222736" seed={14} lit={0.2} cols={2} rows={3} />
        <rect x={-600} y={1330} width={W + 1200} height={170} fill="#1d2230" />
        <Ground y={1500} color="#1a1e29" />
        <StreetLamp x={560} base={1500} h={700} />
        <PhoneBooth x={300} base={1520} s={1.25} lit doorOpen={walk > 0 ? 1 : 0} />
      </Svg>
      <Toon outfit={SHADOW} x={lerp(300, 980, walk)} y={1540} h={760} filter="brightness(0.55) saturate(0.6)"
        opts={{ mode: walk > 0 ? "stroll" : "stand", phase: f / 18, prop: f < hang ? "phone" : null, facing: walk > 0 ? 1 : -1, seed: 9, expr: "stern" }} />
      <Svg>
        <path d="M 760 1270 Q 700 1200 640 1250" fill="none" stroke="#9cc8ff" strokeWidth={8} strokeDasharray="20 18" opacity={ramp(f, L(19.2), L(19.6))} />
      </Svg>
      <Vignette strength={0.7} />
    </Camera>
  );
};

const PAPERS = ["CHRONICLE", "EXAMINER", "TIMES-HERALD"];
/** S6: three newspapers each get a letter; then three cipher pieces join into one */
const LettersShot: React.FC<{ s0: number }> = ({ s0 }) => {
  const f = useCurrentFrame(), L = (t: number) => at(t) - s0;
  const split = L(23.45);
  if (f < split) {
    return (
      <Camera keys={[{ f: 0, z: 1 }, { f: split, z: 1.0 }]} creep={0} kicks={[L(21.66) + 6, L(21.92) + 6, L(22.48) + 6]}>
        {[0, 1, 2].map(i => {
          const y0 = i * 640, land = L(21.66) + [0, 8, 22][i], t = ramp(f, land - 8, land + 2);
          return (
            <div key={i} style={{ position: "absolute", left: 0, top: y0, width: W, height: 640, overflow: "hidden", borderBottom: `10px solid ${INK}` }}>
              <AbsoluteFill style={{ background: ["#5b4a3c", "#3d4a5e", "#5a3b40"][i] }} />
              <svg width={W} height={640} style={{ position: "absolute" }}>
                <rect x={60} y={70} width={520} height={110} rx={10} fill="#141a2b" stroke={INK} strokeWidth={6} />
                <text x={320} y={150} textAnchor="middle" fontFamily="Anton" fontSize={72} fill="#f4e7c4" letterSpacing={4}>{PAPERS[i]}</text>
                {Array.from({ length: 4 }, (_, k) => <rect key={k} x={700 + (k % 2) * 160} y={40 + Math.floor(k / 2) * 150} width={130} height={120} fill="#c9c2a8" stroke={INK} strokeWidth={5} opacity={0.5} />)}
              </svg>
              <Toon outfit={REPORTERS[i]} x={i === 1 ? 760 : 330} y={1060} h={1050} opts={{ mode: "stand", expr: f > land ? "shock" : "neutral", seed: 11 + i, blink: blink(f, i), facing: i === 1 ? -1 : 1 }} />
              <svg width={W} height={640} style={{ position: "absolute" }}>
                <rect x={0} y={520} width={W} height={130} fill="#7a5236" stroke={INK} strokeWidth={6} />
                {t > 0 && <Envelope x={lerp(i === 1 ? -200 : 1300, i === 1 ? 420 : 680, t)} y={lerp(200, 500, t)} w={260} rot={lerp(i === 1 ? -40 : 40, i * 6 - 6, t)} />}
              </svg>
            </div>
          );
        })}
        <Vignette strength={0.4} />
      </Camera>
    );
  }
  const g = f - split, join = ramp(g, L(24.3) - split, L(25.0) - split);
  const pieces = [{ x0: -400, y0: 500 }, { x0: 1500, y0: 900 }, { x0: -300, y0: 1500 }];
  return (
    <Camera keys={[{ f: split, z: 1 }, { f: 150, z: 1.12 }]} kicks={[L(25.05)]}>
      <AbsoluteFill style={{ background: "radial-gradient(circle at 50% 45%, #3b3044 0%, #15111c 80%)" }} />
      <Svg>
        {pieces.map((p, i) => {
          const tin = ramp(g, i * 6, i * 6 + 14), ty = 640 + i * 250;
          const x = lerp(p.x0, 540, tin), y = lerp(p.y0, lerp(ty, 640 + i * 236, join), tin);
          return (
            <Paper key={i} x={x} y={y} w={760} h={join > 0.95 ? 238 : 220} rot={lerp([-8, 6, -4][i], 0, join)}>
              <Glyphs x={-350} y={-100} cols={17} rows={4} cell={41} seed={40 + i} />
            </Paper>
          );
        })}
      </Svg>
      <Vignette strength={0.6} />
    </Camera>
  );
};

/** S7: the demand letter, then the sweating editor */
const DemandShot: React.FC<{ s0: number }> = ({ s0 }) => {
  const f = useCurrentFrame(), L = (t: number) => at(t) - s0;
  const cut = L(29.1);
  if (f < cut) {
    const lines = ["I want you to print", "this cipher on the", "front page of your", "paper..."];
    const rev = ramp(f, L(27.2), L(28.7));
    return (
      <Camera keys={[{ f: 0, z: 1.02, x: 520, y: 900, r: -2 }, { f: cut, z: 1.14, x: 520, y: 860, r: -4 }]} kicks={[L(27.31)]}>
        <AbsoluteFill style={{ background: "#5e3e2a" }} />
        <Svg>
          <Envelope x={860} y={1500} w={360} rot={14} open={1} />
          <Paper x={520} y={980} w={820} h={1100} rot={-3} color="#f3ecd8">
            <text x={-340} y={-420} fontFamily="Special Elite" fontSize={56} fill="#2a2140">Dear Editor</text>
            {lines.map((ln, i) => {
              const n = Math.round(clamp01(rev * lines.length - i) * ln.length);
              return <text key={i} x={-340} y={-300 + i * 92} fontFamily="Special Elite" fontSize={62} fill="#2a2140">{ln.slice(0, n)}</text>;
            })}
            <Scribble x={-340} y={110} w={660} rows={4} gap={80} seed={8} reveal={rev} />
          </Paper>
        </Svg>
        <Vignette strength={0.55} />
      </Camera>
    );
  }
  const g = f - cut, red = clamp01(1 - Math.abs(f - L(29.6)) / 18);
  return (
    <Camera keys={[{ f: cut, z: 1.05, x: 540, y: 960 }, { f: 150, z: 1.22, x: 540, y: 900 }]} kicks={[L(29.56)]}>
      <AbsoluteFill style={{ background: "#4a3e5a" }} />
      <Svg>
        <rect x={80} y={180} width={360} height={520} fill="#c9c2a8" stroke={INK} strokeWidth={6} opacity={0.6} />
        <rect x={640} y={240} width={360} height={300} fill="#0e1424" stroke={INK} strokeWidth={6} />
      </Svg>
      <Toon outfit={EDITOR} x={540} y={1720} h={1300} opts={{ mode: "stand", expr: "nervous", prop: "paper", seed: 21, blink: blink(g, 5), headTilt: Math.sin(g * 0.6) * 1.5 }} />
      <Svg><Desk x={20} top={1420} w={1040} h={540} /></Svg>
      <AbsoluteFill style={{ background: "#c4001a", mixBlendMode: "multiply", opacity: 0.55 * red }} />
      <Vignette strength={0.6} />
    </Camera>
  );
};

/** S8: "This is the Zodiac speaking." typed out; then the name hits the front page */
const SpeakingShot: React.FC<{ s0: number }> = ({ s0 }) => {
  const f = useCurrentFrame(), L = (t: number) => at(t) - s0;
  const cut = L(35.05);
  if (f < cut) {
    const drop = ramp(f, L(31.2), L(31.2) + 8), open = ramp(f, L(31.7), L(32.3)), rise = ramp(f, L(32.2), L(32.75));
    const msg = "This is the Zodiac speaking.";
    const n = Math.round(clamp01((f - L(32.79)) / (L(34.4) - L(32.79))) * msg.length);
    const slam = L(33.37) + 6, ss = f < slam ? 0 : f < slam + 5 ? lerp(2.4, 0.95, smoother((f - slam) / 5)) : 1;
    return (
      <Camera keys={[{ f: 0, z: 1.0, y: 1000 }, { f: L(32.6), z: 1.0, y: 960 }, { f: cut, z: 1.2, y: 860 }]} kicks={[L(31.2) + 8, slam]}>
        <AbsoluteFill style={{ background: "radial-gradient(circle at 50% 40%, #2a2436 0%, #0d0a12 85%)" }} />
        <Svg>
          <g transform={`translate(0 ${lerp(-900, 0, drop)})`}>
            <Paper x={540} y={lerp(1300, 820, rise)} w={860} h={600} rot={-2}>
              <text x={0} y={-150} textAnchor="middle" fontFamily="Special Elite" fontSize={58} fill="#2a2140">Dear Editor</text>
              <text x={0} y={-30} textAnchor="middle" fontFamily="Special Elite" fontSize={66} fill="#1d1830">{msg.slice(0, Math.min(n, 15))}</text>
              <text x={0} y={70} textAnchor="middle" fontFamily="Special Elite" fontSize={66} fill="#1d1830">{n > 15 ? msg.slice(15, n) : ""}</text>
            </Paper>
            <Envelope x={540} y={1360} w={720} open={open} />
          </g>
          {ss > 0 && <g transform={`translate(540 1550) scale(${ss}) translate(-540 -1550)`} opacity={0.95}>
            <ZodiacSymbol x={540} y={1560} r={150} glow={0.6} />
          </g>}
        </Svg>
        <Vignette strength={0.6} />
      </Camera>
    );
  }
  const g = f - cut, spin = ramp(g, 0, 12);
  return (
    <Camera keys={[{ f: cut, z: 1 }, { f: 60, z: 1.12 }]} kicks={[cut + 12, L(35.76)]}>
      <AbsoluteFill style={{ background: "radial-gradient(circle at 50% 45%, #f2e3b0 0%, #a8874a 100%)" }} />
      <AbsoluteFill style={{ transform: `rotate(${lerp(720, -4, spin)}deg) scale(${lerp(0.05, 1, spin)})` }}>
        <Svg>
          <rect x={110} y={420} width={860} height={1100} fill="#efe9d8" stroke={INK} strokeWidth={8} />
          <text x={540} y={520} textAnchor="middle" fontFamily="Anton" fontSize={64} fill="#2a2630" letterSpacing={4}>THE DAILY NEWS</text>
          <line x1={150} y1={550} x2={930} y2={550} stroke={INK} strokeWidth={6} />
          <text x={540} y={760} textAnchor="middle" fontFamily="Anton" fontSize={230} fill="#c4161c" letterSpacing={6}>ZODIAC</text>
          <text x={540} y={850} textAnchor="middle" fontFamily="Anton" fontSize={64} fill="#2a2630" letterSpacing={3}>KILLER NAMES HIMSELF</text>
          <rect x={160} y={900} width={340} height={300} fill="#c9c2b0" stroke={INK} strokeWidth={6} />
          <ZodiacSymbol x={330} y={1050} r={90} color="#2a2630" />
          {Array.from({ length: 9 }, (_, i) => <line key={i} x1={540} y1={920 + i * 32} x2={920} y2={920 + i * 32} stroke="#8f8a80" strokeWidth={8} />)}
          {Array.from({ length: 8 }, (_, i) => <line key={`b${i}`} x1={160} y1={1250 + i * 32} x2={920} y2={1250 + i * 32} stroke="#8f8a80" strokeWidth={8} />)}
        </Svg>
      </AbsoluteFill>
      <Vignette strength={0.45} />
    </Camera>
  );
};

/** S9: the whole town tries to crack it */
const CrowdShot: React.FC<{ s0: number }> = ({ s0 }) => {
  const f = useCurrentFrame(), L = (t: number) => at(t) - s0;
  const crowd = [0, 1, 2, 3, 4, 5, 6];
  return (
    <Camera keys={[{ f: 0, z: 1.0, x: 540, y: 980 }, { f: L(38.9), z: 1.1, x: 540, y: 960 }, { f: 120, z: 1.65, x: 900, y: 760 }]}>
      <Svg>
        <Sky top="#7fb2e6" bottom="#d8e8f4" />
        <Building x={-80} base={1250} w={360} h={760} color="#c98b5a" seed={2} lit={0} cols={3} rows={4} roof="gable" />
        <Building x={300} base={1250} w={300} h={620} color="#d9c48f" seed={3} lit={0} cols={2} rows={3} />
        <Building x={640} base={1250} w={260} h={540} color="#a7b6c9" seed={4} lit={0} cols={2} rows={3} roof="gable" />
        <Building x={880} base={1250} w={200} h={300} color="#e9d6b0" seed={6} lit={1} cols={1} rows={1} roof="gable" door={false} litColor="#ffd98a" />
        <Ground y={1250} color="#9a9488" />
      </Svg>
      {crowd.map(i => {
        const x = 80 + i * 160 + (i % 2) * 30, y = 1330 + (i % 2) * 40, q = L(36.9) + i * 4;
        return <Toon key={i} outfit={folk(i)} x={x} y={y} h={560} opts={{ mode: "stand", prop: "newspaper", expr: f > q ? "nervous" : "neutral", seed: 30 + i, blink: blink(f, i + 3), facing: i % 3 === 0 ? 1 : i % 3 === 1 ? -1 : 0 }} />;
      })}
      {EXPERT.map((o, i) => (
        <Toon key={`e${i}`} outfit={o} x={i ? 940 : 140} y={1950} h={1050} opts={{ mode: "stand", prop: "scratch", expr: i ? "stern" : "nervous", seed: 50 + i, blink: blink(f, 9 + i), facing: i ? -1 : 1 }} />
      ))}
      <Svg>
        {crowd.map(i => {
          const q = L(36.9) + i * 4, d = f - q;
          if (d < 0) return null;
          const s = d < 5 ? lerp(0.2, 1.1, d / 5) : 1;
          const x = 80 + i * 160 + (i % 2) * 30, y = 1330 + (i % 2) * 40 - 470;
          return <text key={i} x={x} y={y} textAnchor="middle" fontFamily="Anton" fontSize={110 * s} fill="#ffd23f" stroke={INK} strokeWidth={8} paintOrder="stroke">?</text>;
        })}
      </Svg>
    </Camera>
  );
};

/** S10: a schoolteacher and his wife crack it at home in about a week */
const KitchenShot: React.FC<{ s0: number }> = ({ s0 }) => {
  const f = useCurrentFrame(), L = (t: number) => at(t) - s0;
  const win = f >= L(43.12);
  const day = Math.min(7, 1 + Math.floor(clamp01((f - L(42.6)) / (L(43.1) - L(42.6))) * 6));
  return (
    <Camera keys={[{ f: 0, z: 1.08, x: 540, y: 980 }, { f: 108, z: 1.2, x: 540, y: 930 }]} kicks={[L(43.12)]}>
      <AbsoluteFill style={{ background: "#c98b5a" }} />
      <Svg>
        {Array.from({ length: 12 }, (_, i) => <line key={i} x1={i * 100} y1={0} x2={i * 100} y2={1300} stroke="#b77a4c" strokeWidth={14} />)}
        <rect x={120} y={260} width={330} height={300} fill="#1b2a4a" stroke={INK} strokeWidth={8} />
        <line x1={285} y1={260} x2={285} y2={560} stroke={INK} strokeWidth={6} /><line x1={120} y1={410} x2={450} y2={410} stroke={INK} strokeWidth={6} />
        <circle cx={380} cy={330} r={34} fill="#fbf1cf" />
        <g transform="translate(800 400)">
          <rect x={-120} y={-150} width={240} height={290} fill="#f4f1ea" stroke={INK} strokeWidth={6} />
          <rect x={-120} y={-150} width={240} height={70} fill="#c4161c" stroke={INK} strokeWidth={6} />
          <text x={0} y={-100} textAnchor="middle" fontFamily="Anton" fontSize={44} fill="#fff">AUGUST</text>
          <text x={0} y={90} textAnchor="middle" fontFamily="Anton" fontSize={150} fill="#2a2630">{f < L(42.6) ? 1 : day}</text>
        </g>
        <rect x={0} y={1300} width={W} height={700} fill="#6d4a33" />
      </Svg>
      <Toon outfit={TEACHER} x={330} y={1740} h={1250} opts={{ mode: "stand", prop: "paper", expr: win ? "grin" : "stern", seed: 61, blink: blink(f, 2), facing: 1 }} />
      <Toon outfit={WIFE} x={760} y={1740} h={1180} opts={{ mode: "stand", prop: "cup", expr: win ? "relief" : "neutral", seed: 62, blink: blink(f, 4), facing: -1, look: -0.5 }} />
      <Svg>
        <rect x={-20} y={1420} width={W + 40} height={60} fill="#e9d6b0" stroke={INK} strokeWidth={6} />
        <rect x={0} y={1480} width={W} height={460} fill="#b98a5a" stroke={INK} strokeWidth={6} />
        <Paper x={540} y={1450} w={360} h={90} rot={3}><Glyphs x={-170} y={-40} cols={9} rows={2} cell={38} seed={77} /></Paper>
        <g transform="translate(860 1420)"><rect x={-45} y={-80} width={90} height={80} rx={10} fill="#f2efe6" stroke={INK} strokeWidth={6} />
          <path d="M 45 -60 Q 80 -40 45 -20" fill="none" stroke={INK} strokeWidth={8} /></g>
      </Svg>
      {win && <Stamp text="1 WEEK" at={L(43.12)} y={600} size={190} color="#e2262d" />}
      <Vignette strength={0.45} />
    </Camera>
  );
};

/** S11: the solved message — no name, and 18 letters nobody can read */
const MessageShot: React.FC<{ s0: number }> = ({ s0 }) => {
  const f = useCurrentFrame(), L = (t: number) => at(t) - s0;
  const down = L(47.9);
  const hlFrom = L(48.3);
  return (
    <Camera keys={[{ f: 0, z: 1.25, x: 540, y: 760 }, { f: L(46.4), z: 1.35, x: 540, y: 800 }, { f: down, z: 1.3, x: 540, y: 820 }, { f: down + 22, z: 1.45, x: 540, y: 1560 }, { f: 204, z: 1.52, x: 540, y: 1570 }]}
      kicks={[L(46.47), L(50.17)]}>
      <AbsoluteFill style={{ background: "radial-gradient(circle at 50% 50%, #3a2f20 0%, #0b0806 80%)" }} />
      <Svg>
        <circle cx={540} cy={960} r={760} fill="#ffdf9a" opacity={0.14} style={{ filter: "blur(80px)" }} />
        <Paper x={540} y={980} w={900} h={1300} rot={1} color="#f6eed6">
          <text x={0} y={-540} textAnchor="middle" fontFamily="Anton" fontSize={58} fill="#2a2140" letterSpacing={4}>SOLVED</text>
          <Scribble x={-380} y={-440} w={760} rows={11} gap={70} seed={12} color="#4a4060" sw={7} />
          <line x1={-400} y1={380} x2={400} y2={380} stroke="#b3a88a" strokeWidth={4} strokeDasharray="14 12" />
          <Glyphs x={-405} y={420} cols={9} rows={2} cell={90} seed={99}
            hl={(i) => f >= hlFrom + i * 1.5 ? "#c4161c" : null} />
        </Paper>
      </Svg>
      <AbsoluteFill style={{ background: "#7a0010", mixBlendMode: "multiply", opacity: 0.35 * ramp(f, L(45.0), L(45.6)) * (1 - ramp(f, L(46.3), L(46.6))) }} />
      <Stamp text="NO NAME" at={L(46.47)} y={760} size={170} />
      {f >= L(50.17) && <Stamp text="?" at={L(50.17)} y={560} size={420} box={false} rot={8} />}
      <Vignette strength={0.6} />
    </Camera>
  );
};

/** S12: dusk at a lake. A figure in a hood steps out of the trees. PART 2. */
const LakeShot: React.FC<{ s0: number }> = ({ s0 }) => {
  const f = useCurrentFrame(), L = (t: number) => at(t) - s0;
  const freeze = L(53.25), ff = Math.min(f, freeze);
  const step = clamp01((ff - L(51.6)) / (freeze - L(51.6)));
  const frozen = f >= freeze;
  return (
    <AbsoluteFill style={{ filter: frozen ? "saturate(0.35) contrast(1.15)" : undefined }}>
      <Camera keys={[{ f: 0, z: 1.0, x: 540, y: 960 }, { f: L(51.6), z: 1.05, x: 480, y: 980 }, { f: freeze, z: 1.25, x: 430, y: 920 }, { f: freeze + 4, z: 1.45, x: 430, y: 880 }]}
        kicks={[freeze]} creep={frozen ? 0 : 0.0012}>
        <Svg>
          <Sky top="#3d2a5c" bottom="#ffb36b" y1={1150} />
          <circle cx={760} cy={1060} r={90} fill="#ffcf9e" />
          <circle cx={760} cy={1060} r={200} fill="#ffcf9e" opacity={0.25} style={{ filter: "blur(30px)" }} />
          <Hills base={1130} color="#5a3f6a" seed={12} amp={160} />
          <Water y={1140} color="#3d3a6a" f={ff} shine="#ffcf9e" />
          <path d={`M -600 1500 Q 300 1420 1700 1560 L 1700 ${H + 400} L -600 ${H + 400} Z`} fill="#4a3a3a" stroke={INK} strokeWidth={6} />
          <rect x={560} y={1560} width={320} height={130} rx={10} fill="#d9c48f" stroke={INK} strokeWidth={6} transform="rotate(-3 720 1620)" />
        </Svg>
        <Toon outfit={ZODIAC} x={lerp(140, 400, step)} y={1640} h={980} filter="brightness(0.9)"
          opts={{ mode: step > 0 && !frozen ? "stroll" : "stand", phase: ff / 20, facing: 1, seed: 5, light: -0.4 }} />
        <Svg>
          <Pine x={60} base={1720} s={1.9} color="#2a2340" />
          <Pine x={-120} base={1760} s={2.2} color="#231d36" />
          <Tree x={190} base={1760} s={1.0} color="#2e2846" seed={7} />
        </Svg>
        <Vignette strength={0.6} color="20,8,30" />
      </Camera>
      {frozen && <Stamp text="PART 2" at={freeze + 3} y={420} size={200} color="#ffd23f" rot={-5} />}
      <Flash at={freeze} len={5} />
    </AbsoluteFill>
  );
};

// ---------------- timeline ----------------
const SHOTS: { from: number; to: number; C: React.FC<{ s0: number }> }[] = [
  { from: 0, to: 87, C: Hook as React.FC<{ s0: number }> },
  { from: 87, to: 180, C: Reveal },
  { from: 180, to: 255, C: MapShot },
  { from: 255, to: 333, C: RoadShot },
  { from: 333, to: 405, C: LotShot },
  { from: 405, to: 486, C: HospitalShot },
  { from: 486, to: 552, C: PoliceShot },
  { from: 552, to: 627, C: PayphoneShot },
  { from: 627, to: 777, C: LettersShot },
  { from: 777, to: 927, C: DemandShot },
  { from: 927, to: 1098, C: SpeakingShot },
  { from: 1098, to: 1218, C: CrowdShot },
  { from: 1218, to: 1326, C: KitchenShot },
  { from: 1326, to: 1530, C: MessageShot },
  { from: 1530, to: PART1_FRAMES, C: LakeShot },
];

const CAPS = buildCaptions(WORDS, {
  replace: { 1: "57", 119: "18" },
  merge: { 13: "1968" },
  yellow: [11, 33, 38, 40, 46, 52, 61, 80, 85, 89, 99, 106, 110, 123],
  red: [1, 13, 19, 72, 73, 115, 119, 133],
});

export const ZodiacPart1: React.FC<{ audio?: string }> = ({ audio = "zodiac/part1_voice.mp3" }) => (
  <AbsoluteFill style={{ background: "#000" }}>
    {SHOTS.map(({ from, to, C }) => (
      <Sequence key={from} from={from} durationInFrames={to - from} layout="none">
        <AbsoluteFill><C s0={from} /></AbsoluteFill>
      </Sequence>
    ))}
    <Sequence from={87} durationInFrames={8} layout="none"><Flash at={0} len={7} /></Sequence>
    <Captions words={CAPS} />
    {audio && <Audio src={staticFile(audio)} />}
  </AbsoluteFill>
);
