import SkeletonBase from './SkeletonBase'

/**
 * SkeletonCard – mimics a stat card (Total Budget, Obligated, etc.)
 * or a Budget-by-Category card.
 *
 * @param {'stat'|'category'} variant  – layout variant
 * @param {number}            count    – how many cards to render
 */
const SkeletonCard = ({ variant = 'stat', count = 1 }) => {
  const cards = Array.from({ length: count })

  if (variant === 'stat') {
    return (
      <>
        {cards.map((_, i) => (
          <div key={i} className="card !p-4 sm:!p-6 space-y-3" aria-hidden="true">
            <SkeletonBase className="h-3.5 w-1/2 rounded" />
            <SkeletonBase className="h-7 w-3/4 rounded" />
          </div>
        ))}
      </>
    )
  }

  // variant === 'category'
  return (
    <>
      {cards.map((_, i) => (
        <div key={i} className="card space-y-4" aria-hidden="true">
          {/* Category name + badge */}
          <div className="flex items-center justify-between">
            <SkeletonBase className="h-4 w-2/5 rounded" />
            <SkeletonBase className="h-5 w-14 rounded-full" />
          </div>
          {/* Progress bar */}
          <SkeletonBase className="h-2.5 w-full rounded-full" />
          {/* Three stat lines */}
          <div className="grid grid-cols-3 gap-2">
            {[0, 1, 2].map((j) => (
              <div key={j} className="space-y-1.5">
                <SkeletonBase className="h-2.5 w-full rounded" />
                <SkeletonBase className="h-4 w-3/4 rounded" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </>
  )
}

export default SkeletonCard
