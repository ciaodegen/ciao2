import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame } from "remotion";
import { at, buildCaptions, Camera, Captions, clamp01, FadeIn, Flash, H, INK, lerp, ramp, smoother, Stamp, Toon, Vignette, W, Word } from "../lib/core";
import { Building, Car, Desk, Envelope, Glyphs, Ground, Hills, Paper, PhoneBooth, Pine, Scribble, Sky, Stars, StreetLamp, Svg, Tree, Water, ZodiacSymbol } from "../lib/props";
import type { Outfit } from "../lib/toon";
import { blink, NIGHT, ZODIAC } from "./Part1";
import wordsJson from "./part2_words.json";

const WORDS = (wordsJson as { words: Word[] }).words;
export const PART2_FRAMES = 1620;

const MUTED = "grayscale(0.75) brightness(0.95)";
const HIM: Outfit = { jacket: "#4a6a8a", pants: "#3b3f52", boots: "#3a2a22", hat: "hair", hair: "#3a2c24", skin: "#ffe2c2" };
const HER: Outfit = { jacket: "#c25a7a", pants: "#3b3f52", boots: "#5a3b2a", hat: "hair", hair: "#7a4a2a", skin: "#ffe2c2", dress: "#c2a05a" };
const SUSPECT: Outfit = { jacket: "#2e3240", pants: "#23262f", boots: INK, hat: "hair", hair: "#5a4a3a", skin: "#f5c9a0", glasses: true };
const TEENS: Outfit[] = [
  { jacket: "#e07a3a", pants: "#3b5b9a", boots: "#f4f1ea", hat: "hair", hair: "#3a2c24", skin: "#ffe2c2", build: "kid" },
  { jacket: "#5d7a3a", pants: "#3b3f52", boots: "#f4f1ea", hat: "hair", hair: "#7a4a2a", skin: "#f5c9a0", build: "kid" },
  { jacket: "#7b5ac9", pants: "#3b3f52", boots: "#f4f1ea", hat: "cap", cap: "#c0353a", skin: "#ecd0b6", build: "kid" },
];

/** shared dusk lake backdrop */
const LakeBg: React.FC<{ f: number; dusk?: number }> = ({ f, dusk = 0 }) => (
  <>
    <Sky top={dusk ? "#3d2a5c" : "#6d9fd6"} bottom={dusk ? "#ffb36b" : "#f6d9a8"} y1={1150} />
    <circle cx={800} cy={dusk ? 1040 : 420} r={80} fill={dusk ? "#ffcf9e" : "#fff4cf"} />
    <Hills base={1130} color={dusk ? "#5a3f6a" : "#7a8a5a"} seed={12} amp={170} />
    <Hills base={1150} color={dusk ? "#6a4a6a" : "#9a9a62"} seed={4} amp={90} />
    <Water y={1150} color={dusk ? "#3d3a6a" : "#3f6f9a"} f={f} shine={dusk ? "#ffcf9e" : "#e8f4ff"} />
  </>
);

/** A: close on the hood — "He wore a black hood... with his symbol on the chest." */
const HoodShot: React.FC<{ s0: number }> = ({ s0 }) => {
  const f = useCurrentFrame(), L = (t: number) => at(t) - s0;
  const glow = clamp01(1 - Math.abs(f - L(2.1)) / 25);
  return (
    <Camera keys={[{ f: 0, z: 1.12, y: 820 }, { f: L(1.9), z: 1.08, y: 900 }, { f: 108, z: 1.18, y: 960 }]} kicks={[L(2.04)]}>
      <Svg><LakeBg f={f} dusk={1} /><Pine x={950} base={1700} s={2.2} color="#2a2340" /><Pine x={80} base={1660} s={1.8} color="#2e2846" /></Svg>
      <Toon outfit={ZODIAC} x={540} y={1632} h={1400} opts={{ mode: "stand", facing: 0, seed: 5, light: -0.4 }} />
      <Svg>{glow > 0 && <circle cx={540} cy={985} r={170} fill="#fff" opacity={0.35 * glow} style={{ filter: "blur(40px)" }} />}</Svg>
      <Stamp text="PART 2" at={2} y={230} size={110} color="#ffd23f" rot={-4} until={100} />
      <Vignette strength={0.6} color="20,8,30" />
    </Camera>
  );
};

/** B: wide lake, SEPT 1969 */
const LakeWide: React.FC<{ s0: number }> = ({ s0 }) => {
  const f = useCurrentFrame(), L = (t: number) => at(t) - s0;
  return (
    <Camera keys={[{ f: 0, z: 1.0 }, { f: 75, z: 1.1, y: 1000 }]} kicks={[L(4.45)]}>
      <Svg>
        <LakeBg f={f} />
        <Tree x={180} base={1300} s={1.3} color="#3f6a3a" seed={3} />
        <Pine x={940} base={1320} s={1.4} color="#2f5a3a" />
        <path d={`M -600 1300 Q 400 1240 1700 1320 L 1700 ${H + 400} L -600 ${H + 400} Z`} fill="#b59a5a" stroke={INK} strokeWidth={6} />
      </Svg>
      <div style={{ position: "absolute", top: 560, width: W, textAlign: "center", fontFamily: "Anton", fontSize: 92, color: "#fff", letterSpacing: 6,
        WebkitTextStroke: "14px #000", paintOrder: "stroke fill", opacity: ramp(f, 2, 10) }}>LAKE BERRYESSA</div>
      <Stamp text="SEPT 1969" at={L(4.45)} y={360} size={150} />
      <FadeIn n={4} />
    </Camera>
  );
};

/** C + D: the picnic; a hooded figure approaches; cut to black on "attacks" */
const PicnicShot: React.FC<{ s0: number }> = ({ s0 }) => {
  const f = useCurrentFrame(), L = (t: number) => at(t) - s0;
  const come = ramp(f, L(8.6), L(9.6)), scared = f >= L(9.1);
  const rope = ramp(f, L(9.93), L(10.3));
  if (f >= L(11.25)) return <AbsoluteFill style={{ background: "#000" }} />;
  return (
    <Camera keys={[{ f: 0, z: 1.05, x: 600, y: 1050 }, { f: L(8.6), z: 1.12, x: 620, y: 1030 }, { f: L(11.2), z: 1.3, x: 520, y: 980 }]} kicks={[L(9.27), L(11.19)]}>
      <Svg>
        <LakeBg f={f} />
        <Tree x={120} base={1310} s={1.4} color="#3f6a3a" seed={5} />
        <path d={`M -600 1290 Q 400 1240 1700 1310 L 1700 ${H + 400} L -600 ${H + 400} Z`} fill="#b59a5a" stroke={INK} strokeWidth={6} />
        <path d="M 520 1560 L 1020 1530 L 1080 1690 L 470 1720 Z" fill="#d94a4a" stroke={INK} strokeWidth={6} strokeLinejoin="round" />
        {[0, 1, 2, 3].map(i => <line key={i} x1={520 + i * 140} y1={1560 - i * 8} x2={480 + i * 150} y2={1716 - i * 7} stroke="#f4f1ea" strokeWidth={10} opacity={0.7} />)}
      </Svg>
      <Toon outfit={HIM} x={650} y={1640} h={760} filter={MUTED} opts={{ mode: "sit", expr: scared ? "shock" : "smile", seed: 71, blink: blink(f, 1), facing: -1, look: scared ? -1 : 0 }} />
      <Toon outfit={HER} x={880} y={1630} h={720} filter={MUTED} opts={{ mode: "sit", expr: scared ? "shock" : "smile_closed", seed: 72, blink: blink(f, 2), facing: -1, look: scared ? -1 : 0 }} />
      {come > 0 && <Toon outfit={ZODIAC} x={lerp(-200, 330, come)} y={1660} h={1020} opts={{ mode: come < 1 ? "stroll" : "stand", phase: f / 18, facing: 1, seed: 5, light: -0.4 }} />}
      <Svg>
        {rope > 0 && <g opacity={rope} transform="translate(770 1700)">
          {[0, 1, 2].map(i => <ellipse key={i} cx={0} cy={-i * 10} rx={70 - i * 8} ry={26 - i * 3} fill="none" stroke={INK} strokeWidth={16} />)}
          {[0, 1, 2].map(i => <ellipse key={`r${i}`} cx={0} cy={-i * 10} rx={70 - i * 8} ry={26 - i * 3} fill="none" stroke="#c9a46a" strokeWidth={9} />)}
        </g>}
      </Svg>
      <AbsoluteFill style={{ background: "#000", opacity: 0.45 * come }} />
      <Flash at={L(11.19)} len={3} color="#b0000a" />
      <Vignette strength={0.6} />
    </Camera>
  );
};

/** E: hospital room — one empty bed, one survivor who describes the hood */
const WardShot: React.FC<{ s0: number }> = ({ s0 }) => {
  const f = useCurrentFrame(), L = (t: number) => at(t) - s0;
  const bubble = ramp(f, L(14.5), L(14.9));
  return (
    <Camera keys={[{ f: 0, z: 1.1, x: 330, y: 1000 }, { f: L(13.5), z: 1.05, x: 560, y: 980 }, { f: 105, z: 1.15, x: 640, y: 900 }]}>
      <AbsoluteFill style={{ background: "#b9c9c0" }} />
      <Svg>
        <rect x={0} y={1350} width={W} height={700} fill="#8a9a92" />
        <rect x={420} y={260} width={240} height={300} fill="#cfe4f0" stroke={INK} strokeWidth={6} />
        {[0, 1].map(i => <g key={i} transform={`translate(${i ? 760 : 200} 0)`}>
          <rect x={-170} y={1060} width={30} height={420} fill="#9aa4a8" stroke={INK} strokeWidth={6} />
          <rect x={-160} y={1220} width={340} height={70} rx={14} fill="#f4f1ea" stroke={INK} strokeWidth={6} />
          <rect x={-160} y={1290} width={340} height={40} fill="#9aa4a8" stroke={INK} strokeWidth={6} />
        </g>)}
        <g transform="translate(200 1215)" opacity={ramp(f, L(12.7), L(13.1))}>
          <rect x={-30} y={-110} width={60} height={110} rx={10} fill="#cfe4f0" stroke={INK} strokeWidth={5} />
          {[[-20, -150, "#e2626a"], [18, -165, "#f2c230"], [0, -185, "#e2626a"]].map(([x, y, c], i) =>
            <circle key={i} cx={x as number} cy={y as number} r={24} fill={c as string} stroke={INK} strokeWidth={5} />)}
        </g>
      </Svg>
      <Toon outfit={{ ...HIM, jacket: "#e9ecef" }} x={760} y={1700} h={900} filter={MUTED} opts={{ mode: "stand", expr: f >= L(13.65) ? "stern" : "dazed", seed: 71, blink: blink(f, 3), facing: -1 }} />
      <Svg>
        <path d="M 600 1230 Q 760 1180 940 1230 L 940 1330 L 600 1330 Z" fill="#dfe8ee" stroke={INK} strokeWidth={6} />
        {bubble > 0 && <g transform={`translate(560 560) scale(${0.6 + 0.4 * bubble})`} opacity={bubble}>
          <path d="M -230 -200 L 230 -200 Q 260 -200 260 -170 L 260 170 Q 260 200 230 200 L 60 200 L 120 290 L -10 200 L -230 200 Q -260 200 -260 170 L -260 -170 Q -260 -200 -230 -200 Z" fill="#fff" stroke={INK} strokeWidth={8} />
          <path d="M -90 -140 L 90 -140 L 110 -110 L 110 40 L 60 70 L 60 150 L -60 150 L -60 70 L -110 40 L -110 -110 Z" fill="#17151c" stroke={INK} strokeWidth={6} />
          <ellipse cx={-40} cy={-60} rx={26} ry={16} fill="#3a4656" /><ellipse cx={40} cy={-60} rx={26} ry={16} fill="#3a4656" />
          <ZodiacSymbol x={0} y={95} r={34} color="#f4f1ea" ink={false} />
        </g>}
      </Svg>
      <Vignette strength={0.45} />
    </Camera>
  );
};

/** F: the car door — symbol drawn in marker, then the dates */
const DoorShot: React.FC<{ s0: number }> = ({ s0 }) => {
  const f = useCurrentFrame(), L = (t: number) => at(t) - s0;
  const draw = ramp(f, L(16.7), L(17.95));
  const lines = ["VALLEJO", "12-20-68", "7-4-69", "SEPT 27-69"];
  const dates = clamp01((f - L(18.6)) / (L(19.9) - L(18.6)));
  const circ = 2 * Math.PI * 150;
  return (
    <Camera keys={[{ f: 0, z: 1.0, y: 960 }, { f: L(18.4), z: 1.08, y: 900 }, { f: 126, z: 1.16, y: 980 }]} kicks={[L(17.69)]}>
      <AbsoluteFill style={{ background: "linear-gradient(180deg, #d9cfb8 0%, #c9bfa6 100%)" }} />
      <Svg>
        <rect x={60} y={120} width={960} height={420} rx={30} fill="#1b2438" stroke={INK} strokeWidth={8} />
        <line x1={540} y1={120} x2={540} y2={540} stroke={INK} strokeWidth={10} />
        <rect x={40} y={560} width={1000} height={20} fill="#a89f88" />
        <rect x={760} y={1480} width={200} height={50} rx={20} fill="#b8b6ae" stroke={INK} strokeWidth={6} />
        <g transform="translate(540 800)">
          <circle cx={0} cy={0} r={150} fill="none" stroke="#141218" strokeWidth={22} strokeLinecap="round"
            strokeDasharray={circ} strokeDashoffset={circ * (1 - clamp01(draw * 1.6))} />
          <line x1={-210} y1={0} x2={lerp(-210, 210, clamp01(draw * 3 - 1.6))} y2={0} stroke="#141218" strokeWidth={22} strokeLinecap="round" opacity={draw > 0.53 ? 1 : 0} />
          <line x1={0} y1={-210} x2={0} y2={lerp(-210, 210, clamp01(draw * 3 - 2))} stroke="#141218" strokeWidth={22} strokeLinecap="round" opacity={draw > 0.67 ? 1 : 0} />
        </g>
        {lines.map((ln, i) => {
          const n = Math.round(clamp01(dates * lines.length - i) * ln.length);
          return <text key={i} x={540} y={1110 + i * 100} textAnchor="middle" fontFamily="Montserrat" fontWeight={900} fontSize={80} fill="#141218"
            transform={`rotate(${-3 + i} 540 ${1110 + i * 100})`}>{ln.slice(0, n)}</text>;
        })}
      </Svg>
      <Vignette strength={0.4} />
    </Camera>
  );
};

/** G: a payphone by a car wash, the receiver left dangling */
const CarWashShot: React.FC<{ s0: number }> = ({ s0 }) => {
  const f = useCurrentFrame();
  const sw = Math.sin(f * 0.18) * 14 * Math.exp(-f / 90);
  return (
    <Camera keys={[{ f: 0, z: 1.25, x: 420, y: 1100 }, { f: 81, z: 1.05, x: 540, y: 1000 }]}>
      <Svg>
        <Sky top="#2a2a4a" bottom="#e89a6a" />
        <Building x={500} base={1500} w={560} h={520} color="#d9c48f" seed={2} lit={0.3} cols={4} rows={2} sign="CAR WASH" signColor="#ff5a5a" door={false} />
        <Ground y={1500} color="#4a4a52" />
        <PhoneBooth x={330} base={1540} s={1.3} lit />
        <g transform={`rotate(${sw} 330 1240)`}>
          <path d="M 330 1240 Q 360 1330 330 1400" fill="none" stroke={INK} strokeWidth={8} />
          <rect x={310} y={1390} width={40} height={120} rx={14} fill="#1b1a20" stroke={INK} strokeWidth={5} />
        </g>
      </Svg>
      <Vignette strength={0.5} />
    </Camera>
  );
};

/** H: San Francisco, two weeks later */
const CityShot: React.FC<{ s0: number }> = ({ s0 }) => {
  const f = useCurrentFrame(), L = (t: number) => at(t) - s0;
  return (
    <Camera keys={[{ f: 0, z: 1.15, y: 1000 }, { f: 93, z: 1.0, y: 980 }]} kicks={[L(23.09)]}>
      <Svg>
        <Sky top="#04060f" bottom="#22305a" />
        <Stars seed={50} n={60} y1={800} f={f} />
        <g stroke={INK} strokeWidth={6}>
          {[120, 520].map(x => <g key={x}>
            <rect x={x} y={560} width={46} height={560} fill="#c4421c" />
            <rect x={x - 12} y={700} width={70} height={18} fill="#c4421c" />
            <rect x={x - 12} y={880} width={70} height={18} fill="#c4421c" />
          </g>)}
          <path d="M -200 1000 Q 0 600 143 570 Q 340 900 543 570 Q 700 640 900 1000" fill="none" stroke="#c4421c" strokeWidth={10} />
          <rect x={-200} y={1000} width={1100} height={26} fill="#c4421c" />
        </g>
        <Water y={1100} color="#14213d" f={f} shine="#ffcf6b" />
        {[0, 1, 2, 3, 4, 5].map(i => <Building key={i} x={560 + i * 110 - (i % 2) * 20} base={1400} w={120 + (i % 3) * 30} h={300 + ((i * 97) % 260)} color={["#2a3048", "#232a40", "#30365a"][i % 3]} seed={60 + i} lit={0.45} cols={2} rows={4} door={false} />)}
        <rect x={-600} y={1400} width={W + 1200} height={600} fill="#101626" />
      </Svg>
      <Stamp text="OCT 1969" at={L(23.09)} y={330} size={150} />
      {f >= L(24.24) && <div style={{ position: "absolute", top: 520, width: W, textAlign: "center", fontFamily: "Anton", fontSize: 104, color: "#fff", letterSpacing: 6,
        WebkitTextStroke: "14px #000", paintOrder: "stroke fill", opacity: ramp(f, L(24.24), L(24.24) + 6) }}>SAN FRANCISCO</div>}
      <Vignette strength={0.6} />
    </Camera>
  );
};

/** I: a man gets into a taxi; flash to black on "kills" */
const TaxiShot: React.FC<{ s0: number }> = ({ s0 }) => {
  const f = useCurrentFrame(), L = (t: number) => at(t) - s0;
  const walk = ramp(f, 0, L(27.0));
  if (f >= L(27.92)) return <AbsoluteFill style={{ background: "#000" }} />;
  return (
    <Camera keys={[{ f: 0, z: 1.05, x: 540, y: 1050 }, { f: L(27.8), z: 1.2, x: 640, y: 1080 }]} kicks={[L(27.86)]}>
      <Svg>
        <Sky top="#04060c" bottom="#1a2238" />
        <Building x={-60} base={1380} w={380} h={820} color="#2a2f44" seed={71} lit={0.4} cols={3} rows={5} />
        <Building x={330} base={1380} w={330} h={700} color="#33304a" seed={72} lit={0.3} cols={3} rows={4} />
        <Building x={670} base={1380} w={420} h={900} color="#262b3c" seed={73} lit={0.35} cols={3} rows={5} />
        <rect x={-600} y={1380} width={W + 1200} height={120} fill="#3a3a44" stroke={INK} strokeWidth={6} />
        <Ground y={1500} color="#1d212c" />
        <StreetLamp x={160} base={1500} h={720} />
        <Car x={700} base={1700} s={1.15} taxi lights />
      </Svg>
      {f < L(27.1) && <Toon outfit={SUSPECT} x={lerp(80, 520, walk)} y={1640} h={860} filter={NIGHT} opts={{ mode: walk < 1 ? "stroll" : "stand", phase: f / 18, facing: 1, seed: 81, expr: "neutral" }} />}
      <Flash at={L(27.86)} len={3} color="#ffffff" />
      <Vignette strength={0.6} />
    </Camera>
  );
};

/** J: teenagers at a window across the street */
const WindowShot: React.FC<{ s0: number }> = ({ s0 }) => {
  const f = useCurrentFrame(), L = (t: number) => at(t) - s0;
  const call = f >= L(30.95);
  return (
    <Camera keys={[{ f: 0, z: 1.25, x: 540, y: 900 }, { f: L(30.8), z: 1.1, x: 540, y: 960 }, { f: 105, z: 1.0, x: 540, y: 980 }]}>
      <AbsoluteFill style={{ background: "#3a3448" }} />
      <Svg>
        <rect x={110} y={250} width={860} height={900} fill="#0c1222" stroke={INK} strokeWidth={10} />
        <circle cx={760} cy={430} r={50} fill="#fbf1cf" opacity={0.8} />
        <path d="M 110 250 Q 220 600 150 1150 L 110 1150 Z" fill="#a83a4a" stroke={INK} strokeWidth={6} />
        <path d="M 970 250 Q 860 600 930 1150 L 970 1150 Z" fill="#a83a4a" stroke={INK} strokeWidth={6} />
      </Svg>
      {TEENS.map((o, i) => (
        <Toon key={i} outfit={o} x={300 + i * 240} y={1500 + (i === 1 ? 20 : 0)} h={900} opts={{ mode: "stand", expr: "shock", seed: 90 + i, blink: blink(f, i), facing: 0,
          prop: call && i === 2 ? "phone" : null, look: i === 0 ? 0.5 : 0 }} />
      ))}
      <Svg>
        <rect x={60} y={1150} width={960} height={70} fill="#e9e1cc" stroke={INK} strokeWidth={8} />
        <rect x={0} y={1220} width={W} height={800} fill="#3a3448" />
      </Svg>
      <Vignette strength={0.5} />
    </Camera>
  );
};

/** K: the police car drives right past a man walking away */
const PassShot: React.FC<{ s0: number }> = ({ s0 }) => {
  const f = useCurrentFrame(), L = (t: number) => at(t) - s0;
  const mx = lerp(260, 640, ramp(f, 0, 168));
  const cx = lerp(1700, -700, ramp(f, L(33.3), L(35.9)));
  const look = f > L(34.2) && f < L(35.3) ? -0.8 : 0;
  return (
    <Camera keys={[{ f: 0, z: 1.15, x: 420, y: 1050 }, { f: 168, z: 1.25, x: 640, y: 1040 }]}>
      <Svg>
        <Sky top="#04060c" bottom="#1a2238" />
        <Stars seed={81} n={40} y1={600} f={f} />
        <Building x={-200} base={1300} w={400} h={760} color="#262b3c" seed={81} lit={0.25} cols={3} rows={5} />
        <Building x={210} base={1300} w={360} h={640} color="#2e2a40" seed={82} lit={0.3} cols={3} rows={4} />
        <Building x={580} base={1300} w={420} h={820} color="#232a3d" seed={83} lit={0.2} cols={3} rows={5} />
        <Building x={1010} base={1300} w={380} h={700} color="#2a2f44" seed={84} lit={0.3} cols={3} rows={4} />
        <rect x={-600} y={1300} width={W + 1200} height={260} fill="#3a3a44" stroke={INK} strokeWidth={6} />
        <Ground y={1560} color="#1d212c" />
        <StreetLamp x={900} base={1560} h={760} />
      </Svg>
      <Toon outfit={SUSPECT} x={mx} y={1520} h={840} filter={NIGHT} opts={{ mode: "stroll", phase: f / 20, facing: 1, seed: 81, expr: "neutral", look }} />
      <Svg><Car x={cx} base={1820} s={1.2} police flip f={f} lights /></Svg>
      {f >= L(36.66) && <Stamp text="?" at={L(36.66)} x={mx + 40} y={480} size={300} box={false} rot={10} color="#ffd23f" />}
      <Vignette strength={0.6} />
    </Camera>
  );
};

/** L: a letter arrives with a torn piece of the driver's shirt */
const ShirtShot: React.FC<{ s0: number }> = ({ s0 }) => {
  const f = useCurrentFrame(), L = (t: number) => at(t) - s0;
  const drop = ramp(f, L(38.3), L(38.3) + 8), open = ramp(f, L(39.3), L(39.8)), slide = ramp(f, L(40.0), L(40.8));
  return (
    <Camera keys={[{ f: 0, z: 1.0, y: 960 }, { f: L(40.0), z: 1.08, y: 960 }, { f: 114, z: 1.3, y: 1000 }]} kicks={[L(38.3) + 8, L(41.27)]}>
      <AbsoluteFill style={{ background: "#6d4a33" }} />
      <Svg>
        {Array.from({ length: 8 }, (_, i) => <line key={i} x1={0} y1={150 + i * 240} x2={W} y2={150 + i * 240} stroke="#5e3e2a" strokeWidth={8} />)}
        <Paper x={300} y={500} w={420} h={560} rot={-8}><Scribble x={-170} y={-200} w={340} rows={7} gap={60} seed={3} /></Paper>
        <g transform={`translate(0 ${lerp(-1200, 0, drop)})`}>
          <g transform={`translate(${lerp(560, 540, slide)} ${lerp(1100, 1500, slide)}) rotate(${lerp(0, 12, slide)})`} opacity={slide > 0 ? 1 : 0}>
            <path d="M -150 -90 L 140 -110 L 165 60 L 120 70 L 150 100 L -130 120 L -160 40 L -140 0 Z" fill="#c9ccd6" stroke={INK} strokeWidth={6} strokeLinejoin="round" />
            {[-60, -10, 40].map(y => <path key={y} d={`M -150 ${y} L 155 ${y - 20}`} stroke="#5a6080" strokeWidth={14} />)}
          </g>
          <Envelope x={560} y={1120} w={620} open={open} rot={-3} />
        </g>
      </Svg>
      <Vignette strength={0.5} />
    </Camera>
  );
};

/** M: the police sketch — glasses, short hair; nobody is caught */
const SketchShot: React.FC<{ s0: number }> = ({ s0 }) => {
  const f = useCurrentFrame(), L = (t: number) => at(t) - s0;
  const g1 = ramp(f, L(43.5), L(43.8)), g2 = ramp(f, L(44.25), L(44.55));
  return (
    <Camera keys={[{ f: 0, z: 1.05, y: 960 }, { f: L(43.4), z: 1.25, y: 880 }, { f: 132, z: 1.2, y: 900 }]} kicks={[L(42.93), L(44.99)]}>
      <AbsoluteFill style={{ background: "#5a4a3a" }} />
      <Svg>
        <rect x={120} y={190} width={840} height={1260} fill="#efe6cf" stroke={INK} strokeWidth={8} />
        <text x={540} y={340} textAnchor="middle" fontFamily="Anton" fontSize={150} fill="#2a2630" letterSpacing={10}>WANTED</text>
        <rect x={210} y={400} width={660} height={760} fill="#e4dac0" stroke={INK} strokeWidth={5} />
        <Scribble x={220} y={1230} w={640} rows={3} gap={60} seed={21} color="#6a6050" />
      </Svg>
      <Toon outfit={SUSPECT} x={540} y={1960} h={1640} filter="grayscale(1) sepia(0.35) contrast(1.15)" opts={{ mode: "stand", expr: "neutral", seed: 81, facing: 0 }} style={{ clipPath: "inset(0 0 52% 0)" }} />
      <Svg>
        {g1 > 0 && <ellipse cx={540} cy={790} rx={210 * g1} ry={90 * g1} fill="none" stroke="#ffd23f" strokeWidth={14} />}
        {g2 > 0 && <ellipse cx={540} cy={570} rx={240 * g2} ry={110 * g2} fill="none" stroke="#ffd23f" strokeWidth={14} />}
      </Svg>
      <Stamp text="STILL FREE" at={L(44.99)} y={1350} size={130} />
      <Vignette strength={0.45} />
    </Camera>
  );
};

/** N: a new code — 340 symbols — unsolved for 51 years. PART 3 */
const CodeShot: React.FC<{ s0: number }> = ({ s0 }) => {
  const f = useCurrentFrame(), L = (t: number) => at(t) - s0;
  const drop = ramp(f, L(46.5), L(46.5) + 8);
  const count = Math.round(340 * clamp01((f - L(47.3)) / (L(49.2) - L(47.3))));
  const dim = ramp(f, L(50.3), L(51.0));
  return (
    <Camera keys={[{ f: 0, z: 1.0, y: 960 }, { f: L(49.2), z: 1.04, y: 940 }, { f: 228, z: 1.12, y: 900 }]} kicks={[L(46.5) + 8, L(48.2), L(51.42)]}>
      <AbsoluteFill style={{ background: "radial-gradient(circle at 50% 45%, #2a2436 0%, #0d0a12 85%)" }} />
      <Svg>
        <g transform={`translate(0 ${lerp(-1400, 0, drop)})`}>
          <Paper x={540} y={900} w={940} h={1180} rot={-1}>
            <Glyphs x={-442} y={-560} cols={17} rows={20} cell={52} seed={340} count={count} />
          </Paper>
        </g>
      </Svg>
      <AbsoluteFill style={{ background: "#000", opacity: 0.45 * dim }} />
      {f >= L(48.2) && f < L(51.4) && <Stamp text="340" at={L(48.2)} y={300} size={200} color="#ffd23f" rot={-5} />}
      <Stamp text="51 YEARS" at={L(51.42)} y={760} size={190} />
      <Stamp text="PART 3" at={L(52.4)} y={1500} size={150} color="#ffd23f" rot={4} />
      <Vignette strength={0.55} />
    </Camera>
  );
};

const SHOTS: { from: number; to: number; C: React.FC<{ s0: number }> }[] = [
  { from: 0, to: 108, C: HoodShot },
  { from: 108, to: 183, C: LakeWide },
  { from: 183, to: 378, C: PicnicShot },
  { from: 378, to: 483, C: WardShot },
  { from: 483, to: 609, C: DoorShot },
  { from: 609, to: 690, C: CarWashShot },
  { from: 690, to: 783, C: CityShot },
  { from: 783, to: 873, C: TaxiShot },
  { from: 873, to: 978, C: WindowShot },
  { from: 978, to: 1146, C: PassShot },
  { from: 1146, to: 1260, C: ShirtShot },
  { from: 1260, to: 1392, C: SketchShot },
  { from: 1392, to: PART2_FRAMES, C: CodeShot },
];

const CAPS = buildCaptions(WORDS, {
  merge: { 12: "1969", 68: "San Francisco", 133: ["340", 3] },
  replace: { 142: "51" },
  yellow: [4, 7, 23, 39, 43, 51, 64, 68, 75, 85, 92, 120, 121, 123, 132, 140],
  red: [12, 27, 33, 57, 79, 102, 116, 124, 133, 142],
});

export const ZodiacPart2: React.FC<{ audio?: string }> = ({ audio = "zodiac/part2_voice.mp3" }) => (
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

export const smootherUnused = smoother;
