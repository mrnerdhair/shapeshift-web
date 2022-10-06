import type { TouchEvent } from 'react'
import { useMemo } from 'react'
import { createContext, useState } from 'react'

export type DragProviderContextProps = {
  touchStart: number | null
  touchEnd: number | null
  direction: string | null
}

export const DragProviderContext = createContext<DragProviderContextProps | null>(null)

type BrowserRouterProviderProps = {
  children: React.ReactNode
}

export function DragProvider({ children }: BrowserRouterProviderProps) {
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchEnd, setTouchEnd] = useState<number | null>(null)
  const [direction, setDirection] = useState<string | null>(null)
  const minSwipeDistance = 50
  const onTouchStart = (e: TouchEvent) => {
    setDirection(null)
    setTouchEnd(null) // otherwise the swipe is fired even with usual touch events
    setTouchStart(e.targetTouches[0].clientX)
  }

  const onTouchMove = (e: TouchEvent) => setTouchEnd(e.targetTouches[0].clientX)

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return
    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > minSwipeDistance
    const isRightSwipe = distance < -minSwipeDistance
    if (isLeftSwipe || isRightSwipe) setDirection(isLeftSwipe ? 'left' : 'right')
    // add your conditional logic here
  }

  const values = useMemo(() => {
    return {
      touchStart,
      touchEnd,
      direction,
    }
  }, [direction, touchEnd, touchStart])

  return (
    <DragProviderContext.Provider value={values}>
      <div onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} onTouchMove={onTouchMove}>
        {children}
      </div>
    </DragProviderContext.Provider>
  )
}
