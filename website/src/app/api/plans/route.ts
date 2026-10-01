import { NextResponse } from 'next/server';
import { fetchPublicPlans } from '@/lib/api';

export const dynamic = 'force-dynamic';
export const revalidate = 60;

export async function GET() {
  try {
    const plans = await fetchPublicPlans();
    return NextResponse.json(plans, {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
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
