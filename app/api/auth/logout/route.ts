import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { SESSION_START_COOKIE } from '@/lib/auth/constants';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
  } catch {
    // Continuar con el barrido de cookies aunque falle la llamada remota
  }

  const res = NextResponse.json({ success: true });
  res.cookies.delete(SESSION_START_COOKIE);

  req.cookies.getAll().forEach((cookie) => {
    if (cookie.name.startsWith('sb-') || cookie.name === SESSION_START_COOKIE) {
      res.cookies.delete(cookie.name);
    }
  });

  return res;
}

