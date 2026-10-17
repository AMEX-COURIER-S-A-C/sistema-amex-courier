import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envContent = fs.readFileSync('.env.local', 'utf-8');
const getEnv = (k) => {
  const m = envContent.match(new RegExp(`${k}=([^\\r\\n]+)`));
  return m ? m[1].trim() : '';
};

const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL') || getEnv('SUPABASE_URL');
const serviceKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

async function main() {
  const { data, error } = await supabase.from('perfiles_usuarios').select('*').limit(3);
  if (error) {
    console.error('Error fetching perfiles_usuarios:', error);
  } else {
    console.log('Sample perfiles_usuarios:', data);
  }
}

main().catch(console.error);
