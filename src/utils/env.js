// dotenv library in a nutshell

const { readFileSync } = require('node:fs');
const { cwd } = require('node:process');
const { join } = require('node:path');

const env = readFileSync(join(cwd(), '.env'), 'utf8').replace(/\r/g, '');
const lines = env.split('\n');

const records = lines.map((v) => {
  if (v.startsWith('#') || v.length < 1) return [];
  return v.split('=', 2);
});

for (const record of records) {
  if (record.length !== 2) return;

  process.env[record[0]] = record[1];
}