/**
 * @jest-environment node
 */

import { checkResumeFile, extractResume, resumeText, ResumeError } from '@/lib/career/resume'

jest.mock('@/lib/ai/client', () => ({ aiClient: { completeJson: jest.fn() } }))
const { aiClient } = jest.requireMock('@/lib/ai/client') as {
  aiClient: { completeJson: jest.Mock }
}

const enc = (s: string) => new TextEncoder().encode(s)

describe('resume file checks', () => {
  it('accepts real PDF, Word and text files', () => {
    expect(checkResumeFile('cv.pdf', enc('%PDF-1.7 ...'))).toBe('pdf')
    expect(checkResumeFile('cv.docx', new Uint8Array([0x50, 0x4b, 0x03, 0x04, 1]))).toBe('docx')
    expect(checkResumeFile('cv.txt', enc('Jane Doe\nAnalyst'))).toBe('txt')
  })

  it('rejects files whose contents do not match the extension', () => {
    expect(() => checkResumeFile('cv.pdf', enc('not a pdf'))).toThrow(ResumeError)
    expect(() => checkResumeFile('cv.txt', new Uint8Array([0, 1, 2]))).toThrow(ResumeError)
  })

  it('rejects dangerous or unsupported files and oversize uploads', () => {
    expect(() => checkResumeFile('cv.php.pdf', enc('%PDF-'))).toThrow(ResumeError)
    expect(() => checkResumeFile('cv.exe', enc('MZ'))).toThrow(ResumeError)
    expect(() => checkResumeFile('cv.jpg', enc('x'))).toThrow(ResumeError)
    expect(() => checkResumeFile('cv.txt', new Uint8Array(6 * 1024 * 1024).fill(65))).toThrow(
      /5 MB/
    )
  })

  it('needs enough text to work with', async () => {
    await expect(resumeText(enc('too short'), 'txt')).rejects.toThrow(ResumeError)
    const text = await resumeText(enc('Jane Doe. '.repeat(20)), 'txt')
    expect(text.length).toBeGreaterThan(80)
  })
})

describe('AI extraction', () => {
  it('keeps only valid values and maps unknown ones to safe defaults', async () => {
    aiClient.completeJson.mockResolvedValue({
      text: JSON.stringify({
        education: [
          { level: 'phd', status: 'expected', institution: 'State U', graduationDate: '2027-05' },
        ],
        experience: [
          { employer: 'Acme', title: 'Analyst', employmentType: 'gig', current: true },
          { employer: '', title: 'No employer' },
        ],
        certifications: 'not a list',
        skills: ['SQL', 'SQL', 'Excel'],
        verified: true,
      }),
    })
    const draft = await extractResume('resume text')
    expect(draft.education[0]).toMatchObject({ level: 'other', status: 'completed' })
    expect(draft.experience).toHaveLength(1)
    expect(draft.experience[0].employmentType).toBe('full_time')
    expect(draft.certifications).toEqual([])
    expect(draft.skills).toEqual(['SQL', 'Excel'])
    expect(draft).not.toHaveProperty('verified')
  })

  it('reports AI failures as a friendly error', async () => {
    aiClient.completeJson.mockRejectedValue(new Error('down'))
    await expect(extractResume('x')).rejects.toMatchObject({ status: 502 })
  })
})
