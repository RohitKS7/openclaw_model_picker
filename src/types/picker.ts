export type UseCase = "coding" | "assistant" | "automation" | "research" | "debrief" | "other";
export type Budget = "free" | "under10" | "10to15" | "15to20" | "20to40" | "40plus";
export type Billing = "subscription" | "api";
export type ToolCallsRequired = "yes" | "no" | "unsure";
export type LocalOk = "yes" | "no";

export interface PickerInput {
  useCase: UseCase | null;
  budget: Budget;
  billing: Billing;
  toolCalls: ToolCallsRequired;
  localOk: LocalOk;
}

export interface ModelEntry {
  displayName: string;
  provider: string;
  modelId: string;
  reason: string;
  triggerCondition?: string;
}

export interface PickerOutput {
  primary: ModelEntry & { estimatedMonthly: { low: number; high: number } };
  fallback: ModelEntry;
  openRouterWarning: boolean;
  costRange: { low: number; high: number; isFlatRate?: boolean };
  caveat?: string;
  showComparison?: boolean;
}
