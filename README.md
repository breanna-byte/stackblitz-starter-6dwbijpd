# FieldLedger — contractor ERP (Joist + GetCost style)

A full quoting-to-cash app for a trades or service business: clients →
estimates with a live price calculator → jobs → invoices, plus scheduling,
task tracking, receipt scanning, a job-site map, and full income/expense/
bill tracking with automatic profit & loss. Built with React + Vite,
backed by Supabase.

## Feature map

**Sales**
- **Estimates & Bids** — the GetCost-style piece. Every line item is
  material (qty × unit cost) or labor (hours × rate) with its own markup %.
  A live sidebar "ticker" recalculates cost, price, discount, tax, total,
  and profit margin as you type. Per-line tax toggle for mixed jobs.
  Edit or delete any estimate, and **download it as a branded PDF** —
  see "Customizable PDFs" below.
- **Jobs** — one-click "Convert to job" from any estimate, or create one
  directly with **"+ New job."** Status tracking (scheduled / in progress /
  complete); edit job title/client/dates or delete a job, all with a
  confirmation step. Can be made **recurring** — see below.
- **Invoices** — one-click "Convert to invoice," or create one directly
  with **"+ New invoice"** (useful for retainers/contracts with no linked
  estimate — there's a manual amount field for that case). Draft/sent/
  paid/overdue status with a "mark paid" action; edit dates/status/deposit
  % or delete; download as a branded PDF. Can be made **recurring**.
- **Clients** — contact list with edit and delete (delete asks for
  confirmation first), address, linked estimate count.

**Field**
- **Schedule** — a real month-view calendar. Automatically plots job start/
  end dates and unpaid bill due dates alongside appointments you add by
  clicking any day.
- **To-Do List** — tasks with priority and due date, sorted so open/
  high-priority items float to the top.
- **Job Site Map** — every client address on an embedded map (no API key
  required — see "How the map works" below), with one-tap driving
  directions.

**Money**
- **Income / Expenses / Bills** — three dedicated tracking pages (one
  shared component underneath) with totals, this-month totals, and — for
  bills — an unpaid total and a paid/unpaid toggle.
- **Receipt Ledger** — take or upload a photo of a receipt; it's read with
  in-browser OCR and turned into an editable expense row (vendor, amount,
  date, category) that you confirm before it counts toward your books. See
  "How receipt scanning works" below.
- **Profit & Loss** — automatically rolls up every income, expense, and
  paid bill into income / expenses / net profit, a month-by-month trend
  table, and an expense-by-category breakdown. The Dashboard also shows a
  live P&L snapshot.

**Business**
- **PDF & Business Info** — your business name, tagline, logo, address,
  contact info, brand accent color, and default terms for estimates vs.
  invoices. Everything here flows straight into every PDF you download.

Runs immediately in **demo mode** (in-memory seed data) if you haven't
connected Supabase yet — nothing to configure to start clicking around.

## Recurring jobs & invoices

When creating a new job or invoice (not when editing one — recurrence is a
creation-time choice), check **"Repeats"** to turn it into a series:
weekly, every 2 weeks, or monthly, ending either after a set number of
occurrences or on a chosen date.

Under the hood (`src/lib/recurrence.js`), this generates real, independent
records up front — each dated occurrence is its own editable job or
invoice, not a "virtual" entry computed on the fly. They share a
`seriesId` so you can spot them (a small "↻ recurring" tag) and delete the
whole series in one action if plans change, separately from deleting just
one occurrence. Generation is capped at 24 occurrences per series to avoid
runaway data from a mistyped end date; if you need more, create a new
series starting from the last date once you get there.

Two small honest caveats: monthly recurrence adds one calendar month at a
time, so a series starting on the 31st can land on the 1st–3rd of the
following month in short months (the same quirk you'd hit with
`JavaScript`'s native date math generally). And because occurrences are
generated once at creation, editing the series' *original* recurrence
rule later isn't supported — edit or delete individual occurrences, or
delete the series and create a new one.

## Customizable PDFs

Every estimate and invoice can be downloaded as a polished, letter-size
PDF (`src/lib/pdf.js`, built with `jsPDF` + `jspdf-autotable`, generated
entirely client-side). What makes it "customizable":

- **Branding** comes from the Business Info page: your logo, business
  name/tagline, contact details, and a single accent color that colors
  the document title and the line-items table header.
- **Terms are two-tiered.** Set a default estimate terms paragraph and a
  default invoice terms paragraph once in Business Info. Then, on any
  individual estimate or invoice, you can type an override into its own
  "PDF terms" field — that document's PDF will use the override instead,
  without touching your saved defaults.
- Line items, quantities, markup-adjusted pricing, discount, tax, and
  totals all render straight from the same numbers you see in the app —
  there's no separate "generate" step that could get out of sync.

## How the map works

The map page uses Google's keyless embed endpoint
(`google.com/maps?q=...&output=embed`), so there's no API key or billing
setup needed — good for a small business viewing its own client list. If
you outgrow it (need multiple pins on one map, route optimization across
several stops, etc.), swap in the Maps JavaScript API with a real key.

## How receipt scanning works

Photo → OCR happens entirely in the browser via `tesseract.js` (WebAssembly,
no server or API key). It searches the recognized text for a total-like
dollar amount, a date, and a probable vendor name, then drops those into an
editable expense row marked **"Unverified"** until you click "Looks right."
OCR on real-world receipts is never 100% reliable (creased paper, faded
thermal print, unusual layouts) — the verify step is intentional, not a
placeholder. If you want higher accuracy, the natural upgrade is swapping
`src/lib/receiptOcr.js` for a cloud vision/OCR API call.

## Run it in StackBlitz

1. Create a new **Node.js** project in StackBlitz (not the plain "React"
   template — this project brings its own `package.json`/Vite setup).
2. Delete the default starter files.
3. Copy in everything from *inside* this folder (`package.json`, `src/`,
   `supabase/`, `index.html`, etc.) so `package.json` sits at the project
   root — not nested inside a subfolder.
4. StackBlitz auto-runs `npm install` and `npm run dev`.
5. It opens in demo mode with sample data — nothing else required to try it.

## Connect it to real Supabase data

1. Create a project at [supabase.com](https://supabase.com).
2. **SQL Editor** → paste the contents of `supabase/schema.sql` → run it.
   This creates `clients`, `estimates`, `jobs`, `invoices`, `todos`,
   `events`, and `transactions` (the shared business data) plus
   `user_settings` (private per-person PDF/business-info preferences),
   all with row-level security.
3. **Project Settings → API** → copy your **Project URL** and **anon
   public key**.
4. Copy `.env.example` to `.env` and fill them in:
   ```
   VITE_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-public-key
   ```
5. In **Authentication → Users**, add one account per person (email +
   password). Whoever runs the project can also do this by calling
   `supabase.auth.signUp()` once per teammate. If you'd rather they not get
   a "confirm your email" notice before you're ready to show them,
   toggle **Authentication → Providers → Email → Confirm email** off first
   (you can turn it back on later).
6. Restart the dev server (stop it with Ctrl+C, run `npm run dev` again).
   You'll land on a sign-in screen; log in with one of the accounts from
   step 5.

## How multi-user access works

- **Business data is shared.** Clients, estimates, jobs, invoices, the
  schedule, to-dos, and income/expenses/bills are visible to and editable
  by every signed-in teammate — there's no per-user siloing. Whoever's
  logged in sees the same records, live as of their last page load (not a
  real-time push while both of you are on the app at once — reload to see
  a teammate's latest changes).
- **Business Info / PDF settings are private per account.** Each person's
  business name/logo/terms/etc. live in their own `user_settings` row and
  only affect their own PDFs and preview — signing in as someone else
  shows that person's own settings, not yours.
- Sign out from the bottom of the sidebar. There's no self-serve sign-up
  screen by design — accounts are provisioned by whoever administers the
  Supabase project, so only people you've explicitly added can get in.

## Where things live

- `src/lib/calc.js` — the estimate pricing engine (pure functions, no UI).
- `src/lib/finance.js` — P&L / income-expense-bill rollups.
- `src/lib/receiptOcr.js` — photo → draft expense row.
- `src/lib/pdf.js` — branded PDF generation for estimates and invoices.
- `src/lib/businessSettings.js` — PDF branding/terms defaults, plus
  `localStorage` read/write used only in demo mode (no Supabase
  configured). In live mode, settings are instead loaded from and saved to
  the per-user `user_settings` table (see `src/lib/db.js` and the
  settings effects in `src/App.jsx`).
- `src/lib/db.js` — maps Supabase's snake_case rows to the camelCase
  shape used throughout the app.
- `src/components/Login.jsx` — the email/password sign-in screen shown
  when Supabase is configured and no one's signed in.
- `src/pages/` — one file per major section (Schedule, Todos, Receipts,
  MapPage, Income/Expenses/Bills via `TransactionsPage.jsx`, Reports,
  Settings).
- `src/components/ui.jsx` — shared building blocks (stat cards, badges,
  page headers, empty states, the delete-confirmation dialog).
- `src/index.css` — the whole design system as CSS custom properties at
  the top (`--ink-900`, `--amber`, etc.) if you want to re-theme it.
