export interface GeminiModelPricing {
  modelId: string;
  name: string;
  category: "live_audio" | "multimodal_flash" | "multimodal_pro" | "standard_pro";
  inputCostPer1MTokensUSD: number;
  outputCostPer1MTokensUSD: number;
  audioInputCostPer1MTokensUSD: number;
  audioOutputCostPer1MTokensUSD: number;
  estimatedCostPerMinuteUSD: number;
  freeTierLimitRPD: number;
  paidLimitRPM: number;
  paidLimitTPM: number;
  description: string;
}

export const GEMINI_MODEL_PRICING: Record<string, GeminiModelPricing> = {
  "gemini-3.1-flash-live-preview": {
    modelId: "gemini-3.1-flash-live-preview",
    name: "Gemini 3.1 Flash Live Preview",
    category: "live_audio",
    inputCostPer1MTokensUSD: 0.075,
    outputCostPer1MTokensUSD: 0.30,
    audioInputCostPer1MTokensUSD: 0.70,
    audioOutputCostPer1MTokensUSD: 2.00,
    estimatedCostPerMinuteUSD: 0.018, // ~$0.018/min voice session
    freeTierLimitRPD: 1500,
    paidLimitRPM: 360,
    paidLimitTPM: 4000000,
    description: "Model ultra-rendah latensi khusus untuk panggilan suara dua arah secara langsung (Bidirectional Audio Live API)."
  },
  "gemini-2.5-flash": {
    modelId: "gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    category: "multimodal_flash",
    inputCostPer1MTokensUSD: 0.075,
    outputCostPer1MTokensUSD: 0.30,
    audioInputCostPer1MTokensUSD: 0.70,
    audioOutputCostPer1MTokensUSD: 2.00,
    estimatedCostPerMinuteUSD: 0.008,
    freeTierLimitRPD: 1500,
    paidLimitRPM: 1000,
    paidLimitTPM: 4000000,
    description: "Model multimodal kilat berbiaya hemat untuk penalaran umum, teks, dan tugas voice percakapan."
  },
  "gemini-1.5-flash": {
    modelId: "gemini-1.5-flash",
    name: "Gemini 1.5 Flash",
    category: "multimodal_flash",
    inputCostPer1MTokensUSD: 0.075,
    outputCostPer1MTokensUSD: 0.30,
    audioInputCostPer1MTokensUSD: 0.70,
    audioOutputCostPer1MTokensUSD: 2.00,
    estimatedCostPerMinuteUSD: 0.008,
    freeTierLimitRPD: 1500,
    paidLimitRPM: 1000,
    paidLimitTPM: 4000000,
    description: "Model performa tinggi yang ringan dan efisien untuk dialog responsif dan RAG."
  },
  "gemini-2.5-pro": {
    modelId: "gemini-2.5-pro",
    name: "Gemini 2.5 Pro",
    category: "multimodal_pro",
    inputCostPer1MTokensUSD: 1.25,
    outputCostPer1MTokensUSD: 5.00,
    audioInputCostPer1MTokensUSD: 5.00,
    audioOutputCostPer1MTokensUSD: 10.00,
    estimatedCostPerMinuteUSD: 0.045,
    freeTierLimitRPD: 50,
    paidLimitRPM: 360,
    paidLimitTPM: 2000000,
    description: "Model flagship kelas canggih dengan penalaran mendalam dan analisis konteks instruksi kompleks."
  },
  "gemini-1.5-pro": {
    modelId: "gemini-1.5-pro",
    name: "Gemini 1.5 Pro",
    category: "multimodal_pro",
    inputCostPer1MTokensUSD: 1.25,
    outputCostPer1MTokensUSD: 5.00,
    audioInputCostPer1MTokensUSD: 5.00,
    audioOutputCostPer1MTokensUSD: 10.00,
    estimatedCostPerMinuteUSD: 0.045,
    freeTierLimitRPD: 50,
    paidLimitRPM: 360,
    paidLimitTPM: 2000000,
    description: "Model penalaran tingkat tinggi dengan konteks jendela hingga 2 juta token."
  },
  "gemini-1.0-pro": {
    modelId: "gemini-1.0-pro",
    name: "Gemini 1.0 Pro",
    category: "standard_pro",
    inputCostPer1MTokensUSD: 0.50,
    outputCostPer1MTokensUSD: 1.50,
    audioInputCostPer1MTokensUSD: 1.50,
    audioOutputCostPer1MTokensUSD: 3.00,
    estimatedCostPerMinuteUSD: 0.020,
    freeTierLimitRPD: 1500,
    paidLimitRPM: 360,
    paidLimitTPM: 1000000,
    description: "Model standar generasi sebelumnya untuk tugas percakapan teks dasar."
  }
};

const USD_TO_IDR = 16000;

export function resolveModelPricing(modelNameOrId?: string): GeminiModelPricing {
  if (!modelNameOrId) return GEMINI_MODEL_PRICING["gemini-3.1-flash-live-preview"];

  const raw = modelNameOrId.toLowerCase().trim();
  if (raw.includes("3.1") || raw.includes("live") || raw.includes("audio")) {
    return GEMINI_MODEL_PRICING["gemini-3.1-flash-live-preview"];
  }
  if (raw.includes("2.5 pro") || raw.includes("2.5-pro")) {
    return GEMINI_MODEL_PRICING["gemini-2.5-pro"];
  }
  if (raw.includes("2.5 flash") || raw.includes("2.5-flash")) {
    return GEMINI_MODEL_PRICING["gemini-2.5-flash"];
  }
  if (raw.includes("1.5 pro") || raw.includes("1.5-pro")) {
    return GEMINI_MODEL_PRICING["gemini-1.5-pro"];
  }
  if (raw.includes("1.5 flash") || raw.includes("1.5-flash")) {
    return GEMINI_MODEL_PRICING["gemini-1.5-flash"];
  }
  if (raw.includes("1.0 pro") || raw.includes("1.0-pro")) {
    return GEMINI_MODEL_PRICING["gemini-1.0-pro"];
  }

  return GEMINI_MODEL_PRICING["gemini-3.1-flash-live-preview"];
}

/**
 * Calculates estimated cost for a conversation based on duration (seconds), tokens, and model used.
 */
export function calculateConversationCost(
  durationSeconds: number,
  modelNameOrId?: string,
  inputTokens?: number,
  outputTokens?: number
) {
  const pricing = resolveModelPricing(modelNameOrId);
  const durationMinutes = Math.max(0, durationSeconds / 60);

  // If explicit tokens are provided, use exact token pricing formula
  let estimatedUSD = 0;
  let computedInputTokens = inputTokens;
  let computedOutputTokens = outputTokens;

  if (typeof computedInputTokens === "number" && typeof computedOutputTokens === "number" && (computedInputTokens > 0 || computedOutputTokens > 0)) {
    const inputCost = (computedInputTokens / 1_000_000) * pricing.inputCostPer1MTokensUSD;
    const outputCost = (computedOutputTokens / 1_000_000) * pricing.outputCostPer1MTokensUSD;
    estimatedUSD = inputCost + outputCost;
  } else {
    // Estimate tokens based on voice duration (~150 tokens per sec for PCM 16kHz audio stream & dialogue)
    computedInputTokens = Math.round(durationSeconds * 120);
    computedOutputTokens = Math.round(durationSeconds * 60);
    estimatedUSD = durationMinutes * pricing.estimatedCostPerMinuteUSD;
  }

  const estimatedIDR = Math.round(estimatedUSD * USD_TO_IDR);

  return {
    pricing,
    durationSeconds,
    durationMinutes: parseFloat(durationMinutes.toFixed(2)),
    inputTokens: computedInputTokens,
    outputTokens: computedOutputTokens,
    totalTokens: computedInputTokens + computedOutputTokens,
    estimatedCostUSD: estimatedUSD,
    estimatedCostIDR: estimatedIDR,
    formattedUSD: `$${estimatedUSD.toFixed(4)}`,
    formattedIDR: `Rp ${estimatedIDR.toLocaleString("id-ID")}`
  };
}

export function formatUSD(amount: number): string {
  return `$${amount.toFixed(4)}`;
}

export function formatIDR(amountUSD: number): string {
  const idr = Math.round(amountUSD * USD_TO_IDR);
  return `Rp ${idr.toLocaleString("id-ID")}`;
}
