import { NextResponse } from 'next/server'

const STAMPS_PER_REWARD = 10;

export async function POST(req) {
  try {
    const body = await req.json();
    const { userId, stampsEarned, referenceId } = body || {};

    const stampsNum = Number(stampsEarned);
    const numericUserId = Number(userId);
    const refId = String(referenceId ?? '').trim();

    if (!userId || !refId || typeof stampsEarned === 'undefined') {
      return NextResponse.json(
        { success: false, message: 'userId, stampsEarned and referenceId are required' },
        { status: 400 }
      );
    }

    if (!Number.isInteger(stampsNum) || stampsNum <= 0) {
      return NextResponse.json(
        { success: false, message: 'stampsEarned must be a whole number greater than 0' },
        { status: 400 }
      );
    }

    if (!Number.isInteger(numericUserId) || numericUserId <= 0) {
      return NextResponse.json(
        { success: false, message: 'Invalid customer. Please scan the QR code again.' },
        { status: 400 }
      );
    }

    const incomingCookie = req.headers.get('cookie') || '';
    let jwt = '';
    const match = incomingCookie.match(/(?:^|; )payload_token=([^;]+)/);
    if (match && match[1]) {
      jwt = decodeURIComponent(match[1]);
    }

    if (!jwt) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated. Please log in again.' },
        { status: 401 }
      );
    }

    const base = process.env.NEXT_PUBLIC_SERVER_URL || process.env.OFFLINE_BASE_URL || 'https://endpoint.surgecoffee.ae';
    const authHeader = { 'Authorization': `JWT ${jwt}`, 'Content-Type': 'application/json' };

    // Preferred path: the backend's barcode endpoint (looked up via the customer's barcodeToken).
    let barcodeToken = null;
    try {
      const userResp = await fetch(`${base}/api/users/${encodeURIComponent(numericUserId)}`, {
        method: 'GET',
        headers: authHeader,
      });
      if (userResp.ok) {
        const userData = await userResp.json().catch(() => null);
        barcodeToken =
          userData?.barcodeToken ||
          userData?.barcode ||
          userData?.qrToken ||
          userData?.qr_token ||
          userData?.rewardBarcode ||
          userData?.data?.barcodeToken ||
          userData?.user?.barcodeToken ||
          null;
      }
    } catch (e) {
      console.warn('[earn-by-user] user lookup failed', e);
    }

    if (barcodeToken) {
      try {
        const earnResp = await fetch(
          `${base}/api/offline-system/barcode/${encodeURIComponent(barcodeToken)}/cafe/earn`,
          {
            method: 'POST',
            headers: authHeader,
            body: JSON.stringify({ stampsEarned: stampsNum, referenceId: refId }),
          }
        );
        const earnData = await earnResp.json().catch(() => null);
        if (earnResp.ok && earnData?.success) {
          return NextResponse.json(earnData, { status: 200 });
        }
        console.warn('[earn-by-user] barcode earn endpoint failed', earnResp.status, earnData);
      } catch (e) {
        console.warn('[earn-by-user] barcode earn fetch error', e);
      }
    }

    // Fallback: apply the stamps directly on the customer's Surge stamp record.
    // (Shop managers are allowed to create/update `surge-stamps`.) Nothing has
    // been written at this point — the barcode endpoint validates before it saves.
    const earningHistoryItem = {
      type: 'offline',
      stamps: stampsNum,
      earnedAt: new Date().toISOString(),
      offlineReferenceId: refId,
    };

    const findResp = await fetch(
      `${base}/api/surge-stamps?where[user][equals]=${encodeURIComponent(numericUserId)}&limit=1&depth=0`,
      { method: 'GET', headers: authHeader }
    );

    if (!findResp.ok) {
      console.error('[earn-by-user] surge-stamps lookup failed', findResp.status);
      return NextResponse.json(
        { success: false, message: 'Failed to look up stamp record' },
        { status: findResp.status === 401 || findResp.status === 403 ? findResp.status : 500 }
      );
    }

    const findData = await findResp.json().catch(() => null);
    const existing = findData?.docs?.[0] || null;

    if (existing) {
      // Retry-safe: the same reference ID must never add stamps twice.
      const alreadyIssued = (existing.stampEarningHistory || []).some(
        (h) => h?.offlineReferenceId === refId
      );
      if (alreadyIssued) {
        return NextResponse.json({
          success: true,
          message: 'Stamps were already issued for this reference (no change made)',
          data: { stampCount: existing.stampCount || 0, stampReward: existing.stampReward || 0 },
        });
      }

      const totalStamps = (existing.stampCount || 0) + stampsNum;
      const stampCount = totalStamps % STAMPS_PER_REWARD;
      const stampReward = (existing.stampReward || 0) + Math.floor(totalStamps / STAMPS_PER_REWARD);

      const updateResp = await fetch(`${base}/api/surge-stamps/${existing.id}`, {
        method: 'PATCH',
        headers: authHeader,
        body: JSON.stringify({
          stampCount,
          stampReward,
          stampEarningHistory: [...(existing.stampEarningHistory || []), earningHistoryItem],
        }),
      });

      if (updateResp.ok) {
        return NextResponse.json({
          success: true,
          message: 'Stamps updated successfully',
          data: { stampCount, stampReward },
        });
      }

      const updateErr = await updateResp.json().catch(() => null);
      console.error('[earn-by-user] surge-stamps update failed', updateResp.status, updateErr);
      return NextResponse.json(
        { success: false, message: updateErr?.message || updateErr?.errors?.[0]?.message || 'Failed to update stamps' },
        { status: updateResp.status }
      );
    }

    // First stamps for this customer — create their stamp record.
    const stampCount = stampsNum % STAMPS_PER_REWARD;
    const stampReward = Math.floor(stampsNum / STAMPS_PER_REWARD);

    const createResp = await fetch(`${base}/api/surge-stamps`, {
      method: 'POST',
      headers: authHeader,
      body: JSON.stringify({
        user: numericUserId,
        stampCount,
        stampReward,
        stampEarningHistory: [earningHistoryItem],
      }),
    });

    if (createResp.ok) {
      return NextResponse.json({
        success: true,
        message: 'Stamps created successfully',
        data: { stampCount, stampReward },
      });
    }

    const createErr = await createResp.json().catch(() => null);
    console.error('[earn-by-user] surge-stamps create failed', createResp.status, createErr);
    return NextResponse.json(
      { success: false, message: createErr?.message || createErr?.errors?.[0]?.message || 'Failed to create stamps' },
      { status: createResp.status }
    );

  } catch (err) {
    console.error('[earn-by-user] error', err);
    return NextResponse.json(
      { success: false, message: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
