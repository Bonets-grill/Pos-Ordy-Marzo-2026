import type { SystemConfig } from "../types";
import { clinicOSConfig } from "./clinic_management";
import { crmConfig } from "./crm";
import { restaurantConfig } from "./restaurant";
import { ecommerceConfig } from "./ecommerce";
import { bookingConfig } from "./booking_system";

/** Map of system catalog IDs → pre-built template configs */
export const TEMPLATE_CONFIGS: Record<string, SystemConfig> = {
  clinic_management: clinicOSConfig,
  crm: crmConfig,
  restaurant: restaurantConfig,
  ecommerce: ecommerceConfig,
  booking_system: bookingConfig,
};

export function getTemplateConfig(systemId: string): SystemConfig | null {
  return TEMPLATE_CONFIGS[systemId] ?? null;
}
