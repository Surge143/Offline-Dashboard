"use client";
import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";

export default function Scanner({ onScan, className }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const manualInputRef = useRef(null);
  const streamRef = useRef(null);
  const intervalRef = useRef(null);
  const scannedRef = useRef(false);
  const [error, setError] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const [manualCode, setManualCode] = useState("");

  function stop() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (videoRef.current) {
      try { videoRef.current.pause(); } catch {}
      try { videoRef.current.srcObject = null; } catch {}
    }
    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach((track) => {
          track.enabled = false;
          track.stop();
        });
      } catch {}
      streamRef.current = null;
    }
  }

  useEffect(() => {
    scannedRef.current = false;

    async function start() {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError("Camera not supported. Use Chrome/Edge or enter the code manually below.");
        return;
      }

      try {
        let stream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } } });
        } catch {
          stream = await navigator.mediaDevices.getUserMedia({ video: true });
        }

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        let detector = null;
        if ("BarcodeDetector" in window) {
          try {
            detector = new window.BarcodeDetector({ formats: ["qr_code", "code_128", "ean_13", "code_39"] });
          } catch {
            detector = null;
          }
        }

        let canvas = canvasRef.current;
        if (!canvas) {
          canvas = document.createElement("canvas");
          canvasRef.current = canvas;
        }
        const ctx = canvas.getContext("2d", { willReadFrequently: true });

        intervalRef.current = setInterval(async () => {
          if (scannedRef.current) return;
          if (!videoRef.current || videoRef.current.readyState < 2) return;

          const vw = videoRef.current.videoWidth;
          const vh = videoRef.current.videoHeight;
          const scale = Math.min(1, 800 / Math.max(vw, vh, 1));
          canvas.width = Math.floor(vw * scale) || 320;
          canvas.height = Math.floor(vh * scale) || 240;
          ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

          try {
            if (detector) {
              const barcodes = await detector.detect(videoRef.current);
              if (barcodes && barcodes.length && barcodes[0].rawValue) {
                const code = barcodes[0].rawValue;
                if (!scannedRef.current) {
                  scannedRef.current = true;
                  stop();
                  onScan(code);
                }
                return;
              }
            }

            let imageData;
            try {
              imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            } catch {
              return;
            }
            const result = jsQR(imageData.data, imageData.width, imageData.height);
            if (result && result.data && !scannedRef.current) {
              scannedRef.current = true;
              stop();
              onScan(result.data);
            }
          } catch (frameErr) {
            if (frameErr?.name === 'SecurityError') {
              setError('Camera blocked — page must be served over HTTPS or localhost.');
            }
          }
        }, 250);

    } catch (err) {
  if (err?.name === "AbortError") {
    return;
  }
  if (err?.name === "NotAllowedError" || err?.name === "PermissionDeniedError") {
    setError("Camera permission denied. Allow camera access in your browser settings and click Retry.");
  } else if (err?.name === "NotFoundError" || err?.name === "DevicesNotFoundError") {
    setError("No camera found on this device.");
  } else if (err?.name === "NotReadableError") {
    setError("Camera is in use by another app. Close it and try again.");
  } else if (err?.name === "SecurityError") {
    setError("Camera blocked — page must be served over HTTPS or localhost.");
  } else if (err?.name === "NotSupportedError") {
    setError("Camera not supported on this browser.");
  } else {
    // Camera is actually working 
    return;
  }
}
    }

    start();
    return () => {
      scannedRef.current = true;
      stop();
    };
  }, [retryCount]);

  useEffect(() => {
    if (error && manualInputRef.current) {
      try { manualInputRef.current.focus(); } catch {}
    }
  }, [error]);

  function handleManualSubmit() {
    const v = manualCode && manualCode.trim();
    if (v && !scannedRef.current) {
      scannedRef.current = true;
      stop();
      onScan(v);
    }
  }

  return (
    <div style={{ width: "100%", height: "100%", position: "relative", overflow: "hidden" }} className={className}>
      
      <video ref={videoRef} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      <canvas ref={canvasRef} style={{ display: "none" }} />

      <div style={{
        position: "absolute", inset: 0,
        background: "rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "none",
      }}>
        <div style={{
          position: "relative",
          width: "62%",
          aspectRatio: "1 / 1",
          background: "transparent",
        }}>
          <span style={{ position:"absolute", top:0, left:0, width:28, height:28, borderTop:"3px solid #fff", borderLeft:"3px solid #fff", borderRadius:"3px 0 0 0" }} />
          <span style={{ position:"absolute", top:0, right:0, width:28, height:28, borderTop:"3px solid #fff", borderRight:"3px solid #fff", borderRadius:"0 3px 0 0" }} />
          <span style={{ position:"absolute", bottom:0, left:0, width:28, height:28, borderBottom:"3px solid #fff", borderLeft:"3px solid #fff", borderRadius:"0 0 0 3px" }} />
          <span style={{ position:"absolute", bottom:0, right:0, width:28, height:28, borderBottom:"3px solid #fff", borderRight:"3px solid #fff", borderRadius:"0 0 3px 0" }} />
          
          {!error && (
            <div style={{
              position: "absolute",
              left: "4%",
              width: "92%",
              height: 2,
              background: "linear-gradient(90deg, transparent, #6C7A5F, #a8c090, #6C7A5F, transparent)",
              boxShadow: "0 0 8px 2px rgba(108,122,95,0.7)",
              borderRadius: 2,
              animation: "scanLine 1.8s ease-in-out infinite",
            }} />
          )}
        </div>
      </div>

      <style>{`
        @keyframes scanLine {
          0%   { top: 6%; }
          50%  { top: 88%; }
          100% { top: 6%; }
        }
      `}</style>
      
      {!error && (
        <p style={{
          position: "absolute",
          bottom: "12%",
          width: "100%",
          textAlign: "center",
          color: "rgba(255,255,255,0.85)",
          fontSize: 13,
          margin: 0,
          letterSpacing: "0.02em",
          pointerEvents: "none",
        }}>
          Align the QR code inside the frame
        </p>
      )}

      {error && (
        <div style={{
          position: "absolute", left: 16, right: 16, top: 70,
          padding: 14,
          background: "rgba(255,255,255,0.97)",
          border: "1px solid #ddd",
          borderRadius: 8,
          color: "#e74c3c",
        }}>
          <div style={{ marginBottom: 10 }}>{error}</div>
          <button
            onClick={() => {
              setError("");
              scannedRef.current = false;
              setRetryCount((c) => c + 1);
            }}
            style={{ marginRight: 8, padding: "6px 14px", cursor: "pointer" }}
          >
            Retry camera
          </button>
          <span style={{ color: "#666", fontSize: 13 }}>or enter code manually:</span>
          <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
            <input
              ref={manualInputRef}
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="Paste or type the scanned code"
              style={{ flex: 1, padding: "6px 10px", borderRadius: 4, border: "1px solid #ccc" }}
              onKeyDown={(e) => { if (e.key === "Enter") handleManualSubmit(); }}
            />
            <button
              onClick={handleManualSubmit}
              style={{ padding: "6px 14px", cursor: "pointer" }}
            >
              Submit
            </button>
          </div>
        </div>
      )}
    </div>
  );
}