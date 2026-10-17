import fs from 'fs';

const envContent = fs.readFileSync('.env.local', 'utf-8');
const getEnv = (k) => {
  const m = envContent.match(new RegExp(`${k}=([^\\r\\n]+)`));
  return m ? m[1].trim() : '';
};

const token = getEnv('VERCEL_TOKEN');
const teamId = getEnv('VERCEL_ORG_ID');
const projectId = getEnv('VERCEL_PROJECT_ID');

async function main() {
  const res = await fetch(`https://api.vercel.com/v9/projects/${projectId}/env?teamId=${teamId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await res.json();
  if (data.envs) {
    console.log('Variables configuradas actualmente en Vercel:');
    data.envs.forEach(e => console.log(` - ${e.key} (${e.target?.join(', ')})`));
  } else {
    console.log('Error o respuesta inesperada:', data);
  }
}

main().catch(console.error);
