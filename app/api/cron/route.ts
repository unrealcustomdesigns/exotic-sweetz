export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { runDailyAlertChecks } from '@/lib/alerts';

// Vercel Cron — runs daily at 6 AM UTC
// Add to vercel.json: { "crons": [{ "path": "/api/cron", "schedule": "0 6 * * *" }] }

export async function GET(request: Request) {
  // Verify cron secret to prevent unauthorized calls
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const results = await runDailyAlertChecks();
    return NextResponse.json({
      ok: true,
      alerts_created: results,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Daily cron failed:', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

