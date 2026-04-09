/**
 * FABValidationData.js
 * High-fidelity validation for CVPassport AI Coach.
 * Targets: UAE, GCC, and Indian job markets.
 */

export const PHONE_REGEX = /^(\+|00)?(971|91|92|63|20)?[\s\-]?\(?\d{2,4}\)?[\s\-]?\d{3,4}[\s\-]?\d{3,4}$/;

export const UAE_PHONE_REGEX = /^(\+971|00971|0)?[\s\-]?5[0-9][\s\-]?\d{3}[\s\-]?\d{4}$/;
export const INDIA_PHONE_REGEX = /^(\+91|0091|0)?[\s\-]?[6-9]\d{9}$/;
export const PAKISTAN_PHONE_REGEX = /^(\+92|0092|0)?[\s\-]?3\d{9}$/;
export const GENERIC_PHONE_REGEX = /^\+?[\d\s\-]{7,15}$/;

export const isPhoneNumber = (str) => {
  const clean = str.trim();
  return (
    UAE_PHONE_REGEX.test(clean) ||
    INDIA_PHONE_REGEX.test(clean) ||
    PAKISTAN_PHONE_REGEX.test(clean) ||
    GENERIC_PHONE_REGEX.test(clean) ||
    /^\d{7,}$/.test(clean)
  );
};

export const GLOBAL_NONSENSE = [
  /(.)\1{3,}/,
  /^[a-zA-Z]{1,2}$/,
  /^(none|na|nil|test|asdf|ghjk|everything|nothing|skip|idk|whatever|lol)$/i,
  /^[0-9]{5,}$/,
  /^[^a-zA-Z0-9\u0600-\u06FF\s]{2,}$/,
];

export const isGarbage = (str) => {
  const clean = str.trim();
  return GLOBAL_NONSENSE.some(pattern => pattern.test(clean));
};

export const NAME_CONNECTORS = ['al', 'el', 'bin', 'binti', 'bint', 'ibn', 'abu', 'abdul', 'abdel', 'md', 'mohammed'];

export const isValidName = (str) => {
  const clean = str.trim().toLowerCase();
  // Reject phone numbers in name field
  if (isPhoneNumber(str)) return { valid: false, reason: 'PHONE_IN_NAME' };
  // Split into words
  const words = clean.split(/\s+/).filter(w => w.replace(/\./g, '').length > 0);
  // Need at least 2 words
  if (words.length < 2) return { valid: false, reason: 'SINGLE_NAME' };
  // Filter out connectors to find real name words
  const realWords = words.filter(w => !NAME_CONNECTORS.includes(w.replace(/\./g, '')));
  // At least one real word must be 2+ chars (not just initials)
  const hasSubstantialWord = realWords.some(w => w.replace(/\./g, '').length >= 2);
  if (!hasSubstantialWord) return { valid: false, reason: 'INITIALS_ONLY' };
  // Total length check
  if (str.trim().length < 5) return { valid: false, reason: 'TOO_SHORT' };
  return { valid: true };
};

export const GCC_CITIES = [
  'dubai', 'abu dhabi', 'sharjah', 'ajman', 'ras al khaimah', 'fujairah',
  'riyadh', 'jeddah', 'mecca', 'medina', 'dammam', 'khobar', 'neom',
  'doha', 'muscat', 'kuwait city', 'manama', 'bahrain',
  'dxb', 'auh', 'shj', 'ksa', 'uae', 'kw', 'gcc'
];

export const INDIA_CITIES = [
  'mumbai', 'delhi', 'bangalore', 'bengaluru', 'blr', 'hyderabad', 'chennai',
  'kolkata', 'pune', 'ahmedabad', 'surat', 'jaipur', 'lucknow', 'kochi',
  'bom', 'del', 'hyd', 'maa', 'ccu', 'india'
];

export const GCC_JOB_KEYWORDS = [
  'manager', 'mgr', 'officer', 'executive', 'exec', 'engineer', 'eng',
  'analyst', 'specialist', 'coordinator', 'coordinator', 'advisor',
  'associate', 'consultant', 'director', 'head', 'lead', 'senior', 'sr',
  'junior', 'jr', 'assistant', 'asst', 'supervisor', 'supervisor',
  'developer', 'dev', 'designer', 'architect', 'pro', 'nurse', 'doctor',
  'accountant', 'auditor', 'technician', 'tech', 'representative', 'rep',
  'vp', 'ceo', 'cfo', 'coo', 'cto', 'gm', 'md', 'president', 'intern'
];

export const EDUCATION_KEYWORDS = [
  'btech', 'b.tech', 'mtech', 'm.tech', 'mba', 'msc', 'bsc', 'bca', 'mca',
  'phd', 'ph.d', 'diploma', 'degree', 'bachelor', 'master', 'doctorate',
  'high school', 'secondary', 'higher secondary', 'hsc', 'ssc', 'matric',
  'certificate', 'cert', 'pmp', 'cfa', 'cpa', 'acca', 'cma', 'dha', 'moh',
  'iit', 'iim', 'nit', 'bits', 'school', 'college', 'university', 'institute'
];

export const LANGUAGE_LIST = [
  'english', 'arabic', 'hindi', 'urdu', 'french', 'tagalog', 'filipino',
  'malayalam', 'tamil', 'telugu', 'kannada', 'bengali', 'punjabi', 'marathi',
  'spanish', 'german', 'chinese', 'mandarin', 'russian', 'persian', 'farsi',
  'swahili', 'amharic', 'turkish', 'korean', 'japanese'
];

export const INTENT_KEYWORDS = [
  'seeking', 'looking', 'want', 'aiming', 'hoping', 'planning',
  'move', 'grow', 'become', 'pursue', 'transition', 'explore',
  'get', 'find', 'join', 'work', 'build', 'lead', 'manage'
];

export const ACTION_VERBS = [
  'led', 'managed', 'built', 'reduced', 'increased', 'improved',
  'optimized', 'saved', 'delivered', 'launched', 'developed', 'created',
  'handled', 'exceeded', 'grew', 'achieved', 'implemented', 'executed',
  'streamlined', 'negotiated', 'trained', 'coached', 'supervised',
  'coordinated', 'designed', 'established', 'generated', 'spearheaded'
];

export const FAB_VALIDATION = {
  0: { // Q1 Full Name
    maxRetries: 2,
    probe: "I need your full professional name for the CV header. Could you provide both first and last names?",
    phoneProbe: "That looks like a phone number — I'll ask for that soon. For now, what's your full name? (e.g., 'Ahmed Al Mansouri' or 'Priya Sharma')",
    initialsProbe: "Looks like initials only. I need your complete name — like 'Junaid Khan' or 'Mohammed Al Rashid'.",
    hint: "Type your first and last name. Example: 'Ahmed Al Mansouri' or 'Sandeep K. Nair'"
  },
  1: { // Q2 Job Title
    maxRetries: 2,
    probe: "That sounds a bit broad. What's your specific official designation? (e.g., 'Senior Accountant' instead of just 'Finance').",
    hint: "Think of your official title on your last visa or contract. e.g., 'Sales Executive' or 'Project Manager'"
  },
  2: { // Q3 Location
    maxRetries: 2,
    probe: "I need to know where you're based or targeting. Which city should we list?",
    gccHook: "Great choice — major hub. Let's make sure your profile matches local market standards.",
    hint: "Enter a city like 'Dubai', 'Riyadh', or 'Mumbai'."
  },
  3: { // Q4 Industry
    maxRetries: 1,
    probe: "To tailor your CV effectively, I need a specific sector. Are we looking at Banking, Tech, Healthcare, or something else?",
    hint: "e.g., 'Oil and Gas', 'Fintech', 'Real Estate', or 'Hospitality'"
  },
  4: { // Q5 Experience
    maxRetries: 2,
    probe: "Recruiters filter heavily by years. Are you a Fresher or do you have a specific number of years?",
    hint: "Just type a number like '5' or say 'Fresh Grad' or 'Fresher'."
  },
  5: { // Q6 Skills
    maxRetries: 2,
    probe: "Let's get specific. What are the top 2-3 tools or strengths you use daily? (e.g., 'Tally, Excel, CRM').",
    hint: "Separate with commas. e.g., 'Project Management, MS Office, AutoCAD'"
  },
  6: { // Q7 Company
    maxRetries: 2,
    probe: "Which organization was this with? If it was your own venture, 'Self-employed' or 'Freelance' works perfectly.",
    hint: "e.g., 'Aramco', 'Tata Consultancy', or just 'Freelance'"
  },
  7: { // Q8 Achievement
    maxRetries: 3,
    probe: "This is your highlight reel! Can you mention one specific thing you Improved, Led, or Built?",
    metricNudge: "Great start! Did you happen to have a number for that? (e.g., 'Managed 10 people' or 'Cut costs by 15%'). Numbers impress Gulf recruiters.",
    hint: "Start with an action word. e.g., 'Managed a team of 15' or 'Increased sales by 30%'"
  },
  8: { // Q9 Education
    maxRetries: 2,
    probe: "What's your highest qualification? (e.g., 'Bachelor of Commerce', 'MBA', or 'PMP Certification').",
    hint: "Enter your degree. e.g., 'MBA', 'BTech', or 'High School Diploma'"
  },
  9: { // Q10 Languages
    maxRetries: 1,
    probe: "Being multilingual is a huge asset in this market. Which languages are you fluent in?",
    hint: "e.g., 'English, Arabic' or 'English, Hindi, Urdu'"
  },
  10: { // Q11 Career Goal
    maxRetries: 2,
    probe: "Last step! What is your dream next move? I will use this to write a compelling summary for you.",
    hint: "e.g., 'Seeking a Senior Banking role in UAE' or 'Looking to move into Fintech'"
  }
};

export const cleanAnswer = (fieldId, rawAnswer) => {
  let clean = rawAnswer.trim();

  const fluffPatterns = [
    /my (name|job|title|company|role) is/gi,
    /i (work|am working|was working) (as a?|at|in)/gi,
    /current (company|role) is/gi,
    /last (company|role) was/gi,
    /here and there/gi,
    /i (was|am) in/gi,
    /now in/gi,
    /i (speak|know|can speak)/gi,
    /very good at/gi,
    /good at/gi,
    /also (know|speak|do)/gi,
    /and also/gi,
    /as well/gi,
  ];
  fluffPatterns.forEach(regex => { clean = clean.replace(regex, ''); });

  const corrections = {
    'bannker': 'Banker', 'bankker': 'Banker', 'baner': 'Banker',
    'accountent': 'Accountant', 'acountant': 'Accountant',
    'maneger': 'Manager', 'manger': 'Manager', 'mangaer': 'Manager',
    'enginer': 'Engineer', 'engeneer': 'Engineer',
    'analist': 'Analyst', 'analest': 'Analyst',
    'technichian': 'Technician', 'technichan': 'Technician',
    'recepionist': 'Receptionist', 'recptionist': 'Receptionist',
    'electrition': 'Electrician', 'electrican': 'Electrician',
    'seles': 'Sales', 'salez': 'Sales',
    'custmer': 'Customer', 'cusomer': 'Customer',
    'devloper': 'Developer', 'develper': 'Developer',
    'consulant': 'Consultant', 'consutant': 'Consultant',
    'supervisior': 'Supervisor', 'superviser': 'Supervisor',
    'administator': 'Administrator', 'adminestrator': 'Administrator',
    'logisitcs': 'Logistics', 'logistcs': 'Logistics',
    'mareting': 'Marketing', 'markting': 'Marketing',
    'fianance': 'Finance', 'finace': 'Finance',
    'bussiness': 'Business', 'busines': 'Business',
  };
  Object.keys(corrections).forEach(wrong => {
    const regex = new RegExp(`\\b${wrong}\\b`, 'gi');
    clean = clean.replace(regex, corrections[wrong]);
  });

  const toTitleCase = (str) =>
    str.split(' ')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');

  switch (fieldId) {
    case 'name':
      clean = toTitleCase(clean);
      break;

    case 'title':
    case 'exp_role':
      // Handle "banker here and there accountant" → "Banker / Accountant"
      const roles = clean.split(/\s+(and|or|\/|,)\s+/i)
        .map(r => r.trim())
        .filter(r => r.length > 1);
      clean = roles.length > 1
        ? roles.map(toTitleCase).join(' / ')
        : toTitleCase(clean);
      break;

    case 'location':
      // Pick last city mentioned — handles "was in dubai now in abudhabi"
      const cityPattern = /(dubai|abu dhabi|abudhabi|sharjah|riyadh|jeddah|doha|muscat|mumbai|delhi|bengaluru|blr|pune|hyderabad|chennai|kolkata|kochi|ksa|uae)/gi;
      const cityMatches = clean.match(cityPattern);
      if (cityMatches && cityMatches.length > 0) {
        const lastCity = cityMatches[cityMatches.length - 1];
        // Normalize abudhabi → Abu Dhabi
        const cityMap = {
          'abudhabi': 'Abu Dhabi', 'blr': 'Bengaluru',
          'ksa': 'Saudi Arabia', 'uae': 'UAE'
        };
        clean = cityMap[lastCity.toLowerCase()] || toTitleCase(lastCity);
      } else {
        clean = toTitleCase(clean);
      }
      break;

    case 'exp_company':
      // Extract company name — handles "dejavu is my current company last company was wipro"
      // Pick first company mentioned (current)
      const companyFluff = /(is my current company|last company was|my current company is|i work at|working at|currently at)/gi;
      clean = clean.replace(companyFluff, '|').split('|')[0].trim();
      clean = toTitleCase(clean);
      break;

    case 'email':
      clean = clean.toLowerCase().replace(/\s/g, '');
      break;

    case 'phone':
      // Standardize UAE: 0585508782 → 058 550 8782
      // Keep as-is but strip spaces and dashes for storage
      clean = clean.replace(/[\s\-]/g, '');
      // Add + if starts with 971 or 91
      if (/^971/.test(clean)) clean = '+' + clean;
      if (/^91[6-9]/.test(clean)) clean = '+' + clean;
      break;

    case 'skills': {
      const blacklist = [
        'smoking', 'drinking', 'partying', 'sleeping', 'eating',
        'nothing', 'everything', 'gaming', 'cooking', 'watching'
      ];
      // Also detect and separate languages from skills
      const languageWords = [
        'english', 'arabic', 'hindi', 'urdu', 'tagalog', 'filipino',
        'malayalam', 'tamil', 'telugu', 'french', 'spanish', 'german'
      ];
      const allItems = clean.split(/[,\/\n\+&]+/)
        .map(s => s.trim())
        .filter(s => s.length > 1 && !blacklist.includes(s.toLowerCase()));
      const skillItems = allItems.filter(s => !languageWords.includes(s.toLowerCase()));
      clean = skillItems.map(toTitleCase).join(', ');
      break;
    }

    case 'exp_dates': {
      clean = clean
        .replace(/\b(till|to|until)\b\s*(present|now|date|today)?/gi, '– Present')
        .replace(/\bsince\b\s*/gi, '')
        .replace(/\bfrom\b\s*/gi, '')
        .replace(/\b(now|present|current|today|ongoing)\b/gi, 'Present')
        .replace(/(\d{4})\s*[-–]\s*(\d{4})/g, '$1 – $2')
        .replace(/(\d{4})\s*[-–]\s*Present/gi, '$1 – Present');
      if (/^\d{4}$/.test(clean.trim())) clean = `${clean.trim()} – Present`;
      // Handle "jan 2020 to now"
      clean = clean.replace(
        /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s*(\d{4})/gi,
        (_, m, y) => `${m.charAt(0).toUpperCase() + m.slice(1).toLowerCase()} ${y}`
      );
      break;
    }

    case 'exp_bullets': {
      // Strip first person
      clean = clean.replace(/^(i|we|my|our|was|were|have|had|very|am)\s+/gi, '');
      // Action verb transforms for common casual phrases
      const transforms = [
        [/managing people/gi, 'Managed cross-functional teams'],
        [/increased sales a lot/gi, 'Drove significant sales growth'],
        [/handled big clients/gi, 'Managed key client accounts'],
        [/very good at managing/gi, 'Managed effectively'],
        [/good at (.*)/gi, 'Proficient in $1'],
        [/always hit target/gi, 'Consistently achieved sales targets'],
        [/dealt with customers/gi, 'Managed customer relationships'],
        [/handled complaints/gi, 'Resolved customer complaints efficiently'],
      ];
      transforms.forEach(([pattern, replacement]) => {
        clean = clean.replace(pattern, replacement);
      });
      clean = clean.charAt(0).toUpperCase() + clean.slice(1);
      break;
    }

    case 'summary':
      clean = clean.charAt(0).toUpperCase() + clean.slice(1);
      break;

    default:
      clean = toTitleCase(clean);
  }

  return clean.replace(/\s{2,}/g, ' ').trim();
};

export const detectMultiAnswer = (currentFieldId, rawAnswer) => {
  const detected = {};
  const input = rawAnswer.toLowerCase();

  // Location detection — pick LAST city mentioned
  const cityMap = {
    'dubai': 'Dubai', 'abu dhabi': 'Abu Dhabi', 'abudhabi': 'Abu Dhabi',
    'sharjah': 'Sharjah', 'riyadh': 'Riyadh', 'jeddah': 'Jeddah',
    'doha': 'Doha', 'muscat': 'Muscat', 'kuwait': 'Kuwait City',
    'mumbai': 'Mumbai', 'delhi': 'Delhi', 'bengaluru': 'Bengaluru',
    'blr': 'Bengaluru', 'pune': 'Pune', 'hyderabad': 'Hyderabad',
    'chennai': 'Chennai', 'kolkata': 'Kolkata', 'kochi': 'Kochi',
  };
  let lastCityFound = null;
  Object.keys(cityMap).forEach(city => {
    if (input.includes(city)) lastCityFound = cityMap[city];
  });
  if (lastCityFound && currentFieldId !== 'location') {
    detected['location'] = lastCityFound;
  }

  // Role detection from any field
  if (currentFieldId !== 'title' && currentFieldId !== 'exp_role') {
    const roles = [
      'accountant', 'banker', 'bank', 'engineer', 'manager', 'consultant',
      'developer', 'nurse', 'doctor', 'analyst', 'coordinator', 'executive',
      'officer', 'supervisor', 'designer', 'architect', 'specialist',
      'technician', 'representative', 'advisor', 'director', 'lead',
    ];
    roles.forEach(role => {
      if (input.includes(role)) {
        detected['exp_role'] = role.charAt(0).toUpperCase() + role.slice(1);
      }
    });
  }

  // Company detection
  if (currentFieldId !== 'exp_company') {
    const knownCompanies = [
      'wipro', 'tata', 'aramco', 'etisalat', 'dejavu', 'emirates',
      'infosys', 'accenture', 'hsbc', 'adib', 'fab ', 'enbd', 'adcb',
      'du ', 'emaar', 'damac', 'aldar', 'nmc', 'aster', 'lulu',
    ];
    knownCompanies.forEach(co => {
      if (input.includes(co)) {
        detected['exp_company'] = co.trim().charAt(0).toUpperCase() + co.trim().slice(1);
      }
    });
  }

  // Date detection
  if (currentFieldId !== 'exp_dates') {
    const dateMatch = input.match(/(?:since|from|started in|in|working since)\s*(\d{4})/i);
    if (dateMatch) detected['exp_dates'] = `${dateMatch[1]} – Present`;
    // "2021 till present" pattern
    const rangeMatch = input.match(/(\d{4})\s*(?:till|to|–|-)\s*(present|now|\d{4})/i);
    if (rangeMatch) {
      const end = /\d{4}/.test(rangeMatch[2]) ? rangeMatch[2] : 'Present';
      detected['exp_dates'] = `${rangeMatch[1]} – ${end}`;
    }
  }

  // Language detection from skills field
  if (currentFieldId === 'skills') {
    const langs = [
      'english', 'arabic', 'hindi', 'urdu', 'tagalog', 'filipino',
      'malayalam', 'tamil', 'telugu', 'french', 'spanish', 'german',
      'mandarin', 'chinese',
    ];
    const foundLangs = langs.filter(l => input.includes(l));
    if (foundLangs.length > 0) {
      detected['languages'] = foundLangs
        .map(l => l.charAt(0).toUpperCase() + l.slice(1))
        .join(', ');
    }
  }

  // Name detection from any opening field
  if (currentFieldId === 'name' || currentFieldId === 'title') {
    const nameMatch = input.match(/(?:i am|my name is|i'm|name is)\s+([a-z]+(?:\s+[a-z]+)+)/i);
    if (nameMatch && currentFieldId !== 'name') {
      detected['name'] = nameMatch[1]
        .split(' ')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');
    }
  }

  return detected;
};
