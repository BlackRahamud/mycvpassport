const coverLetterDataBank = {
  Accountant: {
    hookAngle: "Driving fiscal integrity through meticulous closing cycles and audit-ready reporting.",
    reframe: "Reframing transactional accuracy into a foundation for strategic fiscal health and institutional trust.",
    powerWords: ["P&L Integrity", "Reconciliation"],
    bridgeSkills: ["General Ledger Management", "Statutory Reporting", "Tax Compliance"],
    toneDefault: "formal",
    keywords: ["IFRS", "GAAP", "Vouching", "Trial Balance", "Financial Statements"],
  },
  Auditor: {
    hookAngle: "Mitigating institutional risk through forensic precision and rigorous compliance frameworks.",
    reframe: "Leveraging a forensic eye for detail to ensure absolute regulatory adherence and operational transparency.",
    powerWords: ["Statutory Compliance", "Internal Controls"],
    bridgeSkills: ["Risk Assessment", "Substantive Testing", "Process Verification"],
    toneDefault: "formal",
    keywords: ["External Audit", "Internal Audit", "SOX Compliance", "Risk Mitigation", "Governance"],
  },
  "Tax Consultant": {
    hookAngle: "Optimizing corporate fiscal positioning through strategic liability reduction and regulatory foresight.",
    reframe: "Transforming complex tax legislation into strategic financial advantages and long-term cost optimization.",
    powerWords: ["Fiscal Planning", "VAT/GST Advisory"],
    bridgeSkills: ["Tax Strategy", "Cross-border Compliance", "Incentive Mapping"],
    toneDefault: "formal",
    keywords: ["Corporate Tax", "Transfer Pricing", "Indirect Tax", "Tax Treaties", "Withholding Tax"],
  },
  "Financial Analyst": {
    hookAngle: "Empowering executive decisions through high-conviction predictive modeling and variance insights.",
    reframe: "Converting raw market data into high-conviction forecasting models that drive executive decision-making.",
    powerWords: ["Variance Analysis", "Modeling"],
    bridgeSkills: ["Scenario Planning", "Data Synthesis", "Budgeting & Forecasting"],
    toneDefault: "performance",
    keywords: ["FP&A", "NPV/IRR", "Equity Research", "Financial Modeling", "Capital Allocation"],
  },
  "Investment Banker": {
    hookAngle: "Architecting high-value capital structures to maximize shareholder value and deal execution.",
    reframe: "Architecting complex financial structures to maximize shareholder value and secure market-leading transactions.",
    powerWords: ["Advisory", "M&A Execution"],
    bridgeSkills: ["Valuation", "Due Diligence", "Capital Markets"],
    toneDefault: "performance",
    keywords: ["Private Equity", "IPO", "Leveraged Finance", "Syndication", "Deal Flow"],
  },
  "Relationship Manager": {
    hookAngle: "Expanding institutional AUM through high-touch advisory and sophisticated portfolio management.",
    reframe: "Transitioning high-touch client service into long-term AUM growth and sustainable institutional loyalty.",
    powerWords: ["AUM Retention", "Fiduciary"],
    bridgeSkills: ["Portfolio Advisory", "Client Prospecting", "Financial Planning"],
    toneDefault: "formal",
    keywords: ["Wealth Management", "HNW Clients", "Cross-selling", "KYC", "Private Banking"],
  },
  "Bank Teller": {
    hookAngle: "Ensuring operational security and superior client experience in high-volume retail banking.",
    reframe: "Managing high-volume financial operations with a focus on risk detection and superior client experience.",
    powerWords: ["Cash Management", "KYC Diligence"],
    bridgeSkills: ["Transactional Accuracy", "Fraud Detection", "Customer Relations"],
    toneDefault: "formal",
    keywords: ["Retail Banking", "Cash Handling", "AML", "Branch Operations", "Customer Service"],
  },
  "Credit Analyst": {
    hookAngle: "Securing portfolio quality through rigorous solvency assessments and risk-adjusted lending.",
    reframe: "Balancing aggressive growth targets with rigorous credit risk assessment to ensure portfolio quality.",
    powerWords: ["Underwriting", "Solvency"],
    bridgeSkills: ["Financial Statement Analysis", "Risk Rating", "Covenant Monitoring"],
    toneDefault: "formal",
    keywords: ["Credit Risk", "Lending", "Debt Service Ratio", "Collateral", "Commercial Banking"],
  },
  "Insurance Advisor": {
    hookAngle: "Protecting private and commercial assets through customized risk-mitigation strategies.",
    reframe: "Converting complex policy structures into personalized safety nets that secure client assets and legacies.",
    powerWords: ["Policy Underwriting", "Premium Optimization"],
    bridgeSkills: ["Risk Profiling", "Claim Advisory", "Needs Analysis"],
    toneDefault: "performance",
    keywords: ["Life Insurance", "General Insurance", "Risk Management", "Policy Renewals", "Actuarial Value"],
  },
  Actuary: {
    hookAngle: "Quantifying long-term financial uncertainty to ensure institutional solvency and resilience.",
    reframe: "Applying advanced mathematical modeling to mitigate systemic risk and ensure multi-decade financial stability.",
    powerWords: ["Probability Modeling", "Risk Mitigation"],
    bridgeSkills: ["Statistical Analysis", "Loss Reserving", "Pricing Models"],
    toneDefault: "formal",
    keywords: ["Pension Modeling", "Stochastic Analysis", "Annuity", "Data Science", "ALM"],
  },
  "Software Engineer": {
    hookAngle: "Building scalable, high-performance systems that solve non-linear business challenges.",
    reframe: "Translating complex business requirements into high-performance, maintainable codebases that power growth.",
    powerWords: ["Refactoring", "System Architecture"],
    bridgeSkills: ["Full-stack Development", "Agile Methodologies", "Debugging"],
    toneDefault: "performance",
    keywords: ["JavaScript", "Python", "Cloud Computing", "SDLC", "Object-Oriented Programming"],
  },
  "Frontend Developer": {
    hookAngle: "Crafting intuitive, pixel-perfect user interfaces optimized for engagement and performance.",
    reframe: "Bridging the gap between aesthetic design and technical feasibility to drive user engagement and retention.",
    powerWords: ["Responsive Logic", "UI/UX Fidelity"],
    bridgeSkills: ["Component Architecture", "Performance Optimization", "Cross-browser Compatibility"],
    toneDefault: "performance",
    keywords: ["React", "CSS3", "Typescript", "Redux", "Single Page Applications"],
  },
  "Backend Developer": {
    hookAngle: "Architecting secure, scalable server-side logic and robust API infrastructures.",
    reframe: "Ensuring the backbone of digital products is secure, scalable, and optimized for high-concurrency environments.",
    powerWords: ["Microservices", "Latency Optimization"],
    bridgeSkills: ["Database Design", "API Integration", "Security Patching"],
    toneDefault: "performance",
    keywords: ["Node.js", "PostgreSQL", "RESTful API", "GraphQL", "Caching"],
  },
  "DevOps Engineer": {
    hookAngle: "Accelerating software delivery through automated pipelines and resilient infrastructure.",
    reframe: "Standardizing the bridge between development and operations to accelerate deployment cycles and system reliability.",
    powerWords: ["CI/CD Pipelines", "Infrastructure-as-Code"],
    bridgeSkills: ["Cloud Orchestration", "Automation", "Monitoring & Logging"],
    toneDefault: "performance",
    keywords: ["Docker", "Kubernetes", "AWS", "Terraform", "Jenkins"],
  },
  "Data Analyst": {
    hookAngle: "Transforming raw datasets into actionable insights that drive commercial strategy.",
    reframe: "Decoding complex datasets to uncover hidden trends that directly influence operational strategy.",
    powerWords: ["Statistical Significance", "Data Visualization"],
    bridgeSkills: ["SQL Queries", "BI Reporting", "Trend Analysis"],
    toneDefault: "performance",
    keywords: ["Power BI", "Tableau", "Excel", "A/B Testing", "Data Cleansing"],
  },
  "Data Scientist": {
    hookAngle: "Harnessing predictive modeling and machine learning to automate complex foresight.",
    reframe: "Harnessing machine learning algorithms to solve non-linear business challenges and automate foresight.",
    powerWords: ["Neural Networks", "Algorithmic Modeling"],
    bridgeSkills: ["Predictive Analytics", "Data Mining", "Hypothesis Testing"],
    toneDefault: "performance",
    keywords: ["Machine Learning", "R", "Pandas", "Scikit-Learn", "Deep Learning"],
  },
  "Cybersecurity Analyst": {
    hookAngle: "Fortifying digital perimeters and ensuring institutional resilience against evolving threats.",
    reframe: "Proactively fortifying digital perimeters to protect institutional integrity against evolving global threats.",
    powerWords: ["Intrusion Detection", "Zero Trust"],
    bridgeSkills: ["Threat Hunting", "Incident Response", "Vulnerability Assessment"],
    toneDefault: "formal",
    keywords: ["Network Security", "SOC", "Encryption", "SIEM", "Penetration Testing"],
  },
  "IT Support": {
    hookAngle: "Maximizing organizational uptime through rapid technical resolution and user support.",
    reframe: "Minimizing organizational downtime through rapid technical troubleshooting and proactive infrastructure maintenance.",
    powerWords: ["SLA Adherence", "Ticketing Efficiency"],
    bridgeSkills: ["Troubleshooting", "System Configuration", "Hardware Maintenance"],
    toneDefault: "formal",
    keywords: ["ITIL", "Active Directory", "Remote Support", "Asset Management", "Helpdesk"],
  },
  "Product Manager": {
    hookAngle: "Driving product-market fit through strategic roadmapping and cross-functional leadership.",
    reframe: "Aligning cross-functional teams to deliver user-centric features that meet aggressive commercial targets.",
    powerWords: ["Product Lifecycle", "Stakeholder Alignment"],
    bridgeSkills: ["Requirement Analysis", "Market Research", "Agile Product Ownership"],
    toneDefault: "performance",
    keywords: ["Roadmap", "Jira", "MVP", "User Stories", "Go-To-Market"],
  },
  "UX Designer": {
    hookAngle: "Reducing user friction through human-centric design and intuitive journey mapping.",
    reframe: "Refining digital touchpoints to reduce friction and maximize the emotional resonance of the brand.",
    powerWords: ["Wireframing", "Human-Centric Design"],
    bridgeSkills: ["User Research", "Prototyping", "Information Architecture"],
    toneDefault: "performance",
    keywords: ["Figma", "Adobe XD", "User Flows", "Usability Testing", "Accessibility"],
  },
  "HR Executive": {
    hookAngle: "Optimizing human capital through progressive policy management and employee advocacy.",
    reframe: "Synchronizing organizational policies with employee wellbeing to drive retention and operational harmony.",
    powerWords: ["Employee Relations", "Compliance"],
    bridgeSkills: ["Policy Development", "Conflict Resolution", "Admin Support"],
    toneDefault: "formal",
    keywords: ["Employee Engagement", "Onboarding", "Labor Law", "HRIS", "Performance Management"],
  },
  Recruiter: {
    hookAngle: "Securing top-tier talent to fuel organizational growth and cultural synergy.",
    reframe: "Identifying high-potential human capital to fill critical gaps and fuel organizational expansion.",
    powerWords: ["Sourcing Pipeline", "Headhunting"],
    bridgeSkills: ["Talent Sourcing", "Interviewing", "Offer Negotiation"],
    toneDefault: "performance",
    keywords: ["ATS", "Technical Recruiting", "Employer Branding", "Sourcing", "LinkedIn Recruiter"],
  },
  "L&D Specialist": {
    hookAngle: "Elevating institutional capability through bespoke training and competency development.",
    reframe: "Developing bespoke training frameworks that elevate institutional knowledge and employee performance.",
    powerWords: ["Curriculum Design", "Competency Mapping"],
    bridgeSkills: ["Instructional Design", "Program Evaluation", "Public Speaking"],
    toneDefault: "formal",
    keywords: ["LMS", "Upskilling", "Training Needs Analysis", "E-learning", "Workshops"],
  },
  "Payroll Manager": {
    hookAngle: "Ensuring 100% disbursement accuracy and tax compliance in high-volume payroll environments.",
    reframe: "Ensuring 100% accuracy in high-volume disbursements while maintaining strict legal and tax compliance.",
    powerWords: ["Disbursement", "Statutory Deductions"],
    bridgeSkills: ["Payroll Processing", "Benefits Administration", "Auditing"],
    toneDefault: "formal",
    keywords: ["WPS", "PF Management", "Tax Withholding", "Salary Structures", "Overtime Calculation"],
  },
  "HR Business Partner": {
    hookAngle: "Aligning human capital strategy with business objectives to drive workforce ROI.",
    reframe: "Acting as a bridge between departmental goals and HR strategy to drive workforce productivity.",
    powerWords: ["Organizational Design", "Change Management"],
    bridgeSkills: ["Strategic Planning", "Leadership Coaching", "Data-driven HR"],
    toneDefault: "performance",
    keywords: ["HR Strategy", "Succession Planning", "Workforce Planning", "Culture Change", "Business Alignment"],
  },
  "Sales Executive": {
    hookAngle: "Driving aggressive revenue growth through persistent prospecting and relationship building.",
    reframe: "Converting cold leads into high-value accounts through persistent prospecting and value-based selling.",
    powerWords: ["Quota Attainment", "Lead Conversion"],
    bridgeSkills: ["Cold Calling", "Negotiation", "CRM Management"],
    toneDefault: "performance",
    keywords: ["B2B Sales", "Sales Pipeline", "Inside Sales", "Closing", "Account Management"],
  },
  "Business Development Manager": {
    hookAngle: "Scaling market presence through strategic partnerships and untapped opportunity identification.",
    reframe: "Identifying untapped market opportunities to forge high-impact alliances and long-term revenue streams.",
    powerWords: ["Market Penetration", "Strategic Alliances"],
    bridgeSkills: ["Market Analysis", "Proposal Development", "Relationship Management"],
    toneDefault: "performance",
    keywords: ["Lead Generation", "Market Expansion", "Key Account Management", "Commercial Strategy", "Partnerships"],
  },
  "Real Estate Agent": {
    hookAngle: "Maximizing asset yields for HNW investors through expert local market insight.",
    reframe: "Managing the lifecycle of high-stakes property investments through expert negotiation and local market insight.",
    powerWords: ["Listing Volume", "Closing Velocity"],
    bridgeSkills: ["Asset Valuation", "Investor Relations", "Market Research"],
    toneDefault: "performance",
    keywords: ["Luxury Real Estate", "ROI Analysis", "Property Management", "Leasing", "Brokerage"],
  },
  "Retail Store Manager": {
    hookAngle: "Optimizing store profitability and brand fidelity through operational excellence.",
    reframe: "Optimizing floor productivity and staff performance to maximize basket size and brand loyalty.",
    powerWords: ["Merchandising", "Inventory Turnover"],
    bridgeSkills: ["Team Leadership", "Visual Merchandising", "P&L Management"],
    toneDefault: "formal",
    keywords: ["Shrinkage Control", "Retail Operations", "Staff Rostering", "Stock Management", "KPI Tracking"],
  },
  "Customer Support Executive": {
    hookAngle: "Enhancing brand loyalty through empathetic, rapid-response conflict resolution.",
    reframe: "Transforming technical grievances into positive brand experiences through empathetic and efficient problem-solving.",
    powerWords: ["NPS (Net Promoter Score)", "First-Call Resolution"],
    bridgeSkills: ["Troubleshooting", "Emotional Intelligence", "Technical Writing"],
    toneDefault: "formal",
    keywords: ["Zendesk", "Customer Success", "CRM", "SLA", "Retention"],
  },
  "Civil Engineer": {
    hookAngle: "Ensuring structural integrity and safety across large-scale infrastructure projects.",
    reframe: "Managing the lifecycle of physical assets from blueprint to completion with rigorous adherence to safety standards.",
    powerWords: ["Structural Integrity", "Project Lifecycle"],
    bridgeSkills: ["Project Management", "Technical Budgeting", "Drafting"],
    toneDefault: "formal",
    keywords: ["AutoCAD", "Structural Analysis", "EPC", "Quality Control", "Surveying"],
  },
  "Mechanical Engineer": {
    hookAngle: "Optimizing industrial mechanical systems for maximum efficiency and thermal performance.",
    reframe: "Optimizing mechanical systems to enhance performance while reducing energy consumption and wear.",
    powerWords: ["Thermodynamics", "CAD Modeling"],
    bridgeSkills: ["Design for Manufacturing", "Maintenance Planning", "Simulation"],
    toneDefault: "formal",
    keywords: ["HVAC", "SolidWorks", "Fluid Dynamics", "R&D", "Asset Integrity"],
  },
  "Electrical Engineer": {
    hookAngle: "Architecting resilient power distribution systems for complex industrial environments.",
    reframe: "Designing resilient electrical frameworks that ensure uninterrupted energy flow for complex industrial systems.",
    powerWords: ["Grid Stability", "Load Calculation"],
    bridgeSkills: ["Circuit Design", "Technical Documentation", "Safety Compliance"],
    toneDefault: "formal",
    keywords: ["Power Systems", "PLC", "LV/MV Panels", "Electrical Design", "Energy Audits"],
  },
  "Project Manager": {
    hookAngle: "Delivering complex multi-stakeholder projects on time and under budget.",
    reframe: "Synchronizing diverse workstreams to deliver complex projects on schedule and under budget.",
    powerWords: ["Milestone Tracking", "Resource Allocation"],
    bridgeSkills: ["Risk Mitigation", "Budget Management", "Vendor Coordination"],
    toneDefault: "performance",
    keywords: ["PMP", "Prince2", "Gantt Charts", "Procurement", "Agile"],
  },
  "Site Engineer": {
    hookAngle: "Ensuring precision field execution and 100% adherence to safety protocols.",
    reframe: "Translating high-level technical specifications into precise on-site execution and safety compliance.",
    powerWords: ["On-site Supervision", "Quality Assurance"],
    bridgeSkills: ["Construction Supervision", "Quality Inspection", "Daily Reporting"],
    toneDefault: "formal",
    keywords: ["On-site Execution", "Health & Safety (HSE)", "RFI", "Material Testing", "Vendor Management"],
  },
  Doctor: {
    hookAngle: "Providing evidence-based clinical care and specialized therapeutic intervention.",
    reframe: "Combining evidence-based medicine with empathetic care to ensure superior health outcomes and trust.",
    powerWords: ["Diagnostics", "Therapeutic Intervention"],
    bridgeSkills: ["Patient Advisory", "Case Management", "Clinical Research"],
    toneDefault: "formal",
    keywords: ["Clinical Excellence", "Primary Care", "Inpatient Care", "EHR", "Patient Safety"],
  },
  Nurse: {
    hookAngle: "Delivering high-vigilance clinical care and patient advocacy in acute settings.",
    reframe: "Managing critical patient needs through technical precision and constant bedside vigilance.",
    powerWords: ["Triage", "Clinical Monitoring"],
    bridgeSkills: ["Emergency Response", "Medication Admin", "Patient Care"],
    toneDefault: "formal",
    keywords: ["Critical Care", "IV Therapy", "Vital Signs", "Wound Care", "Nursing Ethics"],
  },
  Pharmacist: {
    hookAngle: "Ensuring medication safety and precision pharmaceutical counseling for patients.",
    reframe: "Ensuring the safe disbursement of pharmaceuticals while providing expert counsel on drug interactions.",
    powerWords: ["Pharmacovigilance", "Dispensing Accuracy"],
    bridgeSkills: ["Pharmacology", "Inventory Management", "Clinical Consultation"],
    toneDefault: "formal",
    keywords: ["Prescription Management", "Drug Interactions", "DHA Licensed", "Pharmaceuticals", "Patient Counseling"],
  },
  "Medical Representative": {
    hookAngle: "Bridging clinical innovation with physician needs through evidence-based sales.",
    reframe: "Bridging the gap between pharmaceutical innovation and physician needs through evidence-based sales.",
    powerWords: ["KOL Engagement", "Territory Management"],
    bridgeSkills: ["Medical Knowledge", "Sales Prospecting", "Networking"],
    toneDefault: "performance",
    keywords: ["Pharmaceutical Sales", "Product Launches", "Healthcare Sales", "CME Support", "Market Access"],
  },
  "Lab Technician": {
    hookAngle: "Ensuring diagnostic precision through meticulous sample analysis and equipment management.",
    reframe: "Ensuring the clinical validity of test results through meticulous sample management and equipment calibration.",
    powerWords: ["Specimen Analysis", "Biosafety"],
    bridgeSkills: ["Clinical Testing", "Quality Control", "Microscopy"],
    toneDefault: "formal",
    keywords: ["Pathology", "Hematology", "LIMS", "Lab Safety", "Sample Processing"],
  },
  Teacher: {
    hookAngle: "Fostering academic excellence through student-centric pedagogy and inclusive learning.",
    reframe: "Developing inclusive learning environments that foster both academic excellence and personal growth.",
    powerWords: ["Differentiated Instruction", "Pedagogical Strategy"],
    bridgeSkills: ["Curriculum Planning", "Classroom Management", "Parent Relations"],
    toneDefault: "formal",
    keywords: ["Lesson Planning", "Assessment", "K-12", "STEM", "Student Engagement"],
  },
  "Corporate Trainer": {
    hookAngle: "Driving organizational performance through targeted skill-gap bridging and workshops.",
    reframe: "Translating corporate objectives into actionable training modules that improve measurable job performance.",
    powerWords: ["Knowledge Transfer", "Instructional Design"],
    bridgeSkills: ["Public Speaking", "Module Development", "Competency Testing"],
    toneDefault: "performance",
    keywords: ["Soft Skills", "Workshops", "Upskilling", "Professional Development", "Adult Learning"],
  },
  "Content Writer": {
    hookAngle: "Elevating brand authority through persuasive narrative storytelling and SEO optimization.",
    reframe: "Crafting compelling stories that convert passive readers into loyal brand advocates and customers.",
    powerWords: ["Narrative Tone", "Copy Conversion"],
    bridgeSkills: ["Copywriting", "Research", "Editing"],
    toneDefault: "performance",
    keywords: ["Blogging", "Storytelling", "SEO Writing", "Editing", "Content Strategy"],
  },
  "Digital Marketer": {
    hookAngle: "Maximizing digital ROI through full-funnel strategy and high-conviction ad spend.",
    reframe: "Optimizing multi-channel campaigns to lower acquisition costs and maximize lifetime value.",
    powerWords: ["ROAS (Return on Ad Spend)", "Growth Hacking"],
    bridgeSkills: ["Campaign Management", "Data Analytics", "Performance Marketing"],
    toneDefault: "performance",
    keywords: ["Google Ads", "Paid Social", "Funnel Optimization", "Remarketing", "CPA Optimization"],
  },
  "SEO Specialist": {
    hookAngle: "Dominating organic search through technical engineering and strategic keyword mapping.",
    reframe: "Engineering technical and content-driven strategies to dominate search engine results and drive intent-led traffic.",
    powerWords: ["Keyword Mapping", "Domain Authority"],
    bridgeSkills: ["Technical SEO", "Content Audit", "Link Building"],
    toneDefault: "performance",
    keywords: ["Search Console", "Semrush", "Backlink Strategy", "Technical SEO", "On-page SEO"],
  },
  "Graphic Designer": {
    hookAngle: "Translating brand values into high-impact visual assets that command attention.",
    reframe: "Translating abstract brand values into high-impact visual assets that cut through market noise.",
    powerWords: ["Visual Branding", "Typography"],
    bridgeSkills: ["Visual Identity", "Layout Design", "Digital Illustration"],
    toneDefault: "performance",
    keywords: ["Adobe Creative Suite", "Photoshop", "Illustrator", "Branding", "Vector Art"],
  },
  "Video Editor": {
    hookAngle: "Assembling raw footage into high-retention narratives optimized for digital flow.",
    reframe: "Assembling raw footage into high-retention stories that align with brand aesthetics and messaging.",
    powerWords: ["Post-Production", "Motion Graphics"],
    bridgeSkills: ["Storyboarding", "Sound Design", "Color Grading"],
    toneDefault: "performance",
    keywords: ["Premiere Pro", "After Effects", "Final Cut", "Video Post-production", "Editing"],
  },
  "Social Media Manager": {
    hookAngle: "Fostering brand community and virality through real-time digital engagement.",
    reframe: "Managing real-time brand engagement to foster a loyal digital community and amplify brand reach.",
    powerWords: ["Engagement Analytics", "Virality Strategy"],
    bridgeSkills: ["Content Planning", "Community Management", "Trend Analysis"],
    toneDefault: "performance",
    keywords: ["Instagram", "TikTok", "Social Listening", "Content Calendar", "Influencer Marketing"],
  },
  "Operations Manager": {
    hookAngle: "Streamlining organizational workflows to drive productivity and operational excellence.",
    reframe: "Streamlining internal workflows to eliminate bottlenecks and enhance institutional productivity.",
    powerWords: ["Lean Methodology", "Operational Efficiency"],
    bridgeSkills: ["Process Optimization", "Budget Planning", "Cross-functional Leadership"],
    toneDefault: "performance",
    keywords: ["Six Sigma", "Workflows", "Vendor Management", "Facility Operations", "Resource Optimization"],
  },
  "Logistics Coordinator": {
    hookAngle: "Synchronizing global supply movements for on-time delivery in complex environments.",
    reframe: "Synchronizing global movement of goods to ensure on-time delivery despite complex environmental variables.",
    powerWords: ["Freight Optimization", "Route Planning"],
    bridgeSkills: ["Inventory Control", "Customs Liaison", "Carrier Management"],
    toneDefault: "formal",
    keywords: ["Supply Chain", "Export/Import", "Warehousing", "ERP", "Incoterms"],
  },
  "Supply Chain Analyst": {
    hookAngle: "Modeling predictive supply chains to balance inventory availability with minimal holding cost.",
    reframe: "Modeling supply chains to balance inventory availability with minimal holding costs and lead times.",
    powerWords: ["Procurement Strategy", "Demand Forecasting"],
    bridgeSkills: ["Data Analysis", "Supplier Management", "Logistics Modeling"],
    toneDefault: "performance",
    keywords: ["MRP", "Inventory Planning", "Cost Reduction", "Logistics Data", "S&OP"],
  },
  CEO: {
    hookAngle: "Architecting sustainable organizational growth and dominant market positioning.",
    reframe: "Architecting organizational strategy to achieve sustainable growth and dominant market positioning.",
    powerWords: ["Strategic Vision", "Stakeholder Value"],
    bridgeSkills: ["P&L Oversight", "Board Relations", "Change Management"],
    toneDefault: "performance",
    keywords: ["Executive Leadership", "M&A", "Corporate Strategy", "Public Relations", "Innovation"],
  },
  COO: {
    hookAngle: "Translating high-level corporate strategy into scalable and profitable day-to-day operations.",
    reframe: "Turning high-level corporate strategy into repeatable, scalable, and profitable day-to-day operations.",
    powerWords: ["KPI Optimization", "Scalability"],
    bridgeSkills: ["Operational Strategy", "System Standardization", "Performance Metrics"],
    toneDefault: "performance",
    keywords: ["Efficiency", "Unit Economics", "Organizational Design", "Operating Model", "Productivity"],
  },
  CFO: {
    hookAngle: "Stewarding institutional fiscal health through rigorous capital allocation and risk governance.",
    reframe: "Managing the fiscal health of the organization through rigorous capital allocation and risk management.",
    powerWords: ["Liquidity Management", "Fiscal Governance"],
    bridgeSkills: ["Financial Strategy", "Treasury Management", "IR Management"],
    toneDefault: "formal",
    keywords: ["Capital Structure", "Audit Management", "Financial Reporting", "Risk Strategy", "Compliance"],
  },
  CMO: {
    hookAngle: "Elevating global brand equity and market share through data-driven marketing leadership.",
    reframe: "Leveraging data-driven marketing to build iconic brands and capture global market share.",
    powerWords: ["Brand Positioning", "Customer Acquisition"],
    bridgeSkills: ["Market Intelligence", "Brand Strategy", "MarTech Oversight"],
    toneDefault: "performance",
    keywords: ["Brand Management", "Market Share", "Growth Strategy", "Digital Transformation", "Omnichannel"],
  },
  "Executive Assistant": {
    hookAngle: "Acting as a strategic force-multiplier for leadership through seamless priority management.",
    reframe: "Acting as a force-multiplier for leadership by managing complex priorities and critical communication.",
    powerWords: ["Calendar Management", "Discretion"],
    bridgeSkills: ["Stakeholder Management", "Travel Coordination", "Meeting Facilitation"],
    toneDefault: "formal",
    keywords: ["Admin Support", "Business Support", "Event Planning", "Document Control", "Confidentiality"],
  },
  "Legal Counsel": {
    hookAngle: "Navigating complex legal landscapes to facilitate secure and compliant commercial transactions.",
    reframe: "Navigating complex legal landscapes to mitigate risk and facilitate secure commercial transactions.",
    powerWords: ["Contract Negotiation", "Statutory Risk"],
    bridgeSkills: ["Litigation Management", "Advisory", "Legal Research"],
    toneDefault: "formal",
    keywords: ["Corporate Law", "Contract Law", "Arbitration", "Intellectual Property", "Litigation"],
  },
  "Compliance Officer": {
    hookAngle: "Ensuring 100% institutional adherence to global regulatory standards and ethical frameworks.",
    reframe: "Ensuring all organizational activities align with global regulatory standards and internal ethics.",
    powerWords: ["Audit Readiness", "Regulatory Oversight"],
    bridgeSkills: ["Risk Assessment", "Monitoring", "Training"],
    toneDefault: "formal",
    keywords: ["AML", "Governance", "Sanctions", "Reporting", "Compliance Risk"],
  },
  "Admin Officer": {
    hookAngle: "Ensuring seamless business continuity through robust office infrastructure and process support.",
    reframe: "Maintaining the operational backbone of the office to ensure seamless day-to-day business continuity.",
    powerWords: ["Resource Management", "Office Procurement"],
    bridgeSkills: ["Facility Management", "Admin Supervision", "Purchasing"],
    toneDefault: "formal",
    keywords: ["Admin", "Clerical Support", "Office Management", "Data Entry", "Public Relations"],
  },
};

const professionAliases = {
  Bookkeeper: "Accountant",
  "Financial Controller": "Accountant",
  "Treasury Analyst": "Financial Analyst",
  "Wealth Manager": "Relationship Manager",
  "Portfolio Manager": "Relationship Manager",
  "Internal Auditor": "Auditor",
  "Tax Manager": "Tax Consultant",
  "Accounts Payable": "Accountant",
  "Accounts Receivable": "Accountant",
  "Financial Advisor": "Relationship Manager",
  "Assistant Accountant": "Accountant",
  "Forensic Accountant": "Auditor",
  "Fund Administrator": "Financial Analyst",
  "Cost Accountant": "Accountant",
  "Investment Analyst": "Financial Analyst",
  BeanCounter: "Accountant",
  "Web Developer": "Software Engineer",
  "System Administrator": "IT Support",
  "Data Architect": "Data Scientist",
  "Cloud Architect": "DevOps Engineer",
  "QA Engineer": "Software Engineer",
  "Mobile Developer": "Software Engineer",
  "Full Stack Developer": "Software Engineer",
  "IT Manager": "IT Support",
  "Technical Lead": "Software Engineer",
  "Information Security": "Cybersecurity Analyst",
  "AI Engineer": "Data Scientist",
  "BI Developer": "Data Analyst",
  "Network Engineer": "IT Support",
  "App Developer": "Software Engineer",
  "Software Architect": "Software Engineer",
  Coder: "Software Engineer",
  "HR Manager": "HR Executive",
  "Talent Manager": "Recruiter",
  "People Operations": "HR Executive",
  "Culture Officer": "HR Executive",
  "Employee Success": "HR Executive",
  "Personnel Manager": "HR Executive",
  "HR Generalist": "HR Executive",
  "Hiring Manager": "Recruiter",
  "Staffing Specialist": "Recruiter",
  "Technical Recruiter": "Recruiter",
  "Corporate Recruiter": "Recruiter",
  "Benefits Specialist": "Payroll Manager",
  "People Business Partner": "HR Business Partner",
  CHRO: "HR Business Partner",
  "L&D Coordinator": "L&D Specialist",
  "Account Manager": "Sales Executive",
  "Inside Sales": "Sales Executive",
  "Outside Sales": "Sales Executive",
  "Sales Director": "Sales Executive",
  "Channel Manager": "Business Development Manager",
  "Partnership Manager": "Business Development Manager",
  "Leasing Consultant": "Real Estate Agent",
  "Sales Associate": "Sales Executive",
  Telemarketer: "Sales Executive",
  "Key Account Executive": "Sales Executive",
  "Client Success": "Customer Support Executive",
  "Growth Manager": "Business Development Manager",
  "Commercial Manager": "Business Development Manager",
  "Retail Manager": "Retail Store Manager",
  "Area Sales Manager": "Sales Executive",
  "Structural Engineer": "Civil Engineer",
  Architect: "Civil Engineer",
  "Cost Estimator": "Project Manager",
  "Quantity Surveyor": "Project Manager",
  "Planning Engineer": "Site Engineer",
  "MEP Engineer": "Mechanical Engineer",
  "Instrumentation Engineer": "Electrical Engineer",
  "AutoCAD Technician": "Civil Engineer",
  "Design Engineer": "Mechanical Engineer",
  "Building Inspector": "Site Engineer",
  "Safety Officer": "Site Engineer",
  "Contract Manager": "Project Manager",
  Draftsman: "Civil Engineer",
  "Field Engineer": "Site Engineer",
  "Facilities Engineer": "Mechanical Engineer",
  "General Practitioner": "Doctor",
  "Medical Officer": "Doctor",
  "Clinical Nurse": "Nurse",
  "Chief Medical Officer": "Doctor",
  "Radiology Tech": "Lab Technician",
  Phlebotomist: "Lab Technician",
  "Specialist Physician": "Doctor",
  "Clinical Coordinator": "Nurse",
  "Health Administrator": "Medical Representative",
  Dietitian: "Nurse",
  Physiotherapist: "Nurse",
  Paramedic: "Nurse",
  "Surgical Tech": "Lab Technician",
  "Healthcare Consultant": "Medical Representative",
  "Resident Doctor": "Doctor",
  Principal: "Teacher",
  Professor: "Teacher",
  Lecturer: "Teacher",
  "Academic Coordinator": "Teacher",
  "Curriculum Developer": "Teacher",
  "School Administrator": "Teacher",
  "Education Consultant": "Corporate Trainer",
  "Special Ed Teacher": "Teacher",
  "Online Tutor": "Teacher",
  "School Counselor": "Teacher",
  Dean: "Teacher",
  Registrar: "Teacher",
  "Head of Department": "Teacher",
  "Substitute Teacher": "Teacher",
  "Faculty Member": "Teacher",
  "Brand Strategist": "Digital Marketer",
  Copywriter: "Content Writer",
  "Art Director": "Graphic Designer",
  "Creative Director": "Graphic Designer",
  "Growth Marketer": "Digital Marketer",
  "E-commerce Manager": "Digital Marketer",
  "PR Specialist": "Social Media Manager",
  "Communications Manager": "Content Writer",
  "Media Planner": "Digital Marketer",
  "UI Designer": "UX Designer",
  "Product Designer": "UX Designer",
  "Motion Designer": "Video Editor",
  "Brand Manager": "Digital Marketer",
  "Influencer Coordinator": "Social Media Manager",
  "Performance Marketer": "Digital Marketer",
  "Warehouse Manager": "Logistics Coordinator",
  "Fleet Manager": "Logistics Coordinator",
  "Inventory Specialist": "Supply Chain Analyst",
  "Procurement Manager": "Supply Chain Analyst",
  Buyer: "Supply Chain Analyst",
  "Sourcing Specialist": "Supply Chain Analyst",
  "Operations Coordinator": "Operations Manager",
  "Fulfillment Manager": "Logistics Coordinator",
  "Shipping Clerk": "Logistics Coordinator",
  "Transportation Manager": "Logistics Coordinator",
  "Production Manager": "Operations Manager",
  "Supply Chain Manager": "Supply Chain Analyst",
  "Distribution Center Manager": "Logistics Coordinator",
  "Material Planner": "Supply Chain Analyst",
  "Export Manager": "Logistics Coordinator",
  President: "CEO",
  "Managing Director": "CEO",
  "General Manager": "COO",
  VP: "COO",
  "Country Manager": "CEO",
  "Regional Director": "COO",
  "Chief Strategy Officer": "CEO",
  "Chief People Officer": "HR Business Partner",
  "Chief Technology Officer": "Software Engineer",
  Founder: "CEO",
  Partner: "CEO",
  "Board Member": "CEO",
  "Head of Operations": "COO",
  "Head of Finance": "CFO",
  "Head of Sales": "Sales Executive",
  Paralegal: "Legal Counsel",
  "Contract Specialist": "Legal Counsel",
  "Legal Assistant": "Legal Counsel",
  "AML Specialist": "Compliance Officer",
  "Regulatory Affairs": "Compliance Officer",
  "Risk Manager": "Compliance Officer",
  "Data Protection Officer": "Compliance Officer",
  "Company Secretary": "Legal Counsel",
  "Ethics Officer": "Compliance Officer",
  "Privacy Officer": "Compliance Officer",
  "Associate Lawyer": "Legal Counsel",
  "General Counsel": "Legal Counsel",
  "Fraud Analyst": "Compliance Officer",
  "Governance Manager": "Compliance Officer",
  "Compliance Manager": "Compliance Officer",
};

const JOB_MARKET_DATA = {
  professions: Object.entries(coverLetterDataBank).map(([profession, data]) => ({
    profession,
    category: profession,
    hookAngle: data.hookAngle,
    reframe: data.reframe,
    bridgeSkills: data.bridgeSkills || [],
    keywords: data.keywords || [],
  })),
  aliases: (() => {
    const byCanonical = {};
    for (const [alias, canonical] of Object.entries(professionAliases)) {
      if (!coverLetterDataBank[canonical]) continue;
      if (!byCanonical[canonical]) byCanonical[canonical] = [];
      byCanonical[canonical].push(alias);
    }
    for (const name of Object.keys(coverLetterDataBank)) {
      if (!byCanonical[name]) byCanonical[name] = [];
      if (!byCanonical[name].includes(name)) byCanonical[name].push(name);
    }
    return byCanonical;
  })(),
};

export function generateCoverLetterFromTemplate(formData, cvData) {
  const {
    jobTitle = "this role",
    companyName = "your organization",
    region = "GCC",
  } = formData;

  const {
    fullName = "Candidate",
    experience = [],
    skills = [],
  } = cvData;

  // ── Profession Matcher ──────────────────────────────────────────────
  const findProfession = (title) => {
    const n = (title || "").toLowerCase().trim();
    const direct = JOB_MARKET_DATA.professions.find(
      (p) => p.profession.toLowerCase() === n
    );
    if (direct) return direct;
    for (const [canonical, aliases] of Object.entries(JOB_MARKET_DATA.aliases)) {
      if (aliases.some((a) => n.includes(a.toLowerCase()))) {
        return JOB_MARKET_DATA.professions.find((p) => p.profession === canonical);
      }
    }
    return JOB_MARKET_DATA.professions[0];
  };

  const prof = findProfession(jobTitle);
  const isIndia = region === "India";

  // ── Impact Extractor (never dumps raw text) ──────────────────────────
  const getImpact = () => {
    if (!experience || experience.length === 0) return null;
    const e0 = experience[0];
    const blob = e0.description
      ? String(e0.description)
      : Array.isArray(e0.points)
      ? e0.points[0] || ""
      : String(e0.points || "");
    const sentence = blob.split(/[.\n]/)[0].trim();
    if (!sentence || sentence.length < 10) return null;
    // Strip task language, surface the impact
    return sentence
      .replace(/^(responsible for|managed|handled|worked on|assisted with|helped with)\s*/i, "")
      .replace(/\b(tasks include|duties were|my role was)\b/gi, "")
      .trim();
  };

  const impact = getImpact();

  // ── Skill Bridge (reads naturally, not a list dump) ──────────────────
  const getSkillBridge = () => {
    const matched = (skills || [])
      .filter((s) =>
        prof.keywords.some((k) => s.toLowerCase().includes(k.toLowerCase()))
      )
      .slice(0, 2);
    const pool = [...new Set([...prof.bridgeSkills.slice(0, 2), ...matched])];
    if (pool.length === 0) return prof.bridgeSkills[0] || "my core expertise";
    if (pool.length === 1) return pool[0];
    return `${pool.slice(0, -1).join(", ")} and ${pool[pool.length - 1]}`;
  };

  const skillBridge = getSkillBridge();

  // ── Region-Aware Letter Assembly ─────────────────────────────────────
  const salutation = isIndia ? "Dear Sir/Madam," : "Dear Hiring Manager,";
  const signOff = isIndia ? "Yours sincerely," : "Warm regards,";

  let para1, para2, para3;

  if (isIndia) {
    // India: respectful, qualification-led, growth-oriented
    para1 = `I am writing to apply for the ${jobTitle} position at ${companyName}. With a focused background in ${prof.bridgeSkills[0].toLowerCase()}, I am confident in my ability to contribute meaningfully to your team from day one.`;

    para2 = impact
      ? `My professional experience has centred on ${skillBridge.toLowerCase()}. Most recently, I was involved in ${impact.charAt(0).toLowerCase() + impact.slice(1)}, an experience that sharpened my ability to deliver results under real organizational constraints.`
      : `My professional experience has centred on ${skillBridge.toLowerCase()}, with a consistent emphasis on accuracy, accountability, and long-term institutional value. I take pride in approaching each role with a mindset geared toward contributing to the organization's broader objectives.`;

    para3 = `${prof.reframe} I am eager to bring this approach to ${companyName} and support your organization's continued growth. I would welcome the opportunity to discuss how my background aligns with your current requirements.`;
  } else {
    // GCC/UAE: direct, performance-led, confident
    para1 = `I am applying for the ${jobTitle} role at ${companyName}. My background in ${prof.bridgeSkills[0].toLowerCase()} positions me to add immediate value to your team in the UAE market.`;

    para2 = impact
      ? `I bring hands-on experience in ${skillBridge.toLowerCase()}. In my previous role, I ${impact.charAt(0).toLowerCase() + impact.slice(1)} — work that directly translates to the performance expectations of this position at ${companyName}.`
      : `I bring hands-on experience in ${skillBridge.toLowerCase()}, with a track record of delivering results in fast-paced, multicultural environments. I understand the standards expected in the UAE's competitive landscape and have consistently aligned my output to meet them.`;

    para3 = `${prof.reframe} I am drawn to ${companyName}'s positioning in the market and am confident my focus on ${prof.keywords[0].toLowerCase()} makes me a strong cultural and technical fit for this team.`;
  }

  const letter = [
    salutation,
    para1,
    para2,
    para3,
    signOff,
    fullName,
  ].join("\n\n");

  return letter
    .replace(/\s{2,}/g, " ")
    .replace(/( ,)/g, ",")
    .trim();
}
