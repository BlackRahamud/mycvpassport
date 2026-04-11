import { useState } from "react";

export default function CompletionScreen({ atsScore, userName, onDashboard }) {
  const [feedback, setFeedback] = useState(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackSent, setFeedbackSent] = useState(false);

  const score = typeof atsScore === 'number' ? atsScore : 0;
  const scoreLabel = score >= 70 ? 'Strong' : score >= 50 ? 'Good' : 'Fair';

  return (
    <div style={{
      position:'fixed', inset:0, zIndex:601,
      background:'rgba(0,0,0,0.9)',
      display:'flex',
      alignItems:'flex-start',
      justifyContent:'center',
      overflowY:'auto',
      WebkitOverflowScrolling:'touch',
      padding:'40px 16px 64px', boxSizing:'border-box',
    }}>
      <style>{`
        @keyframes travel-light {
          0% { background-position: 200% center; }
          100% { background-position: -200% center; }
        }
        @keyframes cs-fade-up {
          from { opacity:0; transform:translateY(8px); }
          to { opacity:1; transform:translateY(0); }
        }
      `}</style>
      <div style={{
        padding:'1.5px', borderRadius:20, maxWidth:400, width:'100%',
        background:'linear-gradient(90deg,#1C1C1C 0%,#1C1C1C 35%,rgba(255,255,255,0.4) 50%,#1C1C1C 65%,#1C1C1C 100%)',
        backgroundSize:'300% 100%',
        animation:'travel-light 2.5s linear infinite',
      }}>
        <div style={{ background:'#111111', borderRadius:18, padding:'1.25rem' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'1.25rem' }}>
            <div style={{ display:'flex', alignItems:'center', gap:7 }}>
              <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
                <rect width="22" height="22" rx="6" fill="#F59E0B"/>
                <path d="M11 5L17 11L11 17L5 11Z" fill="#0A0A0A"/>
                <path d="M11 8.5L13.5 11L11 13.5L8.5 11Z" fill="#F59E0B"/>
              </svg>
              <span style={{ fontSize:11, fontWeight:500, color:'#F59E0B', letterSpacing:'0.1em' }}>CVPASSPORT</span>
            </div>
            <div style={{ fontSize:11, color:'#F59E0B', border:'0.5px solid rgba(245,158,11,0.4)', borderRadius:20, padding:'3px 10px', display:'flex', alignItems:'center', gap:5 }}>
              <span style={{ width:5, height:5, borderRadius:'50%', background:'#22C55E', display:'inline-block' }} />
              ATS {score} · {scoreLabel}
            </div>
          </div>

          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', textAlign:'center', marginBottom:'1.25rem', animation:'cs-fade-up 0.5s ease-out' }}>
            <div style={{ position:'relative', marginBottom:'0.75rem' }}>
              <div style={{ width:60, height:60, borderRadius:'50%', border:'2px solid #22C55E', background:'rgba(34,197,94,0.08)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
                  <path d="M6 13L11 18L20 8" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>
            <p style={{ margin:'0 0 5px', fontSize:20, fontWeight:500, color:'#ffffff' }}>
              {userName ? `${userName.split(' ')[0]}, your CV is ready` : 'Your CV is ready'}
            </p>
            <p style={{ margin:0, fontSize:13, color:'rgba(255,255,255,0.45)' }}>Downloaded to your device. Now go get that job.</p>
          </div>

          <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:'1.25rem' }}>
            <p style={{ margin:'0 0 6px', fontSize:10, fontWeight:500, color:'rgba(255,255,255,0.25)', letterSpacing:'0.1em', textTransform:'uppercase' }}>Next step</p>
            <a href="https://bayt.com" target="_blank" rel="noreferrer" style={{ background:'#F59E0B', color:'#0A0A0A', border:'none', borderRadius:11, padding:'12px', fontSize:14, fontWeight:500, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8, textDecoration:'none' }}>
              <svg width="14" height="14" viewBox="0 0 15 15" fill="none"><path d="M3 12L12 3M12 3H7M12 3V8" stroke="#0A0A0A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Apply on Bayt.com
            </a>
            <a href="https://linkedin.com" target="_blank" rel="noreferrer" style={{ background:'transparent', color:'rgba(255,255,255,0.75)', border:'0.5px solid rgba(255,255,255,0.22)', borderRadius:11, padding:'11px', fontSize:13, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8, textDecoration:'none' }}>
              <svg width="14" height="14" viewBox="0 0 15 15" fill="none"><rect x="1" y="1" width="13" height="13" rx="3" stroke="rgba(255,255,255,0.5)" strokeWidth="1.2"/><path d="M4 6.5h1.5V11H4V6.5zM4.75 5.5a.75.75 0 100-1.5.75.75 0 000 1.5zM7 6.5h1.5v.7c.3-.5.9-.8 1.5-.8C11 6.4 11.5 7 11.5 8.2V11H10V8.5c0-.6-.2-1-.8-1-.5 0-.7.4-.7 1V11H7V6.5z" fill="rgba(255,255,255,0.5)"/></svg>
              Update your LinkedIn
            </a>
          </div>

          <hr style={{ border:'none', borderTop:'0.5px solid rgba(255,255,255,0.07)', margin:'0 0 1rem' }}/>

          <div style={{ marginBottom:'1rem' }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
              <div style={{ width:34, height:34, borderRadius:'50%', background:'rgba(245,158,11,0.12)', border:'0.5px solid rgba(245,158,11,0.25)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:500, color:'#F59E0B', flexShrink:0 }}>JK</div>
              <div>
                <p style={{ margin:'0 0 2px', fontSize:13, fontWeight:500, color:'#ffffff' }}>JK</p>
                <p style={{ margin:0, fontSize:11, color:'rgba(255,255,255,0.35)' }}>Dubai, UAE · solo founder</p>
              </div>
            </div>
            <p style={{ margin:'0 0 1rem', fontSize:13, color:'rgba(255,255,255,0.72)', fontStyle:'italic', lineHeight:1.85, fontFamily:'Georgia, serif' }}>
              "CVPassport is a startup — right now it's just me, no team, no investors. I built this because I was an expat like you in Dubai, trying to get a decent job, and every CV tool I tried felt like it was made for someone else. Everyone deserves a chance, and I'll make sure you get it. If this helped you land something, I'd love to hear about it."
            </p>

            {!feedback && (
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                <span style={{ fontSize:12, color:'rgba(255,255,255,0.35)' }}>Was this useful?</span>
                <button type="button" onClick={() => setFeedback('up')} style={{ background:'rgba(255,255,255,0.05)', border:'0.5px solid rgba(255,255,255,0.1)', borderRadius:7, padding:'5px 12px', cursor:'pointer', fontSize:14 }}>👍</button>
                <button type="button" onClick={() => setFeedback('down')} style={{ background:'rgba(255,255,255,0.05)', border:'0.5px solid rgba(255,255,255,0.1)', borderRadius:7, padding:'5px 12px', cursor:'pointer', fontSize:14 }}>👎</button>
              </div>
            )}
            {feedback === 'up' && <p style={{ fontSize:13, color:'#22C55E', margin:'0 0 8px' }}>Thank you — that means a lot.</p>}
            {feedback === 'down' && !feedbackSent && (
              <div style={{ marginBottom:8 }}>
                <input value={feedbackText} onChange={e => setFeedbackText(e.target.value)} placeholder="What could be better?" style={{ width:'100%', background:'rgba(255,255,255,0.04)', border:'0.5px solid rgba(255,255,255,0.1)', borderRadius:8, padding:'8px 10px', color:'rgba(255,255,255,0.8)', fontSize:12, fontFamily:'inherit', outline:'none', boxSizing:'border-box' }} />
                <button type="button" onClick={() => setFeedbackSent(true)} style={{ marginTop:6, background:'transparent', border:'0.5px solid rgba(245,158,11,0.3)', borderRadius:7, padding:'5px 14px', color:'#F59E0B', fontSize:12, cursor:'pointer' }}>Send →</button>
              </div>
            )}
            {feedbackSent && <p style={{ fontSize:13, color:'rgba(245,158,11,0.8)', margin:'0 0 8px' }}>Noted. I'll work on it.</p>}
          </div>

          <hr style={{ border:'none', borderTop:'0.5px solid rgba(255,255,255,0.07)', margin:'0 0 1rem' }}/>

          <p style={{ margin:'0 0 4px', fontSize:10, fontWeight:500, color:'rgba(255,255,255,0.25)', letterSpacing:'0.1em', textTransform:'uppercase' }}>Support the build</p>
          <a href="https://mycvpassport.com/support" target="_blank" rel="noreferrer" style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 0', borderTop:'0.5px solid rgba(255,255,255,0.06)', textDecoration:'none' }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 14s-6-3.5-6-7.5a3.5 3.5 0 017 0 3.5 3.5 0 017 0C16 10.5 8 14 8 14z" fill="#E24B4A"/></svg>
            <span style={{ fontSize:13, color:'rgba(255,255,255,0.6)', flex:1 }}>Buy me a coffee — <span style={{ color:'#F59E0B' }}>keep this free</span></span>
            <span style={{ fontSize:12, color:'rgba(245,158,11,0.6)' }}>→</span>
          </a>
          <a href="https://mycvpassport.com/feedback" target="_blank" rel="noreferrer" style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 0', borderTop:'0.5px solid rgba(255,255,255,0.06)', borderBottom:'0.5px solid rgba(255,255,255,0.06)', marginBottom:'1rem', textDecoration:'none' }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M2 2h12v9H9l-3 3v-3H2z" stroke="rgba(255,255,255,0.4)" strokeWidth="1.2" strokeLinejoin="round"/></svg>
            <span style={{ fontSize:13, color:'rgba(255,255,255,0.6)', flex:1 }}>Share feedback — <span style={{ color:'#F59E0B' }}>shape what's built next</span></span>
            <span style={{ fontSize:12, color:'rgba(245,158,11,0.6)' }}>→</span>
          </a>

          <button type="button" onClick={onDashboard} style={{ display:'block', width:'100%', background:'transparent', border:'0.5px solid rgba(255,255,255,0.1)', borderRadius:11, padding:11, fontSize:13, color:'rgba(255,255,255,0.4)', cursor:'pointer', textAlign:'center', fontFamily:'inherit' }}>
            ← Back to dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
