export const seedClients = [
  { id: 'c1', contactName: 'Marisol Ortega', businessName: '', email: 'marisol.ortega@example.com', phone: '(970) 555-0148', address: '412 Willow Creek Dr, Fort Collins, CO' },
  { id: 'c2', contactName: 'Dan Whitfield', businessName: '', email: 'dan.whitfield@example.com', phone: '(970) 555-0193', address: '88 Timberline Rd, Loveland, CO' },
  { id: 'c3', contactName: 'Facilities Dept.', businessName: 'Greeley Union School District', email: 'facilities@example-gusd.org', phone: '(970) 555-0122', address: '1900 8th Ave, Greeley, CO' },
]

export const seedEstimates = [
  {
    id: 'e1', clientId: 'c1', title: 'Kitchen backsplash & outlet relocation',
    status: 'sent', taxRate: 4.2, globalDiscount: 0, createdAt: '2026-06-28',
    items: [
      { id: 'i1', type: 'material', description: 'Subway tile, 10 sq ft box', qty: 6, unitCost: 42, markup: 30, taxable: true },
      { id: 'i2', type: 'material', description: 'Thinset & grout', qty: 1, unitCost: 65, markup: 25, taxable: true },
      { id: 'i3', type: 'labor', description: 'Tile install labor', qty: 14, unitCost: 38, markup: 45, taxable: false },
      { id: 'i4', type: 'labor', description: 'Electrician - outlet move', qty: 3, unitCost: 55, markup: 40, taxable: false },
    ],
  },
  {
    id: 'e2', clientId: 'c2', title: 'Deck rebuild - 320 sq ft',
    status: 'draft', taxRate: 4.2, globalDiscount: 5, createdAt: '2026-07-02',
    items: [
      { id: 'i5', type: 'material', description: 'Pressure-treated joists & framing', qty: 1, unitCost: 1180, markup: 22, taxable: true },
      { id: 'i6', type: 'material', description: 'Composite decking boards', qty: 320, unitCost: 6.2, markup: 28, taxable: true },
      { id: 'i7', type: 'labor', description: 'Demo + rebuild crew (2 workers)', qty: 40, unitCost: 42, markup: 45, taxable: false },
    ],
  },
  {
    id: 'e3', clientId: 'c3', title: 'Gym floor refinish - Building B',
    status: 'accepted', taxRate: 4.2, globalDiscount: 0, createdAt: '2026-06-14',
    items: [
      { id: 'i8', type: 'material', description: 'Polyurethane finish, 5 gal', qty: 4, unitCost: 210, markup: 20, taxable: true },
      { id: 'i9', type: 'labor', description: 'Sanding & refinish crew', qty: 60, unitCost: 40, markup: 45, taxable: false },
    ],
  },
]

export const seedJobs = [
  { id: 'j1', estimateId: 'e3', clientId: 'c3', title: 'Gym floor refinish - Building B', status: 'in_progress', start: '2026-07-06', end: '2026-07-11' },
  { id: 'j2', estimateId: null, clientId: 'c2', title: 'Fence repair - north property line', status: 'scheduled', start: '2026-07-15', end: '2026-07-16' },
]

export const seedInvoices = [
  { id: 'v1', estimateId: 'e3', jobId: 'j1', clientId: 'c3', status: 'sent', issuedAt: '2026-07-01', dueAt: '2026-07-15', amount: null, depositPct: 30 },
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
