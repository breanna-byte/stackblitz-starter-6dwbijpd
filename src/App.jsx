import { useEffect, useMemo, useState } from 'react'
import { supabase, hasSupabase } from './supabaseClient'
import { seedClients, seedEstimates, seedJobs, seedInvoices, seedTodos, seedEvents, seedTransactions } from './lib/seed'
import {
  emptyLineItem, linePrice,
  computeEstimateTotals, formatCurrency,
} from './lib/calc'
import { computePL } from './lib/finance'
import { defaultSettings, loadSettings, saveSettings } from './lib/businessSettings'
import { generateEstimatePDF, generateInvoicePDF } from './lib/pdf'
import { generateOccurrences, emptyRecurrence, daysBetween, shiftDate } from './lib/recurrence'
import {
  rowToClient, rowToEstimate, rowToJob, rowToInvoice,
  rowToTodo, rowToEvent, rowToTransaction, rowToSettings, settingsToRow, clientLabel,
} from './lib/db'
import { PageHeader, Stat, EmptyState, Badge, ConfirmDialog, STATUS_LABEL } from './components/ui'
import RecurrenceFields from './components/RecurrenceFields'
import Login from './components/Login'

import Schedule from './pages/Schedule'
import Todos from './pages/Todos'
import Receipts from './pages/Receipts'
import MapPage from './pages/MapPage'
import Income from './pages/Income'
import Expenses from './pages/Expenses'
import Bills from './pages/Bills'
import Reports from './pages/Reports'
import Settings from './pages/Settings'
import BankSync from './pages/BankSync'
import { rowToBankAccount } from './lib/bank'

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
    { key: 'income', label: 'Income', icon: '↑' },
    { key: 'expenses', label: 'Expenses', icon: '↓' },
    { key: 'bills', label: 'Bills', icon: '▤' },
    { key: 'receipts', label: 'Receipt Ledger', icon: '📷' },
    { key: 'bank', label: 'Bank Sync', icon: '🏦' },
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
  // No demo-mode fallback: bank sync requires the real Supabase backend
  // (Edge Functions + Teller), so this just stays empty in demo mode.
  const [bankAccounts, setBankAccounts] = useState([])
  const [activeEstimateId, setActiveEstimateId] = useState(null)
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
        setTodos([]); setEvents([]); setTransactions([]); setBankAccounts([])
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
      supabase.from('bank_accounts').select('*').order('created_at', { ascending: false }),
    ]).then(([c, es, j, inv, td, ev, tx, us, ba]) => {
      if (cancelled) return
      setClients((c.data || []).map(rowToClient))
      setEstimates((es.data || []).map(rowToEstimate))
      setJobs((j.data || []).map(rowToJob))
      setInvoices((inv.data || []).map(rowToInvoice))
      setTodos((td.data || []).map(rowToTodo))
      setEvents((ev.data || []).map(rowToEvent))
      setTransactions((tx.data || []).map(rowToTransaction))
      setSettings(rowToSettings(us.data, defaultSettings))
      setBankAccounts((ba.data || []).map(rowToBankAccount))
      setDataLoading(false)
    })
    return () => { cancelled = true }
  }, [session?.user?.id])

  // Re-pulled after connecting a new bank account or running a manual
  // sync, so the newly connected account / newly imported transactions
  // show up without a full page reload.
  async function refreshBankData() {
    const [tx, ba] = await Promise.all([
      supabase.from('transactions').select('*').order('date', { ascending: false }),
      supabase.from('bank_accounts').select('*').order('created_at', { ascending: false }),
    ])
    setTransactions((tx.data || []).map(rowToTransaction))
    setBankAccounts((ba.data || []).map(rowToBankAccount))
  }

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
        tax_rate: est.taxRate, global_discount: est.globalDiscount, items: est.items,
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
    if (hasSupabase) supabase.from('jobs').update(partial).eq('id', id).then(() => {})
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

  function updateInvoice(id, partial) {
    setInvoices(prev => prev.map(i => i.id === id ? { ...i, ...partial } : i))
    if (hasSupabase) supabase.from('invoices').update(partial).eq('id', id).then(() => {})
  }

  function removeInvoice(id) {
    setInvoices(prev => prev.filter(i => i.id !== id))
    if (hasSupabase) supabase.from('invoices').delete().eq('id', id).then(() => {})
  }

  function removeInvoiceSeries(seriesId) {
    setInvoices(prev => prev.filter(i => i.seriesId !== seriesId))
    if (hasSupabase) supabase.from('invoices').delete().eq('series_id', seriesId).then(() => {})
  }

  // Creates one invoice, or — if recurrence is enabled — a whole dated
  // series (e.g. a monthly service retainer), each its own editable record.
  function addInvoice({ clientId, issuedAt, dueAt, amount, depositPct, notes, recurrence }) {
    const dueDelta = issuedAt && dueAt ? daysBetween(issuedAt, dueAt) : null
    const dates = generateOccurrences(issuedAt, recurrence)
    const seriesId = dates.length > 1 ? crypto.randomUUID() : null
    const newInvoices = dates.map((d, i) => ({
      id: crypto.randomUUID(),
      estimateId: null,
      jobId: null,
      clientId,
      status: 'draft',
      issuedAt: d,
      dueAt: dueDelta !== null ? shiftDate(d, dueDelta) : '',
      amount: Number(amount) || 0,
      depositPct: depositPct || 0,
      notes,
      seriesId,
    }))
    setInvoices(prev => [...newInvoices, ...prev])
    if (hasSupabase) {
      supabase.from('invoices').insert(newInvoices.map(inv => ({
        id: inv.id, estimate_id: inv.estimateId, job_id: inv.jobId, client_id: inv.clientId,
        status: inv.status, issued_at: inv.issuedAt, due_at: inv.dueAt || null,
        amount: inv.amount, deposit_pct: inv.depositPct, series_id: inv.seriesId,
      }))).then(() => {})
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
      }).then(() => {})
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
    const est = {
      id: crypto.randomUUID(),
      clientId: clients[0]?.id ?? null,
      title: 'Untitled estimate',
      status: 'draft',
      taxRate: 4.2,
      globalDiscount: 0,
      createdAt: new Date().toISOString().slice(0, 10),
      items: [emptyLineItem('material'), emptyLineItem('labor')],
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

  function convertToInvoice(est) {
    const inv = {
      id: crypto.randomUUID(), estimateId: est.id, jobId: null, clientId: est.clientId,
      status: 'draft', issuedAt: new Date().toISOString().slice(0, 10), dueAt: '', amount: null, depositPct: 0, seriesId: null,
    }
    setInvoices(prev => [inv, ...prev])
    if (hasSupabase) {
      supabase.from('invoices').insert({
        id: inv.id, estimate_id: inv.estimateId, job_id: inv.jobId, client_id: inv.clientId,
        status: inv.status, issued_at: inv.issuedAt, due_at: null, amount: inv.amount, deposit_pct: inv.depositPct, series_id: null,
      }).then(() => {})
    }
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
                onClick={() => { setTab(n.key); if (n.key !== 'estimates') setActiveEstimateId(null) }}
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

        {tab === 'estimates' && !activeEstimate && (
          <EstimateList
            estimates={estimates} clientById={clientById}
            onOpen={(id) => setActiveEstimateId(id)}
            onNew={newEstimate}
            onDelete={(id, title) => requestDelete('estimate', id, title)}
            onDownload={(est) => generateEstimatePDF(est, clientById(est.clientId), settings)}
          />
        )}

        {tab === 'estimates' && activeEstimate && (
          <EstimateBuilder
            estimate={activeEstimate}
            clients={clients}
            settings={settings}
            onChange={upsertEstimate}
            onBack={() => setActiveEstimateId(null)}
            onConvertJob={convertToJob}
            onConvertInvoice={convertToInvoice}
            onDelete={() => requestDelete('estimate', activeEstimate.id, activeEstimate.title)}
          />
        )}

        {tab === 'jobs' && (
          <Jobs
            jobs={jobs} clients={clients} clientById={clientById}
            addJob={addJob} updateJob={updateJob}
            onDelete={(id, title) => requestDelete('job', id, title)}
            onDeleteSeries={(seriesId, title) => requestDelete('job-series', seriesId, title)}
          />
        )}

        {tab === 'invoices' && (
          <Invoices
            invoices={invoices} estimates={estimates} clients={clients} clientById={clientById}
            addInvoice={addInvoice} updateInvoice={updateInvoice}
            onDelete={(id, label) => requestDelete('invoice', id, label)}
            onDeleteSeries={(seriesId, label) => requestDelete('invoice-series', seriesId, label)}
            settings={settings}
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

        {tab === 'income' && (
          <Income transactions={transactions} addTransaction={addTransaction} updateTransaction={updateTransaction}
            removeTransaction={removeTransaction} clientById={clientById} />
        )}
        {tab === 'expenses' && (
          <Expenses transactions={transactions} addTransaction={addTransaction} updateTransaction={updateTransaction}
            removeTransaction={removeTransaction} clientById={clientById} />
        )}
        {tab === 'bills' && (
          <Bills transactions={transactions} addTransaction={addTransaction} updateTransaction={updateTransaction}
            removeTransaction={removeTransaction} clientById={clientById} />
        )}
        {tab === 'receipts' && (
          <Receipts transactions={transactions} addTransaction={addTransaction} updateTransaction={updateTransaction}
            removeTransaction={removeTransaction} />
        )}
        {tab === 'bank' && (
          <BankSync bankAccounts={bankAccounts} onConnected={refreshBankData} onSynced={refreshBankData} />
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
  const totals = estimates.map(e => ({ e, t: computeEstimateTotals(e.items, e) }))
  const pipelineValue = totals.filter(x => x.e.status !== 'declined').reduce((s, x) => s + x.t.total, 0)
  const won = totals.filter(x => x.e.status === 'accepted')
  const sentOrAccepted = totals.filter(x => ['sent', 'accepted', 'declined'].includes(x.e.status))
  const winRate = sentOrAccepted.length ? Math.round((won.length / sentOrAccepted.length) * 100) : 0
  const openInvoices = invoices.filter(i => i.status !== 'paid').length
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

/* ----------------------------- Estimates ----------------------------- */

function EstimateList({ estimates, clientById, onOpen, onNew, onDelete, onDownload }) {
  return (
    <>
      <PageHeader
        title="Estimates & Bids"
        subtitle="Build a quote and watch price, margin, and tax calculate live."
        action={<button className="btn btn-amber" onClick={onNew}>+ New estimate</button>}
      />

      {estimates.length === 0 ? (
        <EmptyState title="No estimates yet" subtitle="Create your first estimate to start quoting jobs." />
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Client</th><th>Title</th><th>Created</th><th>Status</th><th style={{ textAlign: 'right' }}>Total</th><th></th></tr>
              </thead>
              <tbody>
                {estimates.map(e => {
                  const t = computeEstimateTotals(e.items, e)
                  return (
                    <tr key={e.id}>
                      <td>{clientById(e.clientId) ? clientLabel(clientById(e.clientId)) : '—'}</td>
                      <td>{e.title}</td>
                      <td className="figure">{e.createdAt}</td>
                      <td><Badge status={e.status} /></td>
                      <td className="figure" style={{ textAlign: 'right' }}>{formatCurrency(t.total)}</td>
                      <td>
                        <div className="row-actions">
                          <button className="btn btn-ghost btn-sm" onClick={() => onDownload(e)}>PDF</button>
                          <button className="btn btn-ghost btn-sm" onClick={() => onOpen(e.id)}>Open</button>
                          <button className="btn btn-danger-ghost btn-sm" onClick={() => onDelete(e.id, e.title)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  )
}

function EstimateBuilder({ estimate, clients, settings, onChange, onBack, onConvertJob, onConvertInvoice, onDelete }) {
  const [pulse, setPulse] = useState(false)
  const totals = useMemo(() => computeEstimateTotals(estimate.items, estimate), [estimate])

  function patch(partial) {
    onChange({ ...estimate, ...partial })
    setPulse(true)
    setTimeout(() => setPulse(false), 350)
  }

  function updateItem(id, partial) {
    patch({ items: estimate.items.map(it => it.id === id ? { ...it, ...partial } : it) })
  }

  function removeItem(id) {
    patch({ items: estimate.items.filter(it => it.id !== id) })
  }

  function addItem(type) {
    patch({ items: [...estimate.items, emptyLineItem(type)] })
  }

  return (
    <>
      <div className="topbar">
        <div>
          <button className="btn btn-ghost btn-sm" style={{ marginBottom: 10 }} onClick={onBack}>← All estimates</button>
          <input
            className="page-title"
            style={{ border: 'none', background: 'transparent', padding: 0, fontFamily: 'var(--font-display)', width: '100%' }}
            value={estimate.title}
            onChange={e => patch({ title: e.target.value })}
          />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost" onClick={() => generateEstimatePDF(estimate, clients.find(c => c.id === estimate.clientId), settings, { notes: estimate.notes || undefined })}>⬇ Download PDF</button>
          <button className="btn btn-ghost" onClick={() => onConvertJob(estimate)}>Convert to job</button>
          <button className="btn btn-primary" onClick={() => onConvertInvoice(estimate)}>Convert to invoice</button>
          <button className="btn btn-danger-ghost" onClick={onDelete}>Delete</button>
        </div>
      </div>

      <div className="field-row" style={{ gridTemplateColumns: '1fr 1fr 1fr', marginBottom: 18 }}>
        <div className="field">
          <label>Client</label>
          <select value={estimate.clientId ?? ''} onChange={e => patch({ clientId: e.target.value })}>
            {clients.map(c => <option key={c.id} value={c.id}>{clientLabel(c)}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Status</label>
          <select value={estimate.status} onChange={e => patch({ status: e.target.value })}>
            {['draft', 'sent', 'accepted', 'declined'].map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Tax rate (%) — applied to taxable materials</label>
          <input type="number" step="0.1" className="figure" value={estimate.taxRate}
            onChange={e => patch({ taxRate: Number(e.target.value) })} />
        </div>
      </div>

      <div className="builder-grid">
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
            <strong style={{ fontFamily: 'var(--font-display)', fontSize: 15 }}>Line items</strong>
          </div>
          <div className="table-wrap">
            <table className="line-items-table">
              <thead>
                <tr>
                  <th style={{ width: '28%' }}>Description</th>
                  <th style={{ width: 80 }}>Type</th>
                  <th style={{ width: 70 }}>Qty / hrs</th>
                  <th style={{ width: 100 }}>Unit cost</th>
                  <th style={{ width: 70 }}>Markup %</th>
                  <th style={{ width: 60 }}>Tax</th>
                  <th style={{ width: 100, textAlign: 'right' }}>Price</th>
                  <th style={{ width: 30 }}></th>
                </tr>
              </thead>
              <tbody>
                {estimate.items.map(it => (
                  <tr key={it.id}>
                    <td><input type="text" placeholder="What is this line for?" value={it.description}
                      onChange={e => updateItem(it.id, { description: e.target.value })} /></td>
                    <td>
                      <select value={it.type} onChange={e => updateItem(it.id, { type: e.target.value })}>
                        <option value="material">Material</option>
                        <option value="labor">Labor</option>
                      </select>
                    </td>
                    <td><input type="number" value={it.qty} onChange={e => updateItem(it.id, { qty: e.target.value })} /></td>
                    <td><input type="number" value={it.unitCost} onChange={e => updateItem(it.id, { unitCost: e.target.value })} /></td>
                    <td><input type="number" value={it.markup} onChange={e => updateItem(it.id, { markup: e.target.value })} /></td>
                    <td style={{ textAlign: 'center' }}>
                      <input type="checkbox" checked={it.taxable} onChange={e => updateItem(it.id, { taxable: e.target.checked })} />
                    </td>
                    <td className="line-total" style={{ textAlign: 'right' }}>{formatCurrency(linePrice(it))}</td>
                    <td><button className="icon-btn" onClick={() => removeItem(it.id)} title="Remove line">✕</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button className="add-row-btn" onClick={() => addItem('material')}>+ Add material line</button>
            <button className="add-row-btn" onClick={() => addItem('labor')}>+ Add labor line</button>
          </div>

          <div className="field-row" style={{ gridTemplateColumns: '1fr', marginTop: 18 }}>
            <div className="field">
              <label>Discount on subtotal (%)</label>
              <input type="number" step="1" className="figure" style={{ maxWidth: 140 }}
                value={estimate.globalDiscount} onChange={e => patch({ globalDiscount: Number(e.target.value) })} />
            </div>
          </div>

          <div className="field-row" style={{ gridTemplateColumns: '1fr', marginTop: 12 }}>
            <div className="field">
              <label>PDF terms for this estimate (optional — overrides your default terms in Settings)</label>
              <textarea rows={2} placeholder={settings.estimateTerms} value={estimate.notes || ''}
                onChange={e => patch({ notes: e.target.value })} />
            </div>
          </div>
        </div>

        <div className="ticker">
          <div className="ticker-title">Auto price calculator</div>
          <div className="ticker-row"><span>Cost (materials + labor)</span><span>{formatCurrency(totals.totalCost)}</span></div>
          <div className="ticker-row"><span>Subtotal (customer price)</span><span>{formatCurrency(totals.subtotal)}</span></div>
          {estimate.globalDiscount > 0 && (
            <div className="ticker-row"><span>Discount ({estimate.globalDiscount}%)</span><span>-{formatCurrency(totals.discountAmt)}</span></div>
          )}
          <div className="ticker-row"><span>Tax ({estimate.taxRate}%)</span><span>{formatCurrency(totals.taxAmt)}</span></div>
          <div className="ticker-total">
            <span>Quote total</span>
            <span className={`amt ${pulse ? 'pulse' : ''}`}>{formatCurrency(totals.total)}</span>
          </div>
          <div className="margin-note">
            Estimated profit {formatCurrency(totals.profit)} · {totals.marginPct.toFixed(1)}% margin on this job.
            Adjust markup per line to hit your target margin before you send it.
          </div>
        </div>
      </div>
    </>
  )
}

/* ----------------------------- Jobs ----------------------------- */

function Jobs({ jobs, clients, clientById, addJob, updateJob, onDelete, onDeleteSeries }) {
  const [editingJob, setEditingJob] = useState(null)
  const [creating, setCreating] = useState(false)

  return (
    <>
      <PageHeader
        title="Jobs"
        subtitle="Schedule and track work through completion."
        action={<button className="btn btn-amber" onClick={() => setCreating(true)}>+ New job</button>}
      />
      {jobs.length === 0 ? (
        <EmptyState title="No jobs scheduled" subtitle="Convert an accepted estimate into a job, or create one directly." />
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead><tr><th>Client</th><th>Job</th><th>Start</th><th>End</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {jobs.map(j => (
                  <tr key={j.id}>
                    <td>{clientById(j.clientId) ? clientLabel(clientById(j.clientId)) : '—'}</td>
                    <td>{j.title}{j.seriesId && <span className="series-badge">↻ recurring</span>}</td>
                    <td className="figure">{j.start || '—'}</td>
                    <td className="figure">{j.end || '—'}</td>
                    <td>
                      <select value={j.status} onChange={e => updateJob(j.id, { status: e.target.value })}
                        style={{ border: 'none', background: 'transparent', fontWeight: 600, fontSize: 13 }}>
                        {['scheduled', 'in_progress', 'complete'].map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                      </select>
                    </td>
                    <td>
                      <div className="row-actions">
                        <button className="btn btn-ghost btn-sm" onClick={() => setEditingJob(j)}>Edit</button>
                        <button className="btn btn-danger-ghost btn-sm" onClick={() => onDelete(j.id, j.title)}>Delete</button>
                        {j.seriesId && (
                          <button className="btn btn-danger-ghost btn-sm" onClick={() => onDeleteSeries(j.seriesId, j.title)}>Delete series</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {editingJob && (
        <JobModal
          job={editingJob}
          clients={clients}
          onClose={() => setEditingJob(null)}
          onSave={(partial) => { updateJob(editingJob.id, partial); setEditingJob(null) }}
        />
      )}

      {creating && (
        <JobModal
          clients={clients}
          onClose={() => setCreating(false)}
          onSave={(form) => { addJob(form); setCreating(false) }}
        />
      )}
    </>
  )
}

function JobModal({ job, clients, onClose, onSave }) {
  const isEdit = Boolean(job)
  const [form, setForm] = useState(isEdit
    ? { title: job.title, clientId: job.clientId, start: job.start || '', end: job.end || '' }
    : { title: '', clientId: clients[0]?.id ?? '', start: '', end: '' })
  const [recurrence, setRecurrence] = useState(emptyRecurrence())

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h2>{isEdit ? 'Edit job' : 'New job'}</h2>
        <div className="field-row" style={{ gridTemplateColumns: '1fr', gap: 12 }}>
          <div className="field"><label>Job title</label>
            <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
          <div className="field"><label>Client</label>
            <select value={form.clientId ?? ''} onChange={e => setForm({ ...form, clientId: e.target.value })}>
              {clients.map(c => <option key={c.id} value={c.id}>{clientLabel(c)}</option>)}
            </select>
          </div>
          <div className="field-row" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div className="field"><label>Start date</label>
              <input type="date" value={form.start} onChange={e => setForm({ ...form, start: e.target.value })} /></div>
            <div className="field"><label>End date</label>
              <input type="date" value={form.end} onChange={e => setForm({ ...form, end: e.target.value })} /></div>
          </div>
          {!isEdit && (
            <RecurrenceFields recurrence={recurrence} onChange={setRecurrence} disabled={!form.start} />
          )}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={!form.title || !form.clientId}
            onClick={() => onSave(isEdit ? form : { ...form, recurrence })}>
            {isEdit ? 'Save job' : 'Create job'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ----------------------------- Invoices ----------------------------- */

function Invoices({ invoices, estimates, clients, clientById, addInvoice, updateInvoice, onDelete, onDeleteSeries, settings }) {
  const [editingInvoice, setEditingInvoice] = useState(null)
  const [creating, setCreating] = useState(false)

  function markPaid(id) {
    updateInvoice(id, { status: 'paid' })
  }

  return (
    <>
      <PageHeader
        title="Invoices"
        subtitle="Track what's owed, sent, and paid."
        action={<button className="btn btn-amber" onClick={() => setCreating(true)}>+ New invoice</button>}
      />
      {invoices.length === 0 ? (
        <EmptyState title="No invoices yet" subtitle="Convert an estimate to an invoice, or create one directly." />
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead><tr><th>Client</th><th>Issued</th><th>Due</th><th>Status</th><th style={{ textAlign: 'right' }}>Amount</th><th></th></tr></thead>
              <tbody>
                {invoices.map(inv => {
                  const est = estimates.find(e => e.id === inv.estimateId)
                  const total = est ? computeEstimateTotals(est.items, est).total : (inv.amount ?? 0)
                  const client = clientById(inv.clientId)
                  return (
                    <tr key={inv.id}>
                      <td>{client ? clientLabel(client) : '—'}{inv.seriesId && <span className="series-badge">↻ recurring</span>}</td>
                      <td className="figure">{inv.issuedAt}</td>
                      <td className="figure">{inv.dueAt || '—'}</td>
                      <td><Badge status={inv.status} /></td>
                      <td className="figure" style={{ textAlign: 'right' }}>{formatCurrency(total)}</td>
                      <td>
                        <div className="row-actions">
                          <button className="btn btn-ghost btn-sm" onClick={() => generateInvoicePDF(inv, est, client, settings, total, { notes: inv.notes || undefined })}>PDF</button>
                          {inv.status !== 'paid' && (
                            <button className="btn btn-ghost btn-sm" onClick={() => markPaid(inv.id)}>Mark paid</button>
                          )}
                          <button className="btn btn-ghost btn-sm" onClick={() => setEditingInvoice(inv)}>Edit</button>
                          <button className="btn btn-danger-ghost btn-sm" onClick={() => onDelete(inv.id, client ? clientLabel(client) : 'this invoice')}>Delete</button>
                          {inv.seriesId && (
                            <button className="btn btn-danger-ghost btn-sm" onClick={() => onDeleteSeries(inv.seriesId, client ? clientLabel(client) : 'this series')}>Delete series</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {editingInvoice && (
        <InvoiceModal
          invoice={editingInvoice}
          clients={clients}
          onClose={() => setEditingInvoice(null)}
          onSave={(partial) => { updateInvoice(editingInvoice.id, partial); setEditingInvoice(null) }}
        />
      )}

      {creating && (
        <InvoiceModal
          clients={clients}
          onClose={() => setCreating(false)}
          onSave={(form) => { addInvoice(form); setCreating(false) }}
        />
      )}
    </>
  )
}

function InvoiceModal({ invoice, clients, onClose, onSave }) {
  const isEdit = Boolean(invoice)
  const [form, setForm] = useState(isEdit
    ? {
        clientId: invoice.clientId, status: invoice.status, issuedAt: invoice.issuedAt || '',
        dueAt: invoice.dueAt || '', depositPct: invoice.depositPct || 0, notes: invoice.notes || '',
        amount: invoice.amount || 0,
      }
    : {
        clientId: clients[0]?.id ?? '', status: 'draft', issuedAt: new Date().toISOString().slice(0, 10),
        dueAt: '', depositPct: 0, notes: '', amount: 0,
      })
  const [recurrence, setRecurrence] = useState(emptyRecurrence())
  const noLinkedEstimate = !isEdit || !invoice.estimateId

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h2>{isEdit ? 'Edit invoice' : 'New invoice'}</h2>
        <div className="field-row" style={{ gridTemplateColumns: '1fr', gap: 12 }}>
          <div className="field"><label>Client</label>
            <select value={form.clientId ?? ''} onChange={e => setForm({ ...form, clientId: e.target.value })}>
              {clients.map(c => <option key={c.id} value={c.id}>{clientLabel(c)}</option>)}
            </select>
          </div>
          <div className="field-row" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div className="field"><label>Issued date</label>
              <input type="date" value={form.issuedAt} onChange={e => setForm({ ...form, issuedAt: e.target.value })} /></div>
            <div className="field"><label>Due date</label>
              <input type="date" value={form.dueAt} onChange={e => setForm({ ...form, dueAt: e.target.value })} /></div>
          </div>
          <div className="field-row" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div className="field"><label>Status</label>
              <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                {['draft', 'sent', 'paid', 'overdue'].map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
              </select>
            </div>
            <div className="field"><label>Deposit %</label>
              <input type="number" className="figure" value={form.depositPct} onChange={e => setForm({ ...form, depositPct: Number(e.target.value) })} /></div>
          </div>
          {noLinkedEstimate && (
            <div className="field"><label>Amount {isEdit && !invoice.estimateId ? '' : '(this invoice is not linked to an estimate)'}</label>
              <input type="number" step="0.01" className="figure" value={form.amount}
                onChange={e => setForm({ ...form, amount: Number(e.target.value) })} /></div>
          )}
          <div className="field"><label>PDF terms for this invoice (optional override)</label>
            <textarea rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
          {!isEdit && (
            <RecurrenceFields recurrence={recurrence} onChange={setRecurrence} disabled={!form.issuedAt} />
          )}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={!form.clientId}
            onClick={() => onSave(isEdit ? form : { ...form, recurrence })}>
            {isEdit ? 'Save invoice' : 'Create invoice'}
          </button>
        </div>
      </div>
    </div>
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
