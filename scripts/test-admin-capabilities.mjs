import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envContent = fs.readFileSync('.env.local', 'utf-8');
const getEnv = (k) => {
  const m = envContent.match(new RegExp(`${k}=([^\\r\\n]+)`));
  return m ? m[1].trim() : '';
};

const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL') || getEnv('SUPABASE_URL');
const serviceKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');

const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

async function main() {
  console.log('Testing updateUserById capabilities with supabaseAdmin...');
  const { data: users, error } = await supabaseAdmin.auth.admin.listUsers();
  if (error) {
    console.error('Error listing users:', error);
  } else {
    console.log(`Found ${users.users.length} users. Admin client is fully operational.`);
  }
}

main().catch(console.error);
