// Round-trip test for the ATS scan → AI-tailor handoff.
//
// This guards the failure-prone seam: the draft key the SCAN writes must be
// byte-identical to the key the BUILDER reads on from=ats mount, and the
// Builder must hydrate the SCANNED CV — not EMPTY_RESUME, not the user's saved
// profile. Exercises the real cvDraft + cvShared modules (no mocks of either).

import {
  getDraftStorageKey,
  writeCvDraft,
  readCvDraft,
  ATS_HANDOFF_DRAFT_KEY,
} from "./cvDraft";
import { normalizeResumeForBuilder, EMPTY_RESUME } from "../cvShared";

// Realistic cv_data as /api/transform?action=parse returns it (canonical
// builder shape, strict source-fidelity — verbatim transcription of the CV).
const SCANNED_CV = {
  name: "Rajesh Kumar Nair",
  email: "rajesh.nair@example.com",
  phone: "+91 98765 43210",
  title: "Senior Mechanical Engineer",
  location: "Kochi, India",
  summary: "Mechanical engineer with 8 years across heavy fabrication and pressure-vessel design.",
  experience: [
    {
      company: "Larsen Engineering Works",
      role: "Senior Mechanical Engineer",
      location: "Kochi",
      startDate: "Jan 2019",
      endDate: "",
      present: true,
      points: ["Led a 12-member maintenance team", "Reduced plant downtime by 18%"],
    },
    {
      company: "Apex Fabricators",
      role: "Mechanical Engineer",
      startDate: "2016",
      endDate: "2019",
      points: ["Designed pressure vessels per ASME Section VIII"],
    },
  ],
  education: [{ school: "NIT Calicut", degree: "B.Tech Mechanical", year: "2015" }],
  skills: ["AutoCAD", "SolidWorks", "ASME VIII", "Pipe stress analysis", "Welding inspection"],
  languages: "English, Hindi, Malayalam",
  certifications: [{ name: "ASNT Level II", issuer: "ASNT", year: "2018" }],
};

// A DIFFERENT person already saved in the user's account. The handoff must NOT
// load this even though the Builder mounts with this resume's id.
const SAVED_PROFILE_ID = "550e8400-e29b-41d4-a716-446655440000";

const GAPS = ["Skills buried in paragraphs", "No quantified outcomes in early roles"];

// Mirrors BuilderPage's atsGaps derivation so we prove the ribbon would render.
function deriveAtsGaps(search) {
  const params = new URLSearchParams(search);
  if (params.get("from") !== "ats") return [];
  const raw = params.get("gaps");
  if (!raw) return [];
  return raw
    .split(",")
    .map((g) => {
      try { return decodeURIComponent(g).trim(); } catch { return g.trim(); }
    })
    .filter(Boolean);
}

beforeEach(() => {
  window.localStorage.clear();
});

describe("ATS → AI-tailor handoff round trip", () => {
  test("scan writes and builder reads the SAME key", () => {
    const encoded = GAPS.map((g) => encodeURIComponent(g)).join(",");
    const search = `?from=ats&gaps=${encoded}`;

    // Writer side (ATSChecker.openAiTailor): no resume id.
    const writeKey = getDraftStorageKey(null, search);
    // Reader side (BuilderPage mount): a saved resume IS being edited.
    const readKey = getDraftStorageKey(SAVED_PROFILE_ID, search);

    expect(writeKey).toBe(ATS_HANDOFF_DRAFT_KEY);
    expect(readKey).toBe(writeKey); // from=ats wins over the saved-resume id
  });

  test("builder hydrates the SCANNED cv — not EMPTY, not the saved profile", () => {
    const encoded = GAPS.map((g) => encodeURIComponent(g)).join(",");
    const search = `?from=ats&gaps=${encoded}`;

    // 1) A stale saved-profile draft exists under the edit key (red herring).
    writeCvDraft(getDraftStorageKey(SAVED_PROFILE_ID, "?other=1"), {
      version: 1,
      cv: { ...EMPTY_RESUME, name: "Old Saved Person", email: "old@example.com" },
    });

    // 2) Scan writes the parsed CV to the from=ats draft.
    const writeKey = getDraftStorageKey(null, search);
    writeCvDraft(writeKey, { version: 1, cv: SCANNED_CV, templateId: null, resumeId: null });

    // 3) Builder mounts with from=ats AND a saved resume id, reads its draft.
    const readKey = getDraftStorageKey(SAVED_PROFILE_ID, search);
    const draft = readCvDraft(readKey);
    expect(draft).not.toBeNull();

    const resume = normalizeResumeForBuilder(draft.cv);

    // Real scanned content present.
    expect(resume.name).toBe("Rajesh Kumar Nair");
    expect(resume.email).toBe("rajesh.nair@example.com");
    expect(resume.title).toBe("Senior Mechanical Engineer");

    // Experience hydrated and verbatim (points joined to a newline string).
    expect(resume.experience.length).toBe(2);
    expect(resume.experience[0].company).toBe("Larsen Engineering Works");
    expect(resume.experience[0].points).toContain("Reduced plant downtime by 18%");

    // Skills array → comma string, scanned skills intact.
    expect(resume.skills).toContain("SolidWorks");
    expect(resume.skills).toContain("ASME VIII");

    // NOT the blank canvas.
    expect(resume.name).not.toBe(EMPTY_RESUME.name);
    expect(resume.experience.length).toBeGreaterThan(0);

    // NOT the saved profile.
    expect(resume.name).not.toBe("Old Saved Person");
    expect(resume.email).not.toBe("old@example.com");
  });

  test("gaps parse from the URL so the ribbon renders on top", () => {
    const encoded = GAPS.map((g) => encodeURIComponent(g)).join(",");
    const gaps = deriveAtsGaps(`?from=ats&gaps=${encoded}`);
    expect(gaps).toEqual(GAPS);
  });

  test("without from=ats the saved-resume edit key is used (no regression)", () => {
    const key = getDraftStorageKey(SAVED_PROFILE_ID, "?new=1");
    expect(key).toBe(`cvp_cv_draft:edit:${SAVED_PROFILE_ID}`);
    expect(key).not.toBe(ATS_HANDOFF_DRAFT_KEY);
  });
});
