import type { SystemConfig } from "../types";
import { getTenantAdminModules } from "../tenantAdmin";

// Business
import { crmConfig } from "./crm";
import { projectManagementConfig } from "./project_management";
import { invoicingConfig } from "./invoicing";
import { hrPlatformConfig } from "./hr_platform";
import { agencyPlatformConfig } from "./agency_platform";

// Food & Hospitality
import { restaurantConfig } from "./restaurant";
import { hotelBooking } from "./hotel_booking";
import { foodDelivery } from "./food_delivery";
import { catering } from "./catering";

// Health & Wellness
import { clinicOSConfig } from "./clinic_management";
import { gymFitness } from "./gym_fitness";
import { salonSpa } from "./salon_spa";
import { dentalClinic } from "./dental_clinic";

// Education
import { lms } from "./lms";
import { schoolManagement } from "./school_management";
import { tutoring } from "./tutoring";

// Real Estate
import { realEstate } from "./real_estate";
import { propertyManagement } from "./property_management";

// Services
import { bookingConfig } from "./booking_system";
import { cleaningService } from "./cleaning_service";
import { legalFirm } from "./legal_firm";
import { autoRepair } from "./auto_repair";
import { freelancerPlatformConfig } from "./freelancer_platform";

// Retail
import { ecommerceConfig } from "./ecommerce";
import { posSystemConfig } from "./pos_system";
import { marketplace } from "./marketplace";

// Tech
import { saasDashboard } from "./saas_dashboard";
import { helpdesk } from "./helpdesk";
import { aiAutomation } from "./ai_automation";

// Finance
import { accounting } from "./accounting";
import { expenseTracker } from "./expense_tracker";

// Media
import { cms } from "./cms";
import { socialMediaManager } from "./social_media_manager";
import { podcastPlatform } from "./podcast_platform";
import { eventManagement } from "./event_management";

/** Map of system catalog IDs → pre-built template configs */
export const TEMPLATE_CONFIGS: Record<string, SystemConfig> = {
  // Business
  crm: crmConfig,
  project_management: projectManagementConfig,
  invoicing: invoicingConfig,
  hr_platform: hrPlatformConfig,
  agency_platform: agencyPlatformConfig,
  // Food & Hospitality
  restaurant: restaurantConfig,
  hotel_booking: hotelBooking,
  food_delivery: foodDelivery,
  catering: catering,
  // Health & Wellness
  clinic_management: clinicOSConfig,
  gym_fitness: gymFitness,
  salon_spa: salonSpa,
  dental_clinic: dentalClinic,
  // Education
  lms: lms,
  school_management: schoolManagement,
  tutoring: tutoring,
  // Real Estate
  real_estate: realEstate,
  property_management: propertyManagement,
  // Services
  booking_system: bookingConfig,
  cleaning_service: cleaningService,
  legal_firm: legalFirm,
  auto_repair: autoRepair,
  freelancer_platform: freelancerPlatformConfig,
  // Retail
  ecommerce: ecommerceConfig,
  pos_system: posSystemConfig,
  marketplace: marketplace,
  // Tech
  saas_dashboard: saasDashboard,
  helpdesk: helpdesk,
  ai_automation: aiAutomation,
  // Finance
  accounting: accounting,
  expense_tracker: expenseTracker,
  // Media
  cms: cms,
  social_media_manager: socialMediaManager,
  podcast_platform: podcastPlatform,
  event_management: eventManagement,
};

export function getTemplateConfig(systemId: string): SystemConfig | null {
  const config = TEMPLATE_CONFIGS[systemId];
  if (!config) return null;
  // Inject shared tenant admin modules if not already present
  if (!config.tenantAdmin) {
    config.tenantAdmin = { modules: getTenantAdminModules() };
  }
  return config;
}
