// LaunchOfferMount — the single site-wide entry point for the launch UI.
// Mounted once in App (candidate app wrapper). Resolves offer state via
// useLaunchOffer and renders the top strip + the designed launch-offer modal.
// Everything self-gates on `offerActive`, so when the switch is off (or the
// date has passed) this renders nothing at all — no layout shift, no leftovers.
//
// The strip renders in normal document flow at the very top of the app so it
// naturally pushes content down; the modal is portaled/overlaid and shows
// once per visitor on public landing pages only (its own route/show-once
// logic lives in LaunchOfferModal). The strip can be dismissed for the
// session (in-memory only — it returns on reload, fine for a marketing bar).

import { useState } from 'react';
import { useLaunchOffer } from '../../hooks/useLaunchOffer';
import LaunchOfferStrip from './LaunchOfferStrip';
import LaunchOfferModal from '../LaunchOfferModal';

export default function LaunchOfferMount({ user }) {
  const { offerActive } = useLaunchOffer();
  const [stripDismissed, setStripDismissed] = useState(false);

  if (!offerActive) return null;

  return (
    <>
      <LaunchOfferStrip
        active={!stripDismissed}
        user={user}
        onDismiss={() => setStripDismissed(true)}
      />
      <LaunchOfferModal user={user} />
    </>
  );
}
