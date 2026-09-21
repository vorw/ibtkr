import { authConfig } from '@/lib/auth-config';
export const dynamic = 'force-dynamic';
export function GET() {
  const headers = { 'Cache-Control': 'no-store' };
  try { return Response.json(authConfig(), { headers }); }
  catch { return Response.json({ error: 'الدخول غير متاح حاليًا.' }, { status: 503, headers }); }
}
