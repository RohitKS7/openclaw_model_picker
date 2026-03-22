import { buildModelEntry, hasOpenRouterModel } from "@/data/models";
import { getEstimatedMonthlyRange } from "@/utils/calcEstimate";
import type { PickerInput, PickerOutput } from "@/types/picker";

interface RecommendationRule {
  match: (input: PickerInput) => boolean;
  primaryId: string;
  primaryReason: string;
  fallbackId: string;
  fallbackReason: string;
  fallbackTrigger: string;
  caveat?: string;
  showComparison?: boolean;
}

const RULES: RecommendationRule[] = [
  {
    match: (input) => input.useCase === "coding" && input.toolCalls === "yes" && input.budget === "40plus",
    primaryId: "anthropic/claude-sonnet-4-6",
    primaryReason: "Best tool call reliability when cost is not the main constraint.",
    fallbackId: "anthropic/claude-haiku-4-5",
    fallbackReason: "Cheaper fallback when you still want Anthropic-style tool behavior.",
    fallbackTrigger: "Falls back when long coding runs need a cheaper recovery path.",
  },
  {
    match: (input) => input.useCase === "coding" && input.toolCalls === "yes" && input.budget === "20to40",
    primaryId: "anthropic/claude-sonnet-4-6",
    primaryReason: "Strong coding quality with more predictable tool use than cheaper options.",
    fallbackId: "moonshot/kimi-k2.5",
    fallbackReason: "Keeps costs down when the main coding pass does not need Sonnet quality.",
    fallbackTrigger: "Falls back when the primary run is too expensive for the next task.",
  },
  {
    match: (input) => input.useCase === "coding" && input.toolCalls === "yes" && input.budget === "under10",
    primaryId: "moonshot/kimi-k2.5",
    primaryReason: "Best budget coding pick when you still need solid tool-call support.",
    fallbackId: "anthropic/claude-haiku-4-5",
    fallbackReason: "Useful rescue path when Kimi drifts or needs tighter instruction following.",
    fallbackTrigger: "Falls back when tool execution starts drifting or responses lose precision.",
  },
  {
    match: (input) => input.budget === "free" && input.localOk === "no",
    primaryId: "qwen-portal/coder-model",
    primaryReason: "Reliable free hosted option for any workflow when local setup is not available.",
    fallbackId: "openrouter/z-ai/glm-4.5-air",
    fallbackReason: "Alternative free hosted path when the primary free route is unavailable.",
    fallbackTrigger: "Falls back when the primary free route is rate-limited or busy.",
    caveat: "Free models rate-limit unpredictably. Expect slower responses.",
  },
  {
    match: (input) => input.budget === "free" && input.localOk === "yes",
    primaryId: "ollama/llama3.3",
    primaryReason: "Best zero-dollar option when you can run a capable local model.",
    fallbackId: "qwen-portal/coder-model",
    fallbackReason: "Free hosted fallback when local model is unavailable or insufficient.",
    fallbackTrigger: "Falls back when the local model cannot handle the request or is offline.",
    caveat: "Local model requires capable hardware (8GB+ RAM recommended).",
  },
  {
    match: (input) => input.useCase === "coding" && input.toolCalls === "no" && input.budget === "under10",
    primaryId: "google/gemini-2.5-flash",
    primaryReason: "Cheap and quick when you care more about throughput than tool reliability.",
    fallbackId: "minimax/minimax-m2.5",
    fallbackReason: "Helpful budget backup for lower-stakes code generation and iteration.",
    fallbackTrigger: "Falls back when the faster option loses quality on longer prompts.",
  },
  {
    match: (input) => input.useCase === "assistant" && input.budget === "40plus",
    primaryId: "anthropic/claude-opus-4-6",
    primaryReason: "Best fit for high-touch assistant work where polish matters most.",
    fallbackId: "anthropic/claude-sonnet-4-6",
    fallbackReason: "Keeps the tone and quality close while lowering spend for routine turns.",
    fallbackTrigger: "Falls back when the request does not justify Opus-level spend.",
  },
  {
    match: (input) => input.useCase === "assistant" && input.budget === "20to40",
    primaryId: "anthropic/claude-sonnet-4-6",
    primaryReason: "Balanced assistant choice for quality, tone, and reliability.",
    fallbackId: "moonshot/kimi-k2.5",
    fallbackReason: "Cheaper backup for lower-stakes assistant tasks.",
    fallbackTrigger: "Falls back when you want to preserve budget on simple assistant turns.",
  },
  {
    match: (input) => input.useCase === "assistant" && input.budget === "under10",
    primaryId: "moonshot/kimi-k2.5",
    primaryReason: "Best budget-friendly assistant option when you still want strong output quality.",
    fallbackId: "minimax/minimax-m2.5",
    fallbackReason: "Budget-safe backup for lighter support and chat flows.",
    fallbackTrigger: "Falls back when the primary answer quality is more than you need.",
  },
  {
    match: (input) => input.useCase === "automation" && input.toolCalls === "yes",
    primaryId: "anthropic/claude-sonnet-4-6",
    primaryReason: "Reliable automation usually starts with dependable tool behavior.",
    fallbackId: "anthropic/claude-haiku-4-5",
    fallbackReason: "Lower-cost backup when the flow can tolerate a smaller model.",
    fallbackTrigger: "Falls back when automations need a cheaper retry path after failure.",
  },
  {
    match: (input) => input.useCase === "automation" && input.toolCalls === "no" && input.budget === "under10",
    primaryId: "minimax/minimax-m2.5",
    primaryReason: "Low-cost automation pick when the job is mostly prompt-to-text.",
    fallbackId: "moonshot/kimi-k2.5",
    fallbackReason: "Useful backup for jobs that need a little more reasoning depth.",
    fallbackTrigger: "Falls back when repetitive automation prompts start degrading in quality.",
  },
  {
    match: (input) => input.useCase === "research" && input.budget === "40plus",
    primaryId: "anthropic/claude-opus-4-6",
    primaryReason: "Best fit for deep synthesis, nuance, and long-form research summaries.",
    fallbackId: "google/gemini-2.5-pro",
    fallbackReason: "Strong research backup with lower spend than Opus.",
    fallbackTrigger: "Falls back when you want broad research coverage without Opus pricing.",
  },
  {
    match: (input) => input.useCase === "research" && input.budget === "20to40",
    primaryId: "google/gemini-2.5-pro",
    primaryReason: "Good research depth at a more manageable monthly cost.",
    fallbackId: "moonshot/kimi-k2.5",
    fallbackReason: "Budget backup for first-pass synthesis and rough comparisons.",
    fallbackTrigger: "Falls back when a task only needs a fast first pass.",
  },
  {
    match: (input) => input.useCase === "debrief" && input.budget === "under10",
    primaryId: "moonshot/kimi-k2.5",
    primaryReason: "Cost-effective for reflective summaries, recaps, and daily review workflows.",
    fallbackId: "minimax/minimax-m2.5",
    fallbackReason: "Cheaper backup for quick end-of-day summaries.",
    fallbackTrigger: "Falls back when the recap is straightforward and does not need extra depth.",
  },
  // Billing-aware rules for new budget tiers
  // Coding + subscription + 20to40 (Claude Pro vs ChatGPT Plus at $20)
  {
    match: (input) => input.useCase === "coding" && input.billing === "subscription" && input.budget === "20to40",
    primaryId: "anthropic/claude-sonnet-4-6",
    primaryReason: "Best coding reliability at this price.",
    fallbackId: "openai-codex/gpt-5.3-codex",
    fallbackReason: "Alternative at same price point when Claude is unavailable.",
    fallbackTrigger: "Falls back when Claude Pro rate limits are reached.",
    showComparison: true,
  },
  // Coding + subscription + 15to20
  {
    match: (input) => input.useCase === "coding" && input.billing === "subscription" && input.budget === "15to20",
    primaryId: "anthropic/claude-sonnet-4-6",
    primaryReason: "Claude Pro at $20 is the most capable option in this range.",
    fallbackId: "moonshot/kimi-k2.5",
    fallbackReason: "API-based fallback when subscription model is not suitable.",
    fallbackTrigger: "Falls back when Claude Pro is not available in your region.",
  },
  // Coding + subscription + 10to15
  {
    match: (input) => input.useCase === "coding" && input.billing === "subscription" && input.budget === "10to15",
    primaryId: "moonshot/kimi-k2.5",
    primaryReason: "Best capability-to-cost ratio under $15/month.",
    fallbackId: "minimax/minimax-m2.5",
    fallbackReason: "Budget-friendly backup for lightweight coding tasks.",
    fallbackTrigger: "Falls back when Kimi is rate-limited.",
  },
  // Assistant + subscription + 20to40
  {
    match: (input) => input.useCase === "assistant" && input.billing === "subscription" && input.budget === "20to40",
    primaryId: "anthropic/claude-sonnet-4-6",
    primaryReason: "Best assistant quality at the $20 price point.",
    fallbackId: "openai/gpt-4.1",
    fallbackReason: "ChatGPT Plus alternative with higher message limits.",
    fallbackTrigger: "Falls back when Claude Pro daily limits are reached.",
    showComparison: true,
  },
  // Assistant + subscription + 15to20
  {
    match: (input) => input.useCase === "assistant" && input.billing === "subscription" && input.budget === "15to20",
    primaryId: "anthropic/claude-sonnet-4-6",
    primaryReason: "Claude Pro offers the best assistant experience at this price.",
    fallbackId: "moonshot/kimi-k2.5",
    fallbackReason: "API-based alternative with pay-as-you-go flexibility.",
    fallbackTrigger: "Falls back when subscription model is not preferred.",
  },
  // Automation + API + 10to15
  {
    match: (input) => input.useCase === "automation" && input.billing === "api" && input.budget === "10to15",
    primaryId: "moonshot/kimi-k2.5",
    primaryReason: "Reliable automation workhorse with predictable API costs.",
    fallbackId: "minimax/minimax-m2.5",
    fallbackReason: "Lower-cost backup for high-volume automation runs.",
    fallbackTrigger: "Falls back when cost per run needs to be minimized.",
  },
  // Automation + API + 15to20
  {
    match: (input) => input.useCase === "automation" && input.billing === "api" && input.budget === "15to20",
    primaryId: "google/gemini-2.5-flash",
    primaryReason: "Fast and cost-effective for automation workflows.",
    fallbackId: "moonshot/kimi-k2.5",
    fallbackReason: "More capable backup when Gemini Flash is insufficient.",
    fallbackTrigger: "Falls back when task complexity exceeds Flash capabilities.",
  },
  // Research + API + 10to15
  {
    match: (input) => input.useCase === "research" && input.billing === "api" && input.budget === "10to15",
    primaryId: "google/gemini-2.5-flash",
    primaryReason: "Good research capabilities with low API costs.",
    fallbackId: "moonshot/kimi-k2.5",
    fallbackReason: "More capable backup for deeper research tasks.",
    fallbackTrigger: "Falls back when research depth requires stronger model.",
  },
  // Research + API + 15to20
  {
    match: (input) => input.useCase === "research" && input.billing === "api" && input.budget === "15to20",
    primaryId: "google/gemini-2.5-pro",
    primaryReason: "Strong research capabilities within this budget range.",
    fallbackId: "moonshot/kimi-k2.5",
    fallbackReason: "Cost-effective backup for routine research tasks.",
    fallbackTrigger: "Falls back when Pro model is not needed.",
  },
  // Debrief + subscription + 20to40
  {
    match: (input) => input.useCase === "debrief" && input.billing === "subscription" && input.budget === "20to40",
    primaryId: "anthropic/claude-sonnet-4-6",
    primaryReason: "Best summary quality at the subscription price point.",
    fallbackId: "openai/gpt-4.1",
    fallbackReason: "Higher volume option with ChatGPT Plus.",
    fallbackTrigger: "Falls back when Claude Pro message limits are hit.",
    showComparison: true,
  },
  // AUTOMATION — subscription billing (all budget tiers)
  {
    match: (input) => input.useCase === "automation" && input.billing === "subscription" && input.budget === "under10",
    primaryId: "moonshot/kimi-k2.5",
    primaryReason: "Reliable automation at zero subscription cost.",
    fallbackId: "minimax/minimax-m2.5",
    fallbackReason: "Budget backup when Kimi is rate-limited.",
    fallbackTrigger: "Falls back when primary automation model is unavailable.",
  },
  {
    match: (input) => input.useCase === "automation" && input.billing === "subscription" && input.budget === "10to15",
    primaryId: "moonshot/kimi-k2.5",
    primaryReason: "Best automation reliability under $15.",
    fallbackId: "minimax/minimax-m2.5",
    fallbackReason: "Budget backup when Kimi is rate-limited.",
    fallbackTrigger: "Falls back when primary automation model is unavailable.",
  },
  {
    match: (input) => input.useCase === "automation" && input.billing === "subscription" && input.budget === "15to20",
    primaryId: "google/gemini-2.5-flash",
    primaryReason: "Fast, reliable tool execution at low cost.",
    fallbackId: "moonshot/kimi-k2.5",
    fallbackReason: "More capable backup when Flash is insufficient.",
    fallbackTrigger: "Falls back when task complexity exceeds Flash capabilities.",
  },
  {
    match: (input) => input.useCase === "automation" && input.billing === "subscription" && input.budget === "20to40",
    primaryId: "anthropic/claude-sonnet-4-6",
    primaryReason: "Most reliable automation with Claude Pro plan.",
    fallbackId: "anthropic/claude-haiku-4-5",
    fallbackReason: "Lower-cost backup when the flow can tolerate a smaller model.",
    fallbackTrigger: "Falls back when automations need a cheaper retry path after failure.",
  },
  {
    match: (input) => input.useCase === "automation" && input.billing === "subscription" && input.budget === "40plus",
    primaryId: "anthropic/claude-sonnet-4-6",
    primaryReason: "Best-in-class automation reliability.",
    fallbackId: "anthropic/claude-haiku-4-5",
    fallbackReason: "Lower-cost backup when the flow can tolerate a smaller model.",
    fallbackTrigger: "Falls back when automations need a cheaper retry path after failure.",
  },
  // RESEARCH — subscription billing (all budget tiers)
  {
    match: (input) => input.useCase === "research" && input.billing === "subscription" && input.budget === "under10",
    primaryId: "google/gemini-2.5-flash",
    primaryReason: "Large context window for research at no cost.",
    fallbackId: "moonshot/kimi-k2.5",
    fallbackReason: "More capable backup for deeper research tasks.",
    fallbackTrigger: "Falls back when research depth requires stronger model.",
  },
  {
    match: (input) => input.useCase === "research" && input.billing === "subscription" && input.budget === "10to15",
    primaryId: "google/gemini-2.5-flash",
    primaryReason: "Best context-to-cost ratio under $15.",
    fallbackId: "moonshot/kimi-k2.5",
    fallbackReason: "More capable backup for deeper research tasks.",
    fallbackTrigger: "Falls back when research depth requires stronger model.",
  },
  {
    match: (input) => input.useCase === "research" && input.billing === "subscription" && input.budget === "15to20",
    primaryId: "google/gemini-2.5-pro",
    primaryReason: "Deep research with large context at $15-20.",
    fallbackId: "moonshot/kimi-k2.5",
    fallbackReason: "Cost-effective backup for routine research tasks.",
    fallbackTrigger: "Falls back when Pro model is not needed.",
  },
  {
    match: (input) => input.useCase === "research" && input.billing === "subscription" && input.budget === "20to40",
    primaryId: "anthropic/claude-sonnet-4-6",
    primaryReason: "Strong reasoning for research with Claude Pro.",
    fallbackId: "google/gemini-2.5-pro",
    fallbackReason: "Strong research backup with lower spend than Sonnet.",
    fallbackTrigger: "Falls back when you want broad research coverage without Sonnet pricing.",
  },
  {
    match: (input) => input.useCase === "research" && input.billing === "subscription" && input.budget === "40plus",
    primaryId: "anthropic/claude-opus-4-6",
    primaryReason: "Maximum reasoning depth for complex research.",
    fallbackId: "anthropic/claude-sonnet-4-6",
    fallbackReason: "Strong research backup with lower spend than Opus.",
    fallbackTrigger: "Falls back when you want broad research coverage without Opus pricing.",
  },
  // DEBRIEF — subscription billing (missing tiers)
  {
    match: (input) => input.useCase === "debrief" && input.billing === "subscription" && input.budget === "under10",
    primaryId: "moonshot/kimi-k2.5",
    primaryReason: "Solid daily debrief quality at no cost.",
    fallbackId: "minimax/minimax-m2.5",
    fallbackReason: "Cheaper backup for quick end-of-day summaries.",
    fallbackTrigger: "Falls back when the recap is straightforward and does not need extra depth.",
  },
  {
    match: (input) => input.useCase === "debrief" && input.billing === "subscription" && input.budget === "10to15",
    primaryId: "moonshot/kimi-k2.5",
    primaryReason: "Consistent daily debrief under $15.",
    fallbackId: "minimax/minimax-m2.5",
    fallbackReason: "Cheaper backup for quick end-of-day summaries.",
    fallbackTrigger: "Falls back when the recap is straightforward and does not need extra depth.",
  },
  {
    match: (input) => input.useCase === "debrief" && input.billing === "subscription" && input.budget === "15to20",
    primaryId: "moonshot/kimi-k2.5",
    primaryReason: "Reliable debrief quality in this range.",
    fallbackId: "google/gemini-2.5-flash",
    fallbackReason: "Faster backup for routine debrief tasks.",
    fallbackTrigger: "Falls back when the debrief is straightforward and does not need extra depth.",
  },
  {
    match: (input) => input.useCase === "debrief" && input.billing === "subscription" && input.budget === "40plus",
    primaryId: "anthropic/claude-sonnet-4-6",
    primaryReason: "Best summary quality at this budget.",
    fallbackId: "moonshot/kimi-k2.5",
    fallbackReason: "Cost-effective backup for routine debrief tasks.",
    fallbackTrigger: "Falls back when the debrief is straightforward and does not need extra depth.",
  },
  // ASSISTANT — subscription billing (missing tiers)
  {
    match: (input) => input.useCase === "assistant" && input.billing === "subscription" && input.budget === "under10",
    primaryId: "moonshot/kimi-k2.5",
    primaryReason: "Capable assistant at zero cost.",
    fallbackId: "minimax/minimax-m2.5",
    fallbackReason: "Budget-safe backup for lighter support and chat flows.",
    fallbackTrigger: "Falls back when the primary answer quality is more than you need.",
  },
  {
    match: (input) => input.useCase === "assistant" && input.billing === "subscription" && input.budget === "10to15",
    primaryId: "moonshot/kimi-k2.5",
    primaryReason: "Best assistant quality under $15.",
    fallbackId: "minimax/minimax-m2.5",
    fallbackReason: "Budget-safe backup for lighter support and chat flows.",
    fallbackTrigger: "Falls back when the primary answer quality is more than you need.",
  },
  // CODING — API billing (missing higher budget tiers)
  {
    match: (input) => input.useCase === "coding" && input.toolCalls === "yes" && input.billing === "api" && input.budget === "10to15",
    primaryId: "moonshot/kimi-k2.5",
    primaryReason: "Reliable tool calls within $15 API budget.",
    fallbackId: "anthropic/claude-haiku-4-5",
    fallbackReason: "Useful rescue path when Kimi drifts or needs tighter instruction following.",
    fallbackTrigger: "Falls back when tool execution starts drifting or responses lose precision.",
  },
  {
    match: (input) => input.useCase === "coding" && input.toolCalls === "yes" && input.billing === "api" && input.budget === "15to20",
    primaryId: "anthropic/claude-haiku-4-5",
    primaryReason: "Claude Haiku at ~$4-8/month — best tool reliability per dollar.",
    fallbackId: "moonshot/kimi-k2.5",
    fallbackReason: "Cheaper backup when the main coding pass does not need Haiku quality.",
    fallbackTrigger: "Falls back when the primary run is too expensive for the next task.",
  },
  {
    match: (input) => input.useCase === "coding" && input.toolCalls === "yes" && input.billing === "api" && input.budget === "20to40",
    primaryId: "anthropic/claude-sonnet-4-6",
    primaryReason: "Best coding reliability within API budget.",
    fallbackId: "moonshot/kimi-k2.5",
    fallbackReason: "Keeps costs down when the main coding pass does not need Sonnet quality.",
    fallbackTrigger: "Falls back when the primary run is too expensive for the next task.",
  },
  {
    match: (input) => input.useCase === "coding" && input.toolCalls === "yes" && input.billing === "api" && input.budget === "40plus",
    primaryId: "anthropic/claude-sonnet-4-6",
    primaryReason: "Best-in-class coding on API billing.",
    fallbackId: "anthropic/claude-haiku-4-5",
    fallbackReason: "Cheaper fallback when you still want Anthropic-style tool behavior.",
    fallbackTrigger: "Falls back when long coding runs need a cheaper recovery path.",
  },
  {
    match: (input) => input.useCase === "coding" && input.toolCalls === "no" && input.billing === "api" && input.budget === "10to15",
    primaryId: "google/gemini-2.5-flash",
    primaryReason: "Fast, cheap coding without tool call requirement.",
    fallbackId: "minimax/minimax-m2.5",
    fallbackReason: "Helpful budget backup for lower-stakes code generation and iteration.",
    fallbackTrigger: "Falls back when the faster option loses quality on longer prompts.",
  },
  {
    match: (input) => input.useCase === "coding" && input.toolCalls === "no" && input.billing === "api" && input.budget === "15to20",
    primaryId: "google/gemini-2.5-flash",
    primaryReason: "Best cost-per-token for coding in this range.",
    fallbackId: "moonshot/kimi-k2.5",
    fallbackReason: "More capable backup for higher-stakes coding tasks.",
    fallbackTrigger: "Falls back when the faster option loses quality on longer prompts.",
  },
  {
    match: (input) => input.useCase === "coding" && input.toolCalls === "no" && input.billing === "api" && input.budget === "20to40",
    primaryId: "anthropic/claude-sonnet-4-6",
    primaryReason: "Strong coding quality at $20-40 API spend.",
    fallbackId: "google/gemini-2.5-flash",
    fallbackReason: "Cheaper backup when you don't need Sonnet-level quality.",
    fallbackTrigger: "Falls back when the task is straightforward and doesn't require Sonnet.",
  },
  {
    match: (input) => input.useCase === "coding" && input.toolCalls === "no" && input.billing === "api" && input.budget === "40plus",
    primaryId: "anthropic/claude-sonnet-4-6",
    primaryReason: "Maximum coding quality on API billing.",
    fallbackId: "anthropic/claude-haiku-4-5",
    fallbackReason: "Lower-cost backup when you still want Anthropic-style behavior.",
    fallbackTrigger: "Falls back when the primary model is overkill for the next turn.",
  },
];

const DEFAULT_RULE: RecommendationRule = {
  match: () => true,
  primaryId: "anthropic/claude-sonnet-4-6",
  primaryReason: "Safest all-around choice when your inputs do not strongly point elsewhere.",
  fallbackId: "anthropic/claude-haiku-4-5",
  fallbackReason: "Lower-cost backup that keeps behavior predictable.",
  fallbackTrigger: "Falls back when the primary model is overkill for the next turn.",
};

export function getRecommendation(input: PickerInput): PickerOutput {
  // Return early if no use case is selected
  if (!input.useCase) {
    return {
      primary: {
        displayName: "No Model Selected",
        provider: "None",
        modelId: "none",
        reason: "Select a use case to get a recommendation",
        triggerCondition: undefined,
        estimatedMonthly: { low: 0, high: 0 },
      },
      fallback: {
        displayName: "No Fallback",
        provider: "None", 
        modelId: "none",
        reason: "No fallback available",
        triggerCondition: undefined,
      },
      openRouterWarning: false,
      costRange: { low: 0, high: 0 },
    };
  }

  const rule = RULES.find((candidate) => candidate.match(input)) ?? DEFAULT_RULE;
  const costRange = getEstimatedMonthlyRange(input, rule.primaryId, rule.fallbackId);

  return {
    primary: {
      ...buildModelEntry(rule.primaryId, rule.primaryReason),
      estimatedMonthly: costRange,
    },
    fallback: buildModelEntry(rule.fallbackId, rule.fallbackReason, rule.fallbackTrigger),
    openRouterWarning: hasOpenRouterModel([rule.primaryId, rule.fallbackId]),
    costRange,
    caveat: rule.caveat,
    showComparison: rule.showComparison,
  };
}
