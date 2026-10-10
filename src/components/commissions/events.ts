/** Fired by service rows; CommissionDialog opens with that service (or "custom"). */
export const OPEN_SERVICE_EVENT = "commission:open-service";
export const CUSTOM_SERVICE_ID = "custom";

export function openService(serviceId: string) {
  window.dispatchEvent(new CustomEvent(OPEN_SERVICE_EVENT, { detail: serviceId }));
}
