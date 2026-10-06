const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const compiledSeed = path.resolve(__dirname, '../dist/prisma/seed.js');

if (fs.existsSync(compiledSeed)) {
  require(compiledSeed);
} else {
  const tsSeed = path.resolve(__dirname, 'seed.ts');
  execSync(`npx ts-node --transpile-only "${tsSeed}"`, {
    stdio: 'inherit',
    env: process.env,
  });
}
