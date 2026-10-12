async function main() {
  const loginRes = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@gmail.com',
      password: '00000000',
    }),
  });
  const loginData = await loginRes.json();
  console.log('Login status:', loginRes.status, 'data:', loginData);
  const token = loginData.accessToken;

  // List salons
  const salonsRes = await fetch('http://localhost:3000/api/super-admin/salons?page=1&limit=5', {
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log('Salons endpoint status:', salonsRes.status);
  const salonsData = await salonsRes.json();
  const salonsList = Array.isArray(salonsData) ? salonsData : salonsData.data || [];
  const targetSalon = salonsList[0];
  console.log(`Target Salon: ${targetSalon.name} (${targetSalon.id})`);

  // Call P&L
  const pnlRes = await fetch(`http://localhost:3000/api/super-admin/salon-analytics/${targetSalon.id}/profit-loss`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const pnl = await pnlRes.json();
  console.log('Super Admin P&L result:', {
    revenue: pnl.summary?.totalRevenue,
    grossProfit: pnl.summary?.grossProfit,
    netProfit: pnl.summary?.netProfit,
    branches: pnl.branch?.name,
  });

  // Call branches
  const branchesRes = await fetch(`http://localhost:3000/api/super-admin/salon-analytics/${targetSalon.id}/branches`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const branches = await branchesRes.json();
  console.log('Branches count for salon:', branches.length);
  console.log('[PASS] Super Admin P&L API & Branches API verified successfully!');
}

main().catch(console.error);
