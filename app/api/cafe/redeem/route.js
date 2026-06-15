import { NextResponse } from 'next/server'

export async function POST(req) {
  try {
    const body = await req.json();

    const { userId, stampsRewardRedeemed: _stampsRewardRedeemed, beansRedeemed: _beansRedeemed, OrderValue, referenceId } = body || {};
    const stampsRewardRedeemed = _stampsRewardRedeemed === true || _stampsRewardRedeemed === 'true' || _stampsRewardRedeemed === 1 || _stampsRewardRedeemed === '1';
    const beansRedeemed = _beansRedeemed === true || _beansRedeemed === 'true' || _beansRedeemed === 1 || _beansRedeemed === '1';


    console.log('[cafe/redeem] incoming body:', { userId, stampsRewardRedeemed: _stampsRewardRedeemed, beansRedeemed: _beansRedeemed, OrderValue, referenceId });

    if (!userId || !referenceId || !String(referenceId).trim()) {
      return NextResponse.json(
        { success: false, message: 'userId and referenceId are required' },
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
      console.warn('[cafe/redeem] user lookup failed', e);
    }

    if (barcodeToken) {
      console.log('[cafe/redeem] barcodeToken found, attempting barcode endpoint', { barcodeToken });

      try {
        const redeemResp = await fetch(
          `${base}/api/offline-system/barcode/${encodeURIComponent(barcodeToken)}/cafe/redeem`,
          {
            method: 'POST',
            headers: authHeader,
            body: JSON.stringify({
              stampsRewardRedeemed: stampsRewardRedeemed || false,
              beansRedeemed: beansRedeemed || false,
              OrderValue: Number(OrderValue) || 0,
              referenceId: String(referenceId).trim(),
            }),
          }
        );
        const redeemData = await redeemResp.json().catch(() => null);
        if (redeemResp.ok && redeemData?.success) {
          return NextResponse.json(redeemData, { status: 200 });
        }
        console.warn('[cafe/redeem] barcode endpoint failed, falling back to REST', redeemResp.status, redeemData);
      } catch (e) {
        console.warn('[cafe/redeem] barcode endpoint error, falling back to REST', e);
      }
    }

    console.log('[cafe/redeem] using REST fallback for redemption processing');

    const numericUserId = Number(userId);

const redemptionHistoryItem = {
  type: 'offline',
  offlineReferenceId: String(referenceId).trim(),
  orderValue: Number(OrderValue) || 0,
  beansRedeemed: beansRedeemed || false,
  stampsRewardRedeemed: stampsRewardRedeemed || false,
  redeemedAt: new Date().toISOString(),
};

    let stampSummary = null;
    let beanSummary = null;


    if (stampsRewardRedeemed) {
      try {
        const findResp = await fetch(
          `${base}/api/wt-stamps?where[user][equals]=${numericUserId}&limit=1`,
          { method: 'GET', headers: authHeader }
        );
        if (findResp.ok) {
          const findData = await findResp.json().catch(() => null);
          const existing = findData?.docs?.[0] || null;
          if (existing && existing.stampReward > 0) {
            const newReward = existing.stampReward - 1;
          const updateResp = await fetch(`${base}/api/wt-stamps/${existing.id}`, {
  method: 'PATCH',
  headers: authHeader,
  body: JSON.stringify({
    stampReward: newReward,
  }),
});


const updateText = await updateResp.text();
console.log('[cafe/redeem] stamp PATCH status', updateResp.status, 'body:', updateText);
            if (updateResp.ok) {
              stampSummary = { initial: existing.stampReward, final: newReward };
            }
          }
        }
      } catch (e) {
        console.warn('[cafe/redeem] stamp redemption REST error', e);
      }
    }

    // Handle beans redemption
    if (beansRedeemed) {
      try {
        const findResp = await fetch(
          `${base}/api/user-wt-coins?where[user][equals]=${numericUserId}&limit=1`,
          { method: 'GET', headers: authHeader }
        );
        console.log('[cafe/redeem] beans findResp status=', findResp.status);
        if (findResp.ok) {
          const findData = await findResp.json().catch(() => null);
          console.log('[cafe/redeem] beans findData keys=', findData && Object.keys(findData));
          const existing = findData?.docs?.[0] || null;
          if (!existing) {
            console.warn('[cafe/redeem] no user-wt-coins document found for user', numericUserId, 'findData=', findData);
          } else {
            console.log('[cafe/redeem] found user-wt-coins doc id=', existing.id, 'totalBalance=', existing.totalBalance);
            const initialBeans = existing.totalBalance || 0;

         
            const coinHistory = Array.isArray(existing.coinEarningHistory) ? JSON.parse(JSON.stringify(existing.coinEarningHistory)) : [];
            let toConsume = initialBeans;
            if (toConsume > 0 && coinHistory.length) {
              for (let i = 0; i < coinHistory.length && toConsume > 0; i++) {
                const entry = coinHistory[i];
                const remaining = Number(entry.remainingAmount || 0);
                if (remaining <= 0) continue;
                const consumed = Math.min(remaining, toConsume);
                entry.remainingAmount = Math.max(0, remaining - consumed);
                toConsume -= consumed;
              }
            }

            const updatedPatchBody = {
           
              coinEarningHistory: coinHistory,
              pointsRedemptionHistory: [
                ...(existing.pointsRedemptionHistory || []),
                { ...redemptionHistoryItem, redeemedPoints: initialBeans },
              ],
            };

            const updateResp = await fetch(`${base}/api/user-wt-coins/${existing.id}`, {
              method: 'PATCH',
              headers: authHeader,
              body: JSON.stringify(updatedPatchBody),
            });
            const updateText = await updateResp.text().catch(() => null);
            console.log('[cafe/redeem] beans PATCH status', updateResp.status, 'body:', updateText);
            if (updateResp.ok) {
              beanSummary = { initial: initialBeans, final: 0 };
            } else {
              console.warn('[cafe/redeem] beans PATCH failed', updateResp.status, updateText);
            }
          }
        }
      } catch (e) {
        console.warn('[cafe/redeem] beans redemption REST error', e);
      }
    }

    return NextResponse.json({
      success: true,
      message: [
        stampsRewardRedeemed ? 'Stamp reward redeemed successfully' : null,
        beansRedeemed ? `Beans redeemed successfully (${beanSummary?.initial || 0} points)` : null,
      ].filter(Boolean).join(', '),
      data: {
        referenceId: String(referenceId).trim(),
        orderValue: Number(OrderValue) || 0,
        summary: {
          beans: beanSummary || { initial: 0, final: 0 },
          stampRewards: stampSummary || { initial: 0, final: 0 },
        },
      },
    });

  } catch (err) {
    console.error('[cafe/redeem] error', err);
    return NextResponse.json(
      { success: false, message: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}