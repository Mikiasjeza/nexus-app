'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Briefcase, 
  MapPin, 
  DollarSign, 
  Clock, 
  Filter, 
  Search,
  Building2,
  Calendar,
  ExternalLink
} from 'lucide-react'
import Button from '@/components/UI/Button'
import Badge from '@/components/UI/Badge'
import AnimatedCard from '@/components/UI/AnimatedCard'
import { useSkills } from '@/lib/hooks/useSkills'
import { easing } from '@/lib/utils/animations'

interface JobListing {
  id: string
  title: string
  company: string
  location: string
  salary: string
  type: 'full-time' | 'part-time' | 'contract' | 'internship'
  match: number
  skills: string[]
  posted: string
  logo?: string
}

const mockJobs: JobListing[] = [
  {
    id: '1',
    title: 'Senior Full Stack Engineer',
    company: 'Tech Innovations Inc.',
    location: 'San Francisco, CA (Remote)',
    salary: '$150k - $200k',
    type: 'full-time',
    match: 95,
    skills: ['React', 'TypeScript', 'Node.js', 'AWS'],
    posted: '2 days ago',
  },
  {
    id: '2',
    title: 'AI/ML Engineer',
    company: 'Data Dynamics',
    location: 'New York, NY',
    salary: '$180k - $220k',
    type: 'full-time',
    match: 88,
    skills: ['Python', 'TensorFlow', 'Machine Learning', 'Deep Learning'],
    posted: '1 week ago',
  },
  {
    id: '3',
    title: 'UX Designer',
    company: 'Creative Studio',
    location: 'Austin, TX (Hybrid)',
    salary: '$120k - $150k',
    type: 'full-time',
    match: 75,
    skills: ['Figma', 'UI/UX Design', 'Prototyping', 'User Research'],
    posted: '3 days ago',
  },
]

export default function MarketplacePage() {
  const { skills } = useSkills()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedType, setSelectedType] = useState<string>('all')
  const [showFilters, setShowFilters] = useState(false)

  const userSkills = skills.map(s => s.name)
  const matchedJobs = mockJobs.map(job => ({
    ...job,
    match: Math.round(
      (job.skills.filter(skill => userSkills.some(us => us.toLowerCase().includes(skill.toLowerCase()))).length / 
       Math.max(job.skills.length, userSkills.length)) * 100
    ),
  }))

  const filteredJobs = matchedJobs.filter(job => {
    if (searchQuery && !job.title.toLowerCase().includes(searchQuery.toLowerCase()) && 
        !job.company.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false
    }
    if (selectedType !== 'all' && job.type !== selectedType) {
      return false
    }
    return true
  }).sort((a, b) => b.match - a.match)

  return (
    <div className="min-h-screen bg-white dark:bg-black py-16">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.8, ease: easing.primary }}
          className="mb-12"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-5xl md:text-6xl font-bold text-black dark:text-white mb-2 tracking-tight">
                Career Marketplace
              </h1>
              <p className="text-lg text-black/60 dark:text-white/60">
                Discover opportunities matched to your verified skills
              </p>
            </div>
            <Badge variant="primary" size="lg">
              {matchedJobs.length} Matched Jobs
            </Badge>
          </div>

          {/* Search and Filters */}
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-black/40 dark:text-white/40" />
              <input
                type="text"
                placeholder="Search jobs..."
                value={searchQuery}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-black/10 dark:border-white/10 bg-white dark:bg-black text-black dark:text-white placeholder:text-black/40 dark:placeholder:text-white/40 focus:outline-none focus:border-black dark:focus:border-white transition-colors"
              />
            </div>

            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                leftIcon={<Filter className="w-4 h-4" />}
                onClick={() => setShowFilters(!showFilters)}
              >
                Filters
              </Button>
              <div className="flex gap-2">
                {['all', 'full-time', 'part-time', 'contract', 'internship'].map((type) => (
                  <button
                    key={type}
                    onClick={() => setSelectedType(type)}
                    className={`px-4 py-2 text-sm font-medium transition-opacity ${
                      selectedType === type
                        ? 'bg-black dark:bg-white text-white dark:text-black opacity-100'
                        : 'border border-black/10 dark:border-white/10 text-black/60 dark:text-white/60 hover:opacity-100 opacity-60'
                    }`}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1).replace('-', ' ')}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Job Listings */}
        <div className="space-y-6">
          <AnimatePresence>
            {filteredJobs.map((job, index) => (
              <motion.div
                key={job.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5, delay: index * 0.05 }}
              >
                <div className="border border-black/10 dark:border-white/10 p-6">
                  <div className="flex flex-col md:flex-row gap-6">
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-2xl font-bold text-black dark:text-white mb-2">{job.title}</h3>
                          <div className="flex items-center gap-4 text-black/60 dark:text-white/60 mb-3">
                            <div className="flex items-center gap-1">
                              <Building2 className="w-4 h-4" />
                              <span>{job.company}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <MapPin className="w-4 h-4" />
                              <span>{job.location}</span>
                            </div>
                          </div>
                        </div>
                        <Badge 
                          variant={job.match >= 90 ? 'primary' : 'default'} 
                          size="lg"
                        >
                          {job.match}% Match
                        </Badge>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 mb-4">
                        <div className="flex items-center gap-2 text-black/60 dark:text-white/60">
                          <DollarSign className="w-4 h-4" />
                          <span className="font-medium">{job.salary}</span>
                        </div>
                        <Badge variant="default" size="sm">
                          {job.type.replace('-', ' ')}
                        </Badge>
                        <div className="flex items-center gap-2 text-black/60 dark:text-white/60">
                          <Calendar className="w-4 h-4" />
                          <span>{job.posted}</span>
                        </div>
                      </div>

                      <div className="mb-4">
                        <p className="text-sm font-medium text-black dark:text-white mb-2">Required Skills:</p>
                        <div className="flex flex-wrap gap-2">
                          {job.skills.map((skill, idx) => (
                            <Badge
                              key={idx}
                              variant={userSkills.some(us => us.toLowerCase().includes(skill.toLowerCase())) ? 'primary' : 'default'}
                              size="sm"
                            >
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col justify-between gap-4">
                      <div className="space-y-2">
                        <Button
                          variant="primary"
                          rightIcon={<ExternalLink className="w-4 h-4" />}
                          fullWidth
                        >
                          Apply Now
                        </Button>
                        <Button variant="outline" fullWidth>
                          Save Job
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {filteredJobs.length === 0 && (
            <div className="border border-black/10 dark:border-white/10 p-12 text-center">
              <Briefcase className="w-16 h-16 mx-auto mb-4 text-black/40 dark:text-white/40" />
              <h3 className="text-xl font-medium text-black dark:text-white mb-2">No jobs found</h3>
              <p className="text-black/60 dark:text-white/60">
                Try adjusting your search or filters
              </p>
            </div>
          )}
        </div>

        {/* Stats Section */}
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-100px' }}
                transition={{ duration: 0.8, ease: easing.primary }}
          className="mt-16"
        >
          <div className="border border-black/10 dark:border-white/10 p-8">
            <div className="grid md:grid-cols-3 gap-8 text-center">
              <div>
                <div className="text-4xl font-bold text-black dark:text-white mb-2">10K+</div>
                <div className="text-black/60 dark:text-white/60">Active Jobs</div>
              </div>
              <div>
                <div className="text-4xl font-bold text-black dark:text-white mb-2">5K+</div>
                <div className="text-black/60 dark:text-white/60">Companies</div>
              </div>
              <div>
                <div className="text-4xl font-bold text-black dark:text-white mb-2">95%</div>
                <div className="text-black/60 dark:text-white/60">Match Accuracy</div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
