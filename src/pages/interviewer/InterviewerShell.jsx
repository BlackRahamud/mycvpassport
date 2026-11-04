import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, AudioLines, ClipboardList } from "lucide-react";
import "./interviewer.css";

export default function InterviewerShell({ children, backTo = "/dashboard", showNav = true }) {
  const navigate = useNavigate();
  return (
    <div className="civ-app">
      <header className="civ-topbar">
        <div className="civ-topbar__inner">
          <button type="button" className="civ-back" onClick={() => navigate(backTo)} aria-label="Back"><ArrowLeft size={18} /></button>
          <Link to="/interviewer/setup" className="civ-brand"><span className="civ-brand__mark"><AudioLines size={19} /></span><span>CVPassport <b>Interviewer</b></span></Link>
          {showNav && <nav className="civ-topnav" aria-label="Interview navigation">
            <Link to="/interviewer/setup">New practice</Link>
            <Link to="/interviewer/history"><ClipboardList size={15} /> My interviews</Link>
          </nav>}
        </div>
      </header>
      <main className="civ-main">{children}</main>
    </div>
  );
}
