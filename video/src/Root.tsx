import React from "react";
import { Composition } from "remotion";
import { PART1_FRAMES, ZodiacPart1 } from "./zodiac/Part1";
import { PART2_FRAMES, ZodiacPart2 } from "./zodiac/Part2";

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="ZodiacPart1" component={ZodiacPart1} durationInFrames={PART1_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="ZodiacPart2" component={ZodiacPart2} durationInFrames={PART2_FRAMES} fps={30} width={1080} height={1920} />
  </>
);
