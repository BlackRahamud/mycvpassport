import { resolveLoginRoute } from "./loginRoute";

describe("resolveLoginRoute — both login intents × role matrix", () => {
  // Employer-intent logins (/employer/login or ?as=employer preset)
  test("employer intent + recruiter role → portal", () => {
    expect(resolveLoginRoute({ intentUserType: "recruiter", profileUserType: "recruiter", lastPortal: null }))
      .toBe("/employer/jobs");
  });
  test("employer intent + dual role → portal", () => {
    expect(resolveLoginRoute({ intentUserType: "recruiter", profileUserType: "both", lastPortal: "candidate" }))
      .toBe("/employer/jobs");
  });
  test("employer intent + candidate → onboarding grants the role, no re-login", () => {
    expect(resolveLoginRoute({ intentUserType: "recruiter", profileUserType: "candidate", lastPortal: null }))
      .toBe("/employer/onboarding");
  });
  test("employer intent + profile read failure → onboarding (self-redirects recruiters)", () => {
    expect(resolveLoginRoute({ intentUserType: "recruiter", profileUserType: null, lastPortal: null }))
      .toBe("/employer/onboarding");
  });

  // Main-site logins (no employer intent)
  test("main site + candidate → candidate home", () => {
    expect(resolveLoginRoute({ intentUserType: null, profileUserType: "candidate", lastPortal: null }))
      .toBe("/dashboard");
  });
  test("main site + recruiter-only account → portal (existing HR accounts keep working)", () => {
    expect(resolveLoginRoute({ intentUserType: null, profileUserType: "recruiter", lastPortal: null }))
      .toBe("/employer/jobs");
  });
  test("main site + dual role, last worked employer-side → portal", () => {
    expect(resolveLoginRoute({ intentUserType: null, profileUserType: "both", lastPortal: "employer" }))
      .toBe("/employer/jobs");
  });
  test("main site + dual role, last worked candidate-side → candidate home", () => {
    expect(resolveLoginRoute({ intentUserType: null, profileUserType: "both", lastPortal: "candidate" }))
      .toBe("/dashboard");
  });
  test("main site + dual role, no portal memory → candidate home", () => {
    expect(resolveLoginRoute({ intentUserType: null, profileUserType: "both", lastPortal: null }))
      .toBe("/dashboard");
  });
  test("main site + profile read failure → candidate home", () => {
    expect(resolveLoginRoute({ intentUserType: null, profileUserType: null, lastPortal: null }))
      .toBe("/dashboard");
  });
});
