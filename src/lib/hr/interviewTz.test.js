import {
  zoneForLocation,
  inferCandidateZone,
  dualTimeLine,
  dualTimeParts,
  wordForTz,
} from "./interviewTz";

describe("zoneForLocation", () => {
  it("reads Indian cities", () => {
    expect(zoneForLocation("Andheri East, Mumbai").key).toBe("india");
    expect(zoneForLocation("Bengaluru, Karnataka").key).toBe("india");
  });
  it("reads UAE cities", () => {
    expect(zoneForLocation("Deira, Dubai").key).toBe("uae");
    expect(zoneForLocation("Sharjah").key).toBe("uae");
  });
  it("reads the rest of the corridor", () => {
    expect(zoneForLocation("Doha, Qatar").key).toBe("qatar");
    expect(zoneForLocation("Riyadh").key).toBe("ksa");
    expect(zoneForLocation("Muscat, Oman").key).toBe("oman");
  });
  it("returns null for unreadable text", () => {
    expect(zoneForLocation("")).toBeNull();
    expect(zoneForLocation("London, UK")).toBeNull();
  });
});

describe("inferCandidateZone", () => {
  it("prefers the CV location", () => {
    const { zone, source } = inferCandidateZone({ cvLocation: "Pune, India", jobLocation: "Dubai" });
    expect(zone.key).toBe("india");
    expect(source).toBe("cv");
  });
  it("falls back to the job market", () => {
    const { zone, source } = inferCandidateZone({ cvLocation: "", jobLocation: "Dubai, UAE" });
    expect(zone.key).toBe("uae");
    expect(source).toBe("job");
  });
  it("degrades to null, never guesses", () => {
    const { zone, source } = inferCandidateZone({ cvLocation: "Paris", jobLocation: "" });
    expect(zone).toBeNull();
    expect(source).toBeNull();
  });
});

describe("dualTimeLine", () => {
  // 2026-07-14 11:00:00 UTC = 3:00 PM Dubai (+04), 4:30 PM India (+05:30)
  const when = new Date("2026-07-14T11:00:00Z");

  it("reads in words, Dubai to India", () => {
    expect(dualTimeLine({ when, hrTz: "Asia/Dubai", candidateTz: "Asia/Kolkata" }))
      .toBe("3:00 PM Dubai, 4:30 PM India");
  });

  it("collapses to same time with the first name", () => {
    expect(dualTimeLine({ when, hrTz: "Asia/Dubai", candidateTz: "Asia/Dubai", firstName: "Faisal" }))
      .toBe("3:00 PM Dubai, same time for Faisal");
  });

  it("carries the candidate day when the date flips", () => {
    // 2026-07-14 20:30 UTC = 12:30 AM on 15 Jul in Dubai? No: +04 → 00:30 on 15 Jul.
    const late = new Date("2026-07-14T20:30:00Z");
    const p = dualTimeParts({ when: late, hrTz: "Asia/Qatar", candidateTz: "Asia/Kolkata" });
    // 11:30 PM Qatar on 14 Jul, 2:00 AM India on 15 Jul
    expect(p.dayDiffers).toBe(true);
    expect(dualTimeLine({ when: late, hrTz: "Asia/Qatar", candidateTz: "Asia/Kolkata" }))
      .toBe("11:30 PM Qatar, 2:00 AM India on Wed 15 Jul");
  });
});

describe("wordForTz", () => {
  it("uses corridor words", () => {
    expect(wordForTz("Asia/Dubai")).toBe("Dubai");
    expect(wordForTz("Asia/Kolkata")).toBe("India");
  });
  it("falls back to the city segment", () => {
    expect(wordForTz("Europe/London")).toBe("London");
  });
});
