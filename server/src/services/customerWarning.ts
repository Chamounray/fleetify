import type { CustomerDocument } from "../models/Customer.js";
import type { CustomerWarning } from "@fleetify/shared";

export function customerWarning(customer: CustomerDocument): CustomerWarning {
  const openIncidents = customer.incidents.filter((incident) => !incident.isResolved);
  const reasons: string[] = [];
  if (customer.isBlacklisted) {
    reasons.push(customer.blacklistReason || "Customer is blacklisted");
  }
  if (customer.unpaidBalanceCents > 0) {
    reasons.push(`Unpaid balance of ${customer.unpaidBalanceCents} cents`);
  }
  if (openIncidents.length > 0) {
    reasons.push(`${openIncidents.length} unresolved incident(s)`);
  }
  return {
    isBlacklisted: customer.isBlacklisted,
    hasUnpaidBalance: customer.unpaidBalanceCents > 0,
    hasOpenIncident: openIncidents.length > 0,
    unpaidBalanceCents: customer.unpaidBalanceCents,
    reasons,
    requiresAcknowledgement: reasons.length > 0,
  };
}
