import { apiFetch } from "@/lib/api/client";
import type {
  Benefit,
  Branch,
  BranchCreateBody,
  BranchUpdateBody,
  Candidate,
  CandidateCreateBody,
  CandidateUpdateBody,
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
  LeaveBalance,
  LeaveRequest,
  Loan,
  MeResponse,
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
