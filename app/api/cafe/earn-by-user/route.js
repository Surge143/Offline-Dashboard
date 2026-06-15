import { NextResponse } from 'next/server'

export async function POST(req) {
  try {
    const body = await req.json();
    const { userId, stampsEarned, referenceId } = body || {};

    if (!userId || typeof stampsEarned === 'undefined' || !referenceId || !String(referenceId).trim()) {
      return NextResponse.json(
        { success: false, message: 'userId, stampsEarned and referenceId are required' },
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

  
    let barcodeToken = null;
    try {
      const userResp = await fetch(`${base}/api/users/${encodeURIComponent(userId)}`, {
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
            body: JSON.stringify({ stampsEarned, referenceId }),
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


 const earningHistoryItem = {
  type: 'offline',
  stamps: stampsEarned,
  earnedAt: new Date().toISOString(),
  offlineReferenceId: String(referenceId).trim(),
};

    let stampCount = stampsEarned;
    let stampReward = 0;

    const findResp = await fetch(
      `${base}/api/wt-stamps?where[user][equals]=${encodeURIComponent(Number(userId))}&limit=1`,
      { method: 'GET', headers: authHeader }
    );

    if (!findResp.ok) {
      return NextResponse.json(
        { success: false, message: 'Failed to look up stamp record' },
        { status: 500 }
      );
    }

    const findData = await findResp.json().catch(() => null);
    const existing = findData?.docs?.[0] || null;

    if (existing) {
      const totalStamps = (existing.stampCount || 0) + stampsEarned;
      const earnedRewards = Math.floor(totalStamps / 10);
      stampCount = totalStamps % 10;
      stampReward = (existing.stampReward || 0) + earnedRewards;

      const updateResp = await fetch(`${base}/api/wt-stamps/${existing.id}`, {
        method: 'PATCH',
        headers: authHeader,
        body: JSON.stringify({
          stampCount,
          stampReward,
          stampEarningHistory: [
            ...(existing.stampEarningHistory || []),
            earningHistoryItem,
          ],
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
      return NextResponse.json(
        { success: false, message: updateErr?.message || 'Failed to update stamps' },
        { status: updateResp.status }
      );

    } else {

      const earnedRewards = Math.floor(stampsEarned / 10);
      stampCount = stampsEarned % 10;
      stampReward = earnedRewards;

      const createResp = await fetch(`${base}/api/wt-stamps`, {
        method: 'POST',
        headers: authHeader,
        body: JSON.stringify({
          user: Number(userId),
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
      return NextResponse.json(
        { success: false, message: createErr?.message || 'Failed to create stamps' },
        { status: createResp.status }
      );
    }

  } catch (err) {
    console.error('[earn-by-user] error', err);
    return NextResponse.json(
      { success: false, message: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}