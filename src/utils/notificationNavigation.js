/**
 * Build navigation path for a notification click action.
 */
export const buildNotificationPath = (notification) => {
  const targetPage = notification.targetPage || '/tracking'
  const requestId = notification.requestId || notification.budgetRequestId

  if (!requestId) {
    return targetPage
  }

  const params = new URLSearchParams({ requestId })
  return `${targetPage}?${params.toString()}`
}

/**
 * Scroll an element into view after a short delay (allows DOM/render to settle).
 */
export const scrollToElement = (element, options = { behavior: 'smooth', block: 'center' }) => {
  if (!element) return
  setTimeout(() => {
    element.scrollIntoView(options)
  }, 150)
}
