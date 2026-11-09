import React from "react";
import { AbsoluteFill } from "remotion";
import { INK, Toon } from "../lib/core";
import { Building, Fog, Svg, ZodiacSymbol } from "../lib/props";
import { ZODIAC } from "./Part1";

const outline = (w: number): React.CSSProperties => ({ WebkitTextStroke: `${w}px #000`, paintOrder: "stroke fill" });

/** Vertical 1080x1920 cover for Part 1. Everything important sits in the centre 1080x1440 (y 240-1680),
 *  which is what Instagram/TikTok profile grids show. */
export const CoverPart1: React.FC = () => (
  <AbsoluteFill style={{ background: "radial-gradient(circle at 50% 48%, #5a0f18 0%, #1a0609 55%, #050204 100%)", overflow: "hidden" }}>
    <Svg>
      {[0, 1, 2, 3, 4, 5].map(i => (
        <Building key={i} x={-80 + i * 210} base={1920} w={200} h={420 + ((i * 137) % 260)} color="#14080c" seed={i + 3} lit={0.12} cols={2} rows={4} door={false} litColor="#7a2a2a" />
      ))}
      <ZodiacSymbol x={540} y={860} r={340} glow={0.9} sw={40} />
      <Fog f={40} y={1560} color="#7a2030" opacity={0.45} />
    </Svg>
    <Toon outfit={ZODIAC} x={540} y={1790} h={1300} shadow={0.6} opts={{ mode: "stand", facing: 0, seed: 5, light: -2.2, expr: "stern" }} />
    <div style={{ position: "absolute", top: 250, width: "100%", textAlign: "center", fontFamily: "Anton", fontSize: 150, lineHeight: 1, color: "#fff", letterSpacing: 4, ...outline(22) }}>57 YEARS.</div>
    <div style={{ position: "absolute", top: 400, width: "100%", textAlign: "center", fontFamily: "Anton", fontSize: 178, lineHeight: 1, color: "#ffd23f", letterSpacing: 4, ...outline(24),
      textShadow: "0 12px 0 rgba(0,0,0,0.5)" }}>NEVER CAUGHT</div>
    <div style={{ position: "absolute", top: 1430, width: "100%", textAlign: "center", fontFamily: "Montserrat", fontWeight: 900, fontSize: 92, color: "#fff", ...outline(18) }}>THE ZODIAC KILLER</div>
    <div style={{ position: "absolute", top: 1560, left: "50%", transform: "translateX(-50%) rotate(-3deg)", padding: "10px 46px", borderRadius: 24, background: "#ffd23f",
      border: `8px solid ${INK}`, fontFamily: "Anton", fontSize: 84, color: INK, letterSpacing: 4, boxShadow: "0 10px 0 rgba(0,0,0,0.5)" }}>PART 1</div>
    <AbsoluteFill style={{ background: "radial-gradient(ellipse 80% 65% at 50% 50%, rgba(0,0,0,0) 60%, rgba(0,0,0,0.7) 100%)" }} />
  </AbsoluteFill>
);
