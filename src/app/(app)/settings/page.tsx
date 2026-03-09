"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase-browser";
import { useI18n } from "@/lib/i18n-provider";
import {
  Settings,
  Users,
  Clock,
  Printer,
  Bell,
  Monitor,
  AlertTriangle,
  Plus,
  Pencil,
  UserX,
  UserCheck,
  X,
  Check,
  Rocket,
} from "lucide-react";
import { useOnboarding } from "@/lib/onboarding";

/* ─── Types ─── */

interface TenantSettings {
  name: string;
  currency: string;
  tax_rate: number;
  tax_included: boolean;
  timezone: string;
  locale: string;
  stripe_account_id: string | null;
  stripe_onboarded: boolean;
  business_hours: BusinessHours;
  receipt_config: ReceiptConfig;
  notification_config: NotificationConfig;
}

interface BusinessHours {
  [key: string]: { open: string; close: string; closed: boolean };
}

interface ReceiptConfig {
  enabled: boolean;
  header_text: string;
  footer_text: string;
}

interface NotificationConfig {
  email_new_order: boolean;
  email_daily_summary: boolean;
  sound_alerts_kds: boolean;
}

interface KdsStation {
  id: string;
  name: string;
  slug: string;
  color: string;
}

interface StaffUser {
  id: string;
  email: string;
  name: string;
  role: string;
  active: boolean;
}

type TabKey = "general" | "staff" | "hours" | "receipts" | "notifications" | "kds" | "danger";

const CURRENCIES = ["EUR", "USD", "GBP", "MXN"];
const TIMEZONES = [
  "Europe/Madrid",
  "Europe/London",
  "America/New_York",
  "America/Mexico_City",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Rome",
];
const LOCALES = [
  { value: "es", label: "Espanol" },
  { value: "en", label: "English" },
  { value: "fr", label: "Francais" },
  { value: "de", label: "Deutsch" },
  { value: "it", label: "Italiano" },
];

const ROLES = ["admin", "manager", "waiter", "kitchen"];

const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

const DEFAULT_BUSINESS_HOURS: BusinessHours = {
  mon: { open: "09:00", close: "23:00", closed: false },
  tue: { open: "09:00", close: "23:00", closed: false },
  wed: { open: "09:00", close: "23:00", closed: false },
  thu: { open: "09:00", close: "23:00", closed: false },
  fri: { open: "09:00", close: "23:00", closed: false },
  sat: { open: "10:00", close: "00:00", closed: false },
  sun: { open: "10:00", close: "00:00", closed: true },
};

const DEFAULT_RECEIPT_CONFIG: ReceiptConfig = {
  enabled: false,
  header_text: "",
  footer_text: "",
};

const DEFAULT_NOTIFICATION_CONFIG: NotificationConfig = {
  email_new_order: false,
  email_daily_summary: false,
  sound_alerts_kds: true,
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove accents
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const ROLE_COLORS: Record<string, string> = {
  admin: "#EF4444",
  manager: "#F97316",
  waiter: "#3B82F6",
  kitchen: "#10B981",
};

/* ─── Styles ─── */

const cardStyle: React.CSSProperties = {
  background: "var(--bg-card)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  padding: 24,
  display: "flex",
  flexDirection: "column",
  gap: 20,
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 700,
  color: "var(--text-primary)",
  margin: 0,
  paddingBottom: 12,
  borderBottom: "1px solid var(--border)",
};

const labelStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: "var(--text-secondary)",
  marginBottom: 6,
  display: "block",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "var(--bg-primary)",
  color: "var(--text-primary)",
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  cursor: "pointer",
  appearance: "auto" as React.CSSProperties["appearance"],
};

const btnPrimary: React.CSSProperties = {
  padding: "10px 24px",
  borderRadius: 8,
  border: "none",
  background: "var(--accent)",
  color: "#fff",
  fontWeight: 700,
  fontSize: 14,
  cursor: "pointer",
  transition: "opacity 0.15s",
};

const btnDanger: React.CSSProperties = {
  padding: "10px 24px",
  borderRadius: 8,
  border: "1px solid var(--danger)",
  background: "transparent",
  color: "var(--danger)",
  fontWeight: 700,
  fontSize: 14,
  cursor: "pointer",
};

const btnSmall: React.CSSProperties = {
  padding: "6px 14px",
  borderRadius: 6,
  border: "none",
  fontWeight: 600,
  fontSize: 13,
  cursor: "pointer",
};

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  minHeight: 80,
  resize: "vertical" as React.CSSProperties["resize"],
  fontFamily: "inherit",
};

/* ─── Toggle Component ─── */

function Toggle({
  value,
  onChange,
  disabled,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={() => !disabled && onChange(!value)}
      style={{
        width: 48,
        height: 26,
        borderRadius: 13,
        border: "none",
        background: value ? "var(--accent)" : "var(--border)",
        cursor: disabled ? "not-allowed" : "pointer",
        position: "relative",
        transition: "background 0.2s",
        opacity: disabled ? 0.5 : 1,
        flexShrink: 0,
      }}
    >
      <div
        style={{
          width: 20,
          height: 20,
          borderRadius: 10,
          background: "#fff",
          position: "absolute",
          top: 3,
          left: value ? 25 : 3,
          transition: "left 0.2s",
        }}
      />
    </button>
  );
}

/* ─── Tab Config ─── */

const TABS: { key: TabKey; icon: React.ElementType; labelKey: string }[] = [
  { key: "general", icon: Settings, labelKey: "settings.tab_general" },
  { key: "staff", icon: Users, labelKey: "settings.tab_staff" },
  { key: "hours", icon: Clock, labelKey: "settings.tab_hours" },
  { key: "receipts", icon: Printer, labelKey: "settings.tab_receipts" },
  { key: "notifications", icon: Bell, labelKey: "settings.tab_notifications" },
  { key: "kds", icon: Monitor, labelKey: "settings.tab_kds" },
  { key: "danger", icon: AlertTriangle, labelKey: "settings.tab_danger" },
];

/* ─── Component ─── */

export default function SettingsPage() {
  const { t, setLang } = useI18n();
  const { restart } = useOnboarding();
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  const [tenantId, setTenantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("general");

  // Tenant settings
  const [settings, setSettings] = useState<TenantSettings>({
    name: "",
    currency: "EUR",
    tax_rate: 10,
    tax_included: true,
    timezone: "Europe/Madrid",
    locale: "es",
    stripe_account_id: null,
    stripe_onboarded: false,
    business_hours: DEFAULT_BUSINESS_HOURS,
    receipt_config: DEFAULT_RECEIPT_CONFIG,
    notification_config: DEFAULT_NOTIFICATION_CONFIG,
  });

  // Order modes
  const [orderModes, setOrderModes] = useState({ dine_in: true, takeaway: true, delivery: true });

  // KDS stations
  const [stations, setStations] = useState<KdsStation[]>([]);
  const [newStation, setNewStation] = useState({ name: "", slug: "", color: "#3B82F6" });

  // Staff
  const [staffUsers, setStaffUsers] = useState<StaffUser[]>([]);
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUser, setNewUser] = useState({ name: "", email: "", role: "waiter" });
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingRole, setEditingRole] = useState("");
  const [staffSaving, setStaffSaving] = useState(false);

  // Resolve tenant
  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from("users")
        .select("tenant_id")
        .eq("id", user.id)
        .single();
      if (profile?.tenant_id) setTenantId(profile.tenant_id);
    })();
  }, [supabase]);

  // Fetch tenant settings + stations + staff
  const fetchAll = useCallback(async () => {
    if (!tenantId) return;
    const [tenantRes, stationsRes, staffRes] = await Promise.all([
      supabase
        .from("tenants")
        .select(
          "name, currency, tax_rate, tax_included, timezone, locale, stripe_account_id, stripe_onboarded, business_hours, receipt_config, notification_config, settings"
        )
        .eq("id", tenantId)
        .single(),
      supabase
        .from("kds_stations")
        .select("id, name, slug, color")
        .eq("tenant_id", tenantId)
        .order("name"),
      supabase
        .from("users")
        .select("id, email, name, role, active")
        .eq("tenant_id", tenantId)
        .order("name"),
    ]);

    if (tenantRes.data) {
      setSettings({
        name: tenantRes.data.name || "",
        currency: tenantRes.data.currency || "EUR",
        tax_rate: tenantRes.data.tax_rate ?? 10,
        tax_included: tenantRes.data.tax_included ?? true,
        timezone: tenantRes.data.timezone || "Europe/Madrid",
        locale: tenantRes.data.locale || "es",
        stripe_account_id: tenantRes.data.stripe_account_id || null,
        stripe_onboarded: tenantRes.data.stripe_onboarded ?? false,
        business_hours: tenantRes.data.business_hours || DEFAULT_BUSINESS_HOURS,
        receipt_config: tenantRes.data.receipt_config || DEFAULT_RECEIPT_CONFIG,
        notification_config: tenantRes.data.notification_config || DEFAULT_NOTIFICATION_CONFIG,
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const s = tenantRes.data.settings as any;
      if (s?.order_modes) {
        setOrderModes({
          dine_in: s.order_modes.dine_in !== false,
          takeaway: s.order_modes.takeaway !== false,
          delivery: s.order_modes.delivery !== false,
        });
      }
    }
    if (stationsRes.data) {
      setStations(stationsRes.data as KdsStation[]);
    }
    if (staffRes.data) {
      setStaffUsers(staffRes.data as StaffUser[]);
    }
    setLoading(false);
  }, [tenantId, supabase]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Save tenant settings (general)
  async function handleSave() {
    if (!tenantId || saving) return;
    setSaving(true);
    setSaved(false);
    // First get current settings to merge order_modes
    const { data: current } = await supabase
      .from("tenants")
      .select("settings")
      .eq("id", tenantId)
      .single();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const currentSettings = (current?.settings as any) || {};
    await supabase
      .from("tenants")
      .update({
        name: settings.name,
        slug: slugify(settings.name),
        currency: settings.currency,
        tax_rate: settings.tax_rate,
        tax_included: settings.tax_included,
        timezone: settings.timezone,
        locale: settings.locale,
        settings: { ...currentSettings, order_modes: orderModes },
      })
      .eq("id", tenantId);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  // Save business hours
  async function handleSaveHours() {
    if (!tenantId || saving) return;
    setSaving(true);
    setSaved(false);
    await supabase
      .from("tenants")
      .update({ business_hours: settings.business_hours })
      .eq("id", tenantId);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  // Save receipt config
  async function handleSaveReceipts() {
    if (!tenantId || saving) return;
    setSaving(true);
    setSaved(false);
    await supabase
      .from("tenants")
      .update({ receipt_config: settings.receipt_config })
      .eq("id", tenantId);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  // Save notification config
  async function handleSaveNotifications() {
    if (!tenantId || saving) return;
    setSaving(true);
    setSaved(false);
    await supabase
      .from("tenants")
      .update({ notification_config: settings.notification_config })
      .eq("id", tenantId);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  // Add KDS station
  async function handleAddStation() {
    if (!tenantId || !newStation.name.trim() || !newStation.slug.trim()) return;
    await supabase.from("kds_stations").insert({
      tenant_id: tenantId,
      name: newStation.name.trim(),
      slug: newStation.slug.trim().toLowerCase().replace(/[^a-z0-9-_]/g, ""),
      color: newStation.color,
    });
    setNewStation({ name: "", slug: "", color: "#3B82F6" });
    fetchAll();
  }

  // Delete KDS station
  async function handleDeleteStation(id: string) {
    if (!tenantId) return;
    await supabase.from("kds_stations").delete().eq("id", id).eq("tenant_id", tenantId);
    fetchAll();
  }

  // Add staff user
  async function handleAddUser() {
    if (!tenantId || !newUser.email.trim() || !newUser.name.trim()) return;
    setStaffSaving(true);
    await supabase.from("users").insert({
      email: newUser.email.trim(),
      name: newUser.name.trim(),
      role: newUser.role,
      tenant_id: tenantId,
      active: true,
    });
    setNewUser({ name: "", email: "", role: "waiter" });
    setShowAddUser(false);
    setStaffSaving(false);
    fetchAll();
  }

  // Update staff role
  async function handleUpdateRole(userId: string) {
    if (!tenantId || !editingRole) return;
    setStaffSaving(true);
    await supabase
      .from("users")
      .update({ role: editingRole })
      .eq("id", userId)
      .eq("tenant_id", tenantId);
    setEditingUserId(null);
    setEditingRole("");
    setStaffSaving(false);
    fetchAll();
  }

  // Toggle staff active
  async function handleToggleActive(userId: string, currentActive: boolean) {
    if (!tenantId) return;
    await supabase
      .from("users")
      .update({ active: !currentActive })
      .eq("id", userId)
      .eq("tenant_id", tenantId);
    fetchAll();
  }

  // Field updaters
  function updateField<K extends keyof TenantSettings>(key: K, value: TenantSettings[K]) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  function updateHours(day: string, field: "open" | "close" | "closed", value: string | boolean) {
    setSettings((prev) => ({
      ...prev,
      business_hours: {
        ...prev.business_hours,
        [day]: { ...prev.business_hours[day], [field]: value },
      },
    }));
  }

  function updateReceiptConfig<K extends keyof ReceiptConfig>(key: K, value: ReceiptConfig[K]) {
    setSettings((prev) => ({
      ...prev,
      receipt_config: { ...prev.receipt_config, [key]: value },
    }));
  }

  function updateNotificationConfig<K extends keyof NotificationConfig>(
    key: K,
    value: NotificationConfig[K]
  ) {
    setSettings((prev) => ({
      ...prev,
      notification_config: { ...prev.notification_config, [key]: value },
    }));
  }

  /* ─── Save button helper ─── */
  function SaveButton({ onClick }: { onClick: () => void }) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 12, paddingTop: 4 }}>
        <button onClick={onClick} disabled={saving} style={btnPrimary}>
          {saving ? t("settings.saving") : t("settings.save")}
        </button>
        {saved && (
          <span style={{ fontSize: 14, fontWeight: 600, color: "var(--success)" }}>
            {t("settings.saved")}
          </span>
        )}
      </div>
    );
  }

  /* ─── Tab: General ─── */
  function renderGeneral() {
    return (
      <>
        {/* Restaurant Info */}
        <div style={cardStyle}>
          <h2 style={sectionTitleStyle}>{t("settings.restaurant_info")}</h2>

          <div>
            <label style={labelStyle}>{t("settings.restaurant_name")}</label>
            <input
              type="text"
              value={settings.name}
              onChange={(e) => updateField("name", e.target.value)}
              style={inputStyle}
            />
            {settings.name && (
              <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: 0, marginTop: 6 }}>
                URL: /qr/<strong>{slugify(settings.name)}</strong>/mesa
              </p>
            )}
          </div>

          <div>
            <label style={labelStyle}>{t("settings.currency")}</label>
            <select
              value={settings.currency}
              onChange={(e) => updateField("currency", e.target.value)}
              style={selectStyle}
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={labelStyle}>{t("settings.tax_rate")}</label>
            <input
              type="number"
              min={0}
              max={100}
              step={0.01}
              value={settings.tax_rate}
              onChange={(e) => updateField("tax_rate", parseFloat(e.target.value) || 0)}
              style={inputStyle}
            />
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span style={{ fontSize: 14, color: "var(--text-primary)", fontWeight: 500 }}>
              {t("settings.tax_included")}
            </span>
            <Toggle
              value={settings.tax_included}
              onChange={(v) => updateField("tax_included", v)}
            />
          </div>

          <div>
            <label style={labelStyle}>{t("settings.timezone")}</label>
            <select
              value={settings.timezone}
              onChange={(e) => updateField("timezone", e.target.value)}
              style={selectStyle}
            >
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={labelStyle}>{t("settings.locale")}</label>
            <select
              value={settings.locale}
              onChange={(e) => { updateField("locale", e.target.value); setLang(e.target.value as "es" | "en" | "fr" | "de" | "it"); }}
              style={selectStyle}
            >
              {LOCALES.map((loc) => (
                <option key={loc.value} value={loc.value}>
                  {loc.label}
                </option>
              ))}
            </select>
          </div>

          <SaveButton onClick={handleSave} />
        </div>

        {/* Order Modes */}
        <div style={cardStyle}>
          <h2 style={sectionTitleStyle}>{t("settings.order_modes") || "Modos de Pedido"}</h2>
          {(["dine_in", "takeaway", "delivery"] as const).map((mode) => (
            <div
              key={mode}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 0",
              }}
            >
              <span style={{ fontSize: 14, color: "var(--text-primary)", fontWeight: 500 }}>
                {t(`pos.${mode}`)}
              </span>
              <Toggle
                value={orderModes[mode]}
                onChange={(v) => setOrderModes((prev) => ({ ...prev, [mode]: v }))}
              />
            </div>
          ))}
          <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "4px 0 0" }}>
            {t("settings.order_modes_hint") || "Activa los modos de pedido disponibles en el POS y el menu QR"}
          </p>
          <SaveButton onClick={handleSave} />
        </div>

        {/* Stripe Connect */}
        <div style={cardStyle}>
          <h2 style={sectionTitleStyle}>{t("settings.stripe")}</h2>

          {settings.stripe_onboarded && settings.stripe_account_id ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 5,
                    background: "var(--success)",
                    flexShrink: 0,
                  }}
                />
                <span style={{ fontSize: 14, fontWeight: 600, color: "var(--success)" }}>
                  {t("settings.stripe_connected")}
                </span>
              </div>
              <div>
                <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
                  {t("settings.stripe_account")}:{" "}
                </span>
                <span
                  style={{
                    fontSize: 13,
                    color: "var(--text-secondary)",
                    fontFamily: "monospace",
                  }}
                >
                  {settings.stripe_account_id}
                </span>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 5,
                    background: "var(--text-muted)",
                    flexShrink: 0,
                  }}
                />
                <span style={{ fontSize: 14, color: "var(--text-muted)" }}>
                  {t("settings.stripe_not_connected")}
                </span>
              </div>
              <button
                onClick={() => alert("Stripe Connect integration coming soon")}
                style={{
                  ...btnPrimary,
                  background: "#635BFF",
                  alignSelf: "flex-start",
                }}
              >
                {t("settings.stripe_connect")}
              </button>
            </div>
          )}
        </div>
      </>
    );
  }

  /* ─── Tab: Staff ─── */
  function renderStaff() {
    return (
      <div style={cardStyle}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingBottom: 12,
            borderBottom: "1px solid var(--border)",
          }}
        >
          <h2 style={{ ...sectionTitleStyle, borderBottom: "none", paddingBottom: 0 }}>
            {t("settings.staff_management")}
          </h2>
          <button
            onClick={() => setShowAddUser(!showAddUser)}
            style={{
              ...btnPrimary,
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 16px",
              fontSize: 13,
            }}
          >
            <Plus size={14} />
            {t("settings.add_user")}
          </button>
        </div>

        {/* Add user form */}
        {showAddUser && (
          <div
            style={{
              padding: 16,
              borderRadius: 8,
              background: "var(--bg-primary)",
              border: "1px solid var(--border)",
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
              }}
            >
              <div>
                <label style={labelStyle}>{t("settings.user_name")}</label>
                <input
                  type="text"
                  value={newUser.name}
                  onChange={(e) => setNewUser((u) => ({ ...u, name: e.target.value }))}
                  placeholder={t("settings.user_name_placeholder")}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>{t("settings.user_email")}</label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser((u) => ({ ...u, email: e.target.value }))}
                  placeholder={t("settings.user_email_placeholder")}
                  style={inputStyle}
                />
              </div>
            </div>
            <div>
              <label style={labelStyle}>{t("settings.user_role")}</label>
              <select
                value={newUser.role}
                onChange={(e) => setNewUser((u) => ({ ...u, role: e.target.value }))}
                style={{ ...selectStyle, maxWidth: 200 }}
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {t(`settings.role_${r}`)}
                  </option>
                ))}
              </select>
            </div>
            <p
              style={{
                fontSize: 12,
                color: "var(--text-muted)",
                margin: 0,
                fontStyle: "italic",
              }}
            >
              {t("settings.add_user_note")}
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={handleAddUser}
                disabled={staffSaving || !newUser.email.trim() || !newUser.name.trim()}
                style={{
                  ...btnPrimary,
                  padding: "8px 20px",
                  fontSize: 13,
                  opacity:
                    staffSaving || !newUser.email.trim() || !newUser.name.trim() ? 0.5 : 1,
                }}
              >
                {staffSaving ? t("settings.saving") : t("settings.confirm_add_user")}
              </button>
              <button
                onClick={() => {
                  setShowAddUser(false);
                  setNewUser({ name: "", email: "", role: "waiter" });
                }}
                style={{
                  ...btnSmall,
                  background: "var(--bg-secondary)",
                  color: "var(--text-secondary)",
                  padding: "8px 20px",
                }}
              >
                {t("settings.cancel")}
              </button>
            </div>
          </div>
        )}

        {/* Staff list */}
        {staffUsers.length === 0 ? (
          <p style={{ fontSize: 14, color: "var(--text-muted)", margin: 0, textAlign: "center" }}>
            {t("settings.no_staff")}
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {staffUsers.map((user) => (
              <div
                key={user.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 14px",
                  borderRadius: 8,
                  background: "var(--bg-primary)",
                  border: "1px solid var(--border)",
                  opacity: user.active ? 1 : 0.5,
                }}
              >
                {/* User info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: "var(--text-primary)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {user.name || user.email}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--text-muted)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {user.email}
                  </div>
                </div>

                {/* Role badge or role editor */}
                {editingUserId === user.id ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <select
                      value={editingRole}
                      onChange={(e) => setEditingRole(e.target.value)}
                      style={{ ...selectStyle, width: "auto", padding: "4px 8px", fontSize: 12 }}
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {t(`settings.role_${r}`)}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => handleUpdateRole(user.id)}
                      style={{
                        ...btnSmall,
                        background: "var(--success)",
                        color: "#fff",
                        padding: "4px 8px",
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      <Check size={14} />
                    </button>
                    <button
                      onClick={() => {
                        setEditingUserId(null);
                        setEditingRole("");
                      }}
                      style={{
                        ...btnSmall,
                        background: "var(--bg-secondary)",
                        color: "var(--text-muted)",
                        padding: "4px 8px",
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      padding: "4px 10px",
                      borderRadius: 20,
                      background: (ROLE_COLORS[user.role] || "#6B7280") + "22",
                      color: ROLE_COLORS[user.role] || "#6B7280",
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                    }}
                  >
                    {t(`settings.role_${user.role}`)}
                  </span>
                )}

                {/* Actions */}
                {editingUserId !== user.id && (
                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      onClick={() => {
                        setEditingUserId(user.id);
                        setEditingRole(user.role);
                      }}
                      title={t("settings.edit_role")}
                      style={{
                        ...btnSmall,
                        background: "var(--bg-secondary)",
                        color: "var(--text-secondary)",
                        padding: "6px 8px",
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => handleToggleActive(user.id, user.active)}
                      title={user.active ? t("settings.deactivate_user") : t("settings.activate_user")}
                      style={{
                        ...btnSmall,
                        background: user.active ? "var(--danger)" + "22" : "var(--success)" + "22",
                        color: user.active ? "var(--danger)" : "var(--success)",
                        padding: "6px 8px",
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      {user.active ? <UserX size={14} /> : <UserCheck size={14} />}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  /* ─── Tab: Hours ─── */
  function renderHours() {
    return (
      <div style={cardStyle}>
        <h2 style={sectionTitleStyle}>{t("settings.business_hours")}</h2>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {DAY_KEYS.map((day) => {
            const dayData = settings.business_hours[day] || {
              open: "09:00",
              close: "23:00",
              closed: false,
            };
            return (
              <div
                key={day}
                style={{
                  display: "grid",
                  gridTemplateColumns: "100px 1fr 1fr auto",
                  gap: 12,
                  alignItems: "center",
                  padding: "10px 14px",
                  borderRadius: 8,
                  background: "var(--bg-primary)",
                  border: "1px solid var(--border)",
                  opacity: dayData.closed ? 0.5 : 1,
                }}
              >
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: "var(--text-primary)",
                  }}
                >
                  {t(`settings.day_${day}`)}
                </span>

                <input
                  type="time"
                  value={dayData.open}
                  onChange={(e) => updateHours(day, "open", e.target.value)}
                  disabled={dayData.closed}
                  style={{
                    ...inputStyle,
                    padding: "6px 10px",
                    cursor: dayData.closed ? "not-allowed" : "text",
                  }}
                />

                <input
                  type="time"
                  value={dayData.close}
                  onChange={(e) => updateHours(day, "close", e.target.value)}
                  disabled={dayData.closed}
                  style={{
                    ...inputStyle,
                    padding: "6px 10px",
                    cursor: dayData.closed ? "not-allowed" : "text",
                  }}
                />

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    {t("settings.closed")}
                  </span>
                  <Toggle
                    value={dayData.closed}
                    onChange={(v) => updateHours(day, "closed", v)}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <SaveButton onClick={handleSaveHours} />
      </div>
    );
  }

  /* ─── Tab: Receipts ─── */
  function renderReceipts() {
    return (
      <div style={cardStyle}>
        <h2 style={sectionTitleStyle}>{t("settings.receipt_printer")}</h2>

        {/* Enable toggle */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span style={{ fontSize: 14, color: "var(--text-primary)", fontWeight: 500 }}>
            {t("settings.receipt_enable")}
          </span>
          <Toggle
            value={settings.receipt_config.enabled}
            onChange={(v) => updateReceiptConfig("enabled", v)}
          />
        </div>

        {/* Header text */}
        <div>
          <label style={labelStyle}>{t("settings.receipt_header")}</label>
          <textarea
            value={settings.receipt_config.header_text}
            onChange={(e) => updateReceiptConfig("header_text", e.target.value)}
            placeholder={t("settings.receipt_header_placeholder")}
            style={textareaStyle}
          />
        </div>

        {/* Footer text */}
        <div>
          <label style={labelStyle}>{t("settings.receipt_footer")}</label>
          <textarea
            value={settings.receipt_config.footer_text}
            onChange={(e) => updateReceiptConfig("footer_text", e.target.value)}
            placeholder={t("settings.receipt_footer_placeholder")}
            style={textareaStyle}
          />
        </div>

        {/* Printer connection - coming soon */}
        <div
          style={{
            padding: 16,
            borderRadius: 8,
            background: "var(--bg-primary)",
            border: "1px dashed var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div
              style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}
            >
              {t("settings.printer_connection")}
            </div>
            <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
              {t("settings.printer_connection_desc")}
            </div>
          </div>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              padding: "4px 10px",
              borderRadius: 20,
              background: "var(--info)" + "22",
              color: "var(--info)",
              textTransform: "uppercase",
              letterSpacing: 0.5,
              whiteSpace: "nowrap",
            }}
          >
            {t("settings.coming_soon")}
          </span>
        </div>

        <SaveButton onClick={handleSaveReceipts} />
      </div>
    );
  }

  /* ─── Tab: Notifications ─── */
  function renderNotifications() {
    return (
      <div style={cardStyle}>
        <h2 style={sectionTitleStyle}>{t("settings.notification_preferences")}</h2>

        {/* Email on new order */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10px 0",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <div>
            <div style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>
              {t("settings.notif_email_new_order")}
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
              {t("settings.notif_email_new_order_desc")}
            </div>
          </div>
          <Toggle
            value={settings.notification_config.email_new_order}
            onChange={(v) => updateNotificationConfig("email_new_order", v)}
          />
        </div>

        {/* Email daily summary */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10px 0",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <div>
            <div style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>
              {t("settings.notif_email_daily_summary")}
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
              {t("settings.notif_email_daily_summary_desc")}
            </div>
          </div>
          <Toggle
            value={settings.notification_config.email_daily_summary}
            onChange={(v) => updateNotificationConfig("email_daily_summary", v)}
          />
        </div>

        {/* Sound alerts in KDS */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10px 0",
          }}
        >
          <div>
            <div style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>
              {t("settings.notif_sound_alerts_kds")}
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
              {t("settings.notif_sound_alerts_kds_desc")}
            </div>
          </div>
          <Toggle
            value={settings.notification_config.sound_alerts_kds}
            onChange={(v) => updateNotificationConfig("sound_alerts_kds", v)}
          />
        </div>

        <SaveButton onClick={handleSaveNotifications} />
      </div>
    );
  }

  /* ─── Tab: KDS Stations ─── */
  function renderKds() {
    return (
      <div style={cardStyle}>
        <h2 style={sectionTitleStyle}>{t("settings.kds_stations")}</h2>

        {/* Existing stations */}
        {stations.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {stations.map((station) => (
              <div
                key={station.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 14px",
                  borderRadius: 8,
                  background: "var(--bg-primary)",
                  border: "1px solid var(--border)",
                }}
              >
                <div
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: 4,
                    background: station.color || "#3B82F6",
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    flex: 1,
                    fontSize: 14,
                    fontWeight: 600,
                    color: "var(--text-primary)",
                  }}
                >
                  {station.name}
                </span>
                <span
                  style={{
                    fontSize: 12,
                    color: "var(--text-muted)",
                    fontFamily: "monospace",
                  }}
                >
                  {station.slug}
                </span>
                <button
                  onClick={() => handleDeleteStation(station.id)}
                  style={{
                    ...btnSmall,
                    background: "var(--danger)",
                    color: "#fff",
                  }}
                >
                  {t("settings.delete_station")}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add new station */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr auto auto",
            gap: 10,
            alignItems: "end",
          }}
        >
          <div>
            <label style={labelStyle}>{t("settings.station_name")}</label>
            <input
              type="text"
              value={newStation.name}
              onChange={(e) => setNewStation((s) => ({ ...s, name: e.target.value }))}
              placeholder={t("settings.station_name")}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>{t("settings.station_slug")}</label>
            <input
              type="text"
              value={newStation.slug}
              onChange={(e) => setNewStation((s) => ({ ...s, slug: e.target.value }))}
              placeholder="e.g. grill"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>{t("settings.station_color")}</label>
            <input
              type="color"
              value={newStation.color}
              onChange={(e) => setNewStation((s) => ({ ...s, color: e.target.value }))}
              style={{
                width: 42,
                height: 42,
                padding: 2,
                border: "1px solid var(--border)",
                borderRadius: 8,
                background: "var(--bg-primary)",
                cursor: "pointer",
              }}
            />
          </div>
          <button
            onClick={handleAddStation}
            disabled={!newStation.name.trim() || !newStation.slug.trim()}
            style={{
              ...btnPrimary,
              height: 42,
              opacity: !newStation.name.trim() || !newStation.slug.trim() ? 0.5 : 1,
            }}
          >
            {t("settings.add_station")}
          </button>
        </div>
      </div>
    );
  }

  /* ─── Tab: Danger Zone ─── */
  function renderDanger() {
    return (
      <>
        {/* Onboarding replay */}
        <div style={cardStyle}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>
                {t("settings.replay_tour")}
              </div>
              <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
                {t("settings.replay_tour_desc")}
              </div>
            </div>
            <button
              onClick={restart}
              style={{
                ...btnPrimary,
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 16px",
                fontSize: 13,
              }}
            >
              <Rocket size={14} />
              {t("settings.replay_tour")}
            </button>
          </div>
        </div>

        <div
          style={{
            ...cardStyle,
            borderColor: "var(--danger)",
          }}
        >
          <h2
            style={{
              ...sectionTitleStyle,
              color: "var(--danger)",
              borderBottomColor: "var(--danger)",
            }}
          >
            {t("settings.danger_zone")}
          </h2>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span style={{ fontSize: 14, color: "var(--text-secondary)" }}>
              {t("settings.export_data")}
            </span>
            <button
              onClick={() => alert("Export feature coming soon")}
              style={btnDanger}
            >
              {t("settings.export_data")}
            </button>
          </div>
        </div>
      </>
    );
  }

  /* ─── Tab content map ─── */
  const TAB_CONTENT: Record<TabKey, () => React.ReactNode> = {
    general: renderGeneral,
    staff: renderStaff,
    hours: renderHours,
    receipts: renderReceipts,
    notifications: renderNotifications,
    kds: renderKds,
    danger: renderDanger,
  };

  /* ─── Render ─── */

  if (loading) {
    return (
      <div
        style={{
          padding: 24,
          flex: 1,
          minHeight: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--text-muted)",
          fontSize: 18,
        }}
      >
        ...
      </div>
    );
  }

  return (
    <div
      style={{
        padding: 24,
        maxWidth: 720,
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        gap: 24,
        flex: 1,
        minHeight: 0,
        overflowY: "auto",
      }}
    >
      {/* Page Title */}
      <h1
        style={{
          color: "var(--text-primary)",
          fontSize: 28,
          fontWeight: 700,
          margin: 0,
        }}
      >
        {t("settings.title")}
      </h1>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          gap: 4,
          overflowX: "auto",
          borderBottom: "1px solid var(--border)",
          paddingBottom: 0,
        }}
      >
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "10px 16px",
                border: "none",
                borderBottom: isActive ? "2px solid var(--accent)" : "2px solid transparent",
                background: "transparent",
                color: isActive ? "var(--accent)" : "var(--text-muted)",
                fontSize: 13,
                fontWeight: isActive ? 700 : 500,
                cursor: "pointer",
                transition: "color 0.15s, border-color 0.15s",
                whiteSpace: "nowrap",
              }}
            >
              <Icon size={15} />
              {t(tab.labelKey)}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {TAB_CONTENT[activeTab]()}
    </div>
  );
}
