
-- Businesses (Multi-tenant root)
CREATE TABLE IF NOT EXISTS businesses (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  owner_uid INTEGER,
  status TEXT DEFAULT 'active' CHECK(status IN ('active', 'suspended')),
  uses_shared_catalog INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()))::integer
);

-- Super Admins
CREATE TABLE IF NOT EXISTS super_admins (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()))::integer
);

-- Users table with role-based access
CREATE TABLE IF NOT EXISTS users (
  business_id TEXT DEFAULT 'business_001',
  id SERIAL PRIMARY KEY,
  phone TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  role TEXT NOT NULL CHECK(role IN ('admin', 'staff', 'manager', 'customer')),
  is_active INTEGER NOT NULL DEFAULT 1,
  can_login INTEGER NOT NULL DEFAULT 1,
  monthly_salary NUMERIC NOT NULL DEFAULT 0,
  last_login INTEGER,
  created_at INTEGER NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()))::integer
);

-- Customers table
CREATE TABLE IF NOT EXISTS customers (
  business_id TEXT DEFAULT 'business_001',
  id SERIAL PRIMARY KEY,
  user_id INTEGER UNIQUE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  outstanding_amount NUMERIC NOT NULL DEFAULT 0,
  total_orders INTEGER NOT NULL DEFAULT 0,
  gstin TEXT,
  state TEXT,
  state_code TEXT,
  customer_type TEXT DEFAULT 'B2C' CHECK(customer_type IN ('B2B', 'B2C')),
  created_at INTEGER NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()))::integer,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Designs/Catalog table
CREATE TABLE IF NOT EXISTS designs (
  business_id TEXT DEFAULT 'business_001',
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT,
  image_url TEXT,
  price_per_meter NUMERIC NOT NULL,
  available INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()))::integer
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
  business_id TEXT DEFAULT 'business_001',
  id SERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL,
  design_id INTEGER NOT NULL,
  quantity_meters NUMERIC NOT NULL,
  total_price NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  order_number TEXT UNIQUE,
  created_at INTEGER NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()))::integer,
  approved_at INTEGER,
  completed_at INTEGER,
  is_recurring INTEGER DEFAULT 0,
  recurring_interval INTEGER DEFAULT 7,
  recurring_next_due INTEGER,
  recurring_parent_id INTEGER,
  recurring_active INTEGER DEFAULT 0,
  is_draft_from_recurring INTEGER DEFAULT 0,
  notes TEXT,
  qr_code TEXT,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  FOREIGN KEY (design_id) REFERENCES designs(id) ON DELETE RESTRICT
);

-- Invoices table
CREATE TABLE IF NOT EXISTS invoices (
  business_id TEXT DEFAULT 'business_001',
  id SERIAL PRIMARY KEY,
  invoice_number TEXT NOT NULL UNIQUE,
  order_id INTEGER NOT NULL,
  customer_id INTEGER NOT NULL,
  amount NUMERIC NOT NULL,
  amount_paid NUMERIC DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'unpaid' CHECK(status IN ('paid', 'unpaid', 'overdue', 'partial')),
  gst_rate NUMERIC DEFAULT 0,
  gst_amount NUMERIC DEFAULT 0,
  cgst_amount NUMERIC DEFAULT 0,
  sgst_amount NUMERIC DEFAULT 0,
  igst_amount NUMERIC DEFAULT 0,
  hsn_code TEXT,
  taxable_amount NUMERIC DEFAULT 0,
  place_of_supply TEXT,
  gst_type TEXT CHECK(gst_type IN ('CGST_SGST', 'IGST', 'NONE')) DEFAULT 'NONE',
  generated_at INTEGER NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()))::integer,
  due_date INTEGER,
  paid_at INTEGER,
  last_payment_date INTEGER,
  pdf_url TEXT,
  telegram_delivered INTEGER DEFAULT 0,
  telegram_sent_at INTEGER,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT
);

-- Expenses table
CREATE TABLE IF NOT EXISTS expenses (
  business_id TEXT DEFAULT 'business_001',
  id SERIAL PRIMARY KEY,
  category TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  date INTEGER NOT NULL,
  description TEXT,
  paymentMode TEXT,
  reference TEXT,
  notes TEXT,
  addedBy INTEGER,
  isAuto INTEGER DEFAULT 0,
  linkedId TEXT,
  created_by_user_id INTEGER,
  type TEXT DEFAULT 'out',
  customerName TEXT,
  isPending INTEGER DEFAULT 0,
  has_gst INTEGER DEFAULT 0,
  supplier_gstin TEXT,
  invoice_no TEXT,
  taxable_amount NUMERIC DEFAULT 0,
  gst_rate NUMERIC DEFAULT 0,
  gst_amount NUMERIC DEFAULT 0,
  gst_type TEXT CHECK(gst_type IN ('CGST_SGST', 'IGST', 'NONE')) DEFAULT 'NONE',
  itc_amount NUMERIC DEFAULT 0,
  itc_claimed_date INTEGER,
  created_at INTEGER NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()))::integer,
  FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Vendors table
CREATE TABLE IF NOT EXISTS vendors (
  business_id TEXT DEFAULT 'business_001',
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  contact TEXT NOT NULL,
  material_supplied TEXT,
  city TEXT,
  gst_no TEXT,
  state TEXT,
  state_code TEXT,
  vendor_type TEXT DEFAULT 'Fabric Supplier',
  balance NUMERIC NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()))::integer
);

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
  business_id TEXT DEFAULT 'business_001',
  id SERIAL PRIMARY KEY,
  invoice_id INTEGER NOT NULL,
  customer_id INTEGER NOT NULL,
  amount NUMERIC NOT NULL,
  method TEXT NOT NULL, -- 'cash', 'bank_transfer', 'upi', 'cheque'
  reference_number TEXT,
  payment_date INTEGER NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()))::integer,
  notes TEXT,
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT
);

-- Activity table for Customer Timeline
CREATE TABLE IF NOT EXISTS activity (
  business_id TEXT DEFAULT 'business_001',
  id SERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL,
  type TEXT NOT NULL, -- 'order_created', 'production_started', 'invoice_generated', 'payment_received', etc.
  title TEXT NOT NULL,
  description TEXT,
  meta TEXT, -- JSON metadata
  created_at INTEGER NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()))::integer,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
CREATE INDEX IF NOT EXISTS idx_payments_customer ON payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_activity_customer ON activity(customer_id);

-- Attendance table
CREATE TABLE IF NOT EXISTS attendance (
  business_id TEXT DEFAULT 'business_001',
  id SERIAL PRIMARY KEY,
  date TEXT NOT NULL, -- Format: YYYY-MM-DD
  employee_id INTEGER NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('present', 'half_day', 'absent')),
  overtime_hours NUMERIC NOT NULL DEFAULT 0,
  remarks TEXT,
  created_at INTEGER NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()))::integer,
  UNIQUE(date, employee_id),
  FOREIGN KEY (employee_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
CREATE INDEX IF NOT EXISTS idx_attendance_employee ON attendance(employee_id);

-- Advances table
CREATE TABLE IF NOT EXISTS advances (
  business_id TEXT DEFAULT 'business_001',
  id SERIAL PRIMARY KEY,
  employee_id INTEGER NOT NULL,
  month TEXT NOT NULL, -- Format: YYYY-MM
  amount NUMERIC NOT NULL DEFAULT 0,
  remarks TEXT,
  created_at INTEGER NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()))::integer,
  UNIQUE(employee_id, month),
  FOREIGN KEY (employee_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_advances_month ON advances(month);

-- Salaries table
CREATE TABLE IF NOT EXISTS salaries (
  business_id TEXT DEFAULT 'business_001',
  id SERIAL PRIMARY KEY,
  employee_id INTEGER NOT NULL,
  month TEXT NOT NULL, -- Format: YYYY-MM
  working_days INTEGER NOT NULL,
  present_days NUMERIC NOT NULL,
  absent_days NUMERIC NOT NULL,
  half_days NUMERIC NOT NULL,
  overtime_hours NUMERIC NOT NULL,
  basic_earned NUMERIC NOT NULL,
  overtime_pay NUMERIC NOT NULL,
  deductions NUMERIC NOT NULL,
  advance_recovery NUMERIC NOT NULL,
  net_payable NUMERIC NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('paid', 'unpaid')) DEFAULT 'unpaid',
  payment_method TEXT,
  reference_number TEXT,
  payment_date TEXT,
  created_at INTEGER NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()))::integer,
  UNIQUE(employee_id, month),
  FOREIGN KEY (employee_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_salaries_month ON salaries(month);

-- Employee Advances table (New multi-installment tracking)
CREATE TABLE IF NOT EXISTS employee_advances (
  business_id TEXT DEFAULT 'business_001',
  id SERIAL PRIMARY KEY,
  employee_id INTEGER NOT NULL,
  total_amount NUMERIC NOT NULL,
  amount_repaid NUMERIC NOT NULL DEFAULT 0,
  remaining_balance NUMERIC NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('active', 'completed')) DEFAULT 'active',
  note TEXT,
  created_at INTEGER NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()))::integer,
  FOREIGN KEY (employee_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_employee_advances_employee ON employee_advances(employee_id);

-- Advance Instalments table (Instalment recovery history)
CREATE TABLE IF NOT EXISTS advance_instalments (
  business_id TEXT DEFAULT 'business_001',
  id SERIAL PRIMARY KEY,
  advance_id INTEGER NOT NULL,
  date TEXT NOT NULL, -- Format: YYYY-MM-DD
  amount NUMERIC NOT NULL,
  note TEXT,
  created_at INTEGER NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()))::integer,
  FOREIGN KEY (advance_id) REFERENCES employee_advances(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_advance_instalments_advance ON advance_instalments(advance_id);

-- Inventory Fabric Table
CREATE TABLE IF NOT EXISTS inventory_fabric (
  business_id TEXT DEFAULT 'business_001',
  id SERIAL PRIMARY KEY,
  design_name TEXT NOT NULL,
  vendor_id INTEGER NOT NULL,
  metres_ordered NUMERIC NOT NULL,
  metres_received NUMERIC NOT NULL,
  metres_used NUMERIC NOT NULL DEFAULT 0,
  balance NUMERIC NOT NULL,
  purchase_cost NUMERIC NOT NULL,
  rate_per_metre NUMERIC NOT NULL,
  linked_order_no TEXT,
  purchase_date TEXT NOT NULL, -- Format: YYYY-MM-DD
  invoice_no TEXT,
  notes TEXT,
  created_at INTEGER NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()))::integer,
  FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_inventory_fabric_vendor ON inventory_fabric(vendor_id);
CREATE INDEX IF NOT EXISTS idx_inventory_fabric_date ON inventory_fabric(purchase_date);

-- Inventory Ink Table
CREATE TABLE IF NOT EXISTS inventory_ink (
  business_id TEXT DEFAULT 'business_001',
  id SERIAL PRIMARY KEY,
  ink_colour TEXT NOT NULL,
  quantity NUMERIC NOT NULL,
  unit TEXT NOT NULL CHECK(unit IN ('L', 'kg')),
  supplier TEXT NOT NULL,
  purchase_date TEXT NOT NULL, -- Format: YYYY-MM-DD
  cost_per_unit NUMERIC NOT NULL,
  current_balance NUMERIC NOT NULL,
  min_stock NUMERIC DEFAULT 0,
  last_alert_sent INTEGER,
  created_at INTEGER NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()))::integer
);

CREATE INDEX IF NOT EXISTS idx_inventory_ink_date ON inventory_ink(purchase_date);

-- Inventory Packaging Table
CREATE TABLE IF NOT EXISTS inventory_packaging (
  business_id TEXT DEFAULT 'business_001',
  id SERIAL PRIMARY KEY,
  item_name TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('Roll', 'Cover', 'Tag')),
  quantity NUMERIC NOT NULL,
  supplier TEXT NOT NULL,
  purchase_date TEXT NOT NULL, -- Format: YYYY-MM-DD
  cost NUMERIC NOT NULL,
  current_stock NUMERIC NOT NULL,
  min_stock NUMERIC DEFAULT 0,
  last_alert_sent INTEGER,
  created_at INTEGER NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()))::integer
);

CREATE INDEX IF NOT EXISTS idx_inventory_packaging_date ON inventory_packaging(purchase_date);

-- Settings Table
CREATE TABLE IF NOT EXISTS settings (
  business_id TEXT DEFAULT 'business_001',
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- WhatsApp Reminders Table
CREATE TABLE IF NOT EXISTS whatsapp_reminders (
  business_id TEXT DEFAULT 'business_001',
  id SERIAL PRIMARY KEY,
  date TEXT NOT NULL,
  vendor_payment_id INTEGER NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()))::integer,
  UNIQUE(date, vendor_payment_id)
);

-- Reminder Logs Table
CREATE TABLE IF NOT EXISTS reminder_logs (
  business_id TEXT DEFAULT 'business_001',
  id SERIAL PRIMARY KEY,
  sent_at INTEGER NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()))::integer,
  due_today_count INTEGER NOT NULL,
  overdue_count INTEGER NOT NULL,
  total_due_today NUMERIC NOT NULL,
  total_overdue NUMERIC NOT NULL,
  callmebot_status INTEGER
);

-- Job Work / Outsourcing Costs Table
CREATE TABLE IF NOT EXISTS order_job_costs (
  business_id TEXT DEFAULT 'business_001',
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('embroidery', 'dyeing')),
  vendor_id INTEGER NOT NULL,
  metres NUMERIC NOT NULL,
  rate_per_metre NUMERIC NOT NULL,
  total_cost NUMERIC NOT NULL,
  date TEXT NOT NULL,
  payment_mode TEXT NOT NULL,
  reference TEXT,
  status TEXT NOT NULL CHECK(status IN ('paid', 'unpaid')),
  notes TEXT,
  has_gst INTEGER DEFAULT 0,
  gst_rate NUMERIC DEFAULT 0,
  gst_amount NUMERIC DEFAULT 0,
  taxable_amount NUMERIC DEFAULT 0,
  gst_type TEXT CHECK(gst_type IN ('CGST_SGST', 'IGST', 'NONE')) DEFAULT 'NONE',
  itc_claimed INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()))::integer,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE RESTRICT
);

-- Vendor Payments Table
CREATE TABLE IF NOT EXISTS vendor_payments (
  business_id TEXT DEFAULT 'business_001',
  id SERIAL PRIMARY KEY,
  vendor_id INTEGER NOT NULL,
  vendor_name TEXT NOT NULL,
  vendor_phone TEXT NOT NULL,
  order_id INTEGER,
  order_number TEXT,
  work_type TEXT NOT NULL CHECK(work_type IN ('embroidery', 'dyeing')),
  total_amount NUMERIC NOT NULL,
  amount_paid NUMERIC NOT NULL DEFAULT 0,
  balance NUMERIC NOT NULL,
  due_date TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('paid', 'partial', 'unpaid', 'overdue')) DEFAULT 'unpaid',
  notes TEXT,
  linked_job_cost_id INTEGER,
  has_gst INTEGER DEFAULT 0,
  gst_rate NUMERIC DEFAULT 0,
  gst_amount NUMERIC DEFAULT 0,
  taxable_amount NUMERIC DEFAULT 0,
  gst_type TEXT CHECK(gst_type IN ('CGST_SGST', 'IGST', 'NONE')) DEFAULT 'NONE',
  itc_claimed INTEGER DEFAULT 0,
  invoice_no TEXT,
  itc_amount NUMERIC DEFAULT 0,
  itc_claimed_date INTEGER,
  created_at INTEGER NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()))::integer,
  FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE RESTRICT,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

-- Vendor Payment Instalments Table
CREATE TABLE IF NOT EXISTS vendor_payment_instalments (
  business_id TEXT DEFAULT 'business_001',
  id SERIAL PRIMARY KEY,
  vendor_payment_id INTEGER NOT NULL,
  date TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  payment_mode TEXT NOT NULL,
  reference TEXT,
  notes TEXT,
  created_at INTEGER NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()))::integer,
  FOREIGN KEY (vendor_payment_id) REFERENCES vendor_payments(id) ON DELETE CASCADE
);

-- Delivery Challans Table
CREATE TABLE IF NOT EXISTS challans (
  business_id TEXT DEFAULT 'business_001',
  id SERIAL PRIMARY KEY,
  challan_number TEXT NOT NULL UNIQUE,
  challan_type TEXT NOT NULL CHECK(challan_type IN ('jobwork', 'dispatch', 'sample')),
  date TEXT NOT NULL,
  order_id INTEGER,
  order_number TEXT,
  from_name TEXT,
  from_address TEXT,
  from_gstin TEXT,
  to_name TEXT,
  to_address TEXT,
  to_gstin TEXT,
  purpose TEXT,
  items TEXT,
  total_quantity NUMERIC,
  total_value NUMERIC,
  vehicle_number TEXT,
  transporter TEXT,
  expected_return_date TEXT,
  status TEXT DEFAULT 'open' CHECK(status IN ('open', 'closed', 'cancelled')),
  closed_date TEXT,
  closed_by TEXT,
  linked_job_work_id INTEGER,
  created_by TEXT,
  created_at INTEGER NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()))::integer
);

-- Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
  business_id TEXT DEFAULT 'business_001',
  id SERIAL PRIMARY KEY,
  timestamp INTEGER NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()))::integer,
  user_id INTEGER,
  user_name TEXT,
  user_role TEXT,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id INTEGER,
  entity_label TEXT,
  changes TEXT, -- JSON
  metadata TEXT -- JSON
);

-- Telegram Logs Table
CREATE TABLE IF NOT EXISTS telegram_logs (
  business_id TEXT DEFAULT 'business_001',
  id SERIAL PRIMARY KEY,
  timestamp INTEGER NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()))::integer,
  from_chat_id TEXT,
  command TEXT,
  status TEXT
);

-- Samples Table
CREATE TABLE IF NOT EXISTS samples (
  business_id TEXT DEFAULT 'business_001',
  id SERIAL PRIMARY KEY,
  sample_number TEXT UNIQUE,
  customer_id INTEGER,
  design_id INTEGER,
  shade TEXT,
  metres NUMERIC,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'converted', 'rejected', 'expired')),
  date_sent INTEGER,
  follow_up_date INTEGER,
  delivery_method TEXT,
  tracking_number TEXT,
  notes TEXT,
  linked_challan_id INTEGER,
  linked_order_id INTEGER,
  conversion_date INTEGER,
  created_at INTEGER NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()))::integer
);
CREATE INDEX IF NOT EXISTS idx_samples_customer ON samples(customer_id);

-- Postgres Optimization Indexes for Multi-Tenant Scalability
CREATE INDEX IF NOT EXISTS idx_orders_business ON orders(business_id);
CREATE INDEX IF NOT EXISTS idx_orders_business_created ON orders(business_id, created_at);
CREATE INDEX IF NOT EXISTS idx_invoices_business ON invoices(business_id);
CREATE INDEX IF NOT EXISTS idx_invoices_business_generated ON invoices(business_id, generated_at);
CREATE INDEX IF NOT EXISTS idx_expenses_business_date ON expenses(business_id, date);
CREATE INDEX IF NOT EXISTS idx_customers_business ON customers(business_id);
CREATE INDEX IF NOT EXISTS idx_designs_business ON designs(business_id);
CREATE INDEX IF NOT EXISTS idx_vendor_payments_business ON vendor_payments(business_id);
CREATE INDEX IF NOT EXISTS idx_activity_created_at ON activity(created_at);

CREATE TABLE IF NOT EXISTS telegram_test_logs (
    id SERIAL PRIMARY KEY,
    business_id TEXT,
    recipient_id INTEGER,
    message_type TEXT,
    status TEXT,
    error TEXT,
    sent_at INTEGER
);

-- Vendor Dispatches Table (tracks fabric sent to embroidery/dyeing vendors)
CREATE TABLE IF NOT EXISTS vendor_dispatches (
  business_id TEXT DEFAULT 'business_001',
  id SERIAL PRIMARY KEY,
  dispatch_number TEXT NOT NULL UNIQUE,
  order_id INTEGER NOT NULL,
  vendor_id INTEGER NOT NULL,
  process_type TEXT NOT NULL CHECK(process_type IN ('embroidery', 'dyeing')),
  sent_date INTEGER NOT NULL,
  expected_return_date INTEGER,
  returned_at INTEGER,
  rate_per_meter NUMERIC NOT NULL DEFAULT 0,
  total_meters NUMERIC NOT NULL DEFAULT 0,
  total_cost NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK(status IN ('sent', 'returned', 'cancelled')) DEFAULT 'sent',
  notes TEXT,
  created_at INTEGER NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()))::integer,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_vendor_dispatches_order ON vendor_dispatches(order_id);
CREATE INDEX IF NOT EXISTS idx_vendor_dispatches_vendor ON vendor_dispatches(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_dispatches_business ON vendor_dispatches(business_id);

-- Extra Performance Indexes
CREATE INDEX IF NOT EXISTS idx_vendor_payments_status ON vendor_payments(status);
CREATE INDEX IF NOT EXISTS idx_vendor_payments_due_date ON vendor_payments(due_date);
CREATE INDEX IF NOT EXISTS idx_vendor_payment_instalments_date ON vendor_payment_instalments(date);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
