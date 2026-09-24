"use client";
import React, { useState, useEffect } from "react";
import styles from "./ShopMain.module.css";
import { useRouter } from "next/navigation";
import { previewBeansRedeemed, previewBeansEarned, beansToAed } from "../../../lib/rewards";

const ShopMain = () => {
  const router = useRouter();

  const [referenceId, setReferenceId] = useState("");
  const [orderValue, setOrderValue] = useState("");
  const [useBeans, setUseBeans] = useState(false);
  const [userBeans, setUserBeans] = useState(0);

  const orderValueNumber =
    parseFloat(String(orderValue).replace(/,/g, "")) || 0;
  // Same rules as the backend: only as many beans as the order is worth are used,
  // and beans are earned on the part of the order not paid with beans.
  const beansRedeemedPreview = useBeans ? previewBeansRedeemed(userBeans, orderValueNumber) : 0;
  const beansValueAED = beansToAed(beansRedeemedPreview);
  const beansEarned = previewBeansEarned(orderValueNumber, beansRedeemedPreview);
  const total = orderValueNumber - beansValueAED;

  const canContinue =
    String(referenceId).trim().length > 0 && orderValueNumber > 0;

  useEffect(() => {
    let mounted = true;
    let attempts = 0;

    function readScannedUser() {
      attempts += 1;
      if (typeof window === "undefined") return;
      const raw = sessionStorage.getItem("scanned_user");
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          const beans =
            Number(
              parsed.beans ||
                parsed.whiteMantisBeans ||
                parsed.beans_value ||
                parsed.beansValue ||
                0,
            ) || 0;
          if (!mounted) return;
          setUserBeans(beans);

  
          try {
            const editFlag = sessionStorage.getItem("shop_edit_order");
            if (editFlag === "true") {
              sessionStorage.removeItem("shop_edit_order");
              const rawReq = sessionStorage.getItem("shop_request");
              if (rawReq) {
                const parsedReq = JSON.parse(rawReq);
                if (parsedReq.referenceId)
                  setReferenceId(parsedReq.referenceId);
                if (parsedReq.OrderValue)
                  setOrderValue(String(parsedReq.OrderValue));
                if (typeof parsedReq.redeemBeans !== "undefined")
                  setUseBeans(parsedReq.redeemBeans);
              }
            }
          } catch {
            // ignore
          }

          return;
        } catch {
          // invalid retry
        }
      }
      if (attempts < 4) setTimeout(readScannedUser, 250);
    }

    readScannedUser();
    return () => {
      mounted = false;
    };
  }, []);

  const handleContinue = () => {
    if (!canContinue) return;
    try {
      const body = {
        OrderValue: orderValueNumber,
        referenceId: String(referenceId).trim(),
        redeemBeans: useBeans,
      };
      try {
        sessionStorage.setItem("shop_request", JSON.stringify(body));
      } catch {}
      try {
        sessionStorage.removeItem("shop_edit_order");
      } catch {}
      router.push(
        `/ShopSummary?value=${orderValueNumber}&beans=${useBeans}&ref=${encodeURIComponent(referenceId)}`,
      );
    } catch {
      alert("Unable to prepare summary at this time.");
    }
  };

  return (
    <div className={styles.Main}>
      <div className={styles.MainContainer}>
        
        <div className={styles.left}>
          
          <div className={styles.fieldGroup}>
            <h4>Reference Id</h4>
            <input
              type="text"
              placeholder="Enter reference ID"
              value={referenceId}
              onChange={(e) => setReferenceId(e.target.value)}
            />
          </div>

          
          <div className={styles.fieldGroup}>
            <h4>Order Value (AED)</h4>
            <input
              type="text"
              placeholder="eg. 1000 AED"
              value={orderValue}
              onChange={(e) => setOrderValue(e.target.value)}
            />
            {orderValueNumber > 0 && (
              <p className={styles.earningHint}>
                You are earning {beansEarned} Surge beans on this order.
              </p>
            )}
          </div>

          
          <div className={styles.redemptionSection}>
            <h4>Redemption</h4>
            <div
              className={`${styles.checkBoxCard} ${
                userBeans <= 0 ? styles.mutedCard : ""
              }`}
            >
              <input
                type="checkbox"
                checked={useBeans}
                disabled={userBeans <= 0}
                onChange={(e) => setUseBeans(e.target.checked)}
              />
              <div>
                <p>Redeem Surge beans</p>
                <span>No stamp when beans used as payment</span>
              </div>
            </div>
          </div>

          
          <button
            className={`${styles.continueCta} ${styles.desktopContinue} ${!canContinue ? styles.continueMuted : ""}`}
            onClick={handleContinue}
            disabled={!canContinue}
            aria-disabled={!canContinue}
          >
            Continue
          </button>
        </div>

        
        <div className={styles.right}>
          <div className={styles.totalBalance}>
            <h4>Total Balance</h4>
            <div className={styles.balanceRight}>
              <svg
                width="28"
                height="28"
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
              <span className={styles.balanceNumber}>{userBeans}</span>
            </div>
          </div>

          <div className={styles.breakdownSection}>
            <h6>Live Breakdown</h6>
            <div className={styles.breakdownCard}>
              <div className={styles.breakRow}>
                <span>Order total</span>
                <span>AED {orderValueNumber.toFixed(2)}</span>
              </div>
              {useBeans && (
                <div className={styles.breakRow}>
                  <span>Beans redeemed on this order</span>
                  <span className={styles.red}>
                    AED {beansValueAED.toFixed(2)}
                  </span>
                </div>
              )}
              <div className={styles.line} />
              <div className={styles.breakRowTotal}>
                <span>Total</span>
                <span>AED {total.toFixed(2)}</span>
              </div>
              {orderValueNumber > 0 && (
                <div className={styles.breakRowEarned}>
                  <span>Beans earned on this order</span>
                  <span className={styles.green}>{beansEarned}</span>
                </div>
              )}
            </div>
          </div>
        </div>
        <button
          className={`${styles.continueCta} ${styles.mobileContinue} ${!canContinue ? styles.continueMuted : ""}`}
          onClick={handleContinue}
          disabled={!canContinue}
          aria-disabled={!canContinue}
        >
          Continue
        </button>
      </div>
    </div>
  );
};

export default ShopMain;
