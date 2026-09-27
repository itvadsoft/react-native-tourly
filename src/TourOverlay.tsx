import { useCallback, useEffect, useMemo, useState } from 'react'
import { Dimensions, Pressable, StyleSheet, Text, View } from 'react-native'

import { getTooltipLayout, padRect } from './layout'
import { useTourRegistry, useTourRegistryVersion } from './targetRegistry'
import type { TourOverlayProps, TourRect, TourTheme, TourTooltipRenderProps } from './types'

const defaultTheme: TourTheme = {
  scrimColor: 'rgba(0,0,0,0.7)', spotlightBorderColor: '#22c55e', spotlightRadius: 12,
  cardBackground: '#ffffff', cardBorderColor: '#e5e7eb', titleColor: '#111827', bodyColor: '#374151',
  mutedColor: '#6b7280', primaryColor: '#059669', primaryTextColor: '#ffffff',
}

function OverlayScrim({ rect, color, radius, borderColor, allowTargetInteraction }: { rect: TourRect | null; color: string; radius: number; borderColor: string; allowTargetInteraction: boolean }) {
  const screen = Dimensions.get('window')
  const spotlight = rect ? padRect(rect, screen, 6) : null
  if (!spotlight) return <Pressable style={[styles.fullScrim, { backgroundColor: color }]} />
  return <>
    <Pressable style={[styles.scrim, { backgroundColor: color, top: 0, left: 0, right: 0, height: spotlight.y }]} />
    <Pressable style={[styles.scrim, { backgroundColor: color, top: spotlight.y, left: 0, width: spotlight.x, height: spotlight.height }]} />
    <Pressable style={[styles.scrim, { backgroundColor: color, top: spotlight.y, left: spotlight.x + spotlight.width, right: 0, height: spotlight.height }]} />
    <Pressable style={[styles.scrim, { backgroundColor: color, top: spotlight.y + spotlight.height, left: 0, right: 0, bottom: 0 }]} />
    {!allowTargetInteraction ? <Pressable style={[styles.targetBlocker, { left: spotlight.x, top: spotlight.y, width: spotlight.width, height: spotlight.height }]} /> : null}
    <View pointerEvents="none" style={[styles.spotlight, { left: spotlight.x, top: spotlight.y, width: spotlight.width, height: spotlight.height, borderRadius: radius, borderColor }]} />
  </>
}

function DefaultTooltip({ step, index, total, targetFound, onBack, onNext, onFinish, theme }: TourTooltipRenderProps & { theme: TourTheme }) {
  return <View style={[styles.card, { backgroundColor: theme.cardBackground, borderColor: theme.cardBorderColor }]}>
    <View style={[styles.cardHeader, { borderColor: theme.cardBorderColor }]}>
      <Text style={[styles.kicker, { color: theme.primaryColor }]}>GUIDED TOUR · {index + 1} / {total}</Text>
      <Text style={[styles.title, { color: theme.titleColor }]}>{step.title}</Text>
    </View>
    <View style={styles.cardBody}>
      <Text style={[styles.body, { color: theme.bodyColor }]}>{step.body}</Text>
      {!targetFound ? <Text style={[styles.waiting, { color: theme.mutedColor }]}>Waiting for this screen. You can continue whenever you’re ready.</Text> : null}
    </View>
    <View style={[styles.footer, { borderColor: theme.cardBorderColor }]}>
      <Pressable onPress={onFinish} style={styles.textButton}><Text style={[styles.textButtonLabel, { color: theme.mutedColor }]}>Skip</Text></Pressable>
      <View style={styles.actions}>
        <Pressable disabled={index === 0} onPress={onBack} style={[styles.backButton, { borderColor: theme.cardBorderColor }, index === 0 ? styles.disabled : null]}><Text style={[styles.backLabel, { color: theme.titleColor }]}>Back</Text></Pressable>
        <Pressable onPress={onNext} style={[styles.nextButton, { backgroundColor: theme.primaryColor }]}><Text style={[styles.nextLabel, { color: theme.primaryTextColor }]}>{index + 1 === total ? 'Done' : 'Next'}</Text></Pressable>
      </View>
    </View>
  </View>
}

export function TourOverlay({ visible, steps, activeStepIndex, onStepChange, onFinish, renderTooltip, theme: themeOverride }: TourOverlayProps) {
  const registry = useTourRegistry()
  const registryVersion = useTourRegistryVersion()
  const theme = { ...defaultTheme, ...themeOverride }
  const step = steps[activeStepIndex]
  const [rect, setRect] = useState<TourRect | null>(null)
  const [targetMissing, setTargetMissing] = useState(false)

  const finish = useCallback(() => onFinish(), [onFinish])
  const next = useCallback(() => {
    if (activeStepIndex + 1 >= steps.length) finish()
    else onStepChange(activeStepIndex + 1)
  }, [activeStepIndex, finish, onStepChange, steps.length])
  const back = useCallback(() => onStepChange(Math.max(0, activeStepIndex - 1)), [activeStepIndex, onStepChange])

  useEffect(() => {
    if (!visible || !step?.targetId) { setRect(null); setTargetMissing(false); return }
    let cancelled = false
    let timer: ReturnType<typeof setInterval> | undefined
    const update = async () => {
      const nextRect = await registry.get(step.targetId!)?.measure()
      if (!cancelled && nextRect) { setRect(nextRect); setTargetMissing(false) }
    }
    const find = async () => {
      setRect(null); setTargetMissing(false)
      const deadline = Date.now() + (step.targetWaitMs ?? (step.missingTargetBehavior === 'wait' ? 7000 : 2200))
      while (!cancelled && Date.now() <= deadline) {
        const nextRect = await registry.get(step.targetId!)?.measure()
        if (nextRect) { setRect(nextRect); timer = setInterval(() => void update(), 180); return }
        await new Promise<void>((resolve) => setTimeout(resolve, 180))
      }
      if (!cancelled && step.missingTargetBehavior === 'skip') next()
      else if (!cancelled) setTargetMissing(true)
    }
    void find()
    return () => { cancelled = true; if (timer) clearInterval(timer) }
  }, [next, registry, registryVersion, step, visible])

  useEffect(() => {
    if (!visible || !step?.targetId || !step.advanceOnTargetPress) return
    return registry.subscribePress(step.targetId, () => setTimeout(next, 180))
  }, [next, registry, step, visible])

  if (!visible || !step) return null
  const targetFound = !step.targetId || Boolean(rect)
  const screen = Dimensions.get('window')
  const tooltipStyle = getTooltipLayout(targetFound ? rect : null, targetMissing ? 'center' : step.placement, screen)
  const tooltipProps: TourTooltipRenderProps = { step, index: activeStepIndex, total: steps.length, targetFound, onBack: back, onNext: next, onFinish: finish }

  return <View pointerEvents="box-none" style={styles.host}>
    <OverlayScrim rect={targetFound ? rect : null} color={theme.scrimColor} radius={theme.spotlightRadius} borderColor={theme.spotlightBorderColor} allowTargetInteraction={step.allowTargetInteraction ?? Boolean(step.advanceOnTargetPress)} />
    <View style={[styles.tooltip, tooltipStyle]}>{renderTooltip ? renderTooltip(tooltipProps) : <DefaultTooltip {...tooltipProps} theme={theme} />}</View>
  </View>
}

const styles = StyleSheet.create({
  host: { ...StyleSheet.absoluteFill, zIndex: 20000 }, fullScrim: { ...StyleSheet.absoluteFill }, scrim: { position: 'absolute' }, targetBlocker: { position: 'absolute' },
  spotlight: { position: 'absolute', borderWidth: 2, shadowColor: '#22c55e', shadowOpacity: 0.45, shadowRadius: 12 }, tooltip: { position: 'absolute' },
  card: { overflow: 'hidden', borderRadius: 12, borderWidth: 1, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 18, elevation: 8 }, cardHeader: { borderBottomWidth: 1, paddingHorizontal: 16, paddingVertical: 12 },
  kicker: { fontSize: 11, fontWeight: '700' }, title: { marginTop: 4, fontSize: 16, fontWeight: '800' }, cardBody: { paddingHorizontal: 16, paddingVertical: 12 }, body: { fontSize: 14, lineHeight: 20 }, waiting: { marginTop: 12, fontSize: 12, lineHeight: 16 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, paddingHorizontal: 12, paddingVertical: 12 }, actions: { flexDirection: 'row', gap: 8 }, textButton: { paddingHorizontal: 12, paddingVertical: 8 }, textButtonLabel: { fontSize: 12, fontWeight: '700' }, backButton: { borderRadius: 8, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8 }, disabled: { opacity: 0.4 }, backLabel: { fontSize: 12, fontWeight: '700' }, nextButton: { borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8 }, nextLabel: { fontSize: 12, fontWeight: '800' },
})
