import { useContext } from 'react'
import type { DragProviderContextProps } from 'context/DragProvider/DragProvider'
import { DragProviderContext } from 'context/DragProvider/DragProvider'

export function useDragProvider() {
  const ctx = useContext<DragProviderContextProps | null>(DragProviderContext)
  if (!ctx) throw new Error("useBrowserRouter can't be used outside of BrowserRouterContext")
  return ctx
}
