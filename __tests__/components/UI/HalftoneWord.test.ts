import { hwfFitSize, hwfHex, hwfRadius, hwfStep, hwfWarmth } from '@/components/UI/HalftoneWord'

describe('halftone footer helpers', () => {
  it('parses short and long hex, and rejects anything else', () => {
    expect(hwfHex('#e9762b')).toEqual([233, 118, 43])
    expect(hwfHex('fff')).toEqual([255, 255, 255])
    expect(hwfHex('rgb(0,0,0)')).toBeNull()
  })

  it('sizes dots by area and clamps coverage', () => {
    expect(hwfRadius(0, 6)).toBe(0)
    expect(hwfRadius(1, 6)).toBeCloseTo(3.36)
    expect(hwfRadius(0.25, 6)).toBeCloseTo(hwfRadius(1, 6) / 2)
    expect(hwfRadius(2, 6)).toBe(hwfRadius(1, 6))
  })

  it('pushes a dot away from the pointer and lets it settle home', () => {
    let [x, y, vx, vy] = hwfStep(10, 10, 0, 0, 10, 10, 5, 10, 20)
    expect(x).toBeGreaterThan(10)
    for (let i = 0; i < 400; i++) {
      ;[x, y, vx, vy] = hwfStep(x, y, vx, vy, 10, 10, -1e5, -1e5, 20)
    }
    expect(Math.abs(x - 10) + Math.abs(y - 10)).toBeLessThan(0.01)
    expect(Math.abs(vx) + Math.abs(vy)).toBeLessThan(0.01)
  })

  it('warms with distance from home, capped at 1', () => {
    expect(hwfWarmth(0, 0, 0, 0, 28)).toBe(0)
    expect(hwfWarmth(14, 0, 0, 0, 28)).toBeCloseTo(0.5)
    expect(hwfWarmth(100, 0, 0, 0, 28)).toBe(1)
  })

  it('scales the font so the word fills the width', () => {
    expect(hwfFitSize(400, 1200)).toBe(300)
    expect(hwfFitSize(0, 1200)).toBe(0)
  })
})
