import 'dotenv/config';

const BASE = `http://127.0.0.1:${process.env.PORT ?? 3000}`;

async function main() {
  const email = process.argv[2] ?? 'kavindu009lakshan@gmail.com';
  const password = process.argv[3] ?? '00000000';

  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const text = await res.text();
  console.log('Status:', res.status);
  console.log('Body:', text);
}

main().catch(console.error);
