// Mirrors app/schemas/* and app/models/* in the plutus-hr-system (FastAPI) backend.
// Money fields are minor units (kobo); dates are ISO date strings; datetimes are ISO strings.

export type Role = "admin" | "payroll_manager" | "manager" | "employee";

export type PayFrequency = "monthly" | "weekly" | "biweekly";
export type EmploymentType =
  | "permanent"
  | "fixed_term"
  | "part_time"
  | "intern"
  | "consultant";
export type LifecycleState = "active" | "suspended" | "terminated";
export type PayRunStatus = "draft" | "processing" | "completed" | "failed";
export type LeaveType = "annual" | "sick" | "maternity" | "paternity" | "unpaid";
export type LeaveStatus = "pending" | "approved" | "rejected" | "cancelled";
export type ExpenseStatus = "pending" | "approved" | "rejected" | "reimbursed";
export type LoanStatus = "active" | "paid_off" | "cancelled";
export type BenefitFrequency = "one_time" | "monthly" | "annual";
export type LiabilityScheme = "paye" | "pension" | "nhf" | "nsitf" | "itf" | "wht";
export type LiabilityStatus = "pending" | "filed" | "remitted";

// --- auth ---

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface MeResponse {
  account_id: string;
  org_id: string;
  role: Role;
  org_name: string;
}

// --- employees ---

export interface Employee {
  id: string;
  org_id: string;
  account_id: string | null;
  employee_number: string;
  full_name: string;
  state_of_residence: string;
  employment_type: EmploymentType;
  lifecycle_state: LifecycleState;
  date_of_joining: string;
  job_title: string | null;
  manager_id: string | null;
  department_id: string | null;
  job_grade_id: string | null;
  shift_id: string | null;
  tin: string | null;
  basic_minor: number;
  housing_minor: number;
  transport_minor: number;
  other_earnings_minor: number;
  annual_rent_paid_minor: number;
  pay_frequency: PayFrequency;
  annual_leave_entitlement_days: number;
  created_at: string;
}

export interface EmployeeCreateBody {
  employee_number: string;
  full_name: string;
  state_of_residence: string;
  employment_type: EmploymentType;
  date_of_joining: string;
  basic_minor: number;
  housing_minor: number;
  transport_minor: number;
  other_earnings_minor?: number;
  annual_rent_paid_minor?: number;
  pay_frequency?: PayFrequency;
  annual_leave_entitlement_days?: number;
  date_of_birth?: string;
  gender?: string;
  nationality?: string;
  marital_status?: string;
  email?: string;
  phone?: string;
  residential_address?: string;
  next_of_kin_name?: string;
  next_of_kin_phone?: string;
  tin?: string;
  pfa_name?: string;
  rsa_pin?: string;
  nhf_number?: string;
  job_title?: string;
  manager_id?: string;
  department_id?: string;
  job_grade_id?: string;
  shift_id?: string;
}

// --- departments ---

export interface Department {
  id: string;
  org_id: string;
  name: string;
  manager_id: string | null;
  created_at: string;
}

export interface DepartmentCreateBody {
  name: string;
  manager_id?: string | null;
}

export interface DepartmentUpdateBody {
  name?: string;
  manager_id?: string | null;
}

// --- branches ---

export interface Branch {
  id: string;
  org_id: string;
  name: string;
  state: string | null;
  address: string | null;
  manager_id: string | null;
  created_at: string;
}

export interface BranchCreateBody {
  name: string;
  state?: string | null;
  address?: string | null;
  manager_id?: string | null;
}

export interface BranchUpdateBody {
  name?: string;
  state?: string | null;
  address?: string | null;
  manager_id?: string | null;
}

// --- job grades ---

export interface JobGrade {
  id: string;
  org_id: string;
  name: string;
  level: number | null;
  min_salary_minor: number | null;
  max_salary_minor: number | null;
  created_at: string;
}

export interface JobGradeCreateBody {
  name: string;
  level?: number | null;
  min_salary_minor?: number | null;
  max_salary_minor?: number | null;
}

export interface JobGradeUpdateBody {
  name?: string;
  level?: number | null;
  min_salary_minor?: number | null;
  max_salary_minor?: number | null;
}

// --- shifts ---
// start_time/end_time are "HH:MM:SS" wall-clock strings, no date component.

export interface Shift {
  id: string;
  org_id: string;
  name: string;
  start_time: string;
  end_time: string;
  created_at: string;
}

export interface ShiftCreateBody {
  name: string;
  start_time: string;
  end_time: string;
}

export interface ShiftUpdateBody {
  name?: string;
  start_time?: string;
  end_time?: string;
}

// --- recruitment ---

export type JobPostingStatus = "open" | "closed";
export type CandidateStatus = "applied" | "interviewing" | "offered" | "hired" | "rejected";

export interface JobPosting {
  id: string;
  org_id: string;
  department_id: string | null;
  title: string;
  description: string | null;
  status: JobPostingStatus;
  opened_date: string;
  closed_date: string | null;
  created_at: string;
}

export interface JobPostingCreateBody {
  title: string;
  department_id?: string | null;
  description?: string | null;
  opened_date: string;
}

export interface JobPostingUpdateBody {
  title?: string;
  department_id?: string | null;
  description?: string | null;
  status?: JobPostingStatus;
  closed_date?: string | null;
}

export interface Candidate {
  id: string;
  org_id: string;
  job_posting_id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  status: CandidateStatus;
  applied_date: string;
  created_at: string;
}

export interface CandidateCreateBody {
  full_name: string;
  email?: string | null;
  phone?: string | null;
  applied_date: string;
}

export interface CandidateUpdateBody {
  full_name?: string;
  email?: string | null;
  phone?: string | null;
  status?: CandidateStatus;
}

// --- performance reviews ---

export type PerformanceReviewStatus = "draft" | "submitted" | "acknowledged";

export interface PerformanceReview {
  id: string;
  org_id: string;
  employee_id: string;
  reviewer_id: string | null;
  period_start: string;
  period_end: string;
  status: PerformanceReviewStatus;
  rating: number | null;
  goals: string | null;
  manager_comments: string | null;
  employee_comments: string | null;
  submitted_date: string | null;
  acknowledged_date: string | null;
  created_at: string;
}

export interface PerformanceReviewCreateBody {
  employee_id: string;
  reviewer_id?: string | null;
  period_start: string;
  period_end: string;
  goals?: string | null;
}

export interface PerformanceReviewSubmitBody {
  rating?: number | null;
  manager_comments?: string | null;
}

export interface PerformanceReviewAcknowledgeBody {
  employee_comments?: string | null;
}

// --- learning & development ---

export type TrainingEnrollmentStatus = "enrolled" | "in_progress" | "completed" | "failed";

export interface TrainingCourse {
  id: string;
  org_id: string;
  title: string;
  description: string | null;
  provider: string | null;
  duration_hours: number | null;
  created_at: string;
}

export interface TrainingCourseCreateBody {
  title: string;
  description?: string | null;
  provider?: string | null;
  duration_hours?: number | null;
}

export interface TrainingCourseUpdateBody {
  title?: string;
  description?: string | null;
  provider?: string | null;
  duration_hours?: number | null;
}

export interface TrainingEnrollment {
  id: string;
  org_id: string;
  course_id: string;
  employee_id: string;
  status: TrainingEnrollmentStatus;
  enrolled_date: string;
  completed_date: string | null;
  score: number | null;
  created_at: string;
}

export interface TrainingEnrollmentCreateBody {
  employee_id: string;
  enrolled_date: string;
}

export interface TrainingEnrollmentUpdateBody {
  status?: TrainingEnrollmentStatus;
  completed_date?: string | null;
  score?: number | null;
}

// --- employee relations ---

export type DisciplinaryCaseCategory =
  | "misconduct"
  | "attendance"
  | "policy_violation"
  | "harassment"
  | "other";
export type DisciplinaryCaseStatus = "open" | "under_review" | "resolved" | "dismissed";
export type DisciplinaryCaseAction =
  | "none"
  | "verbal_warning"
  | "written_warning"
  | "suspension"
  | "termination";

export interface DisciplinaryCase {
  id: string;
  org_id: string;
  employee_id: string;
  reported_by_id: string | null;
  category: DisciplinaryCaseCategory;
  description: string;
  status: DisciplinaryCaseStatus;
  incident_date: string;
  action_taken: DisciplinaryCaseAction | null;
  resolution_notes: string | null;
  resolution_date: string | null;
  created_at: string;
}

export interface DisciplinaryCaseCreateBody {
  employee_id: string;
  reported_by_id?: string | null;
  category: DisciplinaryCaseCategory;
  description: string;
  incident_date: string;
}

export interface DisciplinaryCaseUpdateBody {
  category?: DisciplinaryCaseCategory;
  description?: string;
  status?: DisciplinaryCaseStatus;
}

export interface DisciplinaryCaseResolveBody {
  action_taken: DisciplinaryCaseAction;
  resolution_notes?: string | null;
}

// --- notifications ---

export interface Notification {
  id: string;
  org_id: string;
  account_id: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

export interface NotificationBroadcastBody {
  title: string;
  body?: string | null;
  link?: string | null;
}

export interface NotificationUnreadCount {
  unread_count: number;
}

// --- union dues ---

export type UnionMembershipStatus = "active" | "suspended" | "terminated";

export interface UnionMembership {
  id: string;
  org_id: string;
  employee_id: string;
  union_name: string;
  membership_number: string | null;
  monthly_dues_minor: number;
  status: UnionMembershipStatus;
  joined_date: string;
  terminated_date: string | null;
  created_at: string;
}

export interface UnionMembershipCreateBody {
  union_name: string;
  monthly_dues_minor: number;
  joined_date: string;
  membership_number?: string | null;
}

export interface UnionMembershipUpdateBody {
  union_name?: string;
  membership_number?: string | null;
  monthly_dues_minor?: number;
  status?: UnionMembershipStatus;
}

export interface UnionMembershipTerminateBody {
  terminated_date: string;
}

// --- company assets ---

export type CompanyAssetCategory = "laptop" | "phone" | "vehicle" | "furniture" | "other";
export type CompanyAssetStatus = "available" | "assigned" | "maintenance" | "retired";

export interface CompanyAsset {
  id: string;
  org_id: string;
  name: string;
  asset_tag: string;
  category: CompanyAssetCategory;
  status: CompanyAssetStatus;
  purchase_date: string | null;
  purchase_value_minor: number | null;
  created_at: string;
}

export interface CompanyAssetCreateBody {
  name: string;
  asset_tag: string;
  category: CompanyAssetCategory;
  purchase_date?: string | null;
  purchase_value_minor?: number | null;
}

export interface CompanyAssetUpdateBody {
  name?: string;
  category?: CompanyAssetCategory;
  status?: CompanyAssetStatus;
  purchase_date?: string | null;
  purchase_value_minor?: number | null;
}

export interface AssetAssignment {
  id: string;
  org_id: string;
  asset_id: string;
  employee_id: string;
  assigned_date: string;
  returned_date: string | null;
  condition_notes: string | null;
  created_at: string;
}

export interface AssetAssignmentCreateBody {
  employee_id: string;
  assigned_date: string;
}

export interface AssetAssignmentReturnBody {
  returned_date: string;
  condition_notes?: string | null;
}

// --- api keys ---

export interface ApiKey {
  id: string;
  org_id: string;
  name: string;
  key_prefix: string;
  revoked_at: string | null;
  created_at: string;
}

export interface ApiKeyCreated extends ApiKey {
  key: string;
}

export interface ApiKeyCreateBody {
  name: string;
}

// --- policies ---

export interface Policy {
  id: string;
  org_id: string;
  title: string;
  category: string | null;
  body: string;
  effective_date: string | null;
  created_at: string;
}

export interface PolicyCreateBody {
  title: string;
  body: string;
  category?: string | null;
  effective_date?: string | null;
}

export interface PolicyUpdateBody {
  title?: string;
  body?: string;
  category?: string | null;
  effective_date?: string | null;
}

// --- payroll ---

export interface PayRunCreateBody {
  period_start: string;
  period_end: string;
  frequency: PayFrequency;
  employee_ids?: string[];
}

export interface PayRun {
  id: string;
  org_id: string;
  period_start: string;
  period_end: string;
  frequency: PayFrequency;
  status: PayRunStatus;
  rule_version_id: string | null;
  employee_count: number;
  gross_minor: number;
  net_minor: number;
  created_at: string;
  completed_at: string | null;
}

export interface Payslip {
  id: string;
  pay_run_id: string;
  employee_id: string;
  period_start: string;
  period_end: string;
  gross_minor: number;
  pensionable_pay_minor: number;
  pension_employee_minor: number;
  pension_employer_minor: number;
  nhf_minor: number;
  paye_minor: number;
  net_minor: number;
  cumulative_chargeable_income_minor: number;
  rule_version_id: string;
  derivation: Record<string, unknown>;
  created_at: string;
}

export interface Disbursement {
  csv_content: string;
  total_minor: number;
  skipped_employee_numbers: string[];
}

// --- dashboard ---

export interface OrgSummary {
  active_employee_count: number;
  last_completed_pay_run: PayRun | null;
  outstanding_liability_minor: number;
  pending_leave_request_count: number;
  pending_expense_count: number;
}

// --- leave ---

export interface LeaveRequest {
  id: string;
  employee_id: string;
  leave_type: LeaveType;
  start_date: string;
  end_date: string;
  days: number;
  status: LeaveStatus;
  reason: string | null;
  created_at: string;
  decided_at: string | null;
}

export interface LeaveBalance {
  entitlement_days: number;
  taken_days: number;
  remaining_days: number;
}

// --- expenses ---

export interface Expense {
  id: string;
  employee_id: string;
  category: string;
  description: string;
  amount_minor: number;
  expense_date: string;
  status: ExpenseStatus;
  created_at: string;
  decided_at: string | null;
  reimbursed_at: string | null;
}

// --- loans ---

export interface Loan {
  id: string;
  employee_id: string;
  principal_minor: number;
  num_installments: number;
  installment_minor: number;
  start_date: string;
  status: LoanStatus;
  outstanding_minor: number;
  created_at: string;
}

// --- benefits ---

export interface Benefit {
  id: string;
  employee_id: string;
  name: string;
  description: string | null;
  value_minor: number | null;
  frequency: BenefitFrequency;
  effective_date: string;
  end_date: string | null;
  created_at: string;
}

// --- contractors ---

export interface Contractor {
  id: string;
  org_id: string;
  name: string;
  tin: string | null;
  bank_name: string | null;
  account_number: string | null;
  account_name: string | null;
  created_at: string;
}

export interface WhtPayment {
  id: string;
  contractor_id: string;
  category: string;
  gross_amount_minor: number;
  wht_amount_minor: number;
  net_amount_minor: number;
  payment_date: string;
  due_date: string;
  certificate_number: string;
  rule_version_id: string;
  created_at: string;
}

// --- statutory liabilities ---

export interface StatutoryLiability {
  id: string;
  pay_run_id: string | null;
  scheme: LiabilityScheme;
  state: string | null;
  authority: string;
  base_minor: number;
  amount_minor: number;
  period_start: string;
  period_end: string;
  due_date: string;
  status: LiabilityStatus;
  filed_at: string | null;
  remitted_at: string | null;
  remittance_reference: string | null;
  created_at: string;
}

// --- final settlement ---

export interface FinalSettlement {
  id: string;
  employee_id: string;
  payslip_id: string;
  termination_date: string;
  leave_days_paid_out: number;
  leave_payout_minor: number;
  gratuity_minor: number;
  outstanding_loan_recovered_minor: number;
  net_settlement_minor: number;
  created_at: string;
}

// --- simulation ---

export interface SimulationRequestBody {
  period_end: string;
  basic_minor?: number;
  housing_minor?: number;
  transport_minor?: number;
  other_earnings_minor?: number;
  annual_rent_paid_minor?: number;
  frequency?: PayFrequency;
  include_active_loan_deduction?: boolean;
}

export interface SimulationOut {
  gross_minor: number;
  pensionable_pay_minor: number;
  pension_employee_minor: number;
  pension_employer_minor: number;
  nhf_minor: number;
  cumulative_rent_relief_minor: number;
  cumulative_chargeable_income_minor: number;
  paye_minor: number;
  loan_deduction_minor: number;
  net_pay_minor: number;
}

// --- chart of accounts / general ledger ---

export type AccountType = "asset" | "liability" | "equity" | "revenue" | "expense";

export interface ChartAccount {
  id: string;
  org_id: string;
  code: string;
  name: string;
  type: AccountType;
  is_system: boolean;
  is_active: boolean;
  created_at: string;
}

export interface ChartAccountCreateBody {
  code: string;
  name: string;
  type: AccountType;
}

export interface ChartAccountUpdateBody {
  name?: string;
  is_active?: boolean;
}

export interface LedgerEntry {
  id: string;
  org_id: string;
  journal_entry_id: string;
  pay_run_id: string | null;
  employee_id: string | null;
  account: string;
  account_name: string | null;
  debit_minor: number;
  credit_minor: number;
  description: string | null;
  created_at: string;
}

export interface TrialBalanceLine {
  account: string;
  account_name: string | null;
  account_type: AccountType | null;
  total_debit_minor: number;
  total_credit_minor: number;
  balance_minor: number;
}

export interface JournalEntryLineCreateBody {
  account_code: string;
  debit_minor?: number;
  credit_minor?: number;
  description?: string | null;
}

export interface JournalEntryCreateBody {
  description: string;
  lines: JournalEntryLineCreateBody[];
}

// --- vendors / bills ---

export interface Vendor {
  id: string;
  org_id: string;
  contractor_id: string | null;
  name: string;
  contact_email: string | null;
  contact_phone: string | null;
  tin: string | null;
  created_at: string;
}

export interface VendorCreateBody {
  name: string;
  contact_email?: string | null;
  contact_phone?: string | null;
  tin?: string | null;
  contractor_id?: string | null;
}

export interface VendorUpdateBody {
  name?: string;
  contact_email?: string | null;
  contact_phone?: string | null;
  tin?: string | null;
}

export type BillStatus = "draft" | "approved" | "paid" | "void";

export interface Bill {
  id: string;
  org_id: string;
  vendor_id: string;
  bill_number: string;
  bill_date: string;
  due_date: string;
  expense_account_code: string;
  amount_minor: number;
  description: string | null;
  status: BillStatus;
  paid_at: string | null;
  created_at: string;
}

export interface BillCreateBody {
  vendor_id: string;
  bill_number: string;
  bill_date: string;
  due_date: string;
  expense_account_code: string;
  amount_minor: number;
  description?: string | null;
}
