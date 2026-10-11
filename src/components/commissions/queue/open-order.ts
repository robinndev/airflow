/*
 * Opens an order's drawer from any island on the page (the planner's "Next
 * up" list); the workspace listens and shows it.
 */

export const OPEN_ORDER_EVENT = "artiflow:open-order";

export function openOrder(id: string) {
  window.dispatchEvent(new CustomEvent<string>(OPEN_ORDER_EVENT, { detail: id }));
}
