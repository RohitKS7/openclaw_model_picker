import { DEFAULT_PICKER_INPUT } from "@/data/defaults";
import type { Budget, Billing, LocalOk, PickerInput, ToolCallsRequired, UseCase } from "@/types/picker";

const USE_CASES: UseCase[] = ["coding", "assistant", "automation", "research", "debrief", "other"];
const BUDGETS: Budget[] = ["free", "under10", "10to15", "15to20", "20to40", "40plus"];
const BILLING_TYPES: Billing[] = ["subscription", "api"];
const TOOL_CALL_OPTIONS: ToolCallsRequired[] = ["yes", "no", "unsure"];
const LOCAL_OPTIONS: LocalOk[] = ["yes", "no"];

const coerceEnum = <T extends string>(value: string | null, allowed: T[], fallback: T | null): T | null =>
  value && allowed.includes(value as T) ? (value as T) : fallback;

const coerceEnumNonNull = <T extends string>(value: string | null, allowed: T[], fallback: T): T =>
  value && allowed.includes(value as T) ? (value as T) : fallback;

export const decodeStateFromParams = (params: URLSearchParams): PickerInput => ({
  useCase: coerceEnum(params.get("uc"), USE_CASES, DEFAULT_PICKER_INPUT.useCase),
  budget: coerceEnumNonNull(params.get("b"), BUDGETS, DEFAULT_PICKER_INPUT.budget),
  billing: coerceEnumNonNull(params.get("bill"), BILLING_TYPES, DEFAULT_PICKER_INPUT.billing),
  toolCalls: coerceEnumNonNull(params.get("tc"), TOOL_CALL_OPTIONS, DEFAULT_PICKER_INPUT.toolCalls),
  localOk: coerceEnumNonNull(params.get("local"), LOCAL_OPTIONS, DEFAULT_PICKER_INPUT.localOk),
});

export const encodeStateToParams = (input: PickerInput): URLSearchParams => {
  const params = new URLSearchParams();

  if (input.useCase) {
    params.set("uc", input.useCase);
  }
  params.set("b", input.budget);
  params.set("bill", input.billing);
  params.set("tc", input.toolCalls);
  params.set("local", input.localOk);

  return params;
};
