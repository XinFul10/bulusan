/**
 * SkeletonBase – single animated shimmer block.
 * All higher-level skeleton components compose from this.
 *
 * @param {string} className  – extra Tailwind classes (width, height, rounded…)
 */
const SkeletonBase = ({ className = '' }) => (
  <div className={`skeleton-shimmer ${className}`} aria-hidden="true" />
)

export default SkeletonBase
