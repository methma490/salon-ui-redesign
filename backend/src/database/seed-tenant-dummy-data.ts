import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedTenantData() {
  console.log('--- Seeding Tenant Dummy Data for Salon ---');
  await prisma.$connect();

  const tenants = await prisma.tenant.findMany({
    where: { status: 'ACTIVE' },
  });

  if (tenants.length === 0) {
    console.log('No active tenant found.');
    return;
  }

  for (const tenant of tenants) {
    const schema = tenant.schemaName;
    console.log(`\n========================================`);
    console.log(`Processing Tenant: "${tenant.name}" (Schema: "${schema}")`);
    console.log(`========================================`);

    // Set search_path for this schema
    await prisma.$executeRawUnsafe(`SET search_path TO "${schema}", public`);

    // 1. Get or Create Main Branch
    const branches = await prisma.$queryRawUnsafe<Array<{ id: string; name: string }>>(
      `SELECT id, name FROM "${schema}".branches LIMIT 5`
    );

    let mainBranchId: string;
    if (branches.length === 0) {
      console.log('Creating default main branch...');
      const createdBranch = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
        `INSERT INTO "${schema}".branches (code, name, email, phone, address, is_main, status)
         VALUES ('BR001', 'Main Salon Branch - Colombo', 'branch@hairavanue.com', '+94 11 234 5678', 'No 45, Galle Road, Colombo 03', true, 'ACTIVE')
         RETURNING id`
      );
      mainBranchId = createdBranch[0].id;
    } else {
      mainBranchId = branches[0].id;
    }
    console.log(`✓ Main Branch ID: ${mainBranchId}`);

    // 2. Get a Salon User to use as created_by
    const users = await prisma.$queryRawUnsafe<Array<{ id: string; name: string }>>(
      `SELECT id, name FROM "${schema}".users LIMIT 5`
    );
    let defaultUserId: string | null = users.length > 0 ? users[0].id : null;
    if (!defaultUserId) {
      const createdUser = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
        `INSERT INTO "${schema}".users (name, email, phone, status)
         VALUES ('Salon Admin', 'admin@hairavanue.com', '+94 77 123 4567', 'ACTIVE')
         RETURNING id`
      );
      defaultUserId = createdUser[0].id;
    }
    console.log(`✓ Default User ID: ${defaultUserId}`);

    // 3. Seed / Ensure Customers
    console.log('Seeding Customers...');
    const dummyCustomers = [
      { code: 'CUST001', name: 'Nadeesha Perera', email: 'nadeesha.p@gmail.com', phone: '+94 77 234 5671', address: 'Colombo 07' },
      { code: 'CUST002', name: 'Dilshan Wickramasinghe', email: 'dilshan.w@gmail.com', phone: '+94 71 876 5432', address: 'Nugegoda' },
      { code: 'CUST003', name: 'Kavindi Fernando', email: 'kavindi.f@outlook.com', phone: '+94 76 345 6789', address: 'Mount Lavinia' },
      { code: 'CUST004', name: 'Amila Jayawardena', email: 'amila.j@yahoo.com', phone: '+94 70 987 6543', address: 'Battaramulla' },
      { code: 'CUST005', name: 'Sanduni De Silva', email: 'sanduni.ds@gmail.com', phone: '+94 78 456 7890', address: 'Rajagiriya' },
      { code: 'CUST006', name: 'Rohan Senanayake', email: 'rohan.s@gmail.com', phone: '+94 75 112 2334', address: 'Dehiwala' },
      { code: 'CUST007', name: 'Tharushi Alwis', email: 'tharushi.a@gmail.com', phone: '+94 72 556 6778', address: 'Kohuwala' },
    ];

    for (const c of dummyCustomers) {
      await prisma.$executeRawUnsafe(
        `INSERT INTO "${schema}".customers (code, name, email, phone, address, status)
         VALUES ($1, $2, $3, $4, $5, 'ACTIVE')
         ON CONFLICT (code) DO UPDATE SET
           name = EXCLUDED.name,
           email = EXCLUDED.email,
           phone = EXCLUDED.phone,
           address = EXCLUDED.address`,
        c.code, c.name, c.email, c.phone, c.address
      );
    }
    const customerList = await prisma.$queryRawUnsafe<Array<{ id: string; name: string }>>(
      `SELECT id, name FROM "${schema}".customers ORDER BY code`
    );
    console.log(`✓ Seeded ${customerList.length} Customers`);

    // 4. Seed Service Categories & Services
    console.log('Seeding Service Categories & Services...');
    const dummyCategories = [
      { code: 'SC_HAIR', name: 'Hair Cuts & Styling', desc: 'Precision cuts, styling, blow dry and treatments' },
      { code: 'SC_COLOR', name: 'Hair Coloring & Highlights', desc: 'Global color, balayage, highlights and toning' },
      { code: 'SC_SKIN', name: 'Facial & Skin Therapy', desc: 'Deep cleansing, anti-aging, hydration facials' },
      { code: 'SC_NAILS', name: 'Manicure & Pedicure', desc: 'Gel nails, nail art, luxury spa pedicures' },
      { code: 'SC_BRIDAL', name: 'Bridal & Grooming', desc: 'Full bridal dressing, styling and makeup packages' },
    ];

    for (const cat of dummyCategories) {
      await prisma.$executeRawUnsafe(
        `INSERT INTO "${schema}".service_categories (code, name, description, is_active)
         VALUES ($1, $2, $3, true)
         ON CONFLICT (code) DO UPDATE SET
           name = EXCLUDED.name,
           description = EXCLUDED.description,
           is_active = true`,
        cat.code, cat.name, cat.desc
      );
    }

    const scHair = (await prisma.$queryRawUnsafe<Array<{ id: string }>>(`SELECT id FROM "${schema}".service_categories WHERE code = 'SC_HAIR'`))[0]?.id;
    const scColor = (await prisma.$queryRawUnsafe<Array<{ id: string }>>(`SELECT id FROM "${schema}".service_categories WHERE code = 'SC_COLOR'`))[0]?.id;
    const scSkin = (await prisma.$queryRawUnsafe<Array<{ id: string }>>(`SELECT id FROM "${schema}".service_categories WHERE code = 'SC_SKIN'`))[0]?.id;
    const scNails = (await prisma.$queryRawUnsafe<Array<{ id: string }>>(`SELECT id FROM "${schema}".service_categories WHERE code = 'SC_NAILS'`))[0]?.id;

    const dummyServices = [
      { code: 'SRV_CUT_LADIES', catId: scHair, name: "Women's Signature Haircut & Blow-dry", price: 4500, duration: 45 },
      { code: 'SRV_CUT_GENTS', catId: scHair, name: "Men's Executive Haircut & Beard Trim", price: 2500, duration: 30 },
      { code: 'SRV_KERATIN', catId: scHair, name: 'Keratin Smoothing Treatment', price: 18500, duration: 120 },
      { code: 'SRV_BALAYAGE', catId: scColor, name: 'Custom Balayage & Gloss Toner', price: 16000, duration: 150 },
      { code: 'SRV_GLOBAL_COL', catId: scColor, name: 'Full Global Hair Color', price: 9500, duration: 90 },
      { code: 'SRV_HYDRA_FACIAL', catId: scSkin, name: 'Hydra-Glow Deep Cleansing Facial', price: 7500, duration: 60 },
      { code: 'SRV_SPA_PEDICURE', catId: scNails, name: 'Luxury Spa Pedicure & Foot Scrub', price: 3800, duration: 45 },
      { code: 'SRV_GEL_MANICURE', catId: scNails, name: 'Gel Manicure with Nail Art', price: 4200, duration: 50 },
    ];

    for (const s of dummyServices) {
      await prisma.$executeRawUnsafe(
        `INSERT INTO "${schema}".services (category_id, code, name, description, price, duration_minutes, is_active)
         VALUES ($1::UUID, $2, $3, $4, $5, $6, true)
         ON CONFLICT (code) DO UPDATE SET
           category_id = EXCLUDED.category_id,
           name = EXCLUDED.name,
           price = EXCLUDED.price,
           duration_minutes = EXCLUDED.duration_minutes,
           is_active = true`,
        s.catId, s.code, s.name, `${s.name} by salon experts`, s.price, s.duration
      );
    }
    const serviceList = await prisma.$queryRawUnsafe<Array<{ id: string; code: string; name: string; price: number; duration_minutes: number }>>(
      `SELECT id, code, name, price, duration_minutes FROM "${schema}".services`
    );
    console.log(`✓ Seeded ${serviceList.length} Services`);

    // 5. Seed Employees
    console.log('Seeding Employees...');
    const dummyEmployees = [
      {
        code: 'EMP001',
        name: 'Kasun Rathnayake',
        email: 'kasun.r@hairavanue.com',
        phone: '+94 77 345 6701',
        designation: 'Creative Director & Master Stylist',
        basicSalary: 95000,
        joinedDate: '2023-01-15',
        maxAdvancePct: 50,
      },
      {
        code: 'EMP002',
        name: 'Ishara Jayatillake',
        email: 'ishara.j@hairavanue.com',
        phone: '+94 71 456 7802',
        designation: 'Senior Hair Colorist',
        basicSalary: 80000,
        joinedDate: '2023-04-01',
        maxAdvancePct: 50,
      },
      {
        code: 'EMP003',
        name: 'Sachini Bandara',
        email: 'sachini.b@hairavanue.com',
        phone: '+94 76 567 8903',
        designation: 'Skin & Facial Specialist',
        basicSalary: 70000,
        joinedDate: '2023-08-10',
        maxAdvancePct: 40,
      },
      {
        code: 'EMP004',
        name: 'Anuki Wijesinghe',
        email: 'anuki.w@hairavanue.com',
        phone: '+94 70 678 9004',
        designation: 'Senior Nail & Lash Artist',
        basicSalary: 60000,
        joinedDate: '2024-01-10',
        maxAdvancePct: 50,
      },
      {
        code: 'EMP005',
        name: 'Dhanushka Perera',
        email: 'dhanushka.p@hairavanue.com',
        phone: '+94 78 789 0105',
        designation: 'Junior Hair Stylist & Barber',
        basicSalary: 48000,
        joinedDate: '2024-06-01',
        maxAdvancePct: 30,
      },
      {
        code: 'EMP006',
        name: 'Malki Gunawardena',
        email: 'malki.g@hairavanue.com',
        phone: '+94 75 890 1206',
        designation: 'Front Desk Coordinator',
        basicSalary: 45000,
        joinedDate: '2024-03-15',
        maxAdvancePct: 40,
      },
    ];

    for (const emp of dummyEmployees) {
      await prisma.$executeRawUnsafe(
        `INSERT INTO "${schema}".employees (
           branch_id, code, name, email, phone, designation, status, joined_date,
           basic_salary, epf_enabled, etf_enabled, max_advance_percentage
         )
         VALUES ($1::UUID, $2, $3, $4, $5, $6, 'ACTIVE', $7::DATE, $8, true, true, $9)
         ON CONFLICT (code) DO UPDATE SET
           name = EXCLUDED.name,
           email = EXCLUDED.email,
           phone = EXCLUDED.phone,
           designation = EXCLUDED.designation,
           basic_salary = EXCLUDED.basic_salary,
           max_advance_percentage = EXCLUDED.max_advance_percentage`,
        mainBranchId, emp.code, emp.name, emp.email, emp.phone, emp.designation,
        emp.joinedDate, emp.basicSalary, emp.maxAdvancePct
      );
    }
    const employeeList = await prisma.$queryRawUnsafe<Array<{ id: string; code: string; name: string }>>(
      `SELECT id, code, name FROM "${schema}".employees ORDER BY code`
    );
    console.log(`✓ Seeded ${employeeList.length} Employees`);

    // 6. Seed Product Categories, Products & Stock
    console.log('Seeding Product Categories, Products & Stock...');
    const dummyProductCategories = [
      { code: 'PC_HAIRCARE', name: 'Hair Care & Cleansers', desc: 'Shampoos, conditioners and daily hair repair' },
      { code: 'PC_TREATMENTS', name: 'Intensive Treatments & Oils', desc: 'Keratin, Argan oils, scalp tonics and serums' },
      { code: 'PC_STYLING', name: 'Styling & Finishing', desc: 'Waxes, clays, sprays and heat protectants' },
      { code: 'PC_SKINCARE', name: 'Facial & Body Care', desc: 'Cleansers, toners, face masks and hydration creams' },
      { code: 'PC_NAILS', name: 'Nail Polish & Care', desc: 'Gel polishes, cuticle oils and nail care tools' },
    ];

    for (const pc of dummyProductCategories) {
      await prisma.$executeRawUnsafe(
        `INSERT INTO "${schema}".product_categories (code, name, description, is_active)
         VALUES ($1, $2, $3, true)
         ON CONFLICT (code) DO UPDATE SET
           name = EXCLUDED.name,
           description = EXCLUDED.description,
           is_active = true`,
        pc.code, pc.name, pc.desc
      );
    }

    const pcHair = (await prisma.$queryRawUnsafe<Array<{ id: string }>>(`SELECT id FROM "${schema}".product_categories WHERE code = 'PC_HAIRCARE'`))[0]?.id;
    const pcTreat = (await prisma.$queryRawUnsafe<Array<{ id: string }>>(`SELECT id FROM "${schema}".product_categories WHERE code = 'PC_TREATMENTS'`))[0]?.id;
    const pcStyle = (await prisma.$queryRawUnsafe<Array<{ id: string }>>(`SELECT id FROM "${schema}".product_categories WHERE code = 'PC_STYLING'`))[0]?.id;
    const pcSkin = (await prisma.$queryRawUnsafe<Array<{ id: string }>>(`SELECT id FROM "${schema}".product_categories WHERE code = 'PC_SKINCARE'`))[0]?.id;
    const pcNail = (await prisma.$queryRawUnsafe<Array<{ id: string }>>(`SELECT id FROM "${schema}".product_categories WHERE code = 'PC_NAILS'`))[0]?.id;

    const dummyProducts = [
      { code: 'PRD001', catId: pcHair, name: "L'Oreal Serie Expert Absolute Repair Shampoo (500ml)", unit: 'Bottle', cost: 3800, sell: 5400, stock: 24 },
      { code: 'PRD002', catId: pcHair, name: "Moroccanoil Moisture Repair Conditioner (250ml)", unit: 'Bottle', cost: 4200, sell: 6200, stock: 18 },
      { code: 'PRD003', catId: pcTreat, name: "Olaplex No.3 Hair Perfector Treatment (100ml)", unit: 'Bottle', cost: 7500, sell: 10500, stock: 12 },
      { code: 'PRD004', catId: pcTreat, name: "Organic Moroccan Argan Hair Serum (100ml)", unit: 'Bottle', cost: 2800, sell: 4500, stock: 30 },
      { code: 'PRD005', catId: pcTreat, name: "Keratin Deep Repair Hair Mask (500g)", unit: 'Tub', cost: 3500, sell: 5200, stock: 15 },
      { code: 'PRD006', catId: pcStyle, name: "Schwarzkopf Professional Matte Texture Clay (85ml)", unit: 'Jar', cost: 2200, sell: 3500, stock: 20 },
      { code: 'PRD007', catId: pcStyle, name: "GHD Heat Protectant Thermal Styling Spray (120ml)", unit: 'Bottle', cost: 3100, sell: 4800, stock: 16 },
      { code: 'PRD008', catId: pcSkin, name: "Glow Radiance Vitamin C Hydrating Face Serum (50ml)", unit: 'Bottle', cost: 2400, sell: 3900, stock: 22 },
      { code: 'PRD009', catId: pcSkin, name: "Soothing Aloe Vera & Cucumber Cooling Gel (300ml)", unit: 'Tub', cost: 1200, sell: 2100, stock: 35 },
      { code: 'PRD010', catId: pcNail, name: "OPI Infinite Shine Professional Gel Polish Set", unit: 'Set', cost: 4500, sell: 6800, stock: 10 },
      { code: 'PRD011', catId: pcNail, name: "Nourishing Tea Tree Cuticle Revitalizer Oil (30ml)", unit: 'Bottle', cost: 950, sell: 1750, stock: 40 },
    ];

    for (const p of dummyProducts) {
      const inserted = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
        `INSERT INTO "${schema}".products (category_id, code, name, description, unit, cost_price, selling_price, is_active)
         VALUES ($1::UUID, $2, $3, $4, $5, $6, $7, true)
         ON CONFLICT (code) DO UPDATE SET
           category_id = EXCLUDED.category_id,
           name = EXCLUDED.name,
           unit = EXCLUDED.unit,
           cost_price = EXCLUDED.cost_price,
           selling_price = EXCLUDED.selling_price,
           is_active = true
         RETURNING id`,
        p.catId, p.code, p.name, `${p.name} - Premium Salon Grade`, p.unit, p.cost, p.sell
      );
      const prodId = inserted[0]?.id;
      if (prodId) {
        // Link to main branch
        await prisma.$executeRawUnsafe(
          `INSERT INTO "${schema}".product_branches (product_id, branch_id)
           VALUES ($1::UUID, $2::UUID)
           ON CONFLICT DO NOTHING`,
          prodId, mainBranchId
        );

        // Record Stock IN Movement if none exists
        const existingStock = await prisma.$queryRawUnsafe<Array<{ count: string }>>(
          `SELECT count(*) FROM "${schema}".stock_movements WHERE product_id = $1::UUID`,
          prodId
        );
        if (parseInt(existingStock[0]?.count || '0', 10) === 0) {
          await prisma.$executeRawUnsafe(
            `INSERT INTO "${schema}".stock_movements (branch_id, product_id, type, quantity, notes)
             VALUES ($1::UUID, $2::UUID, 'IN', $3, 'Initial inventory opening balance')`,
            mainBranchId, prodId, p.stock
          );
        }
      }
    }
    const productList = await prisma.$queryRawUnsafe<Array<{ id: string; name: string }>>(
      `SELECT id, name FROM "${schema}".products`
    );
    console.log(`✓ Seeded ${productList.length} Products with Stock`);

    // 7. Seed Appointments (Today, Tomorrow, Past Week)
    console.log('Seeding Appointments...');
    const today = new Date();
    const formatDateStr = (d: Date) => d.toISOString().split('T')[0];

    const dToday = formatDateStr(today);
    const dTomorrow = formatDateStr(new Date(today.getTime() + 86400000));
    const dDayAfter = formatDateStr(new Date(today.getTime() + 86400000 * 2));
    const dYesterday = formatDateStr(new Date(today.getTime() - 86400000));
    const d2DaysAgo = formatDateStr(new Date(today.getTime() - 86400000 * 2));

    const dummyAppointments = [
      {
        code: 'APT-1001',
        custId: customerList[0]?.id,
        date: dToday,
        start: '09:30:00',
        end: '10:30:00',
        status: 'CONFIRMED',
        notes: 'Requested senior stylist Kasun for haircut & styling',
        services: [serviceList[0]],
      },
      {
        code: 'APT-1002',
        custId: customerList[1]?.id,
        date: dToday,
        start: '11:00:00',
        end: '11:45:00',
        status: 'CONFIRMED',
        notes: 'Executive haircut and styling before business meeting',
        services: [serviceList[1]],
      },
      {
        code: 'APT-1003',
        custId: customerList[2]?.id,
        date: dToday,
        start: '13:30:00',
        end: '15:30:00',
        status: 'PENDING',
        notes: 'Full balayage consultation and gloss toning treatment',
        services: [serviceList[3]],
      },
      {
        code: 'APT-1004',
        custId: customerList[3]?.id,
        date: dToday,
        start: '16:00:00',
        end: '17:00:00',
        status: 'CONFIRMED',
        notes: 'Hydra-glow facial appointment',
        services: [serviceList[5]],
      },
      {
        code: 'APT-1005',
        custId: customerList[4]?.id,
        date: dTomorrow,
        start: '10:00:00',
        end: '11:00:00',
        status: 'CONFIRMED',
        notes: 'Spa manicure & pedicure session',
        services: [serviceList[6], serviceList[7]],
      },
      {
        code: 'APT-1006',
        custId: customerList[5]?.id,
        date: dTomorrow,
        start: '14:00:00',
        end: '16:00:00',
        status: 'PENDING',
        notes: 'Keratin smoothing treatment inquiry',
        services: [serviceList[2]],
      },
      {
        code: 'APT-1007',
        custId: customerList[6]?.id,
        date: dDayAfter,
        start: '11:30:00',
        end: '13:00:00',
        status: 'CONFIRMED',
        notes: 'Global hair color and styling',
        services: [serviceList[4]],
      },
      {
        code: 'APT-1008',
        custId: customerList[0]?.id,
        date: dYesterday,
        start: '10:00:00',
        end: '11:00:00',
        status: 'COMPLETED',
        notes: 'Finished women hair cut & blow dry successfully',
        services: [serviceList[0]],
      },
      {
        code: 'APT-1009',
        custId: customerList[1]?.id,
        date: d2DaysAgo,
        start: '15:00:00',
        end: '15:45:00',
        status: 'COMPLETED',
        notes: 'Men haircut and beard trim completed',
        services: [serviceList[1]],
      },
    ];

    for (const apt of dummyAppointments) {
      if (!apt.custId) continue;
      const aptRows = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
        `INSERT INTO "${schema}".appointments (
           code, customer_id, branch_id, appointment_date, start_time, end_time, status, notes, created_by
         )
         VALUES ($1, $2::UUID, $3::UUID, $4::DATE, $5::TIME, $6::TIME, $7::"${schema}".appointment_status, $8, $9::UUID)
         ON CONFLICT (code) DO UPDATE SET
           customer_id = EXCLUDED.customer_id,
           appointment_date = EXCLUDED.appointment_date,
           start_time = EXCLUDED.start_time,
           end_time = EXCLUDED.end_time,
           status = EXCLUDED.status,
           notes = EXCLUDED.notes
         RETURNING id`,
        apt.code, apt.custId, mainBranchId, apt.date, apt.start, apt.end, apt.status, apt.notes, defaultUserId
      );

      const aptId = aptRows[0]?.id;
      if (aptId && apt.services.length > 0) {
        for (const srv of apt.services) {
          if (!srv) continue;
          await prisma.$executeRawUnsafe(
            `INSERT INTO "${schema}".appointment_services (appointment_id, service_id, service_name, price, duration_minutes)
             VALUES ($1::UUID, $2::UUID, $3, $4, $5)
             ON CONFLICT (appointment_id, service_id) DO UPDATE SET
               service_name = EXCLUDED.service_name,
               price = EXCLUDED.price,
               duration_minutes = EXCLUDED.duration_minutes`,
            aptId, srv.id, srv.name, srv.price, srv.duration_minutes
          );
        }
      }
    }
    const aptCount = await prisma.$queryRawUnsafe<Array<{ count: string }>>(
      `SELECT count(*) FROM "${schema}".appointments`
    );
    console.log(`✓ Seeded ${aptCount[0]?.count} Appointments`);

    // 8. Seed Employee Loans & Advances
    console.log('Seeding Employee Loans & Advances...');
    if (employeeList.length >= 2) {
      const emp1 = employeeList[0].id; // Kasun
      const emp2 = employeeList[1].id; // Ishara
      const emp3 = employeeList[2]?.id || emp1; // Sachini

      // Loan 1: Equipment / Shears Loan
      await prisma.$executeRawUnsafe(
        `INSERT INTO "${schema}".employee_loans (
           employee_id, loan_type, original_amount, remaining_balance, monthly_installment, start_date, status, notes
         )
         SELECT $1::UUID, 'Professional Styling Equipment Loan', 60000, 35000, 5000, '2024-01-01'::DATE, 'ACTIVE'::"${schema}".loan_status, 'Japanese Shears and Styling Kit Purchase'
         WHERE NOT EXISTS (
           SELECT 1 FROM "${schema}".employee_loans WHERE employee_id = $1::UUID AND loan_type = 'Professional Styling Equipment Loan'
         )`,
        emp1
      );

      // Loan 2: Personal Loan
      await prisma.$executeRawUnsafe(
        `INSERT INTO "${schema}".employee_loans (
           employee_id, loan_type, original_amount, remaining_balance, monthly_installment, start_date, status, notes
         )
         SELECT $1::UUID, 'Personal Loan', 100000, 60000, 10000, '2024-02-01'::DATE, 'ACTIVE'::"${schema}".loan_status, 'Home renovation support'
         WHERE NOT EXISTS (
           SELECT 1 FROM "${schema}".employee_loans WHERE employee_id = $1::UUID AND loan_type = 'Personal Loan'
         )`,
        emp2
      );

      // Loan 3: Advanced Education & Masterclass
      await prisma.$executeRawUnsafe(
        `INSERT INTO "${schema}".employee_loans (
           employee_id, loan_type, original_amount, remaining_balance, monthly_installment, start_date, status, notes
         )
         SELECT $1::UUID, 'Education & Masterclass Loan', 50000, 30000, 5000, '2024-05-01'::DATE, 'ACTIVE'::"${schema}".loan_status, 'Vidal Sassoon Advanced Cut Masterclass in Singapore'
         WHERE NOT EXISTS (
           SELECT 1 FROM "${schema}".employee_loans WHERE employee_id = $1::UUID AND loan_type = 'Education & Masterclass Loan'
         )`,
        emp3
      );

      // Employee Advances
      await prisma.$executeRawUnsafe(
        `INSERT INTO "${schema}".employee_advances (
           employee_id, original_amount, remaining_balance, monthly_installment, start_date, status, notes
         )
         SELECT $1::UUID, 25000, 12500, 12500, $2::DATE, 'ACTIVE'::"${schema}".advance_status, 'Monthly mid-salary advance'
         WHERE NOT EXISTS (
           SELECT 1 FROM "${schema}".employee_advances WHERE employee_id = $1::UUID AND notes = 'Monthly mid-salary advance'
         )`,
        emp1, dToday
      );

      await prisma.$executeRawUnsafe(
        `INSERT INTO "${schema}".employee_advances (
           employee_id, original_amount, remaining_balance, monthly_installment, start_date, status, notes
         )
         SELECT $1::UUID, 20000, 10000, 10000, $2::DATE, 'ACTIVE'::"${schema}".advance_status, 'Emergency medical advance'
         WHERE NOT EXISTS (
           SELECT 1 FROM "${schema}".employee_advances WHERE employee_id = $1::UUID AND notes = 'Emergency medical advance'
         )`,
        emp2, dToday
      );
    }
    const loanCount = await prisma.$queryRawUnsafe<Array<{ count: string }>>(
      `SELECT count(*) FROM "${schema}".employee_loans`
    );
    const advanceCount = await prisma.$queryRawUnsafe<Array<{ count: string }>>(
      `SELECT count(*) FROM "${schema}".employee_advances`
    );
    console.log(`✓ Seeded ${loanCount[0]?.count} Employee Loans and ${advanceCount[0]?.count} Employee Advances`);
  }

  console.log('\n✅ Successfully seeded all dummy data for Appointments, Employees, Inventory, and Loans/Advances!\n');
}

seedTenantData()
  .catch((e) => {
    console.error('Error seeding tenant data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
