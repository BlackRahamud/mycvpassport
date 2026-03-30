import { useMemo } from 'react'

export const useGeoContent = () => {
  return useMemo(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone

    const isIndia =
      tz.includes('Kolkata') ||
      tz.includes('Calcutta') ||
      tz.includes('Asia/Kolkata')

    if (isIndia) {
      return {
        pill: "India's Dual-Market CV Builder",
        heroHeadlineBefore: "Built for India. Engineered to get you ",
        heroHeadlineAfter: " in the Gulf.",
        subheadline: "ATS-friendly layouts for Indian corporates and GCC employer portals — UAE Banks, Saudi Tech, and Dubai Hospitality.",
        cta: "Get my ATS-ready CV →",
        ctaSecondary: "or browse 14 professional templates",
        anxietyKiller: "Free to start. No credit card. Upgrade only when you're ready.",
        proof: "2,400+ CVs downloaded across India and the Gulf",
        industryHeadline: "The CV that opens corporate gates",
        industrySub: "Used by professionals targeting",
        badges: ["IT", "Banking", "Consulting", "FMCG", "Healthcare", "Hospitality"],
        microDisclaimer: "Brand names are property of their respective owners. No affiliation or endorsement implied.",
        currency: "₹",
        showWalkIn: false,
        isIndia: true,
      }
    }

    return {
      pill: "Built for Gulf Job Seekers",
      heroHeadlineBefore: "Your Gulf CV, ready to get you ",
      heroHeadlineAfter: ".",
      subheadline: "ATS-friendly layouts built for UAE, Saudi & GCC markets. Free to start, free to try.",
      cta: "Build my CV free →",
      ctaSecondary: "or browse 14 Gulf-ready templates",
      anxietyKiller: "Free to start. No credit card. Upgrade only when you're ready.",
      proof: "2,400+ CVs downloaded across the GCC",
      industryHeadline: "The CV built for Gulf-standard hiring",
      industrySub: "Used by professionals targeting",
      badges: ["Banking", "Energy", "Tech", "Hospitality", "Construction", "Healthcare"],
      microDisclaimer: "Brand names are property of their respective owners. No affiliation or endorsement implied.",
      currency: "AED",
      showWalkIn: true,
      isIndia: false,
    }
  }, [])
}
