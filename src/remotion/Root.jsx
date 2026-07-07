import React from "react";
import { Composition } from "remotion";
import { Film } from "./Film";
import { FPS, TOTAL_FRAMES } from "./theme";

export const RemotionRoot = () => (
  <>
    <Composition
      id="InvestorFilm"
      component={Film}
      durationInFrames={TOTAL_FRAMES}
      fps={FPS}
      width={1920}
      height={1080}
      defaultProps={{ vertical: false }}
    />
    <Composition
      id="InvestorFilmVertical"
      component={Film}
      durationInFrames={TOTAL_FRAMES}
      fps={FPS}
      width={1080}
      height={1920}
      defaultProps={{ vertical: true }}
    />
  </>
);
