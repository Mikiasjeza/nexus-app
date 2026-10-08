'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export interface SkillNode {
  id: string
  label: string
  x: number  // 0–1 normalized within container
  y: number  // 0–1 normalized
  color: string
  score: number
  category: string
  verified?: boolean
}

export interface SkillConnection {
  from: string
  to: string
  strength?: number
}

interface SkillBrainProps {
  nodes: SkillNode[]
  connections: SkillConnection[]
  onNodeClick?: (node: SkillNode) => void
  className?: string
}

// Golden-ratio spaced offsets for deterministic "random"-looking particle positions
function seededOffset(index: number): number {
  return (index * 0.6180339887) % 1
}

export function SkillBrain({ nodes, connections, onNodeClick, className = '' }: SkillBrainProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number>(0)
  const timeRef = useRef(0)
  const particlesRef = useRef(connections.map((_, i) => seededOffset(i)))
  // Keep hovered state in both a ref (for canvas loop) and state (for DOM re-render)
  const hoveredIdRef = useRef<string | null>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [activeNode, setActiveNode] = useState<SkillNode | null>(null)

  const setHovered = useCallback((id: string | null) => {
    hoveredIdRef.current = id
    setHoveredId(id)
  }, [])

  const getConnectedIds = useCallback((id: string) => {
    const ids = new Set<string>()
    connections.forEach(c => {
      if (c.from === id) ids.add(c.to)
      if (c.to === id) ids.add(c.from)
    })
    return ids
  }, [connections])

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let dpr = window.devicePixelRatio || 1

    function resize() {
      if (!canvas || !container) return
      dpr = window.devicePixelRatio || 1
      const W = container.offsetWidth
      const H = container.offsetHeight
      canvas.width = W * dpr
      canvas.height = H * dpr
      canvas.style.width = W + 'px'
      canvas.style.height = H + 'px'
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)

    // Hex grid drawing
    function drawHexGrid(W: number, H: number) {
      const size = 44
      const hexH = size * Math.sqrt(3)
      ctx!.strokeStyle = 'rgba(0,212,255,0.035)'
      ctx!.lineWidth = 0.5
      for (let col = -1; col < W / (size * 1.5) + 2; col++) {
        for (let row = -1; row < H / hexH + 2; row++) {
          const cx = col * size * 1.5
          const cy = row * hexH + (col % 2 === 0 ? 0 : hexH / 2)
          ctx!.beginPath()
          for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i - Math.PI / 6
            const px = cx + size * Math.cos(angle)
            const py = cy + size * Math.sin(angle)
            i === 0 ? ctx!.moveTo(px, py) : ctx!.lineTo(px, py)
          }
          ctx!.closePath()
          ctx!.stroke()
        }
      }
    }

    function loop() {
      if (!canvas || !container || !ctx) return
      const W = container.offsetWidth
      const H = container.offsetHeight
      timeRef.current += 0.008
      const t = timeRef.current

      ctx.clearRect(0, 0, W, H)

      // Background hex grid
      drawHexGrid(W, H)

      // Draw connections
      connections.forEach((conn, ci) => {
        const from = nodes.find(n => n.id === conn.from)
        const to = nodes.find(n => n.id === conn.to)
        if (!from || !to) return

        const x1 = from.x * W
        const y1 = from.y * H
        const x2 = to.x * W
        const y2 = to.y * H

        const isHighlighted =
          hoveredIdRef.current === from.id || hoveredIdRef.current === to.id

        const strength = conn.strength ?? 0.5
        const pulse = 0.5 + 0.5 * Math.sin(t * 1.2 + ci * 0.8)
        const alpha = isHighlighted ? 0.55 + 0.25 * pulse : 0.1 + 0.06 * pulse * strength

        const grad = ctx.createLinearGradient(x1, y1, x2, y2)
        grad.addColorStop(0, `${from.color}${Math.round(alpha * 255).toString(16).padStart(2, '0')}`)
        grad.addColorStop(1, `${to.color}${Math.round(alpha * 255).toString(16).padStart(2, '0')}`)
        ctx.strokeStyle = grad
        ctx.lineWidth = isHighlighted ? 1.5 : 0.8

        ctx.beginPath()
        ctx.moveTo(x1, y1)
        ctx.lineTo(x2, y2)
        ctx.stroke()

        // Particle along line
        const particleT = (particlesRef.current[ci] + t * (0.018 + strength * 0.012)) % 1
        const px = x1 + (x2 - x1) * particleT
        const py = y1 + (y2 - y1) * particleT
        const pAlpha = isHighlighted ? 0.9 : 0.35

        ctx.beginPath()
        ctx.arc(px, py, isHighlighted ? 2.5 : 1.5, 0, Math.PI * 2)
        ctx.fillStyle = from.color + Math.round(pAlpha * 255).toString(16).padStart(2, '0')
        ctx.fill()
      })

      // Draw node glow halos on canvas (large blurry circles behind DOM nodes)
      nodes.forEach(node => {
        const x = node.x * W
        const y = node.y * H
        const isHovered = hoveredIdRef.current === node.id
        const pulse = 0.5 + 0.5 * Math.sin(t * 1.8 + node.x * 8 + node.y * 6)
        const glowR = isHovered ? 32 + 8 * pulse : 18 + 5 * pulse
        const glowAlpha = isHovered ? 0.22 + 0.12 * pulse : 0.08 + 0.04 * pulse

        const glow = ctx.createRadialGradient(x, y, 0, x, y, glowR)
        glow.addColorStop(0, node.color + Math.round(glowAlpha * 255).toString(16).padStart(2, '0'))
        glow.addColorStop(1, node.color + '00')
        ctx.fillStyle = glow
        ctx.beginPath()
        ctx.arc(x, y, glowR, 0, Math.PI * 2)
        ctx.fill()
      })

      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('resize', resize)
    }
  // hoveredId intentionally excluded — read via ref to avoid restarting the loop
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, connections])

  const connectedToHovered = hoveredId ? getConnectedIds(hoveredId) : new Set<string>()

  return (
    <div ref={containerRef} className={`relative select-none ${className}`}>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        aria-hidden
      />

      {/* Interactive node buttons */}
      {nodes.map(node => {
        const isHovered = hoveredId === node.id
        const isConnected = connectedToHovered.has(node.id)
        const isDimmed = hoveredId !== null && !isHovered && !isConnected
        const nodeSize = Math.max(8, Math.round(node.score / 12))

        return (
          <button
            key={node.id}
            type="button"
            className="absolute z-10 -translate-x-1/2 -translate-y-1/2 group focus:outline-none"
            style={{ left: `${node.x * 100}%`, top: `${node.y * 100}%` }}
            onMouseEnter={() => setHovered(node.id)}
            onMouseLeave={() => setHovered(null)}
            onClick={() => {
              setActiveNode(activeNode?.id === node.id ? null : node)
              onNodeClick?.(node)
            }}
            aria-label={`${node.label} — ${node.score}% proficiency`}
          >
            {/* Pulse ring */}
            <motion.div
              className="absolute rounded-full pointer-events-none"
              style={{
                width: nodeSize * 3.5,
                height: nodeSize * 3.5,
                top: '50%',
                left: '50%',
                x: '-50%',
                y: '-50%',
                background: `radial-gradient(circle, ${node.color}30, transparent 70%)`,
              }}
              animate={{ scale: [1, 1.4, 1], opacity: [0.4, 0.8, 0.4] }}
              transition={{
                duration: 2.5 + (node.x * 1.2),
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />

            {/* Core dot */}
            <motion.div
              className="relative rounded-full transition-transform duration-150"
              style={{
                width: nodeSize,
                height: nodeSize,
                background: node.color,
                boxShadow: isHovered
                  ? `0 0 0 2px ${node.color}60, 0 0 16px 4px ${node.color}50, 0 0 32px 8px ${node.color}25`
                  : `0 0 6px 2px ${node.color}40`,
                opacity: isDimmed ? 0.2 : 1,
              }}
              whileHover={{ scale: 1.8 }}
              animate={activeNode?.id === node.id ? { scale: [1, 1.4, 1.2] } : {}}
            >
              {node.verified && (
                <div
                  className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 border border-black"
                  title="Verified"
                />
              )}
            </motion.div>

            {/* Label tooltip */}
            <div
              className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 pointer-events-none"
              style={{ opacity: isHovered ? 1 : 0, transition: 'opacity 0.15s' }}
            >
              <div
                className="relative px-2.5 py-1.5 bg-black/90 backdrop-blur-sm whitespace-nowrap"
                style={{ border: `1px solid ${node.color}40` }}
              >
                <div
                  className="text-[9px] font-mono tracking-[0.2em] uppercase mb-0.5"
                  style={{ color: node.color }}
                >
                  {node.category} · {node.score}%
                </div>
                <div className="text-white text-[11px] font-medium">{node.label}</div>
                {/* Corner brackets */}
                <div className="absolute top-0 left-0 w-2 h-2 border-t border-l" style={{ borderColor: node.color }} />
                <div className="absolute top-0 right-0 w-2 h-2 border-t border-r" style={{ borderColor: node.color }} />
                <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l" style={{ borderColor: node.color }} />
                <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r" style={{ borderColor: node.color }} />
              </div>
            </div>
          </button>
        )
      })}

      {/* Active node detail panel */}
      <AnimatePresence>
        {activeNode && (
          <motion.div
            key={activeNode.id}
            className="absolute top-4 right-4 z-20 w-48"
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 16 }}
            transition={{ duration: 0.2 }}
          >
            <div
              className="bg-black/90 backdrop-blur-xl p-4 relative"
              style={{ border: `1px solid ${activeNode.color}40` }}
            >
              {/* HUD corners */}
              <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2" style={{ borderColor: activeNode.color }} />
              <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2" style={{ borderColor: activeNode.color }} />
              <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2" style={{ borderColor: activeNode.color }} />
              <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2" style={{ borderColor: activeNode.color }} />

              <div className="text-[9px] font-mono tracking-[0.2em] uppercase mb-2" style={{ color: activeNode.color }}>
                SKILL SIGNAL
              </div>
              <div className="text-white font-semibold text-sm mb-3">{activeNode.label}</div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-[10px]">
                  <span className="text-white/40 font-mono">PILLAR</span>
                  <span className="text-white/80">{activeNode.category}</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-white/40 font-mono">SCORE</span>
                  <span style={{ color: activeNode.color }}>{activeNode.score}%</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-white/40 font-mono">STATUS</span>
                  <span className={activeNode.verified ? 'text-emerald-400' : 'text-white/50'}>
                    {activeNode.verified ? 'VERIFIED' : 'UNVERIFIED'}
                  </span>
                </div>
              </div>

              {/* Score bar */}
              <div className="mt-3 h-0.5 bg-white/10 overflow-hidden">
                <motion.div
                  className="h-full"
                  style={{ background: activeNode.color }}
                  initial={{ width: 0 }}
                  animate={{ width: `${activeNode.score}%` }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                />
              </div>

              <button
                type="button"
                onClick={() => setActiveNode(null)}
                className="mt-3 text-[9px] font-mono tracking-widest text-white/30 hover:text-white/60 transition-colors"
              >
                [CLOSE]
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Demo data for homepage (no real user skills needed)
export const DEMO_SKILL_NODES: SkillNode[] = [
  { id: 'ts',        label: 'TypeScript',      x: 0.50, y: 0.35, color: '#06b6d4', score: 91, category: 'build',   verified: true  },
  { id: 'react',     label: 'React',           x: 0.60, y: 0.26, color: '#06b6d4', score: 88, category: 'build',   verified: true  },
  { id: 'node',      label: 'Node.js',         x: 0.67, y: 0.42, color: '#06b6d4', score: 84, category: 'build',   verified: false },
  { id: 'aws',       label: 'AWS',             x: 0.75, y: 0.31, color: '#06b6d4', score: 76, category: 'build',   verified: false },
  { id: 'python',    label: 'Python',          x: 0.40, y: 0.25, color: '#06b6d4', score: 79, category: 'build',   verified: true  },
  { id: 'ml',        label: 'ML / AI',         x: 0.28, y: 0.18, color: '#06b6d4', score: 68, category: 'build',   verified: false },
  { id: 'sql',       label: 'SQL',             x: 0.36, y: 0.44, color: '#06b6d4', score: 83, category: 'build',   verified: false },
  { id: 'figma',     label: 'Figma',           x: 0.80, y: 0.52, color: '#7c3aed', score: 88, category: 'create',  verified: true  },
  { id: 'ux',        label: 'UX Design',       x: 0.87, y: 0.40, color: '#7c3aed', score: 85, category: 'create',  verified: false },
  { id: 'brand',     label: 'Branding',        x: 0.86, y: 0.62, color: '#7c3aed', score: 72, category: 'create',  verified: false },
  { id: 'teach',     label: 'Teaching',        x: 0.22, y: 0.36, color: '#10b981', score: 80, category: 'explain', verified: true  },
  { id: 'docs',      label: 'Tech Writing',    x: 0.14, y: 0.50, color: '#10b981', score: 78, category: 'explain', verified: false },
  { id: 'lead',      label: 'Leadership',      x: 0.48, y: 0.64, color: '#d97706', score: 86, category: 'lead',    verified: true  },
  { id: 'agile',     label: 'Agile',           x: 0.61, y: 0.72, color: '#d97706', score: 82, category: 'lead',    verified: false },
  { id: 'pm',        label: 'Product Mgmt',    x: 0.38, y: 0.74, color: '#d97706', score: 79, category: 'lead',    verified: true  },
  { id: 'strategy',  label: 'Strategy',        x: 0.22, y: 0.64, color: '#ec4899', score: 77, category: 'grow',    verified: false },
  { id: 'analytics', label: 'Analytics',       x: 0.32, y: 0.56, color: '#ec4899', score: 81, category: 'grow',    verified: true  },
]

export const DEMO_SKILL_CONNECTIONS: SkillConnection[] = [
  { from: 'ts',      to: 'react',     strength: 0.9 },
  { from: 'ts',      to: 'node',      strength: 0.7 },
  { from: 'react',   to: 'node',      strength: 0.7 },
  { from: 'react',   to: 'ux',        strength: 0.5 },
  { from: 'react',   to: 'figma',     strength: 0.4 },
  { from: 'node',    to: 'aws',       strength: 0.6 },
  { from: 'node',    to: 'figma',     strength: 0.3 },
  { from: 'python',  to: 'ts',        strength: 0.5 },
  { from: 'python',  to: 'ml',        strength: 0.85 },
  { from: 'python',  to: 'sql',       strength: 0.6 },
  { from: 'ml',      to: 'teach',     strength: 0.35 },
  { from: 'sql',     to: 'analytics', strength: 0.8 },
  { from: 'sql',     to: 'ts',        strength: 0.4 },
  { from: 'figma',   to: 'ux',        strength: 0.9 },
  { from: 'figma',   to: 'brand',     strength: 0.7 },
  { from: 'ux',      to: 'brand',     strength: 0.5 },
  { from: 'teach',   to: 'docs',      strength: 0.85 },
  { from: 'teach',   to: 'python',    strength: 0.4 },
  { from: 'teach',   to: 'lead',      strength: 0.6 },
  { from: 'docs',    to: 'strategy',  strength: 0.35 },
  { from: 'lead',    to: 'agile',     strength: 0.8 },
  { from: 'lead',    to: 'pm',        strength: 0.75 },
  { from: 'lead',    to: 'strategy',  strength: 0.5 },
  { from: 'agile',   to: 'pm',        strength: 0.7 },
  { from: 'pm',      to: 'ux',        strength: 0.5 },
  { from: 'strategy',to: 'analytics', strength: 0.7 },
  { from: 'analytics',to:'lead',      strength: 0.4 },
  { from: 'aws',     to: 'analytics', strength: 0.4 },
]
