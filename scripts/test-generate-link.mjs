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
  auth: { autoRefreshToken: false, persistSession: false },
});

async function testRecovery() {
  const testEmail = 'sistemaamexcourier@gmail.com';
  console.log('Testing generateLink for:', testEmail);

  const { data, error } = await supabaseAdmin.auth.admin.generateLink({
    type: 'recovery',
    email: testEmail,
    options: {
      redirectTo: 'https://sistema-amex.online/login?recovered=true',
    },
  });

  if (error) {
    console.error('Error in generateLink:', error);
  } else {
    console.log('Success generating recovery link!');
    console.log('Action link:', data.properties.action_link);
    console.log('User ID:', data.user.id);
  }
}

testRecovery().catch(console.error);
