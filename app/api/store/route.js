import { NextResponse } from 'next/server'


export async function POST(req) {
  try {
    const body = await req.json();
    const { userId, redeemBeans, OrderValue, referenceId } = body || {};

    if (!userId || !referenceId || !String(referenceId).trim() || !OrderValue) {
      return NextResponse.json(
        { success: false, message: 'userId, OrderValue and referenceId are required' },
        { status: 400 }
      );
    }

    const numericUserId = Number(userId);
    if (!Number.isInteger(numericUserId) || numericUserId <= 0) {
      return NextResponse.json(
        { success: false, message: 'Invalid customer. Please scan the QR code again.' },
        { status: 400 }
      );
    }

    const orderValueNum = Number(OrderValue);
    if (!Number.isFinite(orderValueNum) || orderValueNum <= 0) {
      return NextResponse.json(
        { success: false, message: 'OrderValue must be greater than 0' },
        { status: 400 }
      );
    }

    const incomingCookie = req.headers.get('cookie') || '';
    let jwt = '';
    const match = incomingCookie.match(/(?:^|; )payload_token=([^;]+)/);
    if (match && match[1]) jwt = decodeURIComponent(match[1]);

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
      console.warn('[store] user lookup failed', e);
    }

    if (!barcodeToken) {
      return NextResponse.json(
        { success: false, message: 'Could not look up this customer. Please scan their QR code again.' },
        { status: 404 }
      );
    }

    const callStore = () =>
      fetch(`${base}/api/offline-system/barcode/${encodeURIComponent(barcodeToken)}/store`, {
        method: 'POST',
        headers: authHeader,
        body: JSON.stringify({
          redeemBeans: redeemBeans || false,
          OrderValue: orderValueNum,
          referenceId: String(referenceId).trim(),
        }),
      });

    let storeResp;
    try {
      storeResp = await callStore();
    } catch (e) {
      console.error('[store] barcode endpoint unreachable', e);
      return NextResponse.json(
        { success: false, message: 'Could not reach the rewards server. Nothing was changed — please try again.' },
        { status: 502 }
      );
    }

    const storeData = await storeResp.json().catch(() => null);
    if (storeResp.ok && storeData?.success) {
      return NextResponse.json(storeData, { status: 200 });
    }

    console.warn('[store] barcode endpoint failed', storeResp.status, storeData);

    // First-ever beans for this customer: the backend only updates an EXISTING beans
    // record, so create the customer's record with this order's earned beans.
    const noBeanRecord = storeResp.status === 404 && /no bean record/i.test(storeData?.message || '');
    if (noBeanRecord) {
      if (redeemBeans) {
        return NextResponse.json(
          { success: false, message: 'This customer has no beans to redeem.' },
          { status: 400 }
        );
      }

      const refId = String(referenceId).trim();
      const { earnPercent, expiryMonths } = await getCoinsConfig(base);
      const beansEarned = Math.floor(orderValueNum * (earnPercent / 100));

      if (beansEarned <= 0) {
        return NextResponse.json({
          success: true,
          message: 'No beans earned on this order',
          data: {
            referenceId: refId,
            totalBalance: 0,
            liveBreakdown: { orderTotal: orderValueNum, beansRedeemedValue: 0, payableTotal: orderValueNum, beansEarned: 0 },
          },
        });
      }

      const expiryDate = new Date();
      expiryDate.setMonth(expiryDate.getMonth() + expiryMonths);

      const createResp = await fetch(`${base}/api/user-surge-coins`, {
        method: 'POST',
        headers: authHeader,
        body: JSON.stringify({
          user: numericUserId,
          totalBalance: beansEarned,
          coinEarningHistory: [
            {
              type: 'offline',
              amount: beansEarned,
              remainingAmount: beansEarned,
              earnedAt: new Date().toISOString(),
              offlineReferenceId: refId,
              expiryDate: expiryDate.toISOString(),
            },
          ],
          pointsRedemptionHistory: [],
        }),
      });

      if (createResp.ok) {
        return NextResponse.json({
          success: true,
          message: `Earned ${beansEarned} beans`,
          data: {
            referenceId: refId,
            totalBalance: beansEarned,
            liveBreakdown: { orderTotal: orderValueNum, beansRedeemedValue: 0, payableTotal: orderValueNum, beansEarned },
          },
        });
      }

      // The record may have been created a moment ago (one record per customer) — let the backend apply it.
      try {
        const retryResp = await callStore();
        const retryData = await retryResp.json().catch(() => null);
        if (retryResp.ok && retryData?.success) return NextResponse.json(retryData, { status: 200 });
      } catch {}

      const createErr = await createResp.json().catch(() => null);
      console.error('[store] beans record create failed', createResp.status, createErr);
      return NextResponse.json(
        { success: false, message: createErr?.message || createErr?.errors?.[0]?.message || 'Failed to issue beans. Nothing was changed — please try again.' },
        { status: createResp.status >= 400 ? createResp.status : 502 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: storeData?.message || storeData?.errors?.[0]?.message || 'Failed to issue rewards. Nothing was changed — please try again.',
      },
      { status: storeResp.status >= 400 ? storeResp.status : 502 }
    );

  } catch (err) {
    console.error('[store] error', err);
    return NextResponse.json(
      { success: false, message: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// The Surge Coins config is publicly readable; fall back to the current live values if it can't be read.
async function getCoinsConfig(base) {
  const fallback = { earnPercent: 10, expiryMonths: 12 };
  try {
    const r = await fetch(`${base}/api/globals/surge-coins?depth=0`);
    if (!r.ok) return fallback;
    const j = await r.json();
    const earnPercent = Number(j?.pointsEarn);
    const expiryMonths = Number(j?.rewardExpiry);
    return {
      earnPercent: Number.isFinite(earnPercent) && earnPercent >= 0 ? earnPercent : fallback.earnPercent,
      expiryMonths: Number.isFinite(expiryMonths) && expiryMonths > 0 ? expiryMonths : fallback.expiryMonths,
    };
  } catch {
    return fallback;
  }
}
