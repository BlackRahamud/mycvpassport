/**
 * CvDrawer reliability contract:
 *  - failure renders an honest error with a working Retry (never a dead panel)
 *  - non-PDF files get the file card with Download/new-tab anchors, no iframe
 *    (an iframe pointed at a docx triggers a download on every open)
 *  - PDF renders inline from an authenticated blob
 *  - missing path renders an honest empty state, not an eternal spinner
 */
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import CvDrawer from "./CvDrawer";

// framer-motion stub: strip motion props, render plain elements. Keeps the
// test independent of framer's ESM build under CRA's jest transform.
jest.mock("framer-motion", () => {
  const React = require("react");
  const strip = (tag) =>
    // eslint-disable-next-line react/display-name
    React.forwardRef(({ initial, animate, exit, transition, whileHover, whileTap, ...rest }, ref) =>
      React.createElement(tag, { ...rest, ref }));
  return {
    AnimatePresence: ({ children }) => children,
    motion: { div: strip("div"), aside: strip("aside") },
    useReducedMotion: () => true,
  };
});

const mockDownload = jest.fn();
const mockCreateSignedUrl = jest.fn();
jest.mock("../../appSupabaseClient", () => ({
  supabase: {
    storage: {
      from: () => ({
        download: (...a) => mockDownload(...a),
        createSignedUrl: (...a) => mockCreateSignedUrl(...a),
      }),
    },
  },
}));

beforeEach(() => {
  // jsdom has no object URLs. Defined per-test because CRA's jest config
  // sets resetMocks: true, which wipes beforeAll-installed implementations.
  global.URL.createObjectURL = jest.fn(() => "blob:mock-cv");
  global.URL.revokeObjectURL = jest.fn();
  mockDownload.mockReset();
  mockCreateSignedUrl.mockReset();
  mockCreateSignedUrl.mockResolvedValue({ data: { signedUrl: "https://signed.example/cv" }, error: null });
});

test("failure path: honest error + Retry refetches", async () => {
  mockDownload.mockResolvedValueOnce({ data: null, error: new Error("RLS denied") });
  render(<CvDrawer open path="uid/job-1.pdf" fileName="Test CV.pdf" onClose={() => {}} />);

  expect(await screen.findByText(/couldn.t load this cv/i)).toBeInTheDocument();
  expect(mockDownload).toHaveBeenCalledTimes(1);

  mockDownload.mockResolvedValueOnce({ data: new Blob(["%PDF-1.4"], { type: "application/pdf" }), error: null });
  fireEvent.click(screen.getByRole("button", { name: /try again/i }));

  await waitFor(() => expect(mockDownload).toHaveBeenCalledTimes(2));
  expect(await screen.findByTitle("Resume preview")).toBeInTheDocument();
});

test("docx: file card with Download + new tab, and no iframe", async () => {
  mockDownload.mockResolvedValueOnce({ data: new Blob(["PK"], { type: "application/octet-stream" }), error: null });
  render(<CvDrawer open path="uid/job-2.docx" fileName="Test CV.docx" onClose={() => {}} />);

  expect(await screen.findByText(/preview not supported/i)).toBeInTheDocument();
  expect(screen.queryByTitle("Resume preview")).toBeNull();

  // Exact name "Download" is the file-card button — the header icon's
  // accessible name is "Download CV".
  const download = screen.getByRole("link", { name: /^download$/i });
  expect(download).toHaveAttribute("href", "https://signed.example/cv");
  expect(download).toHaveAttribute("download");
  expect(screen.getByRole("link", { name: /open in new tab/i })).toHaveAttribute("target", "_blank");
});

test("pdf renders inline from the authenticated blob", async () => {
  mockDownload.mockResolvedValueOnce({ data: new Blob(["%PDF-1.4"], { type: "application/octet-stream" }), error: null });
  render(<CvDrawer open path="uid/job-3.pdf" fileName="Test CV.pdf" onClose={() => {}} />);

  const frame = await screen.findByTitle("Resume preview");
  expect(frame).toHaveAttribute("src", "blob:mock-cv");
});

test("missing path: honest empty state, no spinner, no fetch", async () => {
  render(<CvDrawer open path={null} fileName="Test CV" onClose={() => {}} />);
  expect(await screen.findByText(/no uploaded cv file/i)).toBeInTheDocument();
  expect(screen.queryByText(/loading cv/i)).toBeNull();
  expect(mockDownload).not.toHaveBeenCalled();
});
