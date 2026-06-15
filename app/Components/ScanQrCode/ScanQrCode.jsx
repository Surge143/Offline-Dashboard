"use client";

import React, { useState } from "react";
import styles from "./ScanQrCode.module.css";
import Link from "next/link";
import Scanner from "./Scanner";
import { useRouter } from "next/navigation";

const ScanQrCode = () => {
  const [scanning, setScanning] = useState(false);
  const router = useRouter();

  function handleScan(code) {
    try {
      if (typeof window !== "undefined" && code) {
        const cleaned = String(code).trim();
        try { sessionStorage.setItem("scanned_raw", cleaned); } catch {}
        try { sessionStorage.setItem("scanned_code", cleaned); } catch {}
        try { sessionStorage.setItem("raw_code", cleaned); } catch {}
      }
    } catch {
      // ignore storage issues
    }

    (async () => {
      try {
        const encoded = encodeURIComponent(code);
        const resp = await fetch(`/api/scan?code=${encoded}`, { credentials: "include" });
        if (resp && resp.ok) {
          const data = await resp.json();

          function extractUser(obj) {
            if (!obj) return null;
            if (obj.user && typeof obj.user === "object") return obj.user;
            if (obj.data && typeof obj.data === "object") {
              if (obj.data.user && typeof obj.data.user === "object") return obj.data.user;
              return obj.data;
            }
            const hasUserLike = ["name", "username", "email", "avatar", "image", "photo", "profile", "firstName", "lastName", "profileImage"].some((k) => k in obj);
            if (hasUserLike) return obj;
            return null;
          }

          function normalizeUser(raw) {
            if (!raw) return null;
            const id = raw.id || raw.userId || (raw.user && raw.user.id) || null;
            const name = raw.name || raw.fullName || (raw.firstName || raw.lastName ? `${raw.firstName || ""} ${raw.lastName || ""}`.trim() : null) || raw.username || raw.email || null;
            let avatar = raw.avatar || raw.image || raw.photo || raw.picture || (raw.profile && raw.profile.image) || null;
            if (!avatar && raw.profileImage && typeof raw.profileImage === "object") {
              avatar = raw.profileImage.url || raw.profileImage.path || null;
            }
            if (typeof avatar === "string" && avatar.startsWith("/")) {
              const external = process.env.NEXT_PUBLIC_EXTERNAL_BASE || "https://endpoint.surgecoffee.ae";
              try { avatar = new URL(avatar, external).toString(); } catch {}
            }
            const beans = raw.beans || raw.beanBalance || raw.whiteMantisBeans || raw.beansTotal || raw.storeBeans || 0;
            const activeStamps = raw.activeStamps || raw.stampCount || raw.active_stamps || raw.stampsCount || 0;
            const totalRewards = raw.totalRewards || raw.rewardsCount || raw.rewards_total || 0;
            return { id, name, avatar, beans: Number(beans) || 0, activeStamps: Number(activeStamps) || 0, totalRewards: Number(totalRewards) || 0 };
          }

          const extracted = extractUser(data);
          if (extracted) {
            const normalized = normalizeUser(extracted);
            try { sessionStorage.setItem("scanned_user", JSON.stringify(normalized)); } catch {}
          } else if (data?.body) {
            const maybe = extractUser(data.body);
            if (maybe) {
              const normalized = normalizeUser(maybe);
              try { sessionStorage.setItem("scanned_user", JSON.stringify(normalized)); } catch {}
            }
          }
        }
      } catch {
        // ignore  ScanedProfile page will retry
      } finally {
        const encoded = encodeURIComponent(code);
        setTimeout(() => {
          router.push(`/ScanedProfile?code=${encoded}`);
        }, 150);
      }
    })();
  }

  return (
    <>
      <div className={styles.main}>
        <div className={styles.MainContainer}>
          <div className={styles.topContainer}>
            <h4>Scan QR code</h4>
            <p>(Position the customer&lsquo;s QR code in the frame)</p>
          </div>
          <div className={styles.topContainerMobile}>
            <Link href="/">
              <div className={styles.topmobiletop}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <mask id="mask0_5855_20565" maskUnits="userSpaceOnUse" x="0" y="0" width="16" height="16">
                    <rect width="16" height="16" transform="matrix(-1 0 0 1 16 0)" fill="#D9D9D9" />
                  </mask>
                  <g mask="url(#mask0_5855_20565)">
                    <path d="M10.6554 14.4342L11.6016 13.488L6.1119 7.99833L11.6016 2.50867L10.6554 1.5625L4.21956 7.99833L10.6554 14.4342Z" fill="#414343" />
                  </g>
                </svg>
                <p>Scan QR code</p>
              </div>
            </Link>
            <div className={styles.topmobilebottom}>
              <p>Position the customer&#39;s QR code in the frame</p>
            </div>
          </div>

          <div className={styles.bottomContainer}>
            {scanning ? (
              <Scanner onScan={handleScan} />
            ) : (
              <div
                onClick={() => setScanning(true)}
                style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
              >
                <svg width="218" height="218" viewBox="0 0 218 218" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <g opacity="0.6">
                    <path
                      d="M27.1797 99.6628H45.3005V117.784H27.1797V99.6628ZM99.6628 45.3005H117.784V81.542H99.6628V45.3005ZM81.542 99.6628H117.784V135.904H99.6628V117.784H81.542V99.6628ZM135.904 99.6628H154.025V117.784H172.146V99.6628H190.267V117.784H172.146V135.904H190.267V172.146H172.146V190.267H154.025V172.146H117.784V190.267H99.6628V154.025H135.904V135.904H154.025V117.784H135.904V99.6628ZM172.146 172.146V135.904H154.025V172.146H172.146ZM135.904 27.1797H190.267V81.542H135.904V27.1797ZM154.025 45.3005V63.4212H172.146V45.3005H154.025ZM27.1797 27.1797H81.542V81.542H27.1797V27.1797ZM45.3005 45.3005V63.4212H63.4212V45.3005H45.3005ZM27.1797 135.904H81.542V190.267H27.1797V135.904ZM45.3005 154.025V172.146H63.4212V154.025H45.3005Z"
                      fill="#818686"
                    />
                  </g>
                </svg>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default ScanQrCode;