"use client";

import { useEffect, useState } from "react";

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

type State = "unsupported" | "default" | "granted" | "denied" | "working";

/** Lets an account-less renter turn on push reminders from their magic link. */
export function RenterPushToggle({ token }: { token: string }) {
  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const [state, setState] = useState<State>("default");

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !("serviceWorker" in navigator) ||
      !("PushManager" in window)
    ) {
      setState("unsupported");
      return;
    }
    setState(Notification.permission as State);
  }, []);

  if (state === "unsupported" || !vapidKey) return null;

  async function enable() {
    setState("working");
    try {
      const reg = await navigator.serviceWorker.register("/sw.js");
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission as State);
        return;
      }
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey!),
      });
      const json = sub.toJSON();
      await fetch("/api/push/renter-subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, endpoint: sub.endpoint, keys: json.keys }),
      });
      setState("granted");
    } catch {
      setState("default");
    }
  }

  if (state === "granted") {
    return (
      <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
        🔔 Naka-on na ang reminders sa phone na ito.
      </p>
    );
  }
  if (state === "denied") {
    return (
      <p className="text-sm text-slate-400">
        Naka-block ang notifications sa browser settings mo.
      </p>
    );
  }

  return (
    <button
      type="button"
      onClick={enable}
      disabled={state === "working"}
      className="w-full rounded-xl border border-emerald-300 bg-white px-4 py-3 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-60"
    >
      {state === "working" ? "Enabling…" : "🔔 Turn on reminders sa phone ko"}
    </button>
  );
}
