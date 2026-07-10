import { render, screen, fireEvent } from "@testing-library/react";
import PipelineKanban from "./PipelineKanban";
import { readViewPref, writeViewPref, effectiveView, viewPrefKey } from "../../../lib/hr/viewPref";

const app = (id, name, status, score = 82) => ({
  id,
  candidate_id: `c-${id}`,
  job_id: "job-1",
  candidate_name: name,
  status,
  ats_score: score,
  score_source: "ai",
  applied_at: "2026-06-20T09:00:00.000Z",
});

const BUCKETS = {
  shortlist: [app("a1", "Rahul Sharma", "shortlisted", 91), app("a2", "Fatima Noor", "new", 76)],
  ready: [],
  interviewed: [app("a3", "Joseph Mathew", "interviewed", 68)],
  offer: [],
  hired: [],
};

describe("PipelineKanban", () => {
  test("renders one column per stage with counts, cards and designed empty states", () => {
    render(<PipelineKanban stageBuckets={BUCKETS} onMove={jest.fn()} onOpen={jest.fn()} reduce />);
    expect(screen.getByLabelText("Shortlist, 2 candidates")).toBeInTheDocument();
    expect(screen.getByLabelText("Ready, 0 candidates")).toBeInTheDocument();
    expect(screen.getByLabelText("Hired, 0 candidates")).toBeInTheDocument();
    expect(screen.getByText("Rahul Sharma")).toBeInTheDocument();
    expect(screen.getByText("91% match")).toBeInTheDocument();
    // Empty columns render a designed placeholder, not a collapsed nothing.
    expect(screen.getByText("No one at Ready yet")).toBeInTheDocument();
    expect(screen.getAllByText("Drag a card here to move them").length).toBeGreaterThan(0);
  });

  test("card click quick-opens the candidate with its stage", () => {
    const onOpen = jest.fn();
    render(<PipelineKanban stageBuckets={BUCKETS} onMove={jest.fn()} onOpen={onOpen} reduce />);
    fireEvent.click(screen.getByText("Joseph Mathew"));
    expect(onOpen).toHaveBeenCalledWith("a3", "interviewed");
  });

  test("keyboard path: move menu changes stage without a mouse drag", () => {
    const onMove = jest.fn();
    render(<PipelineKanban stageBuckets={BUCKETS} onMove={onMove} onOpen={jest.fn()} reduce />);
    fireEvent.click(screen.getByLabelText("Move Rahul Sharma to another stage"));
    expect(screen.getByRole("menu", { name: "Move to stage" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("menuitem", { name: "Interviewed" }));
    expect(onMove).toHaveBeenCalledWith("a1", "interviewed");
    // menu closes after choosing
    expect(screen.queryByRole("menu", { name: "Move to stage" })).not.toBeInTheDocument();
  });

  test("current stage is disabled in the move menu; Pass (reject) available", () => {
    const onMove = jest.fn();
    render(<PipelineKanban stageBuckets={BUCKETS} onMove={onMove} onOpen={jest.fn()} reduce />);
    fireEvent.click(screen.getByLabelText("Move Rahul Sharma to another stage"));
    expect(screen.getByRole("menuitem", { name: /Shortlist/ })).toBeDisabled();
    fireEvent.click(screen.getByRole("menuitem", { name: "Pass (reject)" }));
    expect(onMove).toHaveBeenCalledWith("a1", "rejected");
  });
});

describe("view preference", () => {
  beforeEach(() => window.localStorage.clear());

  test("persists per user and wins over device defaults", () => {
    expect(readViewPref("u1")).toBeNull();
    writeViewPref("u1", "list");
    expect(readViewPref("u1")).toBe("list");
    expect(readViewPref("u2")).toBeNull(); // per-user isolation
    expect(window.localStorage.getItem(viewPrefKey("u1"))).toBe("list");
    expect(effectiveView("list", true)).toBe("list"); // explicit choice wins on desktop
  });

  test("defaults: kanban on desktop, list on mobile", () => {
    expect(effectiveView(null, true)).toBe("kanban");
    expect(effectiveView(null, false)).toBe("list");
  });

  test("garbage stored values are ignored", () => {
    window.localStorage.setItem(viewPrefKey("u1"), "banana");
    expect(readViewPref("u1")).toBeNull();
  });
});
