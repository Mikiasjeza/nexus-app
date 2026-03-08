import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const hash = await bcrypt.hash('demo123', 10)
  const user = await prisma.user.upsert({
    where: { email: 'demo@skillpassport.com' },
    update: {},
    create: {
      email: 'demo@skillpassport.com',
      name: 'Demo User',
      passwordHash: hash,
      bio: 'Building the future of skill verification',
      publicProfile: true,
    },
  })

  const skills = [
    {
      name: 'React Development',
      level: 'advanced',
      category: 'Technical',
      progress: 85,
      notes: 'Built multiple production applications',
      description: 'Expert in React hooks, context, and modern patterns',
      tags: ['frontend', 'javascript', 'ui'],
      verified: true,
      visibility: 'public',
      status: 'published',
    },
    {
      name: 'UI/UX Design',
      level: 'intermediate',
      category: 'Design',
      progress: 65,
      notes: 'Figma and design systems',
      description: 'Creating user-centered designs with modern tools',
      tags: ['design', 'figma', 'ux'],
      verified: false,
      visibility: 'public',
      status: 'published',
    },
    {
      name: 'Project Management',
      level: 'expert',
      category: 'Leadership',
      progress: 95,
      notes: 'Led multiple cross-functional teams',
      description: 'Agile methodologies and team leadership',
      tags: ['leadership', 'agile', 'scrum'],
      verified: true,
      visibility: 'public',
      status: 'published',
    },
  ]

  for (let i = 0; i < skills.length; i++) {
    const s = skills[i]!
    const existing = await prisma.skill.findFirst({
      where: { userId: user.id, name: s.name },
    })
    if (!existing) {
      await prisma.skill.create({
        data: {
          userId: user.id,
          name: s.name,
          level: s.level,
          category: s.category,
          progress: s.progress,
          notes: s.notes,
          description: s.description,
          tags: s.tags,
          verified: s.verified,
          order: i,
          visibility: s.visibility,
          status: s.status,
        },
      })
    }
  }

  console.log('Seeded user:', user.email, 'and', skills.length, 'skills')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
