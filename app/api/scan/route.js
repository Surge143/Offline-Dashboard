import { NextResponse } from "next/server";

const EXTERNAL_BARCODE = "https://endpoint.surgecoffee.ae/api/offline-system/barcode";

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    if (!code) {
      return NextResponse.json({ success: false, message: "code required" }, { status: 400 });
    }

    const forwardedCookie = request.headers.get("cookie") || "";
    function extractCookie(cookieStr, name) {
      const m = cookieStr.match(new RegExp("(?:^|; )" + name + "=([^;]+)"));
      return m ? decodeURIComponent(m[1]) : null;
    }
  const payloadToken = extractCookie(forwardedCookie, "payload_token") || extractCookie(forwardedCookie, "offline_token") || extractCookie(forwardedCookie, "token");
  const headers = { Accept: "application/json" };
    if (forwardedCookie) headers.Cookie = forwardedCookie;
  if (payloadToken) headers.Authorization = `JWT ${payloadToken}`;


    console.log("[api/scan] code=", code, "hasCookie=", !!forwardedCookie, "hasToken=", !!payloadToken);

    const resp = await fetch(`${EXTERNAL_BARCODE}/${encodeURIComponent(code)}`, {
      method: "GET",
      headers,
    });

   
    let data = null;
    let bodyText = null;
    try {
      bodyText = await resp.text();
    } catch (e) {
      console.error('[api/scan] failed to read external response text', e);
      return NextResponse.json({ success: false, message: 'Failed reading external response' }, { status: 502 });
    }

    try {
      const len = bodyText ? bodyText.length : 0;
      console.log('[api/scan] barcode endpoint status=', resp.status, 'bodyLength=', len);
      if (len > 0 && len <= 2000) console.debug('[api/scan] barcode body text=', bodyText);
      else if (len > 2000) console.debug('[api/scan] barcode body text (start)=', bodyText.slice(0, 2000));
    } catch (logErr) {
      console.debug('[api/scan] debug log error', logErr);
    }

    if (bodyText && bodyText.trim() !== '') {
      try {
        data = JSON.parse(bodyText);
      } catch (e) {
        console.error('[api/scan] external returned non-json text', e);

        return NextResponse.json({ success: false, message: 'External returned non-JSON', status: resp.status, bodyText: bodyText.slice(0, 5000) }, { status: 502 });
      }
    } else {

      console.warn('[api/scan] external returned empty body');
     
      data = null;
    }

    if (!resp.ok) {
      console.error("[api/scan] external status", resp.status, "body:", data);

    }

   
      try {
        const hasTotalsTop = data && (data.totalBeans !== undefined || data.totalStamps !== undefined || data.stampReward !== undefined);
        const hasTotalsBody = data && data.body && (data.body.totalBeans !== undefined || data.body.totalStamps !== undefined || data.body.stampReward !== undefined);
        if (hasTotalsTop || hasTotalsBody) {
          const src = hasTotalsBody ? data.body : data;
          const normalizedTotals = {
            id: null,
            name: null,
            avatar: null,
            beans: Number(src.totalBeans) || 0,
            activeStamps: Number(src.totalStamps) || 0,
            totalRewards: Number(src.stampReward || 0) || 0,
          };
          console.log('[api/scan] barcode endpoint returned totals, normalizing and returning user-like object:', normalizedTotals);
          return NextResponse.json({ success: true, barcode: data, user: normalizedTotals }, { status: 200 });
        }
      } catch (e) {
        console.debug('[api/scan] totals-normalize error', e);
      }


    function extractUser(obj) {
      if (!obj) return null;
      if (obj.user && typeof obj.user === "object") return obj.user;
      if (obj.data && typeof obj.data === "object") {
        if (obj.data.user && typeof obj.data.user === "object") return obj.data.user;

        return obj.data;
      }

      const hasUserLike = ["name", "username", "email", "avatar", "image", "photo", "profile"].some((k) => k in obj);
      if (hasUserLike) return obj;
      return null;
    }

    const user = extractUser(data);

    if (user) {
      return NextResponse.json({ success: true, barcode: data, user }, { status: 200 });
    }

  
    const userId = data?.userId || data?.user_id || data?.customerId || data?.customer_id || (function parseIdFromCode(c) {
      if (!c) return null;

      const m = c.match(/(?:reward_user_|user_)(\d+)$/i);
      if (m) return m[1];

      const m2 = c.match(/(\d+)$/);
      return m2 ? m2[1] : null;
    })(code);

    if (userId) {
 
      const BASE = "https://endpoint.surgecoffee.ae";

      const userUrl = `${BASE}/api/users/${encodeURIComponent(userId)}`;
      try {
        console.log("[api/scan] trying user endpoint:", userUrl);
        const uResp = await fetch(userUrl, { method: "GET", headers });

        console.log('[api/scan] user endpoint status=', uResp.status, 'url=', userUrl);
        if (uResp.ok) {
          let uData = null;
          try {
            uData = await uResp.json();
          } catch (e) {
            console.debug("[api/scan] /api/users returned non-json", e);
            uData = null;
          }
          try {
            console.log('[api/scan] /api/users returned keys=', uData && typeof uData === 'object' ? Object.keys(uData) : typeof uData);
            if (uData && typeof uData === 'object') console.debug('[api/scan] /api/users body=', uData);
          } catch (logErr) {
            console.debug('[api/scan] user debug log error', logErr);
          }
          const found = extractUser(uData);
          if (found) {
        
            try {
              const idOrUser = encodeURIComponent(found.id || userId);
      const coinCandidates = [
                `${BASE}/api/user-surge-coins?where[user][equals]=${idOrUser}&limit=1`,
                `${BASE}/api/user-surge-coins?where[user.id][equals]=${idOrUser}&limit=1`,
              ];
              let coinDoc = null;
              for (const coinsUrl of coinCandidates) {
                try {
                  console.log('[api/scan] trying coins endpoint candidate:', coinsUrl);
                  const cResp = await fetch(coinsUrl, { method: 'GET', headers });
                  console.log('[api/scan] coins candidate status=', cResp.status, 'url=', coinsUrl);
                  if (!cResp.ok) continue;
                  const cJson = await cResp.json().catch((e) => { console.debug('[api/scan] coins json parse failed', e); return null; });
                  if (!cJson || !cJson.docs || cJson.docs.length === 0) continue;
                  const doc = cJson.docs[0];
                  const docUserId = doc.user?.id || doc.user;
                  if (String(docUserId) !== String(found.id || userId)) {
                    console.warn('[api/scan] coins doc user mismatch, skipping. doc.user=', docUserId, 'expected=', found.id || userId);
                    continue;
                  }
                  coinDoc = doc;
                  console.log('[api/scan] coins candidate returned keys=', Object.keys(coinDoc));
                  break;
                } catch (e) {
                  console.debug('[api/scan] coins candidate fetch error', e);
                }
              }
              if (coinDoc && (coinDoc.totalBalance !== undefined || coinDoc.totalBalance !== null)) {
                found.beans = Number(coinDoc.totalBalance) || found.beans || 0;
                console.log('[api/scan] coins fetched for user, totalBalance=', coinDoc.totalBalance);
              }
            } catch (e) {
              console.debug('[api/scan] coins fetch error', e);
            }
            try {
              const idOrUser = encodeURIComponent(found.id || userId);
const stampCandidates = [
  `${BASE}/api/surge-stamps?where[user][equals]=${idOrUser}&limit=1`,
  `${BASE}/api/surge-stamps?where[user.id][equals]=${idOrUser}&limit=1`,
];
              let stampDoc = null;
              for (const stampsUrl of stampCandidates) {
                try {
                  console.log('[api/scan] trying stamps endpoint candidate:', stampsUrl);
                  const sResp = await fetch(stampsUrl, { method: 'GET', headers });
                  console.log('[api/scan] stamps candidate status=', sResp.status, 'url=', stampsUrl);
                  if (!sResp.ok) continue;
                  const sJson = await sResp.json().catch((e) => { console.debug('[api/scan] stamps json parse failed', e); return null; });
                  if (!sJson || !sJson.docs || sJson.docs.length === 0) continue;
                  const doc = sJson.docs[0];
                  const docUserId = doc.user?.id || doc.user;
                  if (String(docUserId) !== String(found.id || userId)) {
                    console.warn('[api/scan] stamps doc user mismatch, skipping. doc.user=', docUserId, 'expected=', found.id || userId);
                    continue;
                  }
                  stampDoc = doc;
                  console.log('[api/scan] stamps candidate returned keys=', Object.keys(stampDoc));
                  break;
                } catch (e) {
                  console.debug('[api/scan] stamps candidate fetch error', e);
                }
              }
              if (stampDoc) {
                if (stampDoc.stampCount !== undefined) found.activeStamps = Number(stampDoc.stampCount) || found.activeStamps || 0;
                if (stampDoc.stampReward !== undefined) found.totalRewards = Number(stampDoc.stampReward) || found.totalRewards || 0;
                console.log('[api/scan] stamps fetched for user, stampCount=', stampDoc.stampCount, 'stampReward=', stampDoc.stampReward);
              }
            } catch (e) {
              console.debug('[api/scan] stamps fetch error', e);
            }

            async function resolveAvatar(u) {
              if (!u) return null;
          
              const candidate = u.avatar || u.profileImage || u.image || u.photo || u.picture || (u.profile && u.profile.image) || null;
              if (!candidate) return null;
         
              if (typeof candidate === 'object' && candidate.url) {
                if (typeof candidate.url === 'string' && candidate.url.startsWith('http')) return candidate.url;
                if (typeof candidate.url === 'string' && candidate.url.startsWith('/')) return BASE + candidate.url;
                return candidate.url;
              }
       
              if (typeof candidate === 'string') {
                if (candidate.startsWith('http')) return candidate;
                if (candidate.startsWith('/')) return BASE + candidate;
     
                try {
                  const mResp = await fetch(`${BASE}/api/media/${encodeURIComponent(candidate)}`, { method: 'GET', headers });
                  console.log('[api/scan] media endpoint status=', mResp.status, 'id=', candidate);
                  if (mResp.ok) {
                    const mData = await mResp.json();
                    console.log('[api/scan] media returned keys=', mData && typeof mData === 'object' ? Object.keys(mData) : typeof mData);
               
                    if (mData && mData.url) return mData.url.startsWith('http') ? mData.url : BASE + mData.url;
                  }
                } catch (e) {
                  console.debug('[api/scan] media fetch failed', e);
                }
              }
              return null;
            }

            const avatar = await resolveAvatar(found);
            const beans = found.beans || found.beanBalance || found.whiteMantisBeans || found.beansTotal || found.storeBeans || 0;
            const activeStamps = (found.stamps && Array.isArray(found.stamps))
              ? found.stamps.length
              : (found.stampCount || found.activeStamps || found.stampsCount || 0);
            const totalRewards = (found.rewards && Array.isArray(found.rewards))
              ? found.rewards.length
              : (found.totalRewards || found.rewardsCount || found.rewards_total || 0);

         
            const finalBeans = found.beans || beans;
            const finalActiveStamps = found.activeStamps || activeStamps;
            const finalTotalRewards = found.totalRewards || totalRewards;
            const normalized = {
              id: found.id || found._id || userId,
              name: found.name || `${found.firstName || ''} ${found.lastName || ''}`.trim() || found.username || found.email || null,
              avatar,
              beans: Number(finalBeans) || 0,
              activeStamps: Number(finalActiveStamps) || 0,
              totalRewards: Number(finalTotalRewards) || 0,
            };
            console.log('[api/scan] returning normalized user:', normalized);
            return NextResponse.json({ success: true, barcode: data, user: normalized }, { status: 200 });
          }
        } else {
          console.debug('[api/scan] /api/users returned', uResp.status);
        }
      } catch (e) {
        console.debug('[api/scan] /api/users fetch error', e);
      }


      const candidates = [
        `${BASE}/api/offline-system/user/${encodeURIComponent(userId)}`,
        `${BASE}/api/offline-system/users/${encodeURIComponent(userId)}`,
        `${BASE}/api/offline-system/customer/${encodeURIComponent(userId)}`,
        `${BASE}/api/offline-system/customers/${encodeURIComponent(userId)}`,
        `${BASE}/api/admin/users/${encodeURIComponent(userId)}`,
      ];

      for (const urlCandidate of candidates) {
        try {
          console.log("[api/scan] trying user endpoint:", urlCandidate);
          const uResp = await fetch(urlCandidate, { method: "GET", headers });
          if (!uResp.ok) {
            console.debug("[api/scan] candidate returned", uResp.status, urlCandidate);
            continue;
          }
          let uData = null;
          try {
            uData = await uResp.json();
          } catch (e) {
            console.debug("[api/scan] candidate returned non-json", urlCandidate, e);
            continue;
          }
          const found = extractUser(uData);
          if (found) {
          
            const beans = found.beans || found.beanBalance || found.whiteMantisBeans || found.beansTotal || found.storeBeans || 0;
            const activeStamps = (found.stamps && Array.isArray(found.stamps))
              ? found.stamps.length
              : (found.stampCount || found.activeStamps || found.stampsCount || 0);
            const totalRewards = (found.rewards && Array.isArray(found.rewards))
              ? found.rewards.length
              : (found.totalRewards || found.rewardsCount || found.rewards_total || 0);
            const normalized = {
              id: found.id || found._id || userId,
              name: found.name || `${found.firstName || ''} ${found.lastName || ''}`.trim() || found.username || found.email || null,
              avatar: found.avatar || (found.profileImage && found.profileImage.url) || null,
              beans: Number(beans) || 0,
              activeStamps: Number(activeStamps) || 0,
              totalRewards: Number(totalRewards) || 0,
            };
            return NextResponse.json({ success: true, barcode: data, user: normalized }, { status: 200 });
          }
          if (uData && (uData.user || uData.data)) {
            const uu = uData.user || uData.data;
            const beans = uu.beans || uu.beanBalance || uu.whiteMantisBeans || uu.beansTotal || uu.storeBeans || 0;
            const activeStamps = (uu.stamps && Array.isArray(uu.stamps))
              ? uu.stamps.length
              : (uu.stampCount || uu.activeStamps || uu.stampsCount || 0);
            const totalRewards = (uu.rewards && Array.isArray(uu.rewards))
              ? uu.rewards.length
              : (uu.totalRewards || uu.rewardsCount || uu.rewards_total || 0);
            const normalized = {
              id: uu.id || uu._id || userId,
              name: uu.name || `${uu.firstName || ''} ${uu.lastName || ''}`.trim() || uu.username || uu.email || null,
              avatar: uu.avatar || (uu.profileImage && uu.profileImage.url) || null,
              beans: Number(beans) || 0,
              activeStamps: Number(activeStamps) || 0,
              totalRewards: Number(totalRewards) || 0,
            };
            return NextResponse.json({ success: true, barcode: data, user: normalized }, { status: 200 });
          }
        } catch (e) {
          console.debug("[api/scan] candidate fetch error", e);
        }
      }
    }

    console.warn("[api/scan] no user extracted from external response", data);
    return NextResponse.json({ success: false, message: "No user data in response", body: data }, { status: 200 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}
