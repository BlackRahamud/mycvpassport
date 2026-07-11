/**
 * CvViewerOverlay reliability contract (carried over from CvDrawer):
 *  - failure renders an honest error with a working Retry (never a dead panel)
 *  - pdf renders our own sheets via pdf.js — no native embed anywhere
 *  - docx renders a clean HTML sheet via mammoth
 *  - unsupported types end the fallback chain at the file card (Download +
 *    new-tab anchors), never a dead panel
 *  - missing path renders an honest empty state, not an eternal spinner
 */
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import CvViewerOverlay from "./CvViewerOverlay";

// framer-motion stub: strip motion props, render plain elements.
jest.mock("framer-motion", () => {
  const React = require("react");
  const strip = (tag) =>
    // eslint-disable-next-line react/display-name
    React.forwardRef(({ initial, animate, exit, transition, whileHover, whileTap, ...rest }, ref) =>
      React.createElement(tag, { ...rest, ref }));
  return {
    AnimatePresence: ({ children }) => children,
    motion: { div: strip("div"), aside: strip("aside"), section: strip("section") },
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

// pdf.js stub: one 600x800 page that "renders" instantly. getDocument is a
// swappable mock so tests can simulate stale-deploy chunk/worker failures.
const mockGetDocument = jest.fn();
jest.mock("pdfjs-dist", () => ({
  GlobalWorkerOptions: {},
  getDocument: (...a) => mockGetDocument(...a),
}));
const happyPdf = () => ({
  promise: Promise.resolve({
    numPages: 1,
    getPage: async () => ({
      getViewport: ({ scale }) => ({ width: 600 * scale, height: 800 * scale }),
      render: () => ({ promise: Promise.resolve() }),
    }),
    destroy: jest.fn(),
  }),
});

jest.mock("mammoth/mammoth.browser", () => ({
  convertToHtml: async () => ({ value: "<h1>Jane Candidate</h1><p>Operations lead.</p>" }),
}));

const INTEL = {
  name: "Jane Candidate",
  role: "Operations Lead",
  score: 82,
  scoreSource: "stopgap_keyword",
  matchedKeywords: ["logistics"],
  missingKeywords: ["arabic"],
  email: "jane@example.com",
};

beforeEach(() => {
  global.URL.createObjectURL = jest.fn(() => "blob:mock-cv");
  global.URL.revokeObjectURL = jest.fn();
  // jsdom has no canvas 2d context.
  HTMLCanvasElement.prototype.getContext = jest.fn(() => ({}));
  mockDownload.mockReset();
  mockCreateSignedUrl.mockReset();
  mockCreateSignedUrl.mockResolvedValue({ data: { signedUrl: "https://signed.example/cv" }, error: null });
  mockGetDocument.mockReset();
  mockGetDocument.mockImplementation(happyPdf);
});

test("failure path: honest error + Retry refetches", async () => {
  mockDownload.mockResolvedValueOnce({ data: null, error: new Error("RLS denied") });
  render(<CvViewerOverlay open path="uid/job-1.pdf" fileName="Jane CV.pdf" intel={INTEL} onClose={() => {}} />);

  expect(await screen.findByText(/couldn.t load this cv/i)).toBeInTheDocument();
  expect(mockDownload).toHaveBeenCalledTimes(1);

  mockDownload.mockResolvedValueOnce({ data: new Blob(["%PDF-1.4"], { type: "application/pdf" }), error: null });
  fireEvent.click(screen.getByRole("button", { name: /try again/i }));
  await waitFor(() => expect(mockDownload).toHaveBeenCalledTimes(2));
  expect(await screen.findByLabelText(/cv page 1/i)).toBeInTheDocument();
});

test("pdf: our own page canvases + zoom controls, no iframe/embed", async () => {
  mockDownload.mockResolvedValueOnce({ data: new Blob(["%PDF-1.4"], { type: "application/octet-stream" }), error: null });
  render(<CvViewerOverlay open path="uid/job-2.pdf" fileName="Jane CV.pdf" intel={INTEL} onClose={() => {}} />);

  expect(await screen.findByLabelText(/cv page 1/i)).toBeInTheDocument();
  expect(screen.getByText(/page 1 \/ 1/i)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /zoom in/i })).toBeInTheDocument();
  // The whole point: no native viewer chrome.
  expect(screen.queryByTitle("Resume preview")).toBeNull();
});

test("docx renders a clean HTML sheet via mammoth", async () => {
  mockDownload.mockResolvedValueOnce({ data: new Blob(["PK"], { type: "application/octet-stream" }), error: null });
  render(<CvViewerOverlay open path="uid/job-3.docx" fileName="Jane CV.docx" intel={INTEL} onClose={() => {}} />);

  expect(await screen.findByRole("heading", { name: /jane candidate/i })).toBeInTheDocument();
});

test("unsupported type ends the chain at the file card, never a dead panel", async () => {
  mockDownload.mockResolvedValueOnce({ data: new Blob(["bin"], { type: "application/octet-stream" }), error: null });
  render(<CvViewerOverlay open path="uid/job-4.doc" fileName="Jane CV.doc" intel={INTEL} onClose={() => {}} />);

  expect(await screen.findByText(/preview is not supported/i)).toBeInTheDocument();
  const download = screen.getByRole("link", { name: /^download$/i });
  expect(download).toHaveAttribute("href", "https://signed.example/cv");
  expect(download).toHaveAttribute("download");
  // Toolbar icon + file-card link both offer new-tab escape hatches.
  const tabLinks = screen.getAllByRole("link", { name: /^open in new tab$/i });
  expect(tabLinks.length).toBeGreaterThanOrEqual(1);
  tabLinks.forEach((l) => expect(l).toHaveAttribute("target", "_blank"));
});

test("stale deploy (chunk/worker gone) says refresh, not 'preview not supported'", async () => {
  mockDownload.mockResolvedValueOnce({ data: new Blob(["%PDF-1.4"], { type: "application/pdf" }), error: null });
  mockGetDocument.mockImplementation(() => {
    throw Object.assign(new Error("Loading chunk 42 failed."), { name: "ChunkLoadError" });
  });
  render(<CvViewerOverlay open path="uid/job-6.pdf" fileName="Jane CV.pdf" intel={INTEL} onClose={() => {}} />);

  expect(await screen.findByText(/updated since this page loaded/i)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /refresh page/i })).toBeInTheDocument();
  expect(screen.queryByText(/preview is not supported/i)).toBeNull();
  // one immediate retry happened before giving up
  expect(mockGetDocument).toHaveBeenCalledTimes(2);
});

test("corrupt pdf ends at the file card with honest copy, not 'not supported'", async () => {
  mockDownload.mockResolvedValueOnce({ data: new Blob(["%PDF-1.4"], { type: "application/pdf" }), error: null });
  mockGetDocument.mockImplementation(() => {
    throw new Error("Invalid PDF structure");
  });
  render(<CvViewerOverlay open path="uid/job-7.pdf" fileName="Jane CV.pdf" intel={INTEL} onClose={() => {}} />);

  expect(await screen.findByText(/could not be rendered/i)).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /^download$/i })).toBeInTheDocument();
  // parse errors are not retried
  expect(mockGetDocument).toHaveBeenCalledTimes(1);
});

test("missing path: honest empty state, no spinner, no fetch", async () => {
  render(<CvViewerOverlay open path={null} fileName="Jane CV" intel={INTEL} onClose={() => {}} />);
  expect(await screen.findByText(/no uploaded cv file/i)).toBeInTheDocument();
  expect(mockDownload).not.toHaveBeenCalled();
});

test("intelligence rail shows identity, skills match and outreach actions", async () => {
  mockDownload.mockResolvedValueOnce({ data: new Blob(["%PDF-1.4"], { type: "application/pdf" }), error: null });
  const onWhatsApp = jest.fn();
  render(
    <CvViewerOverlay
      open
      path="uid/job-5.pdf"
      fileName="Jane CV.pdf"
      intel={{ ...INTEL, onWhatsApp }}
      onClose={() => {}}
    />,
  );

  expect(await screen.findByText("Jane Candidate")).toBeInTheDocument();
  expect(screen.getByText("logistics")).toBeInTheDocument();
  expect(screen.getByText("arabic")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /whatsapp/i }));
  expect(onWhatsApp).toHaveBeenCalled();
  expect(screen.getByRole("link", { name: /email/i })).toHaveAttribute(
    "href",
    expect.stringContaining("mailto:jane@example.com"),
  );
});
