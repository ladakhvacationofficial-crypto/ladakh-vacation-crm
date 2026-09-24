/**
 * Single place that talks to the NestJS backend.
 *
 * NOTE ON TOKEN STORAGE: the JWT lives in localStorage. That is readable by
 * any script running on the page, so it is only acceptable because this is an
 * internal tool on a domain you control. If Ladakh Vacation ever becomes a product sold
 * to other DMCs, move to an httpOnly cookie set by the backend.
 */

export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api';

const TOKEN_KEY = 'lv.token';
const USER_KEY = 'lv.user';

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

export const tokenStore = {
  get(): string | null {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem(TOKEN_KEY);
  },
  set(token: string, user: SessionUser) {
    window.localStorage.setItem(TOKEN_KEY, token);
    window.localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  user(): SessionUser | null {
    if (typeof window === 'undefined') return null;
    const raw = window.localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as SessionUser;
    } catch {
      return null;
    }
  },
  clear() {
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(USER_KEY);
  },
};

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const token = tokenStore.get();
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  } catch {
    throw new ApiError(
      'Cannot reach the server. Check that the backend is running.',
      0,
    );
  }

  if (res.status === 401) {
    tokenStore.clear();
    if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
      window.location.href = '/login';
    }
    throw new ApiError('Your session has expired. Sign in again.', 401);
  }

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (typeof body?.message === 'string') message = body.message;
      else if (Array.isArray(body?.message)) message = body.message.join(', ');
    } catch {
      /* keep the default message */
    }
    throw new ApiError(message, res.status);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body ?? {}) }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body ?? {}) }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body ?? {}) }),
  del: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  upload: async <T>(path: string, formData: FormData): Promise<T> => {
    const token = tokenStore.get();
    const headers = new Headers();
    if (token) headers.set('Authorization', `Bearer ${token}`);
    let res: Response;
    try {
      res = await fetch(`${API_BASE}${path}`, {
        method: 'POST',
        headers,
        body: formData,
      });
    } catch {
      throw new ApiError('Cannot reach server. Check that backend is running.', 0);
    }
    if (res.status === 401) {
      tokenStore.clear();
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
      throw new ApiError('Session expired.', 401);
    }
    if (!res.ok) {
      let msg = `Upload failed (${res.status})`;
      try {
        const body = await res.json();
        if (body?.message) msg = body.message;
      } catch {}
      throw new ApiError(msg, res.status);
    }
    return (await res.json()) as T;
  },
};

/**
 * Fetch a binary asset (PDF, image) and open it in a new tab. We can't just
 * `<a href="…">` because the endpoint needs the Authorization header — a
 * bare link would 401. We fetch, convert to a blob URL, and let the browser
 * render it (PDFs open inline in every modern browser).
 */
export async function openBinary(
  path: string,
  suggestedName?: string,
): Promise<void> {
  const token = tokenStore.get();
  const res = await fetch(`${API_BASE}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (res.status === 401) {
    tokenStore.clear();
    if (typeof window !== 'undefined') window.location.href = '/login';
    return;
  }
  if (!res.ok) {
    throw new ApiError(`Could not download the file (${res.status}).`, res.status);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  // Prefer opening inline so the user can review before downloading. A named
  // download attribute is honoured when the user hits Ctrl-S in the tab.
  const a = document.createElement('a');
  a.href = url;
  a.target = '_blank';
  a.rel = 'noopener';
  if (suggestedName) a.download = suggestedName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Give the tab a moment to grab the blob before we revoke it.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

// ---- shapes returned by the backend (kept minimal on purpose) ------------

export interface LeadStats {
  total: number;
  unassigned: number;
  byStatus: { status: string; count: number }[];
  bySource: { source: string; count: number }[];
}

export interface BookingStats {
  bookings: number;
  totalSell: number;
  totalReceived: number;
  totalOutstanding: number;
  vendorOutstanding: number;
  totalQuotedProfit: number;
  totalActualProfit: number;
  profitVariance: number;
  averageMarginPercent: number;
  byStatus: { status: string; count: number }[];
}

export interface TeamScorecardRow {
  userId: string;
  name: string;
  email: string;
  role: string;
  assigned: number;
  contactedToday: number;
  quotesThisWeek: number;
  bookingsThisMonth: number;
  slaBreaches: number;
  avgFirstResponseMinutes: number | null;
}

export interface WeeklyPulse {
  bookedThisWeek: number;
  bookedLastWeek: number;
  bookingsThisWeek: number;
  travellingThisWeek: number;
  paymentsDueNext7Days: number;
  suppliersOverdue30d: number;
}

export interface OpsStats {
  leadsToday: number;
  leadsThisWeek: number;
  unassigned: number;
  overdueFollowUps: number;
  dueTodayFollowUps: number;
  itinerariesAwaitingPricing: number;
  spendYesterday: number;
  costPerLeadYesterday: number | null;
}

export interface AgingBuckets {
  d0_30: number;
  d30_60: number;
  d60_plus: number;
  total: number;
}

export interface ReceivableRow {
  id: string;
  bookingNumber: string;
  clientName: string;
  balance: number;
  ageDays: number;
  travelStartDate: string | null;
}

export interface PayableRow {
  id: string;
  description: string;
  vendorName: string;
  vendorId: string | null;
  bookingNumber: string;
  balance: number;
  ageDays: number;
}

export interface AgingReport {
  receivables: AgingBuckets & { rows: ReceivableRow[] };
  payables: AgingBuckets & { rows: PayableRow[] };
}

export type IntegrationCategory =
  | 'PAYMENT_DOMESTIC'
  | 'PAYMENT_INTERNATIONAL'
  | 'AI'
  | 'ADS'
  | 'SOCIAL'
  | 'ANALYTICS';

export type IntegrationTestStatus = 'UNTESTED' | 'OK' | 'FAILED';

export interface ProviderField {
  key: string;
  label: string;
  type: 'text' | 'password' | 'url' | 'select' | 'textarea';
  required?: boolean;
  placeholder?: string;
  help?: string;
  options?: string[];
}

export interface ProviderCatalogEntry {
  id: string;
  label: string;
  category: IntegrationCategory;
  docsUrl?: string;
  fields: ProviderField[];
  hasTest: boolean;
}

export interface IntegrationRow {
  id: string;
  category: IntegrationCategory;
  provider: string;
  label: string | null;
  isActive: boolean;
  priority: number;
  keysOnFile: string[];
  lastTestedAt: string | null;
  lastTestStatus: IntegrationTestStatus;
  lastTestMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IntegrationTestResponse extends IntegrationRow {
  testResult: { ok: boolean; message: string };
}

export interface UrgencyInfo {
  tier: 'P1' | 'P2' | 'P3' | 'P4';
  label: string;
  badgeColor: 'rose' | 'amber' | 'blue' | 'slate';
  reason: string;
}

export interface LeadRow {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  destination: string | null;
  status: string;
  source: string;
  utmSource?: string | null;
  utmCampaign?: string | null;
  score: number;
  scoreNotes?: string | null;
  urgency?: UrgencyInfo;
  createdAt: string;
  firstContactAt: string | null;
  assignedTo?: { id: string; name: string } | null;
}

export interface Paged<T> {
  total: number;
  page: number;
  limit: number;
  pages: number;
  data: T[];
}

export interface ActivityRow {
  id: string;
  type: string;
  content: string;
  createdAt: string;
  user?: { id: string; name: string } | null;
}

export interface LeadDetail extends LeadRow {
  city: string | null;
  country: string | null;
  travelDate: string | null;
  nights: number | null;
  adults: number | null;
  children: number | null;
  budget: number | null;
  message: string | null;
  scoreNotes: string | null;
  winProbability: number | null;
  heuristicNotes: string | null;
  lostReason: string | null;
  enquiryCount: number;
  lastContact: string | null;
  nextFollowUp: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmTerm: string | null;
  utmContent: string | null;
  gclid: string | null;
  fbclid: string | null;
  landingPage: string | null;
  referrer: string | null;
  keyword: string | null;
  device: string | null;
  activities: ActivityRow[];
}

export interface Advisory {
  breakEvenPerFile: number | null;
  minSellForPolicy: number;
  minSellForBreakEven: number | null;
  suggestedMinSell: number;
  shortfall: number;
  ok: boolean;
  warnings: string[];
}

export interface GstBreakdown {
  total: number;
  gstAmount: number;
  baseAmount: number;
  gstPercent: number;
}

export interface PricingSettings {
  defaultMarkupPercent: number;
  minMarginPercent: number;
  monthlyOverhead: number | null;
  filesPerMonth: number | null;
  gstPercent: number;
  roundTo: number;
  currency: string;
}

export interface VendorRateRow {
  id: string;
  variant: string;
  season: string;
  mealPlan: string | null;
  rateBasis: string;
  netRate: number;
  rackRate: number | null;
  vendor: {
    id: string;
    name: string;
    type: string;
    city: string | null;
    contactRedacted?: boolean;
  };
}

// ---- Reports ---------------------------------------------------------------

export interface RevenueRow {
  month: string;   // YYYY-MM
  revenue: number;
  bookings: number;
}

export interface StaffRow {
  userId: string;
  name: string;
  role: string;
  leadsAssigned: number;
  leadsConverted: number;
  conversionPercent: number;
  bookings: number;
  revenue: number;
  grossProfit: number;
  averageDeal: number;
}

export interface VendorSpendRow {
  vendorId: string;
  name: string;
  type: string;
  city: string | null;
  lineCount: number;
  amountDue: number;
  amountPaid: number;
  outstanding: number;
}

export interface CancellationsReport {
  total: number;
  cancelled: number;
  cancellationPercent: number;
  lostRevenue: number;
  byStatus: { status: string; count: number; revenue: number }[];
}

export interface SourceRow {
  source: string;
  count: number;
  percent: number;
}

// ---- Itineraries -----------------------------------------------------------

export type ItineraryItemKind =
  | 'STAY' | 'TRANSFER' | 'SIGHTSEEING' | 'MEAL' | 'ACTIVITY' | 'FREE_TIME' | 'NOTE';

export interface ItineraryItemPricingRow {
  id: string;
  itemId: string;
  optionId: string;
  vendorRateId: string | null;
  vendorId: string | null;
  unitNet: number;
  markupPercent: number | null;
  lineNet: number;
  lineSell: number;
}

export interface ItineraryOptionRow {
  id: string;
  name: string;
  sortOrder: number;
  isRecommended: boolean;
  markupPercent: number | null;
  totalNet: number;
  totalSell: number;
  totalMargin: number;
  marginPercent: number;
  markupPercentEffective: number;
  perPersonSell: number;
}

export interface ItineraryItemRow {
  id: string;
  kind: ItineraryItemKind;
  time: string | null;
  title: string;
  description: string | null;
  location: string | null;
  vendorId: string | null;
  sortOrder: number;
  quantity: number;
  units: number;
  priceable: boolean;
  vendor?: { id: string; name: string; type: string } | null;
  pricing?: ItineraryItemPricingRow[];
}

export interface ItineraryDayRow {
  id: string;
  dayNumber: number;
  date: string | null;
  city: string | null;
  headline: string | null;
  summary: string | null;
  items: ItineraryItemRow[];
}

export interface ItineraryListRow {
  id: string;
  code: string;
  title: string;
  headline: string | null;
  totalPax: number;
  createdAt: string;
  lead: { id: string; name: string; phone: string } | null;
  _count: { days: number };
}

export interface ItineraryDetail {
  id: string;
  code: string;
  title: string;
  headline: string | null;
  intro: string | null;
  totalPax: number;
  inclusions: string | null;
  exclusions: string | null;
  createdAt: string;
  lead: {
    id: string;
    name: string;
    phone: string;
    email: string | null;
    destination?: string | null;
    travelDate?: string | null;
  };
  options: ItineraryOptionRow[];
  days: ItineraryDayRow[];
  currency?: string;
  fxRate?: number;
}

export interface VendorRow {
  id: string;
  name: string;
  type: string;
  city: string | null;
  area: string | null;
  starRating: number | null;
  falconGrade: string | null;
  contactPerson: string | null;
  phone: string | null;
  altPhone: string | null;
  email: string | null;
  bankName: string | null;
  accountNumber: string | null;
  ifsc: string | null;
  gstin: string | null;
  panNumber: string | null;
  paymentTerms: string | null;
  unionZone: string | null;
  checkInTime: string | null;
  checkOutTime: string | null;
  roomCount: number | null;
  amenities: string[];
  notes: string | null;
  isActive: boolean;
  contactRedacted?: boolean;
  rates: VendorRateFullRow[];
}

export interface VendorLedgerRow {
  id: string;
  createdAt: string;
  description: string;
  amountDue: number;
  amountPaid: number;
  paidAt: string | null;
  reference: string | null;
  notes: string | null;
  booking: {
    id: string;
    bookingNumber: string;
    packageName: string | null;
    travelStartDate: string | null;
    status: string;
    clientName: string;
  };
}

export interface VendorLedgerResponse {
  vendor: {
    id: string;
    name: string;
    type: string;
    city: string | null;
    isActive: boolean;
  };
  totals: {
    rowCount: number;
    totalDue: number;
    totalPaid: number;
    outstanding: number;
  };
  rows: VendorLedgerRow[];
}

export interface VendorRateFullRow {
  id: string;
  variant: string;
  season: string;
  mealPlan: string | null;
  rateBasis: string;
  netRate: number;
  rackRate: number | null;
  extraBedRate: number | null;
  childRate: number | null;
  maxOccupancy: number | null;
  validFrom: string | null;
  validTo: string | null;
  notes: string | null;
  isActive: boolean;
}

export interface UserRow {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
}

export interface VendorRateRow {
  id: string;
  variant: string;
  season: string;
  mealPlan: string | null;
  rateBasis: string;
  netRate: number;
  rackRate: number | null;
  vendor: {
    id: string;
    name: string;
    type: string;
    city: string | null;
    contactRedacted?: boolean;
  };
}

export interface PricingSettings {
  defaultMarkupPercent: number;
  minMarginPercent: number;
  monthlyOverhead: number | null;
  filesPerMonth: number | null;
  roundTo: number;
  gstPercent: number;
}

// ---- bookings -------------------------------------------------------------

export interface BookingFinancials {
  totalSell: number;
  totalNet: number;
  totalReceived: number;
  totalCostPaid: number;
  totalCostDue: number;
  balanceDue: number;
  vendorOutstanding: number;
  quotedProfit: number;
  quotedMarginPercent: number;
  actualProfit: number;
  actualMarginPercent: number;
  marginVariance: number;
  netCashPosition: number;
  fullyPaid: boolean;
  overpaid: boolean;
}

export interface BookingRow {
  id: string;
  bookingNumber: string;
  status: string;
  packageName: string | null;
  travelStartDate: string | null;
  travelEndDate: string | null;
  adults: number;
  children: number;
  nights: number;
  totalSell: number;
  totalNet: number;
  createdAt: string;
  lead: { id: string; name: string; phone: string } | null;
  financials: BookingFinancials;
}

export interface BookingPayment {
  id: string;
  amount: number;
  mode: string;
  reference: string | null;
  receivedAt: string;
  dueDate?: string | null;
  notes: string | null;
  isRefund: boolean;
  verificationStatus?: string;
  verifiedById?: string | null;
  verifiedBy?: { id: string; name: string } | null;
  verifiedAt?: string | null;
  recordedBy?: { id: string; name: string } | null;
}

export interface BookingCost {
  id: string;
  vendorId: string | null;
  description: string;
  amountDue: number;
  amountPaid: number;
  paidAt: string | null;
  dueDate?: string | null;
  reference: string | null;
  notes: string | null;
  confirmationStatus?: string | null;
  confirmationRef?: string | null;
}

export interface UnverifiedPaymentItem {
  id: string;
  bookingId: string;
  amount: number;
  paymentMethod: string;
  reference: string | null;
  receivedAt: string;
  dueDate?: string | null;
  notes: string | null;
  verificationStatus: string;
  booking: {
    id: string;
    bookingNumber: string;
    packageName: string | null;
    lead: { id: string; name: string; phone: string | null };
  };
  recordedBy?: { id: string; name: string } | null;
}

export interface OverdueReceivableItem {
  id: string;
  bookingNumber: string;
  packageName: string | null;
  totalSell: number;
  totalReceived: number;
  balanceDue: number;
  travelStartDate: string | null;
  effectiveDueDate?: string | null;
  daysUntilDue?: number | null;
  isDueNext7Days?: boolean;
  lead: { id: string; name: string; phone: string | null };
}

export interface PendingReservationItem {
  id: string;
  bookingId: string;
  serviceType: string;
  description: string;
  costAmount: number;
  confirmationStatus: string;
  booking: { id: string; bookingNumber: string; packageName: string | null };
}

export interface SupplierPayableItem {
  id: string;
  bookingId: string;
  bookingNumber: string;
  packageName: string | null;
  description: string;
  vendorId: string | null;
  amountDue: number;
  amountPaid: number;
  balanceDue: number;
  effectiveDueDate: string | null;
  daysUntilDue: number | null;
  isDueNext7Days: boolean;
  confirmationStatus: string;
}

export interface PaymentWorkQueueResponse {
  unverifiedPayments: UnverifiedPaymentItem[];
  overdueReceivables: OverdueReceivableItem[];
  pendingReservations: PendingReservationItem[];
  supplierPayables?: SupplierPayableItem[];
  dueNext7Days?: {
    receivablesCount: number;
    receivablesAmount: number;
    payablesCount: number;
    payablesAmount: number;
  };
}

// ---- attribution ----------------------------------------------------------

export interface LandingPageRow {
  id: string;
  slug: string;
  name: string;
  url: string | null;
  campaign: string | null;
  isActive: boolean;
}

export interface AdSpendRow {
  id: string;
  /** 'google_ads' when the row came from a platform sync; null when typed by hand. */
  externalSource?: string | null;
  externalId?: string | null;
  syncedAt?: string | null;
  spendDate: string;
  channel: string;
  campaign: string | null;
  adGroup: string | null;
  landingPageId: string | null;
  landingPage: { id: string; name: string; slug: string } | null;
  amount: number;
  currency: string;
  impressions: number | null;
  clicks: number | null;
  notes: string | null;
}

export interface PageReportRow {
  id: string;
  slug: string;
  name: string;
  campaign: string | null;
  isActive: boolean;
  visits: number;
  leads: number;
  bookings: number;
  revenue: number;
  spend: number;
  conversionPercent: number;
  bookingRatePercent: number;
  costPerLead: number | null;
  costPerBooking: number | null;
  roas: number | null;
}

export interface DailyReportRow {
  day: string;
  spend: number;
  leads: number;
  costPerLead: number | null;
}

// ---- HR --------------------------------------------------------------------

export interface EmployeeRow {
  id: string;
  code: string;
  fullName: string;
  designation: string;
  department: string | null;
  phone: string;
  email: string | null;
  status: string;
  employmentType: string;
  joinedOn: string;
  photoUrl: string | null;
  reportsTo?: { id: string; fullName: string; code: string } | null;
}

export interface EmployeeDetail extends EmployeeRow {
  fatherName: string | null;
  bloodGroup: string | null;
  dob: string | null;
  gender: string | null;
  nationality: string | null;
  altPhone: string | null;
  addressLine: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  emergencyContactRelation: string | null;
  aadhaar: string | null;
  pan: string | null;
  confirmedOn: string | null;
  exitedOn: string | null;
  ctcMonthly: number | null;
  basicMonthly: number | null;
  hraMonthly: number | null;
  allowMonthly: number | null;
  pfMonthly: number | null;
  esiMonthly: number | null;
  taxMonthly: number | null;
  otherDedMonthly: number | null;
  bankName: string | null;
  accountNumber: string | null;
  ifsc: string | null;
  notes: string | null;
  user?: { id: string; email: string; role: string } | null;
  salarySlips: SalarySlipRow[];
  reports: {
    id: string;
    fullName: string;
    code: string;
    designation: string;
    status: string;
  }[];
}

export interface SalarySlipRow {
  id: string;
  periodMonth: string;
  daysWorked: number | null;
  daysInMonth: number | null;
  lop: number | null;
  basic: number;
  hra: number;
  allowances: number;
  bonus: number;
  arrears: number;
  pf: number;
  esi: number;
  tax: number;
  otherDed: number;
  grossPay: number;
  totalDed: number;
  netPay: number;
  paidOn: string | null;
  reference: string | null;
}

export interface EmployeePerformance {
  linked: boolean;
  message?: string;
  leadsAssigned?: number;
  leadsConverted?: number;
  conversionPercent?: number;
  quotesCreated?: number;
  bookingsCreated?: number;
  revenue?: number;
  grossProfit?: number;
  averageDealSize?: number;
}

export interface InterviewRow {
  id: string;
  candidateName: string;
  candidatePhone: string;
  candidateEmail: string | null;
  role: string;
  scheduledAt: string;
  durationMinutes: number | null;
  interviewerName: string | null;
  interviewer: { id: string; fullName: string } | null;
  overallRating: number | null;
  outcome: string;
}

export interface InterviewDetail extends InterviewRow {
  questionnaire: { question: string; answer?: string; rating?: number }[];
  strengths: string | null;
  concerns: string | null;
  outcomeNote: string | null;
}

// ---- SEO -------------------------------------------------------------------

export interface SeoSiteRow {
  id: string;
  name: string;
  url: string;
  crawlPaths: string[];
  isActive: boolean;
  lastRunAt: string | null;
  avgScore: number | null;
  pageCount: number;
}

export interface SeoCheck {
  id: string;
  label: string;
  category?: 'on-page' | 'content' | 'technical' | 'trust-moat';
  severity: 'pass' | 'warn' | 'fail';
  weight: number;
  score?: number;
  detail?: string;
  task?: string;
}

export interface SeoAuditRow {
  id: string;
  siteId: string;
  runId: string;
  url: string;
  score: number;
  perfScore: number | null;
  a11yScore: number | null;
  bpScore: number | null;
  seoScore: number | null;
  lcpMs: number | null;
  clsX1k: number | null;
  inpMs: number | null;
  checks: { results: SeoCheck[] } | null;
  tasks: { id: string; severity: 'pass' | 'warn' | 'fail'; label: string; task: string }[] | null;
  errors: string | null;
  createdAt: string;
}

export interface SeoAuditResponse {
  site: SeoSiteRow;
  pages: SeoAuditRow[];
}

export interface SeoOffPageData {
  backlinkCount: number;
  referringDomains: number;
  pageAuthority: number | null;
  prMentions: number;
  socialShares: number;
  searchConsoleCtr: number | null;
  notes: string | null;
  updatedAt?: string;
}

/**
 * Site-wide off-page signals. One row per site, unlike SeoOffPageData which is
 * per-URL. GBP, reviews and citations belong to the domain, so these lift every
 * page's score by the same amount.
 */
export interface SeoDomainSignalsData {
  gbpCompleteness: number | null;
  gbpReviewCount: number | null;
  gbpAverageRating: number | null;
  gbpPostsLast30d: number | null;
  citationsTotal: number | null;
  citationsNapConsistent: number | null;
  brandMentionsLinked: number | null;
  brandMentionsUnlinked: number | null;
  referringDomainsTotal: number | null;
  toxicDomainCount: number | null;
  verifiedOn: string | null;
  notes: string | null;
  updatedAt?: string;
  /** Returned by the update endpoint: how many page scores moved. */
  rescoredPages?: number;
}

/** One query ranking just off page one, from stored Search Console data. */
export interface SeoStrikingDistanceRow {
  page: string;
  query: string;
  clicks: number;
  impressions: number;
  /** PERCENT, 0-100. */
  ctr: number;
  /** Average position. Lower is better. */
  position: number;
}

export interface SeoSearchConsoleSyncResult {
  property: string;
  from: string;
  to: string;
  rowsFetched: number;
  created: number;
  updated: number;
  pagesTouched: number;
  totalClicks: number;
  totalImpressions: number;
  /** Page CTR values written back into SeoOffPage for scoring. */
  offPageRowsUpdated: number;
  /** Number of latest page audit scores recomputed and updated. */
  rescoredAudits?: number;
  /** Site, page, device and country totals stored. */
  dimensionRows?: number;
}

// ---- Search Console dashboard ------------------------------------------------

export type SearchIssueType =
  | 'cannibalisation'
  | 'low_ctr'
  | 'striking_distance'
  | 'declining_page'
  | 'position_drop'
  | 'lost_query'
  | 'off_target'
  | 'no_visibility'
  | 'new_query';

export type SearchSeverity = 'high' | 'medium' | 'low' | 'info';

export interface SearchMetric {
  clicks: number;
  impressions: number;
  /** PERCENT, 0-100. */
  ctr: number;
  position: number;
}

export interface SearchDelta {
  abs: number;
  pct: number | null;
}

export interface SearchIssuePage {
  url: string;
  path: string;
  clicks: number;
  impressions: number;
  position: number;
  share: number;
  tier?: number | null;
  adsImpressions?: number | null;
}

export interface SearchIssue {
  id: string;
  type: SearchIssueType;
  severity: SearchSeverity;
  title: string;
  url: string | null;
  path: string | null;
  query: string | null;
  pages?: SearchIssuePage[];
  metrics: Record<string, number | string | null>;
  action: string;
  impact: number;
}

export interface SearchEntityRow {
  key: string;
  url?: string;
  path?: string | null;
  label: string;
  current: SearchMetric;
  previous: SearchMetric;
  clicksDelta: SearchDelta;
  positionDelta: number | null;
  brand?: boolean;
}

export interface SearchReport {
  days: number;
  siteHost: string;
  windows: { current: { from: string; to: string }; previous: { from: string; to: string } };
  hasData: boolean;
  hasPrevious: boolean;
  /** Earliest day in the loaded span with any impressions. */
  dataFrom: string | null;
  lastSyncedAt?: string | null;
  overview: {
    current: SearchMetric;
    previous: SearchMetric;
    delta: { clicks: SearchDelta; impressions: SearchDelta; ctr: number | null; position: number | null };
  };
  series: { date: string; clicks: number; impressions: number; prevClicks: number | null; prevImpressions: number | null }[];
  ctrBenchmarks: Record<string, number | null>;
  topPages: SearchEntityRow[];
  topQueries: SearchEntityRow[];
  devices: SearchEntityRow[];
  countries: SearchEntityRow[];
  brand: { terms: string[]; brand: SearchMetric; nonBrand: SearchMetric };
  issues: SearchIssue[];
  issueCounts: Record<SearchIssueType, number>;
  notes: string[];
}

/** Search Console figures attached to a page in the rankings table. */
export interface SeoPageSearch {
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  clicksDelta: SearchDelta;
  positionDelta: number | null;
  issueCount: number;
}

export interface SeoRankedPage {
  url: string;
  path: string;
  title: string;
  h1?: string;
  tier?: number;
  family?: string;
  targetKeyword?: string;
  impr?: number | null;
  clicks?: number | null;
  conv?: number | null;
  words?: string | null;
  auditId: string | null;
  lastAuditedAt: string | null;
  score: number | null;
  perfScore: number | null;
  seoScore: number | null;
  lcpMs: number | null;
  clsX1k: number | null;
  inpMs: number | null;
  checks: SeoCheck[];
  tasks: { id: string; severity: 'pass' | 'warn' | 'fail'; label: string; task: string; category?: string }[];
  errors: string | null;
  offPage: SeoOffPageData | null;
  /** Search Console figures for the current 28 days, or null when none are synced. */
  search?: SeoPageSearch | null;
}

export interface SeoRankingsResponse {
  site: SeoSiteRow;
  stats: {
    totalPages: number;
    auditedPages: number;
    averageScore: number | null;
    highScoreCount: number;
    medScoreCount: number;
    lowScoreCount: number;
  };
  rankings: SeoRankedPage[];
}

export interface MediaAssetRow {
  id: string;
  url: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  width?: number | null;
  height?: number | null;
  altText: string;
  caption?: string | null;
  tags: string[];
  pageSlug?: string | null;
  folder: string;
  uploadedById: string;
  uploadedBy?: { id: string; name: string; email: string };
  createdAt: string;
  updatedAt: string;
}

export interface PageManifestItem {
  url: string;
  title: string;
  h1?: string;
  tier?: number;
  family?: string;
  primary?: string;
}

export interface BookingDetail {
  id: string;
  bookingNumber: string;
  status: string;
  packageName: string | null;
  travelStartDate: string | null;
  travelEndDate: string | null;
  adults: number;
  children: number;
  nights: number;
  totalSell: number;
  totalNet: number;
  totalReceived: number;
  totalCostPaid: number;
  notes: string | null;
  cancelledReason: string | null;
  itineraryId: string | null;
  itineraryOptionId: string | null;
  createdAt: string;
  lead: { id: string; name: string; phone: string; email: string | null };
  payments: BookingPayment[];
  costs: BookingCost[];
  financials: BookingFinancials;
  fleetAssignments?: FleetAssignmentRow[];
  permitApplications?: PermitApplicationRow[];
  operationsOwnerId?: string | null;
  operationsOwner?: { id: string; name: string; email: string } | null;
  handedOverAt?: string | null;
  handedOverById?: string | null;
  handedOverBy?: { id: string; name: string } | null;
  handoverNotes?: string | null;
  currency?: string;
  fxRate?: number;
}

export interface CampaignRow {
  id: string;
  name: string;
  channel: 'WHATSAPP' | 'EMAIL';
  status: 'DRAFT' | 'SCHEDULED' | 'SENDING' | 'SENT' | 'CANCELLED' | 'FAILED';
  audienceFilter: any;
  targetCount: number;
  templateName?: string | null;
  templateLang?: string | null;
  templateParams?: any;
  emailSubject?: string | null;
  emailHtml?: string | null;
  scheduledAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  totalSent: number;
  totalDelivered: number;
  totalRead: number;
  totalFailed: number;
  estimatedCost: number;
  createdAt: string;
  updatedAt: string;
  createdBy?: { id: string; name: string; email: string };
  recipients?: CampaignRecipientRow[];
  metrics?: {
    pending: number;
    sent: number;
    delivered: number;
    read: number;
    failed: number;
    bounced: number;
    unsubscribed: number;
  };
}

export interface CampaignRecipientRow {
  id: string;
  campaignId: string;
  leadId?: string | null;
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  status: 'PENDING' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED' | 'BOUNCED' | 'UNSUBSCRIBED';
  externalId?: string | null;
  errorMessage?: string | null;
  sentAt?: string | null;
  deliveredAt?: string | null;
  readAt?: string | null;
  unsubscribedAt?: string | null;
  createdAt: string;
}

export interface AudiencePreviewResult {
  totalMatched: number;
  optOutCount: number;
  frequencyCappedCount: number;
  eligibleCount: number;
  estimatedCost: number;
  sampleLeads: { id: string; name: string; phone: string; email: string | null; destination: string | null }[];
}
export interface MovementGuestCard {
  bookingId: string;
  bookingNumber: string;
  guestName: string;
  phone: string;
  email?: string | null;
  pax: number;
  adults: number;
  children: number;
  packageName?: string | null;
  dayOfTrip: number;
  totalNights: number;
  currentValley: string;
  currentHotel: string;
  travelStartDate?: string | null;
  travelEndDate?: string | null;
}

export interface InTransitMovement {
  bookingId: string;
  bookingNumber: string;
  guestName: string;
  phone: string;
  pax: number;
  sector: string;
}

export interface DailyMovementResponse {
  date: string;
  summary: {
    totalGuestsInDestination: number;
    activeBookingsCount: number;
    arrivalsToday: number;
    departuresToday: number;
    highPassCrossingsToday: number;
  };
  arrivals: MovementGuestCard[];
  departures: MovementGuestCard[];
  inTransit: InTransitMovement[];
  valleyDistribution: {
    leh: MovementGuestCard[];
    nubra: MovementGuestCard[];
    pangong: MovementGuestCard[];
    other: MovementGuestCard[];
  };
}

// ---- Revisions -----------------------------------------------------------

export interface ItineraryRevisionRow {
  id: string;
  itineraryId: string;
  revisionNumber: number;
  title: string;
  totalPax: number;
  totalNet: number;
  totalSell: number;
  perPersonSell: number;
  changeSummary: string | null;
  isAccepted: boolean;
  createdAt: string;
  createdBy?: { id: string; name: string; email: string } | null;
  snapshot?: any;
}

// ---- Fleet ---------------------------------------------------------------

export interface VehicleRow {
  id: string;
  plateNumber: string;
  makeModel: string;
  vehicleType: string;
  ownership: string;
  capacity: number;
  seatingConfig: string | null;
  fuelType: string | null;
  vendorId: string | null;
  defaultDriverId: string | null;
  insuranceExpiry: string | null;
  fitnessExpiry: string | null;
  permitExpiry: string | null;
  pucExpiry: string | null;
  isActive: boolean;
  notes: string | null;
  vendor?: { id: string; name: string; phone: string } | null;
  defaultDriver?: { id: string; name: string; phone: string } | null;
  _count?: { assignments: number };
}

export interface DriverRow {
  id: string;
  name: string;
  phone: string;
  altPhone: string | null;
  licenseNumber: string;
  licenseExpiry: string | null;
  policeVerified: boolean;
  bloodGroup: string | null;
  isLocalLadakhi: boolean;
  badgeNumber: string | null;
  vendorId: string | null;
  employeeId: string | null;
  rating: number | null;
  isActive: boolean;
  notes: string | null;
  vendor?: { id: string; name: string } | null;
  employee?: { id: string; designation: string } | null;
  _count?: { assignments: number };
}

export interface FleetAssignmentRow {
  id: string;
  bookingId: string;
  vehicleId: string | null;
  driverId: string | null;
  startDate: string;
  endDate: string;
  circuit: string;
  pickupLocation: string | null;
  dropLocation: string | null;
  status: string;
  dutySlipNumber: string | null;
  startKm: number | null;
  endKm: number | null;
  fuelAllowance: number;
  driverBatta: number;
  parkingTollPaid: number;
  notes: string | null;
  vehicle?: VehicleRow | null;
  driver?: DriverRow | null;
  booking?: { id: string; bookingNumber: string; packageName: string | null; adults?: number; children?: number } | null;
  assignedBy?: { id: string; name: string } | null;
}

// ---- Permits -------------------------------------------------------------

export interface PermitTravellerRow {
  id: string;
  permitApplicationId: string;
  fullName: string;
  age: number | null;
  gender: string | null;
  nationality: string;
  stateOrCountry: string | null;
  idType: string;
  idNumber: string;
  idDocumentUrl: string | null;
  passportIssueDate: string | null;
  passportExpiryDate: string | null;
  visaNumber: string | null;
  visaExpiryDate: string | null;
}

export interface PermitApplicationRow {
  id: string;
  bookingId: string;
  permitType: 'ILP_DOMESTIC' | 'PAP_FOREIGN';
  status: 'DRAFT' | 'PENDING_DOCS' | 'DOCS_VERIFIED' | 'APPLIED_DC_OFFICE' | 'ISSUED' | 'REJECTED';
  sectors: string[];
  validFrom: string;
  validTo: string;
  dcOfficeRef: string | null;
  permitNumber: string | null;
  issuedAt: string | null;
  environmentalFee: number;
  wildlifeFee: number;
  redCrossFee: number;
  totalFee: number;
  feeReceiptNumber: string | null;
  documentScanUrl: string | null;
  rejectedReason: string | null;
  notes: string | null;
  booking?: {
    id: string;
    bookingNumber: string;
    packageName: string | null;
    lead?: { name: string; phone: string; email: string | null } | null;
  } | null;
  travellers: PermitTravellerRow[];
  createdBy?: { id: string; name: string } | null;
}

