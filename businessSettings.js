const STORAGE_KEY = 'fieldledger:business-settings'

export const defaultSettings = {
  businessName: 'Your Business Name',
  tagline: 'General Contracting & Repair',
  logo: null, // data URL
  address: '123 Main St, Fort Collins, CO 80521',
  phone: '(970) 555-0100',
  email: 'office@yourbusiness.com',
  website: '',
  accentColor: '#F2A31F', // hex, drives PDF header/table accent
  currencySymbol: '$',
  estimateTerms: 'This estimate is valid for 30 days. A 30% deposit is required to schedule work. Final price may vary if site conditions differ from this quote.',
  invoiceTerms: 'Payment due within 15 days of invoice date. Late payments may be subject to a 1.5% monthly service charge.',
  footerNote: 'Thank you for the opportunity to earn your business.',
}

export function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultSettings
    return { ...defaultSettings, ...JSON.parse(raw) }
  } catch {
    return defaultSettings
  }
}

export function saveSettings(settings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch {
    // storage unavailable (private browsing, quota) — settings just won't persist
  }
}
