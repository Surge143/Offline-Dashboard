"use client";
import React from "react";
import styles from "./OrderComplete.module.css";
import { useRouter } from "next/navigation";

const OrderCompleted = () => {
  const router = useRouter();

  return (
    <>
      <div className={styles.main}>
        <div className={styles.mainContainer}>
          
          <div className={styles.Top}>
           <svg width="116" height="116" viewBox="0 0 116 116" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M57.6875 0.5C89.2722 0.5 114.875 26.1028 114.875 57.6875C114.875 89.2722 89.2722 114.875 57.6875 114.875C26.1028 114.875 0.5 89.2722 0.5 57.6875C0.5 26.1028 26.1028 0.5 57.6875 0.5ZM82.8496 37.374L66.6963 53.5264L50.8965 69.3252L35.3008 53.7168L34.9473 53.3633L28.1367 60.1738L28.4902 60.5273L46.4824 78.5312H46.4834C47.659 79.7065 49.2528 80.3672 50.915 80.3672C52.5773 80.3672 54.1711 79.7064 55.3467 78.5312L89.6826 44.208L90.0361 43.8545L89.6826 43.501L83.5566 37.374L83.2031 37.0205L82.8496 37.374Z" fill="#C4754E" stroke="#C4754E"/>
</svg>

            <p>Order Complete</p>
          </div>

          <button
            className={styles.scannew}
            onClick={() => {
              // Clear the previous scan session so the next scan starts fresh
              try {
                sessionStorage.removeItem("scanned_user");
                sessionStorage.removeItem("scanned_raw");
                sessionStorage.removeItem("scanned_code");
                sessionStorage.removeItem("raw_code");
                sessionStorage.removeItem("cafe_summary_response");
              } catch {}
              router.replace("/scanqr");
            }}
          >
            Scan new QR
          </button>
        </div>
      </div>
    </>
  );
};

export default OrderCompleted;