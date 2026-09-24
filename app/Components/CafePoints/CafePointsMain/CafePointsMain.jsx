"use client";
import React, { useState, useEffect } from "react";
import styles from "./CafePointsMain.module.css";
import activestamp from "./cstamp.png";
import inactivestamp from "./nostamp.png";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { previewBeansRedeemed, beansToAed } from "../../../lib/rewards";

const CafePointsMain = () => {
  const router = useRouter();
  const TOTAL_STAMPS = 10;

  const [activeStamps, setActiveStamps] = useState(0);
  const [totalRewards, setTotalRewards] = useState(0);
  const [userBeans, setUserBeans] = useState(0);

  const [type, setType] = useState("earn");
  const [stamps, setStamps] = useState("");
  const [referenceId, setReferenceId] = useState("");
  const [orderValue, setOrderValue] = useState("");
  const [useBeans, setUseBeans] = useState(false);
  const [useReward, setUseReward] = useState(false);

  const stampsNumber = Number(stamps) || 0;
  const combinedStamps = Number(activeStamps) + stampsNumber;
  const rewardAdded = Math.floor(combinedStamps / TOTAL_STAMPS);
  const previewRemaining = combinedStamps % TOTAL_STAMPS;
  const previewTotalRewards = Number(totalRewards) + rewardAdded;
  const displayActive = previewRemaining;

  const handleContinue = () => {
    if (type === "earn") {
      const stampsNum = Number(stamps) || 0;
      if (!referenceId || !String(referenceId).trim() || stampsNum <= 0) return;
      try {
        const body = {
          stampsEarned: stampsNum,
          referenceId: String(referenceId).trim(),
        };
        try {
          sessionStorage.setItem(
            "cafe_summary_response",
            JSON.stringify({ request: body, response: null }),
          );
        } catch {}

        try {
          sessionStorage.removeItem("cafe_redeem_request");
        } catch {}
        router.push(
          `/CafeSummary?type=earn&ref=${encodeURIComponent(referenceId)}`,
        );
      } catch {
        if (typeof window !== "undefined")
          alert("Unable to prepare summary at this time.");
      }
      return;
    }

    if (type === "redeem") {
      const orderNum = parseFloat(String(orderValue).replace(/,/g, "")) || 0;
      if (!referenceId || !String(referenceId).trim() || orderNum <= 0) return;
      try {
        const body = {
          OrderValue: orderNum,
          referenceId: String(referenceId).trim(),
          beansRedeemed: useBeans,
          stampsRewardRedeemed: useReward,
        };
        try {
          sessionStorage.setItem("cafe_redeem_request", JSON.stringify(body));
        } catch {}
        // Clear earn summary when doing redeem
        try {
          sessionStorage.removeItem("cafe_summary_response");
        } catch {}
        router.push(
          `/CafeSummary?type=redeem&value=${orderNum}&beans=${useBeans}&reward=${useReward}&ref=${encodeURIComponent(referenceId)}`,
        );
      } catch {
        if (typeof window !== "undefined")
          alert("Unable to prepare summary at this time.");
      }
    }
  };

  const stampsNumberForCheck = Number(stamps) || 0;
  const orderValueNumber =
    parseFloat(String(orderValue).replace(/,/g, "")) || 0;
  const canContinue =
    type === "earn"
      ? String(referenceId).trim().length > 0 && stampsNumberForCheck > 0
      : String(referenceId).trim().length > 0 && orderValueNumber > 0;

  // Only as many beans as the order is worth are used (never a negative total).
  const beansValueAED = beansToAed(previewBeansRedeemed(userBeans, orderValueNumber));
  const stampRewardAED = 0;

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
          const active =
            Number(
              parsed.activeStamps ||
                parsed.totalStamps ||
                parsed.stampCount ||
                parsed.active_stamps ||
                0,
            ) || 0;
          const rewards =
            Number(
              parsed.totalRewards ||
                parsed.stampReward ||
                parsed.rewardsCount ||
                parsed.rewards_total ||
                0,
            ) || 0;
          const beans =
            Number(
              parsed.beans ||
                parsed.whiteMantisBeans ||
                parsed.beans_value ||
                parsed.beansValue ||
                0,
            ) || 0;
          if (!mounted) return;
          setActiveStamps(active);
          setTotalRewards(rewards);
          setUserBeans(beans);

          try {
            const editFlag = sessionStorage.getItem("cafe_edit_order");
            if (editFlag === "true") {
              sessionStorage.removeItem("cafe_edit_order");

              const rawRedeem = sessionStorage.getItem("cafe_redeem_request");
              if (rawRedeem) {
                const parsedRedeem = JSON.parse(rawRedeem);
                setType("redeem");
                if (parsedRedeem.referenceId)
                  setReferenceId(parsedRedeem.referenceId);
                if (parsedRedeem.OrderValue)
                  setOrderValue(String(parsedRedeem.OrderValue));
                if (typeof parsedRedeem.beansRedeemed !== "undefined")
                  setUseBeans(parsedRedeem.beansRedeemed);
                if (typeof parsedRedeem.stampsRewardRedeemed !== "undefined")
                  setUseReward(parsedRedeem.stampsRewardRedeemed);
                return;
              }

              const rawSummary = sessionStorage.getItem(
                "cafe_summary_response",
              );
              if (rawSummary) {
                const parsedSummary = JSON.parse(rawSummary);
                if (
                  parsedSummary?.request &&
                  !parsedSummary?.response?.success
                ) {
                  const req = parsedSummary.request;
                  setType("earn");
                  if (req.referenceId) setReferenceId(req.referenceId);
                  if (req.stampsEarned != null)
                    setStamps(String(req.stampsEarned));
                }
              }
            }
          } catch {
            // ignore
          }

          return;
        } catch {}
      }
      if (attempts < 4) setTimeout(readScannedUser, 250);
    }

    readScannedUser();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <>
      <div className={styles.main}>
        <div className={styles.MainContainer}>
          <div className={styles.left}>
            <div className={styles.leftTop}>
              <h4>Reference ID</h4>
              <input
                type="text"
                placeholder="Enter reference ID"
                value={referenceId}
                onChange={(e) => setReferenceId(e.target.value)}
              />
            </div>

            <div className={styles.leftMiddle}>
              <label className={styles.radioItem}>
                <input
                  type="radio"
                  name="type"
                  value="earn"
                  checked={type === "earn"}
                  onChange={() => setType("earn")}
                />
                <span className={styles.customRadio}></span>
                <span className={styles.radioText}>Earn Stamp</span>
              </label>

              <label className={styles.radioItem}>
                <input
                  type="radio"
                  name="type"
                  value="redeem"
                  checked={type === "redeem"}
                  onChange={() => setType("redeem")}
                />
                <span className={styles.customRadio}></span>
                <span className={styles.radioText}>
                  Redeem Beans / Stamp Reward
                </span>
              </label>
            </div>

            <div className={styles.leftBottom}>
              {type === "earn" && (
                <div className={styles.leftBottomTop}>
                  <div className={styles.leftBottomTopTexts}>
                    <h4>no. of Stamps to earn</h4>
                    <p>1 beverage = 1 stamp</p>
                  </div>
                  <input
                    type="number"
                    inputMode="numeric"
                    pattern="\d*"
                    min="0"
                    value={stamps}
                    onKeyDown={(e) => {
                      if (
                        e.key === "e" ||
                        e.key === "E" ||
                        e.key === "+" ||
                        e.key === "-"
                      )
                        e.preventDefault();
                    }}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "") {
                        setStamps("");
                        return;
                      }
                      setStamps(String(val).replace(/\D/g, ""));
                    }}
                  />
                </div>
              )}

              {type === "redeem" && (
                <>
                  <div className={styles.leftBottomTop}>
                    <div className={styles.leftBottomTopTexts}>
                      <h4>Order Value (AED)</h4>
                    </div>
                    <input
                      type="text"
                      value={orderValue}
                      onChange={(e) => setOrderValue(e.target.value)}
                    />
                  </div>

                  <div className={styles.redemption}>
                    <h4>Redemption</h4>

                    <div
                      className={`${styles.checkBoxCard} ${userBeans <= 0 ? styles.mutedCard : ""}`}
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

                    <div
                      className={`${styles.checkBoxCard} ${totalRewards <= 0 ? styles.mutedCard : ""}`}
                    >
                      <input
                        type="checkbox"
                        checked={useReward}
                        disabled={totalRewards <= 0}
                        onChange={(e) => setUseReward(e.target.checked)}
                      />
                      <div>
                        <p>Redeem stamp reward</p>
                        <span>1 stamp reward will be deducted</span>
                      </div>
                    </div>
                  </div>
                </>
              )}

              <button
                className={`${styles.continue} ${styles.desktopContinue} ${!canContinue ? styles.continueMuted : ""}`}
                onClick={handleContinue}
                disabled={!canContinue}
                aria-disabled={!canContinue}
              >
                Continue
              </button>
            </div>
          </div>

          <div className={styles.right}>
            {type === "earn" && (
              <div className={styles.RightBottom}>
                <h6>Stamp card</h6>
                <div className={styles.stampCard}>
                  <div className={styles.StampsDetails}>
                    <p>
                      {displayActive} of {TOTAL_STAMPS} stamps collected
                    </p>
                    <div className={styles.Rewards}>
                      <span>Total Rewards</span>
                      <div className={styles.rewardCircle}>
                        {previewTotalRewards}
                      </div>
                    </div>
                  </div>

                  <div className={styles.StampGrid}>
                    {[...Array(TOTAL_STAMPS)].map((_, index) => {
                      const existingMod = Number(activeStamps) % TOTAL_STAMPS;
                      const previewNum = Number(stamps) || 0;
                      const previewIndices = new Set();
                      for (let k = 0; k < previewNum; k++) {
                        previewIndices.add((existingMod + k) % TOTAL_STAMPS);
                      }
                      const isPreview = previewIndices.has(index);
                      const isExisting = index < existingMod && !isPreview;
                      const shadowClass =
                        isExisting || isPreview
                          ? `${styles[`shadow${index % 5}`]} ${index >= 5 ? styles.secondRow : ""}`
                          : "";
                      return (
                        <div
                          key={index}
                          className={`${styles.stampWrapper} ${shadowClass}`}
                        >
                          {isExisting || isPreview ? (
                            <Image
                              src={activestamp}
                              alt="stamp"
                              className={
                                isPreview
                                  ? `${styles.texturestamp} ${styles.fullStamp}`
                                  : styles.texturestamp
                              }
                            />
                          ) : (
                            <div className={styles.unStamp}>
                              <Image src={inactivestamp} alt="stamp" />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {type === "redeem" && (
              <div className={styles.righttwo}>
                <h6>Live Breakdown</h6>
                <div className={styles.breakdownCard}>
                  <div className={styles.breakRow}>
                    <span>Order total</span>
                    <span>AED {orderValueNumber.toFixed(2)}</span>
                  </div>
                  {useBeans && (
                    <div className={styles.breakRow}>
                      <span>Beans Redeemed</span>
                      <span className={styles.red}>
                        AED {beansValueAED.toFixed(2)}
                      </span>
                    </div>
                  )}
                  {useReward && (
                    <div className={styles.breakRow}>
                      <span>Stamp Reward</span>
                      <span className={styles.red}>1 stamp redeemed</span>
                    </div>
                  )}
                  <div className={styles.line}></div>
                  <div className={styles.breakRowTotal}>
                    <span>Total</span>
                    <span>
                      AED{" "}
                      {(
                        orderValueNumber -
                        (useBeans ? beansValueAED : 0) -
                        (useReward ? stampRewardAED : 0)
                      ).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
          <button
            className={`${styles.continue} ${styles.mobileContinue} ${!canContinue ? styles.continueMuted : ""}`}
            onClick={handleContinue}
            disabled={!canContinue}
            aria-disabled={!canContinue}
          >
            Continue
          </button>
        </div>
      </div>
    </>
  );
};

export default CafePointsMain;
