"use client";

import Image from "next/image";
import styles from "./login.module.css";
import logo from "./logo.png";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      console.log("[login] submitting", { email });
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
  
        credentials: "include",
      });
      const data = await res.json();
      console.log("[login] server response", data);


      setError("");

      if (res.ok && data?.success) {
     
        if (data.user) localStorage.setItem("offline_user", JSON.stringify(data.user));
        console.log("[login] login successful; cookie should be set by server");

        router.push("/");
      } else if (res.status === 401) {
        setError(data?.message || "Invalid credentials or password");
      } else {
        setError(data?.message || "Login failed. Please try again.");
      }
    } catch (err) {
      console.error(err);
      setError("Login error. Check console or try again later.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className={styles.main}>
        <div className={styles.MainContainer}>
          <div className={styles.LeftContainer}>
           
          </div>
          <div className={styles.RightContainer}>
            <div className={styles.logoandtitle}>
              <Image src={logo} alt="logo" />
              <h1>Store Manager Portal</h1>
            </div>
            <form onSubmit={handleSubmit} style={{ width: "100%" }}>
              <div className={styles.MangerIdContainer}>
                <p>Email ID</p>
                <input
                  type="text"
                  placeholder="Enter your ID"
                  value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(""); }}
                  required
                />
              </div>
              <div className={styles.PasswordContainer}>
                <p>Password</p>
                <input
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(""); }}
                  required
                />
              </div>
              <button className={styles.signincta} disabled={loading}>
                {loading ? "Signing in..." : "Sign In"}
              </button>
              {error ? (
                <div className={styles.errorMessage} role="alert">
                  {error}
                </div>
              ) : null}
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
