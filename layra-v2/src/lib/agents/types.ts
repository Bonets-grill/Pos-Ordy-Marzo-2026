// Agent catalog types
import type { TemplateLang } from "../templates/i18n";

export type I18nStr = string | Record<TemplateLang, string>;

export interface AgentCatalogItem {
  id: string;
  name: I18nStr;
  description: I18nStr;
  category: "premium" | "basic" | "custom";
  icon: string;
  brandColor: string;
  priceMonthly: number; // EUR
  trialDays: number;
  tags: string[];
}
