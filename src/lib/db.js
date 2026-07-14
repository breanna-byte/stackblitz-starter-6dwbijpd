// Maps between Supabase's snake_case rows and the camelCase shape the app
// uses everywhere else. Insert/update payloads are built inline next to
// each mutation in App.jsx (they're partial and shaped per-call); these
// are only for the full row shape that comes back from a select().

export function rowToClient(r) {
  return { id: r.id, name: r.name, email: r.email || '', phone: r.phone || '', address: r.address || '' }
}

export function rowToEstimate(r) {
  return {
    id: r.id, clientId: r.client_id, title: r.title, status: r.status,
    taxRate: Number(r.tax_rate) || 0, globalDiscount: Number(r.global_discount) || 0,
    items: r.items || [], createdAt: (r.created_at || '').slice(0, 10),
  }
}

export function rowToJob(r) {
  return {
    id: r.id, estimateId: r.estimate_id, clientId: r.client_id, title: r.title,
    status: r.status, start: r.start_date || '', end: r.end_date || '', seriesId: r.series_id,
  }
}

export function rowToInvoice(r) {
  return {
    id: r.id, estimateId: r.estimate_id, jobId: r.job_id, clientId: r.client_id,
    status: r.status, issuedAt: r.issued_at || '', dueAt: r.due_at || '',
    amount: r.amount === null ? null : Number(r.amount), depositPct: Number(r.deposit_pct) || 0,
    seriesId: r.series_id,
  }
}

export function rowToTodo(r) {
  return { id: r.id, title: r.title, done: r.done, dueDate: r.due_date || '', priority: r.priority }
}

export function rowToEvent(r) {
  return { id: r.id, title: r.title, date: r.date, time: r.time ? r.time.slice(0, 5) : '', clientId: r.client_id }
}

export function rowToTransaction(r) {
  return {
    id: r.id, type: r.type, category: r.category, vendorOrSource: r.vendor_or_source || '',
    amount: Number(r.amount) || 0, date: r.date, dueDate: r.due_date || '', status: r.status,
    receiptImage: r.receipt_image, notes: r.notes || '', clientId: r.client_id,
  }
}

export function rowToSettings(r, defaults) {
  if (!r) return defaults
  return {
    businessName: r.business_name ?? defaults.businessName,
    tagline: r.tagline ?? defaults.tagline,
    logo: r.logo ?? defaults.logo,
    address: r.address ?? defaults.address,
    phone: r.phone ?? defaults.phone,
    email: r.email ?? defaults.email,
    website: r.website ?? defaults.website,
    accentColor: r.accent_color ?? defaults.accentColor,
    currencySymbol: r.currency_symbol ?? defaults.currencySymbol,
    estimateTerms: r.estimate_terms ?? defaults.estimateTerms,
    invoiceTerms: r.invoice_terms ?? defaults.invoiceTerms,
    footerNote: r.footer_note ?? defaults.footerNote,
  }
}

export function settingsToRow(userId, s) {
  return {
    user_id: userId,
    business_name: s.businessName,
    tagline: s.tagline,
    logo: s.logo,
    address: s.address,
    phone: s.phone,
    email: s.email,
    website: s.website,
    accent_color: s.accentColor,
    currency_symbol: s.currencySymbol,
    estimate_terms: s.estimateTerms,
    invoice_terms: s.invoiceTerms,
    footer_note: s.footerNote,
  }
}
