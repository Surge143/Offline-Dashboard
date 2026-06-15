/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import React from "react";
import styles from "./OrderType.module.css";
import Image from "next/image";
import one from "./1.png";
import two from "./2.png";
import beansIco from "./3.png";
import activestamp from "./cstamp.png";
import inactivestamp from "./nostamp.png";
import { useRouter } from "next/navigation";


const OrderType = ({ code }) => {  
  const TOTAL_STAMPS = 10;
  const router = useRouter();
  const [beans, setBeans] = React.useState(0);

  const [activeStamps, setActiveStamps] = React.useState(0);
  const [totalRewards, setTotalRewards] = React.useState(0);

 
React.useEffect(() => {
  // First try sessionStorage immediately (fast path)
  try {
    const raw = sessionStorage.getItem("scanned_user");
    if (raw) {
      const parsed = JSON.parse(raw);
      const beansVal = Number(parsed.beans || parsed.totalBeans || parsed.beanBalance || 0) || 0;
      const stampsVal = Number(parsed.activeStamps || parsed.totalStamps || parsed.stampCount || 0) || 0;
      const rewardsVal = Number(parsed.totalRewards || parsed.stampReward || parsed.rewardsCount || 0) || 0;
      if (beansVal || stampsVal || rewardsVal) {
        setBeans(beansVal);
        setActiveStamps(stampsVal);
        setTotalRewards(rewardsVal);
      }
    }
  } catch {}

  // Always fetch fresh from API using the code in the URL
  if (!code) return;
  fetch(`/api/scan?code=${encodeURIComponent(code)}`, { credentials: "include" })
    .then((r) => r.json())
    .then((data) => {
      const userObj = (data && data.user) ? data.user : null;
      if (!userObj) return;
      const beansVal = Number(userObj.beans || userObj.totalBeans || userObj.beanBalance || 0) || 0;
      const stampsVal = Number(userObj.activeStamps || userObj.totalStamps || userObj.stampCount || 0) || 0;
      const rewardsVal = Number(userObj.totalRewards || userObj.stampReward || userObj.rewardsCount || 0) || 0;
      setBeans(beansVal);
      setActiveStamps(stampsVal);
      setTotalRewards(rewardsVal);
      // Update sessionStorage with fresh data
      try { sessionStorage.setItem("scanned_user", JSON.stringify(userObj)); } catch {}
    })
    .catch((e) => console.error("[OrderType] fetch error", e));
}, [code]);
  const displayActive = Math.min(activeStamps, TOTAL_STAMPS);

  return (
    <>
      <div className={styles.main}>
        <div className={styles.MainContainer}>
          <div className={styles.Left}>
            <h3>Select order type</h3>
            <div className={styles.Options}>
             <div
  className={styles.Cafe}
  onClick={() => router.push("/CafePoints")}
>
                <div className={styles.texts}>
                  <h4>Cafe</h4>
                  <p>Drinks. Food. Daily rituals.</p>
                </div>
                <div className={styles.Cafeicon}>
                  <Image src={one} alt="cafe" />
                </div>
              </div>
            <div
  className={styles.Shop}
  onClick={() => router.push("/ShopPoints")}
>
                <div className={styles.texts}>
                  <h4>Shop</h4>
                  <p>Brew at home with Surge</p>
                </div>
                <div className={styles.Shopicon}>
                  <Image src={two} alt="cafe" />
                </div>
              </div>
            </div>
          </div>
          <div className={styles.Right}>
            <div className={styles.RightTop}>
              <h6>White mantis beans</h6>
              <div className={styles.BeansCard}>
                <div className={styles.some}>
<p>{beans}</p>

                <h4>Available on Shop & Cafe orders</h4>
                </div>
                
                <Image src={beansIco} alt="beans" />
              </div>
            </div>
            <div className={styles.RightBottom}>
              <h6>Stamp card</h6>
              <div className={styles.stampCard}>
                <div className={styles.StampsDetails}>
                  <p>{activeStamps} of {TOTAL_STAMPS} stamps collected</p>

                  <div className={styles.Rewards}>
                    <span>Total Rewards</span>
                    <div className={styles.rewardCircle}>{totalRewards}</div>
                  </div>
                </div>

                <div className={styles.StampGrid}>
                  {[...Array(TOTAL_STAMPS)].map((_, index) => {
                    const isActive = index < displayActive;

                    const shadowClass = isActive
                      ? `${styles[`shadow${index % 5}`]} ${
                          index >= 5 ? styles.secondRow : ""
                        }`
                      : "";

                    return (
                      <div
                        key={index}
                        className={`${styles.stampWrapper} ${shadowClass}`}
                      >
                        {isActive ? (
                          <Image
                            src={activestamp}
                            alt="stamp"
                            className={styles.texturestamp}
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
          </div>
        </div>
      </div>
    </>
  );
};

export default OrderType;
