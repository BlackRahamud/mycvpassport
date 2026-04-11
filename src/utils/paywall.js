const ZIINA_LINKS = {
  coverLetter: 'https://pay.ziina.com/mycvpassport/lhhO2BgKB',
  expressPass: 'https://pay.ziina.com/mycvpassport/2J2VhEl7l',
  activeHunter: 'https://pay.ziina.com/mycvpassport/gLK9xihqZ',
  careerPro: 'https://pay.ziina.com/mycvpassport/lCBmlYb5tX',
};

export function getPaymentLink(feature) {
  const map = {
    ats:          ZIINA_LINKS.activeHunter,
    coverLetter:  ZIINA_LINKS.coverLetter,
    expressPass:  ZIINA_LINKS.expressPass,
    activeHunter: ZIINA_LINKS.activeHunter,
    careerPro:    ZIINA_LINKS.careerPro,
    jobMatch:     ZIINA_LINKS.activeHunter,
    templates:    ZIINA_LINKS.activeHunter,
    cvImport:     ZIINA_LINKS.activeHunter,
  };
  return map[feature] || ZIINA_LINKS.activeHunter;
}

export function hasFeatureAccess(profile, feature) {
  if (!profile) return false;
  if (profile.is_pro === true) return true;
  return !!profile.features?.[feature];
}

export function handlePaywallClick(e, profile, feature, onSuccess) {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }
  if (!hasFeatureAccess(profile, feature)) {
    window.open(getPaymentLink(feature), '_blank');
    return false;
  }
  if (onSuccess) onSuccess();
  return true;
}
