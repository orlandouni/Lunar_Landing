// Glass sheet over the Moon for the Metrics / Compare / Plan tabs (the 3D scene stays alive behind it).
import type { ReactNode } from 'react'

export function Sheet({ children, fill = false, wide = false }: { children: ReactNode; fill?: boolean; wide?: boolean }) {
  if (fill) return (
    <main className="metrics-sheet absolute inset-x-0 bottom-0 top-20 z-10 overflow-y-auto bg-[#080d15]/95 px-4 pb-40 sm:px-6 sm:pb-36">
      <div className="mx-auto flex min-h-full w-full max-w-[1440px] flex-col gap-5">{children}</div>
    </main>
  )
  return (
    <div className="absolute inset-0 z-10 overflow-y-auto bg-black/60 px-4 pb-40 pt-20 backdrop-blur-md">
      <div className={`mx-auto flex flex-col gap-4 ${wide ? 'w-full max-w-[1440px]' : 'max-w-6xl'}`}>{children}</div>
    </div>
  )
}
