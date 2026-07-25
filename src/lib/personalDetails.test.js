import { buildPersonalDetailsEntries } from "../cvShared";
import { buildPersonalDetailsEntries as buildPersonalDetailsEntriesPdf } from "../serverLib/pdfCommon";

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
