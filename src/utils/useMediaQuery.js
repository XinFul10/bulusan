import { useState, useEffect } from 'react'

/**
 * Returns true when the viewport matches the given media query.
 * Default: max-width 767px (mobile, ≤768px).
 */
export function useMediaQuery(query = '(max-width: 767px)') {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia(query).matches
  })

  useEffect(() => {
    const mql = window.matchMedia(query)
    const handler = (e) => setMatches(e.matches)
    setMatches(mql.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [query])

  return matches
}

export const shortenCategoryName = (name) => {
  const abbrevs = {
    'Capacity Development': 'Cap. Dev.',
    'TM & Promotions': 'TM & Promo.',
    'Socio-Cultural & Eco': 'Socio-Cultural',
    'Product & Market Dev': 'Prod. & Market',
  }
  return abbrevs[name] || name
}
