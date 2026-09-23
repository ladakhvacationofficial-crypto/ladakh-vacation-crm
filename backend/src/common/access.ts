import { Role } from '@prisma/client';

/**
 * Single source of truth for who sees what.
 * Change it here, it changes everywhere.
 */

/** Roles that see EVERY lead. Others see only leads assigned to them. */
export const FULL_LEAD_ACCESS: Role[] = [
  Role.SUPER_ADMIN,
  Role.OWNER,
  Role.SALES_MANAGER,
  Role.MARKETING,
  Role.OPERATIONS,
  Role.ACCOUNTS,
];

/** Roles allowed into the leads module at all. */
export const LEAD_MODULE_ROLES: Role[] = [
  ...FULL_LEAD_ACCESS,
  Role.SALES_EXEC,
];

/**
 * Roles allowed to permanently delete a lead, or mark it Lost with no
 * approval. OWNER + SUPER_ADMIN only. SALES_MANAGER can request a close.
 * SALES_EXEC cannot close or delete.
 */
export const LEAD_DELETE_ACCESS: Role[] = [
  Role.SUPER_ADMIN,
  Role.OWNER,
];

/** Roles allowed to REQUEST a close (creates a pending ApprovalRequest). */
export const LEAD_CLOSE_REQUEST_ACCESS: Role[] = [
  Role.SUPER_ADMIN,
  Role.OWNER,
  Role.SALES_MANAGER,
];

/**
 * Roles allowed to ASSIGN leads (single, bulk, or via the Add Lead dialog's
 * "Assign to" picker). OWNER + SUPER_ADMIN only, per business rule. A sales
 * manager can see every lead and progress its stage, but assignment is a
 * headcount / capacity call reserved for the owner.
 */
export const LEAD_ASSIGN_ACCESS: Role[] = [
  Role.SUPER_ADMIN,
  Role.OWNER,
];

export const canAssignLeads = (role: Role): boolean =>
  LEAD_ASSIGN_ACCESS.includes(role);

/**
 * Every role in the system is internal staff — external parties (hotels,
 * transport, B2B agents, prospective clients) do not have logins, they are
 * data (Vendor, Partner, Lead).
 *
 * INTERNAL_STAFF and every enum value are the same list today. Kept as a
 * named constant so future access rules read intent ("only staff can see
 * this"), and so that if a fresh role ever gets added (e.g. an auditor with
 * read-only rights) the exclusion is a deliberate choice, not an oversight.
 */
export const INTERNAL_STAFF: Role[] = [
  Role.SUPER_ADMIN,
  Role.OWNER,
  Role.SALES_MANAGER,
  Role.SALES_EXEC,
  Role.ACCOUNTS,
  Role.MARKETING,
  Role.OPERATIONS,
];

/**
 * Roles that may BROWSE suppliers and their net rates.
 * Everyone on staff — this is here as a named constant, not because anyone is
 * excluded today, but because the moment a partner portal is built it will
 * NOT use this list: it needs a separate read model returning sell prices
 * without netRate.
 */
export const VENDOR_READ_ACCESS: Role[] = INTERNAL_STAFF;

/** Quotes and bookings expose net cost and margin — staff only. */
export const QUOTE_MODULE_ROLES: Role[] = INTERNAL_STAFF;
export const BOOKING_MODULE_ROLES: Role[] = INTERNAL_STAFF;

/**
 * Roles that may see vendor CONTACT + BANK details.
 * The second supplier-protection boundary: staff can see rates (they need them
 * to quote), but only these roles get the hotelier's direct number.
 */
export const VENDOR_CONTACT_ACCESS: Role[] = [
  Role.SUPER_ADMIN,
  Role.OWNER,
  Role.OPERATIONS,
  Role.ACCOUNTS,
];

/** Roles that may create/edit vendors and rates. */
export const VENDOR_WRITE_ACCESS: Role[] = [
  Role.SUPER_ADMIN,
  Role.OWNER,
  Role.OPERATIONS,
];

export interface Actor {
  id: string;
  role: Role;
}

export const canSeeAllLeads = (role: Role): boolean =>
  FULL_LEAD_ACCESS.includes(role);

export const canSeeVendorContacts = (role: Role): boolean =>
  VENDOR_CONTACT_ACCESS.includes(role);
