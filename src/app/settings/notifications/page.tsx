import { NotificationSettings } from "@/components/notification-settings";

export default function NotificationsPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <h1 className="mb-1 text-xl font-semibold text-white">Notifications</h1>
      <p className="mb-6 text-sm text-neutral-400">Manage push reminders for follow-ups due on your leads.</p>
      <NotificationSettings />
    </div>
  );
}
