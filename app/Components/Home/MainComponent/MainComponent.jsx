import React from "react";
import styles from "./MainComponent.module.css";
import Link from "next/link";

const MainComponent = () => {
  return (
    <>
      <div className={styles.main}>
        <div className={styles.MainContainer}>
          <Link href="/scanqr">
          <div className={styles.topContainer}>
            <svg
              width="40"
              height="40"
              viewBox="0 0 40 40"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M5 18.3333H8.33333V21.6667H5V18.3333ZM18.3333 8.33333H21.6667V15H18.3333V8.33333ZM15 18.3333H21.6667V25H18.3333V21.6667H15V18.3333ZM25 18.3333H28.3333V21.6667H31.6667V18.3333H35V21.6667H31.6667V25H35V31.6667H31.6667V35H28.3333V31.6667H21.6667V35H18.3333V28.3333H25V25H28.3333V21.6667H25V18.3333ZM31.6667 31.6667V25H28.3333V31.6667H31.6667ZM25 5H35V15H25V5ZM28.3333 8.33333V11.6667H31.6667V8.33333H28.3333ZM5 5H15V15H5V5ZM8.33333 8.33333V11.6667H11.6667V8.33333H8.33333ZM5 25H15V35H5V25ZM8.33333 28.3333V31.6667H11.6667V28.3333H8.33333Z"
                fill="#6E736A"
              />
            </svg>
            <p>Scan Customer QR</p>
          </div>
          </Link>
          <div className={styles.bottomContainer}>
            <h3>Reward Rules : </h3>
            <div className={styles.bottombottom}>
              <div className={styles.bottombottomLeft}>
                <div className={styles.cafeRules}>
                  <p>Cafe - Stamps</p>
                </div>
                <ul className={styles.cafeRulespoints}>
  <li>1 stamp per beverage purchased</li>
  <li>10 stamps = 1 free beverage</li>
  <li>No stamp if free voucher used</li>
  <li>No stamp if Beans redeemed at checkout</li>
</ul>
              </div>
              <div className={styles.bottombottomRight}>
                  <div className={styles.StoreRules}>
                    <p>Store - Beans</p>
                    </div>
                 <ul className={styles.StoreRulespoints}>
  <li>AED 10 spent = 1 Bean earned</li>
  <li>Beans earned on full cart value</li>
  <li>Beans redeemable as store credit</li>
  <li>No stamps issued on store orders</li>
</ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default MainComponent;
