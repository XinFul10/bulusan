import SkeletonBase from './SkeletonBase'

/**
 * SkeletonReportItem – mimics a single saved-report list entry
 * (report name + user name + timestamp + action buttons).
 *
 * @param {number} count – number of items to render
 */
const SkeletonReportItem = ({ count = 3 }) => {
  const items = Array.from({ length: count })
  return (
    <>
      {items.map((_, i) => (
        <div key={i} className="p-3 rounded-lg border border-gray-200 space-y-2" aria-hidden="true">
          <div className="flex items-start justify-between gap-2">
            {/* Text column */}
            <div className="flex-1 space-y-1.5 min-w-0">
              <SkeletonBase className="h-3.5 w-3/4 rounded" />
              <SkeletonBase className="h-3 w-1/2 rounded" />
              <SkeletonBase className="h-3 w-2/5 rounded" />
            </div>
            {/* Action icon placeholders */}
            <div className="flex gap-1 shrink-0">
              <SkeletonBase className="h-6 w-6 rounded" />
              <SkeletonBase className="h-6 w-6 rounded" />
            </div>
          </div>
        </div>
      ))}
    </>
  )
}

export default SkeletonReportItem
