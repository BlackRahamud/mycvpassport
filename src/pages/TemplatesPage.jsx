import { useState, useEffect, useRef, memo } from "react";
import { useNavigate } from "react-router-dom";
import { TEMPLATES, TEMPLATE_FILTER_IDS, isCvDataEmptyForTemplateApply } from "../cvShared";
import { ResumePreview, A4_PREVIEW_WIDTH_PX } from "../ResumePreview";

const BuilderTemplateGridCard = memo(function BuilderTemplateGridCard({ template: t, isSelected, sheetHighlight, resume, onPick, cardRef }) {
  const isFree = t.tier === "free";
  const borderStyle = sheetHighlight ? "2px solid rgba(255,255,255,0.8)" : isSelected ? "1px solid #FFFFFF" : "0.5px solid #2A2A2A";
  return (
    <button
      ref={cardRef}
      type="button"
      onClick={() => onPick(t)}
      style={{
        position: "relative",
        width: "100%",
        padding: 0,
        margin: 0,
        border: borderStyle,
        borderRadius: 10,
        background: "#141414",
        cursor: "pointer",
        overflow: "hidden",
        display: "block",
        textAlign: "left",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          height: 160,
          width: "100%",
          overflow: "hidden",
          position: "relative",
          background: "#1C1C1C",
        }}
      >
        <div
          style={{
            width: A4_PREVIEW_WIDTH_PX,
            transform: "scale(0.18)",
            transformOrigin: "top left",
            willChange: "transform",
            transition: "none",
            pointerEvents: "none",
          }}
        >
          <ResumePreview cv={resume} template={t} />
        </div>
      </div>
      <div style={{ padding: "6px 8px 8px" }}>
        <span style={{ fontSize: 12, fontWeight: 500, color: "#FFFFFF", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.name}</span>
      </div>
      <span
        style={{
          position: "absolute",
          top: 5,
          right: 5,
          fontSize: 6.5,
          padding: "2px 5px",
          borderRadius: 5,
          fontWeight: 600,
          background: isFree ? "#1D9E75" : "#EF9F27",
          color: isFree ? "#fff" : "#412402",
        }}
      >
        {isFree ? "Free" : "⭐ Pro"}
      </span>
    </button>
  );
});

function BuilderTemplatesTab({
  resume,
  selectedTemplate,
  onApplyTemplate,
  onApplyTemplateAndGoToContent,
  pendingTemplate,
  confirmOpen,
  onPendingTemplateChange,
  onConfirmOpenChange,
  onTemplatesFabInteract,
}) {
  const navigate = useNavigate();
  const [filter, setFilter] = useState("popular");
  const prevFilterRef = useRef(null);
  const cardRefs = useRef(new Map());
  const ids = TEMPLATE_FILTER_IDS[filter] || TEMPLATE_FILTER_IDS.popular;
  const list = TEMPLATES.filter((t) => ids.includes(t.id));

  useEffect(() => {
    const prev = prevFilterRef.current;
    prevFilterRef.current = filter;
    if (prev === null) return;
    if (prev === filter) return;
    const activeIds = TEMPLATE_FILTER_IDS[filter] || TEMPLATE_FILTER_IDS.popular;
    const sid = selectedTemplate?.id;
    if (sid == null || !activeIds.includes(sid)) return;
    const el = cardRefs.current.get(sid);
    if (el) {
      requestAnimationFrame(() => {
        el.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
      });
    }
  }, [filter, selectedTemplate?.id]);

  useEffect(() => {
    if (typeof document === "undefined") return undefined;
    const sheetOpen = confirmOpen && pendingTemplate != null;
    if (sheetOpen) document.body.classList.add("cvp-fab-sheet-open");
    else document.body.classList.remove("cvp-fab-sheet-open");
    return () => document.body.classList.remove("cvp-fab-sheet-open");
  }, [confirmOpen, pendingTemplate]);

  const pills = [
    { id: "popular", label: "Popular" },
    { id: "simple", label: "Simple" },
    { id: "modern", label: "Modern" },
    { id: "creative", label: "Creative" },
  ];

  return (
    <div
      className="cvp-builder-templates-tab-root"
      style={{ width: "100%", maxWidth: "100%", overflow: "hidden", boxSizing: "border-box", display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}
    >
      <div
        className="cvp-templates-pills"
        style={{
          display: "flex",
          gap: 6,
          overflowX: "auto",
          WebkitOverflowScrolling: "touch",
          padding: "0 12px 12px",
          margin: 0,
          flexWrap: "nowrap",
          maxWidth: "100%",
          flexShrink: 0,
        }}
      >
        {pills.map((p) => {
          const on = filter === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                onTemplatesFabInteract?.();
                setFilter(p.id);
              }}
              style={{
                flex: "0 0 auto",
                background: on ? "#fff" : "#1C1C1C",
                color: on ? "#000" : "#666",
                fontSize: 8,
                padding: "4px 9px",
                borderRadius: 12,
                border: on ? "0.5px solid #fff" : "0.5px solid #2A2A2A",
                cursor: "pointer",
                whiteSpace: "nowrap",
                minHeight: 28,
              }}
            >
              {p.label}
            </button>
          );
        })}
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 12,
          padding: "0 12px",
          boxSizing: "border-box",
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          WebkitOverflowScrolling: "touch",
          alignContent: "start",
        }}
      >
        {list.map((t) => (
          <BuilderTemplateGridCard
            key={t.id}
            template={t}
            isSelected={selectedTemplate?.id === t.id}
            sheetHighlight={confirmOpen && pendingTemplate?.id === t.id}
            resume={resume}
            onPick={(tpl) => {
              onTemplatesFabInteract?.();
              if (isCvDataEmptyForTemplateApply(resume)) {
                onApplyTemplateAndGoToContent(tpl);
                return;
              }
              onPendingTemplateChange(tpl);
              onConfirmOpenChange(true);
            }}
            cardRef={(el) => {
              if (el) cardRefs.current.set(t.id, el);
              else cardRefs.current.delete(t.id);
            }}
          />
        ))}
      </div>
      {confirmOpen && pendingTemplate ? (
        <>
          <div
            role="presentation"
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.6)",
              zIndex: 120,
            }}
            onClick={() => {
              onConfirmOpenChange(false);
              onPendingTemplateChange(null);
            }}
          />
          <div
            role="dialog"
            aria-modal="true"
            style={{
              position: "fixed",
              bottom: 0,
              left: 0,
              right: 0,
              background: "#141414",
              borderRadius: "24px 24px 0 0",
              paddingTop: 24,
              paddingLeft: 20,
              paddingRight: 20,
              paddingBottom: "calc(env(safe-area-inset-bottom, 16px) + 16px)",
              zIndex: 121,
              boxSizing: "border-box",
              maxWidth: "100vw",
              width: "100%",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                width: 36,
                height: 4,
                background: "#333",
                borderRadius: 2,
                margin: "0 auto 20px",
              }}
            />
            <p style={{ color: "#fff", fontSize: 14, margin: 0, lineHeight: 1.5 }}>
              Do you want to replace your current design with this template?
            </p>
            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button
                type="button"
                onClick={() => {
                  onConfirmOpenChange(false);
                  onPendingTemplateChange(null);
                }}
                style={{
                  flex: 1,
                  minHeight: 44,
                  background: "#1C1C1C",
                  color: "#fff",
                  border: "none",
                  borderRadius: 10,
                  padding: 14,
                  fontSize: 14,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onApplyTemplateAndGoToContent(pendingTemplate);
                  onConfirmOpenChange(false);
                  onPendingTemplateChange(null);
                }}
                style={{
                  flex: 1,
                  minHeight: 44,
                  background: "#fff",
                  color: "#000",
                  border: "none",
                  borderRadius: 10,
                  padding: 14,
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                Apply Template
              </button>
            </div>
          </div>
        </>
      ) : null}
      <div style={{ padding: "16px 10px 8px", textAlign: "center" }}>
        <button
          type="button"
          onClick={() => navigate("/pricing")}
          style={{
            background: "transparent",
            border: "none",
            color: "#666",
            fontSize: 10,
            textDecoration: "underline",
            cursor: "pointer",
          }}
        >
          Remove watermark — upgrade to Pro
        </button>
      </div>
    </div>
  );
}
export { BuilderTemplatesTab };
export default function TemplatesPage(props) {
  return <BuilderTemplatesTab {...props} />;
}
