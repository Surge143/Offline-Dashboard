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

    if (!barcodeToken) {
      return NextResponse.json(
        { success: false, message: 'Could not look up this customer. Please scan their QR code again.' },
        { status: 404 }
      );
    }

    let redeemResp;
    try {
      redeemResp = await fetch(
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
    } catch (e) {
      console.error('[cafe/redeem] barcode endpoint unreachable', e);
      return NextResponse.json(
        { success: false, message: 'Could not reach the rewards server. Nothing was redeemed — please try again.' },
        { status: 502 }
      );
    }

    const redeemData = await redeemResp.json().catch(() => null);
    if (redeemResp.ok && redeemData?.success) {
      return NextResponse.json(redeemData, { status: 200 });
    }

    console.warn('[cafe/redeem] barcode endpoint failed', redeemResp.status, redeemData);
    return NextResponse.json(
      {
        success: false,
        message: redeemData?.message || redeemData?.errors?.[0]?.message || 'Redemption failed. Nothing was redeemed — please try again.',
      },
      { status: redeemResp.status >= 400 ? redeemResp.status : 502 }
    );

  } catch (err) {
    console.error('[cafe/redeem] error', err);
    return NextResponse.json(
      { success: false, message: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
