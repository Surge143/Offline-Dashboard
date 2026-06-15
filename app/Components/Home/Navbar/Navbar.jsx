"use client";

import React from "react";
import styles from "./Navbar.module.css";
import logo from "./logo.png";
import Image from "next/image";
import { useRouter } from "next/navigation";

const Navbar = () => {
  const router = useRouter();

  async function handleSignOut() {
    try {
      const res = await fetch("/api/logout", { method: "POST", credentials: "include" });
      const data = await res.json();
      console.log("[navbar] logout response", data);
    } catch (err) {
      console.error("[navbar] logout error", err);
    }
    try {
      localStorage.removeItem("offline_user");
      localStorage.removeItem("offline_token");
    } catch {
      // ignore
    }
    console.log("[navbar] signed out - cleared local user and requested server logout");

    router.replace("/login");

    setTimeout(() => {
      window.location.reload();
    }, 200);
  }

  return (
    <>
      <div className={styles.main}>
        <div className={styles.NavbarContainer}>
          <div className={styles.LeftContainer}>
            <Image src={logo} alt="logo" className={styles.logo} />
            <h4>Manager Dashboard</h4>
          </div>
          <div className={styles.RightContainer}>
            <p onClick={handleSignOut} style={{ cursor: "pointer" }}>
              Sign out
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default Navbar;
