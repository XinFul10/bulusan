/**
 * Generate a unique verification code for reports
 * Format: #XXXXXXXXXXXX where X is a random alphanumeric character (case-sensitive)
 * @returns {string} Verification code
 */
export const generateReportCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let code = '#'
  for (let i = 0; i < 12; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

/**
 * Validate report verification code format
 * Format: #XXXXXXXXXXXX (12 alphanumeric characters, case-sensitive)
 * @param {string} code - Code to validate
 * @returns {boolean} True if code matches format
 */
export const isValidReportCode = (code) => {
  if (!code) return false
  return /^#[A-Za-z0-9]{12}$/.test(code)
}
