"use client";
import React, { useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import styles from "./ShopSummaryMain.module.css";
import { previewBeansRedeemed, previewBeansEarned } from "../../../lib/rewards";

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

  // Same rules as the backend: only as many beans as the order is worth are used,
  // and beans are earned on the part of the order not paid with beans.
  const beansRedeemed = redeemBeans ? previewBeansRedeemed(beansBefore, orderVal) : 0;

  const beansEarned = previewBeansEarned(orderVal, beansRedeemed);
  const beansAfter = beansBefore - beansRedeemed + beansEarned;

  // Guards against a double tap sending the same request twice before the button re-renders as disabled.
  const submittingRef = useRef(false);

  const doConfirm = async () => {
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

  const handleConfirm = async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    try {
      await doConfirm();
    } finally {
      submittingRef.current = false;
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