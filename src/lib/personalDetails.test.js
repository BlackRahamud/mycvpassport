import {
  buildPersonalDetailsEntries,
  buildCustomFieldEntries,
  hasAnyPersonalDetail,
  HIDEABLE_PERSONAL_DETAILS,
} from "../cvShared";
import {
  buildPersonalDetailsEntries as buildPersonalDetailsEntriesPdf,
  isPersonalDetailHidden as isPersonalDetailHiddenPdf,
} from "../serverLib/pdfCommon";

const ALL_FILLED = {
  nationality: "Indian",
  visaStatus: "Employment Visa",
  dob: "12 Mar 1990",
  maritalStatus: "Married",
  drivingLicense: "UAE Light Vehicle",
  gender: "Male",
  availability: "Immediately Available",
  willingToRelocate: "Yes",
};

describe("buildPersonalDetailsEntries", () => {
  test("all eight fields filled → 8 entries in Gulf order", () => {
    const entries = buildPersonalDetailsEntries(ALL_FILLED);
    expect(entries).toEqual([
      { label: "Nationality", value: "Indian" },
      { label: "Visa Status", value: "Employment Visa" },
      { label: "Date of Birth", value: "12 Mar 1990" },
      { label: "Marital Status", value: "Married" },
      { label: "Driving License", value: "UAE Light Vehicle" },
      { label: "Gender", value: "Male" },
      { label: "Availability", value: "Immediately Available" },
      { label: "Willing to Relocate", value: "Yes" },
    ]);
  });

  test("some fields filled → only those, order preserved", () => {
    const entries = buildPersonalDetailsEntries({
      nationality: "Pakistani",
      visaStatus: "",
      drivingLicense: "UAE",
    });
    expect(entries).toEqual([
      { label: "Nationality", value: "Pakistani" },
      { label: "Driving License", value: "UAE" },
    ]);
  });

  test("no fields filled → empty array", () => {
    expect(buildPersonalDetailsEntries({})).toEqual([]);
    expect(buildPersonalDetailsEntries({ name: "Ahmed", email: "a@b.com" })).toEqual([]);
  });

  test("whitespace-only values are skipped, filled values are trimmed", () => {
    const entries = buildPersonalDetailsEntries({
      nationality: "   ",
      visaStatus: "  Visit Visa  ",
      dob: "\t",
      gender: "\n",
    });
    expect(entries).toEqual([{ label: "Visa Status", value: "Visit Visa" }]);
  });

  test("null / undefined / non-object input → empty array", () => {
    expect(buildPersonalDetailsEntries(null)).toEqual([]);
    expect(buildPersonalDetailsEntries(undefined)).toEqual([]);
    expect(buildPersonalDetailsEntries("not an object")).toEqual([]);
  });

  test("serverLib twin (pdfCommon) matches the ESM helper output", () => {
    expect(buildPersonalDetailsEntriesPdf(ALL_FILLED)).toEqual(buildPersonalDetailsEntries(ALL_FILLED));
    expect(buildPersonalDetailsEntriesPdf({})).toEqual([]);
    expect(buildPersonalDetailsEntriesPdf(null)).toEqual([]);
  });
});

/* PART A — imported custom fields print on every template, not just T10/T19.
   They ride the same entry list all 19 templates already render. */
describe("custom fields print everywhere", () => {
  const WITH_CUSTOM = {
    nationality: "Indian",
    customFields: [
      { id: "nafis_registered", name: "Nafis Registered", value: "Yes, 2026" },
      { id: "iqama_number", name: "Iqama Number", value: "2• 1234" },
    ],
  };

  test("custom fields append after the flat fields", () => {
    expect(buildPersonalDetailsEntries(WITH_CUSTOM)).toEqual([
      { label: "Nationality", value: "Indian" },
      { label: "Nafis Registered", value: "Yes, 2026" },
      { label: "Iqama Number", value: "2• 1234" },
    ]);
  });

  test("a custom field alone still produces a printable block", () => {
    expect(hasAnyPersonalDetail({ customFields: [{ id: "x", name: "Union Member", value: "Yes" }] })).toBe(true);
  });

  test("an id with no name falls back to a stable regional label", () => {
    expect(buildCustomFieldEntries({ customFields: [{ id: "visa_status", value: "Golden" }] })).toEqual([
      { label: "Visa Status", value: "Golden" },
    ]);
  });

  test("nameless, valueless and malformed entries are dropped, never rendered blank", () => {
    expect(
      buildCustomFieldEntries({
        customFields: [
          { id: "unknown_id", value: "orphan" },
          { id: "a", name: "Has Name", value: "   " },
          null,
          "nope",
          { id: "b", name: "Good", value: " kept " },
        ],
      }),
    ).toEqual([{ label: "Good", value: "kept" }]);
  });

  test("a custom field repeating a flat field prints once, not twice", () => {
    const entries = buildPersonalDetailsEntries({
      nationality: "Indian",
      customFields: [{ id: "nationality", name: "Nationality", value: "Indian" }],
    });
    expect(entries).toEqual([{ label: "Nationality", value: "Indian" }]);
  });

  test("excludeRegionalTwins drops flat-field duplicates for T10 / T11", () => {
    expect(
      buildCustomFieldEntries(
        { customFields: [{ id: "nationality", name: "Nationality", value: "Indian" }, { id: "z", name: "Nafis", value: "Yes" }] },
        { excludeRegionalTwins: true },
      ),
    ).toEqual([{ label: "Nafis", value: "Yes" }]);
  });

  test("serverLib twin matches on custom fields too", () => {
    expect(buildPersonalDetailsEntriesPdf(WITH_CUSTOM)).toEqual(buildPersonalDetailsEntries(WITH_CUSTOM));
  });
});

/* PART B — Show-on-CV toggles. The toggle controls PRINTING only: the value
   stays in the resume object either way. */
describe("hiddenPersonalDetails suppresses printing, never data", () => {
  test("default (absent) prints everything — Gulf behaviour unchanged", () => {
    expect(buildPersonalDetailsEntries(ALL_FILLED)).toHaveLength(8);
    expect(buildPersonalDetailsEntries({ ...ALL_FILLED, hiddenPersonalDetails: [] })).toHaveLength(8);
  });

  test("a hidden field drops out while the others still print", () => {
    const entries = buildPersonalDetailsEntries({ ...ALL_FILLED, hiddenPersonalDetails: ["dob"] });
    expect(entries.map((e) => e.label)).not.toContain("Date of Birth");
    expect(entries.map((e) => e.label)).toEqual([
      "Nationality", "Visa Status", "Marital Status",
      "Driving License", "Gender", "Availability", "Willing to Relocate",
    ]);
  });

  test("all three toggleable fields off at once", () => {
    const entries = buildPersonalDetailsEntries({
      ...ALL_FILLED,
      hiddenPersonalDetails: ["visaStatus", "nationality", "dob"],
    });
    expect(entries.map((e) => e.label)).toEqual([
      "Marital Status", "Driving License", "Gender", "Availability", "Willing to Relocate",
    ]);
  });

  test("the underlying value is untouched — hiding is render-time only", () => {
    const resume = { ...ALL_FILLED, hiddenPersonalDetails: ["dob"] };
    expect(resume.dob).toBe("12 Mar 1990");
    expect(buildPersonalDetailsEntries({ ...resume, hiddenPersonalDetails: [] })).toHaveLength(8);
  });

  test("hiding a field also suppresses its imported customFields twin", () => {
    const entries = buildPersonalDetailsEntries({
      visaStatus: "Employment Visa",
      hiddenPersonalDetails: ["visaStatus"],
      customFields: [{ id: "visa_status", name: "Visa Status", value: "Employment Visa" }],
    });
    expect(entries).toEqual([]);
  });

  test("hiding every populated field makes the whole block disappear", () => {
    expect(
      hasAnyPersonalDetail({ nationality: "Indian", dob: "1990", hiddenPersonalDetails: ["nationality", "dob"] }),
    ).toBe(false);
  });

  test("HIDEABLE_PERSONAL_DETAILS is exactly the three fields the UI exposes", () => {
    expect(HIDEABLE_PERSONAL_DETAILS).toEqual(["visaStatus", "nationality", "dob"]);
  });

  test("serverLib twin honours the same hide rule", () => {
    const resume = { ...ALL_FILLED, hiddenPersonalDetails: ["nationality", "dob"] };
    expect(buildPersonalDetailsEntriesPdf(resume)).toEqual(buildPersonalDetailsEntries(resume));
    expect(isPersonalDetailHiddenPdf(resume, "dob")).toBe(true);
    expect(isPersonalDetailHiddenPdf(resume, "gender")).toBe(false);
  });
});
