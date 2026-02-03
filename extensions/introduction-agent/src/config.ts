import { z } from "zod";

/**
 * Configuration schema for the introduction agent.
 * Uses VAPI for AI-powered phone calls with ElevenLabs voice.
 */
export const IntroductionAgentConfigSchema = z.object({
  /** Whether the extension is enabled */
  enabled: z.boolean().default(true),

  /** VAPI API key for phone calls */
  vapiApiKey: z.string().optional(),

  /** VAPI phone number ID (your outbound number) */
  vapiPhoneNumberId: z.string().optional(),

  /** Default phone number to call if not specified */
  defaultToNumber: z.string().optional(),

  /** Your name (Clawdbot introduces itself as "your" assistant) */
  ownerName: z.string().default("Angel"),

  /** Your phone number for callbacks */
  ownerPhone: z.string().default("+18326166714"),

  /** Your email */
  ownerEmail: z.string().default("u.onuoha7@gmail.com"),

  /** ElevenLabs voice ID (Angel's custom voice) */
  voiceId: z.string().default("LXYjKEgGhXKDA2YFbd8f"),

  /** Voice stability (0-1) - lower = more dynamic/human, higher = more consistent */
  voiceStability: z.number().min(0).max(1).default(0.35),

  /** Voice similarity boost (0-1) */
  voiceSimilarityBoost: z.number().min(0).max(1).default(0.8),

  /** Use speaker boost for clarity */
  useSpeakerBoost: z.boolean().default(true),

  /** Max call duration in seconds */
  maxDurationSeconds: z.number().default(300),

  /** Response delay in seconds (for natural conversation) */
  responseDelaySeconds: z.number().default(1.0),

  /** Silence timeout in seconds */
  silenceTimeoutSeconds: z.number().default(30),
});

export type IntroductionAgentConfig = z.infer<typeof IntroductionAgentConfigSchema>;

// Default VAPI phone number ID from existing setup
export const DEFAULT_VAPI_PHONE_NUMBER_ID = "d230eeda-e422-4f76-b901-a0a6a3fc1cd5";

/**
 * Resolve and validate configuration with defaults.
 */
export function resolveConfig(raw: unknown): IntroductionAgentConfig {
  const input = raw && typeof raw === "object" && !Array.isArray(raw)
    ? raw
    : {};
  return IntroductionAgentConfigSchema.parse(input);
}

/**
 * Validate that required configuration is present.
 */
export function validateConfig(config: IntroductionAgentConfig): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check for VAPI API key in config or environment
  const vapiKey = config.vapiApiKey || process.env.VAPI_API_KEY;
  if (!vapiKey) {
    errors.push("Missing vapiApiKey or VAPI_API_KEY env var");
  }

  // Phone number ID has a default, but warn if not explicitly set
  const phoneNumberId = config.vapiPhoneNumberId || DEFAULT_VAPI_PHONE_NUMBER_ID;
  if (!config.vapiPhoneNumberId && !process.env.VAPI_PHONE_NUMBER_ID) {
    // Using default is fine, no error needed
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get the effective VAPI API key from config or environment.
 */
export function getVapiApiKey(config: IntroductionAgentConfig): string {
  const key = config.vapiApiKey || process.env.VAPI_API_KEY;
  if (!key) {
    throw new Error("VAPI API key not configured");
  }
  return key;
}

/**
 * Get the effective phone number ID from config or default.
 */
export function getPhoneNumberId(config: IntroductionAgentConfig): string {
  return config.vapiPhoneNumberId || process.env.VAPI_PHONE_NUMBER_ID || DEFAULT_VAPI_PHONE_NUMBER_ID;
}
