import { NextResponse } from 'next/server';
import { fetchPublicPlans } from '@/lib/api';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const plans = await fetchPublicPlans();
    return NextResponse.json(plans, {
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Error in /api/plans route handler:', error);
    return NextResponse.json(
      { error: 'Failed to fetch plans from backend' },
      { status: 500 },
    );
  }
}
