import { describe, expect, it } from 'vitest'

import { getTooltipLayout, padRect } from '../src/layout'

describe('tour overlay layout', () => {
  const screen = { width: 390, height: 844 }

  it('pads a target without allowing its spotlight outside the screen', () => {
    expect(padRect({ x: 2, y: 3, width: 40, height: 20 }, screen, 6)).toEqual({
      x: 0,
      y: 0,
      width: 48,
      height: 29,
    })
  })

  it('places a top tooltip below a target when the safe area has insufficient room', () => {
    expect(getTooltipLayout({ x: 100, y: 80, width: 80, height: 40 }, 'top', screen).top).toBe(132)
  })

  it('centres an untargeted tour card inside its safe bounds', () => {
    const layout = getTooltipLayout(null, 'center', screen)

    expect(layout.left).toBeGreaterThanOrEqual(14)
    expect(layout.top).toBeGreaterThanOrEqual(64)
    expect(layout.width).toBeLessThanOrEqual(362)
  })
})
