import type { ReactNode } from 'react'

export type TourRect = {
  x: number
  y: number
  width: number
  height: number
}

export type TourPlacement = 'top' | 'bottom' | 'center' | 'auto'
export type MissingTargetBehavior = 'wait' | 'skip' | 'show'

export type TourStep = {
  id: string
  title: string
  body: string
  /** The id passed to the corresponding TourTarget. Omit for a centred step. */
  targetId?: string
  placement?: TourPlacement
  missingTargetBehavior?: MissingTargetBehavior
  allowTargetInteraction?: boolean
  advanceOnTargetPress?: boolean
  targetWaitMs?: number
}

export type TourTheme = {
  scrimColor: string
  spotlightBorderColor: string
  spotlightRadius: number
  cardBackground: string
  cardBorderColor: string
  titleColor: string
  bodyColor: string
  mutedColor: string
  primaryColor: string
  primaryTextColor: string
}

export type TourTooltipRenderProps = {
  step: TourStep
  index: number
  total: number
  targetFound: boolean
  onBack: () => void
  onNext: () => void
  onFinish: () => void
}

export type TourOverlayProps = {
  visible: boolean
  steps: readonly TourStep[]
  activeStepIndex: number
  onStepChange: (index: number) => void
  onFinish: () => void
  theme?: Partial<TourTheme>
  renderTooltip?: (props: TourTooltipRenderProps) => ReactNode
}
