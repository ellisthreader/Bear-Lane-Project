import React from "react";
import { Head, Link } from "@inertiajs/react";
import { ArrowLeft, BellRing, Mail, Save } from "lucide-react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import AdminTopNav from "@/Components/Admin/AdminTopNav";

type NotificationEventSettings = {
  in_app: boolean;
  email: boolean;
};

type NotificationSettings = {
  events: Record<string, NotificationEventSettings>;
};

type NotificationCatalogItem = {
  key: string;
  title: string;
  description: string;
};

type NotificationCatalogSection = {
  id: string;
  title: string;
  description: string;
  items: NotificationCatalogItem[];
};

type Props = {
  notificationSettings: NotificationSettings;
  notificationCatalog: NotificationCatalogSection[];
};

const getCsrfToken = () => document.querySelector('meta[name="csrf-token"]')?.getAttribute("content") || "";

const normalize = (
  catalog: NotificationCatalogSection[],
  settings: NotificationSettings
): NotificationSettings => {
  const next: NotificationSettings = { events: {} };

  catalog.forEach((section) => {
    section.items.forEach((item) => {
      const current = settings?.events?.[item.key];
      next.events[item.key] = {
        in_app: Boolean(current?.in_app ?? true),
        email: Boolean(current?.email ?? true),
      };
    });
  });

  return next;
};

export default function NotificationsPage({ notificationSettings, notificationCatalog }: Props) {
  const [form, setForm] = React.useState<NotificationSettings>(() => normalize(notificationCatalog, notificationSettings));
  const [saving, setSaving] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setForm(normalize(notificationCatalog, notificationSettings));
  }, [notificationCatalog, notificationSettings]);

  const setToggle = (key: string, channel: "in_app" | "email", value: boolean) => {
    setForm((prev) => ({
      ...prev,
      events: {
        ...prev.events,
        [key]: {
          ...(prev.events[key] || { in_app: true, email: true }),
          [channel]: value,
        },
      },
    }));
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/admin/other/notifications", {
        method: "PUT",
        credentials: "same-origin",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-CSRF-TOKEN": getCsrfToken(),
          "X-Requested-With": "XMLHttpRequest",
        },
        body: JSON.stringify(form),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.message || "Unable to save notification settings.");
      }

      if (payload.notification_settings) {
        setForm(normalize(notificationCatalog, payload.notification_settings as NotificationSettings));
      }

      setMessage(payload.message || "Admin notification settings saved.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to save notification settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AuthenticatedLayout>
      <Head title="Admin Notifications" />
      <AdminTopNav />

      <div className="min-h-screen bg-[#FAF8F2] px-4 py-8 text-[#2D2515] sm:px-8">
        <div className="mx-auto w-full max-w-6xl space-y-5">
          <div className="rounded-3xl border border-[#E5D4AF] bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8A6D2B]">OTHER / NOTIFICATIONS</p>
                <h1 className="mt-1 text-2xl font-bold">Admin Notification Controls</h1>
                <p className="mt-1 text-sm text-[#6B5A34]">
                  Decide which events appear as on-site admin notifications and which send emails to every admin account.
                </p>
              </div>
              <Link
                href="/admin/other"
                className="inline-flex items-center gap-2 rounded-xl border border-[#D6BB80] bg-white px-4 py-2 text-sm font-semibold text-[#7D6228] hover:border-[#C29A4F]"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Link>
            </div>
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            <div className="rounded-2xl border border-[#E4D2AA] bg-white p-4 shadow-sm">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_170px_170px]">
                <div className="text-xs font-semibold uppercase tracking-[0.1em] text-[#8A6D2B]">Event</div>
                <div className="inline-flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-[0.1em] text-[#8A6D2B]">
                  <BellRing className="h-4 w-4" />
                  On-Site
                </div>
                <div className="inline-flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-[0.1em] text-[#8A6D2B]">
                  <Mail className="h-4 w-4" />
                  Email
                </div>
              </div>
            </div>

            {notificationCatalog.map((section) => (
              <section key={section.id} className="rounded-2xl border border-[#E4D2AA] bg-white p-5 shadow-sm">
                <h2 className="text-lg font-semibold text-[#2D2515]">{section.title}</h2>
                <p className="mt-1 text-sm text-[#6B5A34]">{section.description}</p>

                <div className="mt-4 divide-y divide-[#EFE3C7] rounded-xl border border-[#E9DBBD] bg-[#FFFEFB]">
                  {section.items.map((item) => {
                    const eventSettings = form.events[item.key] || { in_app: true, email: true };

                    return (
                      <div key={item.key} className="grid grid-cols-1 items-center gap-3 px-4 py-4 md:grid-cols-[1fr_170px_170px]">
                        <div>
                          <p className="text-sm font-semibold text-[#3B2F19]">{item.title}</p>
                          <p className="mt-1 text-xs text-[#7A6841]">{item.description}</p>
                        </div>

                        <label className="inline-flex items-center justify-center gap-2 text-sm font-semibold text-[#6B5A34]">
                          <input
                            type="checkbox"
                            checked={eventSettings.in_app}
                            onChange={(event) => setToggle(item.key, "in_app", event.target.checked)}
                            className="h-4 w-4 rounded border-[#CFAF67]"
                          />
                          Enabled
                        </label>

                        <label className="inline-flex items-center justify-center gap-2 text-sm font-semibold text-[#6B5A34]">
                          <input
                            type="checkbox"
                            checked={eventSettings.email}
                            onChange={(event) => setToggle(item.key, "email", event.target.checked)}
                            className="h-4 w-4 rounded border-[#CFAF67]"
                          />
                          Enabled
                        </label>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}

            <div className="rounded-2xl border border-[#E4D2AA] bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-[#6B5A34]">
                  Email alerts go to all users with <code className="rounded bg-[#FFF3D6] px-1.5 py-0.5 text-[#6A541F]">is_admin = true</code>. On-site alerts control admin dashboard indicators and feed visibility.
                </p>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#C6A75E] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#B8994E] disabled:opacity-70"
                >
                  <Save className="h-4 w-4" />
                  {saving ? "Saving..." : "Save Notification Settings"}
                </button>
              </div>

              {message ? <p className="mt-3 text-sm text-emerald-700">{message}</p> : null}
              {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
            </div>
          </form>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
