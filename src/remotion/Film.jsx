// Master timeline — investor walkthrough. One component drives both the
// 16:9 master and the 9:16 vertical cut (layout switches on `vertical`).
import React from "react";
import {
  AbsoluteFill,
  Audio,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { T, SCENES, TOTAL_FRAMES } from "./theme";
import { BrowserShot, Caption, Fade } from "./ui";
import { IntroSting, SolutionCard, WhyTiles, Closer } from "./stings";
import { AUDIO } from "./audio";

const S = Object.fromEntries(SCENES.map((s) => [s.key, s]));

/** One captured-screen scene: browser shot + Ken Burns + caption. */
const Shot = ({ scene, src, move, clickRing, caption, sub, vertical }) => (
  <Sequence from={scene.from} durationInFrames={scene.dur} name={scene.key}>
    <Fade dur={scene.dur}>
      <AbsoluteFill style={{ background: T.bg }}>
        <BrowserShot src={src} dur={scene.dur} move={move} clickRing={clickRing} vertical={vertical} />
        {caption ? <Caption text={caption} sub={sub} vertical={vertical} /> : null}
      </AbsoluteFill>
    </Fade>
  </Sequence>
);

/** Publish beat: Hire step crossfades into the success screen. */
const PublishScene = ({ scene, vertical }) => {
  const Inner = () => {
    const f = useCurrentFrame();
    const flip = 84; // crossfade moment
    const successOpacity = interpolate(f, [flip, flip + 18], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    return (
      <AbsoluteFill style={{ background: T.bg }}>
        <AbsoluteFill style={{ opacity: 1 - successOpacity }}>
          <BrowserShot
            src="captures/07-wizard-hire.png"
            dur={scene.dur}
            move={{ from: { x: 0, y: 0, scale: 1.04 }, to: { x: 0.02, y: 0.01, scale: 1.1 } }}
            clickRing={{ x: 0.281, y: 0.897, at: 22, label: "Hire Now" }}
            vertical={vertical}
          />
        </AbsoluteFill>
        <AbsoluteFill style={{ opacity: successOpacity }}>
          <BrowserShot
            src="captures/08-job-live-success.png"
            dur={scene.dur}
            move={{ from: { x: 0, y: 0, scale: 1.12 }, to: { x: 0, y: 0, scale: 1.03 } }}
            vertical={vertical}
          />
        </AbsoluteFill>
        <Caption text="Publish — the job is live." sub="No formatting work. Straight onto the board." vertical={vertical} />
      </AbsoluteFill>
    );
  };
  return (
    <Sequence from={scene.from} durationInFrames={scene.dur} name="publish">
      <Fade dur={scene.dur}>
        <Inner />
      </Fade>
    </Sequence>
  );
};

export const Film = ({ vertical = false }) => {
  return (
    <AbsoluteFill style={{ background: T.bg }}>
      {/* ——— stings & cards ——— */}
      <Sequence from={S.intro.from} durationInFrames={S.intro.dur} name="intro">
        <IntroSting dur={S.intro.dur} vertical={vertical} />
      </Sequence>
      <Sequence from={S.solution.from} durationInFrames={S.solution.dur} name="solution">
        <SolutionCard dur={S.solution.dur} vertical={vertical} />
      </Sequence>

      {/* ——— walkthrough: real captured screens ——— */}
      <Shot
        scene={S.landing}
        src="captures/01-landing-hero.png"
        move={{ from: { x: 0, y: 0.01, scale: 1.02 }, to: { x: 0, y: -0.01, scale: 1.09 } }}
        caption="CVPassport for Employers"
        sub="mycvpassport.com/employer"
        vertical={vertical}
      />
      <Shot
        scene={S.wizardStart}
        src="captures/03-wizard-start.png"
        move={{ from: { x: 0.02, y: 0, scale: 1.05 }, to: { x: -0.02, y: 0, scale: 1.1 } }}
        clickRing={{ x: 0.211, y: 0.897, at: 90, label: "Continue" }}
        caption="Post a role in minutes"
        sub="Guided wizard — title, location, workplace, type"
        vertical={vertical}
      />
      <Shot
        scene={S.wizardSkills}
        src="captures/04-wizard-skills-salary.png"
        move={{ from: { x: 0.015, y: 0.015, scale: 1.06 }, to: { x: -0.01, y: -0.015, scale: 1.12 } }}
        caption="Skills and salary band — guided"
        sub="Suggested skills for the role, one tap to add"
        vertical={vertical}
      />
      <Shot
        scene={S.wizardJD}
        src="captures/06-wizard-jd.png"
        move={{ from: { x: 0.01, y: 0, scale: 1.04 }, to: { x: -0.015, y: 0.01, scale: 1.1 } }}
        caption="Paste the job description"
        sub="Live preview builds as you type"
        vertical={vertical}
      />
      <PublishScene scene={S.publish} vertical={vertical} />
      <Shot
        scene={S.jobsList}
        src="captures/09-jobs-list.png"
        move={{ from: { x: 0, y: 0.02, scale: 1.04 }, to: { x: 0, y: -0.02, scale: 1.1 } }}
        caption="Every role in one command view"
        sub="Pipeline counts, attention flags, search"
        vertical={vertical}
      />
      <Shot
        scene={S.board}
        src="captures/10-pipeline-board.png"
        move={{ from: { x: 0.03, y: -0.02, scale: 1.12 }, to: { x: -0.03, y: 0.02, scale: 1.05 } }}
        clickRing={{ x: 0.309, y: 0.69, at: 80, label: "91% match" }}
        caption="Applicants arrive ATS-scored"
        sub="Ranked against your job description — sorted, not raw"
        vertical={vertical}
      />
      <Shot
        scene={S.detail}
        src="captures/11-candidate-detail.png"
        move={{ from: { x: -0.03, y: 0.01, scale: 1.1 }, to: { x: -0.055, y: -0.015, scale: 1.16 } }}
        caption="A two-second verdict on every candidate"
        sub="Fit score, strengths, risks — before you open the CV"
        vertical={vertical}
      />
      <Shot
        scene={S.cvViewer}
        src="captures/12-cv-viewer.png"
        move={{ from: { x: 0.03, y: 0, scale: 1.08 }, to: { x: -0.03, y: 0, scale: 1.12 } }}
        caption="The CV and the fit analysis, side-by-side"
        sub="Skills match, visa status, notice period — one screen"
        vertical={vertical}
      />
      <Shot
        scene={S.stageMove}
        src="captures/13-moved-to-ready.png"
        move={{ from: { x: 0.04, y: 0.01, scale: 1.1 }, to: { x: 0.02, y: -0.01, scale: 1.14 } }}
        clickRing={{ x: 0.416, y: 0.69, at: 26, label: "Ready to interview" }}
        caption="One click moves them forward"
        sub="Shortlist → ready — the board and list stay in sync"
        vertical={vertical}
      />
      <Shot
        scene={S.scheduleModal}
        src="captures/14-schedule-modal.png"
        move={{ from: { x: 0, y: 0.015, scale: 1.06 }, to: { x: 0, y: -0.01, scale: 1.12 } }}
        clickRing={{ x: 0.577, y: 0.738, at: 92, label: "Schedule & notify" }}
        caption="Pick a time — CVPassport does the rest"
        sub="Date, duration, meeting link, note"
        vertical={vertical}
      />
      <Shot
        scene={S.confirmed}
        src="captures/15-schedule-confirmed.png"
        move={{ from: { x: 0, y: 0, scale: 1.16 }, to: { x: 0, y: 0, scale: 1.06 } }}
        caption="Interview scheduled. Invite emailed."
        sub="Calendar invite sent to the candidate automatically"
        vertical={vertical}
      />
      <Shot
        scene={S.payoff}
        src="captures/16-payoff-detail.png"
        move={{ from: { x: 0.02, y: -0.015, scale: 1.12 }, to: { x: 0, y: 0.01, scale: 1.04 } }}
        clickRing={{ x: 0.416, y: 0.69, at: 40 }}
        caption="Job post → booked interview. One portal."
        sub="The full hiring loop, closed inside CVPassport"
        vertical={vertical}
      />

      {/* ——— why + close ——— */}
      <Sequence from={S.whyTiles.from} durationInFrames={S.whyTiles.dur} name="why">
        <WhyTiles dur={S.whyTiles.dur} vertical={vertical} />
      </Sequence>
      <Sequence from={S.close.from} durationInFrames={S.close.dur} name="close">
        <Closer dur={S.close.dur} vertical={vertical} />
      </Sequence>

      {/* ——— audio ——— */}
      {AUDIO.bed ? (
        <Audio
          src={staticFile(AUDIO.bed)}
          volume={(f) =>
            interpolate(f, [0, 60, TOTAL_FRAMES - 90, TOTAL_FRAMES - 10], [0, 0.5, 0.5, 0], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            })
          }
        />
      ) : null}
      {AUDIO.vo.map((v) => (
        <Sequence key={v.src} from={v.from} name={`vo-${v.src}`}>
          <Audio src={staticFile(v.src)} volume={1} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
