# public/launch

`mascot.png` — the launch-offer modal mascot, exported from the Claude Design
project ("Launch Offer Modal"). Loaded by `src/components/LaunchOfferModal.jsx`
as `/launch/mascot.png` in the modal's top band (object-fit: contain,
object-position: 64% 100%). The modal degrades gracefully (the image hides
itself via onError) if the file is ever missing.
