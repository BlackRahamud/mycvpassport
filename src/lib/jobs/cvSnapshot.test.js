import { builderCvToSnapshot } from "./cvSnapshot";

// A realistic builder cv_data (EMPTY_RESUME shape): camelCase, skills as a
// comma string, experience[].points, education[].fieldOfStudy, plus a
// Personal Details customFields block.
const builderCv = {
  name: "Asha Menon",
  email: "asha@example.com",
  phone: "+971 50 000 0000",
  linkedin: "https://linkedin.com/in/asha",
  location: "Dubai, UAE",
  title: "Senior Accountant",
  summary: "Qualified accountant with GCC experience.",
  nationality: "Indian",
  visaStatus: "Employment visa (transferable)",
  availability: "30 days",
  skills: "IFRS, Reconciliation, SAP FICO, VAT",
  languages: "English, Hindi, Malayalam",
  certifications: [{ name: "CA", issuer: "ICAI", year: "2016" }],
  experience: [
    {
      company: "Gulf Trading LLC",
      role: "Senior Accountant",
      location: "Dubai",
      startDate: "Jan 2020",
      endDate: "",
      present: true,
      points: "Owned monthly close for 3 entities\nCut reporting time 40%",
    },
  ],
  education: [
    { school: "University of Calicut", degree: "B.Com", fieldOfStudy: "Commerce", startDate: "2010", endDate: "2013" },
  ],
  customFields: [{ id: "notice_period", name: "Notice Period", value: "60 days" }],
};

describe("builderCvToSnapshot — casing/shape bridge", () => {
  const snap = builderCvToSnapshot(builderCv);

  it("bridges visa casing: visaStatus -> visa_status", () => {
    expect(snap.visa_status).toBe("Employment visa (transferable)");
  });

  it("maps desired_job from title", () => {
    expect(snap.desired_job).toBe("Senior Accountant");
    expect(snap.personal.headline).toBe("Senior Accountant");
  });

  it("turns the skills comma-string into an array", () => {
    expect(Array.isArray(snap.skills)).toBe(true);
    expect(snap.skills).toEqual(["IFRS", "Reconciliation", "SAP FICO", "VAT"]);
  });

  it("maps experience: role->title, points->bullets[], startDate->start_date, present->'Present'", () => {
    const e = snap.experience[0];
    expect(e.title).toBe("Senior Accountant");
    expect(e.start_date).toBe("Jan 2020");
    expect(e.end_date).toBe("Present");
    expect(e.bullets).toEqual(["Owned monthly close for 3 entities", "Cut reporting time 40%"]);
  });

  it("maps education fieldOfStudy -> field", () => {
    expect(snap.education[0].field).toBe("Commerce");
  });

  it("takes notice_period from the availability field (customFields is a fallback)", () => {
    expect(snap.notice_period).toBe("30 days");
  });

  it("takes notice_period from customFields when no flat availability exists", () => {
    const { availability, ...noAvail } = builderCv;
    expect(builderCvToSnapshot(noAvail).notice_period).toBe("60 days");
  });

  it("leaves the unmappable fields null — never guessed", () => {
    // No builder field exists for either; must stay null.
    expect(snap.salary_expectation).toBeNull();
    expect(snap.passport_status).toBeNull();
  });

  it("preserves display-only extras the contract has no home for", () => {
    expect(snap.linkedin).toBe("https://linkedin.com/in/asha");
    expect(snap.languages).toBe("English, Hindi, Malayalam");
    expect(snap.certifications).toHaveLength(1);
  });

  it("is idempotent on an already-contract snapshot", () => {
    const twice = builderCvToSnapshot(snap);
    expect(twice.visa_status).toBe("Employment visa (transferable)");
    expect(twice.skills).toEqual(["IFRS", "Reconciliation", "SAP FICO", "VAT"]);
    expect(twice.experience[0].bullets).toEqual(snap.experience[0].bullets);
  });

  it("passes non-objects through untouched", () => {
    expect(builderCvToSnapshot(null)).toBeNull();
  });
});
