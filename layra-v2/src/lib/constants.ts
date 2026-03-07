export const APP_NAME = "Layra";
export const APP_VERSION = "2.0.0";
export const BRAND_COLOR = "#00e5b8";

export const SUPPORTED_LANGUAGES = ["es", "en", "fr", "it", "de"] as const;
export type Lang = (typeof SUPPORTED_LANGUAGES)[number];
export const DEFAULT_LANGUAGE: Lang = "en";

export const ROLES = {
  SUPER_ADMIN: "super_admin",
  TENANT_ADMIN: "tenant_admin",
  USER: "user",
} as const;
export type Role = (typeof ROLES)[keyof typeof ROLES];

export const SYSTEM_TYPES = [
  "crm",
  "project_management",
  "invoicing",
  "hr_platform",
  "agency_platform",
  "restaurant",
  "hotel_booking",
  "food_delivery",
  "catering",
  "clinic_management",
  "gym_fitness",
  "salon_spa",
  "dental_clinic",
  "lms",
  "school_management",
  "tutoring",
  "real_estate",
  "property_management",
  "booking_system",
  "cleaning_service",
  "legal_firm",
  "auto_repair",
  "freelancer_platform",
  "ecommerce",
  "pos_system",
  "marketplace",
  "saas_dashboard",
  "helpdesk",
  "ai_automation",
  "accounting",
  "expense_tracker",
  "cms",
  "social_media_manager",
  "podcast_platform",
  "event_management",
] as const;
export type SystemType = (typeof SYSTEM_TYPES)[number];

export const PROJECT_STATUS = {
  DRAFT: "draft",
  ACTIVE: "active",
  PAUSED: "paused",
  ARCHIVED: "archived",
} as const;
export type ProjectStatus =
  (typeof PROJECT_STATUS)[keyof typeof PROJECT_STATUS];

export const SESSION_STATUS = {
  OPEN: "open",
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
} as const;

export const RISK_LEVELS = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
  CRITICAL: "critical",
} as const;
export type RiskLevel = (typeof RISK_LEVELS)[keyof typeof RISK_LEVELS];

export const PLANS = {
  FREE: "free",
  PRO: "pro",
  ENTERPRISE: "enterprise",
} as const;
export type PlanId = (typeof PLANS)[keyof typeof PLANS];

export interface PlanConfig {
  id: PlanId;
  nameKey: string;
  price: number;
  projectLimit: number;
  usersLimit: number;
  featuresKeys: string[];
  highlighted?: boolean;
}

export const PLAN_CONFIGS: Record<PlanId, PlanConfig> = {
  free: {
    id: "free",
    nameKey: "plans.free.name",
    price: 0,
    projectLimit: 2,
    usersLimit: 1,
    featuresKeys: [
      "plans.free.feat1",
      "plans.free.feat2",
      "plans.free.feat3",
    ],
  },
  pro: {
    id: "pro",
    nameKey: "plans.pro.name",
    price: 29,
    projectLimit: 20,
    usersLimit: 5,
    highlighted: true,
    featuresKeys: [
      "plans.pro.feat1",
      "plans.pro.feat2",
      "plans.pro.feat3",
      "plans.pro.feat4",
    ],
  },
  enterprise: {
    id: "enterprise",
    nameKey: "plans.enterprise.name",
    price: 79,
    projectLimit: -1,
    usersLimit: -1,
    featuresKeys: [
      "plans.enterprise.feat1",
      "plans.enterprise.feat2",
      "plans.enterprise.feat3",
      "plans.enterprise.feat4",
      "plans.enterprise.feat5",
    ],
  },
};
