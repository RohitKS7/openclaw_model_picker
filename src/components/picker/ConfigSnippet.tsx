"use client";

import { useState } from "react";

interface ConfigSnippetProps {
  primaryModelId: string;
  fallbackModelId: string;
  fallbackTrigger: string;
}

function generateSnippet(primaryModelId: string, fallbackModelId: string, fallbackTrigger: string): string {
  const isMiniMax = primaryModelId.startsWith("minimax/");

  if (isMiniMax) {
    const modelName = primaryModelId.replace("minimax/", "");
    return JSON.stringify({
      agents: {
        defaults: {
          model: { primary: primaryModelId }
        }
      },
      models: {
        mode: "merge",
        providers: {
          minimax: {
            baseUrl: "https://api.minimax.chat/v1",
            apiKey: "${MINIMAX_API_KEY}",
            api: "openai-completions",
            models: [{ id: modelName, name: "MiniMax M2.5" }]
          }
        }
      }
    }, null, 2);
  }

  return JSON.stringify({
    model: primaryModelId,
    fallbackModel: fallbackModelId,
    fallbackTrigger,
  }, null, 2);
}

export function ConfigSnippet({ primaryModelId, fallbackModelId, fallbackTrigger }: ConfigSnippetProps) {
  const [copied, setCopied] = useState(false);
  const isMiniMax = primaryModelId.startsWith("minimax/");
  const snippet = generateSnippet(primaryModelId, fallbackModelId, fallbackTrigger);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section className="rounded-brand border border-primary/20 bg-background/95 p-5 hover-lift">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Paste-ready Config</p>
          <h3 className="mt-1 text-xl font-bold">Copy directly into your setup</h3>
        </div>
        <button
          type="button"
          onClick={onCopy}
          className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-accent-foreground transition hover:opacity-90"
        >
          {copied ? "Copied" : "Copy JSON"}
        </button>
      </div>

      <pre className="mt-4 overflow-x-auto rounded-brand border border-primary/15 bg-secondary/35 p-4 text-sm text-foreground">
        <code>{snippet}</code>
      </pre>

      {isMiniMax ? (
        <p className="mt-3 text-sm text-muted-foreground">
          MiniMax requires provider config — paste the full block above into your clawdbot.json
        </p>
      ) : null}
    </section>
  );
}
