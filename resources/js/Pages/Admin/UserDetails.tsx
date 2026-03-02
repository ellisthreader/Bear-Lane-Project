import React, { useEffect, useState } from "react";
import { Link, router } from "@inertiajs/react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import AdminTopNav from "@/Components/Admin/AdminTopNav";

type UserSummary = {
  id: number;
  name: string;
  username: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  is_admin: boolean;
  is_oauth: boolean;
  oauth_provider: string | null;
  country_code?: string | null;
  country?: string | null;
  created_at: string | null;
};

type UserAddress = {
  id: number;
  label?: string | null;
  first_name: string;
  last_name: string;
  phone?: string | null;
  country: string;
  address_line1: string;
  address_line2?: string | null;
  city: string;
  county?: string | null;
  postcode: string;
  is_default: boolean;
};

type UserPaymentMethod = {
  id: number;
  provider_type: string;
  brand?: string | null;
  last4?: string | null;
  exp_month?: number | null;
  exp_year?: number | null;
  cardholder_name?: string | null;
  is_default: boolean;
  is_active: boolean;
};

type UserDetailsPageProps = {
  user: UserSummary;
  addresses: UserAddress[];
  payment_methods: UserPaymentMethod[];
  saved_designs: SavedDesign[];
  orders: UserOrder[];
  wishlist_items: WishlistItem[];
  raw_attributes: Record<string, string | number | boolean | null>;
};

type SavedDesign = {
  id: number;
  name: string;
  product_id: number | null;
  product_name?: string | null;
  product_slug?: string | null;
  product_image?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type UserOrderItem = {
  id: number;
  product_id: number | null;
  product_name?: string | null;
  size?: string | null;
  colour?: string | null;
  image_url?: string | null;
  quantity?: number | null;
  unit_price?: number | string | null;
  line_total?: number | string | null;
};

type UserOrder = {
  id: number;
  order_number?: string | null;
  status?: string | null;
  total?: number | string | null;
  subtotal?: number | string | null;
  shipping?: number | string | null;
  vat?: number | string | null;
  discount_amount?: number | string | null;
  payment_intent_id?: string | null;
  created_at?: string | null;
  items: UserOrderItem[];
};

type WishlistItem = {
  id: number;
  item_key?: string | null;
  product_id?: number | null;
  product_slug?: string | null;
  name?: string | null;
  brand?: string | null;
  price?: number | string | null;
  image?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

const pretty = (value: unknown) => {
  if (value === null || value === undefined || value === "") return "N/A";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
};

const formatDate = (value?: string | null) => {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const formatPrice = (value: string | number | null | undefined) => {
  if (value === null || value === undefined || value === "") return "N/A";
  const amount = Number(value);
  if (Number.isNaN(amount)) return String(value);
  return `£${amount.toFixed(2)}`;
};

export default function UserDetailsPage({
  user,
  addresses = [],
  payment_methods = [],
  saved_designs = [],
  orders = [],
  wishlist_items = [],
  raw_attributes,
}: UserDetailsPageProps) {
  const signUpMethod = user.is_oauth
    ? `OAuth (${user.oauth_provider || "provider unknown"})`
    : "Email and password";

  const attributeEntries = Object.entries(raw_attributes || {}).sort(([a], [b]) => a.localeCompare(b));
  const shownFieldKeys = new Set([
    "id",
    "name",
    "username",
    "email",
    "phone",
    "avatar_url",
    "is_admin",
    "is_oauth",
    "oauth_provider",
    "created_at",
    "updated_at",
  ]);
  const otherAttributeEntries = attributeEntries.filter(([key]) => !shownFieldKeys.has(key));

  const countryCode = (user.country_code || "").toUpperCase();
  const countryFlag = countryCode && countryCode.length === 2
    ? String.fromCodePoint(...countryCode.split("").map((char) => 127397 + char.charCodeAt(0)))
    : null;
  const [profileForm, setProfileForm] = useState({
    username: user.username || "",
    name: user.name || "",
    phone: user.phone || "",
    email: user.email || "",
  });
  const [addressesForm, setAddressesForm] = useState(
    addresses.map((address) => ({
      ...address,
      label: address.label || "",
      phone: address.phone || "",
      address_line2: address.address_line2 || "",
      county: address.county || "",
    })),
  );
  const [newAddressForm, setNewAddressForm] = useState({
    label: "",
    first_name: "",
    last_name: "",
    phone: "",
    country: "",
    address_line1: "",
    address_line2: "",
    city: "",
    county: "",
    postcode: "",
    is_default: false,
  });
  const [newPaymentForm, setNewPaymentForm] = useState({
    provider_type: "card",
    brand: "",
    last4: "",
    exp_month: "",
    exp_year: "",
    cardholder_name: "",
    is_default: false,
  });
  const [actionMessage, setActionMessage] = useState("");
  const [actionTone, setActionTone] = useState<"success" | "error">("success");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedAvatarFile, setSelectedAvatarFile] = useState<File | null>(null);
  const [editingAddressId, setEditingAddressId] = useState<number | null>(null);
  const [showOther, setShowOther] = useState(false);
  const [adminAction, setAdminAction] = useState<null | "warning" | "email" | "message">(null);
  const [adminActionSubject, setAdminActionSubject] = useState("");
  const [adminActionMessage, setAdminActionMessage] = useState("");
  const [showAddAddressForm, setShowAddAddressForm] = useState(false);
  const [showAddPaymentForm, setShowAddPaymentForm] = useState(false);

  useEffect(() => {
    setProfileForm({
      username: user.username || "",
      name: user.name || "",
      phone: user.phone || "",
      email: user.email || "",
    });
  }, [user.username, user.name, user.phone, user.email]);

  useEffect(() => {
    setAddressesForm(
      addresses.map((address) => ({
        ...address,
        label: address.label || "",
        phone: address.phone || "",
        address_line2: address.address_line2 || "",
        county: address.county || "",
      })),
    );
  }, [addresses]);

  const getCsrfToken = () =>
    (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement | null)?.content || "";

  const adminRequest = async (url: string, method: "PATCH" | "POST" | "DELETE", body?: unknown) => {
    const response = await fetch(url, {
      method,
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-TOKEN": getCsrfToken(),
        Accept: "application/json",
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (!response.ok) {
      let message = "Request failed.";
      try {
        const payload = await response.json();
        message = payload?.message || payload?.errors?.[Object.keys(payload?.errors || {})[0]]?.[0] || message;
      } catch {
        // ignore parse errors
      }
      throw new Error(message);
    }
  };

  const refreshPage = () => {
    router.reload({
      only: [
        "user",
        "addresses",
        "payment_methods",
        "saved_designs",
        "orders",
        "wishlist_items",
        "raw_attributes",
      ],
      preserveState: false,
    });
  };

  const notifySuccess = (message: string) => {
    setActionTone("success");
    setActionMessage(message);
  };

  const notifyError = (message: string) => {
    setActionTone("error");
    setActionMessage(message);
  };

  const saveProfile = async () => {
    setIsSubmitting(true);
    setActionMessage("");
    try {
      await adminRequest(`/admin/users/${user.id}/profile`, "PATCH", profileForm);
      notifySuccess("Profile updated.");
      refreshPage();
    } catch (error) {
      notifyError(error instanceof Error ? error.message : "Unable to update profile.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const uploadProfilePhoto = async () => {
    if (!selectedAvatarFile) return;
    setIsSubmitting(true);
    setActionMessage("");
    try {
      const formData = new FormData();
      formData.append("profile_photo", selectedAvatarFile);

      const response = await fetch(`/admin/users/${user.id}/profile-avatar`, {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "X-CSRF-TOKEN": getCsrfToken(),
          Accept: "application/json",
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Unable to upload profile picture.");
      }

      setSelectedAvatarFile(null);
      notifySuccess("Profile picture updated.");
      refreshPage();
    } catch (error) {
      notifyError(error instanceof Error ? error.message : "Unable to upload profile picture.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetProfilePhoto = async () => {
    setIsSubmitting(true);
    setActionMessage("");
    try {
      await adminRequest(`/admin/users/${user.id}/profile-avatar/reset`, "POST");
      setSelectedAvatarFile(null);
      notifySuccess("Profile picture reset.");
      refreshPage();
    } catch (error) {
      notifyError(error instanceof Error ? error.message : "Unable to reset profile picture.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const sendPasswordReset = async () => {
    setIsSubmitting(true);
    setActionMessage("");
    try {
      await adminRequest(`/admin/users/${user.id}/send-password-reset`, "POST");
      notifySuccess("Password reset email sent.");
    } catch (error) {
      notifyError(error instanceof Error ? error.message : "Unable to send password reset email.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const saveAddress = async (addressId: number) => {
    const payload = addressesForm.find((address) => address.id === addressId);
    if (!payload) return;

    setIsSubmitting(true);
    setActionMessage("");
    try {
      await adminRequest(`/admin/users/${user.id}/addresses/${addressId}`, "PATCH", payload);
      notifySuccess("Address updated.");
      setEditingAddressId(null);
      refreshPage();
    } catch (error) {
      notifyError(error instanceof Error ? error.message : "Unable to update address.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const addAddress = async () => {
    if (
      !newAddressForm.first_name.trim() ||
      !newAddressForm.last_name.trim() ||
      !newAddressForm.country.trim() ||
      !newAddressForm.address_line1.trim() ||
      !newAddressForm.city.trim() ||
      !newAddressForm.postcode.trim()
    ) {
      notifyError("Please complete required address fields.");
      return;
    }

    setIsSubmitting(true);
    setActionMessage("");
    try {
      await adminRequest(`/admin/users/${user.id}/addresses`, "POST", {
        ...newAddressForm,
        label: newAddressForm.label.trim() || null,
        phone: newAddressForm.phone.trim() || null,
        address_line2: newAddressForm.address_line2.trim() || null,
        county: newAddressForm.county.trim() || null,
      });
      notifySuccess("Address added.");
      setNewAddressForm({
        label: "",
        first_name: "",
        last_name: "",
        phone: "",
        country: "",
        address_line1: "",
        address_line2: "",
        city: "",
        county: "",
        postcode: "",
        is_default: false,
      });
      setShowAddAddressForm(false);
      refreshPage();
    } catch (error) {
      notifyError(error instanceof Error ? error.message : "Unable to add address.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const deletePaymentMethod = async (paymentMethodId: number) => {
    if (!window.confirm("Delete this payment method?")) return;
    setIsSubmitting(true);
    setActionMessage("");
    try {
      await adminRequest(`/admin/users/${user.id}/payment-methods/${paymentMethodId}`, "DELETE");
      notifySuccess("Payment method deleted.");
      refreshPage();
    } catch (error) {
      notifyError(error instanceof Error ? error.message : "Unable to delete payment method.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const addPaymentMethod = async () => {
    if (newPaymentForm.provider_type === "card" && !newPaymentForm.last4.trim()) {
      notifyError("Please add last 4 digits for card method.");
      return;
    }

    setIsSubmitting(true);
    setActionMessage("");
    try {
      await adminRequest(`/admin/users/${user.id}/payment-methods`, "POST", {
        provider_type: newPaymentForm.provider_type,
        brand: newPaymentForm.brand.trim() || null,
        last4: newPaymentForm.last4.trim() || null,
        exp_month: newPaymentForm.exp_month ? Number(newPaymentForm.exp_month) : null,
        exp_year: newPaymentForm.exp_year ? Number(newPaymentForm.exp_year) : null,
        cardholder_name: newPaymentForm.cardholder_name.trim() || null,
        is_default: newPaymentForm.is_default,
      });
      notifySuccess("Payment method added.");
      setNewPaymentForm({
        provider_type: "card",
        brand: "",
        last4: "",
        exp_month: "",
        exp_year: "",
        cardholder_name: "",
        is_default: false,
      });
      setShowAddPaymentForm(false);
      refreshPage();
    } catch (error) {
      notifyError(error instanceof Error ? error.message : "Unable to add payment method.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteAddress = async (addressId: number) => {
    if (!window.confirm("Delete this address?")) return;
    setIsSubmitting(true);
    setActionMessage("");
    try {
      await adminRequest(`/admin/users/${user.id}/addresses/${addressId}`, "DELETE");
      notifySuccess("Address deleted.");
      if (editingAddressId === addressId) {
        setEditingAddressId(null);
      }
      refreshPage();
    } catch (error) {
      notifyError(error instanceof Error ? error.message : "Unable to delete address.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteDesign = async (designId: number) => {
    if (!window.confirm("Delete this saved design?")) return;
    setIsSubmitting(true);
    setActionMessage("");
    try {
      await adminRequest(`/admin/users/${user.id}/designs/${designId}`, "DELETE");
      notifySuccess("Saved design deleted.");
      refreshPage();
    } catch (error) {
      notifyError(error instanceof Error ? error.message : "Unable to delete design.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteWishlistItem = async (wishlistItemId: number) => {
    if (!window.confirm("Delete this wishlist item?")) return;
    setIsSubmitting(true);
    setActionMessage("");
    try {
      await adminRequest(`/admin/users/${user.id}/wishlist/${wishlistItemId}`, "DELETE");
      notifySuccess("Wishlist item deleted.");
      refreshPage();
    } catch (error) {
      notifyError(error instanceof Error ? error.message : "Unable to delete wishlist item.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitAdminAction = async () => {
    if (!adminAction) return;
    setIsSubmitting(true);
    setActionMessage("");

    try {
      if (adminAction === "warning") {
        if (!adminActionMessage.trim()) throw new Error("Enter warning message.");
        await adminRequest(`/admin/users/${user.id}/issue-warning`, "POST", {
          message: adminActionMessage.trim(),
        });
        notifySuccess("Warning issued.");
      }

      if (adminAction === "email") {
        if (!adminActionSubject.trim() || !adminActionMessage.trim()) {
          throw new Error("Enter subject and message.");
        }
        await adminRequest(`/admin/users/${user.id}/send-email`, "POST", {
          subject: adminActionSubject.trim(),
          message: adminActionMessage.trim(),
        });
        notifySuccess("Email sent.");
      }

      if (adminAction === "message") {
        if (!adminActionMessage.trim()) throw new Error("Enter message.");
        await adminRequest(`/admin/users/${user.id}/website-message`, "POST", {
          message: adminActionMessage.trim(),
        });
        notifySuccess("Website message sent.");
      }

      setAdminAction(null);
      setAdminActionSubject("");
      setAdminActionMessage("");
    } catch (error) {
      notifyError(error instanceof Error ? error.message : "Action failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteAccount = async () => {
    if (!window.confirm("Delete this account permanently?")) return;
    setIsSubmitting(true);
    setActionMessage("");
    try {
      await adminRequest(`/admin/users/${user.id}`, "DELETE");
      notifySuccess("Account deleted. Redirecting...");
      setTimeout(() => router.visit("/admin/users"), 700);
    } catch (error) {
      notifyError(error instanceof Error ? error.message : "Unable to delete account.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthenticatedLayout>
      <AdminTopNav />
      <div className="min-h-screen bg-[#FAF8F2] px-6 py-10 text-[#2D2515] sm:px-10">
        <div className="mx-auto w-full max-w-5xl rounded-3xl border border-[#E5D4AF] bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold">User Profile</h1>
              <p className="mt-1 text-sm text-[#6B5A34]">Admin editable profile controls.</p>
            </div>
            <Link
              href="/admin/users"
              className="rounded-xl border border-[#D7BE84] bg-[#FFFCF4] px-3 py-2 text-sm font-semibold text-[#7B6530] transition hover:bg-[#FFF4DF]"
            >
              Back to Users
            </Link>
          </div>
          {actionMessage ? (
            <div
              className={`mb-4 rounded-xl px-4 py-2 text-sm ${
                actionTone === "success"
                  ? "border border-[#CFE6B5] bg-[#F2FFE8] text-[#3F5F1E]"
                  : "border border-[#E8B5B5] bg-[#FFF1F1] text-[#7A2C2C]"
              }`}
            >
              {actionMessage}
            </div>
          ) : null}

          <div className="mb-5 rounded-2xl border border-[#E5D4AF] bg-gradient-to-r from-[#FFF8EA] to-[#FFFDF6] p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#8A6D2B]">Admin Actions</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" onClick={deleteAccount} disabled={isSubmitting} className="rounded-lg border border-[#E0B2B2] bg-[#FFF3F3] px-3 py-1.5 text-xs font-semibold text-[#8D3434] hover:bg-[#FFE5E5] disabled:opacity-60">Delete account</button>
              <button type="button" onClick={() => setAdminAction("warning")} className="rounded-lg border border-[#E8D39B] bg-[#FFF9E8] px-3 py-1.5 text-xs font-semibold text-[#7B6530] hover:bg-[#FFF0CC]">Issue Warning</button>
              <button type="button" onClick={() => setAdminAction("email")} className="rounded-lg border border-[#D2C29A] bg-[#FFFCF4] px-3 py-1.5 text-xs font-semibold text-[#6C5A35] hover:bg-[#FFF3DC]">Send email</button>
              <button type="button" onClick={() => setAdminAction("message")} className="rounded-lg border border-[#C9B98E] bg-[#FAF6EA] px-3 py-1.5 text-xs font-semibold text-[#5E4D2A] hover:bg-[#F2EAD6]">Send website message</button>
            </div>
            {adminAction ? (
              <div className="mt-3 rounded-xl border border-[#E5D4AF] bg-white p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#8A6D2B]">
                  {adminAction === "warning" ? "Issue Warning" : adminAction === "email" ? "Send Email" : "Send Website Message"}
                </p>
                {adminAction === "email" ? (
                  <input
                    value={adminActionSubject}
                    onChange={(e) => setAdminActionSubject(e.target.value)}
                    placeholder="Subject"
                    className="mt-2 w-full rounded-lg border border-[#E4D4AE] bg-white px-2 py-1.5 text-sm"
                  />
                ) : null}
                <textarea
                  value={adminActionMessage}
                  onChange={(e) => setAdminActionMessage(e.target.value)}
                  placeholder="Message"
                  rows={4}
                  className="mt-2 w-full rounded-lg border border-[#E4D4AE] bg-white px-2 py-1.5 text-sm"
                />
                <div className="mt-2 flex gap-2">
                  <button type="button" onClick={submitAdminAction} disabled={isSubmitting} className="rounded-lg border border-[#D7BE84] bg-[#FFFCF4] px-3 py-1.5 text-xs font-semibold text-[#7B6530] hover:bg-[#FFF4DF] disabled:opacity-60">Send</button>
                  <button type="button" onClick={() => { setAdminAction(null); setAdminActionMessage(""); setAdminActionSubject(""); }} className="rounded-lg border border-[#E2D5B8] bg-white px-3 py-1.5 text-xs font-semibold text-[#7B6A45] hover:bg-[#FFF8EA]">Cancel</button>
                </div>
              </div>
            ) : null}
          </div>

          <div className="grid grid-cols-1 gap-4 rounded-2xl border border-[#E5D4AF] bg-[#FFFEFA] p-4 md:grid-cols-[220px_1fr]">
            <div className="flex flex-col items-center justify-start rounded-xl border border-[#EBDDBD] bg-[#FFF9EC] p-4">
              <div className="h-24 w-24 overflow-hidden rounded-full border border-[#E2CCA1] bg-white">
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt={`${pretty(user.username)} avatar`} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-[#8A6D2B]">
                    {String(user.username || user.name || "U").slice(0, 1).toUpperCase()}
                  </div>
                )}
              </div>
              <p className="mt-3 text-sm font-semibold text-[#2D2515]">@{pretty(user.username)}</p>
              <p className="mt-1 text-xs text-[#6B5A34]">{pretty(user.name)}</p>
              <label className="mt-3 w-full text-xs text-[#6B5A34]">
                Upload photo
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(e) => setSelectedAvatarFile(e.target.files?.[0] || null)}
                  className="mt-1 w-full rounded-lg border border-[#E4D4AE] bg-white px-2 py-1.5 text-sm text-[#2D2515]"
                />
              </label>
              <button
                type="button"
                onClick={uploadProfilePhoto}
                disabled={isSubmitting || !selectedAvatarFile}
                className="mt-2 w-full rounded-lg border border-[#D7BE84] bg-[#FFFCF4] px-3 py-1.5 text-sm font-semibold text-[#7B6530] transition hover:bg-[#FFF4DF] disabled:opacity-60"
              >
                Upload photo
              </button>
              <button
                type="button"
                onClick={resetProfilePhoto}
                disabled={isSubmitting}
                className="mt-2 w-full rounded-lg border border-[#E2D5B8] bg-white px-3 py-1.5 text-sm font-semibold text-[#7B6A45] transition hover:bg-[#FFF8EA] disabled:opacity-60"
              >
                Reset to Default Picture
              </button>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[#8A6D2B]">Profile</p>
              <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
                <label className="text-xs text-[#6B5A34]">
                  Username
                  <input
                    value={profileForm.username}
                    onChange={(e) => setProfileForm((prev) => ({ ...prev, username: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-[#E4D4AE] bg-white px-2 py-1.5 text-sm text-[#2D2515]"
                  />
                </label>
                <label className="text-xs text-[#6B5A34]">
                  Name
                  <input
                    value={profileForm.name}
                    onChange={(e) => setProfileForm((prev) => ({ ...prev, name: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-[#E4D4AE] bg-white px-2 py-1.5 text-sm text-[#2D2515]"
                  />
                </label>
                <label className="text-xs text-[#6B5A34]">
                  Phone
                  <input
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm((prev) => ({ ...prev, phone: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-[#E4D4AE] bg-white px-2 py-1.5 text-sm text-[#2D2515]"
                  />
                </label>
                <label className="text-xs text-[#6B5A34] md:col-span-2">
                  Email
                  <input
                    value={profileForm.email}
                    onChange={(e) => setProfileForm((prev) => ({ ...prev, email: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-[#E4D4AE] bg-white px-2 py-1.5 text-sm text-[#2D2515]"
                  />
                </label>
              </div>
              <div className="mt-3">
                <button
                  type="button"
                  onClick={saveProfile}
                  disabled={isSubmitting}
                  className="rounded-lg border border-[#D7BE84] bg-[#FFFCF4] px-3 py-1.5 text-sm font-semibold text-[#7B6530] transition hover:bg-[#FFF4DF] disabled:opacity-60"
                >
                  Save profile
                </button>
              </div>

              <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-[#8A6D2B]">Account</p>
              <p className="mt-2 text-sm"><span className="font-semibold">How they signed up:</span> {signUpMethod}</p>
              <p className="mt-1 text-sm"><span className="font-semibold">Date of sign up:</span> {formatDate(user.created_at)}</p>
              <p className="mt-1 text-sm"><span className="font-semibold">Admin:</span> {user.is_admin ? "Yes" : "No"}</p>
              <p className="mt-1 text-sm"><span className="font-semibold">Password:</span> *****</p>
              <button
                type="button"
                onClick={sendPasswordReset}
                disabled={isSubmitting}
                className="mt-2 rounded-lg border border-[#D7BE84] bg-[#FFFCF4] px-3 py-1.5 text-sm font-semibold text-[#7B6530] transition hover:bg-[#FFF4DF] disabled:opacity-60"
              >
                Send password reset email
              </button>
              <p className="mt-1 text-sm">
                <span className="font-semibold">Country code:</span>{" "}
                {countryFlag ? `${countryFlag} ` : ""}{countryCode || "N/A"}
                {user.country ? ` (${user.country})` : ""}
              </p>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-[#E5D4AF] bg-[#FFFEFA]">
            <div className="border-b border-[#EDE0BF] px-4 py-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-[#8A6D2B]">
                Address Book
              </h2>
            </div>
            <div className="border-b border-[#EDE0BF] bg-[#FFF9EC] px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#8A6D2B]">Add Address</p>
                <button
                  type="button"
                  onClick={() => setShowAddAddressForm((prev) => !prev)}
                  className="rounded-lg border border-[#D7BE84] bg-white px-3 py-1.5 text-xs font-semibold text-[#7B6530] transition hover:bg-[#FFF4DF]"
                >
                  {showAddAddressForm ? "Close" : "Add Address"}
                </button>
              </div>
              {showAddAddressForm ? (
                <>
                  <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
                    <input value={newAddressForm.label} onChange={(e) => setNewAddressForm((prev) => ({ ...prev, label: e.target.value }))} placeholder="Label" className="rounded-lg border border-[#E4D4AE] bg-white px-2 py-1.5 text-sm" />
                    <input value={newAddressForm.phone} onChange={(e) => setNewAddressForm((prev) => ({ ...prev, phone: e.target.value }))} placeholder="Phone" className="rounded-lg border border-[#E4D4AE] bg-white px-2 py-1.5 text-sm" />
                    <input value={newAddressForm.first_name} onChange={(e) => setNewAddressForm((prev) => ({ ...prev, first_name: e.target.value }))} placeholder="First name*" className="rounded-lg border border-[#E4D4AE] bg-white px-2 py-1.5 text-sm" />
                    <input value={newAddressForm.last_name} onChange={(e) => setNewAddressForm((prev) => ({ ...prev, last_name: e.target.value }))} placeholder="Last name*" className="rounded-lg border border-[#E4D4AE] bg-white px-2 py-1.5 text-sm" />
                    <input value={newAddressForm.address_line1} onChange={(e) => setNewAddressForm((prev) => ({ ...prev, address_line1: e.target.value }))} placeholder="Address line 1*" className="rounded-lg border border-[#E4D4AE] bg-white px-2 py-1.5 text-sm md:col-span-2" />
                    <input value={newAddressForm.address_line2} onChange={(e) => setNewAddressForm((prev) => ({ ...prev, address_line2: e.target.value }))} placeholder="Address line 2" className="rounded-lg border border-[#E4D4AE] bg-white px-2 py-1.5 text-sm md:col-span-2" />
                    <input value={newAddressForm.city} onChange={(e) => setNewAddressForm((prev) => ({ ...prev, city: e.target.value }))} placeholder="City*" className="rounded-lg border border-[#E4D4AE] bg-white px-2 py-1.5 text-sm" />
                    <input value={newAddressForm.county} onChange={(e) => setNewAddressForm((prev) => ({ ...prev, county: e.target.value }))} placeholder="County" className="rounded-lg border border-[#E4D4AE] bg-white px-2 py-1.5 text-sm" />
                    <input value={newAddressForm.postcode} onChange={(e) => setNewAddressForm((prev) => ({ ...prev, postcode: e.target.value }))} placeholder="Postcode*" className="rounded-lg border border-[#E4D4AE] bg-white px-2 py-1.5 text-sm" />
                    <input value={newAddressForm.country} onChange={(e) => setNewAddressForm((prev) => ({ ...prev, country: e.target.value }))} placeholder="Country*" className="rounded-lg border border-[#E4D4AE] bg-white px-2 py-1.5 text-sm" />
                  </div>
                  <div className="mt-2 flex items-center gap-3">
                    <label className="inline-flex items-center gap-2 text-xs font-semibold text-[#6B5A34]">
                      <input
                        type="checkbox"
                        checked={newAddressForm.is_default}
                        onChange={(e) => setNewAddressForm((prev) => ({ ...prev, is_default: e.target.checked }))}
                        className="h-4 w-4 rounded border-[#D8C79F] text-[#B89443] focus:ring-[#B89443]"
                      />
                      Set as default
                    </label>
                    <button
                      type="button"
                      onClick={addAddress}
                      disabled={isSubmitting}
                      className="rounded-lg border border-[#D7BE84] bg-[#FFFCF4] px-3 py-1.5 text-xs font-semibold text-[#7B6530] transition hover:bg-[#FFF4DF] disabled:opacity-60"
                    >
                      Add address
                    </button>
                  </div>
                </>
              ) : null}
            </div>
            <div className="divide-y divide-[#EDE0BF]">
              {addresses.length === 0 ? (
                <p className="px-4 py-4 text-sm text-[#6B5A34]">No saved addresses.</p>
              ) : (
                addressesForm.map((address) => (
                  <div key={address.id} className="px-4 py-3 text-sm text-[#2D2515]">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">
                          {address.first_name} {address.last_name}
                          {address.is_default && <span className="ml-2 text-xs font-semibold text-[#8A6D2B]">Default</span>}
                        </p>
                        <p className="mt-1 text-xs text-[#7B6A45]">
                          {[address.address_line1, address.city, address.postcode, address.country].filter(Boolean).join(", ")}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setEditingAddressId((prev) => (prev === address.id ? null : address.id))}
                        className="rounded-lg border border-[#D7BE84] bg-[#FFFCF4] px-3 py-1.5 text-xs font-semibold text-[#7B6530] transition hover:bg-[#FFF4DF]"
                      >
                        {editingAddressId === address.id ? "Close" : "Edit"}
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteAddress(address.id)}
                        disabled={isSubmitting}
                        className="rounded-lg border border-[#E0C891] bg-[#FFF9EC] px-3 py-1.5 text-xs font-semibold text-[#8A6D2B] transition hover:bg-[#FFF2D7] disabled:opacity-60"
                      >
                        Delete
                      </button>
                    </div>
                    {editingAddressId === address.id ? (
                      <div className="mt-2">
                        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                          <input value={address.label || ""} onChange={(e) => setAddressesForm((prev) => prev.map((item) => item.id === address.id ? { ...item, label: e.target.value } : item))} placeholder="Label" className="rounded-lg border border-[#E4D4AE] bg-white px-2 py-1.5 text-sm" />
                          <input value={address.phone || ""} onChange={(e) => setAddressesForm((prev) => prev.map((item) => item.id === address.id ? { ...item, phone: e.target.value } : item))} placeholder="Phone" className="rounded-lg border border-[#E4D4AE] bg-white px-2 py-1.5 text-sm" />
                          <input value={address.first_name} onChange={(e) => setAddressesForm((prev) => prev.map((item) => item.id === address.id ? { ...item, first_name: e.target.value } : item))} placeholder="First name" className="rounded-lg border border-[#E4D4AE] bg-white px-2 py-1.5 text-sm" />
                          <input value={address.last_name} onChange={(e) => setAddressesForm((prev) => prev.map((item) => item.id === address.id ? { ...item, last_name: e.target.value } : item))} placeholder="Last name" className="rounded-lg border border-[#E4D4AE] bg-white px-2 py-1.5 text-sm" />
                          <input value={address.address_line1} onChange={(e) => setAddressesForm((prev) => prev.map((item) => item.id === address.id ? { ...item, address_line1: e.target.value } : item))} placeholder="Address line 1" className="rounded-lg border border-[#E4D4AE] bg-white px-2 py-1.5 text-sm md:col-span-2" />
                          <input value={address.address_line2 || ""} onChange={(e) => setAddressesForm((prev) => prev.map((item) => item.id === address.id ? { ...item, address_line2: e.target.value } : item))} placeholder="Address line 2" className="rounded-lg border border-[#E4D4AE] bg-white px-2 py-1.5 text-sm md:col-span-2" />
                          <input value={address.city} onChange={(e) => setAddressesForm((prev) => prev.map((item) => item.id === address.id ? { ...item, city: e.target.value } : item))} placeholder="City" className="rounded-lg border border-[#E4D4AE] bg-white px-2 py-1.5 text-sm" />
                          <input value={address.county || ""} onChange={(e) => setAddressesForm((prev) => prev.map((item) => item.id === address.id ? { ...item, county: e.target.value } : item))} placeholder="County" className="rounded-lg border border-[#E4D4AE] bg-white px-2 py-1.5 text-sm" />
                          <input value={address.postcode} onChange={(e) => setAddressesForm((prev) => prev.map((item) => item.id === address.id ? { ...item, postcode: e.target.value } : item))} placeholder="Postcode" className="rounded-lg border border-[#E4D4AE] bg-white px-2 py-1.5 text-sm" />
                          <input value={address.country} onChange={(e) => setAddressesForm((prev) => prev.map((item) => item.id === address.id ? { ...item, country: e.target.value } : item))} placeholder="Country" className="rounded-lg border border-[#E4D4AE] bg-white px-2 py-1.5 text-sm" />
                        </div>
                        <div className="mt-3 flex gap-2">
                          <button
                            type="button"
                            onClick={() => saveAddress(address.id)}
                            disabled={isSubmitting}
                            className="rounded-lg border border-[#D7BE84] bg-[#FFFCF4] px-3 py-1.5 text-xs font-semibold text-[#7B6530] transition hover:bg-[#FFF4DF] disabled:opacity-60"
                          >
                            Save changes
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingAddressId(null)}
                            className="rounded-lg border border-[#E2D5B8] bg-white px-3 py-1.5 text-xs font-semibold text-[#7B6A45] transition hover:bg-[#FFF8EA]"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-[#E5D4AF] bg-[#FFFEFA]">
            <div className="border-b border-[#EDE0BF] px-4 py-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-[#8A6D2B]">
                Payment Information
              </h2>
            </div>
            <div className="border-b border-[#EDE0BF] bg-[#FFF9EC] px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#8A6D2B]">Add Payment Method</p>
                <button
                  type="button"
                  onClick={() => setShowAddPaymentForm((prev) => !prev)}
                  className="rounded-lg border border-[#D7BE84] bg-white px-3 py-1.5 text-xs font-semibold text-[#7B6530] transition hover:bg-[#FFF4DF]"
                >
                  {showAddPaymentForm ? "Close" : "Add Payment Method"}
                </button>
              </div>
              {showAddPaymentForm ? (
                <>
                  <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-3">
                    <select
                      value={newPaymentForm.provider_type}
                      onChange={(e) => setNewPaymentForm((prev) => ({ ...prev, provider_type: e.target.value }))}
                      className="rounded-lg border border-[#E4D4AE] bg-white px-2 py-1.5 text-sm"
                    >
                      <option value="card">Card</option>
                      <option value="paypal">PayPal</option>
                      <option value="klarna">Klarna</option>
                    </select>
                    <input value={newPaymentForm.brand} onChange={(e) => setNewPaymentForm((prev) => ({ ...prev, brand: e.target.value }))} placeholder="Brand / label" className="rounded-lg border border-[#E4D4AE] bg-white px-2 py-1.5 text-sm" />
                    <input value={newPaymentForm.last4} onChange={(e) => setNewPaymentForm((prev) => ({ ...prev, last4: e.target.value.replace(/\D/g, "").slice(0, 4) }))} placeholder="Last 4 (card)" className="rounded-lg border border-[#E4D4AE] bg-white px-2 py-1.5 text-sm" />
                    <input value={newPaymentForm.exp_month} onChange={(e) => setNewPaymentForm((prev) => ({ ...prev, exp_month: e.target.value.replace(/\D/g, "").slice(0, 2) }))} placeholder="Exp month" className="rounded-lg border border-[#E4D4AE] bg-white px-2 py-1.5 text-sm" />
                    <input value={newPaymentForm.exp_year} onChange={(e) => setNewPaymentForm((prev) => ({ ...prev, exp_year: e.target.value.replace(/\D/g, "").slice(0, 4) }))} placeholder="Exp year" className="rounded-lg border border-[#E4D4AE] bg-white px-2 py-1.5 text-sm" />
                    <input value={newPaymentForm.cardholder_name} onChange={(e) => setNewPaymentForm((prev) => ({ ...prev, cardholder_name: e.target.value }))} placeholder="Cardholder name" className="rounded-lg border border-[#E4D4AE] bg-white px-2 py-1.5 text-sm" />
                  </div>
                  <div className="mt-2 flex items-center gap-3">
                    <label className="inline-flex items-center gap-2 text-xs font-semibold text-[#6B5A34]">
                      <input
                        type="checkbox"
                        checked={newPaymentForm.is_default}
                        onChange={(e) => setNewPaymentForm((prev) => ({ ...prev, is_default: e.target.checked }))}
                        className="h-4 w-4 rounded border-[#D8C79F] text-[#B89443] focus:ring-[#B89443]"
                      />
                      Set as default
                    </label>
                    <button
                      type="button"
                      onClick={addPaymentMethod}
                      disabled={isSubmitting}
                      className="rounded-lg border border-[#D7BE84] bg-[#FFFCF4] px-3 py-1.5 text-xs font-semibold text-[#7B6530] transition hover:bg-[#FFF4DF] disabled:opacity-60"
                    >
                      Add payment method
                    </button>
                  </div>
                </>
              ) : null}
            </div>
            <div className="divide-y divide-[#EDE0BF]">
              {payment_methods.length === 0 ? (
                <p className="px-4 py-4 text-sm text-[#6B5A34]">No saved payment methods.</p>
              ) : (
                payment_methods.map((method) => (
                  <div key={method.id} className="px-4 py-3 text-sm text-[#2D2515]">
                    <p className="font-semibold">
                      {(method.provider_type || "card").toUpperCase()}
                      {method.is_default && <span className="ml-2 text-xs font-semibold text-[#8A6D2B]">Default</span>}
                    </p>
                    <p className="mt-1 text-[#5F4D27]">
                      {method.provider_type === "card"
                        ? `${(method.brand || "Card").toUpperCase()} •••• ${method.last4 || "----"}`
                        : "Linked account"}
                    </p>
                    {method.provider_type === "card" && (
                      <p className="mt-1 text-xs text-[#7B6A45]">
                        Expires {String(method.exp_month || "--").padStart(2, "0")}/{method.exp_year || "----"}
                        {method.cardholder_name ? ` • ${method.cardholder_name}` : ""}
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={() => deletePaymentMethod(method.id)}
                      disabled={isSubmitting}
                      className="mt-2 rounded-lg border border-[#E0C891] bg-[#FFF9EC] px-2.5 py-1 text-xs font-semibold text-[#8A6D2B] transition hover:bg-[#FFF2D7] disabled:opacity-60"
                    >
                      Delete card
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-[#E5D4AF] bg-[#FFFEFA]">
            <div className="border-b border-[#EDE0BF] px-4 py-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-[#8A6D2B]">
                Saved Designs
              </h2>
            </div>
            <div className="divide-y divide-[#EDE0BF]">
              {saved_designs.length === 0 ? (
                <p className="px-4 py-4 text-sm text-[#6B5A34]">No saved designs.</p>
              ) : (
                saved_designs.map((design) => (
                  <div key={design.id} className="px-4 py-3 text-sm text-[#2D2515]">
                    <div className="flex items-start gap-3">
                      <div className="h-14 w-14 overflow-hidden rounded-lg border border-[#E2CCA1] bg-white">
                        {design.product_image ? (
                          <img src={design.product_image} alt={design.name || "Saved design"} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-[10px] text-[#8A6D2B]">No image</div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold">{pretty(design.name)}</p>
                        <p className="mt-1 text-[#5F4D27]">Product: {pretty(design.product_name)}</p>
                        <p className="mt-1 text-xs text-[#7B6A45]">
                          Updated: {formatDate(design.updated_at)} • Created: {formatDate(design.created_at)}
                        </p>
                        <button
                          type="button"
                          onClick={() => deleteDesign(design.id)}
                          disabled={isSubmitting}
                          className="mt-2 rounded-lg border border-[#E0C891] bg-[#FFF9EC] px-2.5 py-1 text-xs font-semibold text-[#8A6D2B] transition hover:bg-[#FFF2D7] disabled:opacity-60"
                        >
                          Delete design
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-[#E5D4AF] bg-[#FFFEFA]">
            <div className="border-b border-[#EDE0BF] px-4 py-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-[#8A6D2B]">
                Orders
              </h2>
            </div>
            <div className="divide-y divide-[#EDE0BF]">
              {orders.length === 0 ? (
                <p className="px-4 py-4 text-sm text-[#6B5A34]">No orders found.</p>
              ) : (
                orders.map((order) => (
                  <div key={order.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm text-[#2D2515]">
                    <p className="font-semibold">Order {pretty(order.order_number)}</p>
                    {order.order_number ? (
                      <Link
                        href={`/orders/${order.order_number}`}
                        className="rounded-lg border border-[#D7BE84] bg-[#FFFCF4] px-3 py-1.5 text-xs font-semibold text-[#7B6530] transition hover:bg-[#FFF4DF]"
                      >
                        View order details
                      </Link>
                    ) : (
                      <span className="text-xs text-[#7B6A45]">Order details unavailable</span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-[#E5D4AF] bg-[#FFFEFA]">
            <div className="border-b border-[#EDE0BF] px-4 py-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-[#8A6D2B]">
                Wishlist
              </h2>
            </div>
            <div className="divide-y divide-[#EDE0BF]">
              {wishlist_items.length === 0 ? (
                <p className="px-4 py-4 text-sm text-[#6B5A34]">No wishlist items saved.</p>
              ) : (
                wishlist_items.map((item) => (
                  <div key={item.id} className="px-4 py-3 text-sm text-[#2D2515]">
                    <div className="flex items-start gap-3">
                      <div className="h-14 w-14 overflow-hidden rounded-lg border border-[#E2CCA1] bg-white">
                        {item.image ? (
                          <img src={item.image} alt={item.name || "Wishlist item"} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-[10px] text-[#8A6D2B]">No image</div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold">{pretty(item.name)}</p>
                        <p className="mt-1 text-[#5F4D27]">
                          {pretty(item.brand)} {item.product_slug ? `• ${item.product_slug}` : ""}
                        </p>
                        <p className="mt-1 text-xs text-[#7B6A45]">
                          Price: {formatPrice(item.price)} • Updated: {formatDate(item.updated_at)}
                        </p>
                        <button
                          type="button"
                          onClick={() => deleteWishlistItem(item.id)}
                          disabled={isSubmitting}
                          className="mt-2 rounded-lg border border-[#E0C891] bg-[#FFF9EC] px-2.5 py-1 text-xs font-semibold text-[#8A6D2B] transition hover:bg-[#FFF2D7] disabled:opacity-60"
                        >
                          Delete item
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-[#E5D4AF] bg-[#FFFEFA]">
            <div className="border-b border-[#EDE0BF] px-4 py-3">
              <button
                type="button"
                onClick={() => setShowOther((prev) => !prev)}
                className="flex w-full items-center justify-between text-left"
              >
                <h2 className="text-sm font-semibold uppercase tracking-wide text-[#8A6D2B]">
                  Other
                </h2>
                <span className="text-xs font-semibold text-[#8A6D2B]">{showOther ? "Hide" : "Show"}</span>
              </button>
            </div>

            {showOther ? (
              <div className="divide-y divide-[#EDE0BF]">
                {otherAttributeEntries.map(([key, value]) => (
                  <div key={key} className="grid grid-cols-1 gap-1 px-4 py-2.5 md:grid-cols-[240px_1fr]">
                    <p className="text-sm font-semibold text-[#5F4D27]">{key}</p>
                    <p className="break-all text-sm text-[#2D2515]">{pretty(value)}</p>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
