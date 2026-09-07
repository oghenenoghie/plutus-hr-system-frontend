import { apiFetch } from "@/lib/api/client";
import type {
  ApiKey,
  ApiKeyCreateBody,
  ApiKeyCreated,
  AssetAssignment,
  AssetAssignmentCreateBody,
  AssetAssignmentReturnBody,
  Benefit,
  Bill,
  BillCreateBody,
  Branch,
  BranchCreateBody,
  BranchUpdateBody,
  Candidate,
  CandidateCreateBody,
  CandidateUpdateBody,
  ChartAccount,
  ChartAccountCreateBody,
  ChartAccountUpdateBody,
  CompanyAsset,
  CompanyAssetCreateBody,
  CompanyAssetUpdateBody,
  Contractor,
  Department,
  DepartmentCreateBody,
  DepartmentUpdateBody,
  Disbursement,
  DisciplinaryCase,
  DisciplinaryCaseCreateBody,
  DisciplinaryCaseResolveBody,
  DisciplinaryCaseUpdateBody,
  Employee,
  EmployeeCreateBody,
  Expense,
  FinalSettlement,
  JobGrade,
  JobGradeCreateBody,
  JobGradeUpdateBody,
  JobPosting,
  JobPostingCreateBody,
  JobPostingUpdateBody,
  JournalEntryCreateBody,
  LeaveBalance,
  LeaveRequest,
  LedgerEntry,
  Loan,
  MeResponse,
  Notification,
  NotificationBroadcastBody,
  NotificationUnreadCount,
  OrgSummary,
  PayRun,
  PayRunCreateBody,
  Payslip,
  PerformanceReview,
  PerformanceReviewAcknowledgeBody,
  PerformanceReviewCreateBody,
  PerformanceReviewSubmitBody,
  Policy,
  PolicyCreateBody,
  PolicyUpdateBody,
  Shift,
  ShiftCreateBody,
  ShiftUpdateBody,
  SimulationOut,
  SimulationRequestBody,
  StatutoryLiability,
  TokenResponse,
  TrainingCourse,
  TrainingCourseCreateBody,
  TrainingCourseUpdateBody,
  TrainingEnrollment,
  TrainingEnrollmentCreateBody,
  TrainingEnrollmentUpdateBody,
  TrialBalanceLine,
  UnionMembership,
  UnionMembershipCreateBody,
  UnionMembershipTerminateBody,
  UnionMembershipUpdateBody,
  Vendor,
  VendorCreateBody,
  VendorUpdateBody,
  WhtPayment,
} from "@/lib/types";

// --- auth ---

export const authApi = {
  login: (body: { email: string; password: string; org_id?: string; totp_code?: string }) =>
    apiFetch<TokenResponse>("/auth/login", { method: "POST", body, auth: false }),
  me: () => apiFetch<MeResponse>("/auth/me"),
  totpSetup: () => apiFetch<{ secret: string; provisioning_uri: string }>("/auth/totp/setup", { method: "POST" }),
  totpVerify: (code: string) =>
    apiFetch<void>("/auth/totp/verify", { method: "POST", body: { code } }),
};

// --- dashboard ---

export const dashboardApi = {
  summary: () => apiFetch<OrgSummary>("/dashboard/summary"),
  deadlines: (withinDays = 30) =>
    apiFetch<StatutoryLiability[]>(`/dashboard/deadlines?within_days=${withinDays}`),
};

// --- employees ---

export const employeesApi = {
  list: () => apiFetch<Employee[]>("/employees"),
  me: () => apiFetch<Employee>("/employees/me"),
  get: (id: string) => apiFetch<Employee>(`/employees/${id}`),
  create: (body: EmployeeCreateBody) =>
    apiFetch<Employee>("/employees", { method: "POST", body }),
};

// --- departments ---

export const departmentsApi = {
  list: () => apiFetch<Department[]>("/departments"),
  get: (id: string) => apiFetch<Department>(`/departments/${id}`),
  create: (body: DepartmentCreateBody) =>
    apiFetch<Department>("/departments", { method: "POST", body }),
  update: (id: string, body: DepartmentUpdateBody) =>
    apiFetch<Department>(`/departments/${id}`, { method: "PATCH", body }),
};

// --- branches ---

export const branchesApi = {
  list: () => apiFetch<Branch[]>("/branches"),
  get: (id: string) => apiFetch<Branch>(`/branches/${id}`),
  create: (body: BranchCreateBody) => apiFetch<Branch>("/branches", { method: "POST", body }),
  update: (id: string, body: BranchUpdateBody) =>
    apiFetch<Branch>(`/branches/${id}`, { method: "PATCH", body }),
};

// --- job grades ---

export const jobGradesApi = {
  list: () => apiFetch<JobGrade[]>("/job-grades"),
  get: (id: string) => apiFetch<JobGrade>(`/job-grades/${id}`),
  create: (body: JobGradeCreateBody) =>
    apiFetch<JobGrade>("/job-grades", { method: "POST", body }),
  update: (id: string, body: JobGradeUpdateBody) =>
    apiFetch<JobGrade>(`/job-grades/${id}`, { method: "PATCH", body }),
};

// --- policies ---

export const policiesApi = {
  list: () => apiFetch<Policy[]>("/policies"),
  get: (id: string) => apiFetch<Policy>(`/policies/${id}`),
  create: (body: PolicyCreateBody) => apiFetch<Policy>("/policies", { method: "POST", body }),
  update: (id: string, body: PolicyUpdateBody) =>
    apiFetch<Policy>(`/policies/${id}`, { method: "PATCH", body }),
};

// --- shifts ---

export const shiftsApi = {
  list: () => apiFetch<Shift[]>("/shifts"),
  get: (id: string) => apiFetch<Shift>(`/shifts/${id}`),
  create: (body: ShiftCreateBody) => apiFetch<Shift>("/shifts", { method: "POST", body }),
  update: (id: string, body: ShiftUpdateBody) =>
    apiFetch<Shift>(`/shifts/${id}`, { method: "PATCH", body }),
};

// --- recruitment ---

export const jobPostingsApi = {
  list: () => apiFetch<JobPosting[]>("/job-postings"),
  get: (id: string) => apiFetch<JobPosting>(`/job-postings/${id}`),
  create: (body: JobPostingCreateBody) =>
    apiFetch<JobPosting>("/job-postings", { method: "POST", body }),
  update: (id: string, body: JobPostingUpdateBody) =>
    apiFetch<JobPosting>(`/job-postings/${id}`, { method: "PATCH", body }),
  candidates: (id: string) => apiFetch<Candidate[]>(`/job-postings/${id}/candidates`),
  addCandidate: (id: string, body: CandidateCreateBody) =>
    apiFetch<Candidate>(`/job-postings/${id}/candidates`, { method: "POST", body }),
};

export const candidatesApi = {
  get: (id: string) => apiFetch<Candidate>(`/candidates/${id}`),
  update: (id: string, body: CandidateUpdateBody) =>
    apiFetch<Candidate>(`/candidates/${id}`, { method: "PATCH", body }),
};

// --- performance reviews ---

export const performanceReviewsApi = {
  list: () => apiFetch<PerformanceReview[]>("/performance-reviews"),
  me: () => apiFetch<PerformanceReview[]>("/performance-reviews/me"),
  get: (id: string) => apiFetch<PerformanceReview>(`/performance-reviews/${id}`),
  create: (body: PerformanceReviewCreateBody) =>
    apiFetch<PerformanceReview>("/performance-reviews", { method: "POST", body }),
  submit: (id: string, body: PerformanceReviewSubmitBody) =>
    apiFetch<PerformanceReview>(`/performance-reviews/${id}/submit`, { method: "POST", body }),
  acknowledge: (id: string, body: PerformanceReviewAcknowledgeBody) =>
    apiFetch<PerformanceReview>(`/performance-reviews/${id}/acknowledge`, {
      method: "POST",
      body,
    }),
};

// --- learning & development ---

export const trainingCoursesApi = {
  list: () => apiFetch<TrainingCourse[]>("/training-courses"),
  get: (id: string) => apiFetch<TrainingCourse>(`/training-courses/${id}`),
  create: (body: TrainingCourseCreateBody) =>
    apiFetch<TrainingCourse>("/training-courses", { method: "POST", body }),
  update: (id: string, body: TrainingCourseUpdateBody) =>
    apiFetch<TrainingCourse>(`/training-courses/${id}`, { method: "PATCH", body }),
  enrollments: (id: string) => apiFetch<TrainingEnrollment[]>(`/training-courses/${id}/enrollments`),
  enroll: (id: string, body: TrainingEnrollmentCreateBody) =>
    apiFetch<TrainingEnrollment>(`/training-courses/${id}/enrollments`, { method: "POST", body }),
};

export const trainingEnrollmentsApi = {
  mine: () => apiFetch<TrainingEnrollment[]>("/training-enrollments/me"),
  update: (id: string, body: TrainingEnrollmentUpdateBody) =>
    apiFetch<TrainingEnrollment>(`/training-enrollments/${id}`, { method: "PATCH", body }),
};

// --- employee relations ---

export const disciplinaryCasesApi = {
  list: () => apiFetch<DisciplinaryCase[]>("/disciplinary-cases"),
  get: (id: string) => apiFetch<DisciplinaryCase>(`/disciplinary-cases/${id}`),
  create: (body: DisciplinaryCaseCreateBody) =>
    apiFetch<DisciplinaryCase>("/disciplinary-cases", { method: "POST", body }),
  update: (id: string, body: DisciplinaryCaseUpdateBody) =>
    apiFetch<DisciplinaryCase>(`/disciplinary-cases/${id}`, { method: "PATCH", body }),
  resolve: (id: string, body: DisciplinaryCaseResolveBody) =>
    apiFetch<DisciplinaryCase>(`/disciplinary-cases/${id}/resolve`, { method: "POST", body }),
};

// --- notifications ---

export const notificationsApi = {
  mine: () => apiFetch<Notification[]>("/notifications/me"),
  unreadCount: () => apiFetch<NotificationUnreadCount>("/notifications/me/unread-count"),
  markRead: (id: string) =>
    apiFetch<Notification>(`/notifications/me/${id}/read`, { method: "POST", body: {} }),
  markAllRead: () => apiFetch<void>("/notifications/me/read-all", { method: "POST", body: {} }),
  broadcast: (body: NotificationBroadcastBody) =>
    apiFetch<Notification[]>("/notifications/broadcast", { method: "POST", body }),
};

// --- union dues ---

export const unionMembershipsApi = {
  forEmployee: (employeeId: string) =>
    apiFetch<UnionMembership[]>(`/union-memberships/employees/${employeeId}`),
  mine: () => apiFetch<UnionMembership[]>("/union-memberships/me"),
  assign: (employeeId: string, body: UnionMembershipCreateBody) =>
    apiFetch<UnionMembership>(`/union-memberships/employees/${employeeId}`, {
      method: "POST",
      body,
    }),
  update: (id: string, body: UnionMembershipUpdateBody) =>
    apiFetch<UnionMembership>(`/union-memberships/${id}`, { method: "PATCH", body }),
  terminate: (id: string, body: UnionMembershipTerminateBody) =>
    apiFetch<UnionMembership>(`/union-memberships/${id}/terminate`, { method: "POST", body }),
};

// --- company assets ---

export const companyAssetsApi = {
  list: () => apiFetch<CompanyAsset[]>("/company-assets"),
  get: (id: string) => apiFetch<CompanyAsset>(`/company-assets/${id}`),
  mine: () => apiFetch<AssetAssignment[]>("/company-assets/me"),
  create: (body: CompanyAssetCreateBody) =>
    apiFetch<CompanyAsset>("/company-assets", { method: "POST", body }),
  update: (id: string, body: CompanyAssetUpdateBody) =>
    apiFetch<CompanyAsset>(`/company-assets/${id}`, { method: "PATCH", body }),
  assignments: (id: string) => apiFetch<AssetAssignment[]>(`/company-assets/${id}/assignments`),
  assign: (id: string, body: AssetAssignmentCreateBody) =>
    apiFetch<AssetAssignment>(`/company-assets/${id}/assignments`, { method: "POST", body }),
  returnAssignment: (assignmentId: string, body: AssetAssignmentReturnBody) =>
    apiFetch<AssetAssignment>(`/company-assets/assignments/${assignmentId}/return`, {
      method: "POST",
      body,
    }),
};

// --- api keys ---

export const apiKeysApi = {
  list: () => apiFetch<ApiKey[]>("/api-keys"),
  create: (body: ApiKeyCreateBody) =>
    apiFetch<ApiKeyCreated>("/api-keys", { method: "POST", body }),
  revoke: (id: string) => apiFetch<ApiKey>(`/api-keys/${id}/revoke`, { method: "POST", body: {} }),
};

// --- chart of accounts ---

export const chartAccountsApi = {
  list: () => apiFetch<ChartAccount[]>("/chart-of-accounts"),
  create: (body: ChartAccountCreateBody) =>
    apiFetch<ChartAccount>("/chart-of-accounts", { method: "POST", body }),
  update: (id: string, body: ChartAccountUpdateBody) =>
    apiFetch<ChartAccount>(`/chart-of-accounts/${id}`, { method: "PATCH", body }),
  seedDefaults: () =>
    apiFetch<ChartAccount[]>("/chart-of-accounts/seed-defaults", { method: "POST", body: {} }),
};

// --- general ledger ---

export const generalLedgerApi = {
  entries: (params?: { account?: string; payRunId?: string }) => {
    const query = new URLSearchParams();
    if (params?.account) query.set("account", params.account);
    if (params?.payRunId) query.set("pay_run_id", params.payRunId);
    const qs = query.toString();
    return apiFetch<LedgerEntry[]>(`/general-ledger/entries${qs ? `?${qs}` : ""}`);
  },
  trialBalance: () => apiFetch<TrialBalanceLine[]>("/general-ledger/trial-balance"),
  postJournalEntry: (body: JournalEntryCreateBody) =>
    apiFetch<LedgerEntry[]>("/general-ledger/journal-entries", { method: "POST", body }),
};

// --- vendors ---

export const vendorsApi = {
  list: () => apiFetch<Vendor[]>("/vendors"),
  create: (body: VendorCreateBody) => apiFetch<Vendor>("/vendors", { method: "POST", body }),
  update: (id: string, body: VendorUpdateBody) =>
    apiFetch<Vendor>(`/vendors/${id}`, { method: "PATCH", body }),
};

// --- bills ---

export const billsApi = {
  list: () => apiFetch<Bill[]>("/bills"),
  create: (body: BillCreateBody) => apiFetch<Bill>("/bills", { method: "POST", body }),
  approve: (id: string) => apiFetch<Bill>(`/bills/${id}/approve`, { method: "POST", body: {} }),
  pay: (id: string) => apiFetch<Bill>(`/bills/${id}/pay`, { method: "POST", body: {} }),
  void: (id: string) => apiFetch<Bill>(`/bills/${id}/void`, { method: "POST", body: {} }),
};

// --- pay runs ---

export const payRunsApi = {
  list: () => apiFetch<PayRun[]>("/pay-runs"),
  get: (id: string) => apiFetch<PayRun>(`/pay-runs/${id}`),
  create: (body: PayRunCreateBody) => apiFetch<PayRun>("/pay-runs", { method: "POST", body }),
  payslips: (id: string) => apiFetch<Payslip[]>(`/pay-runs/${id}/payslips`),
  disbursement: (id: string) => apiFetch<Disbursement>(`/pay-runs/${id}/disbursement`),
  myPayslips: () => apiFetch<Payslip[]>("/pay-runs/me/payslips"),
};

// --- leave ---

export const leaveApi = {
  list: () => apiFetch<LeaveRequest[]>("/leave-requests"),
  mine: () => apiFetch<LeaveRequest[]>("/leave-requests/me"),
  myBalance: () => apiFetch<LeaveBalance>("/leave-requests/me/balance"),
  approve: (id: string) =>
    apiFetch<LeaveRequest>(`/leave-requests/${id}/approve`, { method: "POST" }),
  reject: (id: string) =>
    apiFetch<LeaveRequest>(`/leave-requests/${id}/reject`, { method: "POST" }),
};

// --- expenses ---

export const expensesApi = {
  list: () => apiFetch<Expense[]>("/expenses"),
  mine: () => apiFetch<Expense[]>("/expenses/me"),
  approve: (id: string) => apiFetch<Expense>(`/expenses/${id}/approve`, { method: "POST" }),
  reject: (id: string) => apiFetch<Expense>(`/expenses/${id}/reject`, { method: "POST" }),
  reimburse: (id: string) => apiFetch<Expense>(`/expenses/${id}/reimburse`, { method: "POST" }),
};

// --- loans ---

export const loansApi = {
  list: () => apiFetch<Loan[]>("/loans"),
  mine: () => apiFetch<Loan[]>("/loans/me"),
  get: (id: string) => apiFetch<Loan>(`/loans/${id}`),
  cancel: (id: string) => apiFetch<Loan>(`/loans/${id}/cancel`, { method: "POST" }),
};

// --- benefits ---

export const benefitsApi = {
  forEmployee: (employeeId: string) => apiFetch<Benefit[]>(`/benefits/employees/${employeeId}`),
  mine: () => apiFetch<Benefit[]>("/benefits/me"),
  end: (id: string, endDate: string) =>
    apiFetch<Benefit>(`/benefits/${id}/end`, { method: "POST", body: { end_date: endDate } }),
};

// --- contractors ---

export const contractorsApi = {
  list: () => apiFetch<Contractor[]>("/contractors"),
  get: (id: string) => apiFetch<Contractor>(`/contractors/${id}`),
  payments: (id: string) => apiFetch<WhtPayment[]>(`/contractors/${id}/payments`),
};

// --- statutory liabilities ---

export const statutoryLiabilitiesApi = {
  list: () => apiFetch<StatutoryLiability[]>("/statutory-liabilities"),
  file: (id: string) => apiFetch<StatutoryLiability>(`/statutory-liabilities/${id}/file`, { method: "POST" }),
  remit: (id: string, reference?: string) =>
    apiFetch<StatutoryLiability>(`/statutory-liabilities/${id}/remit`, {
      method: "POST",
      body: { reference },
    }),
};

// --- final settlement ---

export const finalSettlementApi = {
  forEmployee: (employeeId: string) =>
    apiFetch<FinalSettlement[]>(`/final-settlements/${employeeId}`),
};

// --- simulation ---

export const simulationApi = {
  payslip: (employeeId: string, body: SimulationRequestBody) =>
    apiFetch<SimulationOut>(`/simulation/payslip/${employeeId}`, { method: "POST", body }),
};
