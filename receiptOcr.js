// Turns a photographed/uploaded receipt into a draft expense row. Runs
// entirely in the browser via tesseract.js (WASM), so no server or API key
// is required. OCR on receipts is never perfect, so this fills a best
// guess and the UI always shows it as "unverified" until someone checks it
// on the Receipt Ledger page — that review step is intentional, not a bug.

let workerPromise = null

async function getWorker() {
  if (!workerPromise) {
    const { createWorker } = await import('tesseract.js')
    workerPromise = createWorker('eng')
  }
  return workerPromise
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

// Pulls the most likely total from receipt text: the largest dollar figure
// that appears near a "total"-like keyword, falling back to the largest
// dollar figure anywhere on the receipt.
function extractAmount(text) {
  const lines = text.split('\n')
  const moneyRe = /\$?\s?(\d{1,4}(?:,\d{3})*\.\d{2})/g
  let totalLineAmounts = []
  let allAmounts = []

  for (const line of lines) {
    const isTotalLine = /\btotal\b/i.test(line) && !/subtotal/i.test(line)
    let m
    while ((m = moneyRe.exec(line))) {
      const val = parseFloat(m[1].replace(/,/g, ''))
      if (!Number.isFinite(val)) continue
      allAmounts.push(val)
      if (isTotalLine) totalLineAmounts.push(val)
    }
  }

  if (totalLineAmounts.length) return Math.max(...totalLineAmounts)
  if (allAmounts.length) return Math.max(...allAmounts)
  return null
}

function extractDate(text) {
  const patterns = [
    /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/, // 07/09/2026 or 7-9-26
  ]
  for (const re of patterns) {
    const m = text.match(re)
    if (m) {
      let [, mo, da, yr] = m
      if (yr.length === 2) yr = `20${yr}`
      const mm = mo.padStart(2, '0')
      const dd = da.padStart(2, '0')
      if (Number(mm) <= 12 && Number(dd) <= 31) return `${yr}-${mm}-${dd}`
    }
  }
  return null
}

// First non-empty line that isn't just numbers/symbols is usually the
// store/vendor name on a printed receipt.
function extractVendor(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  for (const line of lines.slice(0, 6)) {
    if (/[a-zA-Z]{3,}/.test(line) && !/receipt|invoice/i.test(line)) return line
    if (line.length > 40) continue
  }
  return lines[0] || ''
}

export async function scanReceipt(file, onProgress) {
  const dataUrl = await fileToDataUrl(file)
  const worker = await getWorker()

  if (onProgress) onProgress('Reading receipt…')
  const { data } = await worker.recognize(file)
  const text = data.text || ''

  return {
    receiptImage: dataUrl,
    amount: extractAmount(text) ?? 0,
    date: extractDate(text) ?? new Date().toISOString().slice(0, 10),
    vendorOrSource: extractVendor(text),
    rawText: text,
    verified: false,
  }
}
