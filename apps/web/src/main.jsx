
import { createRoot } from "react-dom/client";
import { TonConnectUIProvider } from "@tonconnect/ui-react";
import React, { lazy, Suspense } from "react";
const App = lazy(() => import("./App.jsx"));
import { initTelegram } from "./lib/telegram.js";
import { authenticate } from "./lib/auth.js";

const MANIFEST_URL =
  (import.meta.env.VITE_APP_URL
    ? `${import.meta.env.VITE_APP_URL}/tonconnect-manifest.json`
    : `${window.location.origin}/tonconnect-manifest.json`);

function showBootError(error) {
  const root = document.getElementById("root");
  if (!root) return;
  const message = error instanceof Error ? error.message : String(error);
  root.innerHTML = `<div style="min-height:100vh;background:#080b0f;color:#fff;padding:32px 20px;font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center"><div style="max-width:520px;width:100%;background:#111820;border:1px solid #263342;border-radius:18px;padding:24px;box-sizing:border-box"><div style="font-size:28px;font-weight:800;margin-bottom:10px">EarnX</div><div style="font-size:18px;font-weight:700;margin-bottom:8px">App startup error</div><div style="color:#aeb9c6;font-size:14px;line-height:1.5;word-break:break-word">${message.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}</div><button onclick="location.reload()" style="margin-top:18px;width:100%;padding:12px;border:0;border-radius:12px;background:#fff;color:#080b0f;font-weight:700">Reload</button></div></div>`;
}

window.addEventListener("error", (event) => {
  console.error("[EarnX] runtime error:", event.error || event.message);
  if (!document.getElementById("root")?.firstElementChild) showBootError(event.error || event.message);
});

window.addEventListener("unhandledrejection", (event) => {
  console.error("[EarnX] unhandled rejection:", event.reason);
  if (!document.getElementById("root")?.firstElementChild) showBootError(event.reason);
});

function boot() {
  try { initTelegram(); } catch (error) { console.warn("[EarnX] Telegram init failed:", error); }
  authenticate().catch((err) => console.warn("[EarnX] auth failed (will retry from app):", err));

  try {
    createRoot(document.getElementById("root")).render(
      <React.StrictMode>
        <TonConnectUIProvider manifestUrl={MANIFEST_URL}>
          <Suspense fallback={<div style={{minHeight:"100vh",background:"#080b0f",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"system-ui,sans-serif"}}>Loading EarnX…</div>}><App /></Suspense>
        </TonConnectUIProvider>
      </React.StrictMode>
    );
  } catch (error) {
    console.error("[EarnX] render failed:", error);
    showBootError(error);
  }
}

boot();
