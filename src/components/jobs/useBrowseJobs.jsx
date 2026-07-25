// useBrowseJobs — the single decision point for every "Browse Jobs" entry.
//
//   const { go, gate } = useBrowseJobs(user);
//   <button onClick={go}>Browse Jobs</button>
//   {gate}
//
// While JOBS_BOARD_LIVE is false, `go()` opens the Boarding Soon popup and
// fires browse_jobs_popup_viewed. Flip that one constant to true and `go()`
// navigates to the real board instead — every call site changes at once,
// with no edit here or at the call sites.

import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { isJobsBoardLive } from '../../config/jobsBoard';
import { trackBrowseJobsPopupViewed } from '../../lib/analytics/launchOfferEvents';
import BoardingSoonModal from './BoardingSoonModal';

const JOBS_PATH = '/jobs';

export function useBrowseJobs(user) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const go = useCallback((href) => {
    const dest = typeof href === 'string' && href.startsWith('/') ? href : JOBS_PATH;
    if (isJobsBoardLive()) {
      navigate(dest);
      return;
    }
    trackBrowseJobsPopupViewed();
    setOpen(true);
  }, [navigate]);

  const close = useCallback(() => setOpen(false), []);

  const gate = open ? <BoardingSoonModal user={user} onClose={close} /> : null;

  return { go, gate, open };
}

export default useBrowseJobs;
