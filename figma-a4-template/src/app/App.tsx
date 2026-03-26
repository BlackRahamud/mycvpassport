import { ResumePage } from './components/ResumePage';
import { Sidebar } from './components/Sidebar';
import { ContentArea } from './components/ContentArea';
import { ContentAreaPage2 } from './components/ContentAreaPage2';
import { SidebarSection } from './components/SidebarSection';
import { ContactItem } from './components/ContactItem';
import { SkillBar } from './components/SkillBar';
import { SectionHeader } from './components/SectionHeader';
import { ExperienceItem } from './components/ExperienceItem';
import { EducationItem } from './components/EducationItem';
import { PrintButton } from './components/PrintButton';

export default function App() {
  return (
    <>
      <PrintButton />
      <div className="flex flex-col items-center justify-start min-h-screen bg-gray-100 p-8 gap-8">
        {/* Page 1 */}
        <ResumePage>
          <Sidebar>
            {/* Profile Image Placeholder */}
            <div 
              className="w-full bg-slate-600 rounded-full flex items-center justify-center"
              style={{ 
                width: '120px', 
                height: '120px',
                alignSelf: 'center'
              }}
            >
              <span className="text-4xl">👤</span>
            </div>

            {/* Contact Section */}
            <SidebarSection title="Contact">
              <ContactItem icon="📧" text="john.doe@email.com" />
              <ContactItem icon="📱" text="+1 (555) 123-4567" />
              <ContactItem icon="📍" text="New York, NY" />
              <ContactItem icon="🔗" text="linkedin.com/in/johndoe" />
            </SidebarSection>

            {/* Skills Section */}
            <SidebarSection title="Skills">
              <SkillBar skill="JavaScript" level={5} />
              <SkillBar skill="React" level={5} />
              <SkillBar skill="TypeScript" level={4} />
              <SkillBar skill="Node.js" level={4} />
              <SkillBar skill="Python" level={3} />
            </SidebarSection>

            {/* Languages Section */}
            <SidebarSection title="Languages">
              <div className="flex flex-col gap-2 w-full">
                <p className="text-xs w-full">English - Native</p>
                <p className="text-xs w-full">Spanish - Fluent</p>
                <p className="text-xs w-full">French - Intermediate</p>
              </div>
            </SidebarSection>
          </Sidebar>

          <ContentArea>
            {/* Header */}
            <div className="flex flex-col gap-2 w-full mb-6">
              <h1 
                className="font-bold text-slate-800 w-full"
                style={{ 
                  fontSize: '32px',
                  width: '100%'
                }}
              >
                JOHN DOE
              </h1>
              <p 
                className="text-lg text-slate-600 w-full"
                style={{ width: '100%' }}
              >
                Senior Full Stack Developer
              </p>
            </div>

            {/* Professional Summary */}
            <div className="flex flex-col gap-3 w-full mb-6">
              <SectionHeader title="Professional Summary" />
              <p 
                className="text-sm text-slate-700 w-full leading-relaxed"
                style={{ 
                  width: '100%',
                  wordBreak: 'break-word'
                }}
              >
                Innovative Full Stack Developer with 8+ years of experience building scalable web applications. 
                Expert in React, Node.js, and cloud technologies. Proven track record of leading development 
                teams and delivering high-quality solutions that drive business growth.
              </p>
            </div>

            {/* Work Experience */}
            <div className="flex flex-col gap-0 w-full">
              <SectionHeader title="Work Experience" />
              
              <ExperienceItem
                title="Senior Full Stack Developer"
                company="Tech Solutions Inc."
                period="2021 - Present"
                description={[
                  "Led development of enterprise-level SaaS platform serving 10,000+ users",
                  "Architected and implemented microservices infrastructure using Node.js and Docker",
                  "Reduced application load time by 60% through performance optimization"
                ]}
              />

              <ExperienceItem
                title="Full Stack Developer"
                company="Digital Innovations LLC"
                period="2018 - 2021"
                description={[
                  "Built responsive web applications using React and TypeScript",
                  "Developed RESTful APIs and integrated third-party services",
                  "Collaborated with UX designers to implement pixel-perfect interfaces"
                ]}
              />
            </div>
          </ContentArea>
        </ResumePage>

        {/* Page 2 */}
        <ResumePage>
          <Sidebar>
            {/* Certifications Section */}
            <SidebarSection title="Certifications">
              <div className="flex flex-col gap-2 w-full">
                <p className="text-xs w-full">AWS Certified Developer</p>
                <p className="text-xs w-full">Google Cloud Professional</p>
                <p className="text-xs w-full">React Specialist</p>
              </div>
            </SidebarSection>

            {/* Interests Section */}
            <SidebarSection title="Interests">
              <div className="flex flex-col gap-2 w-full">
                <p className="text-xs w-full">Open Source Contribution</p>
                <p className="text-xs w-full">Tech Blogging</p>
                <p className="text-xs w-full">Hiking & Photography</p>
              </div>
            </SidebarSection>

            {/* References Section */}
            <SidebarSection title="References">
              <p className="text-xs w-full">Available upon request</p>
            </SidebarSection>
          </Sidebar>

          <ContentAreaPage2>
            {/* Continued Work Experience */}
            <div className="flex flex-col gap-0 w-full mb-6">
              <SectionHeader title="Work Experience (cont.)" />
              
              <ExperienceItem
                title="Junior Developer"
                company="StartUp Ventures"
                period="2016 - 2018"
                description={[
                  "Developed features for customer-facing web application",
                  "Participated in Agile ceremonies and sprint planning",
                  "Maintained code quality through unit testing and code reviews"
                ]}
              />
            </div>

            {/* Education */}
            <div className="flex flex-col gap-0 w-full mb-6">
              <SectionHeader title="Education" />
              
              <EducationItem
                degree="Bachelor of Science in Computer Science"
                institution="State University"
                period="2012 - 2016"
                details="GPA: 3.8/4.0, Dean's List, Computer Science Club President"
              />
            </div>

            {/* Projects */}
            <div className="flex flex-col gap-0 w-full mb-6">
              <SectionHeader title="Notable Projects" />
              
              <div className="flex flex-col gap-4 w-full">
                <div className="flex flex-col gap-1 w-full">
                  <h3 
                    className="font-semibold text-base text-slate-800 w-full"
                    style={{ width: '100%' }}
                  >
                    E-Commerce Platform
                  </h3>
                  <p 
                    className="text-sm text-slate-700 w-full"
                    style={{ 
                      width: '100%',
                      wordBreak: 'break-word'
                    }}
                  >
                    Built a full-featured e-commerce platform with payment integration, inventory management, 
                    and real-time analytics. Technologies: React, Node.js, PostgreSQL, Stripe API.
                  </p>
                </div>

                <div className="flex flex-col gap-1 w-full">
                  <h3 
                    className="font-semibold text-base text-slate-800 w-full"
                    style={{ width: '100%' }}
                  >
                    Real-Time Collaboration Tool
                  </h3>
                  <p 
                    className="text-sm text-slate-700 w-full"
                    style={{ 
                      width: '100%',
                      wordBreak: 'break-word'
                    }}
                  >
                    Developed a collaborative document editing platform supporting multiple concurrent users. 
                    Technologies: React, WebSockets, Redis, MongoDB.
                  </p>
                </div>
              </div>
            </div>

            {/* Technical Skills */}
            <div className="flex flex-col gap-0 w-full">
              <SectionHeader title="Technical Skills" />
              
              <div className="flex flex-col gap-3 w-full">
                <div className="flex flex-row gap-2 w-full">
                  <p className="text-sm font-semibold text-slate-800 whitespace-nowrap">Frontend:</p>
                  <p 
                    className="text-sm text-slate-700 w-full"
                    style={{ 
                      width: '100%',
                      wordBreak: 'break-word'
                    }}
                  >
                    React, TypeScript, Next.js, Tailwind CSS, Redux, Vue.js
                  </p>
                </div>
                
                <div className="flex flex-row gap-2 w-full">
                  <p className="text-sm font-semibold text-slate-800 whitespace-nowrap">Backend:</p>
                  <p 
                    className="text-sm text-slate-700 w-full"
                    style={{ 
                      width: '100%',
                      wordBreak: 'break-word'
                    }}
                  >
                    Node.js, Express, Python, Django, RESTful APIs, GraphQL
                  </p>
                </div>
                
                <div className="flex flex-row gap-2 w-full">
                  <p className="text-sm font-semibold text-slate-800 whitespace-nowrap">Database:</p>
                  <p 
                    className="text-sm text-slate-700 w-full"
                    style={{ 
                      width: '100%',
                      wordBreak: 'break-word'
                    }}
                  >
                    PostgreSQL, MongoDB, Redis, MySQL
                  </p>
                </div>
                
                <div className="flex flex-row gap-2 w-full">
                  <p className="text-sm font-semibold text-slate-800 whitespace-nowrap">DevOps:</p>
                  <p 
                    className="text-sm text-slate-700 w-full"
                    style={{ 
                      width: '100%',
                      wordBreak: 'break-word'
                    }}
                  >
                    Docker, AWS, CI/CD, GitHub Actions, Kubernetes
                  </p>
                </div>
              </div>
            </div>
          </ContentAreaPage2>
        </ResumePage>
      </div>
    </>
  );
}