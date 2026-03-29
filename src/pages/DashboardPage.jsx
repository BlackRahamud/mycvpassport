import Dashboard from "../Dashboard";
import { ResumePreview } from "../ResumePreview";
import { TEMPLATES, EMPTY_RESUME, getStrength } from "../cvShared";

export default function DashboardPage({
  user,
  resumeList,
  onBuildResume,
  onEditResume,
  onDelete,
  onRunATS,
  onWalkIn,
}) {
  return (
    <Dashboard
      theme={document.documentElement.classList.contains("light") ? "light" : "dark"}
      user={user}
      resumeList={resumeList}
      getStrength={(r) => getStrength(r?.cv_data || r)}
      renderThumb={(r) => (
        <div className="cvp-thumb-inner">
          <ResumePreview cv={r?.cv_data || EMPTY_RESUME} template={TEMPLATES.find((t) => t.id === r?.template_id) || TEMPLATES[0]} />
        </div>
      )}
      onBuildResume={onBuildResume}
      onEditResume={onEditResume}
      onDelete={onDelete}
      onRunATS={onRunATS}
      onWalkIn={onWalkIn}
      onTemplates={() => {}}
    />
  );
}
