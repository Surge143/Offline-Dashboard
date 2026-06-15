import { NextResponse } from 'next/server'

export async function GET(req) {
  try {
    const url = new URL(req.url);
    const user = url.searchParams.get('user');
    if (!user) return NextResponse.json({ success: false, message: 'user query param required' }, { status: 400 });

    const base = process.env.OFFLINE_BASE_URL || 'https://endpoint.surgecoffee.ae';
    const target = `${base}/api/wt-stamps?where[user][equals]=${encodeURIComponent(user)}&limit=1`;


    const serverJwt = process.env.OFFLINE_API_JWT || '';
    const incomingAuth = req.headers.get('authorization') || '';
    let jwt = serverJwt || incomingAuth || '';

    const headers = { 'Content-Type': 'application/json' };
    if (jwt) headers['Authorization'] = jwt.startsWith('JWT ') ? jwt : `JWT ${jwt.replace(/^Bearer\s+/i, '')}`;

    try {
      const incomingCookie = req.headers.get('cookie');
      if (incomingCookie) {
        headers['cookie'] = incomingCookie;
        if (!jwt) {
          const m = incomingCookie.match(/(?:^|; )payload_token=([^;]+)/);
          if (m && m[1]) jwt = m[1];
        }
      }
    } catch {}

    if (jwt && !headers['Authorization']) headers['Authorization'] = jwt.startsWith('JWT ') ? jwt : `JWT ${jwt.replace(/^Bearer\s+/i, '')}`;

    console.log('[debug/wt-stamps] proxy GET', { target, usingJwt: Boolean(jwt), forwardedCookie: !!req.headers.get('cookie') });

    const resp = await fetch(target, { method: 'GET', headers });
    const text = await resp.text();
    let data = null;
    try { data = JSON.parse(text); } catch { data = null; }

    console.log('[debug/wt-stamps] remote response', { status: resp.status, ok: resp.ok, bodyLength: text ? text.length : 0, keys: data && typeof data === 'object' ? Object.keys(data) : null });

    if (data !== null) return NextResponse.json(data, { status: resp.status });
    return new NextResponse(text || '', { status: resp.status, headers: { 'Content-Type': 'text/plain' } });

  } catch (err) {
    console.error('debug/wt-stamps proxy error', err);
    return NextResponse.json({ success: false, message: 'Internal error' }, { status: 500 });
  }
}
