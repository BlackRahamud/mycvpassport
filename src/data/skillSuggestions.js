const skillSuggestions = {
  it_support: {
    jobTitles: [
      "IT Support Engineer",
      "Help Desk Technician",
      "Technical Support Executive",
      "Desktop Support Engineer",
      "IT Administrator",
      "Service Desk Analyst",
      "Network Support Engineer",
      "System Administrator",
      "Field Engineer",
      "ICT Support Specialist"
    ],
    atsKeywords: [
      { keyword: "Active Directory", frequency: "High" },
      { keyword: "Office 365 Administration", frequency: "High" },
      { keyword: "ITIL Framework", frequency: "High" },
      { keyword: "Troubleshooting", frequency: "High" },
      { keyword: "Ticketing System", frequency: "High" },
      { keyword: "SLA Management", frequency: "High" },
      { keyword: "Hardware Maintenance", frequency: "High" },
      { keyword: "Remote Desktop Support", frequency: "High" },
      { keyword: "VPN Configuration", frequency: "High" },
      { keyword: "Windows Server 2019/2022", frequency: "High" },
      { keyword: "End-user Support", frequency: "High" },
      { keyword: "Network Protocols", frequency: "High" },
      { keyword: "TCP/IP", frequency: "High" },
      { keyword: "DHCP/DNS", frequency: "High" },
      { keyword: "Outlook Configuration", frequency: "High" },
      { keyword: "LAN/WAN", frequency: "High" },
      { keyword: "Microsoft Teams Support", frequency: "High" },
      { keyword: "Wi-Fi Troubleshooting", frequency: "High" },
      { keyword: "Software Deployment", frequency: "High" },
      { keyword: "User Access Management", frequency: "High" },
      { keyword: "Printer Troubleshooting", frequency: "High" },
      { keyword: "Backup Management", frequency: "Medium" },
      { keyword: "Antivirus Deployment", frequency: "Medium" },
      { keyword: "Asset Management", frequency: "Medium" },
      { keyword: "CCTV Troubleshooting", frequency: "Medium" },
      { keyword: "Biometric Support", frequency: "Medium" },
      { keyword: "Azure AD", frequency: "Medium" },
      { keyword: "Mac OS Support", frequency: "Medium" },
      { keyword: "Android/iOS Support", frequency: "Medium" },
      { keyword: "Router & Switch Configuration", frequency: "Medium" },
      { keyword: "Patch Management", frequency: "Medium" },
      { keyword: "Virtualization", frequency: "Medium" },
      { keyword: "VMware", frequency: "Medium" },
      { keyword: "ServiceNow", frequency: "Medium" },
      { keyword: "Zendesk", frequency: "Medium" },
      { keyword: "Firewall Administration", frequency: "Medium" },
      { keyword: "Data Migration", frequency: "Medium" },
      { keyword: "IP Telephony", frequency: "Medium" },
      { keyword: "VOIP Support", frequency: "Medium" },
      { keyword: "Cloud Computing", frequency: "Medium" },
      { keyword: "System Imaging", frequency: "Medium" },
      { keyword: "ERP Support", frequency: "Medium" },
      { keyword: "Information Security", frequency: "Medium" },
      { keyword: "Hyper-V", frequency: "Medium" },
      { keyword: "Group Policy", frequency: "Medium" },
      { keyword: "Disaster Recovery", frequency: "Low" },
      { keyword: "Ghost Imaging", frequency: "Low" },
      { keyword: "Linux Support", frequency: "Low" },
      { keyword: "Docker", frequency: "Low" },
      { keyword: "PowerShell Scripting", frequency: "Low" }
    ],
    hardSkills: [
      "Windows OS",
      "Microsoft 365",
      "Networking (CCNA level)",
      "Hardware Repair",
      "ITSM Tools",
      "Fortigate/Cisco Firewalls",
      "Active Directory",
      "SQL Basics",
      "PowerShell",
      "Cloud (Azure/AWS)",
      "Virtualization (VMware/Hyper-V)",
      "DNS/DHCP",
      "Endpoint Protection",
      "Office Suite Specialist",
      "Linux/Unix Commands",
      "VOIP/PBX Systems",
      "Mobile Device Management (MDM)",
      "Backup Exec/Veeam",
      "Cabling & Infrastructure",
      "Patch Management"
    ],
    softSkills: [
      "Customer Service",
      "Communication Skills",
      "Problem Solving",
      "Time Management",
      "Patience",
      "Analytical Thinking",
      "Team Collaboration",
      "Conflict Resolution",
      "Technical Writing",
      "Adaptability"
    ],
    certifications: [
      "CompTIA A+",
      "CCNA",
      "ITIL Foundation",
      "Microsoft Certified: Modern Desktop Administrator",
      "CompTIA Network+",
      "MCSE",
      "CompTIA Security+",
      "Azure Fundamentals (AZ-900)",
      "Google IT Support Professional Certificate",
      "Red Hat Certified System Administrator (RHCSA)"
    ],
    technicalSkillCategories: [
      {
        category: "Operating Systems",
        chips: ["Windows 10/11", "Windows Server 2019/2022", "macOS", "Ubuntu Linux", "CentOS", "Android", "iOS"]
      },
      {
        category: "Networking",
        chips: ["TCP/IP", "DNS/DHCP", "LAN/WAN", "VPN", "Wi-Fi", "Cisco Routing", "Firewall", "VLAN", "Proxy Server"]
      },
      {
        category: "Microsoft Technologies",
        chips: ["Active Directory", "Office 365", "Azure AD", "Microsoft Teams", "SharePoint", "Exchange Server", "Group Policy", "Hyper-V"]
      },
      {
        category: "ITSM & Ticketing",
        chips: ["ServiceNow", "Zendesk", "Freshdesk", "Jira Service Management", "ManageEngine", "ITIL", "SLA Management"]
      },
      {
        category: "Security & Infrastructure",
        chips: ["Fortigate Firewall", "Cisco ASA", "Antivirus/EDR", "Patch Management", "Backup & Recovery", "CCTV", "Biometric Systems"]
      },
      {
        category: "Virtualization & Cloud",
        chips: ["VMware vSphere", "Hyper-V", "Azure", "AWS", "Docker", "Cloud Computing", "System Imaging"]
      },
      {
        category: "Scripting & Automation",
        chips: ["PowerShell", "Batch Scripting", "Python Basics", "Remote Management Tools", "Software Deployment"]
      }
    ]
  },

  banking_finance: {
    jobTitles: [
      "Relationship Manager",
      "Investment Analyst",
      "Corporate Banker",
      "Credit Risk Officer",
      "Wealth Manager",
      "Branch Manager",
      "Islamic Finance Specialist",
      "Compliance Officer",
      "Portfolio Manager",
      "Operations Manager (Banking)"
    ],
    atsKeywords: [
      { keyword: "KYC/AML Compliance", frequency: "High" },
      { keyword: "Credit Risk Assessment", frequency: "High" },
      { keyword: "Islamic Banking (Sharia)", frequency: "High" },
      { keyword: "Murabaha/Ijara/Sukuk", frequency: "High" },
      { keyword: "Financial Modeling", frequency: "High" },
      { keyword: "Portfolio Management", frequency: "High" },
      { keyword: "Central Bank of UAE (CBUAE)", frequency: "High" },
      { keyword: "Trade Finance", frequency: "High" },
      { keyword: "Letters of Credit (LC)", frequency: "High" },
      { keyword: "Bank Guarantees", frequency: "High" },
      { keyword: "Retail Banking", frequency: "High" },
      { keyword: "Corporate Lending", frequency: "High" },
      { keyword: "NPA Management", frequency: "High" },
      { keyword: "Customer Acquisition", frequency: "High" },
      { keyword: "Asset Management", frequency: "High" },
      { keyword: "SEBI Guidelines", frequency: "High" },
      { keyword: "HNI Client Management", frequency: "High" },
      { keyword: "Due Diligence", frequency: "High" },
      { keyword: "Financial Statements", frequency: "High" },
      { keyword: "CASA Generation", frequency: "High" },
      { keyword: "Financial Analysis", frequency: "High" },
      { keyword: "SWIFT Payments", frequency: "High" },
      { keyword: "IFRS Standards", frequency: "High" },
      { keyword: "Revenue Growth", frequency: "High" },
      { keyword: "Cross-selling", frequency: "High" },
      { keyword: "Credit Monitoring", frequency: "High" },
      { keyword: "Customer Relationship Management (CRM)", frequency: "High" },
      { keyword: "RBI Regulations", frequency: "High" },
      { keyword: "Wealth Advisory", frequency: "Medium" },
      { keyword: "Equity Research", frequency: "Medium" },
      { keyword: "Fixed Income", frequency: "Medium" },
      { keyword: "DIFC Regulations", frequency: "Medium" },
      { keyword: "ADGM Compliance", frequency: "Medium" },
      { keyword: "Priority Banking", frequency: "Medium" },
      { keyword: "Financial Auditing", frequency: "Medium" },
      { keyword: "Treasury Operations", frequency: "Medium" },
      { keyword: "Capital Markets", frequency: "Medium" },
      { keyword: "Bancassurance", frequency: "Medium" },
      { keyword: "Operational Risk", frequency: "Medium" },
      { keyword: "Internal Audit", frequency: "Medium" },
      { keyword: "Mortgage Processing", frequency: "Medium" },
      { keyword: "Finacle", frequency: "Medium" },
      { keyword: "Tally.ERP 9", frequency: "Medium" },
      { keyword: "Basel III Norms", frequency: "Medium" },
      { keyword: "Sanctions Screening", frequency: "Medium" },
      { keyword: "Liquidity Management", frequency: "Medium" },
      { keyword: "Market Risk", frequency: "Medium" },
      { keyword: "Derivatives Trading", frequency: "Low" },
      { keyword: "Loan Syndication", frequency: "Low" },
      { keyword: "Mergers & Acquisitions", frequency: "Low" }
    ],
    hardSkills: [
      "Financial Analysis",
      "Risk Modeling",
      "Compliance Management",
      "Islamic Finance Structuring",
      "Advanced Excel/VBA",
      "Bloomberg Terminal",
      "Reuters Eikon",
      "Finacle/Flexcube",
      "KYC/CDD Procedures",
      "Credit Underwriting",
      "Portfolio Rebalancing",
      "Trade Finance Documentation",
      "Regulatory Reporting",
      "Tax Planning",
      "Investment Valuation",
      "Technical Analysis",
      "Asset Allocation",
      "Financial Reporting",
      "CASA Acquisition",
      "Legal Documentation"
    ],
    softSkills: [
      "Interpersonal Skills",
      "Persuasion",
      "Integrity",
      "Attention to Detail",
      "Decision Making",
      "Networking",
      "Strategic Planning",
      "Critical Thinking",
      "Negotiation",
      "Customer Centricity"
    ],
    certifications: [
      "CFA (Chartered Financial Analyst)",
      "FRM (Financial Risk Manager)",
      "CAMS (Certified Anti-Money Laundering Specialist)",
      "Certified Islamic Banker (CIB)",
      "CISI Investment Advice",
      "CIBP (Certified Islamic Banking Professional)",
      "NCFM (NSE Academy)",
      "JAIIB/CAIIB (India)",
      "CPA",
      "ACCA"
    ],
    technicalSkillCategories: [
      {
        category: "Banking Software",
        chips: ["Finacle", "Flexcube", "Temenos T24", "Misys BankFusion", "Finacle CRM", "Tally.ERP 9", "SAP Banking"]
      },
      {
        category: "Islamic Finance Products",
        chips: ["Murabaha", "Ijara", "Sukuk", "Musharaka", "Mudaraba", "Wakala", "Takaful", "Istisna", "Diminishing Musharaka"]
      },
      {
        category: "Trade Finance",
        chips: ["Letters of Credit (LC)", "Bank Guarantees", "Documentary Collections", "SWIFT MT700", "Bill of Lading", "Trust Receipts", "Standby LC"]
      },
      {
        category: "Risk & Compliance",
        chips: ["KYC/AML", "Basel III", "CBUAE Regulations", "DIFC Regulations", "ADGM Compliance", "Sanctions Screening", "RBI Guidelines", "SEBI Guidelines"]
      },
      {
        category: "Analytics & Reporting",
        chips: ["Bloomberg Terminal", "Reuters Eikon", "Advanced Excel", "Financial Modeling", "Power BI", "Credit Risk Modeling", "IFRS Reporting"]
      },
      {
        category: "Retail & Corporate Banking",
        chips: ["CASA Generation", "NPA Management", "Credit Underwriting", "Loan Processing", "Cross-selling", "Priority Banking", "HNI Relationship Management"]
      }
    ]
  },

  hospitality: {
    jobTitles: [
      "Guest Service Agent",
      "Front Office Manager",
      "Executive Housekeeper",
      "F&B Manager",
      "Restaurant Supervisor",
      "Concierge",
      "Guest Relations Executive",
      "Reservations Agent",
      "Events Coordinator",
      "Operations Manager (Hotel)"
    ],
    atsKeywords: [
      { keyword: "Opera PMS", frequency: "High" },
      { keyword: "Guest Experience", frequency: "High" },
      { keyword: "F&B Operations", frequency: "High" },
      { keyword: "Check-in/Check-out", frequency: "High" },
      { keyword: "Luxury Service Standards", frequency: "High" },
      { keyword: "Conflict Resolution", frequency: "High" },
      { keyword: "Upselling", frequency: "High" },
      { keyword: "HACCP Standards", frequency: "High" },
      { keyword: "Food Safety", frequency: "High" },
      { keyword: "Concierge Services", frequency: "High" },
      { keyword: "Room Allocation", frequency: "High" },
      { keyword: "Customer Feedback", frequency: "High" },
      { keyword: "Hospitality Management", frequency: "High" },
      { keyword: "Multi-cultural Environment", frequency: "High" },
      { keyword: "VIP Protocols", frequency: "High" },
      { keyword: "Cost Control", frequency: "High" },
      { keyword: "Staff Training", frequency: "High" },
      { keyword: "Scheduling/Rostering", frequency: "High" },
      { keyword: "Micros POS", frequency: "High" },
      { keyword: "Complaint Handling", frequency: "High" },
      { keyword: "Lobby Management", frequency: "High" },
      { keyword: "Departmental Coordination", frequency: "High" },
      { keyword: "Service Excellence", frequency: "High" },
      { keyword: "Billing and Invoicing", frequency: "High" },
      { keyword: "POS Operation", frequency: "High" },
      { keyword: "Loyalty Programs", frequency: "High" },
      { keyword: "Cross-cultural Communication", frequency: "High" },
      { keyword: "Telephone Etiquette", frequency: "High" },
      { keyword: "Revenue Management", frequency: "Medium" },
      { keyword: "Inventory Management", frequency: "Medium" },
      { keyword: "Banquet Management", frequency: "Medium" },
      { keyword: "Housekeeping Management", frequency: "Medium" },
      { keyword: "TripAdvisor Ranking", frequency: "Medium" },
      { keyword: "IDS Next", frequency: "Medium" },
      { keyword: "Occupancy Rates", frequency: "Medium" },
      { keyword: "ADR/RevPAR", frequency: "Medium" },
      { keyword: "Table Reservations", frequency: "Medium" },
      { keyword: "Beverage Knowledge", frequency: "Medium" },
      { keyword: "Pre-opening Experience", frequency: "Medium" },
      { keyword: "Audit Compliance", frequency: "Medium" },
      { keyword: "Night Audit", frequency: "Medium" },
      { keyword: "DTCM Regulations", frequency: "Medium" },
      { keyword: "Vendor Management", frequency: "Medium" },
      { keyword: "Event Planning", frequency: "Medium" },
      { keyword: "Budgeting", frequency: "Medium" },
      { keyword: "GDS Systems", frequency: "Medium" },
      { keyword: "Menu Engineering", frequency: "Low" },
      { keyword: "Sustainability Practices", frequency: "Low" },
      { keyword: "Public Relations", frequency: "Low" },
      { keyword: "Supply Chain", frequency: "Low" }
    ],
    hardSkills: [
      "Opera PMS",
      "Micros POS",
      "IDS Next",
      "HACCP Certified",
      "Inventory Software",
      "MS Office Suite",
      "Revenue Management Software",
      "Property Management Systems",
      "Mixology/Bar Skills",
      "Barista Skills",
      "Culinary Knowledge",
      "First Aid/Safety",
      "Cleaning Chemicals Handling",
      "Reporting Tools",
      "Menu Design",
      "Cost Calculation",
      "Point of Sale Systems",
      "OTA Management",
      "Social Media Monitoring",
      "Language Proficiency (Arabic/English/Hindi)"
    ],
    softSkills: [
      "Cultural Sensitivity",
      "Emotional Intelligence",
      "Multitasking",
      "Professional Grooming",
      "Service Orientation",
      "Resilience",
      "Teamwork",
      "Punctuality",
      "Effective Communication",
      "Empathy"
    ],
    certifications: [
      "Hospitality Management Degree",
      "HACCP Level 3",
      "WSET Level 1/2",
      "Basic Food Hygiene",
      "PIC (Person in Charge)",
      "Certified Hotel Administrator (CHA)",
      "Occupational Health & Safety (OHS)",
      "First Aid Certification",
      "CHST (Certified Hospitality Sales Professional)",
      "Front Office Executive Certification"
    ],
    technicalSkillCategories: [
      {
        category: "Property Management Systems",
        chips: ["Opera PMS", "IDS Next", "Protel", "RoomKey PMS", "Hotelogix", "eZee Frontdesk", "Cloudbeds"]
      },
      {
        category: "F&B & POS Systems",
        chips: ["Micros POS", "Infrasys", "Oracle FBMS", "POSist", "Lightspeed", "Revel POS", "Aloha POS"]
      },
      {
        category: "Revenue & Distribution",
        chips: ["Revenue Management", "OTA Management", "GDS Systems", "ADR/RevPAR", "Booking.com Extranet", "Expedia Partner Central", "Channel Manager"]
      },
      {
        category: "Food Safety & Compliance",
        chips: ["HACCP", "Food Safety Level 2/3", "DTCM Regulations", "Allergen Awareness", "Cold Chain Management", "Hygiene Audits"]
      },
      {
        category: "Guest Experience Tools",
        chips: ["TripAdvisor Management", "Google Reviews", "Guest Survey Tools", "Loyalty CRM", "Concierge Apps", "WhatsApp Guest Communication"]
      },
      {
        category: "Languages",
        chips: ["English", "Arabic", "Hindi", "Urdu", "French", "Russian", "Mandarin", "Tagalog"]
      }
    ]
  },

  sales_real_estate: {
    jobTitles: [
      "Real Estate Broker",
      "Sales Executive",
      "Property Consultant",
      "Business Development Manager",
      "Account Manager",
      "Leasing Agent",
      "Investment Consultant",
      "Direct Sales Representative",
      "Sales Manager",
      "Commercial Leasing Specialist"
    ],
    atsKeywords: [
      { keyword: "RERA Certified", frequency: "High" },
      { keyword: "Off-plan Sales", frequency: "High" },
      { keyword: "Secondary Market", frequency: "High" },
      { keyword: "Property Valuation", frequency: "High" },
      { keyword: "Lead Generation", frequency: "High" },
      { keyword: "Cold Calling", frequency: "High" },
      { keyword: "CRM Management", frequency: "High" },
      { keyword: "Sales Target Achievement", frequency: "High" },
      { keyword: "Negotiation", frequency: "High" },
      { keyword: "Dubai Land Department (DLD)", frequency: "High" },
      { keyword: "Property Finder / Bayut", frequency: "High" },
      { keyword: "Market Analysis", frequency: "High" },
      { keyword: "Closing Techniques", frequency: "High" },
      { keyword: "Client Relationship Management", frequency: "High" },
      { keyword: "Sales Pipeline", frequency: "High" },
      { keyword: "Investment ROI", frequency: "High" },
      { keyword: "Networking", frequency: "High" },
      { keyword: "Contract Negotiation", frequency: "High" },
      { keyword: "Presentation Skills", frequency: "High" },
      { keyword: "Property Tours", frequency: "High" },
      { keyword: "Freehold Properties", frequency: "High" },
      { keyword: "Sales Pitch", frequency: "High" },
      { keyword: "Field Sales", frequency: "High" },
      { keyword: "Cross-selling", frequency: "High" },
      { keyword: "Upselling", frequency: "High" },
      { keyword: "MOU Preparation", frequency: "High" },
      { keyword: "B2B Sales", frequency: "Medium" },
      { keyword: "Retail Leasing", frequency: "Medium" },
      { keyword: "Commercial Real Estate", frequency: "Medium" },
      { keyword: "Portfolio Management", frequency: "Medium" },
      { keyword: "Legal Documentation", frequency: "Medium" },
      { keyword: "Customer Retention", frequency: "Medium" },
      { keyword: "Sales Forecasting", frequency: "Medium" },
      { keyword: "Title Deeds", frequency: "Medium" },
      { keyword: "Escrow Accounts", frequency: "Medium" },
      { keyword: "Direct Marketing", frequency: "Medium" },
      { keyword: "Luxury Portfolio", frequency: "Medium" },
      { keyword: "Social Media Prospecting", frequency: "Medium" },
      { keyword: "Competitor Analysis", frequency: "Medium" },
      { keyword: "Account Development", frequency: "Medium" },
      { keyword: "Strategic Partnerships", frequency: "Medium" },
      { keyword: "Revenue Optimization", frequency: "Medium" },
      { keyword: "KYC Procedures", frequency: "Medium" },
      { keyword: "Market Penetration", frequency: "Medium" },
      { keyword: "Leasehold", frequency: "Medium" },
      { keyword: "Mortgage Advisory", frequency: "Low" },
      { keyword: "Exhibition Sales", frequency: "Low" },
      { keyword: "Influencer Marketing", frequency: "Low" },
      { keyword: "Distribution Channel", frequency: "Low" },
      { keyword: "Brand Awareness", frequency: "Low" }
    ],
    hardSkills: [
      "CRM Tools (Salesforce/HubSpot)",
      "Property Portals Expertise",
      "Negotiation Techniques",
      "Financial Math (ROI/Yield)",
      "Legal Knowledge (Law 7 of 2006)",
      "Lead Management",
      "Market Research Tools",
      "Digital Marketing Basics",
      "Contract Drafting",
      "Microsoft Office",
      "Valuation Methodology",
      "Sales Automation",
      "KYC/AML Compliance",
      "Public Speaking",
      "Data Analysis",
      "Arabic/Russian/Chinese Language",
      "Telesales Excellence",
      "Driving License (UAE)",
      "Canvassing",
      "Closing Deals"
    ],
    softSkills: [
      "Persistence",
      "Persuasive Communication",
      "Self-Motivation",
      "Resilience",
      "Active Listening",
      "Confidence",
      "Integrity",
      "Time Management",
      "Networking",
      "Relationship Building"
    ],
    certifications: [
      "RERA Broker License",
      "DREI (Dubai Real Estate Institute) Courses",
      "Certified Sales Professional (CSP)",
      "Real Estate Management Diploma",
      "RICS (Royal Institution of Chartered Surveyors)",
      "Property Investment Certification",
      "NAR International Member",
      "MBA Marketing",
      "Digital Sales Certification",
      "Negotiation Mastery"
    ],
    technicalSkillCategories: [
      {
        category: "CRM & Sales Tools",
        chips: ["Salesforce", "HubSpot", "Zoho CRM", "Pipedrive", "Bitrix24", "Microsoft Dynamics", "Lead Management Software"]
      },
      {
        category: "Property Portals",
        chips: ["Property Finder", "Bayut", "Dubizzle", "99acres", "MagicBricks", "Housing.com", "JustProperty", "Houza"]
      },
      {
        category: "UAE Real Estate Regulatory",
        chips: ["RERA", "DLD (Dubai Land Department)", "Ejari", "NOC Processing", "Oqood", "Escrow Accounts", "Title Deed", "MOU/Form F"]
      },
      {
        category: "Digital Marketing & Prospecting",
        chips: ["Social Media Prospecting", "WhatsApp Marketing", "Instagram Ads", "Google Ads", "Email Campaigns", "LinkedIn Outreach", "Cold Calling"]
      },
      {
        category: "Financial & Valuation",
        chips: ["ROI Calculation", "Yield Analysis", "Property Valuation", "Mortgage Advisory", "Investment Analysis", "Comparative Market Analysis"]
      },
      {
        category: "Languages",
        chips: ["English", "Arabic", "Russian", "Mandarin", "Hindi", "Urdu", "French"]
      }
    ]
  },

  hr_recruitment: {
    jobTitles: [
      "HR Manager",
      "Talent Acquisition Specialist",
      "HR Generalist",
      "Recruitment Consultant",
      "Employee Relations Officer",
      "HR Business Partner (HRBP)",
      "L&D Specialist",
      "Payroll Executive",
      "HR Operations Executive",
      "People & Culture Manager"
    ],
    atsKeywords: [
      { keyword: "UAE Labour Law", frequency: "High" },
      { keyword: "End-to-End Recruitment", frequency: "High" },
      { keyword: "Employee Relations", frequency: "High" },
      { keyword: "Onboarding/Offboarding", frequency: "High" },
      { keyword: "Payroll Administration", frequency: "High" },
      { keyword: "WPS (Wage Protection System)", frequency: "High" },
      { keyword: "Indian Labour Laws", frequency: "High" },
      { keyword: "Performance Management", frequency: "High" },
      { keyword: "KPI/OKR Tracking", frequency: "High" },
      { keyword: "Visa Processing", frequency: "High" },
      { keyword: "PRO Coordination", frequency: "High" },
      { keyword: "Talent Pipeline", frequency: "High" },
      { keyword: "Applicant Tracking System (ATS)", frequency: "High" },
      { keyword: "Sourcing Strategies", frequency: "High" },
      { keyword: "Headhunting", frequency: "High" },
      { keyword: "Boolean Search", frequency: "High" },
      { keyword: "Grievance Redressal", frequency: "High" },
      { keyword: "Employee Engagement", frequency: "High" },
      { keyword: "Training & Development", frequency: "High" },
      { keyword: "Compensation & Benefits", frequency: "High" },
      { keyword: "HR Policy Development", frequency: "High" },
      { keyword: "Conflict Management", frequency: "High" },
      { keyword: "MOHRE Compliance", frequency: "High" },
      { keyword: "EPF/ESI/Gratuity (India)", frequency: "High" },
      { keyword: "Exit Interviews", frequency: "High" },
      { keyword: "HRIS (SAP/Oracle)", frequency: "High" },
      { keyword: "Statutory Compliance", frequency: "High" },
      { keyword: "PF/Gratuity Calculations", frequency: "High" },
      { keyword: "Leave Management", frequency: "High" },
      { keyword: "Background Verification (BGV)", frequency: "High" },
      { keyword: "Screening & Shortlisting", frequency: "High" },
      { keyword: "Bulk Hiring", frequency: "High" },
      { keyword: "Disciplinary Actions", frequency: "High" },
      { keyword: "GOSI/Pension", frequency: "Medium" },
      { keyword: "Succession Planning", frequency: "Medium" },
      { keyword: "Campus Recruitment", frequency: "Medium" },
      { keyword: "Strategic HR", frequency: "Medium" },
      { keyword: "Organizational Development", frequency: "Medium" },
      { keyword: "Job Evaluation", frequency: "Medium" },
      { keyword: "Salary Benchmarking", frequency: "Medium" },
      { keyword: "Diversity & Inclusion", frequency: "Medium" },
      { keyword: "Workforce Planning", frequency: "Medium" },
      { keyword: "Internal Communication", frequency: "Medium" },
      { keyword: "Employer Branding", frequency: "Medium" },
      { keyword: "Vendor Management", frequency: "Medium" },
      { keyword: "BambooHR/Zoho People", frequency: "Medium" },
      { keyword: "Technical Recruiting", frequency: "Medium" },
      { keyword: "Executive Search", frequency: "Low" },
      { keyword: "Culture Transformation", frequency: "Low" },
      { keyword: "Change Management", frequency: "Low" }
    ],
    hardSkills: [
      "UAE Labour Law",
      "WPS Processing",
      "ATS Software (Workday/Taleo)",
      "LinkedIn Recruiter",
      "Naukri/GulfTalent Portal",
      "Payroll Software",
      "Statutory Compliance",
      "Microsoft Excel (Advanced)",
      "HRIS Management",
      "Data Analytics",
      "Interviewing Techniques",
      "Sourcing (Boolean)",
      "Onboarding Tools",
      "Employee Survey Tools",
      "Training Delivery",
      "Workforce Modeling",
      "Legal Drafting",
      "Contract Management",
      "Benefits Administration",
      "Job Analysis"
    ],
    softSkills: [
      "Confidentiality",
      "Empathy",
      "Negotiation",
      "Communication",
      "Ethical Conduct",
      "Problem Solving",
      "Strategic Thinking",
      "Interpersonal Skills",
      "Leadership",
      "Multitasking"
    ],
    certifications: [
      "SHRM-CP/SCP",
      "PHRi/SPHRi",
      "CIPD Level 3/5/7",
      "MBA HR",
      "Certified Talent Acquisition Professional",
      "CHRP/CHRM",
      "Payroll Management Certification",
      "Labour Law Specialist Certification",
      "Emotional Intelligence (EQ) Certification",
      "Learning & Development Professional"
    ],
    technicalSkillCategories: [
      {
        category: "HRIS & Payroll Systems",
        chips: ["SAP HCM", "Oracle HCM", "Workday", "BambooHR", "Zoho People", "Darwinbox", "GreytHR", "Mena Sys"]
      },
      {
        category: "Recruitment & ATS",
        chips: ["Taleo", "LinkedIn Recruiter", "Naukri RMS", "GulfTalent", "Bayt.com", "Zoho Recruit", "iCIMS", "SmartRecruiters"]
      },
      {
        category: "UAE HR Compliance",
        chips: ["UAE Labour Law", "MOHRE", "WPS (Wage Protection System)", "Visa Processing", "PRO Coordination", "GOSI", "Gratuity Calculation"]
      },
      {
        category: "India HR Compliance",
        chips: ["Indian Labour Laws", "PF/EPF", "ESI", "Gratuity Act", "Shops & Establishments Act", "TDS on Salary", "Statutory Compliance"]
      },
      {
        category: "Performance & L&D Tools",
        chips: ["KPI/OKR Tracking", "360 Feedback Tools", "Learning Management System (LMS)", "SuccessFactors", "Cornerstone OnDemand", "Training Needs Analysis"]
      },
      {
        category: "Sourcing & Analytics",
        chips: ["Boolean Search", "LinkedIn X-Ray", "Excel Dashboards", "Power BI HR Analytics", "Workforce Planning Tools", "Salary Benchmarking Tools"]
      }
    ]
  },

  accounting_finance: {
    jobTitles: [
      "Chief Accountant",
      "Financial Accountant",
      "Finance Manager",
      "Accounts Payable/Receivable Executive",
      "Tax Consultant",
      "Internal Auditor",
      "Management Accountant",
      "Cost Accountant",
      "VAT Manager",
      "Treasury Executive"
    ],
    atsKeywords: [
      { keyword: "VAT Implementation/VAT 201", frequency: "High" },
      { keyword: "IFRS Reporting", frequency: "High" },
      { keyword: "GST Filing (India)", frequency: "High" },
      { keyword: "Tally ERP 9 / TallyPrime", frequency: "High" },
      { keyword: "SAP FICO", frequency: "High" },
      { keyword: "Accounts Payable (AP)", frequency: "High" },
      { keyword: "Accounts Receivable (AR)", frequency: "High" },
      { keyword: "Bank Reconciliation", frequency: "High" },
      { keyword: "General Ledger (GL)", frequency: "High" },
      { keyword: "Financial Auditing", frequency: "High" },
      { keyword: "Balance Sheet Analysis", frequency: "High" },
      { keyword: "P&L Statements", frequency: "High" },
      { keyword: "Cash Flow Forecasting", frequency: "High" },
      { keyword: "Budgeting & Variance Analysis", frequency: "High" },
      { keyword: "Statutory Audit", frequency: "High" },
      { keyword: "External Audit Coordination", frequency: "High" },
      { keyword: "Internal Controls", frequency: "High" },
      { keyword: "Trial Balance", frequency: "High" },
      { keyword: "Fixed Asset Management", frequency: "High" },
      { keyword: "Corporate Tax (UAE)", frequency: "High" },
      { keyword: "Management Reporting", frequency: "High" },
      { keyword: "Journal Entries", frequency: "High" },
      { keyword: "Accruals and Prepayments", frequency: "High" },
      { keyword: "Microsoft Excel (VLOOKUP/Pivot)", frequency: "High" },
      { keyword: "Revenue Recognition", frequency: "High" },
      { keyword: "Payroll Accounting", frequency: "High" },
      { keyword: "Year-end Closing", frequency: "High" },
      { keyword: "TDS/TCS (India)", frequency: "High" },
      { keyword: "Tax Returns Preparation", frequency: "High" },
      { keyword: "Purchase Orders", frequency: "High" },
      { keyword: "Vendor Payments", frequency: "High" },
      { keyword: "Compliance Audits", frequency: "High" },
      { keyword: "Petty Cash Management", frequency: "High" },
      { keyword: "Withholding Tax (WHT)", frequency: "Medium" },
      { keyword: "Cost Accounting", frequency: "Medium" },
      { keyword: "Inventory Valuation", frequency: "Medium" },
      { keyword: "QuickBooks", frequency: "Medium" },
      { keyword: "Zoho Books", frequency: "Medium" },
      { keyword: "Oracle Financials", frequency: "Medium" },
      { keyword: "DIFC/Freezone Compliance", frequency: "Medium" },
      { keyword: "Financial Modeling", frequency: "Medium" },
      { keyword: "Working Capital Management", frequency: "Medium" },
      { keyword: "SEBI Compliance", frequency: "Medium" },
      { keyword: "Intercompany Reconciliation", frequency: "Medium" },
      { keyword: "Credit Control", frequency: "Medium" },
      { keyword: "Audit Trail", frequency: "Medium" },
      { keyword: "ERP Implementation", frequency: "Medium" },
      { keyword: "Consolidation", frequency: "Medium" },
      { keyword: "Cost Centers", frequency: "Medium" },
      { keyword: "Forex Management", frequency: "Low" }
    ],
    hardSkills: [
      "TallyPrime",
      "SAP FICO",
      "Microsoft Excel (Advanced)",
      "IFRS Expertise",
      "VAT/Taxation Law",
      "QuickBooks Online",
      "Oracle NetSuite",
      "GST Compliance",
      "Financial Statement Preparation",
      "Audit Planning",
      "Risk Assessment",
      "Data Migration",
      "Costing Methodologies",
      "Budgeting Tools",
      "Payroll Management",
      "Asset Tracking Systems",
      "Business Intelligence Tools (Power BI)",
      "Treasury Management",
      "Compliance Reporting",
      "SQL (Basic for Data Extraction)"
    ],
    softSkills: [
      "Analytical Mindset",
      "Numerical Accuracy",
      "Professional Integrity",
      "Attention to Detail",
      "Time Management",
      "Organisational Skills",
      "Communication",
      "Problem Solving",
      "Teamwork",
      "Critical Thinking"
    ],
    certifications: [
      "ACCA",
      "CPA",
      "Chartered Accountant (ICAI)",
      "CMA (Certified Management Accountant)",
      "CIMA",
      "Tally Certified Professional",
      "Diploma in IFRS",
      "VAT Professional Certification",
      "SAP FICO Certification",
      "CIA (Certified Internal Auditor)"
    ],
    technicalSkillCategories: [
      {
        category: "Accounting Software",
        chips: ["TallyPrime", "SAP FICO", "QuickBooks Online", "Zoho Books", "Oracle NetSuite", "Sage 50", "Xero", "Microsoft Dynamics 365"]
      },
      {
        category: "UAE Tax & Compliance",
        chips: ["VAT 201 Filing", "Corporate Tax (UAE)", "FTA Portal", "DIFC Compliance", "Freezone Accounting", "Withholding Tax (WHT)", "Transfer Pricing"]
      },
      {
        category: "India Tax & Compliance",
        chips: ["GST Filing (GSTR-1/3B)", "TDS/TCS", "Income Tax Returns", "Advance Tax", "SEBI Compliance", "MCA Filings", "Statutory Audit"]
      },
      {
        category: "Financial Reporting",
        chips: ["IFRS", "Balance Sheet", "P&L Statements", "Cash Flow Statements", "Management Accounts", "Consolidation", "Year-end Closing"]
      },
      {
        category: "Analytics & BI Tools",
        chips: ["Advanced Excel", "VLOOKUP/Pivot Tables", "Power BI", "Power Query", "Financial Modeling", "Budgeting & Forecasting", "Variance Analysis"]
      },
      {
        category: "Audit & Internal Controls",
        chips: ["Internal Audit", "External Audit Support", "Statutory Audit", "Audit Trail", "Internal Controls", "SOX Compliance", "Risk Assessment"]
      }
    ]
  }
};

export default skillSuggestions;
