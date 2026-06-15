"use client";
import React, { useEffect, useState } from "react";
import styles from "./Profiledetails.module.css";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

const Profiledetails = () => {
  const searchParams = useSearchParams();
  const code = searchParams ? searchParams.get("code") : null;
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    if (!code) return;
    let mounted = true;

    const _t = setTimeout(() => mounted && setLoading(true), 0);
    fetch(`/api/scan?code=${encodeURIComponent(code)}`, {
      credentials: "include",
    })
      .then((r) => r.json())
      .then((data) => {
        if (!mounted) return;

        function extractUser(obj) {
          if (!obj) return null;
          if (obj.user && typeof obj.user === "object") return obj.user;
          if (obj.data && typeof obj.data === "object") {
            if (obj.data.user && typeof obj.data.user === "object")
              return obj.data.user;
            return obj.data;
          }

          const hasUserLike = [
            "name",
            "username",
            "email",
            "avatar",
            "image",
            "photo",
            "profile",
            "firstName",
            "lastName",
            "profileImage",
          ].some((k) => k in obj);
          if (hasUserLike) return obj;
          return null;
        }

        function normalizeUser(raw) {
          if (!raw) return null;
          const id = raw.id || raw.userId || (raw.user && raw.user.id) || null;
          const name =
            raw.name ||
            raw.fullName ||
            (raw.firstName || raw.lastName
              ? `${raw.firstName || ""} ${raw.lastName || ""}`.trim()
              : null) ||
            raw.username ||
            raw.email ||
            null;

          let avatar =
            raw.avatar ||
            raw.image ||
            raw.photo ||
            raw.picture ||
            (raw.profile && raw.profile.image) ||
            null;
          if (
            !avatar &&
            raw.profileImage &&
            typeof raw.profileImage === "object"
          ) {
            avatar = raw.profileImage.url || raw.profileImage.path || null;
          }

          if (typeof avatar === "string" && avatar.startsWith("/")) {
            const external =
              process.env.NEXT_PUBLIC_EXTERNAL_BASE ||
              "https://endpoint.surgecoffee.ae";
            try {
              avatar = new URL(avatar, external).toString();
            } catch {
              // leave as-is
            }
          }
          const beans =
            raw.beans ||
            raw.beanBalance ||
            raw.whiteMantisBeans ||
            raw.beansTotal ||
            raw.storeBeans ||
            0;
          const activeStamps =
            raw.activeStamps ||
            raw.stampCount ||
            raw.active_stamps ||
            raw.stampsCount ||
            0;
          const totalRewards =
            raw.totalRewards || raw.rewardsCount || raw.rewards_total || 0;
          return {
            id,
            name,
            avatar,
            beans: Number(beans) || 0,
            activeStamps: Number(activeStamps) || 0,
            totalRewards: Number(totalRewards) || 0,
          };
        }

        const extracted = extractUser(data);
        if (extracted) {
          const normalized = normalizeUser(extracted);
          setUser(normalized);
          if (typeof window !== "undefined" && normalized) {
            try {
              sessionStorage.setItem(
                "scanned_user",
                JSON.stringify(normalized),
              );
            } catch {
              // ignore storage errors
            }
          }
        } else if (data?.body) {
          const maybe = extractUser(data.body);
          if (maybe) {
            const normalized = normalizeUser(maybe);
            setUser(normalized);
            if (typeof window !== "undefined" && normalized) {
              try {
                sessionStorage.setItem(
                  "scanned_user",
                  JSON.stringify(normalized),
                );
              } catch {
                // ignore
              }
            }
          } else if (
            data.body &&
            (data.body.totalBeans !== undefined ||
              data.body.totalStamps !== undefined ||
              data.body.stampReward !== undefined)
          ) {
            const src = data.body;
            const normalized = {
              name: null,
              avatar: null,
              beans: Number(src.totalBeans) || 0,
              activeStamps: Number(src.totalStamps) || 0,
              totalRewards: Number(src.stampReward || 0) || 0,
            };
            setUser(normalized);
            try {
              sessionStorage.setItem(
                "scanned_user",
                JSON.stringify(normalized),
              );
            } catch {}
          }
        } else if (
          data &&
          (data.totalBeans !== undefined ||
            data.totalStamps !== undefined ||
            data.stampReward !== undefined)
        ) {
          const src = data;
          const normalized = {
            name: null,
            avatar: null,
            beans: Number(src.totalBeans) || 0,
            activeStamps: Number(src.totalStamps) || 0,
            totalRewards: Number(src.stampReward || 0) || 0,
          };
          setUser(normalized);
          try {
            sessionStorage.setItem("scanned_user", JSON.stringify(normalized));
          } catch {}
        }
        if (!extracted && !data?.body) {
        }
      })
      .catch((e) => {
        console.error(e);
        if (!mounted) return;
      })
      .finally(() => mounted && setLoading(false));

    return () => {
      mounted = false;
      clearTimeout(_t);
    };
  }, [code]);
  const imgSrc = user
    ? user.avatar ||
      user.image ||
      user.photo ||
      user.picture ||
      (user.profile && user.profile.image)
    : null;
  const userName = user
    ? user.name || user.fullName || user.username || user.email
    : null;
  return (
    <>
      <div className={styles.main}>
        <div className={styles.MainContainer}>
          <div className={styles.top}>
            <Link href="/scanqr">
              <div className={styles.topLeft}>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <mask
                    id="mask0_5855_20476"
                    maskUnits="userSpaceOnUse"
                    x="0"
                    y="0"
                    width="16"
                    height="16"
                  >
                    <rect
                      width="16"
                      height="16"
                      transform="matrix(-1 0 0 1 16 0)"
                      fill="#D9D9D9"
                    />
                  </mask>
                  <g mask="url(#mask0_5855_20476)">
                    <path
                      d="M10.6554 14.4342L11.6016 13.488L6.1119 7.99833L11.6016 2.50867L10.6554 1.5625L4.21956 7.99833L10.6554 14.4342Z"
                      fill="#6E736A"
                    />
                  </g>
                </svg>
                <p>Select order type</p>
              </div>
            </Link>
          </div>
          <div className={styles.line}></div>
          <div className={styles.bottom}>
            <div className={styles.bottomLeft}>
              {imgSrc && !imgError ? (
                <img
                  src={imgSrc}
                  alt={user.name || user.username || "profile"}
                  width={57}
                  height={57}
                  style={{
                    width: 57,
                    height: 57,
                    borderRadius: "50%",
                    objectFit: "cover",
                  }}
                  onError={() => setImgError(true)}
                />
              ) : (
                <svg
                  width="57"
                  height="57"
                  viewBox="0 0 57 57"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <circle
                    cx="28.4785"
                    cy="28.4785"
                    r="28.4785"
                    fill="#2F362A"
                    fillOpacity="0.1"
                  />
                  <path
                    d="M28.4799 15.1875C30.2426 15.1875 31.9331 15.8877 33.1795 17.1341C34.4259 18.3805 35.1261 20.071 35.1261 21.8337C35.1261 23.5964 34.4259 25.2869 33.1795 26.5333C31.9331 27.7797 30.2426 28.4799 28.4799 28.4799C26.7172 28.4799 25.0267 27.7797 23.7803 26.5333C22.5339 25.2869 21.8337 23.5964 21.8337 21.8337C21.8337 20.071 22.5339 18.3805 23.7803 17.1341C25.0267 15.8877 26.7172 15.1875 28.4799 15.1875ZM28.4799 18.5106C27.5986 18.5106 26.7533 18.8607 26.1301 19.4839C25.5069 20.1071 25.1568 20.9524 25.1568 21.8337C25.1568 22.7151 25.5069 23.5603 26.1301 24.1835C26.7533 24.8067 27.5986 25.1568 28.4799 25.1568C29.3613 25.1568 30.2065 24.8067 30.8297 24.1835C31.4529 23.5603 31.803 22.7151 31.803 21.8337C31.803 20.9524 31.4529 20.1071 30.8297 19.4839C30.2065 18.8607 29.3613 18.5106 28.4799 18.5106ZM28.4799 30.1415C32.9163 30.1415 41.7723 32.3513 41.7723 36.7877V41.7723H15.1875V36.7877C15.1875 32.3513 24.0436 30.1415 28.4799 30.1415ZM28.4799 33.2984C23.5451 33.2984 18.3444 35.7243 18.3444 36.7877V38.6154H38.6154V36.7877C38.6154 35.7243 33.4147 33.2984 28.4799 33.2984Z"
                    fill="white"
                    fillOpacity="0.9"
                  />
                  <path
                    d="M28.4799 33.2984C23.5451 33.2984 18.3444 35.7243 18.3444 36.7877V38.6154H38.6154V36.7877C38.6154 35.7243 33.4147 33.2984 28.4799 33.2984Z"
                    fill="white"
                    fillOpacity="0.9"
                  />
                  <path
                    d="M28.4799 18.5106C27.5986 18.5106 26.7533 18.8607 26.1301 19.4839C25.5069 20.1071 25.1568 20.9524 25.1568 21.8337C25.1568 22.7151 25.5069 23.5603 26.1301 24.1835C26.7533 24.8067 27.5986 25.1568 28.4799 25.1568C29.3613 25.1568 30.2065 24.8067 30.8297 24.1835C31.4529 23.5603 31.803 22.7151 31.803 21.8337C31.803 20.9524 31.4529 20.1071 30.8297 19.4839C30.2065 18.8607 29.3613 18.5106 28.4799 18.5106Z"
                    fill="white"
                    fillOpacity="0.9"
                  />
                </svg>
              )}
              <p>{loading ? "Loading..." : userName ? userName : null}</p>
            </div>
            <Link href="/scanqr">
              <div className={styles.bottomRight}>
                <p>Scan new QR</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
};

export default Profiledetails;
