import { useState, useEffect } from "react";
import { getCurrentUserProfile, joinWaitlist } from "./supabaseClient";
import { normalizeResumeText } from "./normalizeResumeText";
import { Target, Eye, CheckCircle2 } from "lucide-react";

const STOP_WORDS = new Set(["a","an","the","and","or","but","in","on","at","to","for","of","with","by","from","is","are","was","were","be","been","being","have","has","had","do","does","did","will","would","could","should","may","might","that","this","these","those","it","its","we","you","your","our","their","they","he","she","as","if","then","than","so","up","out","about","into","through","during","including","until","against","among","throughout","within","also","very","just","more","most","some","such","no","not","only","same","other","each","few","many","how","all","both","between","i","me","my"]);

const EXPECTED_SECTIONS = [
  { key: "experience", labels: ["experience", "work experience", "employment", "career history", "professional experience"] },
  { key: "education", labels: ["education", "academic background", "qualifications", "academic qualifications"] },
  { key: "skills", labels: ["skills", "key skills", "technical skills", "core competencies", "competencies"] },
  { key: "summary", labels: ["summary", "profile", "objective", "professional summary", "career objective", "about me"] },
  { key: "certifications", labels: ["certification", "certifications", "courses", "training", "professional development"] },
];

const FORMATTING_FLAGS = [
  { id: "table", pattern: /\|.*\||\t.*\t/, msg: "Tables detected — potential parsing interference." },
  { id: "image", pattern: /\[image\]|\[photo\]|<img/i, msg: "Visual placeholders detected — non-text elements ignored." },
  { id: "header", pattern: /header|footer/i, msg: "Header/footer content may be skipped." },
  { id: "special", pattern: /[●◆■▶►✦✧★☆]/, msg: "Non-standard bullet symbols — use hyphens." },
  { id: "columns", pattern: /(.{1,40}\s{5,}.{1,40}){3,}/, msg: "Multi-column layout detected." },
];

// --- Circular Gauge Component ---
function ReadinessGauge({ score }) {
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = "#FFFFFF";

  return (
    <div style={{ position: "relative", width: 180, height: 180, margin: "0 auto" }}>
      <svg width="180" height="180" viewBox="0 0 180 180">
        <circle cx="90" cy="90" r={radius} fill="transparent" stroke="rgba(255,255,255,0.05)" strokeWidth="12" />
        <circle
          cx="90" cy="90" r={radius} fill="transparent"
          stroke={color} strokeWidth="12" strokeDasharray={circumference}
          strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1.5s ease-in-out, stroke 1.5s ease" }}
          transform="rotate(-90 90 90)"
        />
      </svg>
      <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", textAlign: "center" }}>
        <div style={{ fontSize: 42, fontWeight: 900, color: color }}>{score}</div>
        <div style={{ fontSize: 10, color: "#A0A0A0", fontWeight: 700, textTransform: "uppercase" }}>Readiness</div>
      </div>
    </div>
  );
}

// --- Text Extractor Helpers ---
async function extractText(file) {
  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf")) return extractFromPDF(file);
  if (name.endsWith(".docx")) return extractFromDOCX(file);
  return extractFromTXT(file);
}

async function extractFromPDF(file) {
  if (!window.pdfjsLib) throw new Error("PDF.js not loaded.");
  const reader = new FileReader();
  return new Promise((resolve) => {
    reader.readAsArrayBuffer(file);
    reader.onload = async function() {
      const pdf = await window.pdfjsLib.getDocument(new Uint8Array(this.result)).promise;
      let text = "";
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const pageText = content.items.map(item => item.str).join(" ");
        text += pageText + " ";
      }
      resolve(text);
    };
  });
}

async function extractFromDOCX(file) {
  const reader = new FileReader();
  return new Promise((resolve) => {
    reader.readAsArrayBuffer(file);
    reader.onload = async function() {
      const mammoth = await window.mammoth;
      const result = await mammoth.extractRawText({ arrayBuffer: this.result });
      resolve(result.value);
    };
  });
}

function extractFromTXT(file) {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.readAsText(file);
    reader.onload = () => resolve(reader.result);
  });
}

// --- Analysis Functions ---
function getKeywords(text) {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter(w => w.length > 2 && !STOP_WORDS.has(w));
}

function analyzeKeywords(resumeText, jobDesc) {
  const resumeSet = new Set(getKeywords(resumeText));
  const jobWords = [...new Set(getKeywords(jobDesc))];
  if (jobWords.length === 0) return { score: 0, matched: [], missing: [], total: 0 };
  const matched = jobWords.filter(w => resumeSet.has(w));
  const missing = jobWords.filter(w => !resumeSet.has(w));
  return { score: Math.round((matched.length / jobWords.length) * 50), matched, missing: missing.slice(0, 30), total: jobWords.length };
}

function analyzeSections(resumeText) {
  const lower = resumeText.toLowerCase();
  const found = EXPECTED_SECTIONS.filter(s => s.labels.some(l => lower.includes(l))).map(s => s.key);
  return { score: Math.min(found.length * 6, 30), found, missing: EXPECTED_SECTIONS.filter(s => !found.includes(s.key)).map(s => s.key) };
}

function analyzeFormatting(resumeText) {
  const warnings = FORMATTING_FLAGS.filter(f => f.pattern.test(resumeText));
  return { score: Math.max(20 - warnings.length * 4, 0), warnings };
}

// --- Main Component ---
export default function ATSChecker(props) {
  const [jobDesc, setJobDesc] = useState("");
  const [resumeFile, setResumeFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState(0);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [isPro, setIsPro] = useState(false);
  const [showWaitlistModal, setShowWaitlistModal] = useState(false);
  const [waitlistEmail, setWaitlistEmail] = useState("");
  const [waitlistLoading, setWaitlistLoading] = useState(false);
  const [waitlistMessage, setWaitlistMessage] = useState({ type: "", text: "" });

  const loadingMessages = [
    "🔍 Parsing structural data...",
    "⚙️ Cross-referencing industry keywords...",
    "📊 Finalizing professional readiness report..."
  ];

  useEffect(() => {
    async function checkPro() {
      try {
        const profile = await getCurrentUserProfile();
        if (profile?.isPro) setIsPro(true);
      } catch (e) { console.error("Profile check failed", e); }
    }
    checkPro();
  }, []);

  async function handleCheck() {
    if (!resumeFile || !jobDesc.trim()) {
      setError("Please provide both a resume and a job description.");
      return;
    }
    setError("");
    setLoading(true);
    setResult(null);
    setLoadingStage(0);

    const stages = [0, 1, 2];
    stages.forEach((stage) => {
      setTimeout(() => setLoadingStage(stage), stage * 1000);
    });

    try {
      const resumeText = await extractText(resumeFile);
      const plainLength = resumeText.replace(/\s+/g, " ").trim().length;

      if (plainLength < 200) {
        setError("Scanned PDF Detected: Please upload a text-based PDF.");
        setLoading(false);
        return;
      }

      const normalized = normalizeResumeText(resumeText);
      const kw = analyzeKeywords(normalized, jobDesc);
      const sec = analyzeSections(normalized);
      const fmt = analyzeFormatting(normalized);

      setTimeout(() => {
        setResult({
          kw, sec, fmt,
          total: kw.score + sec.score + fmt.score,
          resumeText: normalized,
          rawResumeText: resumeText,
          pdfPreviewUrl: URL.createObjectURL(resumeFile)
        });
        setLoading(false);
      }, 3000);

    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 850, margin: "0 auto", padding: "40px 20px", color: "#FFFFFF", background: "#0A0A0A", minHeight: "100vh" }}>
      
      {/* Back Button */}
      {props.onBack && (
        <div onClick={props.onBack} style={{ fontSize: "13px", color: "#aaa", cursor: "pointer", marginBottom: "24px", display: "inline-flex", alignItems: "center", gap: "6px" }}>
          ← Back to Dashboard
        </div>
      )}
      
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 40 }}>
        <h1 className="cvp-ats-heading" style={{ fontSize: 32, fontWeight: 900, letterSpacing: "-0.02em" }}>ATS Score Checker</h1>
        <p style={{ color: "#A0A0A0", marginTop: 8 }}>See how your CV scores against any job description. Built for UAE & GCC roles.</p>
        <div
  onDragOver={(e) => e.preventDefault()}
  onDrop={(e) => { e.preventDefault(); const file = e.dataTransfer.files[0]; if (file) setResumeFile(file); }}
  onClick={() => document.getElementById('resume-upload').click()}
  style={{ background: "#141414", padding: 24, borderRadius: 16, border: "1px solid #2A2A2A", cursor: "pointer", textAlign: "center" }}
>
  <label style={{ fontSize: 12, fontWeight: 800, textTransform: "uppercase", color: "#A0A0A0" }}>Resume Upload</label>
  <div style={{ marginTop: 12, color: "#A0A0A0", fontSize: 13 }}>
    {resumeFile ? `✅ ${resumeFile.name}` : "Drag & drop PDF or DOCX here, or click to browse"}
  </div>
  <input id="resume-upload" type="file" accept=".pdf,.docx,.txt" onChange={(e) => setResumeFile(e.target.files[0])} style={{ display: "none" }} />
</div>        <div style={{ background: "#141414", padding: 24, borderRadius: 16, border: "1px solid #2A2A2A" }}>
          <label style={{ fontSize: 12, fontWeight: 800, textTransform: "uppercase", color: "#A0A0A0" }}>Job Target</label>
          <textarea 
            rows={3} 
            value={jobDesc} 
            onChange={(e) => setJobDesc(e.target.value)} 
            placeholder="Paste target role description..."
            style={{ width: "100%", background: "transparent", border: "none", color: "#fff", marginTop: 8, outline: "none", resize: "none" }}
          />
        </div>
      </div>

      <button 
        onClick={handleCheck} 
        disabled={loading}
        style={{ width: "100%", padding: 16, borderRadius: 12, background: "#FFFFFF", color: "#000000", fontWeight: 700, cursor: "pointer", border: "none" }}
      >
        {loading ? loadingMessages[loadingStage] : "Execute Analysis"}
      </button>

      {error && <div style={{ color: "#ef4444", marginTop: 20, textAlign: "center", fontWeight: 600 }}>{error}</div>}

      {/* Dashboard Results */}
      {result && !loading && (
        <div style={{ marginTop: 40 }}>
          <ReadinessGauge score={result.total} />

          {/* Score cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 20, marginTop: 40 }}>
            <div style={{ background: "#141414", border: "1px solid #2A2A2A", borderRadius: 16, padding: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                <Target size={18} color="#FFFFFF" />
                <h3 style={{ fontSize: 14, fontWeight: 800 }}>Keyword Optimization</h3>
              </div>
              <div style={{ fontSize: 24, fontWeight: 900 }}>{result.kw.score}/50</div>
              <p style={{ fontSize: 12, color: "#A0A0A0", marginTop: 8 }}>Analysis of essential industry terminology matched.</p>
            </div>

            <div style={{ background: "#141414", border: "1px solid #2A2A2A", borderRadius: 16, padding: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                <CheckCircle2 size={18} color="#FFFFFF" />
                <h3 style={{ fontSize: 14, fontWeight: 800 }}>Professional Readiness</h3>
              </div>
              <div style={{ fontSize: 24, fontWeight: 900 }}>{result.sec.score}/30</div>
              <p style={{ fontSize: 12, color: "#A0A0A0", marginTop: 8 }}>Validation of core structural pillars and headings.</p>
            </div>

            <div style={{ background: "#141414", border: "1px solid #2A2A2A", borderRadius: 16, padding: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                <Eye size={18} color="#FFFFFF" />
                <h3 style={{ fontSize: 14, fontWeight: 800 }}>Readability Insight</h3>
              </div>
              <div style={{ fontSize: 24, fontWeight: 900 }}>{result.fmt.score}/20</div>
              <p style={{ fontSize: 12, color: "#A0A0A0", marginTop: 8 }}>Detection of layout interference and parsing risks.</p>
            </div>
          </div>

          {/* Visual Proof Hook (Free Users Only) */}
          {!isPro && (
            <div style={{ marginTop: 40 }}>
              <h3 style={{ fontSize: 18, fontWeight: 900, marginBottom: 20 }}>ATS Visibility Check</h3>
              <div className="cvp-ats-visibility-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                <div style={{ background: "#fff", padding: 10, borderRadius: 12, height: 300, overflow: "hidden" }}>
                  <div style={{ color: "#000", fontSize: 10, fontWeight: 800, marginBottom: 5 }}>Human View (Formatted)</div>
                  <iframe title="CV Human View" src={result.pdfPreviewUrl} style={{ width: "100%", height: "100%", border: "none" }} />
                </div>
                <div style={{ background: "#000", padding: 15, borderRadius: 12, height: 300, position: "relative", border: "1px solid #ef4444" }}>
                  <div style={{ color: "#ef4444", fontSize: 10, fontWeight: 800, marginBottom: 5 }}>ATS View (Raw Text) — ❌ Layout Interference</div>
                  <pre style={{ fontSize: 9, color: "#fff", opacity: 0.6, whiteSpace: "pre-wrap" }}>{result.rawResumeText.substring(0, 800)}...</pre>
                </div>
              </div>
            </div>
          )}

          {/* Pricing Wall */}
          <div style={{ marginTop: 40, padding: 32, borderRadius: 24, background: "#141414", textAlign: "center", border: "1px solid #2A2A2A" }}>
            <h2 style={{ fontSize: 24, fontWeight: 900 }}>Upgrade to Deep Scan Pro</h2>
            <div className="cvp-ats-pricing-row" style={{ display: "flex", justifyContent: "center", gap: 30, marginTop: 24 }}>
              <div>
                <div style={{ fontSize: 12, color: "#A0A0A0" }}>Basic Scan</div>
                <div style={{ fontSize: 20, fontWeight: 800 }}>AED 0</div>
              </div>
              <div style={{ width: 1, background: "#2A2A2A" }} />
              <div>
                <div style={{ fontSize: 12, color: "#A0A0A0" }}>Deep Scan Pro</div>
                <div style={{ fontSize: 20, fontWeight: 800 }}>AED 49</div>
              </div>
            </div>
            <button 
              onClick={() => setShowWaitlistModal(true)}
              style={{ marginTop: 24, padding: "12px 40px", borderRadius: 99, background: "#FFFFFF", color: "#000000", fontWeight: 700, border: "none", cursor: "pointer" }}
            >
              Join Priority Waitlist
            </button>
          </div>
        </div>
      )}

      {/* Waitlist Modal */}
      {showWaitlistModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }}>
          <div style={{ background: "#141414", padding: 40, borderRadius: 24, maxWidth: 400, width: "90%", textAlign: "center", border: "1px solid #2A2A2A" }}>
            <h3 style={{ fontSize: 22, fontWeight: 900 }}>Coming Soon</h3>
            <p style={{ color: "#A0A0A0", margin: "12px 0 24px" }}>We are perfecting our Deep Scan engine. Join the waitlist for priority access and a 50% launch discount.</p>
            
            {waitlistMessage.text ? (
              <div style={{ color: "#FFFFFF", fontWeight: 700, marginBottom: 20 }}>{waitlistMessage.text}</div>
            ) : (
              <>
                <input 
                  type="email" 
                  placeholder="Enter your email" 
                  value={waitlistEmail}
                  onChange={(e) => setWaitlistEmail(e.target.value)}
                  style={{ width: "100%", padding: 14, borderRadius: 12, background: "#0A0A0A", border: "1px solid #2A2A2A", color: "#fff", marginBottom: 16 }}
                />
                <button 
                  onClick={async () => {
                    setWaitlistLoading(true);
                    try {
                      await joinWaitlist(waitlistEmail);
                      setWaitlistMessage({ type: "success", text: "You're on the list! We'll notify you first." });
                    } catch (e) { console.error(e); }
                    setWaitlistLoading(false);
                  }}
                  disabled={waitlistLoading}
                  style={{ width: "100%", padding: 14, borderRadius: 12, background: "#FFFFFF", color: "#000000", fontWeight: 700, border: "none", cursor: "pointer" }}
                >
                  {waitlistLoading ? "Joining..." : "Join Priority List"}
                </button>
              </>
            )}
            <button onClick={() => setShowWaitlistModal(false)} style={{ marginTop: 20, background: "none", border: "none", color: "#A0A0A0", cursor: "pointer", fontSize: 12 }}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
