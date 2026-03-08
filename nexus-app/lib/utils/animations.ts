// MetaLab-inspired premium easing curves
// Primary easing: cubic-bezier(0.22, 1, 0.36, 1) - glides, never snaps
export const easing = {
  // Primary: MetaLab standard - smooth, gliding motion
  primary: [0.22, 1, 0.36, 1] as [number, number, number, number],
  // Smooth: For general transitions
  smooth: [0.16, 1, 0.3, 1] as [number, number, number, number],
  // Gentle: For subtle reveals
  gentle: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number],
  // Out: For exits
  smoothOut: [0.4, 0, 0.2, 1] as [number, number, number, number],
  // Elastic: For spring-like effects (use sparingly)
  elastic: [0.175, 0.885, 0.32, 1.275] as [number, number, number, number],
}

// Animation durations (300-600ms for scroll animations)
export const durations = {
  fast: 0.3,
  normal: 0.4,
  slow: 0.6,
  slower: 0.8,
}

// Basic animations
export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.6, ease: easing.smooth },
}

export const slideUp = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 30 },
  transition: { duration: 0.8, ease: easing.smooth },
}

export const slideDown = {
  initial: { opacity: 0, y: -30 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -30 },
  transition: { duration: 0.8, ease: easing.smooth },
}

export const scaleIn = {
  initial: { opacity: 0, scale: 0.9 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.9 },
  transition: { duration: 0.6, ease: easing.elastic },
}

// Progressive reveal - for living records
export const progressiveReveal = {
  initial: { opacity: 0, y: 40, scale: 0.96 },
  whileInView: { opacity: 1, y: 0, scale: 1 },
  viewport: { once: true, margin: '-100px' },
  transition: { duration: 0.8, ease: easing.gentle },
}

// Scroll-triggered animations (300-600ms, scrubbed to scroll)
// All use cubic-bezier(0.22, 1, 0.36, 1) for consistent gliding motion
export const scrollReveal = {
  initial: { opacity: 0, y: 40, scale: 0.98 },
  whileInView: { opacity: 1, y: 0, scale: 1 },
  viewport: { once: true, margin: '-50px' },
  transition: { duration: 0.5, ease: easing.primary },
}

// Section fade-in with upward translation (20-40px)
export const sectionReveal = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-50px' },
  transition: { duration: 0.5, ease: easing.primary },
}

// Card dock animation - feels like docking into place
export const cardDock = {
  initial: { opacity: 0, y: 40, rotate: 0.5 },
  whileInView: { opacity: 1, y: 0, rotate: 0 },
  viewport: { once: true, margin: '-50px' },
  transition: { duration: 0.5, ease: easing.primary },
}

// Line draw animation - for dividers and lines
export const lineDraw = {
  initial: { scaleX: 0 },
  whileInView: { scaleX: 1 },
  viewport: { once: true, margin: '-50px' },
  transition: { duration: 0.6, ease: easing.primary },
}

// Stagger animations for skill cards assembling
export const staggerContainer = {
  initial: 'hidden',
  whileInView: 'visible',
  viewport: { once: true, margin: '-50px' },
  variants: {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.06,
        delayChildren: 0.1,
      },
    },
  },
}

export const staggerItem = {
  hidden: { opacity: 0, y: 30, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.5,
      ease: easing.primary,
    },
  },
}

// Parallax depth (2-5% max movement)
// Foreground moves slightly faster than background
export const parallaxSlow = {
  y: [0, -20],
  transition: { duration: 0.6, ease: easing.primary },
}

export const parallaxMedium = {
  y: [0, -40],
  transition: { duration: 0.6, ease: easing.primary },
}

// Hover animations - subtle, meaningful motion
export const hoverLift = {
  whileHover: { y: -4, scale: 1.01 },
  whileTap: { y: -2, scale: 0.99 },
  transition: { duration: 0.3, ease: easing.primary },
}

// Micro-interaction for nav items (1-2px drift)
export const navHover = {
  whileHover: { y: -1 },
  transition: { duration: 0.2, ease: easing.primary },
}

export const hoverMicroParallax = {
  whileHover: { 
    y: -6, 
    scale: 1.01,
    rotateY: 2,
    rotateX: -1,
    transition: { duration: 0.3, ease: easing.smooth }
  },
}

export const hoverGlow = {
  whileHover: {
    scale: 1.02,
  },
  transition: { duration: 0.3, ease: easing.smooth },
}

// Progress pulse - for skill indicators
export const progressPulse = {
  animate: {
    scale: [1, 1.02, 1],
    opacity: [0.9, 1, 0.9],
  },
  transition: {
    duration: 0.6,
    repeat: Infinity,
    ease: 'easeInOut',
  },
}

// Timeline animations - for growth visualization
export const timelineFadeIn = {
  initial: { opacity: 0, x: -20 },
  whileInView: { opacity: 1, x: 0 },
  viewport: { once: true },
  transition: { duration: 0.6, ease: easing.gentle },
}

// Living skill card animations
// Skills should feel alive - breathing, pulsing when recently updated
export const skillBreathe = {
  animate: {
    scale: [1, 1.005, 1],
  },
  transition: {
    duration: 3,
    repeat: Infinity,
    ease: 'easeInOut',
  },
}

// Growth state animation - when skill level changes (smooth, no jumps)
export const skillGrowth = {
  initial: { scale: 0.98, opacity: 0.8 },
  animate: { scale: 1, opacity: 1 },
  transition: { duration: 0.5, ease: easing.primary },
}

// Skill level change animation - smooth transition
export const skillLevelChange = {
  initial: { scale: 0.95, y: 5, opacity: 0.7 },
  animate: { scale: 1, y: 0, opacity: 1 },
  transition: { duration: 0.6, ease: easing.primary },
}

// Progress update animation - subtle pulse
export const skillProgressUpdate = {
  animate: {
    scale: [1, 1.02, 1],
  },
  transition: {
    duration: 0.4,
    ease: easing.primary,
  },
}

// Passport metaphor - page slide (slight horizontal movement)
export const passportSlide = {
  initial: { opacity: 0, x: -20 },
  whileInView: { opacity: 1, x: 0 },
  viewport: { once: true, margin: '-50px' },
  transition: { duration: 0.5, ease: easing.primary },
}

// Memory trail - timeline expanding downward
export const memoryTrail = {
  initial: { scaleY: 0, opacity: 0 },
  whileInView: { scaleY: 1, opacity: 1 },
  viewport: { once: true, margin: '-50px' },
  transition: { duration: 0.6, ease: easing.primary },
}
