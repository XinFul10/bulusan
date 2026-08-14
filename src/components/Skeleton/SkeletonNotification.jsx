import SkeletonBase from './SkeletonBase'

/**
 * SkeletonNotification – mimics a notification list item.
 *
 * @param {number} count – number of items to render
 */
const SkeletonNotification = ({ count = 4 }) => {
  const items = Array.from({ length: count })
  return (
    <>
      {items.map((_, i) => (
        <li key={i} className="px-4 py-3 flex gap-3 items-start" aria-hidden="true">
          {/* Icon circle */}
          <SkeletonBase className="h-8 w-8 rounded-full shrink-0 mt-0.5" />
          {/* Text lines */}
          <div className="flex-1 space-y-2 min-w-0">
            <SkeletonBase className="h-3 w-3/4 rounded" />
            <SkeletonBase className="h-3 w-full rounded" />
            <SkeletonBase className="h-3 w-1/3 rounded" />
          </div>
        </li>
      ))}
    </>
  )
}

export default SkeletonNotification
