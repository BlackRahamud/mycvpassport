import { trimAuthFields } from "./authUtils";

describe("trimAuthFields", () => {
  test("trims name/email/password and lowercases email", () => {
    expect(trimAuthFields({ name: " Jo ", email: " A@B.COM ", password: " pw123456 " }))
      .toMatchObject({ name: "Jo", email: "a@b.com", password: "pw123456" });
  });

  // Regression: these three were silently dropped, which turned every
  // employer signup into a plain candidate account (no user_type, no
  // hr_profiles row).
  test("preserves employer-signup fields through trimming", () => {
    const out = trimAuthFields({
      name: "Jo",
      email: "a@b.com",
      password: "pw123456",
      userType: "recruiter",
      workEmail: " HR@Company.com ",
      companyName: " Acme Hiring ",
    });
    expect(out.userType).toBe("recruiter");
    expect(out.workEmail).toBe("hr@company.com");
    expect(out.companyName).toBe("Acme Hiring");
  });

  test("employer fields absent → undefined, not empty strings", () => {
    const out = trimAuthFields({ name: "Jo", email: "a@b.com", password: "pw123456" });
    expect(out.userType).toBeUndefined();
    expect(out.workEmail).toBeUndefined();
    expect(out.companyName).toBeUndefined();
  });
});
