import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
} from 'react'
import { findNodeHandle, UIManager, View, type ViewProps } from 'react-native'

import type { TourRect } from './types'

type TargetEntry = { measure: () => Promise<TourRect | null> }

type Registry = {
  register: (id: string, entry: TargetEntry) => () => void
  get: (id: string) => TargetEntry | null
  subscribe: (listener: () => void) => () => void
  snapshot: () => number
  emitPress: (id: string) => void
  subscribePress: (id: string, listener: () => void) => () => void
}

const RegistryContext = createContext<Registry | null>(null)

function createRegistry(): Registry {
  const targets = new Map<string, TargetEntry>()
  const listeners = new Set<() => void>()
  const pressListeners = new Map<string, Set<() => void>>()
  let version = 0
  const notify = () => {
    version += 1
    listeners.forEach((listener) => listener())
  }

  return {
    register: (id, entry) => {
      targets.set(id, entry)
      notify()
      return () => {
        if (targets.get(id) === entry) {
          targets.delete(id)
          notify()
        }
      }
    },
    get: (id) => targets.get(id) ?? null,
    subscribe: (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    snapshot: () => version,
    emitPress: (id) => pressListeners.get(id)?.forEach((listener) => listener()),
    subscribePress: (id, listener) => {
      const set = pressListeners.get(id) ?? new Set<() => void>()
      set.add(listener)
      pressListeners.set(id, set)
      return () => {
        set.delete(listener)
        if (!set.size) pressListeners.delete(id)
      }
    },
  }
}

export function TourProvider({ children }: { children: ReactNode }) {
  const registry = useMemo(createRegistry, [])
  return <RegistryContext.Provider value={registry}>{children}</RegistryContext.Provider>
}

export function useTourRegistry(): Registry {
  const registry = useContext(RegistryContext)
  if (!registry) throw new Error('TourProvider must wrap TourTarget and TourOverlay.')
  return registry
}

export function useTourRegistryVersion(): number {
  const registry = useTourRegistry()
  return useSyncExternalStore(registry.subscribe, registry.snapshot, registry.snapshot)
}

export type TourTargetProps = ViewProps & { id?: string; children: ReactNode }

export function TourTarget({ id, children, onTouchEnd, ...props }: TourTargetProps) {
  const registry = useContext(RegistryContext)
  // React Native's View ref type differs between its legacy and new type declarations.
  // The imperative measurement APIs are feature-detected below, so keep this boundary
  // intentionally untyped for compatibility across supported RN versions.
  const viewRef = useRef<any>(null)
  const measure = useCallback(() => new Promise<TourRect | null>((resolve) => {
    const view = viewRef.current
    if (!view) return resolve(null)
    const measureInWindow = (x: number, y: number, width: number, height: number) =>
      resolve(width && height ? { x, y, width, height } : null)

    if (typeof (view as any).measureInWindow === 'function') {
      ;(view as any).measureInWindow(measureInWindow)
      return
    }
    const node = findNodeHandle(view)
    if (!node) return resolve(null)
    UIManager.measureInWindow(node, measureInWindow)
  }), [])
  const entry = useMemo(() => (id ? { measure } : null), [id, measure])

  useEffect(() => (registry && id && entry ? registry.register(id, entry) : undefined), [entry, id, registry])

  return (
    <View
      ref={viewRef}
      collapsable={false}
      nativeID={id ? `tour-target-${id}` : undefined}
      testID={id ? `tour-target-${id}` : undefined}
      onTouchEnd={(event) => {
        if (id) registry?.emitPress(id)
        onTouchEnd?.(event)
      }}
      {...props}
    >
      {children}
    </View>
  )
}
