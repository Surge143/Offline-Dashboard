  "use client";

  import React, { useEffect, useRef, useState } from "react";
  import { useSearchParams, useRouter } from "next/navigation";
  import styles from "./SummaryCafe.module.css";
  import Image from "next/image";
  import stampicon from "./cstamp.png";
  import { previewBeansRedeemed } from "../../../lib/rewards";


  const SummaryCafe = () => {
    const params = useSearchParams();
    const router = useRouter();
    const type = params.get("type");
    const stamps = params.get("stamps");
    const value = params.get("value");
    const beans = params.get("beans") === "true";
    const reward = params.get("reward") === "true";
    const refParam = params.get('ref');

    const [summaryData, setSummaryData] = useState(null);
    const [scannedUser, setScannedUser] = useState(null);
    const [loading, setLoading] = useState(false);
    const [redeemRequest, setRedeemRequest] = useState(null);

    useEffect(() => {
      try {
        const raw = sessionStorage.getItem('cafe_summary_response');
        if (raw) {
          const parsed = JSON.parse(raw);
          setTimeout(() => setSummaryData(parsed), 0);
        }
      } catch (e) {
        console.error('failed to read cafe_summary_response', e);
      }

      try {
        const raw2 = sessionStorage.getItem('scanned_user');
        if (raw2) {
          const parsed2 = JSON.parse(raw2);
          setTimeout(() => setScannedUser(parsed2), 0);
        }
     } catch (e) {
      console.error('failed to read scanned_user', e);
    }

    try {
      const raw3 = sessionStorage.getItem('cafe_redeem_request');
      if (raw3) {
        const parsed3 = JSON.parse(raw3);
        setTimeout(() => setRedeemRequest(parsed3), 0);
      }
    } catch (e) {
      console.error('failed to read cafe_redeem_request', e);
    }
  }, []);

    const TOTAL_STAMPS = 10;
 const beansBefore = Number(scannedUser?.beans || scannedUser?.whiteMantisBeans || scannedUser?.beans_value || 0) || 0;
const rewardsBefore = Number(scannedUser?.totalRewards || scannedUser?.stampReward || scannedUser?.rewards_total || 0) || 0;
const stampsBefore = Number(scannedUser?.activeStamps || scannedUser?.active_stamps || scannedUser?.stampCount || 0) || 0;


const stampsEarned = Number(summaryData?.request?.stampsEarned ?? stamps) || 0;
const rewardAdded = Math.floor((stampsBefore + stampsEarned) / TOTAL_STAMPS);
const rewardsAfter = type === 'redeem'
  ? rewardsBefore - (reward ? 1 : 0)         
  : rewardsBefore + rewardAdded;            
const beansConsumed = type === 'redeem' && beans ? previewBeansRedeemed(beansBefore, value) : 0;
const beansAfter = type === 'redeem'
  ? Math.max(0, beansBefore - beansConsumed)
  : beansBefore;
const stampsAfter = type === 'redeem'
  ? stampsBefore                 
  : (stampsBefore + stampsEarned) % TOTAL_STAMPS;


    // Guards against a double tap sending the same request twice before the button re-renders as disabled.
    const submittingRef = useRef(false);

    const handleEdit = () => {
      try { sessionStorage.setItem('cafe_edit_order', 'true'); } catch {}
      router.back();
    };

    const handleConfirm = async () => {
      if (submittingRef.current) return;
      submittingRef.current = true;
      try {
                        setLoading(true);
                        try {
                   
                          let stored = null;
                          try {
                            const raw = sessionStorage.getItem('cafe_summary_response');
                            if (raw) stored = JSON.parse(raw);
                          } catch {}


                          if (stored?.response?.success) {
                            setLoading(false);
                            router.replace('/OrderComplete');
                            return;
                          }

  if (type === 'redeem') {
    let scannedUserId = null;
    try {
      const rawUser = sessionStorage.getItem('scanned_user');
      if (rawUser) {
        const parsedUser = JSON.parse(rawUser);
        scannedUserId = parsedUser?.id || parsedUser?.user || null;
      }
    } catch {}

    if (!scannedUserId) {
      setLoading(false);
      alert('No scanned customer found. Please go back and scan a customer QR code first.');
      return;
    }

    let redeemBody = null;
    try {
      const rawRedeem = sessionStorage.getItem('cafe_redeem_request');
      if (rawRedeem) redeemBody = JSON.parse(rawRedeem);
    } catch {}

    if (!redeemBody || !redeemBody.referenceId) {
      setLoading(false);
      alert('Missing redeem details. Please go back and fill in the details.');
      return;
    }


    try { console.log('[SummaryCafe] sending redeem request', { userId: scannedUserId, ...redeemBody }); } catch {}
    const resp = await fetch('/api/cafe/redeem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ userId: scannedUserId, ...redeemBody }),
    });

    let result = null;
    try { result = await resp.json(); } catch {}

    if (resp.ok && result?.success) {
      try { sessionStorage.removeItem('cafe_redeem_request'); } catch {}
     
        try {
          const rawUser = sessionStorage.getItem('scanned_user');
          if (rawUser) {
            const parsedUser = JSON.parse(rawUser);

            const beansFinal = result?.data?.summary?.beans?.final;
            const rewardsFinal = result?.data?.summary?.stampRewards?.final;
            if (typeof beansFinal !== 'undefined' && beansFinal !== null) {
              parsedUser.beans = Number(beansFinal) || 0;
   
              parsedUser.whiteMantisBeans = Number(beansFinal) || parsedUser.whiteMantisBeans || 0;
            }
            if (typeof rewardsFinal !== 'undefined' && rewardsFinal !== null) {
              parsedUser.totalRewards = Number(rewardsFinal) || parsedUser.totalRewards || 0;
              parsedUser.stampReward = Number(rewardsFinal) || parsedUser.stampReward || 0;
            }
            try { sessionStorage.setItem('scanned_user', JSON.stringify(parsedUser)); } catch {}
          }
        } catch (e) {
          console.warn('[SummaryCafe] failed to update scanned_user after redeem', e);
        }

        setLoading(false);
        router.replace('/OrderComplete');
        return;
    }

    setLoading(false);
    alert(result?.message || 'Redemption failed. Please try again.');
    return;
  }
                      
                          let scannedUserId = null;
                          try {
                            const rawUser = sessionStorage.getItem('scanned_user');
                            if (rawUser) {
                              const parsedUser = JSON.parse(rawUser);
                              scannedUserId = parsedUser?.id || parsedUser?.user || null;
                            }
                          } catch {}

                          if (!scannedUserId) {
                            setLoading(false);
                            alert('No scanned customer found. Please go back and scan a customer QR code first.');
                            return;
                          }

                          const requestBody = stored?.request || {
                            referenceId: refParam || '',
                            stampsEarned: stampsEarned || 0,
                          };

                          if (!requestBody.referenceId || requestBody.stampsEarned <= 0) {
                            setLoading(false);
                            alert('Missing reference ID or stamp count. Please go back and fill in the details.');
                            return;
                          }

                          const resp = await fetch('/api/cafe/earn-by-user', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            credentials: 'same-origin', 
                            body: JSON.stringify({
                              userId: scannedUserId,
                              stampsEarned: requestBody.stampsEarned,
                              referenceId: requestBody.referenceId,
                            }),
                          });

                          let result = null;
                          try { result = await resp.json(); } catch {}

                          if (resp.ok && result?.success) {
                            try {
                              sessionStorage.setItem('cafe_summary_response',
                                JSON.stringify({ request: requestBody, response: result }));
                            } catch {}
                            setLoading(false);
                            router.replace('/OrderComplete');
                            return;
                          }

                          setLoading(false);
                          alert(result?.message || 'Unable to issue stamps. Please try again.');
                        } catch (err) {
                          setLoading(false);
                          console.error('Confirm finalize failed', err);
                          alert('Failed to finalize order. Check console for details.');
                        }
      } finally {
        submittingRef.current = false;
      }
    };

    const confirmLabel = loading
      ? (type === 'redeem' ? 'Redeeming...' : 'Issuing...')
      : (type === 'redeem' ? 'Confirm & Redeem' : 'Confirm & issue rewards');

    return (
      <>
        <div className={styles.main}>
          <div className={styles.MainContainer}>
            <div className={styles.left}>
              <div className={styles.leftTop}>
                <div className={styles.leftTopOne}>
                  <h4>Reference ID</h4>
                  <p>{(summaryData && summaryData.request && summaryData.request.referenceId) || params.get('ref') || '—'}</p>
                </div>

                <div className={styles.leftTopTwo}>
                  <h4>Order Type</h4>
                  <p>Cafe</p>
                </div>

                {type === "redeem" && (
                  <div className={styles.leftTopThree}>
                    <h4>Order Value</h4>
                    <p>AED {value}</p>
                  </div>
                )}
              </div>

              <div className={styles.leftBottom}>
                {type === "earn" && (
                  <div className={styles.leftBottomOne}>
                    <h3>Stamp Issued</h3>

                    <div className={styles.stampDetails}>
                      <div className={styles.stampDetailsLeft}>
                        <h4>+{(summaryData && summaryData.request && summaryData.request.stampsEarned) || stamps || 0}</h4>
                        <p>Stamp earned</p>
                      </div>

                      <div className={styles.stampDetailsRight}>
                        <Image src={stampicon} alt="stamp" />
                      </div>
                    </div>
                  </div>
                )}

      
                {type === "redeem" && (
                  <div className={styles.leftBottomOne}>
                    <h3>Redemption Summary</h3>

                    <div className={styles.redemptionGrid}>
                      {beans && (
                        <div className={styles.redCard}>
                          <div className={styles.redLeft}>
                    <h4>-{beansConsumed}</h4>
<p>Surge beans</p>
                          </div>

                          <div className={styles.redRight}>
                            <svg
                              width="45"
                              height="45"
                              viewBox="0 0 45 45"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                d="M28.6351 13.6912C27.4032 6.00816 21.6395 0.300781 14.5999 0.300781C6.7244 0.300781 0.300781 7.67647 0.300781 16.7644C0.300781 25.8523 6.17444 32.5694 13.566 33.1621C13.984 35.9938 15.2159 38.5402 17.1738 40.5158C19.7036 43.0402 23.0914 44.2695 26.6332 44.2695C30.923 44.2695 35.4327 42.4695 38.9525 38.9573C45.3761 32.5475 46.0801 22.801 40.5144 17.2253C37.5006 14.218 33.1008 12.9887 28.6131 13.6912H28.6351ZM36.8406 19.8595C36.4447 19.9254 36.0267 19.9473 35.5207 19.9693C33.7828 20.0351 31.4289 20.1229 29.1191 22.4278C26.8312 24.7108 26.7212 27.0815 26.6552 28.8157C26.5892 30.2865 26.5672 31.1865 25.4893 32.2621C24.4114 33.3377 23.5094 33.3816 22.0355 33.4255C20.9796 33.4694 19.6816 33.5353 18.3177 34.0841C18.0097 33.1182 17.8118 32.1084 17.8118 31.0109C17.8118 27.762 19.3077 24.4474 21.8595 21.901C23.404 20.3414 25.296 19.1681 27.3812 18.4766C28.5877 18.0769 29.8498 17.8695 31.121 17.8619C33.2988 17.8619 35.2787 18.5644 36.8406 19.8595ZM24.3894 14.9204L24.2134 15.0082C24.0374 15.0741 23.8834 15.1839 23.7074 15.2497C23.2894 15.4473 22.8715 15.6668 22.4755 15.9083C22.2775 16.018 22.1015 16.1497 21.9035 16.2595C21.5075 16.5009 21.1336 16.7863 20.7596 17.0497C20.6056 17.1814 20.4296 17.2912 20.2756 17.4229C19.7476 17.84 19.2637 18.279 18.7797 18.7619C18.7357 18.8058 18.6917 18.8717 18.6257 18.9156C18.0757 17.2473 17.0638 16.1278 16.2498 15.2278C15.2379 14.1302 14.6439 13.4716 14.6439 11.957C14.6439 10.4423 15.2599 9.78381 16.2498 8.68623C16.9758 7.91793 17.8337 6.95207 18.4057 5.59108C21.5295 7.19354 23.8614 10.6619 24.3894 14.8546V14.9204ZM4.72252 16.7644C4.72252 10.4204 8.77028 5.19595 13.874 4.73497C13.632 5.06424 13.346 5.39352 13.016 5.76669C11.8501 7.03988 10.2222 8.77404 10.2222 12.0009C10.2222 15.2278 11.8281 16.9839 13.016 18.2571C14.028 19.3546 14.6219 20.0132 14.6219 21.5278C14.6219 23.0425 14.006 23.701 13.016 24.7986C12.2901 25.5669 11.4321 26.5328 10.8602 27.8718C7.27437 26.0498 4.74452 21.7912 4.74452 16.7644H4.72252ZM35.8727 35.8621C31.385 40.3402 24.8513 41.1524 20.9136 37.9036C21.3095 37.8597 21.7275 37.8158 22.2115 37.7938C23.9494 37.728 26.3032 37.6402 28.6131 35.3353C30.901 33.0523 31.011 30.6816 31.077 28.9474C31.143 27.4547 31.165 26.5767 32.2429 25.501C33.3208 24.4254 34.2228 24.3815 35.6967 24.3376C36.7526 24.2937 38.0726 24.2498 39.4585 23.6791C40.6904 27.4986 39.4365 32.3279 35.8727 35.8621Z"
                                fill="#6E736A"
                                stroke="#F2F1F0"
                                strokeWidth="0.6"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </div>
                        </div>
                      )}

                      {reward && (
                        <div className={styles.redCard}>
                          <div className={styles.redLeft}>
                            <h4>-01</h4>
                            <p>Stamp Reward</p>
                          </div>

                          <div className={styles.redRight}>
                            <svg
                              width="43"
                              height="43"
                              viewBox="0 0 43 43"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                d="M35.5547 23H23V40H32.6113C33.3922 39.9999 34.1412 39.6888 34.6934 39.1367C35.2452 38.5846 35.5547 37.8353 35.5547 37.0547V23ZM7.44531 37.0547C7.44531 37.8353 7.75479 38.5846 8.30664 39.1367C8.85878 39.6888 9.60782 39.9999 10.3887 40H20V23H7.44531V37.0547ZM40 14.834C40 14.4352 39.6763 14.1113 39.2773 14.1113H23V20H39.2773C39.6763 20 40 19.6762 40 19.2773V14.834ZM3 19.2773C3 19.6762 3.32375 20 3.72266 20H20V14.1113H3.72266C3.32375 14.1113 3 14.4352 3 14.834V19.2773ZM35.5547 7.05664C35.5547 5.98112 35.1277 4.94999 34.3672 4.18945C33.6066 3.42891 32.5756 3 31.5 3H31.4746C29.8679 2.97201 28.1558 3.74411 26.5859 5.48828C25.3313 6.88226 24.2598 8.80525 23.4902 11.1113H31.5C32.5755 11.1113 33.6066 10.6843 34.3672 9.92383C35.1277 9.16335 35.5546 8.1321 35.5547 7.05664ZM7.44531 7.05664C7.44538 8.1321 7.87231 9.16335 8.63281 9.92383C9.39336 10.6843 10.4245 11.1113 11.5 11.1113H19.5098C18.7402 8.80525 17.6687 6.88226 16.4141 5.48828C14.8442 3.74411 13.1321 2.97201 11.5254 3L11.5 3.00195V3C10.4244 3 9.39337 3.42891 8.63281 4.18945C7.87229 4.94999 7.44531 5.98112 7.44531 7.05664ZM38.5547 7.05664C38.5546 8.51803 38.1004 9.93151 37.2715 11.1113H39.2773C41.333 11.1113 43 12.7783 43 14.834V19.2773C43 21.3331 41.333 23 39.2773 23H38.5547V37.0547C38.5547 38.6312 37.9293 40.145 36.8145 41.2598C35.6997 42.3742 34.1876 42.9999 32.6113 43H10.3887C8.81239 42.9999 7.30026 42.3742 6.18555 41.2598C5.07074 40.145 4.44531 38.6312 4.44531 37.0547V23H3.72266C1.66696 23 0 21.3331 0 19.2773V14.834C0 12.7783 1.66696 11.1113 3.72266 11.1113H5.72852C4.89957 9.93151 4.44536 8.51803 4.44531 7.05664C4.44531 5.18546 5.1886 3.3915 6.51172 2.06836C7.8349 0.745215 9.62876 1.26261e-07 11.5 0V0.00390625C14.1708 -0.0338889 16.6514 1.27013 18.6426 3.48242C19.7648 4.72929 20.7249 6.25098 21.5 7.9668C22.2751 6.25098 23.2352 4.72929 24.3574 3.48242C26.3486 1.27013 28.8292 -0.0338882 31.5 0.00390625V0C33.3712 0 35.1651 0.745215 36.4883 2.06836C37.8114 3.3915 38.5547 5.18546 38.5547 7.05664Z"
                                fill="#6C7A5F"
                              />
                            </svg>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className={styles.Ctas}>
<button onClick={handleEdit} className={styles.editcta}>Edit Order</button>
                  <button
                    className={styles.confrimcta}
                    disabled={loading}
                    aria-disabled={loading}
                    onClick={handleConfirm}
                  >
 {confirmLabel}

                  </button>
                </div>
              </div>
            </div>

            <div className={styles.right}>
              <h4>Current Customer Rewards Summary </h4>
              <div className={styles.summarycardDeatils}>
                <div className={styles.deatilsOne}>
                  <div className={styles.deatilsOneLeft}>
                    <h4>Surge beans</h4>
                  </div>
                  <div className={styles.deatilsOneRight}>
                    <p>{String(beansBefore)}</p>
                    <svg width="26" height="12" viewBox="0 0 26 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path opacity="0.6" d="M23.3536 6.35356C23.5488 6.15829 23.5488 5.84171 23.3536 5.64645L20.1716 2.46447C19.9763 2.26921 19.6597 2.26921 19.4645 2.46447C19.2692 2.65973 19.2692 2.97631 19.4645 3.17157L22.2929 6L19.4645 8.82843C19.2692 9.02369 19.2692 9.34027 19.4645 9.53554C19.6597 9.7308 19.9763 9.7308 20.1716 9.53554L23.3536 6.35356ZM4 6L4 6.5L23 6.5L23 6L23 5.5L4 5.5L4 6Z" fill="#6E736A" />
                    </svg>
                    <p>{String(beansAfter)}</p>
                  </div>
                </div>
                <div className={styles.deatilsTwo}>
                  <div className={styles.deatilsTwoLeft}>
                    <h4>Surge stamp rewards</h4>
                  </div>
                  <div className={styles.deatilsTwoRight}>
                    <p>{String(rewardsBefore).padStart(2, '0')}</p>
                    <svg width="26" height="12" viewBox="0 0 26 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path opacity="0.6" d="M23.3536 6.35356C23.5488 6.15829 23.5488 5.84171 23.3536 5.64645L20.1716 2.46447C19.9763 2.26921 19.6597 2.26921 19.4645 2.46447C19.2692 2.65973 19.2692 2.97631 19.4645 3.17157L22.2929 6L19.4645 8.82843C19.2692 9.02369 19.2692 9.34027 19.4645 9.53554C19.6597 9.7308 19.9763 9.7308 20.1716 9.53554L23.3536 6.35356ZM4 6L4 6.5L23 6.5L23 6L23 5.5L4 5.5L4 6Z" fill="#6E736A" />
                    </svg>
                    <p>{String(rewardsAfter).padStart(2, '0')}</p>
                  </div>
                </div>
                <div className={styles.deatilsThree}>
                  <div className={styles.deatilsThreeLeft}>
                    <h4>Surge stamps</h4>
                  </div>
                  <div className={styles.deatilsThreeRight}>
                    <p>{String(stampsBefore).padStart(2, '0')}</p>
                    <svg width="26" height="12" viewBox="0 0 26 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path opacity="0.6" d="M23.3536 6.35356C23.5488 6.15829 23.5488 5.84171 23.3536 5.64645L20.1716 2.46447C19.9763 2.26921 19.6597 2.26921 19.4645 2.46447C19.2692 2.65973 19.2692 2.97631 19.4645 3.17157L22.2929 6L19.4645 8.82843C19.2692 9.02369 19.2692 9.34027 19.4645 9.53554C19.6597 9.7308 19.9763 9.7308 20.1716 9.53554L23.3536 6.35356ZM4 6L4 6.5L23 6.5L23 6L23 5.5L4 5.5L4 6Z" fill="#6E736A" />
                    </svg>
                    <p className={styles.high}>{String(stampsAfter).padStart(2, '0')}/{String(10).padStart(2, '0')}</p>
                  </div>
                </div>
              </div>
              <div className={styles.mobileCtas}>
                <button className={styles.editcta} onClick={handleEdit}>Edit Order</button>
                <button
                  className={styles.confrimcta}
                  disabled={loading}
                  aria-disabled={loading}
                  onClick={handleConfirm}
                >
                  {confirmLabel}
                </button>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  };

  export default SummaryCafe;
