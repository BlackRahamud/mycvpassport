// ─────────────────────────────────────────────────────────────────
//  TEMPLATE 14 — Figma Mirror
//  1:1 React clone of figma-mirror-resume.html/.css (595x842 pages)
// ─────────────────────────────────────────────────────────────────

import styles from "./Template14FigmaMirror.module.css";

function cx(...keys) {
  return keys
    .filter(Boolean)
    .map((k) => styles[k] || "")
    .filter(Boolean)
    .join(" ");
}

function splitComma(s) {
  return String(s || "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

function splitLines(s) {
  return String(s || "")
    .split(/\n+/)
    .map((x) => x.trim())
    .filter(Boolean);
}

function toBulletsFromPoints(points) {
  const lines = splitLines(points);
  if (lines.length) return lines;
  return [];
}

function formatCompanyLocation(e) {
  const company = e?.company || "";
  const loc = e?.location || "";
  if (company && loc) return `${company}, ${loc}`;
  return company || loc || "";
}

function ExperienceBlock({ title, company, period, bullets }) {
  return (
    <div className={cx("flex", "flex-col", "gap-2", "w-full", "mb-5")}>
      <div className={cx("flex", "flex-col", "gap-0.5", "w-full")}>
        <h3 className={cx("font-semibold", "text-base", "text-slate-800", "w-full")} style={{ width: "100%" }}>
          {title}
        </h3>
        <div className={cx("flex", "flex-row", "justify-between", "items-baseline", "w-full")}>
          <p className={cx("text-sm", "text-slate-600", "font-medium")} style={{ width: "auto" }}>
            {company}
          </p>
          <p className={cx("text-xs", "text-slate-500")} style={{ width: "auto" }}>
            {period}
          </p>
        </div>
      </div>
      <ul className={cx("flex", "flex-col", "gap-1.5", "w-full", "pl-4")}>
        {(bullets || []).map((item, idx) => (
          <li
            key={idx}
            className={cx("text-sm", "text-slate-700", "w-full", "list-disc")}
            style={{ width: "100%", wordBreak: "break-word" }}
          >
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function SkillBarRow({ label, level = 4 }) {
  const filled = Math.max(0, Math.min(5, Number(level) || 0));
  return (
    <div className={cx("flex", "flex-col", "gap-1", "w-full")}>
      <p className={cx("text-xs", "w-full")}>{label}</p>
      <div className={cx("flex", "flex-row", "gap-1", "w-full")}>
        {[1, 2, 3, 4, 5].map((dot) => (
          <div
            key={dot}
            className={cx("h-1.5", "flex-1", "rounded-full", dot <= filled ? "bg-blue-400" : "bg-slate-600")}
          />
        ))}
      </div>
    </div>
  );
}

export function PreviewFigmaMirror({ cv }) {
  const name = cv?.name || "Your Name";
  const title = cv?.title || "Professional Title";
  const email = cv?.email || "";
  const phone = cv?.phone || "";
  const location = cv?.location || "";
  const summary = cv?.summary || "";

  const skills = splitComma(cv?.skills);
  const languages = splitComma(cv?.languages);
  const certifications = splitComma(cv?.certifications);

  const experience = Array.isArray(cv?.experience) ? cv.experience.filter((e) => e && (e.company || e.role)) : [];
  const education = Array.isArray(cv?.education) ? cv.education.filter((e) => e && (e.school || e.degree)) : [];

  const page1Experience = experience.slice(0, 2);
  const page2Experience = experience.slice(2);

  const edu0 = education[0] || {};

  return (
    <div className={cx("root", "flex", "flex-col", "items-center", "justify-start", "min-h-screen", "bg-gray-100", "p-8", "gap-8")}>
      {/* Page 1 */}
      <div
        className={cx("resumePage", "flex", "flex-row", "gap-0", "bg-white")}
        style={{
          width: "595px",
          height: "842px",
          minHeight: "842px",
          maxHeight: "842px",
          overflow: "hidden",
          position: "relative",
        }}
      >
        <div
          className={cx("flex", "flex-col", "gap-6", "bg-slate-800", "text-white", "p-6")}
          style={{
            width: "180px",
            minWidth: "180px",
            maxWidth: "180px",
            height: "100%",
            minHeight: "100%",
          }}
        >
          {/* Profile Image Placeholder */}
          <div
            className={cx("w-full", "bg-slate-600", "rounded-full", "flex", "items-center", "justify-center")}
            style={{ width: "120px", height: "120px", alignSelf: "center" }}
          >
            <span className={cx("text-4xl")}>👤</span>
          </div>

          {/* Contact Section */}
          <div className={cx("flex", "flex-col", "gap-3", "w-full")}>
            <h3
              className={cx("font-semibold", "text-sm", "uppercase", "tracking-wider", "w-full")}
              style={{ width: "100%", letterSpacing: "0.05em" }}
            >
              Contact
            </h3>
            <div className={cx("flex", "flex-col", "gap-2", "w-full")}>
              {email ? (
                <div className={cx("flex", "flex-row", "gap-2", "w-full", "items-start")}>
                  <span className={cx("text-xs", "flex-shrink-0", "mt-0.5")}>📧</span>
                  <p className={cx("text-xs", "w-full", "break-words")} style={{ width: "100%", wordBreak: "break-word" }}>
                    {email}
                  </p>
                </div>
              ) : null}
              {phone ? (
                <div className={cx("flex", "flex-row", "gap-2", "w-full", "items-start")}>
                  <span className={cx("text-xs", "flex-shrink-0", "mt-0.5")}>📱</span>
                  <p className={cx("text-xs", "w-full", "break-words")} style={{ width: "100%", wordBreak: "break-word" }}>
                    {phone}
                  </p>
                </div>
              ) : null}
              {location ? (
                <div className={cx("flex", "flex-row", "gap-2", "w-full", "items-start")}>
                  <span className={cx("text-xs", "flex-shrink-0", "mt-0.5")}>📍</span>
                  <p className={cx("text-xs", "w-full", "break-words")} style={{ width: "100%", wordBreak: "break-word" }}>
                    {location}
                  </p>
                </div>
              ) : null}
            </div>
          </div>

          {/* Skills Section */}
          <div className={cx("flex", "flex-col", "gap-3", "w-full")}>
            <h3
              className={cx("font-semibold", "text-sm", "uppercase", "tracking-wider", "w-full")}
              style={{ width: "100%", letterSpacing: "0.05em" }}
            >
              Skills
            </h3>
            <div className={cx("flex", "flex-col", "gap-2", "w-full")}>
              {(skills.length ? skills : ["Communication", "Team Building", "Customer Service", "MS Office", "CRM"]).slice(0, 6).map((s, i) => (
                <SkillBarRow key={`${s}-${i}`} label={s} level={4} />
              ))}
            </div>
          </div>

          {/* Languages Section */}
          <div className={cx("flex", "flex-col", "gap-3", "w-full")}>
            <h3
              className={cx("font-semibold", "text-sm", "uppercase", "tracking-wider", "w-full")}
              style={{ width: "100%", letterSpacing: "0.05em" }}
            >
              Languages
            </h3>
            <div className={cx("flex", "flex-col", "gap-2", "w-full")}>
              <div className={cx("flex", "flex-col", "gap-2", "w-full")}>
                {(languages.length ? languages : ["English", "Hindi"]).map((l, i) => (
                  <p key={`${l}-${i}`} className={cx("text-xs", "w-full")}>
                    {l}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div
          className={cx("flex", "flex-col", "gap-0", "bg-white", "flex-1")}
          style={{
            height: "100%",
            minHeight: "100%",
            paddingTop: "32px",
            paddingLeft: "32px",
            paddingRight: "32px",
            paddingBottom: "40px",
          }}
        >
          {/* Header */}
          <div className={cx("flex", "flex-col", "gap-2", "w-full", "mb-6")}>
            <h1 className={cx("font-bold", "text-slate-800", "w-full")} style={{ fontSize: "32px", width: "100%" }}>
              {String(name || "").toUpperCase()}
            </h1>
            <p className={cx("text-lg", "text-slate-600", "w-full")} style={{ width: "100%" }}>
              {title}
            </p>
          </div>

          {/* Professional Summary */}
          <div className={cx("flex", "flex-col", "gap-3", "w-full", "mb-6")}>
            <div className={cx("flex", "flex-col", "gap-2", "w-full", "mb-4")}>
              <h2 className={cx("font-bold", "text-xl", "text-slate-800", "w-full")} style={{ width: "100%" }}>
                Professional Summary
              </h2>
              <div className={cx("h-0.5", "bg-slate-800", "w-full")} style={{ width: "100%" }} />
            </div>
            <p className={cx("text-sm", "text-slate-700", "w-full", "leading-relaxed")} style={{ width: "100%", wordBreak: "break-word" }}>
              {summary}
            </p>
          </div>

          {/* Work Experience */}
          <div className={cx("flex", "flex-col", "gap-0", "w-full")}>
            <div className={cx("flex", "flex-col", "gap-2", "w-full", "mb-4")}>
              <h2 className={cx("font-bold", "text-xl", "text-slate-800", "w-full")} style={{ width: "100%" }}>
                Work Experience
              </h2>
              <div className={cx("h-0.5", "bg-slate-800", "w-full")} style={{ width: "100%" }} />
            </div>

            {page1Experience.map((e, i) => (
              <ExperienceBlock
                key={`${e.company || e.role || "exp"}-${i}`}
                title={e.role || "Role"}
                company={formatCompanyLocation(e)}
                period={e.period || ""}
                bullets={toBulletsFromPoints(e.points)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Page 2 */}
      <div
        className={cx("resumePage", "flex", "flex-row", "gap-0", "bg-white")}
        style={{
          width: "595px",
          height: "842px",
          minHeight: "842px",
          maxHeight: "842px",
          overflow: "hidden",
          position: "relative",
        }}
      >
        <div
          className={cx("flex", "flex-col", "gap-6", "bg-slate-800", "text-white", "p-6")}
          style={{
            width: "180px",
            minWidth: "180px",
            maxWidth: "180px",
            height: "100%",
            minHeight: "100%",
          }}
        >
          {/* Certifications Section */}
          <div className={cx("flex", "flex-col", "gap-3", "w-full")}>
            <h3
              className={cx("font-semibold", "text-sm", "uppercase", "tracking-wider", "w-full")}
              style={{ width: "100%", letterSpacing: "0.05em" }}
            >
              Certifications
            </h3>
            <div className={cx("flex", "flex-col", "gap-2", "w-full")}>
              <div className={cx("flex", "flex-col", "gap-2", "w-full")}>
                {(certifications.length ? certifications : ["Available upon request"]).map((c, i) => (
                  <p key={`${c}-${i}`} className={cx("text-xs", "w-full")}>
                    {c}
                  </p>
                ))}
              </div>
            </div>
          </div>

          {/* Interests Section */}
          <div className={cx("flex", "flex-col", "gap-3", "w-full")}>
            <h3
              className={cx("font-semibold", "text-sm", "uppercase", "tracking-wider", "w-full")}
              style={{ width: "100%", letterSpacing: "0.05em" }}
            >
              Interests
            </h3>
            <div className={cx("flex", "flex-col", "gap-2", "w-full")}>
              <div className={cx("flex", "flex-col", "gap-2", "w-full")}>
                {cv?.availability ? <p className={cx("text-xs", "w-full")}>{cv.availability}</p> : null}
                {cv?.willingToRelocate ? <p className={cx("text-xs", "w-full")}>Relocate: {cv.willingToRelocate}</p> : null}
              </div>
            </div>
          </div>

          {/* References Section */}
          <div className={cx("flex", "flex-col", "gap-3", "w-full")}>
            <h3
              className={cx("font-semibold", "text-sm", "uppercase", "tracking-wider", "w-full")}
              style={{ width: "100%", letterSpacing: "0.05em" }}
            >
              References
            </h3>
            <div className={cx("flex", "flex-col", "gap-2", "w-full")}>
              <p className={cx("text-xs", "w-full")}>{cv?.references || "Available upon request"}</p>
            </div>
          </div>
        </div>

        <div
          className={cx("flex", "flex-col", "justify-between", "bg-white", "flex-1")}
          style={{
            height: "100%",
            minHeight: "100%",
            paddingTop: "32px",
            paddingLeft: "32px",
            paddingRight: "32px",
            paddingBottom: "40px",
          }}
        >
          <div className={cx("flex", "flex-col", "gap-0", "w-full")}>
            {/* Continued Work Experience (only when needed) */}
            {page2Experience.length > 0 ? (
              <div className={cx("flex", "flex-col", "gap-0", "w-full", "mb-6")}>
                <div className={cx("flex", "flex-col", "gap-2", "w-full", "mb-4")}>
                  <h2 className={cx("font-bold", "text-xl", "text-slate-800", "w-full")} style={{ width: "100%" }}>
                    Work Experience (cont.)
                  </h2>
                  <div className={cx("h-0.5", "bg-slate-800", "w-full")} style={{ width: "100%" }} />
                </div>
                {page2Experience.map((e, i) => (
                  <ExperienceBlock
                    key={`${e.company || e.role || "exp2"}-${i}`}
                    title={e.role || "Role"}
                    company={formatCompanyLocation(e)}
                    period={e.period || ""}
                    bullets={toBulletsFromPoints(e.points)}
                  />
                ))}
              </div>
            ) : null}

            {/* Education */}
            <div className={cx("flex", "flex-col", "gap-0", "w-full", "mb-6")}>
              <div className={cx("flex", "flex-col", "gap-2", "w-full", "mb-4")}>
                <h2 className={cx("font-bold", "text-xl", "text-slate-800", "w-full")} style={{ width: "100%" }}>
                  Education
                </h2>
                <div className={cx("h-0.5", "bg-slate-800", "w-full")} style={{ width: "100%" }} />
              </div>

              <div className={cx("flex", "flex-col", "gap-1", "w-full", "mb-4")}>
                <h3 className={cx("font-semibold", "text-base", "text-slate-800", "w-full")} style={{ width: "100%" }}>
                  {edu0?.degree || "Degree"}
                </h3>
                <div className={cx("flex", "flex-row", "justify-between", "items-baseline", "w-full")}>
                  <p className={cx("text-sm", "text-slate-600", "font-medium")} style={{ width: "auto" }}>
                    {edu0?.school || edu0?.institution || ""}
                  </p>
                  <p className={cx("text-xs", "text-slate-500")} style={{ width: "auto" }}>
                    {edu0?.year || edu0?.period || ""}
                  </p>
                </div>
              </div>
            </div>

            {/* Core Skills */}
            <div className={cx("flex", "flex-col", "gap-0", "w-full", "mb-6")}>
              <div className={cx("flex", "flex-col", "gap-2", "w-full", "mb-4")}>
                <h2 className={cx("font-bold", "text-xl", "text-slate-800", "w-full")} style={{ width: "100%" }}>
                  Core Skills
                </h2>
                <div className={cx("h-0.5", "bg-slate-800", "w-full")} style={{ width: "100%" }} />
              </div>

              <div className={cx("flex", "flex-col", "gap-4", "w-full")}>
                <div className={cx("flex", "flex-col", "gap-1", "w-full")}>
                  <h3 className={cx("font-semibold", "text-base", "text-slate-800", "w-full")} style={{ width: "100%" }}>
                    Application Pre-screening &amp; Validation
                  </h3>
                  <p className={cx("text-sm", "text-slate-700", "w-full")} style={{ width: "100%", wordBreak: "break-word" }}>
                    {cv?.coreSkill1 || "Document verification, discrepancy identification, and escalation with SLA-focused coordination."}
                  </p>
                </div>

                <div className={cx("flex", "flex-col", "gap-1", "w-full")}>
                  <h3 className={cx("font-semibold", "text-base", "text-slate-800", "w-full")} style={{ width: "100%" }}>
                    KYC &amp; Compliance Awareness
                  </h3>
                  <p className={cx("text-sm", "text-slate-700", "w-full")} style={{ width: "100%", wordBreak: "break-word" }}>
                    {cv?.coreSkill2 || "Compliance-driven file management and audit-ready documentation practices."}
                  </p>
                </div>
              </div>
            </div>

            {/* Tools */}
            <div className={cx("flex", "flex-col", "gap-0", "w-full")}>
              <div className={cx("flex", "flex-col", "gap-2", "w-full", "mb-4")}>
                <h2 className={cx("font-bold", "text-xl", "text-slate-800", "w-full")} style={{ width: "100%" }}>
                  Tools
                </h2>
                <div className={cx("h-0.5", "bg-slate-800", "w-full")} style={{ width: "100%" }} />
              </div>

              <div className={cx("flex", "flex-col", "gap-3", "w-full")}>
                <div className={cx("flex", "flex-row", "gap-2", "w-full")}>
                  <p className={cx("text-sm", "font-semibold", "text-slate-800", "whitespace-nowrap")}>Office:</p>
                  <p className={cx("text-sm", "text-slate-700", "w-full")} style={{ width: "100%", wordBreak: "break-word" }}>
                    {cv?.officeTools || "MS Office (Excel, Word)"}
                  </p>
                </div>

                <div className={cx("flex", "flex-row", "gap-2", "w-full")}>
                  <p className={cx("text-sm", "font-semibold", "text-slate-800", "whitespace-nowrap")}>Systems:</p>
                  <p className={cx("text-sm", "text-slate-700", "w-full")} style={{ width: "100%", wordBreak: "break-word" }}>
                    {cv?.systemsTools || "CRM tools"}
                  </p>
                </div>

                <div className={cx("flex", "flex-row", "gap-2", "w-full")}>
                  <p className={cx("text-sm", "font-semibold", "text-slate-800", "whitespace-nowrap")}>Communication:</p>
                  <p className={cx("text-sm", "text-slate-700", "w-full")} style={{ width: "100%", wordBreak: "break-word" }}>
                    {cv?.communicationTools || "English & Hindi"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom spacer to ensure white background extends to edge */}
          <div style={{ height: "1px", width: "100%" }} />
        </div>
      </div>
    </div>
  );
}

