import {
  dedupeKey,
  extractSkills,
  htmlToText,
  inferLevel,
  parseRequirements,
  parseSalary,
} from '@/lib/jobs/enrich'

describe('job requirements parsing', () => {
  it('reads degree, years, certifications and equivalence when stated', () => {
    const r = parseRequirements(
      "Bachelor's degree in Finance or equivalent experience. 3+ years of experience in financial analysis. CPA preferred."
    )
    expect(r.education).toBe('bachelor')
    expect(r.minYears).toBe(3)
    expect(r.certifications).toContain('CPA')
    expect(r.equivalentAccepted).toBe(true)
  })

  it('leaves things unknown when the posting does not say', () => {
    expect(parseRequirements('Join our friendly team and build great products.')).toEqual({
      education: null,
      educationPreferred: false,
      minYears: null,
      certifications: [],
      equivalentAccepted: false,
      workAuthorization: null,
    })
  })

  it('notices when a degree is only preferred', () => {
    expect(parseRequirements("A master's degree is preferred.").educationPreferred).toBe(true)
  })

  it('quotes explicit work authorization wording', () => {
    expect(parseRequirements('You must be a U.S. citizen to apply.').workAuthorization).toMatch(
      /citizen/
    )
  })
})

describe('skills and levels', () => {
  it('finds named skills without matching ordinary words', () => {
    const skills = extractSkills('We use Python and SQL daily. Let us go ahead and grow.')
    expect(skills).toEqual(expect.arrayContaining(['Python', 'SQL']))
    expect(skills).not.toContain('Go')
  })

  it('infers level from the title, then from years', () => {
    expect(inferLevel('Software Engineering Intern', null)).toBe('internship')
    expect(inferLevel('Senior Data Analyst', 1)).toBe('senior')
    expect(inferLevel('Data Analyst', 1)).toBe('entry')
    expect(inferLevel('Data Analyst', null)).toBeNull()
  })
})

describe('helpers', () => {
  it('gives the same key to the same job written differently', () => {
    expect(dedupeKey('Data Analyst', 'Acme, Inc.', 'New York, NY')).toBe(
      dedupeKey('data analyst', 'Acme', 'New York NY')
    )
  })

  it('reads yearly salary ranges', () => {
    expect(parseSalary('$57K - $67K')).toEqual({ min: 57000, max: 67000 })
    expect(parseSalary('$165,000 — $190,000 USD')).toEqual({ min: 165000, max: 190000 })
    expect(parseSalary('competitive')).toEqual({ min: null, max: null })
  })

  it('turns escaped HTML into readable text', () => {
    expect(htmlToText('&lt;p&gt;Hello &amp;mdash; world&lt;/p&gt;')).toBe('Hello — world')
  })
})
