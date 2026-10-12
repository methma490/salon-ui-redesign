async function main() {
  const loginRes = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'demo.plan2@salon.local',
      password: 'DemoSalonPlan2!',
    }),
  });
  const loginData = await loginRes.json();
  const token = loginData.accessToken;
  console.log('Login success, token obtained');

  const pnlRes = await fetch('http://localhost:3000/api/reports/profit-loss', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const pnlData = await pnlRes.json();
  console.log('P&L API Response:');
  console.log(JSON.stringify(pnlData, null, 2));
}

main().catch(console.error);
