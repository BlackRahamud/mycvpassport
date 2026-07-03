/**
 * Bullets contract: "Each line becomes one bullet" — the editor promises
 * it, so the parser pair and the templates must deliver it.
 *
 * Locks THREE layers:
 *   1. the ESM preview parser (parseExperiencePoints)
 *   2. its CJS PDF twin (serverLib/pdfCommon.splitExperiencePointsForPreview)
 *      — must split byte-identically
 *   3. a real template render: two-line description → two bullet elements
 */
import { render, screen } from "@testing-library/react";
import { parseExperiencePoints, splitExperiencePointsForPreview } from "./experiencePointsPreview";
import { PreviewModernEmerald } from "./Template1ModernEmerald";
import { EMPTY_RESUME } from "./cvShared";

const pdfCommon = require("./serverLib/pdfCommon");

describe("each line becomes one bullet (preview parser)", () => {
  test("two plain-Enter lines → two bullets, list format", () => {
    expect(parseExperiencePoints("Did X\nDid Y")).toEqual({
      bullets: ["Did X", "Did Y"],
      format: "list",
    });
  });

  test("leading markers are stripped, lines stay separate", () => {
    expect(parseExperiencePoints("• Alpha\n- Beta\n1. Gamma").bullets).toEqual([
      "Alpha",
      "Beta",
      "Gamma",
    ]);
  });

  test("negative numbers / decimals never trigger a marker strip", () => {
    const { bullets } = parseExperiencePoints("-2024 grew revenue 1.5x");
    expect(bullets).toEqual(["-2024 grew revenue 1.5x"]);
  });

  test("single plain line renders as prose (paragraph format)", () => {
    expect(parseExperiencePoints("One sentence about the role")).toEqual({
      bullets: ["One sentence about the role"],
      format: "paragraph",
    });
  });

  test("blank lines are skipped, not merged", () => {
    expect(parseExperiencePoints("A\n\n\nB").bullets).toEqual(["A", "B"]);
  });

  test("empty input → no bullets", () => {
    expect(parseExperiencePoints("").bullets).toEqual([]);
    expect(parseExperiencePoints(null).bullets).toEqual([]);
  });
});

describe("CJS PDF twin splits identically", () => {
  const CASES = [
    "Did X\nDid Y",
    "• Alpha\n- Beta\n1. Gamma",
    "-2024 grew revenue 1.5x",
    "One sentence about the role",
    "A\n\n\nB",
    "  spaced  \n\t tabbed line ",
  ];
  test.each(CASES)("twin parity for %j", (input) => {
    expect(pdfCommon.splitExperiencePointsForPreview(input)).toEqual(
      splitExperiencePointsForPreview(input),
    );
  });
});

describe("template renders one bullet element per line", () => {
  test("Template 1: two-line description → two • bullets", () => {
    const cv = {
      ...EMPTY_RESUME,
      name: "Test Person",
      experience: [
        {
          role: "Engineer",
          company: "Acme",
          period: "2020 – 2024",
          points: "Did X\nDid Y",
        },
      ],
    };
    render(<PreviewModernEmerald cv={cv} />);
    expect(screen.getByText("• Did X")).toBeInTheDocument();
    expect(screen.getByText("• Did Y")).toBeInTheDocument();
  });
});
