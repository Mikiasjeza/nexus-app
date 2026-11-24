/**
 * Career+ role catalog: common roles and the skills they ask for. "core" are
 * what job listings for the role nearly always require; "plus" make a
 * candidate stronger. Names go through the skills taxonomy's loose matching,
 * so aliases ("JS", "React.js") still count.
 */

export interface CareerRole {
  id: string
  title: string
  summary: string
  core: string[]
  plus: string[]
}

export const CAREER_ROLES: CareerRole[] = [
  {
    id: 'frontend-developer',
    title: 'Frontend Developer',
    summary: 'Builds the parts of websites and apps people see and use.',
    core: ['JavaScript', 'TypeScript', 'React', 'HTML', 'CSS'],
    plus: ['Accessibility', 'Testing', 'Next.js', 'Git', 'UX Design'],
  },
  {
    id: 'backend-developer',
    title: 'Backend Developer',
    summary: 'Builds the servers, APIs and databases behind an app.',
    core: ['Python', 'SQL', 'APIs', 'Node.js', 'Databases'],
    plus: ['Docker', 'Cloud', 'Testing', 'Security', 'Git'],
  },
  {
    id: 'full-stack-developer',
    title: 'Full-Stack Developer',
    summary: 'Works on both the screens and the servers of a product.',
    core: ['JavaScript', 'TypeScript', 'React', 'Node.js', 'SQL'],
    plus: ['APIs', 'Docker', 'Cloud', 'Testing', 'Git'],
  },
  {
    id: 'data-analyst',
    title: 'Data Analyst',
    summary: 'Turns data into answers and reports that guide decisions.',
    core: ['SQL', 'Excel', 'Data Analysis', 'Data Visualization', 'Statistics'],
    plus: ['Python', 'Tableau', 'Power BI', 'Business Writing', 'Communication'],
  },
  {
    id: 'data-scientist',
    title: 'Data Scientist',
    summary: 'Builds models that predict and explain from data.',
    core: ['Python', 'Statistics', 'Machine Learning', 'SQL', 'Data Analysis'],
    plus: ['Deep Learning', 'Data Visualization', 'Cloud', 'Communication'],
  },
  {
    id: 'devops-engineer',
    title: 'DevOps / Cloud Engineer',
    summary: 'Keeps software running reliably and ships it safely.',
    core: ['Cloud', 'Docker', 'Linux', 'CI/CD', 'Kubernetes'],
    plus: ['Python', 'Security', 'Networking', 'Terraform', 'Monitoring'],
  },
  {
    id: 'mobile-developer',
    title: 'Mobile Developer',
    summary: 'Builds apps for iPhone and Android.',
    core: ['Swift', 'Kotlin', 'React Native', 'APIs', 'Mobile Development'],
    plus: ['TypeScript', 'Testing', 'UX Design', 'Git'],
  },
  {
    id: 'qa-engineer',
    title: 'QA / Test Engineer',
    summary: 'Finds bugs before customers do, by hand and with automated tests.',
    core: ['Testing', 'Test Automation', 'JavaScript', 'Python', 'Bug Tracking'],
    plus: ['SQL', 'APIs', 'CI/CD', 'Communication'],
  },
  {
    id: 'ux-designer',
    title: 'UX / Product Designer',
    summary: 'Designs how products look, work and feel.',
    core: ['UX Design', 'UI Design', 'Figma', 'User Research', 'Prototyping'],
    plus: ['UX Writing', 'Accessibility', 'HTML', 'CSS', 'Communication'],
  },
  {
    id: 'product-manager',
    title: 'Product Manager',
    summary: 'Decides what to build next and leads the team to ship it.',
    core: [
      'Product Management',
      'Project Management',
      'Communication',
      'User Research',
      'Data Analysis',
    ],
    plus: ['SQL', 'Business Writing', 'Leadership', 'UX Design'],
  },
  {
    id: 'project-manager',
    title: 'Project Manager',
    summary: 'Plans the work, keeps it on schedule and keeps everyone aligned.',
    core: ['Project Management', 'Communication', 'Leadership', 'Risk Management', 'Agile'],
    plus: ['Business Writing', 'Excel', 'Stakeholder Management'],
  },
  {
    id: 'financial-analyst',
    title: 'Financial Analyst',
    summary: 'Models the numbers behind business decisions.',
    core: ['Financial Analysis', 'Excel', 'Financial Modeling', 'Accounting', 'Data Analysis'],
    plus: ['SQL', 'Business Writing', 'Communication', 'Power BI'],
  },
  {
    id: 'content-writer',
    title: 'Content / UX Writer',
    summary: 'Writes the words in products, websites and documents.',
    core: ['Business Writing', 'UX Writing', 'Communication', 'Editing', 'SEO'],
    plus: ['UX Design', 'User Research', 'Marketing'],
  },
]

export function getRole(id: string): CareerRole | undefined {
  return CAREER_ROLES.find((role) => role.id === id)
}
