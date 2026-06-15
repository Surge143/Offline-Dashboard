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

    // Step 1: Try barcodeToken path first
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

    // Step 2: If barcodeToken exists, use barcode endpoint
    if (barcodeToken) {
      try {
        const storeResp = await fetch(
          `${base}/api/offline-system/barcode/${encodeURIComponent(barcodeToken)}/store`,
          {
            method: 'POST',
            headers: authHeader,
            body: JSON.stringify({
              redeemBeans: redeemBeans || false,
              OrderValue: Number(OrderValue),
              referenceId: String(referenceId).trim(),
            }),
          }
        );
        const storeData = await storeResp.json().catch(() => null);
        if (storeResp.ok && storeData?.success) {
          return NextResponse.json(storeData, { status: 200 });
        }
        console.warn('[store] barcode endpoint failed', storeResp.status, storeData);
      } catch (e) {
        console.warn('[store] barcode endpoint error', e);
      }
    }

    // Step 3: REST fallback — handle beans redeem + earn manually
    const numericUserId = Number(userId);
    const orderVal = Number(OrderValue);
    const beansEarned = Math.floor(orderVal * 0.1);

    // Find existing coins record
    const findResp = await fetch(
      `${base}/api/user-wt-coins?where[user][equals]=${numericUserId}&limit=1`,
      { method: 'GET', headers: authHeader }
    );

    if (!findResp.ok) {
      return NextResponse.json(
        { success: false, message: 'Failed to look up coins record' },
        { status: 500 }
      );
    }

    const findData = await findResp.json().catch(() => null);
    const existing = findData?.docs?.[0] || null;

    const now = new Date().toISOString();
    const earnEntry = {
      type: 'offline',
      amount: beansEarned,
      remainingAmount: beansEarned,
      earnedAt: now,
      offlineReferenceId: String(referenceId).trim(),
      expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    };

    let beansRedeemed = 0;
    let newTotalBalance = beansEarned;

    if (existing) {
      const currentBalance = existing.totalBalance || 0;
      beansRedeemed = redeemBeans ? currentBalance : 0;

      const coinHistory = Array.isArray(existing.coinEarningHistory)
        ? JSON.parse(JSON.stringify(existing.coinEarningHistory))
        : [];

      // Zero out remaining amounts if redeeming
      if (redeemBeans) {
        let toConsume = currentBalance;
        for (let i = 0; i < coinHistory.length && toConsume > 0; i++) {
          const remaining = Number(coinHistory[i].remainingAmount || 0);
          if (remaining <= 0) continue;
          const consumed = Math.min(remaining, toConsume);
          coinHistory[i].remainingAmount = Math.max(0, remaining - consumed);
          toConsume -= consumed;
        }
      }

      newTotalBalance = (redeemBeans ? 0 : currentBalance) + beansEarned;

      const redemptionHistory = redeemBeans
        ? [
            ...(existing.pointsRedemptionHistory || []),
            {
              type: 'offline',
              redeemedPoints: beansRedeemed,
              offlineReferenceId: String(referenceId).trim(),
              redeemedAt: now,
            },
          ]
        : existing.pointsRedemptionHistory || [];

      const updateResp = await fetch(`${base}/api/user-wt-coins/${existing.id}`, {
        method: 'PATCH',
        headers: authHeader,
        body: JSON.stringify({
          totalBalance: newTotalBalance,
          coinEarningHistory: [...coinHistory, earnEntry],
          pointsRedemptionHistory: redemptionHistory,
        }),
      });

      if (updateResp.ok) {
        return NextResponse.json({
          success: true,
          message: `${redeemBeans ? `Redeemed ${beansRedeemed} beans, ` : ''}Earned ${beansEarned} beans`,
          data: {
            referenceId: String(referenceId).trim(),
            totalBalance: newTotalBalance,
            liveBreakdown: {
              orderTotal: orderVal,
              beansRedeemedValue: beansRedeemed / 10,
              payableTotal: orderVal - beansRedeemed / 10,
              beansEarned,
            },
          },
        });
      }

      const updateErr = await updateResp.json().catch(() => null);
      return NextResponse.json(
        { success: false, message: updateErr?.message || 'Failed to update coins' },
        { status: 500 }
      );

    } else {
      // Create new coins record
      const createResp = await fetch(`${base}/api/user-wt-coins`, {
        method: 'POST',
        headers: authHeader,
        body: JSON.stringify({
          user: numericUserId,
          totalBalance: beansEarned,
          coinEarningHistory: [earnEntry],
          pointsRedemptionHistory: [],
        }),
      });

      if (createResp.ok) {
        return NextResponse.json({
          success: true,
          message: `Earned ${beansEarned} beans`,
          data: {
            referenceId: String(referenceId).trim(),
            totalBalance: beansEarned,
            liveBreakdown: {
              orderTotal: orderVal,
              beansRedeemedValue: 0,
              payableTotal: orderVal,
              beansEarned,
            },
          },
        });
      }

      const createErr = await createResp.json().catch(() => null);
      return NextResponse.json(
        { success: false, message: createErr?.message || 'Failed to create coins record' },
        { status: 500 }
      );
    }

  } catch (err) {
    console.error('[store] error', err);
    return NextResponse.json(
      { success: false, message: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}