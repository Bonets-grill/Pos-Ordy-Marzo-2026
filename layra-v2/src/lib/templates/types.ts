// Template configuration types — the AI generates this JSON, not HTML

import type { TemplateLang } from "./i18n";

// Multilingual string: either a simple string (backwards compatible) or per-language
export type I18nString = string | Record<TemplateLang, string>;

// Helper to create i18n strings quickly
export function t5(es: string, en: string, fr: string, de: string, it: string): I18nString {
  return { es, en, fr, de, it };
}

export interface SystemConfig {
  name: I18nString;
  subtitle?: I18nString;
  brandColor: string;
  icon?: string;
  modules: ModuleConfig[];
  tenantAdmin?: {
    modules: ModuleConfig[];
  };
  superAdmin?: {
    modules: ModuleConfig[];
  };
}

export interface ModuleConfig {
  id: string;
  label: I18nString;
  icon: string;
  kpis: KpiConfig[];
  table: TableConfig;
  modal?: ModalConfig;
  tabs?: TabConfig[];
}

export interface KpiConfig {
  label: I18nString;
  value: I18nString;
  change?: string;
  trend?: "up" | "down" | "neutral";
  icon?: string;
}

export interface TableConfig {
  columns: ColumnConfig[];
  rows: Record<string, string | number>[];
  searchPlaceholder?: I18nString;
  searchField?: string;
}

export interface ColumnConfig {
  key: string;
  label: I18nString;
  type?: "text" | "badge" | "date" | "currency" | "avatar" | "actions";
  badgeColors?: Record<string, string>;
}

export interface ModalConfig {
  title: I18nString;
  fields: FieldConfig[];
}

export interface FieldConfig {
  name: string;
  label: I18nString;
  type: "text" | "email" | "tel" | "number" | "date" | "time" | "select" | "textarea" | "checkbox";
  required?: boolean;
  placeholder?: I18nString;
  options?: { value: string; label: I18nString }[];
  defaultValue?: string;
}

export interface TabConfig {
  id: string;
  label: I18nString;
  filterField: string;
  filterValue: string;
}
