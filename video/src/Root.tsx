import React from "react";
import { Composition } from "remotion";
import { PART1_FRAMES, ZodiacPart1 } from "./zodiac/Part1";

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="ZodiacPart1" component={ZodiacPart1} durationInFrames={PART1_FRAMES} fps={30} width={1080} height={1920} />
  </>
);
