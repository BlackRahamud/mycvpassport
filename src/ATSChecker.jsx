import { useState } from "react";

const STOP_WORDS = new Set([
  "a","an","the","and","or","but","in","on","at","to","for","of","with",
  "by","from","is","are","was","were","be","been","being","have","has",
  "had","do","does","did","will","would","could","should","may","might",
  "that","this","these","those","it","its","we","you","your","our","their",
  "they","he","she","as","if","then","than","so","up","out","about","into",
  "through","during","including","until","against","among","throughout","within"
]);

window.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js";

async function extractTextFromPDF(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsArrayBuffer(file);
    reader.onload = async function () {
      try {
        const typedarray = new Uint8Array(this.result);
        const pdf = await window.pdfjsLib.getDocument(typedarray).promise;
        let text = "";
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          // eslint-disable-next-line no-loop-func
          content.items.forEach((item) => { text += item.str + " "; });
        }
        resolve(text);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
  });
}

function getKeywords(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
}

export default function ATSChecker() {
  const [score, setScore] = useState(null);
  const [missing, setMissing] = useState([]);
  const [matched, setMatched] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [jobDesc, setJobDesc] = useState("");
  const [resumeFile, setResumeFile] = useState(null);

  async function handleCheck() {
    if (!resumeFile || !jobDesc.trim()) {
      setError("Please upload a resume and paste a job description.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const resumeText = await extractTextFromPDF(resumeFile);
      const resumeKeywords = new Set(getKeywords(resumeText));
      const jobKeywords = [...new Set(getKeywords(jobDesc))];

      const matchedWords = jobKeywords.filter((w) => resumeKeywords.has(w));
      const missingWords = jobKeywords.filter((w) => !resumeKeywords.has(w));
      const atsScore = Math.round((matchedWords.length / jobKeywords.length) * 100);

      setScore(atsScore);
      setMatched(matchedWords);
      setMissing(missingWords.slice(0, 25));
    } catch (err) {
      setError("Failed to read PDF. Please try again.");
    }
    setLoading(false);
  }

  return (
    <div style={{ maxWidth: 700, margin: "40px auto", fontFamily: "sans-serif", color: "#111" }}>
      <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>ATS Resume Checker</h2>
      <p style={{ color: "#555", marginBottom: 24 }}>Upload your resume + paste a job description to see your ATS score.</p>

      <label style={{ display: "block", marginBottom: 16 }}>
        <span style={{ fontWeight: 600 }}>Upload Resume (PDF)</span>
        <input
          type="file"
          accept=".pdf"
          onChange={(e) => setResumeFile(e.target.files[0])}
          style={{ display: "block", marginTop: 6 }}
        />
      </label>

      <label style={{ display: "block", marginBottom: 16 }}>
        <span style={{ fontWeight: 600 }}>Paste Job Description</span>
        <textarea
          rows={6}
          value={jobDesc}
          onChange={(e) => setJobDesc(e.target.value)}
          placeholder="Paste the job description here..."
          style={{ display: "block", width: "100%", marginTop: 6, padding: 10, borderRadius: 6, border: "1px solid #ccc", fontSize: 14 }}
        />
      </label>

      {error && <p style={{ color: "red", marginBottom: 12 }}>{error}</p>}

      <button
        onClick={handleCheck}
        disabled={loading}
        style={{ background: "#111", color: "#fff", padding: "10px 24px", borderRadius: 6, border: "none", fontWeight: 600, cursor: "pointer", marginBottom: 32 }}
      >
        {loading ? "Analyzing..." : "Check ATS Score"}
      </button>

      {score !== null && (
        <div>
          <div style={{ fontSize: 48, fontWeight: 800, marginBottom: 8 }}>
            {score}%
          </div>
          <p style={{ marginBottom: 16, color: score >= 70 ? "green" : score >= 40 ? "orange" : "red", fontWeight: 600 }}>
            {score >= 70 ? "Strong match" : score >= 40 ? "Needs improvement" : "Low match — add more keywords"}
          </p>

          {matched.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <strong>✅ Matched Keywords ({matched.length})</strong>
              <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 6 }}>
                {matched.map((w) => (
                  <span key={w} style={{ background: "#e6f4ea", color: "#1a7f3c", padding: "4px 10px", borderRadius: 20, fontSize: 13 }}>{w}</span>
                ))}
              </div>
            </div>
          )}

          {missing.length > 0 && (
            <div>
              <strong>❌ Missing Keywords ({missing.length})</strong>
              <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 6 }}>
                {missing.map((w) => (
                  <span key={w} style={{ background: "#fdecea", color: "#c0392b", padding: "4px 10px", borderRadius: 20, fontSize: 13 }}>{w}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
