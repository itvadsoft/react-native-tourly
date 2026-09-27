import type { TourPlacement, TourRect } from './types'

export type TourScreen = { width: number; height: number }

const CARD_WIDTH = 320
const HORIZONTAL_MARGIN = 14
const SAFE_TOP = 64
const CARD_HEIGHT = 220
const MIN_SPACE_ABOVE = 240

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value))
}

export function padRect(rect: TourRect, screen: TourScreen, padding: number): TourRect {
  const x = clamp(rect.x - padding, 0, screen.width)
  const y = clamp(rect.y - padding, 0, screen.height)
  const right = clamp(rect.x + rect.width + padding, 0, screen.width)
  const bottom = clamp(rect.y + rect.height + padding, 0, screen.height)
  return { x, y, width: Math.max(0, right - x), height: Math.max(0, bottom - y) }
}

export function getTooltipLayout(
  rect: TourRect | null,
  placement: TourPlacement = 'auto',
  screen: TourScreen,
): { left: number; top: number; width: number } {
  const width = Math.min(CARD_WIDTH, screen.width - HORIZONTAL_MARGIN * 2)
  const maxLeft = Math.max(HORIZONTAL_MARGIN, screen.width - width - HORIZONTAL_MARGIN)

  if (!rect || placement === 'center') {
    return {
      left: clamp((screen.width - width) / 2, HORIZONTAL_MARGIN, maxLeft),
      top: clamp(screen.height * 0.34, SAFE_TOP, screen.height - CARD_HEIGHT),
      width,
    }
  }

  const spaceAbove = rect.y
  const spaceBelow = screen.height - (rect.y + rect.height)
  const below =
    placement === 'bottom' ||
    (placement === 'auto' && spaceBelow >= spaceAbove) ||
    (placement === 'top' && spaceAbove < MIN_SPACE_ABOVE)

  return {
    left: clamp(rect.x + rect.width / 2 - width / 2, HORIZONTAL_MARGIN, maxLeft),
    top: clamp(below ? rect.y + rect.height + 12 : rect.y - CARD_HEIGHT, SAFE_TOP, screen.height - CARD_HEIGHT),
    width,
  }
}
