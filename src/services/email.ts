// src/services/email.ts
// Client-side wrappers that call the /api/send-email Vercel serverless function

async function callEmailApi(body: Record<string, unknown>): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    return json;
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error' };
  }
}

export async function sendTripSubmittedEmail(tripId: string) {
  return callEmailApi({ type: 'submission', tripId });
}

export async function sendTripApprovedEmail(
  tripId: string,
  approverRole: 'admin' | 'superadmin',
  approverUserId: string,
  remarks?: string
) {
  return callEmailApi({ type: 'approval', tripId, approverRole, approverUserId, remarks });
}

export async function sendTripRejectedEmail(
  tripId: string,
  approverRole: 'admin' | 'superadmin',
  approverUserId: string,
  remarks: string
) {
  return callEmailApi({ type: 'rejection', tripId, approverRole, approverUserId, remarks });
}
