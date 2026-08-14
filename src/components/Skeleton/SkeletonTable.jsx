import SkeletonBase from './SkeletonBase'

/**
 * SkeletonTable – mimics a data table while rows are loading.
 *
 * @param {number}   rows    – number of skeleton rows to show
 * @param {number}   cols    – number of columns
 * @param {string[]} colWidths – optional per-column width classes (Tailwind)
 */
const SkeletonTable = ({ rows = 5, cols = 5, colWidths = [] }) => {
  const rowArr = Array.from({ length: rows })
  const colArr = Array.from({ length: cols })

  return (
    <>
      {rowArr.map((_, ri) => (
        <tr key={ri} aria-hidden="true">
          {colArr.map((_, ci) => (
            <td key={ci} className="table-cell">
              <SkeletonBase
                className={`h-4 rounded ${colWidths[ci] ?? (ci === 0 ? 'w-3/4' : 'w-1/2')}`}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}

export default SkeletonTable
