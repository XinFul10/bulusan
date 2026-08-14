import SkeletonBase from './SkeletonBase'

/**
 * SkeletonText – one or more lines of text placeholder.
 *
 * @param {number} lines   – number of lines
 * @param {string} width   – Tailwind width class for the last (shortest) line
 */
const SkeletonText = ({ lines = 1, width = 'w-full' }) => {
  const arr = Array.from({ length: lines })
  return (
    <div className="space-y-2" aria-hidden="true">
      {arr.map((_, i) => (
        <SkeletonBase
          key={i}
          className={`h-3.5 rounded ${i === arr.length - 1 ? width : 'w-full'}`}
        />
      ))}
    </div>
  )
}

export default SkeletonText
