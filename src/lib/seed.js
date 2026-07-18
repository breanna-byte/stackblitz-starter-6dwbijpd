export const seedClients = [
  { id: 'c1', contactName: 'Marisol Ortega', businessName: '', email: 'marisol.ortega@example.com', phone: '(970) 555-0148', address: '412 Willow Creek Dr, Fort Collins, CO' },
  { id: 'c2', contactName: 'Dan Whitfield', businessName: '', email: 'dan.whitfield@example.com', phone: '(970) 555-0193', address: '88 Timberline Rd, Loveland, CO' },
  { id: 'c3', contactName: 'Facilities Dept.', businessName: 'Greeley Union School District', email: 'facilities@example-gusd.org', phone: '(970) 555-0122', address: '1900 8th Ave, Greeley, CO' },
]

export const seedEstimates = [
  {
    id: 'e1', clientId: 'c1', title: 'Kitchen backsplash & outlet relocation', status: 'sent',
    header: {
      recordNumber: 'EST-0001', issueDate: '2026-06-28', dueDate: null,
      client: { contactName: 'Marisol Ortega', businessName: '', email: 'marisol.ortega@example.com', phone: '(970) 555-0148', address: '412 Willow Creek Dr, Fort Collins, CO' },
    },
    lineItems: [
      { id: 'i1', description: 'Subway tile, 10 sq ft box', unitType: 'box', qty: 6, unitCost: 42, category: 'Materials' },
      { id: 'i2', description: 'Thinset & grout', unitType: 'ea', qty: 1, unitCost: 65, category: 'Materials' },
      { id: 'i3', description: 'Tile install labor', unitType: 'hrs', qty: 14, unitCost: 38, category: 'Labor' },
      { id: 'i4', description: 'Electrician - outlet move', unitType: 'hrs', qty: 3, unitCost: 55, category: 'Labor' },
    ],
    markupPct: 30, taxRate: 4.2, terms: '',
  },
  {
    id: 'e2', clientId: 'c2', title: 'Deck rebuild - 320 sq ft', status: 'draft',
    header: {
      recordNumber: 'EST-0002', issueDate: '2026-07-02', dueDate: null,
      client: { contactName: 'Dan Whitfield', businessName: '', email: 'dan.whitfield@example.com', phone: '(970) 555-0193', address: '88 Timberline Rd, Loveland, CO' },
    },
    lineItems: [
      { id: 'i5', description: 'Pressure-treated joists & framing', unitType: 'lot', qty: 1, unitCost: 1180, category: 'Materials' },
      { id: 'i6', description: 'Composite decking boards', unitType: 'sq ft', qty: 320, unitCost: 6.2, category: 'Materials' },
      { id: 'i7', description: 'Demo + rebuild crew (2 workers)', unitType: 'hrs', qty: 40, unitCost: 42, category: 'Labor' },
    ],
    markupPct: 25, taxRate: 4.2, terms: '',
  },
  {
    id: 'e3', clientId: 'c3', title: 'Gym floor refinish - Building B', status: 'accepted',
    header: {
      recordNumber: 'EST-0003', issueDate: '2026-06-14', dueDate: null,
      client: { contactName: 'Facilities Dept.', businessName: 'Greeley Union School District', email: 'facilities@example-gusd.org', phone: '(970) 555-0122', address: '1900 8th Ave, Greeley, CO' },
    },
    lineItems: [
      { id: 'i8', description: 'Polyurethane finish, 5 gal', unitType: 'pail', qty: 4, unitCost: 210, category: 'Materials' },
      { id: 'i9', description: 'Sanding & refinish crew', unitType: 'hrs', qty: 60, unitCost: 40, category: 'Labor' },
    ],
    markupPct: 25, taxRate: 4.2, terms: '',
  },
]

export const seedJobs = [
  { id: 'j1', estimateId: 'e3', clientId: 'c3', title: 'Gym floor refinish - Building B', status: 'in_progress', start: '2026-07-06', end: '2026-07-11' },
  { id: 'j2', estimateId: null, clientId: 'c2', title: 'Fence repair - north property line', status: 'scheduled', start: '2026-07-15', end: '2026-07-16' },
]

export const seedInvoices = [
  {
    id: 'v1', estimateId: 'e3', jobId: 'j1', clientId: 'c3', paymentStatus: 'unpaid', seriesId: null,
    header: {
      recordNumber: 'INV-0001', issueDate: '2026-07-01', dueDate: '2026-07-15',
      client: { contactName: 'Facilities Dept.', businessName: 'Greeley Union School District', email: 'facilities@example-gusd.org', phone: '(970) 555-0122', address: '1900 8th Ave, Greeley, CO' },
    },
    lineItems: [
      { id: 'i8v', description: 'Polyurethane finish, 5 gal', unitType: 'pail', qty: 4, unitCost: 210, category: 'Materials' },
      { id: 'i9v', description: 'Sanding & refinish crew', unitType: 'hrs', qty: 60, unitCost: 40, category: 'Labor' },
    ],
    markupPct: 25, taxRate: 4.2, terms: '',
  },
]

export const seedTodos = [
  { id: 't1', title: 'Order composite decking boards for Whitfield job', done: false, dueDate: '2026-07-11', priority: 'high' },
  { id: 't2', title: 'Call Marisol back about grout color', done: false, dueDate: '2026-07-10', priority: 'medium' },
  { id: 't3', title: 'Submit W-9 to Greeley Union School District', done: true, dueDate: '2026-07-05', priority: 'low' },
  { id: 't4', title: 'Pick up polyurethane restock from supplier', done: false, dueDate: '2026-07-14', priority: 'medium' },
]

export const seedEvents = [
  { id: 'ev1', title: 'Site walk - Ortega backsplash', date: '2026-07-13', time: '09:00', clientId: 'c1' },
  { id: 'ev2', title: 'Deliver decking materials', date: '2026-07-14', time: '13:00', clientId: 'c2' },
  { id: 'ev3', title: 'Invoice follow-up call', date: '2026-07-16', time: '10:30', clientId: 'c3' },
]

export const seedTransactions = [
  { id: 'x1', type: 'income', category: 'Job payment', vendorOrSource: 'Greeley Union School District', amount: 1850, date: '2026-07-01', dueDate: '', status: 'recorded', receiptImage: null, notes: 'Deposit for gym floor job', clientId: 'c3' },
  { id: 'x2', type: 'expense', category: 'Materials', vendorOrSource: 'Ace Hardware', amount: 214.37, date: '2026-07-03', dueDate: '', status: 'recorded', receiptImage: null, notes: '', clientId: null },
  { id: 'x3', type: 'expense', category: 'Fuel', vendorOrSource: 'Shell', amount: 68.2, date: '2026-07-05', dueDate: '', status: 'recorded', receiptImage: null, notes: '', clientId: null },
  { id: 'x4', type: 'bill', category: 'Insurance', vendorOrSource: 'Progressive Commercial', amount: 312.5, date: '2026-07-01', dueDate: '2026-07-20', status: 'unpaid', receiptImage: null, notes: 'General liability, monthly', clientId: null },
  { id: 'x5', type: 'bill', category: 'Equipment lease', vendorOrSource: 'United Rentals', amount: 480, date: '2026-06-28', dueDate: '2026-07-12', status: 'unpaid', receiptImage: null, notes: 'Sander rental', clientId: null },
  { id: 'x6', type: 'income', category: 'Job payment', vendorOrSource: 'Marisol Ortega', amount: 900, date: '2026-06-20', dueDate: '', status: 'recorded', receiptImage: null, notes: 'Deposit', clientId: 'c1' },
]
