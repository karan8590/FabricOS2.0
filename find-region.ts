import { Client } from 'pg';

const regions = [
  'ap-south-1',
  'ap-southeast-1',
  'ap-northeast-1',
  'ap-northeast-2',
  'ap-southeast-2',
  'us-east-1',
  'us-east-2',
  'us-west-1',
  'us-west-2',
  'eu-central-1',
  'eu-west-1',
  'eu-west-2',
  'eu-west-3',
  'sa-east-1',
  'ca-central-1'
];

async function findRegion() {
  console.log('Searching for correct pooler region...');
  for (const region of regions) {
    const url = `postgresql://postgres.smybdgzxpbiffjhwghor:zaxvo1-vunxic-tiDtyz@aws-0-${region}.pooler.supabase.com:6543/postgres`;
    
    const client = new Client({
      connectionString: url,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 3000
    });

    try {
      await client.connect();
      await client.query('SELECT 1');
      console.log(`\n✅ FOUND IT! Region is: ${region}`);
      console.log(`Pooler URL: ${url}`);
      await client.end();
      return url;
    } catch (e) {
      if (e.message.includes('tenant/user') || e.message.includes('ENOTFOUND')) {
        process.stdout.write('.');
      } else {
        console.log(`\n[${region}] Other error: ${e.message}`);
      }
    }
  }
  console.log('\n❌ Could not find region.');
}

findRegion();
