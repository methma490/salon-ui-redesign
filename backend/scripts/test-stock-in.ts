import 'dotenv/config';

const BASE = `http://127.0.0.1:${process.env.PORT ?? 3000}`;

async function main() {
  const email = process.argv[2] ?? 'kavindu009lakshan@gmail.com';
  const password = process.argv[3] ?? '00000000';
  const branchId = process.argv[4] ?? '60cb36a2-80b2-4f4c-ad9b-278990ed4f31';
  const productId = process.argv[5] ?? 'c442d0be-9dba-42a3-a49c-cae0716b7e07';

  const loginRes = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const loginData = (await loginRes.json()) as {
    accessToken?: string;
    message?: string;
  };
  console.log('Login status:', loginRes.status, loginData.message ?? 'ok');
  if (!loginData.accessToken) {
    return;
  }

  const headers = {
    Authorization: `Bearer ${loginData.accessToken}`,
    'Content-Type': 'application/json',
  };

  const stockInRes = await fetch(`${BASE}/api/tenant/stock/in`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ branchId, productId, quantity: 10 }),
  });
  const stockInText = await stockInRes.text();
  console.log('Stock in status:', stockInRes.status);
  console.log('Stock in body:', stockInText);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
