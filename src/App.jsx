import { useEffect, useMemo, useState } from 'react'
import { supabase, hasSupabase } from './supabaseClient'
import { seedClients, seedEstimates, seedJobs, seedInvoices, seedTodos, seedEvents, seedTransactions } from './lib/seed'
import {
  emptyLineItem, emptyHeader, nextRecordNumber,
  computeDocumentTotals, formatCurrency,
} from './lib/calc'
import { computePL } from './lib/finance'
import { defaultSettings, loadSettings, saveSettings } from './lib/businessSettings'
import { generateEstimatePDF, generateInvoicePDF } from './lib/pdf'
import { generateOccurrences, daysBetween, shiftDate } from './lib/recurrence'
import {
  rowToClient, rowToEstimate, rowToJob, rowToInvoice,
  rowToTodo, rowToEvent, rowToTransaction, rowToSettings, settingsToRow, clientLabel,
} from './lib/db'
import { PageHeader, Stat, EmptyState, Badge, ConfirmDialog, STATUS_LABEL } from './components/ui'
import Login from './components/Login'

import Schedule from './pages/Schedule'
import Todos from './pages/Todos'
import Receipts from './pages/Receipts'
import MapPage from './pages/MapPage'
import Transactions from './pages/Transactions'
import Reports from './pages/Reports'
import Settings from './pages/Settings'
import Jobs from './pages/Jobs'
import Estimates from './pages/Estimates'
import Invoices from './pages/Invoices'

const NAV = [
  { section: 'Overview', items: [{ key: 'dashboard', label: 'Dashboard', icon: '◧' }] },
  { section: 'Sales', items: [
    { key: 'estimates', label: 'Estimates & Bids', icon: '✎' },
    { key: 'jobs', label: 'Jobs', icon: '⚒' },
    { key: 'invoices', label: 'Invoices', icon: '⎘' },
    { key: 'clients', label: 'Clients', icon: '◍' },
  ]},
  { section: 'Field', items: [
    { key: 'schedule', label: 'Schedule', icon: '▦' },
    { key: 'todos', label: 'To-Do List', icon: '☑' },
    { key: 'map', label: 'Job Site Map', icon: '⚲' },
  ]},
  { section: 'Money', items: [
    { key: 'transactions', label: 'Transactions', icon: '$' },
    { key: 'receipts', label: 'Receipt Ledger', icon: '📷' },
    { key: 'reports', label: 'Profit & Loss', icon: '∑' },
  ]},
  { section: 'Business', items: [
    { key: 'settings', label: 'PDF & Business Info', icon: '⚙' },
  ]},
]

export default function App() {
  const [tab, setTab] = useState('dashboard')
  // In demo mode (no Supabase configured) everything starts from the seed
  // data so the app is immediately usable. When Supabase is connected,
  // state starts empty and is filled by the data-loading effect below once
  // signed in — every signed-in user shares the same tables, so seeding
  // here would just be overwritten by the load anyway.
  const [clients, setClients] = useState(hasSupabase ? [] : seedClients)
  const [estimates, setEstimates] = useState(hasSupabase ? [] : seedEstimates)
  const [jobs, setJobs] = useState(hasSupabase ? [] : seedJobs)
  const [invoices, setInvoices] = useState(hasSupabase ? [] : seedInvoices)
  const [todos, setTodos] = useState(hasSupabase ? [] : seedTodos)
  const [events, setEvents] = useState(hasSupabase ? [] : seedEvents)
  const [transactions, setTransactions] = useState(hasSupabase ? [] : seedTransactions)
  const [activeEstimateId, setActiveEstimateId] = useState(null)
  const [activeInvoiceId, setActiveInvoiceId] = useState(null)
  const [clientModalOpen, setClientModalOpen] = useState(false)
  const [editingClient, setEditingClient] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null) // { kind, id, label }
  const [settings, setSettings] = useState(hasSupabase ? defaultSettings : loadSettings)

  const [session, setSession] = useState(null)
  const [authLoading, setAuthLoading] = useState(hasSupabase)
  const [dataLoading, setDataLoading] = useState(hasSupabase)

  // Demo mode: settings are per-browser via localStorage, exactly as before.
  useEffect(() => {
    if (hasSupabase) return
    saveSettings(settings)
  }, [settings])

  // Live mode: track the signed-in session.
  useEffect(() => {
    if (!hasSupabase) return
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setAuthLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
      if (!next) {
        // Signed out: clear shared state so the next login doesn't briefly
        // flash the previous account's data.
        setClients([]); setEstimates([]); setJobs([]); setInvoices([])
        setTodos([]); setEvents([]); setTransactions([])
        setSettings(defaultSettings)
      }
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  // Live mode: once signed in, load the shared workspace data plus this
  // user's own private settings row.
  useEffect(() => {
    if (!hasSupabase || !session) return
    let cancelled = false
    setDataLoading(true)
    Promise.all([
      supabase.from('clients').select('*').order('created_at', { ascending: false }),
      supabase.from('estimates').select('*').order('created_at', { ascending: false }),
      supabase.from('jobs').select('*').order('created_at', { ascending: false }),
      supabase.from('invoices').select('*').order('created_at', { ascending: false }),
      supabase.from('todos').select('*').order('created_at', { ascending: false }),
      supabase.from('events').select('*').order('date', { ascending: true }),
      supabase.from('transactions').select('*').order('date', { ascending: false }),
      supabase.from('user_settings').select('*').eq('user_id', session.user.id).maybeSingle(),
    ]).then(([c, es, j, inv, td, ev, tx, us]) => {
      if (cancelled) return
      setClients((c.data || []).map(rowToClient))
      setEstimates((es.data || []).map(rowToEstimate))
      setJobs((j.data || []).map(rowToJob))
      setInvoices((inv.data || []).map(rowToInvoice))
      setTodos((td.data || []).map(rowToTodo))
      setEvents((ev.data || []).map(rowToEvent))
      setTransactions((tx.data || []).map(rowToTransaction))
      setSettings(rowToSettings(us.data, defaultSettings))
      setDataLoading(false)
    })
    return () => { cancelled = true }
  }, [session?.user?.id])

  // Live mode: save this user's settings to their own row, debounced so
  // typing in a text field doesn't fire a write per keystroke.
  useEffect(() => {
    if (!hasSupabase || !session || dataLoading) return
    const t = setTimeout(() => {
      supabase.from('user_settings').upsert(settingsToRow(session.user.id, settings)).then(() => {})
    }, 600)
    return () => clearTimeout(t)
  }, [settings, session?.user?.id, dataLoading])

  const clientById = (id) => clients.find(c => c.id === id)

  function upsertEstimate(est) {
    setEstimates(prev => {
      const exists = prev.some(e => e.id === est.id)
      return exists ? prev.map(e => e.id === est.id ? est : e) : [est, ...prev]
    })
    if (hasSupabase) {
      supabase.from('estimates').upsert({
        id: est.id, client_id: est.clientId, title: est.title, status: est.status,
        header: est.header, line_items: est.lineItems, markup_pct: est.markupPct,
        tax_rate: est.taxRate, terms: est.terms,
      }).then(() => {})
    }
  }

  function upsertInvoice(inv) {
    setInvoices(prev => {
      const exists = prev.some(i => i.id === inv.id)
      return exists ? prev.map(i => i.id === inv.id ? inv : i) : [inv, ...prev]
    })
    if (hasSupabase) {
      supabase.from('invoices').upsert({
        id: inv.id, estimate_id: inv.estimateId, job_id: inv.jobId, client_id: inv.clientId,
        payment_status: inv.paymentStatus, header: inv.header, line_items: inv.lineItems,
        markup_pct: inv.markupPct, tax_rate: inv.taxRate, terms: inv.terms, series_id: inv.seriesId,
      }).then(() => {})
    }
  }

  function addClient(client) {
    const withId = { ...client, id: crypto.randomUUID() }
    setClients(prev => [withId, ...prev])
    if (hasSupabase) {
      supabase.from('clients').insert({
        id: withId.id, contact_name: withId.contactName, business_name: withId.businessName || null,
        email: withId.email, phone: withId.phone, address: withId.address,
      }).then(() => {})
    }
  }

  function updateClient(id, partial) {
    setClients(prev => prev.map(c => c.id === id ? { ...c, ...partial } : c))
    if (hasSupabase) {
      const row = { ...partial }
      if ('contactName' in row) { row.contact_name = row.contactName; delete row.contactName }
      if ('businessName' in row) { row.business_name = row.businessName; delete row.businessName }
      supabase.from('clients').update(row).eq('id', id).then(() => {})
    }
  }

  function removeClient(id) {
    setClients(prev => prev.filter(c => c.id !== id))
    if (hasSupabase) supabase.from('clients').delete().eq('id', id).then(() => {})
  }

  function removeEstimate(id) {
    setEstimates(prev => prev.filter(e => e.id !== id))
    if (activeEstimateId === id) setActiveEstimateId(null)
    if (hasSupabase) supabase.from('estimates').delete().eq('id', id).then(() => {})
  }

  function updateJob(id, partial) {
    setJobs(prev => prev.map(j => j.id === id ? { ...j, ...partial } : j))
    if (hasSupabase) {
      const row = {}
      if ('title' in partial) row.title = partial.title
      if ('clientId' in partial) row.client_id = partial.clientId
      if ('status' in partial) row.status = partial.status
      if ('start' in partial) row.start_date = partial.start || null
      if ('end' in partial) row.end_date = partial.end || null
      if ('notes' in partial) row.notes = partial.notes
      if ('reminders' in partial) row.reminders = partial.reminders
      if ('checklist' in partial) row.checklist = partial.checklist
      if ('materials' in partial) row.materials = partial.materials
      supabase.from('jobs').update(row).eq('id', id).then(() => {})
    }
  }

  function removeJob(id) {
    setJobs(prev => prev.filter(j => j.id !== id))
    if (hasSupabase) supabase.from('jobs').delete().eq('id', id).then(() => {})
  }

  function removeJobSeries(seriesId) {
    setJobs(prev => prev.filter(j => j.seriesId !== seriesId))
    if (hasSupabase) supabase.from('jobs').delete().eq('series_id', seriesId).then(() => {})
  }

  // Creates one job, or — if recurrence is enabled — a whole dated series
  // sharing a seriesId, each a fully independent editable job record.
  function addJob({ title, clientId, start, end, recurrence }) {
    const durationDays = start && end ? daysBetween(start, end) : 0
    const dates = generateOccurrences(start, recurrence)
    const seriesId = dates.length > 1 ? crypto.randomUUID() : null
    const newJobs = dates.map(d => ({
      id: crypto.randomUUID(),
      estimateId: null,
      clientId,
      title,
      status: 'scheduled',
      start: d,
      end: end ? shiftDate(d, durationDays) : '',
      seriesId,
    }))
    setJobs(prev => [...newJobs, ...prev])
    if (hasSupabase) {
      supabase.from('jobs').insert(newJobs.map(j => ({
        id: j.id, estimate_id: j.estimateId, client_id: j.clientId, title: j.title,
        status: j.status, start_date: j.start || null, end_date: j.end || null, series_id: j.seriesId,
      }))).then(() => {})
    }
  }

  function removeInvoice(id) {
    setInvoices(prev => prev.filter(i => i.id !== id))
    if (activeInvoiceId === id) setActiveInvoiceId(null)
    if (hasSupabase) supabase.from('invoices').delete().eq('id', id).then(() => {})
  }

  function removeInvoiceSeries(seriesId) {
    setInvoices(prev => prev.filter(i => i.seriesId !== seriesId))
    if (hasSupabase) supabase.from('invoices').delete().eq('series_id', seriesId).then(() => {})
  }

  // Creates one invoice, or — if recurrence is enabled — a whole dated
  // series (e.g. a monthly service retainer), each its own editable
  // record starting with no line items — those are added next, in the
  // invoice editor (mirrors how a new estimate opens straight into its
  // editor). Record numbers are assigned in order within the batch so a
  // recurring series doesn't come out with duplicate numbers.
  function addInvoice({ clientId, issueDate, dueDate, recurrence }) {
    const client = clientById(clientId) || null
    const dueDelta = issueDate && dueDate ? daysBetween(issueDate, dueDate) : null
    const dates = generateOccurrences(issueDate, recurrence)
    const seriesId = dates.length > 1 ? crypto.randomUUID() : null
    let running = invoices
    const newInvoices = dates.map(d => {
      const recordNumber = nextRecordNumber('INV', running)
      const inv = {
        id: crypto.randomUUID(), estimateId: null, jobId: null, clientId,
        paymentStatus: 'unpaid',
        header: emptyHeader({
          recordNumber, client, issueDate: d,
          dueDate: dueDelta !== null ? shiftDate(d, dueDelta) : null,
        }),
        lineItems: [], markupPct: 20, taxRate: 4.2, terms: '',
        seriesId,
      }
      running = [...running, inv]
      return inv
    })
    setInvoices(prev => [...newInvoices, ...prev])
    if (hasSupabase) {
      supabase.from('invoices').insert(newInvoices.map(inv => ({
        id: inv.id, estimate_id: inv.estimateId, job_id: inv.jobId, client_id: inv.clientId,
        payment_status: inv.paymentStatus, header: inv.header, line_items: inv.lineItems,
        markup_pct: inv.markupPct, tax_rate: inv.taxRate, terms: inv.terms, series_id: inv.seriesId,
      }))).then(() => {})
    }
    if (newInvoices.length === 1) {
      setActiveInvoiceId(newInvoices[0].id)
      setTab('invoices')
    }
  }

  function addTransaction(t) {
    const withId = { ...t, id: t.id || crypto.randomUUID() }
    setTransactions(prev => [withId, ...prev])
    if (hasSupabase) {
      supabase.from('transactions').insert({
        id: withId.id, type: withId.type, category: withId.category,
        vendor_or_source: withId.vendorOrSource, amount: withId.amount,
        date: withId.date, due_date: withId.dueDate || null, status: withId.status,
        receipt_image: withId.receiptImage, notes: withId.notes, client_id: withId.clientId,
        series_id: withId.seriesId || null,
      }).then(() => {})
    }
  }

  // Creates one bill, or -- if recurrence is enabled -- a whole dated
  // series sharing a seriesId, each a fully independent editable bill.
  function addBillSeries({ vendorOrSource, category, amount, date, dueDate, notes, recurrence }) {
    const dueDelta = date && dueDate ? daysBetween(date, dueDate) : null
    const dates = generateOccurrences(date, recurrence)
    const seriesId = dates.length > 1 ? crypto.randomUUID() : null
    const newBills = dates.map(d => ({
      id: crypto.randomUUID(), type: 'bill', category, vendorOrSource,
      amount: Number(amount) || 0, date: d,
      dueDate: dueDelta !== null ? shiftDate(d, dueDelta) : '',
      status: 'unpaid', notes, clientId: null, seriesId,
    }))
    setTransactions(prev => [...newBills, ...prev])
    if (hasSupabase) {
      supabase.from('transactions').insert(newBills.map(b => ({
        id: b.id, type: b.type, category: b.category, vendor_or_source: b.vendorOrSource,
        amount: b.amount, date: b.date, due_date: b.dueDate || null, status: b.status,
        notes: b.notes, client_id: b.clientId, series_id: b.seriesId,
      }))).then(() => {})
    }
  }

  function updateTransaction(id, partial) {
    setTransactions(prev => prev.map(t => t.id === id ? { ...t, ...partial } : t))
    if (hasSupabase) {
      supabase.from('transactions').update(partial).eq('id', id).then(() => {})
    }
  }

  function removeTransaction(id) {
    setTransactions(prev => prev.filter(t => t.id !== id))
    if (hasSupabase) supabase.from('transactions').delete().eq('id', id).then(() => {})
  }

  function removeTransactionSeries(seriesId) {
    setTransactions(prev => prev.filter(t => t.seriesId !== seriesId))
    if (hasSupabase) supabase.from('transactions').delete().eq('series_id', seriesId).then(() => {})
  }

  function addEvent(event) {
    const withId = { ...event, id: crypto.randomUUID() }
    setEvents(prev => [...prev, withId])
    if (hasSupabase) {
      supabase.from('events').insert({
        id: withId.id, title: withId.title, date: withId.date,
        time: withId.time || null, client_id: withId.clientId || null,
      }).then(() => {})
    }
  }

  function removeEvent(id) {
    setEvents(prev => prev.filter(e => e.id !== id))
    if (hasSupabase) supabase.from('events').delete().eq('id', id).then(() => {})
  }

  function addTodo(todo) {
    const withId = { ...todo, id: crypto.randomUUID() }
    setTodos(prev => [...prev, withId])
    if (hasSupabase) {
      supabase.from('todos').insert({
        id: withId.id, title: withId.title, done: withId.done,
        due_date: withId.dueDate || null, priority: withId.priority,
      }).then(() => {})
    }
  }

  function updateTodo(id, partial) {
    setTodos(prev => prev.map(t => t.id === id ? { ...t, ...partial } : t))
    if (hasSupabase) {
      const row = {}
      if ('title' in partial) row.title = partial.title
      if ('done' in partial) row.done = partial.done
      if ('dueDate' in partial) row.due_date = partial.dueDate || null
      if ('priority' in partial) row.priority = partial.priority
      supabase.from('todos').update(row).eq('id', id).then(() => {})
    }
  }

  function removeTodo(id) {
    setTodos(prev => prev.filter(t => t.id !== id))
    if (hasSupabase) supabase.from('todos').delete().eq('id', id).then(() => {})
  }

  function newEstimate() {
    const client = clients[0] || null
    const est = {
      id: crypto.randomUUID(),
      clientId: client?.id ?? null,
      title: 'Untitled estimate',
      status: 'draft',
      header: emptyHeader({ recordNumber: nextRecordNumber('EST', estimates), client }),
      lineItems: [emptyLineItem('Materials'), emptyLineItem('Labor')],
      markupPct: 20,
      taxRate: 4.2,
      terms: '',
    }
    setEstimates(prev => [est, ...prev])
    setActiveEstimateId(est.id)
    setTab('estimates')
  }

  function convertToJob(est) {
    const job = {
      id: crypto.randomUUID(), estimateId: est.id, clientId: est.clientId,
      title: est.title, status: 'scheduled', start: '', end: '', seriesId: null,
    }
    setJobs(prev => [job, ...prev])
    if (hasSupabase) {
      supabase.from('jobs').insert({
        id: job.id, estimate_id: job.estimateId, client_id: job.clientId,
        title: job.title, status: job.status, start_date: null, end_date: null, series_id: null,
      }).then(() => {})
    }
    setTab('jobs')
  }

  // Copies the estimate's line items, markup, tax, and terms straight
  // into a new invoice, so "what we're billing for" starts out identical
  // to "what we quoted" — editable afterward like any other invoice.
  function convertToInvoice(est) {
    const inv = {
      id: crypto.randomUUID(), estimateId: est.id, jobId: null, clientId: est.clientId,
      paymentStatus: 'unpaid',
      header: emptyHeader({ recordNumber: nextRecordNumber('INV', invoices), client: est.header.client }),
      lineItems: est.lineItems, markupPct: est.markupPct, taxRate: est.taxRate, terms: est.terms,
      seriesId: null,
    }
    setInvoices(prev => [inv, ...prev])
    if (hasSupabase) {
      supabase.from('invoices').insert({
        id: inv.id, estimate_id: inv.estimateId, job_id: inv.jobId, client_id: inv.clientId,
        payment_status: inv.paymentStatus, header: inv.header, line_items: inv.lineItems,
        markup_pct: inv.markupPct, tax_rate: inv.taxRate, terms: inv.terms, series_id: inv.seriesId,
      }).then(() => {})
    }
    setActiveInvoiceId(inv.id)
    setTab('invoices')
  }

  function requestDelete(kind, id, label) {
    setConfirmDelete({ kind, id, label })
  }

  function performDelete() {
    if (!confirmDelete) return
    const { kind, id } = confirmDelete
    if (kind === 'client') removeClient(id)
    if (kind === 'estimate') removeEstimate(id)
    if (kind === 'job') removeJob(id)
    if (kind === 'job-series') removeJobSeries(id)
    if (kind === 'invoice') removeInvoice(id)
    if (kind === 'invoice-series') removeInvoiceSeries(id)
    if (kind === 'transaction-series') removeTransactionSeries(id)
    setConfirmDelete(null)
  }

  const activeEstimate = estimates.find(e => e.id === activeEstimateId) || null
  const currentLabel = NAV.flatMap(s => s.items).find(i => i.key === tab)?.label ?? ''

  if (hasSupabase && authLoading) return <div className="login-screen">Loading…</div>
  if (hasSupabase && !session) return <Login />
  if (hasSupabase && dataLoading) return <div className="login-screen">Loading your workspace…</div>

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">FieldLedger <small>ERP</small></div>
        {NAV.map(section => (
          <div key={section.section}>
            <div className="nav-section-label">{section.section}</div>
            {section.items.map(n => (
              <button
                key={n.key}
                className={`nav-item ${tab === n.key ? 'active' : ''}`}
                onClick={() => {
                  setTab(n.key)
                  if (n.key !== 'estimates') setActiveEstimateId(null)
                  if (n.key !== 'invoices') setActiveInvoiceId(null)
                }}
              >
                <span className="nav-icon">{n.icon}</span>{n.label}
              </button>
            ))}
          </div>
        ))}
        <div className="sidebar-footer">
          <span className="mode-pill">{hasSupabase ? '● live · supabase' : '○ demo mode'}</span>
          <div style={{ marginTop: 10 }}>
            {hasSupabase
              ? 'Shared workspace — everyone signed in sees the same data.'
              : 'Add VITE_SUPABASE_URL / ANON_KEY in .env to persist data.'}
          </div>
          {hasSupabase && session && (
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 11.5, wordBreak: 'break-all' }}>{session.user.email}</div>
              <button className="btn btn-ghost btn-sm" style={{ marginTop: 8 }} onClick={() => supabase.auth.signOut()}>Sign out</button>
            </div>
          )}
        </div>
      </aside>

      <main className="main">
        {tab === 'dashboard' && (
          <Dashboard
            estimates={estimates} jobs={jobs} invoices={invoices} transactions={transactions}
            clientById={clientById}
            onNewEstimate={newEstimate}
            onOpenEstimate={(id) => { setActiveEstimateId(id); setTab('estimates') }}
          />
        )}

        {tab === 'estimates' && (
          <Estimates
            estimates={estimates} clients={clients} clientById={clientById} settings={settings}
            activeEstimate={activeEstimate}
            onOpen={(id) => setActiveEstimateId(id)}
            onBack={() => setActiveEstimateId(null)}
            onNew={newEstimate}
            onChange={upsertEstimate}
            onDelete={(id, title) => requestDelete('estimate', id, title)}
            onConvertJob={convertToJob}
            onConvertInvoice={convertToInvoice}
            onDownload={(est) => generateEstimatePDF(est, settings)}
          />
        )}

        {tab === 'jobs' && (
          <Jobs
            jobs={jobs} clients={clients} clientById={clientById} estimates={estimates}
            addJob={addJob} updateJob={updateJob}
            onDelete={(id, title) => requestDelete('job', id, title)}
            onDeleteSeries={(seriesId, title) => requestDelete('job-series', seriesId, title)}
          />
        )}

        {tab === 'invoices' && (
          <Invoices
            invoices={invoices} clients={clients} clientById={clientById} settings={settings}
            activeInvoice={invoices.find(i => i.id === activeInvoiceId) || null}
            onOpen={(id) => setActiveInvoiceId(id)}
            onBack={() => setActiveInvoiceId(null)}
            onCreate={addInvoice}
            onChange={upsertInvoice}
            onDelete={(id, label) => requestDelete('invoice', id, label)}
            onDeleteSeries={(seriesId, label) => requestDelete('invoice-series', seriesId, label)}
            onDownload={(inv) => generateInvoicePDF(inv, settings)}
          />
        )}

        {tab === 'clients' && (
          <Clients
            clients={clients} estimates={estimates}
            onAddClick={() => { setEditingClient(null); setClientModalOpen(true) }}
            onEditClick={(c) => { setEditingClient(c); setClientModalOpen(true) }}
            onDelete={(id, name) => requestDelete('client', id, name)}
          />
        )}

        {tab === 'schedule' && (
          <Schedule events={events} addEvent={addEvent} removeEvent={removeEvent} jobs={jobs} transactions={transactions} clientById={clientById} />
        )}

        {tab === 'todos' && <Todos todos={todos} addTodo={addTodo} updateTodo={updateTodo} removeTodo={removeTodo} />}

        {tab === 'map' && <MapPage clients={clients} />}

        {tab === 'transactions' && (
          <Transactions
            transactions={transactions} addTransaction={addTransaction} addBillSeries={addBillSeries}
            updateTransaction={updateTransaction} removeTransaction={removeTransaction}
            onDeleteSeries={(seriesId, label) => requestDelete('transaction-series', seriesId, label)}
            clientById={clientById}
          />
        )}
        {tab === 'receipts' && (
          <Receipts transactions={transactions} addTransaction={addTransaction} updateTransaction={updateTransaction}
            removeTransaction={removeTransaction} />
        )}
        {tab === 'reports' && <Reports transactions={transactions} />}

        {tab === 'settings' && <Settings settings={settings} setSettings={setSettings} />}
      </main>

      {clientModalOpen && (
        <ClientModal
          initial={editingClient}
          onClose={() => { setClientModalOpen(false); setEditingClient(null) }}
          onSave={(c) => {
            if (editingClient) updateClient(editingClient.id, c)
            else addClient(c)
            setClientModalOpen(false)
            setEditingClient(null)
          }}
        />
      )}

      {confirmDelete && (
        <ConfirmDialog
          title={confirmDelete.kind.includes('series') ? 'Delete this entire series?' : `Delete this ${confirmDelete.kind}?`}
          message={
            confirmDelete.kind.includes('series')
              ? `Every occurrence of "${confirmDelete.label || 'this series'}" will be permanently removed${hasSupabase ? ' from your Supabase project' : ''}. This can't be undone.`
              : `"${confirmDelete.label || 'This item'}" will be permanently removed${hasSupabase ? ' from your Supabase project' : ''}. This can't be undone.`
          }
          onCancel={() => setConfirmDelete(null)}
          onConfirm={performDelete}
        />
      )}
    </div>
  )
}

/* ----------------------------- Dashboard ----------------------------- */

function Dashboard({ estimates, jobs, invoices, transactions, clientById, onNewEstimate, onOpenEstimate }) {
  const totals = estimates.map(e => {
    const t = computeDocumentTotals(e.lineItems, e)
    const marginPct = t.pricedSubtotal > 0 ? (t.profit / t.pricedSubtotal) * 100 : 0
    return { e, t: { ...t, marginPct } }
  })
  const pipelineValue = totals.filter(x => x.e.status !== 'declined').reduce((s, x) => s + x.t.total, 0)
  const won = totals.filter(x => x.e.status === 'accepted')
  const sentOrAccepted = totals.filter(x => ['sent', 'accepted', 'declined'].includes(x.e.status))
  const winRate = sentOrAccepted.length ? Math.round((won.length / sentOrAccepted.length) * 100) : 0
  const openInvoices = invoices.filter(i => i.paymentStatus !== 'paid').length
  const activeJobs = jobs.filter(j => j.status !== 'complete').length
  const pl = computePL(transactions)

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="Your quoting-to-cash overview, in one place."
        action={<button className="btn btn-amber" onClick={onNewEstimate}>+ New estimate</button>}
      />

      <div className="stat-grid">
        <Stat label="Pipeline value" value={formatCurrency(pipelineValue)} color="var(--ink-700)" />
        <Stat label="Win rate" value={`${winRate}%`} color="var(--green)" />
        <Stat label="Open invoices" value={openInvoices} color="var(--amber-dark)" />
        <Stat label="Active jobs" value={activeJobs} color="var(--red)" />
      </div>

      <div className="stat-grid">
        <Stat label="Income (all time)" value={formatCurrency(pl.income)} color="var(--green)" />
        <Stat label="Expenses + bills paid" value={formatCurrency(pl.totalExpenses)} color="var(--red)" />
        <Stat label="Unpaid bills" value={formatCurrency(pl.billsUnpaid)} color="var(--amber-dark)" />
        <Stat label="Net profit" value={formatCurrency(pl.netProfit)} color={pl.netProfit >= 0 ? 'var(--green)' : 'var(--red)'} />
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <strong style={{ fontFamily: 'var(--font-display)', fontSize: 15 }}>Recent estimates</strong>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Client</th><th>Title</th><th>Status</th><th>Margin</th><th style={{ textAlign: 'right' }}>Total</th></tr>
            </thead>
            <tbody>
              {totals.slice(0, 6).map(({ e, t }) => (
                <tr key={e.id} style={{ cursor: 'pointer' }} onClick={() => onOpenEstimate(e.id)}>
                  <td>{clientById(e.clientId) ? clientLabel(clientById(e.clientId)) : '—'}</td>
                  <td>{e.title}</td>
                  <td><Badge status={e.status} /></td>
                  <td className="figure">{t.marginPct.toFixed(0)}%</td>
                  <td className="figure" style={{ textAlign: 'right' }}>{formatCurrency(t.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}

/* ----------------------------- Clients ----------------------------- */

function Clients({ clients, onAddClick, onEditClick, onDelete, estimates }) {
  return (
    <>
      <PageHeader
        title="Clients"
        subtitle="Everyone you've quoted, billed, or worked for."
        action={<button className="btn btn-amber" onClick={onAddClick}>+ Add client</button>}
      />
      <div className="card">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Business name</th><th>Contact name</th><th>Email</th><th>Phone</th><th>Address</th><th>Estimates</th><th></th></tr></thead>
            <tbody>
              {clients.map(c => (
                <tr key={c.id}>
                  <td><strong>{c.businessName || '—'}</strong></td>
                  <td>{c.contactName}</td>
                  <td>{c.email}</td>
                  <td className="figure">{c.phone}</td>
                  <td>{c.address}</td>
                  <td className="figure">{estimates.filter(e => e.clientId === c.id).length}</td>
                  <td>
                    <div className="row-actions">
                      <button className="btn btn-ghost btn-sm" onClick={() => onEditClick(c)}>Edit</button>
                      <button className="btn btn-danger-ghost btn-sm" onClick={() => onDelete(c.id, clientLabel(c))}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}

function ClientModal({ initial, onClose, onSave }) {
  const [form, setForm] = useState(initial
    ? { contactName: initial.contactName, businessName: initial.businessName || '', email: initial.email || '', phone: initial.phone || '', address: initial.address || '' }
    : { contactName: '', businessName: '', email: '', phone: '', address: '' })
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h2>{initial ? 'Edit client' : 'Add client'}</h2>
        <div className="field-row" style={{ gridTemplateColumns: '1fr', gap: 12 }}>
          <div className="field"><label>Contact name</label>
            <input value={form.contactName} onChange={e => setForm({ ...form, contactName: e.target.value })} /></div>
          <div className="field"><label>Business name <span style={{ fontWeight: 400 }}>(optional)</span></label>
            <input value={form.businessName} onChange={e => setForm({ ...form, businessName: e.target.value })} /></div>
          <div className="field"><label>Email</label>
            <input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
          <div className="field"><label>Phone</label>
            <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
          <div className="field"><label>Address</label>
            <input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Street, City, State" /></div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={!form.contactName} onClick={() => onSave(form)}>{initial ? 'Save changes' : 'Save client'}</button>
        </div>
      </div>
    </div>
  )
}
