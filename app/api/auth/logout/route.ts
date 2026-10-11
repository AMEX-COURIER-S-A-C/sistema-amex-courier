import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { SESSION_START_COOKIE } from '@/lib/auth/constants';

export async function POST() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  const res = NextResponse.json({ success: true });
  res.cookies.delete(SESSION_START_COOKIE);
  return res;
}
