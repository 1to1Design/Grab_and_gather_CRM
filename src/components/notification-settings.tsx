"use client";

import { useEffect, useState } from "react";
import { urlBase64ToUint8Array } from "@/lib/push-client";

type Status = "checking" | "unsupported" | "not-configured" | "denied" | "subscribed" | "unsubscribed";

export function NotificationSettings() {
  const [status, setStatus] = useState<Status>("checking");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function check() {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        setStatus("unsupported");
        return;
      }
      if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
        setStatus("not-configured");
        return;
      }
      if (Notification.permission === "denied") {
        setStatus("denied");
        return;
      }
      const registration = await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();
      setStatus(existing ? "subscribed" : "unsubscribed");
    }
    check().catch(() => setStatus("unsupported"));
  }, []);

  async function handleEnable() {
    setBusy(true);
    setError(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus("denied");
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!) as BufferSource,
      });

      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      });
      if (!res.ok) throw new Error("Server rejected the subscription.");

      setStatus("subscribed");
    } catch {
      setError("Couldn't enable notifications. Try again, or check your browser's notification permissions.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDisable() {
    setBusy(true);
    setError(null);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        await subscription.unsubscribe();
      }
      setStatus("unsubscribed");
    } catch {
      setError("Couldn't disable notifications. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-6">
      <h2 className="mb-1 text-sm font-medium text-white">Follow-up reminders on this device</h2>
      <p className="mb-4 text-sm text-neutral-400">
        Get a push notification once a day if you have leads due for follow-up. This is per device — enable it
        on your phone separately from your laptop.
      </p>

      {status === "checking" && <p className="text-sm text-neutral-500">Checking…</p>}
      {status === "unsupported" && (
        <p className="text-sm text-neutral-500">This browser doesn&apos;t support push notifications.</p>
      )}
      {status === "not-configured" && (
        <p className="text-sm text-neutral-500">Reminders aren&apos;t set up on the server yet.</p>
      )}
      {status === "denied" && (
        <p className="text-sm text-amber-400">
          Notifications are blocked for this site in your browser settings. Allow them there, then reload this
          page.
        </p>
      )}
      {status === "subscribed" && (
        <button
          type="button"
          onClick={handleDisable}
          disabled={busy}
          className="rounded-lg border border-neutral-700 px-4 py-2 text-sm text-neutral-200 hover:bg-neutral-800 disabled:opacity-50"
        >
          {busy ? "Working…" : "Disable on this device"}
        </button>
      )}
      {status === "unsubscribed" && (
        <button
          type="button"
          onClick={handleEnable}
          disabled={busy}
          className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-neutral-950 hover:bg-amber-400 disabled:opacity-50"
        >
          {busy ? "Working…" : "Enable on this device"}
        </button>
      )}

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
    </div>
  );
}
