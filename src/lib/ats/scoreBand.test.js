/**
 * Verdict tier gate: chip text, color and ring all derive from scoreBand,
 * so a low score can never wear a positive label (the 8/100-"PASS" bug).
 */
import { scoreBand, bandLabel, BAND_LABELS, BAND_TONES, BAND_COLORS } from "./scoreBand";

const SRC = "stopgap_keyword";

test("thresholds: <50 weak, 50-79 maybe, >=80 strong", () => {
  [0, 8, 25, 49].forEach((s) => expect(bandLabel(s, SRC)).toBe("Weak Match"));
  [50, 65, 79].forEach((s) => expect(bandLabel(s, SRC)).toBe("Maybe"));
  [80, 86, 100].forEach((s) => expect(bandLabel(s, SRC)).toBe("Strong Match"));
});

test("missing scorer attribution reads Not scored, scored 0 stays Weak Match", () => {
  expect(bandLabel(72, null)).toBe("Not scored");
  expect(bandLabel(72, "")).toBe("Not scored");
  expect(bandLabel(0, SRC)).toBe("Weak Match");
});

test("no band ever labels itself PASS, and every band has label+tone+color", () => {
  Object.keys(BAND_LABELS).forEach((band) => {
    expect(BAND_LABELS[band]).not.toMatch(/^pass$/i);
    expect(BAND_TONES[band]).toBeTruthy();
    expect(BAND_COLORS[band]).toBeTruthy();
  });
});

test("label always agrees with the band that picks color and ring", () => {
  for (let s = 0; s <= 100; s += 1) {
    const band = scoreBand(s, SRC);
    expect(bandLabel(s, SRC)).toBe(BAND_LABELS[band]);
  }
});
