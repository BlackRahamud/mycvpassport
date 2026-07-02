import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import RequireRecruiter from "./RequireRecruiter";
import { supabase } from "../../appSupabaseClient";
import { fetchRecruiterStatus } from "../../lib/employer/recruiterStatus";

jest.mock("../../appSupabaseClient", () => ({
  supabase: { auth: { getSession: jest.fn() } },
}));
jest.mock("../../lib/employer/recruiterStatus", () => ({
  fetchRecruiterStatus: jest.fn(),
  completeEmployerOnboarding: jest.fn(() => Promise.resolve()),
}));

const session = (user) => ({ data: { session: user ? { user } : null } });

function renderGuard(initialPath = "/employer/jobs") {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/employer/login" element={<div>LOGIN PAGE</div>} />
        <Route path="/employer/onboarding" element={<div>ONBOARDING PAGE</div>} />
        <Route
          path="/employer/jobs"
          element={(
            <RequireRecruiter>
              <div>PORTAL CONTENT</div>
            </RequireRecruiter>
          )}
        />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  window.sessionStorage.clear();
});

test("logged out → redirected to /employer/login with return path preserved", async () => {
  supabase.auth.getSession.mockResolvedValue(session(null));
  renderGuard("/employer/jobs");
  expect(await screen.findByText("LOGIN PAGE")).toBeInTheDocument();
  expect(window.sessionStorage.getItem("cvp_return_path")).toBe("/employer/jobs");
});

test("signed-in candidate → explicit employers-only screen, not a blank shell", async () => {
  supabase.auth.getSession.mockResolvedValue(session({ id: "u1" }));
  fetchRecruiterStatus.mockResolvedValue({ isRecruiter: false, hrProfile: null });
  renderGuard();
  expect(await screen.findByText("This area is for employers")).toBeInTheDocument();
  expect(screen.getByText("Set up a company →")).toBeInTheDocument();
  expect(screen.queryByText("PORTAL CONTENT")).not.toBeInTheDocument();
});

test("recruiter with org row → portal renders", async () => {
  supabase.auth.getSession.mockResolvedValue(session({ id: "u1" }));
  fetchRecruiterStatus.mockResolvedValue({
    isRecruiter: true,
    hrProfile: { company_name: "Acme", company_id: "c1" },
  });
  renderGuard();
  expect(await screen.findByText("PORTAL CONTENT")).toBeInTheDocument();
});

test("recruiter without hr_profiles row → forwarded to onboarding", async () => {
  supabase.auth.getSession.mockResolvedValue(session({ id: "u1" }));
  fetchRecruiterStatus.mockResolvedValue({ isRecruiter: true, hrProfile: null });
  renderGuard();
  expect(await screen.findByText("ONBOARDING PAGE")).toBeInTheDocument();
});

test("role check failure → honest error with retry, no silent empty portal", async () => {
  supabase.auth.getSession.mockResolvedValue(session({ id: "u1" }));
  fetchRecruiterStatus.mockRejectedValue(new Error("network"));
  renderGuard();
  expect(await screen.findByText("Couldn’t verify your access")).toBeInTheDocument();
  expect(screen.getByText("Try again")).toBeInTheDocument();
  expect(screen.queryByText("PORTAL CONTENT")).not.toBeInTheDocument();
});
