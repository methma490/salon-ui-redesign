import { DbClient } from '../../tenant-migration-runner';
import { DemoCommonSeedResult } from './common-demo.seed';

export async function seedPlanTwoDemoData(
  schemaName: string,
  commonResult: DemoCommonSeedResult,
  client: DbClient,
): Promise<void> {
  // Set search path
  await client.$executeRawUnsafe(`SET search_path TO "${schemaName}", public`);

  const { mainBranchId, adminUserId, customers, employees, services, products } = commonResult;

  // 1. Update Main Branch Name and add Secondary Branch for Multi-Branch Demo
  await client.$executeRawUnsafe(
    `UPDATE "${schemaName}".branches
     SET name = 'Demo Salon (Gold Plan) - Colombo Main'
     WHERE id = $1::uuid`,
    mainBranchId,
  );

  const branchTwoRows = await client.$queryRawUnsafe<Array<{ id: string }>>(
    `INSERT INTO "${schemaName}".branches (
       code, name, email, phone, address, is_main, status
     )
     VALUES (
       'BR-002', 'Demo Salon - Kandy Branch', 'kandy@demo-salon.local', '+94 81 223 4455',
       'No. 55, Dalada Veediya, Kandy', false, 'ACTIVE'
     )
     ON CONFLICT (code) DO UPDATE SET
       name = EXCLUDED.name,
       status = 'ACTIVE'
     RETURNING id`,
  );
  const branchTwoId = branchTwoRows[0].id;

  // Link products and services to secondary branch
  for (const prod of products) {
    await client.$executeRawUnsafe(
      `INSERT INTO "${schemaName}".product_branches (product_id, branch_id)
       VALUES ($1::uuid, $2::uuid)
       ON CONFLICT DO NOTHING`,
      prod.id,
      branchTwoId,
    );
  }

  // 2. Payroll Settings, Loans, Advances & Payroll Runs
  const existingSettings = await client.$queryRawUnsafe<Array<{ id: string }>>(
    `SELECT id FROM "${schemaName}".payroll_settings LIMIT 1`,
  );
  if (existingSettings.length > 0) {
    await client.$executeRawUnsafe(
      `UPDATE "${schemaName}".payroll_settings
       SET employee_epf_rate = 8.00,
           employer_epf_rate = 12.00,
           employer_etf_rate = 3.00,
           max_salary_advance_percentage = 50.00
       WHERE id = $1::uuid`,
      existingSettings[0].id,
    );
  } else {
    await client.$executeRawUnsafe(
      `INSERT INTO "${schemaName}".payroll_settings (
         employee_epf_rate, employer_epf_rate, employer_etf_rate, max_salary_advance_percentage
       )
       VALUES (8.00, 12.00, 3.00, 50.00)`,
    );
  }

  const emp1 = employees[0]?.id; // Kasun
  const emp2 = employees[1]?.id; // Ishara
  const emp3 = employees[2]?.id; // Sachini

  let loan1Id: string | null = null;
  let loan2Id: string | null = null;

  if (emp1) {
    const loanRows = await client.$queryRawUnsafe<Array<{ id: string }>>(
      `INSERT INTO "${schemaName}".employee_loans (
         employee_id, loan_type, original_amount, remaining_balance, monthly_installment,
         start_date, status, notes
       )
       VALUES (
         $1::uuid, 'Professional Styling Shears Loan', 60000, 40000, 10000,
         CURRENT_DATE - INTERVAL '60 days', 'ACTIVE', 'Japanese Cobalt Shears Set Purchase'
       )
       RETURNING id`,
      emp1,
    );
    loan1Id = loanRows[0].id;

    await client.$executeRawUnsafe(
      `INSERT INTO "${schemaName}".employee_advances (
         employee_id, original_amount, remaining_balance, monthly_installment,
         start_date, status, notes
       )
       VALUES (
         $1::uuid, 20000, 10000, 10000, CURRENT_DATE - INTERVAL '15 days', 'ACTIVE', 'Mid-month advance'
       )`,
      emp1,
    );
  }

  if (emp2) {
    const loanRows = await client.$queryRawUnsafe<Array<{ id: string }>>(
      `INSERT INTO "${schemaName}".employee_loans (
         employee_id, loan_type, original_amount, remaining_balance, monthly_installment,
         start_date, status, notes
       )
       VALUES (
         $1::uuid, 'Color Masterclass Training Loan', 45000, 30000, 7500,
         CURRENT_DATE - INTERVAL '60 days', 'ACTIVE', 'Advanced Balayage Masterclass Enrollment'
       )
       RETURNING id`,
      emp2,
    );
    loan2Id = loanRows[0].id;

    await client.$executeRawUnsafe(
      `INSERT INTO "${schemaName}".employee_advances (
         employee_id, original_amount, remaining_balance, monthly_installment,
         start_date, status, notes
       )
       VALUES (
         $1::uuid, 15000, 7500, 7500, CURRENT_DATE - INTERVAL '15 days', 'ACTIVE', 'Emergency medical advance'
       )`,
      emp2,
    );
  }

  // Historical Payroll Runs (Last 2 Months)
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;

  const prevMonth1 = currentMonth === 1 ? 12 : currentMonth - 1;
  const prevYear1 = currentMonth === 1 ? currentYear - 1 : currentYear;

  const prevMonth2 = prevMonth1 === 1 ? 12 : prevMonth1 - 1;
  const prevYear2 = prevMonth1 === 1 ? prevYear1 - 1 : prevYear1;

  // Month 2 ago (PAID)
  const run2Rows = await client.$queryRawUnsafe<Array<{ id: string }>>(
    `INSERT INTO "${schemaName}".payroll_runs (
       year, month, status, total_basic, total_commission, total_bonus, total_gross,
       total_deductions, total_net, created_by, finalized_by, created_at, finalized_at, paid_at
     )
     VALUES (
       $1, $2, 'PAID', 405000, 48000, 20000, 473000, 69900, 403100,
       $3::uuid, $3::uuid,
       NOW() - INTERVAL '45 days', NOW() - INTERVAL '40 days', NOW() - INTERVAL '38 days'
     )
     RETURNING id`,
    prevYear2,
    prevMonth2,
    adminUserId,
  );
  const run2Id = run2Rows[0].id;

  // Month 1 ago (FINALIZED)
  const run1Rows = await client.$queryRawUnsafe<Array<{ id: string }>>(
    `INSERT INTO "${schemaName}".payroll_runs (
       year, month, status, total_basic, total_commission, total_bonus, total_gross,
       total_deductions, total_net, created_by, finalized_by, created_at, finalized_at, paid_at
     )
     VALUES (
       $1, $2, 'FINALIZED', 405000, 56000, 25000, 486000, 72380, 413620,
       $3::uuid, $3::uuid,
       NOW() - INTERVAL '15 days', NOW() - INTERVAL '10 days', NULL
     )
     RETURNING id`,
    prevYear1,
    prevMonth1,
    adminUserId,
  );
  const run1Id = run1Rows[0].id;

  // Payroll Items for Month 2 ago
  if (emp1) {
    const itemRows = await client.$queryRawUnsafe<Array<{ id: string }>>(
      `INSERT INTO "${schemaName}".payroll_items (
         payroll_run_id, employee_id, basic_salary, commission_percentage, commission_base,
         commission_amount, bonus, gross_salary, employee_epf, employer_epf, employer_etf,
         loan_deduction, other_deduction, total_deductions, net_salary
       )
       VALUES (
         $1::uuid, $2::uuid, 95000, 10.0, 180000, 18000, 5000, 118000,
         7600, 11400, 2850, 10000, 0, 17600, 100400
       )
       RETURNING id`,
      run2Id,
      emp1,
    );
    if (loan1Id) {
      await client.$executeRawUnsafe(
        `INSERT INTO "${schemaName}".loan_repayments (
           loan_id, payroll_item_id, amount, balance_before, balance_after, paid_at
         )
         VALUES ($1::uuid, $2::uuid, 10000, 60000, 50000, NOW() - INTERVAL '38 days')`,
        loan1Id,
        itemRows[0].id,
      );
    }
  }

  if (emp2) {
    const itemRows = await client.$queryRawUnsafe<Array<{ id: string }>>(
      `INSERT INTO "${schemaName}".payroll_items (
         payroll_run_id, employee_id, basic_salary, commission_percentage, commission_base,
         commission_amount, bonus, gross_salary, employee_epf, employer_epf, employer_etf,
         loan_deduction, other_deduction, total_deductions, net_salary
       )
       VALUES (
         $1::uuid, $2::uuid, 85000, 10.0, 140000, 14000, 5000, 104000,
         6800, 10200, 2550, 7500, 0, 14300, 89700
       )
       RETURNING id`,
      run2Id,
      emp2,
    );
    if (loan2Id) {
      await client.$executeRawUnsafe(
        `INSERT INTO "${schemaName}".loan_repayments (
           loan_id, payroll_item_id, amount, balance_before, balance_after, paid_at
         )
         VALUES ($1::uuid, $2::uuid, 7500, 45000, 37500, NOW() - INTERVAL '38 days')`,
        loan2Id,
        itemRows[0].id,
      );
    }
  }

  // 3. Realistic Demo Quotations
  const demoQuotations = [
    {
      quotationNo: 'QT-2026-0001',
      custIdx: 0,
      srvIdx: 5, // Balayage
      empIdx: 1,
      status: 'ACCEPTED',
      subtotal: 16000,
      discount: 1000,
      total: 15000,
      daysAgo: 10,
      notes: 'Bridal package quotation including hair color & styling',
    },
    {
      quotationNo: 'QT-2026-0002',
      custIdx: 2,
      srvIdx: 4, // Keratin
      empIdx: 0,
      status: 'SENT',
      subtotal: 18500,
      discount: 1500,
      total: 17000,
      daysAgo: 5,
      notes: 'Keratin smoothing therapy corporate package',
    },
    {
      quotationNo: 'QT-2026-0003',
      custIdx: 4,
      srvIdx: 10, // Anti-aging facial
      empIdx: 2,
      status: 'DRAFT',
      subtotal: 9500,
      discount: 0,
      total: 9500,
      daysAgo: 2,
      notes: 'Full skincare regimen & facial package consultation',
    },
  ];

  for (const q of demoQuotations) {
    const cust = customers[q.custIdx];
    const srv = services[q.srvIdx];
    const emp = employees[q.empIdx];
    if (!cust || !srv || !emp) continue;

    const token = `qt_token_${q.quotationNo.toLowerCase().replace(/[^a-z0-9]/g, '_')}_demo`;

    const qRows = await client.$queryRawUnsafe<Array<{ id: string }>>(
      `INSERT INTO "${schemaName}".quotations (
         quotation_no, branch_id, customer_id, quotation_date, valid_until,
         subtotal, discount_amount, tax_amount, total_amount, status,
         customer_notes, internal_notes, salon_name_snapshot, public_token,
         accepted_at, created_by, created_at, updated_at
       )
       VALUES (
         $1, $2::uuid, $3::uuid,
         CURRENT_DATE - ($4 || ' days')::INTERVAL,
         CURRENT_DATE + (30 - $4 || ' days')::INTERVAL,
         $5, $6, 0, $7,
         $8::"${schemaName}".quotation_status,
         $9, 'Sales demo sample quotation', 'Demo Salon (Gold Plan)', $10,
         CASE WHEN $8 = 'ACCEPTED' THEN NOW() - ($4 || ' days')::INTERVAL ELSE NULL END,
         $11::uuid,
         NOW() - ($4 || ' days')::INTERVAL,
         NOW() - ($4 || ' days')::INTERVAL
       )
       RETURNING id`,
      q.quotationNo,
      mainBranchId,
      cust.id,
      q.daysAgo,
      q.subtotal,
      q.discount,
      q.total,
      q.status,
      q.notes,
      token,
      adminUserId,
    );
    const qId = qRows[0].id;

    await client.$executeRawUnsafe(
      `INSERT INTO "${schemaName}".quotation_items (
         quotation_id, service_id, description_snapshot, quantity,
         original_service_price, quotation_unit_price, discount_amount, line_total,
         employee_id, sort_order, created_at
       )
       VALUES (
         $1::uuid, $2::uuid, $3, 1, $4, $4, $5, $6,
         $7::uuid, 1, NOW() - ($8 || ' days')::INTERVAL
       )`,
      qId,
      srv.id,
      srv.name,
      q.subtotal,
      q.discount,
      q.total,
      emp.id,
      q.daysAgo,
    );

    if (q.status === 'SENT' || q.status === 'ACCEPTED') {
      await client.$executeRawUnsafe(
        `INSERT INTO "${schemaName}".quotation_messages (
           quotation_id, channel, recipient, message, status, sent_at, created_by, created_at
         )
         VALUES (
           $1::uuid, 'WHATSAPP', $2,
           'Dear ' || $3 || ', your salon quotation #' || $4 || ' is ready to view: https://demo-salon.local/quotations/' || $5,
           'DELIVERED', NOW() - ($6 || ' days')::INTERVAL, $7::uuid, NOW() - ($6 || ' days')::INTERVAL
         )`,
        qId,
        cust.code,
        cust.name,
        q.quotationNo,
        token,
        q.daysAgo,
        adminUserId,
      );
    }
  }

  // 4. Realistic Suppliers, GRNs & Supplier Payments
  const demoSuppliers = [
    {
      name: 'Lanka Salon Supplies & Distributors (Pvt) Ltd',
      contact: 'Sunil Weerakkody',
      phone: '+94 11 289 1122',
      email: 'sales@lankasalonsupplies.lk',
      address: 'No. 88, High Level Road, Nugegoda',
    },
    {
      name: "L'Oreal Professional & Matrix Sri Lanka",
      contact: 'Chaminda Silva',
      phone: '+94 11 471 3344',
      email: 'orders@lorealpro.lk',
      address: 'No. 25, Vauxhall Street, Colombo 02',
    },
    {
      name: 'Olaplex & Organic Hair Care Importers',
      contact: 'Dinesh Perera',
      phone: '+94 11 556 7788',
      email: 'info@organichairimports.lk',
      address: 'No. 12, Galle Road, Colombo 03',
    },
  ];

  const seededSuppliers: Array<{ id: string; name: string }> = [];
  for (const sup of demoSuppliers) {
    const supRows = await client.$queryRawUnsafe<Array<{ id: string }>>(
      `INSERT INTO "${schemaName}".suppliers (
         name, contact_person, phone, email, address, notes, is_active
       )
       VALUES ($1, $2, $3, $4, $5, 'Authorized cosmetic and equipment supplier', true)
       RETURNING id`,
      sup.name,
      sup.contact,
      sup.phone,
      sup.email,
      sup.address,
    );
    seededSuppliers.push({ id: supRows[0].id, name: sup.name });
  }

  // GRN 1 (Lanka Salon Supplies): Received, Fully Paid via Bank Transfer
  const sup1 = seededSuppliers[0];
  const prod1 = products[0]; // Shampoo
  const prod2 = products[1]; // Conditioner

  if (sup1 && prod1 && prod2) {
    const grn1Rows = await client.$queryRawUnsafe<Array<{ id: string }>>(
      `INSERT INTO "${schemaName}".grns (
         grn_number, supplier_id, branch_id, supplier_invoice_number, grn_date, due_date,
         notes, subtotal, discount_amount, total_amount, paid_amount, outstanding_amount,
         payment_status, grn_status, received_at, created_by, created_at, updated_at
       )
       VALUES (
         'GRN-2026-0001', $1::uuid, $2::uuid, 'INV-LSS-9801',
         CURRENT_DATE - INTERVAL '20 days', CURRENT_DATE + INTERVAL '10 days',
         'Monthly stock replenishment of salon shampoos & conditioners',
         76000, 4000, 72000, 72000, 0,
         'PAID', 'RECEIVED', NOW() - INTERVAL '20 days', $3::uuid,
         NOW() - INTERVAL '20 days', NOW() - INTERVAL '20 days'
       )
       RETURNING id`,
      sup1.id,
      mainBranchId,
      adminUserId,
    );
    const grn1Id = grn1Rows[0].id;

    // Items
    await client.$executeRawUnsafe(
      `INSERT INTO "${schemaName}".grn_items (grn_id, product_id, quantity, unit_cost, line_total)
       VALUES ($1::uuid, $2::uuid, 10, 3800, 38000)`,
      grn1Id,
      prod1.id,
    );
    await client.$executeRawUnsafe(
      `INSERT INTO "${schemaName}".grn_items (grn_id, product_id, quantity, unit_cost, line_total)
       VALUES ($1::uuid, $2::uuid, 10, 3800, 38000)`,
      grn1Id,
      prod2.id,
    );

    // Supplier Payment 1
    const sp1Rows = await client.$queryRawUnsafe<Array<{ id: string }>>(
      `INSERT INTO "${schemaName}".supplier_payments (
         supplier_id, payment_date, amount, payment_method, reference_number,
         bank_name, cheque_status, cleared_at, notes, created_by, created_at
       )
       VALUES (
         $1::uuid, CURRENT_DATE - INTERVAL '18 days', 72000,
         'BANK_TRANSFER'::"${schemaName}".supplier_payment_method,
         'BT-HNB-992144', 'HNB Corporate Banking',
         'CLEARED'::"${schemaName}".supplier_cheque_status,
         NOW() - INTERVAL '18 days', 'Direct bank settlement for GRN-2026-0001',
         $2::uuid, NOW() - INTERVAL '18 days'
       )
       RETURNING id`,
      sup1.id,
      adminUserId,
    );
    const sp1Id = sp1Rows[0].id;

    // Allocation
    await client.$executeRawUnsafe(
      `INSERT INTO "${schemaName}".supplier_payment_allocations (payment_id, grn_id, allocated_amount)
       VALUES ($1::uuid, $2::uuid, 72000)`,
      sp1Id,
      grn1Id,
    );

    // Linked System Expense
    const catRows = await client.$queryRawUnsafe<Array<{ id: string }>>(
      `SELECT id FROM "${schemaName}".expense_categories WHERE code = 'SUPPLIER_PAYMENT' LIMIT 1`,
    );
    const suppCatId = catRows[0]?.id;

    await client.$executeRawUnsafe(
      `INSERT INTO "${schemaName}".expenses (
         code, branch_id, category_id, title, amount, expense_date, payment_method,
         notes, status, created_by, supplier_payment_id, is_system_generated, created_at, updated_at
       )
       VALUES (
         'EXP-SP-0001', $1::uuid, $2::uuid,
         'Supplier Payment - ' || $3, 72000,
         CURRENT_DATE - INTERVAL '18 days', 'BANK_TRANSFER',
         'Supplier: ' || $3 || E'\nPayment Reference: BT-HNB-992144\nDirect bank settlement for GRN-2026-0001',
         'ACTIVE', $4::uuid, $5::uuid, true,
         NOW() - INTERVAL '18 days', NOW() - INTERVAL '18 days'
       )`,
      mainBranchId,
      suppCatId,
      sup1.name,
      adminUserId,
      sp1Id,
    );
  }

  // GRN 2 (Olaplex & Organic): Received, Partially Paid via Cheque
  const sup2 = seededSuppliers[2];
  const prod3 = products[2]; // Olaplex
  const prod4 = products[3]; // Argan Serum

  if (sup2 && prod3 && prod4) {
    const grn2Rows = await client.$queryRawUnsafe<Array<{ id: string }>>(
      `INSERT INTO "${schemaName}".grns (
         grn_number, supplier_id, branch_id, supplier_invoice_number, grn_date, due_date,
         notes, subtotal, discount_amount, total_amount, paid_amount, outstanding_amount,
         payment_status, grn_status, received_at, created_by, created_at, updated_at
       )
       VALUES (
         'GRN-2026-0002', $1::uuid, $2::uuid, 'INV-OLA-4410',
         CURRENT_DATE - INTERVAL '10 days', CURRENT_DATE + INTERVAL '20 days',
         'Olaplex treatments and organic hair serums shipment',
         103000, 3000, 100000, 50000, 50000,
         'PARTIALLY_PAID', 'RECEIVED', NOW() - INTERVAL '10 days', $3::uuid,
         NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days'
       )
       RETURNING id`,
      sup2.id,
      mainBranchId,
      adminUserId,
    );
    const grn2Id = grn2Rows[0].id;

    // Items
    await client.$executeRawUnsafe(
      `INSERT INTO "${schemaName}".grn_items (grn_id, product_id, quantity, unit_cost, line_total)
       VALUES ($1::uuid, $2::uuid, 10, 7500, 75000)`,
      grn2Id,
      prod3.id,
    );
    await client.$executeRawUnsafe(
      `INSERT INTO "${schemaName}".grn_items (grn_id, product_id, quantity, unit_cost, line_total)
       VALUES ($1::uuid, $2::uuid, 10, 2800, 28000)`,
      grn2Id,
      prod4.id,
    );

    // Supplier Payment 2 (Cheque CLEARED)
    const sp2Rows = await client.$queryRawUnsafe<Array<{ id: string }>>(
      `INSERT INTO "${schemaName}".supplier_payments (
         supplier_id, payment_date, amount, payment_method, reference_number,
         bank_name, cheque_number, cheque_date, cheque_status, cleared_at, notes, created_by, created_at
       )
       VALUES (
         $1::uuid, CURRENT_DATE - INTERVAL '8 days', 50000,
         'CHEQUE'::"${schemaName}".supplier_payment_method,
         'CHQ-COM-44129', 'Commercial Bank', '441290', CURRENT_DATE - INTERVAL '8 days',
         'CLEARED'::"${schemaName}".supplier_cheque_status,
         NOW() - INTERVAL '7 days', 'Part-payment cheque for GRN-2026-0002',
         $2::uuid, NOW() - INTERVAL '8 days'
       )
       RETURNING id`,
      sup2.id,
      adminUserId,
    );
    const sp2Id = sp2Rows[0].id;

    // Allocation
    await client.$executeRawUnsafe(
      `INSERT INTO "${schemaName}".supplier_payment_allocations (payment_id, grn_id, allocated_amount)
       VALUES ($1::uuid, $2::uuid, 50000)`,
      sp2Id,
      grn2Id,
    );

    // Linked System Expense
    const catRows = await client.$queryRawUnsafe<Array<{ id: string }>>(
      `SELECT id FROM "${schemaName}".expense_categories WHERE code = 'SUPPLIER_PAYMENT' LIMIT 1`,
    );
    const suppCatId = catRows[0]?.id;

    await client.$executeRawUnsafe(
      `INSERT INTO "${schemaName}".expenses (
         code, branch_id, category_id, title, amount, expense_date, payment_method,
         notes, status, created_by, supplier_payment_id, is_system_generated, created_at, updated_at
       )
       VALUES (
         'EXP-SP-0002', $1::uuid, $2::uuid,
         'Supplier Payment - ' || $3, 50000,
         CURRENT_DATE - INTERVAL '8 days', 'CHEQUE',
         'Supplier: ' || $3 || E'\nCheque Number: 441290\nPart-payment cheque for GRN-2026-0002',
         'ACTIVE', $4::uuid, $5::uuid, true,
         NOW() - INTERVAL '8 days', NOW() - INTERVAL '8 days'
       )`,
      mainBranchId,
      suppCatId,
      sup2.name,
      adminUserId,
      sp2Id,
    );
  }

  // GRN 3 (L'Oreal): Draft
  const sup3 = seededSuppliers[1];
  const prod5 = products[4]; // Mask

  if (sup3 && prod5) {
    const grn3Rows = await client.$queryRawUnsafe<Array<{ id: string }>>(
      `INSERT INTO "${schemaName}".grns (
         grn_number, supplier_id, branch_id, supplier_invoice_number, grn_date, due_date,
         notes, subtotal, discount_amount, total_amount, paid_amount, outstanding_amount,
         payment_status, grn_status, received_at, created_by, created_at, updated_at
       )
       VALUES (
         'GRN-2026-0003', $1::uuid, $2::uuid, 'INV-DRAFT-09',
         CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days',
         'Upcoming salon hair masks and styling products order',
         35000, 0, 35000, 0, 35000,
         'UNPAID', 'DRAFT', NULL, $3::uuid,
         NOW(), NOW()
       )
       RETURNING id`,
      sup3.id,
      mainBranchId,
      adminUserId,
    );
    const grn3Id = grn3Rows[0].id;

    await client.$executeRawUnsafe(
      `INSERT INTO "${schemaName}".grn_items (grn_id, product_id, quantity, unit_cost, line_total)
       VALUES ($1::uuid, $2::uuid, 10, 3500, 35000)`,
      grn3Id,
      prod5.id,
    );
  }
}
