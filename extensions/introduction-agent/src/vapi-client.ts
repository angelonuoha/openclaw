import type { IntroductionAgentConfig } from "./config.js";
import { getVapiApiKey, getPhoneNumberId } from "./config.js";
import { buildSystemPrompt, generateFirstMessage, generatePersonalizedFirstMessage } from "./prompts.js";

/**
 * Response from VAPI call initiation.
 */
export interface VapiCallResponse {
  id: string;
  status: string;
  createdAt?: string;
  endedAt?: string;
  cost?: number;
}

/**
 * Response from VAPI call status check.
 */
export interface VapiCallStatus {
  id: string;
  status: string;
  duration?: number;
  transcript?: string;
  recordingUrl?: string;
  summary?: string;
  endedReason?: string;
}

/**
 * Parameters for initiating an introduction call.
 */
export interface InitiateCallParams {
  /** Phone number to call (E.164 format) */
  toNumber: string;
  /** Optional name of the person being called */
  recipientName?: string;
  /** Optional custom first message override */
  customFirstMessage?: string;
}

/**
 * Result of a call initiation.
 */
export interface InitiateCallResult {
  success: boolean;
  callId?: string;
  status?: string;
  error?: string;
}

/**
 * VAPI client for making introduction calls.
 */
export class VapiClient {
  private readonly apiKey: string;
  private readonly phoneNumberId: string;
  private readonly config: IntroductionAgentConfig;
  private readonly baseUrl = "https://api.vapi.ai";

  constructor(config: IntroductionAgentConfig) {
    this.config = config;
    this.apiKey = getVapiApiKey(config);
    this.phoneNumberId = getPhoneNumberId(config);
  }

  /**
   * Initiate an introduction call.
   */
  async initiateCall(params: InitiateCallParams): Promise<InitiateCallResult> {
    const { toNumber, recipientName, customFirstMessage } = params;

    // Build the system prompt with owner info
    const systemPrompt = buildSystemPrompt(
      this.config.ownerName,
      this.config.ownerPhone,
      this.config.ownerEmail
    );

    // Generate first message
    const firstMessage = customFirstMessage ||
      (recipientName
        ? generatePersonalizedFirstMessage(this.config.ownerName, recipientName)
        : generateFirstMessage(this.config.ownerName));

    // Build the assistant configuration
    const assistant = {
      model: {
        provider: "openai",
        model: "gpt-4.1",
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
        ],
        temperature: 0.8,
      },
      voice: {
        provider: "11labs",
        voiceId: this.config.voiceId,
        stability: this.config.voiceStability,
        similarityBoost: this.config.voiceSimilarityBoost,
        useSpeakerBoost: this.config.useSpeakerBoost,
      },
      // Wait for the recipient to speak first before Bella responds
      firstMessageMode: "assistant-waits-for-user",
      firstMessage,
      endCallMessage: "Alright, well it was nice chatting! Take care!",
      endCallPhrases: [
        "have a great day",
        "goodbye",
        "take care",
        "thanks for your time",
        "bye",
        "talk to you later",
        "nice talking to you",
      ],
      recordingEnabled: true,
      maxDurationSeconds: this.config.maxDurationSeconds,
      silenceTimeoutSeconds: this.config.silenceTimeoutSeconds,
      responseDelaySeconds: this.config.responseDelaySeconds,
      dialKeypadFunctionEnabled: true,
    };

    try {
      const response = await fetch(`${this.baseUrl}/call/phone`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          assistant,
          phoneNumberId: this.phoneNumberId,
          customer: {
            number: toNumber,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          error: `VAPI API error: ${response.status} - ${
            (errorData as { message?: string }).message || "Unknown error"
          }`,
        };
      }

      const callData = (await response.json()) as VapiCallResponse;

      return {
        success: true,
        callId: callData.id,
        status: callData.status,
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  /**
   * Get the status of a call.
   */
  async getCallStatus(callId: string): Promise<VapiCallStatus> {
    const response = await fetch(`${this.baseUrl}/call/${callId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get call status: ${response.status}`);
    }

    const callData = (await response.json()) as {
      id: string;
      status: string;
      duration?: number;
      transcript?: string;
      recordingUrl?: string;
      summary?: string;
      endedReason?: string;
    };

    return {
      id: callData.id,
      status: callData.status,
      duration: callData.duration,
      transcript: callData.transcript,
      recordingUrl: callData.recordingUrl,
      summary: callData.summary,
      endedReason: callData.endedReason,
    };
  }
}
