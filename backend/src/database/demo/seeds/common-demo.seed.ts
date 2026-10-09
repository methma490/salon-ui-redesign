import { DbClient } from '../../tenant-migration-runner';

export interface DemoCommonSeedResult {
  mainBranchId: string;
  adminUserId: string;
  customers: Array<{ id: string; name: string; code: string }>;
  employees: Array<{ id: string; name: string; code: string }>;
  services: Array<{ id: string; name: string; code: string; price: number }>;
  products: Array<{ id: string; name: string; code: string; sellingPrice: number }>;
}

export async function seedCommonDemoData(
  schemaName: string,
  client: DbClient,
): Promise<DemoCommonSeedResult> {
  // Set search path
  await client.$executeRawUnsafe(`SET search_path TO "${schemaName}", public`);

  // Clean default starter services/categories/products/customers/employees if present from provisioning
  await client.$executeRawUnsafe(`DELETE FROM "${schemaName}".appointment_services`).catch(() => {});
  await client.$executeRawUnsafe(`DELETE FROM "${schemaName}".appointments`).catch(() => {});
  await client.$executeRawUnsafe(`DELETE FROM "${schemaName}".service_category_branches`).catch(() => {});
  await client.$executeRawUnsafe(`DELETE FROM "${schemaName}".services`).catch(() => {});
  await client.$executeRawUnsafe(`DELETE FROM "${schemaName}".service_categories`).catch(() => {});
  await client.$executeRawUnsafe(`DELETE FROM "${schemaName}".stock_movements`).catch(() => {});
  await client.$executeRawUnsafe(`DELETE FROM "${schemaName}".product_branches`).catch(() => {});
  await client.$executeRawUnsafe(`DELETE FROM "${schemaName}".products`).catch(() => {});
  await client.$executeRawUnsafe(`DELETE FROM "${schemaName}".product_categories`).catch(() => {});
  await client.$executeRawUnsafe(`DELETE FROM "${schemaName}".customers`).catch(() => {});
  await client.$executeRawUnsafe(`DELETE FROM "${schemaName}".employees`).catch(() => {});

  // 1. Get or Create Main Branch
  const branchRows = await client.$queryRawUnsafe<Array<{ id: string }>>(
    `SELECT id FROM "${schemaName}".branches WHERE is_main = true LIMIT 1`,
  );
  let mainBranchId: string;
  if (branchRows.length > 0) {
    mainBranchId = branchRows[0].id;
    await client.$executeRawUnsafe(
      `UPDATE "${schemaName}".branches
       SET name = 'Main Branch - Colombo 07',
           email = 'colombo@demo-salon.local',
           phone = '+94 11 268 9900',
           address = 'No. 142, Horton Place, Colombo 07',
           status = 'ACTIVE'
       WHERE id = $1::uuid`,
      mainBranchId,
    );
  } else {
    const createdBranch = await client.$queryRawUnsafe<Array<{ id: string }>>(
      `INSERT INTO "${schemaName}".branches (code, name, email, phone, address, is_main, status)
       VALUES ('BR-001', 'Main Branch - Colombo 07', 'colombo@demo-salon.local', '+94 11 268 9900', 'No. 142, Horton Place, Colombo 07', true, 'ACTIVE')
       RETURNING id`,
    );
    mainBranchId = createdBranch[0].id;
  }

  // 2. Resolve Admin User ID
  const userRows = await client.$queryRawUnsafe<Array<{ id: string }>>(
    `SELECT id FROM "${schemaName}".users ORDER BY created_at ASC LIMIT 1`,
  );
  const adminUserId = userRows.length > 0 ? userRows[0].id : mainBranchId;

  // 3. Realistic Demo Employees
  const demoEmployees = [
    {
      code: 'EMP-001',
      name: 'Kasun Rathnayake',
      email: 'kasun.stylist@demo-salon.local',
      phone: '+94 77 123 4501',
      designation: 'Senior Master Stylist',
      basicSalary: 95000,
      joinedDate: '2023-01-10',
      maxAdvancePct: 50,
    },
    {
      code: 'EMP-002',
      name: 'Ishara Jayatillake',
      email: 'ishara.colorist@demo-salon.local',
      phone: '+94 71 234 5602',
      designation: 'Senior Hair Color Specialist',
      basicSalary: 85000,
      joinedDate: '2023-03-15',
      maxAdvancePct: 50,
    },
    {
      code: 'EMP-003',
      name: 'Sachini Bandara',
      email: 'sachini.skin@demo-salon.local',
      phone: '+94 76 345 6703',
      designation: 'Skin & Facial Therapist',
      basicSalary: 72000,
      joinedDate: '2023-08-01',
      maxAdvancePct: 40,
    },
    {
      code: 'EMP-004',
      name: 'Anuki Wijesinghe',
      email: 'anuki.nails@demo-salon.local',
      phone: '+94 70 456 7804',
      designation: 'Nail & Lash Artist',
      basicSalary: 62000,
      joinedDate: '2024-01-15',
      maxAdvancePct: 40,
    },
    {
      code: 'EMP-005',
      name: 'Dhanushka Perera',
      email: 'dhanushka.barber@demo-salon.local',
      phone: '+94 78 567 8905',
      designation: 'Junior Stylist & Barber',
      basicSalary: 48000,
      joinedDate: '2024-05-01',
      maxAdvancePct: 30,
    },
    {
      code: 'EMP-006',
      name: 'Malki Gunawardena',
      email: 'malki.reception@demo-salon.local',
      phone: '+94 75 678 9006',
      designation: 'Front Desk & POS Cashier',
      basicSalary: 45000,
      joinedDate: '2024-02-01',
      maxAdvancePct: 30,
    },
  ];

  const seededEmployees: Array<{ id: string; name: string; code: string }> = [];
  for (const emp of demoEmployees) {
    const inserted = await client.$queryRawUnsafe<Array<{ id: string }>>(
      `INSERT INTO "${schemaName}".employees (
         branch_id, user_id, code, name, email, phone, designation, status,
         joined_date, basic_salary, epf_enabled, etf_enabled, max_advance_percentage
       )
       VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6, $7, 'ACTIVE', $8::date, $9, true, true, $10)
       RETURNING id`,
      mainBranchId,
      adminUserId,
      emp.code,
      emp.name,
      emp.email,
      emp.phone,
      emp.designation,
      emp.joinedDate,
      emp.basicSalary,
      emp.maxAdvancePct,
    );
    seededEmployees.push({ id: inserted[0].id, name: emp.name, code: emp.code });
  }

  // 4. Realistic Demo Customers (20 customers)
  const demoCustomers = [
    { code: 'CUST-0001', name: 'Nadeesha Perera', email: 'nadeesha.p@demo.local', phone: '+94 77 234 0001', address: 'Colombo 07' },
    { code: 'CUST-0002', name: 'Dilshan Wickramasinghe', email: 'dilshan.w@demo.local', phone: '+94 71 876 0002', address: 'Nugegoda' },
    { code: 'CUST-0003', name: 'Kavindi Fernando', email: 'kavindi.f@demo.local', phone: '+94 76 345 0003', address: 'Mount Lavinia' },
    { code: 'CUST-0004', name: 'Amila Jayawardena', email: 'amila.j@demo.local', phone: '+94 70 987 0004', address: 'Battaramulla' },
    { code: 'CUST-0005', name: 'Sanduni De Silva', email: 'sanduni.ds@demo.local', phone: '+94 78 456 0005', address: 'Rajagiriya' },
    { code: 'CUST-0006', name: 'Rohan Senanayake', email: 'rohan.s@demo.local', phone: '+94 75 112 0006', address: 'Dehiwala' },
    { code: 'CUST-0007', name: 'Tharushi Alwis', email: 'tharushi.a@demo.local', phone: '+94 72 556 0007', address: 'Kohuwala' },
    { code: 'CUST-0008', name: 'Chathura Rajapakse', email: 'chathura.r@demo.local', phone: '+94 77 667 0008', address: 'Kotte' },
    { code: 'CUST-0009', name: 'Nimasha Gunasekara', email: 'nimasha.g@demo.local', phone: '+94 71 334 0009', address: 'Havelock Town' },
    { code: 'CUST-0010', name: 'Roshan Abeysekara', email: 'roshan.a@demo.local', phone: '+94 76 778 0010', address: 'Cinnamon Gardens' },
    { code: 'CUST-0011', name: 'Hansani Weerasinghe', email: 'hansani.w@demo.local', phone: '+94 70 223 0011', address: 'Wellawatte' },
    { code: 'CUST-0012', name: 'Malith Dissanayake', email: 'malith.d@demo.local', phone: '+94 78 889 0012', address: 'Bambalapitiya' },
    { code: 'CUST-0013', name: 'Poornima Ranasinghe', email: 'poornima.r@demo.local', phone: '+94 75 445 0013', address: 'Kollupitiya' },
    { code: 'CUST-0014', name: 'Nuwan Kulatunga', email: 'nuwan.k@demo.local', phone: '+94 72 990 0014', address: 'Nawala' },
    { code: 'CUST-0015', name: 'Ishani Samarasinghe', email: 'ishani.s@demo.local', phone: '+94 77 111 0015', address: 'Thalawathugoda' },
    { code: 'CUST-0016', name: 'Sajith Karunaratne', email: 'sajith.k@demo.local', phone: '+94 71 555 0016', address: 'Mirihana' },
    { code: 'CUST-0017', name: 'Dinithi Senaratne', email: 'dinithi.s@demo.local', phone: '+94 76 888 0017', address: 'Pelawatte' },
    { code: 'CUST-0018', name: 'Gayan Fonseka', email: 'gayan.f@demo.local', phone: '+94 70 333 0018', address: 'Maharagama' },
    { code: 'CUST-0019', name: 'Sewwandi Mendis', email: 'sewwandi.m@demo.local', phone: '+94 78 222 0019', address: 'Moratuwa' },
    { code: 'CUST-0020', name: 'Mahesh Wickrama', email: 'mahesh.w@demo.local', phone: '+94 75 777 0020', address: 'Pannipitiya' },
  ];

  const seededCustomers: Array<{ id: string; name: string; code: string }> = [];
  for (const cust of demoCustomers) {
    const inserted = await client.$queryRawUnsafe<Array<{ id: string }>>(
      `INSERT INTO "${schemaName}".customers (code, name, email, phone, address, status)
       VALUES ($1, $2, $3, $4, $5, 'ACTIVE')
       RETURNING id`,
      cust.code,
      cust.name,
      cust.email,
      cust.phone,
      cust.address,
    );
    seededCustomers.push({ id: inserted[0].id, name: cust.name, code: cust.code });
  }

  // 5. Service Categories & Services
  const demoServiceCategories = [
    {
      code: 'CAT-HAIR',
      name: 'Hair Cuts & Styling',
      desc: 'Precision cuts, styling, blow dry and hair treatments',
      services: [
        { code: 'SRV-0001', name: "Women's Signature Cut & Blow Dry", price: 4500, duration: 45 },
        { code: 'SRV-0002', name: "Men's Executive Haircut & Beard Trim", price: 2500, duration: 30 },
        { code: 'SRV-0003', name: 'Kids Haircut & Styling', price: 1800, duration: 30 },
        { code: 'SRV-0004', name: 'Hair Wash & Luxury Blow Dry', price: 2200, duration: 30 },
        { code: 'SRV-0005', name: 'Keratin Smoothing Silk Therapy', price: 18500, duration: 120 },
      ],
    },
    {
      code: 'CAT-COLOR',
      name: 'Hair Coloring & Highlights',
      desc: 'Full global coloring, balayage, foil highlights and gloss toner',
      services: [
        { code: 'SRV-0006', name: 'Custom Balayage & Gloss Toner', price: 16000, duration: 150 },
        { code: 'SRV-0007', name: 'Full Global Hair Color', price: 9500, duration: 90 },
        { code: 'SRV-0008', name: 'Root Touch-up & Grey Coverage', price: 5500, duration: 60 },
        { code: 'SRV-0009', name: 'Foil Highlights (Full Head)', price: 14000, duration: 120 },
      ],
    },
    {
      code: 'CAT-SKIN',
      name: 'Facial & Skin Care',
      desc: 'Deep cleansing, anti-aging, hydration facials and skin rejuvenation',
      services: [
        { code: 'SRV-0010', name: 'Hydra-Glow Deep Cleansing Facial', price: 7500, duration: 60 },
        { code: 'SRV-0011', name: 'Gold Collagen Anti-Aging Facial', price: 9500, duration: 75 },
        { code: 'SRV-0012', name: 'Organic Herbal Glow Facial', price: 5500, duration: 45 },
      ],
    },
    {
      code: 'CAT-NAILS',
      name: 'Nails & Spa Treatments',
      desc: 'Gel manicures, pedicures, acrylic enhancements and nail art',
      services: [
        { code: 'SRV-0013', name: 'Luxury Spa Pedicure & Foot Scrub', price: 3800, duration: 45 },
        { code: 'SRV-0014', name: 'Gel Manicure with Custom Nail Art', price: 4200, duration: 50 },
        { code: 'SRV-0015', name: 'Express Manicure & Shape', price: 2200, duration: 25 },
      ],
    },
  ];

  const seededServices: Array<{ id: string; name: string; code: string; price: number }> = [];
  for (const cat of demoServiceCategories) {
    const catInserted = await client.$queryRawUnsafe<Array<{ id: string }>>(
      `INSERT INTO "${schemaName}".service_categories (code, name, description, is_active)
       VALUES ($1, $2, $3, true)
       RETURNING id`,
      cat.code,
      cat.name,
      cat.desc,
    );
    const catId = catInserted[0].id;

    await client.$executeRawUnsafe(
      `INSERT INTO "${schemaName}".service_category_branches (category_id, branch_id)
       VALUES ($1::uuid, $2::uuid)
       ON CONFLICT DO NOTHING`,
      catId,
      mainBranchId,
    );

    for (const srv of cat.services) {
      const srvInserted = await client.$queryRawUnsafe<Array<{ id: string }>>(
        `INSERT INTO "${schemaName}".services (
           category_id, code, name, description, price, duration_minutes, is_active
         )
         VALUES ($1::uuid, $2, $3, $4, $5, $6, true)
         RETURNING id`,
        catId,
        srv.code,
        srv.name,
        `${srv.name} by salon experts`,
        srv.price,
        srv.duration,
      );
      seededServices.push({
        id: srvInserted[0].id,
        name: srv.name,
        code: srv.code,
        price: srv.price,
      });
    }
  }

  // 6. Product Categories & Products with Stock
  const demoProductCategories = [
    {
      code: 'PC-HAIRCARE',
      name: 'Hair Care & Cleansers',
      desc: 'Shampoos, conditioners and daily hair care',
      products: [
        { code: 'PRD-0001', name: "L'Oreal Absolute Repair Shampoo (500ml)", unit: 'Bottle', cost: 3800, sell: 5400, stock: 25 },
        { code: 'PRD-0002', name: 'Moroccanoil Moisture Conditioner (250ml)', unit: 'Bottle', cost: 4200, sell: 6200, stock: 20 },
      ],
    },
    {
      code: 'PC-TREATMENT',
      name: 'Intensive Treatments & Oils',
      desc: 'Olaplex, Keratin masks and serums',
      products: [
        { code: 'PRD-0003', name: 'Olaplex No.3 Hair Perfector (100ml)', unit: 'Bottle', cost: 7500, sell: 10500, stock: 15 },
        { code: 'PRD-0004', name: 'Organic Moroccan Argan Hair Serum (100ml)', unit: 'Bottle', cost: 2800, sell: 4500, stock: 30 },
        { code: 'PRD-0005', name: 'Keratin Deep Repair Mask (500g)', unit: 'Tub', cost: 3500, sell: 5200, stock: 18 },
      ],
    },
    {
      code: 'PC-STYLING',
      name: 'Styling & Finishing',
      desc: 'Clays, waxes, styling sprays and heat protectants',
      products: [
        { code: 'PRD-0006', name: 'Schwarzkopf Professional Matte Clay (85ml)', unit: 'Jar', cost: 2200, sell: 3500, stock: 22 },
        { code: 'PRD-0007', name: 'GHD Heat Protectant Thermal Spray (120ml)', unit: 'Bottle', cost: 3100, sell: 4800, stock: 16 },
      ],
    },
    {
      code: 'PC-SKINCARE',
      name: 'Facial & Skin Care',
      desc: 'Serums, cleansers and face masks',
      products: [
        { code: 'PRD-0008', name: 'Vitamin C Radiance Face Serum (50ml)', unit: 'Bottle', cost: 2400, sell: 3900, stock: 24 },
        { code: 'PRD-0009', name: 'Cooling Aloe Vera & Cucumber Gel (300ml)', unit: 'Tub', cost: 1200, sell: 2100, stock: 35 },
      ],
    },
    {
      code: 'PC-NAILCARE',
      name: 'Nails & Polish',
      desc: 'Gel polish sets and cuticle oils',
      products: [
        { code: 'PRD-0010', name: 'OPI Professional Gel Polish Set', unit: 'Set', cost: 4500, sell: 6800, stock: 12 },
        { code: 'PRD-0011', name: 'Tea Tree Nourishing Cuticle Oil (30ml)', unit: 'Bottle', cost: 950, sell: 1750, stock: 40 },
      ],
    },
  ];

  const seededProducts: Array<{ id: string; name: string; code: string; sellingPrice: number }> = [];
  for (const pCat of demoProductCategories) {
    const pCatInserted = await client.$queryRawUnsafe<Array<{ id: string }>>(
      `INSERT INTO "${schemaName}".product_categories (code, name, description, is_active)
       VALUES ($1, $2, $3, true)
       RETURNING id`,
      pCat.code,
      pCat.name,
      pCat.desc,
    );
    const pCatId = pCatInserted[0].id;

    for (const prod of pCat.products) {
      const prodInserted = await client.$queryRawUnsafe<Array<{ id: string }>>(
        `INSERT INTO "${schemaName}".products (
           category_id, code, name, description, unit, cost_price, selling_price, is_active
         )
         VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, true)
         RETURNING id`,
        pCatId,
        prod.code,
        prod.name,
        `${prod.name} - Premium Salon Grade`,
        prod.unit,
        prod.cost,
        prod.sell,
      );
      const prodId = prodInserted[0].id;

      await client.$executeRawUnsafe(
        `INSERT INTO "${schemaName}".product_branches (product_id, branch_id)
         VALUES ($1::uuid, $2::uuid)
         ON CONFLICT DO NOTHING`,
        prodId,
        mainBranchId,
      );

      // Record Opening Stock IN movement
      await client.$executeRawUnsafe(
        `INSERT INTO "${schemaName}".stock_movements (branch_id, product_id, type, quantity, notes, created_at)
         VALUES ($1::uuid, $2::uuid, 'IN', $3, 'Initial inventory opening balance', NOW() - INTERVAL '30 days')`,
        mainBranchId,
        prodId,
        prod.stock,
      );

      seededProducts.push({
        id: prodId,
        name: prod.name,
        code: prod.code,
        sellingPrice: prod.sell,
      });
    }
  }

  // 7. Realistic Appointments (Historical, Today, Upcoming)
  const appointmentConfigs = [
    {
      code: 'APT-1001',
      custIdx: 0,
      empIdx: 0,
      srvIdx: 0,
      dateOffsetDays: 0, // Today
      start: '09:30:00',
      end: '10:15:00',
      status: 'CONFIRMED',
      notes: 'Customer requested Kasun for haircut & blow dry',
    },
    {
      code: 'APT-1002',
      custIdx: 1,
      empIdx: 4,
      srvIdx: 1,
      dateOffsetDays: 0, // Today
      start: '11:00:00',
      end: '11:30:00',
      status: 'CONFIRMED',
      notes: 'Men executive haircut & beard styling',
    },
    {
      code: 'APT-1003',
      custIdx: 2,
      empIdx: 1,
      srvIdx: 5, // Balayage
      dateOffsetDays: 0, // Today
      start: '13:30:00',
      end: '16:00:00',
      status: 'CONFIRMED',
      notes: 'Custom Balayage & gloss toner consultation',
    },
    {
      code: 'APT-1004',
      custIdx: 3,
      empIdx: 2,
      srvIdx: 9, // Hydra-Glow Facial
      dateOffsetDays: 0, // Today
      start: '16:30:00',
      end: '17:30:00',
      status: 'CONFIRMED',
      notes: 'Hydra facial treatment session',
    },
    {
      code: 'APT-1005',
      custIdx: 4,
      empIdx: 3,
      srvIdx: 12, // Spa Pedicure
      dateOffsetDays: 1, // Tomorrow
      start: '10:00:00',
      end: '10:45:00',
      status: 'CONFIRMED',
      notes: 'Luxury spa pedicure session',
    },
    {
      code: 'APT-1006',
      custIdx: 5,
      empIdx: 0,
      srvIdx: 4, // Keratin
      dateOffsetDays: 1, // Tomorrow
      start: '14:00:00',
      end: '16:00:00',
      status: 'CONFIRMED',
      notes: 'Keratin smoothing therapy appointment',
    },
    {
      code: 'APT-1007',
      custIdx: 6,
      empIdx: 1,
      srvIdx: 6, // Global color
      dateOffsetDays: 2, // Day after tomorrow
      start: '11:30:00',
      end: '13:00:00',
      status: 'CONFIRMED',
      notes: 'Global hair color and styling',
    },
    {
      code: 'APT-1008',
      custIdx: 7,
      empIdx: 3,
      srvIdx: 13, // Gel manicure
      dateOffsetDays: 3,
      start: '15:00:00',
      end: '15:50:00',
      status: 'CONFIRMED',
      notes: 'Gel manicure with custom nail art',
    },
    {
      code: 'APT-1009',
      custIdx: 8,
      empIdx: 0,
      srvIdx: 0,
      dateOffsetDays: -1, // Yesterday
      start: '10:00:00',
      end: '10:45:00',
      status: 'COMPLETED',
      notes: 'Women signature haircut completed',
    },
    {
      code: 'APT-1010',
      custIdx: 9,
      empIdx: 4,
      srvIdx: 1,
      dateOffsetDays: -1, // Yesterday
      start: '14:00:00',
      end: '14:30:00',
      status: 'COMPLETED',
      notes: 'Men haircut completed',
    },
    {
      code: 'APT-1011',
      custIdx: 10,
      empIdx: 2,
      srvIdx: 10, // Anti-aging facial
      dateOffsetDays: -2,
      start: '11:00:00',
      end: '12:15:00',
      status: 'COMPLETED',
      notes: 'Anti-aging facial finished',
    },
    {
      code: 'APT-1012',
      custIdx: 11,
      empIdx: 1,
      srvIdx: 7, // Root touch up
      dateOffsetDays: -3,
      start: '15:30:00',
      end: '16:30:00',
      status: 'COMPLETED',
      notes: 'Root touch up completed',
    },
    {
      code: 'APT-1013',
      custIdx: 12,
      empIdx: 0,
      srvIdx: 0,
      dateOffsetDays: -4,
      start: '13:00:00',
      end: '13:45:00',
      status: 'CANCELLED',
      notes: 'Customer rescheduled due to traffic',
    },
  ];

  for (const apt of appointmentConfigs) {
    const cust = seededCustomers[apt.custIdx];
    const emp = seededEmployees[apt.empIdx];
    const srv = seededServices[apt.srvIdx];
    if (!cust || !emp || !srv) continue;

    const aptRows = await client.$queryRawUnsafe<Array<{ id: string }>>(
      `INSERT INTO "${schemaName}".appointments (
         code, customer_id, branch_id, appointment_date, start_time, end_time,
         status, notes, created_by, employee_id
       )
       VALUES (
         $1, $2::uuid, $3::uuid,
         CURRENT_DATE + ($4 || ' days')::INTERVAL,
         $5::time, $6::time,
         $7::"${schemaName}".appointment_status,
         $8, $9::uuid, $10::uuid
       )
       RETURNING id`,
      apt.code,
      cust.id,
      mainBranchId,
      apt.dateOffsetDays,
      apt.start,
      apt.end,
      apt.status,
      apt.notes,
      adminUserId,
      emp.id,
    );
    const aptId = aptRows[0].id;

    await client.$executeRawUnsafe(
      `INSERT INTO "${schemaName}".appointment_services (
         appointment_id, service_id, service_name, price, duration_minutes
       )
       VALUES ($1::uuid, $2::uuid, $3, $4, $5)`,
      aptId,
      srv.id,
      srv.name,
      srv.price,
      45,
    );
  }

  // 8. Realistic POS / Sales (10 Completed Sales over past 10 days)
  const saleConfigs = [
    {
      saleNo: 'SAL-2026-0001',
      custIdx: 0,
      empIdx: 0,
      srvIdx: 0, // 4500
      prodIdx: 0, // 5400
      daysAgo: 9,
      method: 'CARD',
    },
    {
      saleNo: 'SAL-2026-0002',
      custIdx: 1,
      empIdx: 4,
      srvIdx: 1, // 2500
      prodIdx: 5, // 3500
      daysAgo: 8,
      method: 'CASH',
    },
    {
      saleNo: 'SAL-2026-0003',
      custIdx: 2,
      empIdx: 1,
      srvIdx: 5, // 16000
      prodIdx: 2, // 10500
      daysAgo: 7,
      method: 'CARD',
    },
    {
      saleNo: 'SAL-2026-0004',
      custIdx: 3,
      empIdx: 2,
      srvIdx: 9, // 7500
      prodIdx: 7, // 3900
      daysAgo: 6,
      method: 'CASH',
    },
    {
      saleNo: 'SAL-2026-0005',
      custIdx: 4,
      empIdx: 3,
      srvIdx: 12, // 3800
      prodIdx: 9, // 6800
      daysAgo: 5,
      method: 'CARD',
    },
    {
      saleNo: 'SAL-2026-0006',
      custIdx: 5,
      empIdx: 0,
      srvIdx: 4, // 18500
      prodIdx: 4, // 5200
      daysAgo: 4,
      method: 'CARD',
    },
    {
      saleNo: 'SAL-2026-0007',
      custIdx: 6,
      empIdx: 1,
      srvIdx: 6, // 9500
      prodIdx: 1, // 6200
      daysAgo: 3,
      method: 'CASH',
    },
    {
      saleNo: 'SAL-2026-0008',
      custIdx: 7,
      empIdx: 3,
      srvIdx: 13, // 4200
      prodIdx: 10, // 1750
      daysAgo: 2,
      method: 'CARD',
    },
    {
      saleNo: 'SAL-2026-0009',
      custIdx: 8,
      empIdx: 0,
      srvIdx: 0, // 4500
      prodIdx: null,
      daysAgo: 1,
      method: 'CASH',
    },
    {
      saleNo: 'SAL-2026-0010',
      custIdx: 9,
      empIdx: 4,
      srvIdx: 1, // 2500
      prodIdx: 3, // 4500
      daysAgo: 0, // Today
      method: 'CASH',
    },
  ];

  for (const s of saleConfigs) {
    const cust = seededCustomers[s.custIdx];
    const emp = seededEmployees[s.empIdx];
    const srv = seededServices[s.srvIdx];
    const prod = s.prodIdx !== null ? seededProducts[s.prodIdx] : null;

    let subtotal = srv.price;
    if (prod) subtotal += prod.sellingPrice;
    const total = subtotal;

    const saleRows = await client.$queryRawUnsafe<Array<{ id: string }>>(
      `INSERT INTO "${schemaName}".sales (
         branch_id, customer_id, sale_number, subtotal, discount, tax, total,
         status, notes, created_by, created_at, updated_at
       )
       VALUES (
         $1::uuid, $2::uuid, $3, $4, 0, 0, $5,
         'COMPLETED', 'Demo POS checkout transaction', $6::uuid,
         NOW() - ($7 || ' days')::INTERVAL,
         NOW() - ($7 || ' days')::INTERVAL
       )
       RETURNING id`,
      mainBranchId,
      cust.id,
      s.saleNo,
      subtotal,
      total,
      adminUserId,
      s.daysAgo,
    );
    const saleId = saleRows[0].id;

    // Service item
    const srvItemRows = await client.$queryRawUnsafe<Array<{ id: string }>>(
      `INSERT INTO "${schemaName}".sale_items (
         sale_id, item_type, service_id, product_id, quantity, unit_price, discount, total, created_at
       )
       VALUES ($1::uuid, 'service', $2::uuid, NULL, 1, $3, 0, $3, NOW() - ($4 || ' days')::INTERVAL)
       RETURNING id`,
      saleId,
      srv.id,
      srv.price,
      s.daysAgo,
    );
    // Link employee to service item
    await client.$executeRawUnsafe(
      `INSERT INTO "${schemaName}".sale_item_employees (sale_item_id, employee_id, created_at)
       VALUES ($1::uuid, $2::uuid, NOW() - ($3 || ' days')::INTERVAL)`,
      srvItemRows[0].id,
      emp.id,
      s.daysAgo,
    );

    // Product item if present
    if (prod) {
      await client.$executeRawUnsafe(
        `INSERT INTO "${schemaName}".sale_items (
           sale_id, item_type, service_id, product_id, quantity, unit_price, discount, total, created_at
         )
         VALUES ($1::uuid, 'product', NULL, $2::uuid, 1, $3, 0, $3, NOW() - ($4 || ' days')::INTERVAL)`,
        saleId,
        prod.id,
        prod.sellingPrice,
        s.daysAgo,
      );

      // Decrement stock movement (OUT)
      await client.$executeRawUnsafe(
        `INSERT INTO "${schemaName}".stock_movements (
           branch_id, product_id, type, quantity, notes, created_at
         )
         VALUES ($1::uuid, $2::uuid, 'OUT', 1, $3, NOW() - ($4 || ' days')::INTERVAL)`,
        mainBranchId,
        prod.id,
        `POS Sale #${s.saleNo}`,
        s.daysAgo,
      );
    }

    // Payment record
    await client.$executeRawUnsafe(
      `INSERT INTO "${schemaName}".payments (
         sale_id, method, amount, status, reference_number, notes, created_at
       )
       VALUES (
         $1::uuid, $2::"${schemaName}".payment_method, $3, 'COMPLETED',
         $4, 'POS Completed Payment', NOW() - ($5 || ' days')::INTERVAL
       )`,
      saleId,
      s.method,
      total,
      `REF-${s.saleNo}`,
      s.daysAgo,
    );
  }

  // 9. Realistic Expenses
  const demoExpenses = [
    { code: 'EXP-0001', catCode: 'RENT', title: 'Monthly Salon Space Rent (Colombo 07)', amount: 150000, daysAgo: 15, method: 'BANK_TRANSFER' },
    { code: 'EXP-0002', catCode: 'UTILITIES', title: 'CEB Commercial Electricity Bill', amount: 38500, daysAgo: 12, method: 'BANK_TRANSFER' },
    { code: 'EXP-0003', catCode: 'UTILITIES', title: 'National Water Supply Bill', amount: 8200, daysAgo: 10, method: 'CASH' },
    { code: 'EXP-0004', catCode: 'UTILITIES', title: 'SLT High-Speed Fibre Internet', amount: 12500, daysAgo: 8, method: 'CARD' },
    { code: 'EXP-0005', catCode: 'SUPPLIES', title: 'Salon Disposables, Towels & Sanitizers', amount: 16800, daysAgo: 6, method: 'CASH' },
    { code: 'EXP-0006', catCode: 'MARKETING', title: 'Meta & Instagram Social Media Boost', amount: 25000, daysAgo: 5, method: 'CARD' },
    { code: 'EXP-0007', catCode: 'MAINTENANCE', title: 'AC Servicing & Dryer Maintenance', amount: 14500, daysAgo: 2, method: 'CASH' },
  ];

  for (const exp of demoExpenses) {
    const catRows = await client.$queryRawUnsafe<Array<{ id: string }>>(
      `SELECT id FROM "${schemaName}".expense_categories WHERE code = $1 LIMIT 1`,
      exp.catCode,
    );
    const catId = catRows.length > 0 ? catRows[0].id : null;

    await client.$executeRawUnsafe(
      `INSERT INTO "${schemaName}".expenses (
         code, branch_id, category_id, title, amount, expense_date, payment_method,
         notes, status, created_by, is_system_generated, created_at, updated_at
       )
       VALUES (
         $1, $2::uuid, $3::uuid, $4, $5,
         CURRENT_DATE - ($6 || ' days')::INTERVAL,
         $7, 'Operational demo expense', 'ACTIVE', $8::uuid, false,
         NOW() - ($6 || ' days')::INTERVAL,
         NOW() - ($6 || ' days')::INTERVAL
       )`,
      exp.code,
      mainBranchId,
      catId,
      exp.title,
      exp.amount,
      exp.daysAgo,
      exp.method,
      adminUserId,
    );
  }

  return {
    mainBranchId,
    adminUserId,
    customers: seededCustomers,
    employees: seededEmployees,
    services: seededServices,
    products: seededProducts,
  };
}
