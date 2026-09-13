import 'dotenv/config';

const BASE = `http://127.0.0.1:${process.env.PORT ?? 3000}`;

async function main() {
  const email = process.argv[2] ?? 'kavindu@gmail.com';

  const forgot = await fetch(`${BASE}/api/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, portal: 'salon' }),
  });
  console.log('POST forgot-password', forgot.status, await forgot.text());
  console.log('\nCheck backend console for [DEV] reset link if SMTP is not configured.');
}

main().catch(console.error);
