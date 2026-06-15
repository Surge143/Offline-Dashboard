"use client";
import React, { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import styles from "./ShopSummaryMain.module.css";

const ShopSummaryMain = () => {
  const params = useSearchParams();
  const router = useRouter();

  const value = params.get("value");
  const beansParam = params.get("beans") === "true";
  const refParam = params.get("ref") || "—";

  const [scannedUser, setScannedUser] = useState(null);
  const [shopRequest, setShopRequest] = useState(null);
  const [loading, setLoading] = useState(false);
useEffect(() => {
  try {
    const raw = sessionStorage.getItem("scanned_user");
    if (raw) {
      const parsed = JSON.parse(raw);
      setTimeout(() => setScannedUser(parsed), 0);
    }
  } catch {}
  try {
    const raw2 = sessionStorage.getItem("shop_request");
    if (raw2) {
      const parsed2 = JSON.parse(raw2);
      setTimeout(() => setShopRequest(parsed2), 0);
    }
  } catch {}
}, []);
  const orderVal = Number(shopRequest?.OrderValue || value) || 0;
  const redeemBeans = shopRequest?.redeemBeans ?? beansParam;
  const referenceId = shopRequest?.referenceId || refParam;

  const beansBefore = Number(
    scannedUser?.beans ||
    scannedUser?.whiteMantisBeans ||
    scannedUser?.beans_value ||
    0
  ) || 0;

  const beansRedeemed = redeemBeans ? beansBefore : 0;

  const beansEarned = Math.floor(orderVal * 0.1);
  const beansAfter = beansBefore - beansRedeemed + beansEarned;

  const handleConfirm = async () => {
    setLoading(true);
    try {
      let scannedUserId = null;
      try {
        const raw = sessionStorage.getItem("scanned_user");
        if (raw) {
          const p = JSON.parse(raw);
          scannedUserId = p?.id || p?.user || null;
        }
      } catch {}

      if (!scannedUserId) {
        setLoading(false);
        alert("No scanned customer found. Please go back and scan a customer QR code first.");
        return;
      }

      if (!shopRequest?.referenceId || !shopRequest?.OrderValue) {
        setLoading(false);
        alert("Missing order details. Please go back and fill in the details.");
        return;
      }

      const resp = await fetch("/api/store", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          userId: scannedUserId,
          redeemBeans: shopRequest.redeemBeans || false,
          OrderValue: shopRequest.OrderValue,
          referenceId: shopRequest.referenceId,
        }),
      });

      let result = null;
      try { result = await resp.json(); } catch {}

      if (resp.ok && result?.success) {

        try {
          const raw = sessionStorage.getItem("scanned_user");
          if (raw) {
            const p = JSON.parse(raw);
            p.beans = result?.data?.totalBalance ?? beansAfter;
            p.whiteMantisBeans = p.beans;
            sessionStorage.setItem("scanned_user", JSON.stringify(p));
          }
        } catch {}
        try { sessionStorage.removeItem("shop_request"); } catch {}
        setLoading(false);
        router.replace("/OrderComplete");
        return;
      }

      setLoading(false);
      alert(result?.message || "Failed to issue rewards. Please try again.");
    } catch {
      setLoading(false);
      alert("Failed to finalize order. Check console for details.");
    }
  };

  const handleEditOrder = () => {
    try { sessionStorage.setItem("shop_edit_order", "true"); } catch {}
    router.back();
  };

  return (
    <div className={styles.main}>
      <div className={styles.MainContainer}>

        <div className={styles.left}>
          <div className={styles.leftTop}>
            <div className={styles.leftTopOne}>
              <h4>Reference ID</h4>
              <p>{referenceId}</p>
            </div>
            <div className={styles.leftTopTwo}>
              <h4>Order Type</h4>
              <p>Store</p>
            </div>
            <div className={styles.leftTopThree}>
              <h4>Order Value</h4>
              <p>AED {orderVal.toFixed(2)}</p>
            </div>
          </div>

          <div className={styles.leftBottom}>
            <div className={styles.summarySection}>
              <h3>Summary</h3>
              <div className={styles.summaryRows}>
                {redeemBeans && (
                  <div className={styles.summaryRow}>
                    <span>Beans redeemed on this order</span>
                    <span className={styles.red}>{beansRedeemed}</span>
                  </div>
                )}
                <div className={styles.summaryRow}>
                  <span>Beans earned on this order</span>
                  <span className={styles.green}>{beansEarned}</span>
                </div>
              </div>
            </div>

            <div className={styles.Ctas}>
              <button className={styles.editcta} onClick={handleEditOrder}>
                Edit Order
              </button>
              <button
                className={styles.confrimcta}
                disabled={loading}
                aria-disabled={loading}
                onClick={handleConfirm}
              >
                {loading ? "Issuing..." : "Confirm & issue rewards"}
              </button>
            </div>
          </div>
        </div>

  <div className={styles.right}>
          <h4>Current Customer Beans Summary</h4>
          <div className={styles.summaryCard}>
            <div className={styles.cardRow}>
              <span>Beans available</span>
              <span>{beansBefore}</span>
            </div>
            {redeemBeans && (
              <div className={styles.cardRow}>
                <span>Beans redeemed on this order</span>
                <span className={styles.red}>{beansRedeemed}</span>
              </div>
            )}
            <div className={styles.cardRow}>
              <span>Beans earned on this order</span>
              <span className={styles.green}>{beansEarned}</span>
            </div>
            <div className={styles.divider} />
            <div className={styles.cardRowTotal}>
              <span>Total beans available after this order</span>
              <span>{beansAfter}</span>
            </div>
          </div>

          <div className={styles.mobileCtas}>
            <button
              className={styles.confrimcta}
              disabled={loading}
              aria-disabled={loading}
              onClick={handleConfirm}
            >
              {loading ? "Issuing..." : "Confirm & issue reward"}
            </button>
            <button className={styles.editcta} onClick={handleEditOrder}>
              Edit Order
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ShopSummaryMain;