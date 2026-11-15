// Glass sheet over the Moon for the Metrics / Compare / Plan tabs (the 3D scene stays alive behind it).
import type { ReactNode } from 'react'

export function Sheet({ children }: { children: ReactNode }) {
  return (
    <div className="absolute inset-0 z-10 overflow-y-auto bg-black/60 px-4 pb-40 pt-20 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl flex-col gap-4">{children}</div>
    </div>
  )
}
