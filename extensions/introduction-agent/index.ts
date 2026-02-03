import { Type } from "@sinclair/typebox";
import {
  resolveConfig,
  validateConfig,
  type IntroductionAgentConfig,
} from "./src/config.js";
import { VapiClient } from "./src/vapi-client.js";

/**
 * Parse plugin configuration with validation.
 */
const introductionAgentConfigSchema = {
  parse(value: unknown): IntroductionAgentConfig {
    return resolveConfig(value);
  },
  uiHints: {
    enabled: { label: "Enabled" },
    vapiApiKey: {
      label: "VAPI API Key",
      sensitive: true,
      help: "API key from dashboard.vapi.ai",
    },
    vapiPhoneNumberId: {
      label: "VAPI Phone Number ID",
      help: "Your outbound phone number ID in VAPI",
    },
    defaultToNumber: {
      label: "Default To Number",
      placeholder: "+15550001234",
    },
    ownerName: {
      label: "Your Name",
      help: "Bella will introduce itself as 'your' AI assistant",
    },
    ownerPhone: {
      label: "Your Phone",
      help: "Your callback phone number",
    },
    ownerEmail: {
      label: "Your Email",
    },
    voiceId: {
      label: "ElevenLabs Voice ID",
      advanced: true,
    },
    voiceStability: {
      label: "Voice Stability",
      advanced: true,
    },
    voiceSimilarityBoost: {
      label: "Voice Similarity Boost",
      advanced: true,
    },
    maxDurationSeconds: {
      label: "Max Call Duration (seconds)",
      advanced: true,
    },
    responseDelaySeconds: {
      label: "Response Delay (seconds)",
      advanced: true,
    },
    silenceTimeoutSeconds: {
      label: "Silence Timeout (seconds)",
      advanced: true,
    },
  },
};

/**
 * Tool schema for the introduction call tool.
 */
const IntroductionCallToolSchema = Type.Object({
  to: Type.Optional(
    Type.String({
      description: "Phone number to call (E.164 format, e.g., +15551234567)",
    })
  ),
  recipientName: Type.Optional(
    Type.String({
      description: "Name of the person being called (for personalization)",
    })
  ),
  customMessage: Type.Optional(
    Type.String({
      description: "Custom first message override",
    })
  ),
});

/**
 * Tool schema for checking call status.
 */
const CheckCallStatusToolSchema = Type.Object({
  callId: Type.String({
    description: "The call ID to check status for",
  }),
});

/**
 * Introduction Agent Plugin
 *
 * Makes outbound phone calls using VAPI with ElevenLabs voice to introduce
 * Bella as your AI assistant. The agent is instructed to never share
 * personal information and maintains appropriate security boundaries.
 */
const introductionAgentPlugin = {
  id: "introduction-agent",
  name: "Introduction Agent",
  description:
    "Make introduction phone calls using VAPI AI with ElevenLabs voice",
  configSchema: introductionAgentConfigSchema,

  register(api: {
    pluginConfig: unknown;
    logger: { info: (msg: string) => void; warn: (msg: string) => void; error: (msg: string) => void };
    registerGatewayMethod: (
      name: string,
      handler: (ctx: {
        params: Record<string, unknown>;
        respond: (ok: boolean, payload?: unknown) => void;
      }) => Promise<void>
    ) => void;
    registerTool: (tool: {
      name: string;
      label: string;
      description: string;
      parameters: unknown;
      execute: (
        toolCallId: string,
        params: Record<string, unknown>
      ) => Promise<{ content: { type: string; text: string }[]; details?: unknown }>;
    }) => void;
    registerCli: (
      handler: (ctx: { program: unknown }) => void,
      options: { commands: string[] }
    ) => void;
  }) {
    const config = resolveConfig(api.pluginConfig);
    const validation = validateConfig(config);

    let client: VapiClient | null = null;

    /**
     * Get or create the VAPI client (lazy initialization).
     */
    const getClient = (): VapiClient => {
      if (!config.enabled) {
        throw new Error("Introduction agent is disabled");
      }
      if (!validation.valid) {
        throw new Error(validation.errors.join("; "));
      }
      if (!client) {
        client = new VapiClient(config);
      }
      return client;
    };

    /**
     * Initiate an introduction call.
     */
    const initiateIntroductionCall = async (params: {
      to?: string;
      recipientName?: string;
      customMessage?: string;
    }) => {
      const toNumber = params.to || config.defaultToNumber;
      if (!toNumber) {
        throw new Error("Phone number is required (no default configured)");
      }

      // Validate phone number format
      if (!toNumber.match(/^\+[1-9]\d{1,14}$/)) {
        throw new Error(
          "Phone number must be in E.164 format (e.g., +15551234567)"
        );
      }

      const vapiClient = getClient();

      api.logger.info(
        `[introduction-agent] Initiating call to ${toNumber}${
          params.recipientName ? ` (${params.recipientName})` : ""
        }`
      );

      const result = await vapiClient.initiateCall({
        toNumber,
        recipientName: params.recipientName,
        customFirstMessage: params.customMessage,
      });

      return result;
    };

    /**
     * Check call status.
     */
    const checkCallStatus = async (callId: string) => {
      const vapiClient = getClient();
      return vapiClient.getCallStatus(callId);
    };

    // Register gateway method for initiating calls
    api.registerGatewayMethod(
      "introduction.call",
      async ({ params, respond }) => {
        try {
          if (!config.enabled) {
            respond(false, { error: "Introduction agent is disabled" });
            return;
          }

          const to =
            typeof params?.to === "string" ? params.to.trim() : undefined;
          const recipientName =
            typeof params?.recipientName === "string"
              ? params.recipientName.trim()
              : undefined;
          const customMessage =
            typeof params?.customMessage === "string"
              ? params.customMessage.trim()
              : undefined;

          const result = await initiateIntroductionCall({
            to,
            recipientName,
            customMessage,
          });

          if (result.success) {
            respond(true, {
              success: true,
              callId: result.callId,
              status: result.status,
              message: "Introduction call initiated. Bella is calling now!",
            });
          } else {
            respond(false, { error: result.error });
          }
        } catch (err) {
          api.logger.error(
            `[introduction-agent] Call failed: ${
              err instanceof Error ? err.message : String(err)
            }`
          );
          respond(false, {
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }
    );

    // Register gateway method for checking call status
    api.registerGatewayMethod(
      "introduction.status",
      async ({ params, respond }) => {
        try {
          const callId =
            typeof params?.callId === "string" ? params.callId.trim() : "";
          if (!callId) {
            respond(false, { error: "callId required" });
            return;
          }

          const status = await checkCallStatus(callId);
          respond(true, status);
        } catch (err) {
          respond(false, {
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }
    );

    // Register tool for making introduction calls
    api.registerTool({
      name: "introduction_call",
      label: "Introduction Call",
      description:
        "Make an introduction phone call where Bella introduces itself as your AI assistant. " +
        "The call is made using VAPI with an ElevenLabs voice. " +
        "Bella will explain what it can help with and answer questions. " +
        "The agent has security guardrails to prevent sharing personal information.",
      parameters: IntroductionCallToolSchema,
      async execute(_toolCallId, params) {
        const json = (payload: unknown) => ({
          content: [
            { type: "text", text: JSON.stringify(payload, null, 2) },
          ],
          details: payload,
        });

        try {
          const result = await initiateIntroductionCall({
            to: typeof params.to === "string" ? params.to : undefined,
            recipientName:
              typeof params.recipientName === "string"
                ? params.recipientName
                : undefined,
            customMessage:
              typeof params.customMessage === "string"
                ? params.customMessage
                : undefined,
          });

          if (result.success) {
            return json({
              success: true,
              callId: result.callId,
              status: result.status,
              message:
                "Introduction call initiated! Bella is calling now to introduce itself.",
              tip: `Check the call status later with: check_introduction_status with callId "${result.callId}"`,
            });
          } else {
            return json({ success: false, error: result.error });
          }
        } catch (err) {
          return json({
            error: err instanceof Error ? err.message : String(err),
          });
        }
      },
    });

    // Register tool for checking call status
    api.registerTool({
      name: "check_introduction_status",
      label: "Check Introduction Call Status",
      description:
        "Check the status of a previous introduction call, including transcript, recording, and outcome.",
      parameters: CheckCallStatusToolSchema,
      async execute(_toolCallId, params) {
        const json = (payload: unknown) => ({
          content: [
            { type: "text", text: JSON.stringify(payload, null, 2) },
          ],
          details: payload,
        });

        try {
          const callId =
            typeof params.callId === "string" ? params.callId.trim() : "";
          if (!callId) {
            return json({ error: "callId required" });
          }

          const status = await checkCallStatus(callId);
          return json({
            callId: status.id,
            status: status.status,
            duration: status.duration ? `${status.duration} seconds` : undefined,
            endedReason: status.endedReason,
            recordingUrl: status.recordingUrl,
            summary: status.summary,
            transcript: status.transcript,
          });
        } catch (err) {
          return json({
            error: err instanceof Error ? err.message : String(err),
          });
        }
      },
    });

    // Register CLI commands
    api.registerCli(
      ({ program }) => {
        const prog = program as {
          command: (name: string) => {
            description: (desc: string) => {
              option: (flags: string, desc: string) => {
                option: (flags: string, desc: string) => {
                  option: (flags: string, desc: string) => {
                    action: (handler: (opts: Record<string, unknown>) => Promise<void>) => void;
                  };
                };
              };
            };
          };
        };

        // introduce command
        prog
          .command("introduce")
          .description("Make an introduction phone call where Bella introduces itself")
          .option("-t, --to <number>", "Phone number to call (E.164 format)")
          .option("-n, --name <name>", "Name of the person being called")
          .option("-m, --message <message>", "Custom first message")
          .action(async (opts: Record<string, unknown>) => {
            try {
              console.log("\n📞 Initiating introduction call...\n");

              const result = await initiateIntroductionCall({
                to: typeof opts.to === "string" ? opts.to : undefined,
                recipientName: typeof opts.name === "string" ? opts.name : undefined,
                customMessage: typeof opts.message === "string" ? opts.message : undefined,
              });

              if (result.success) {
                console.log("✅ Introduction call initiated!");
                console.log(`   Call ID: ${result.callId}`);
                console.log(`   Status: ${result.status}`);
                console.log("\n   Bella is now calling to introduce itself.");
                console.log(`\n💡 Check status with: moltbot introduce-status --id ${result.callId}`);
              } else {
                console.error("❌ Call failed:", result.error);
                process.exitCode = 1;
              }
            } catch (err) {
              console.error(
                "\n❌ Error:",
                err instanceof Error ? err.message : String(err)
              );
              process.exitCode = 1;
            }
          });

        // introduce-status command
        prog
          .command("introduce-status")
          .description("Check the status of an introduction call")
          .option("-i, --id <callId>", "Call ID to check")
          .option("-j, --json", "Output raw JSON")
          .option("-t, --transcript", "Show full transcript")
          .action(async (opts: Record<string, unknown>) => {
            try {
              const callId = typeof opts.id === "string" ? opts.id.trim() : "";
              if (!callId) {
                console.error("❌ Call ID required. Use --id <callId>");
                process.exitCode = 1;
                return;
              }

              const status = await checkCallStatus(callId);

              if (opts.json) {
                console.log(JSON.stringify(status, null, 2));
                return;
              }

              console.log("\n📊 Call Status\n");
              console.log(`   Call ID: ${status.id}`);
              console.log(`   Status: ${status.status}`);
              if (status.duration) {
                console.log(`   Duration: ${status.duration} seconds`);
              }
              if (status.endedReason) {
                console.log(`   Ended: ${status.endedReason}`);
              }
              if (status.recordingUrl) {
                console.log(`\n🎙️  Recording: ${status.recordingUrl}`);
              }
              if (status.summary) {
                console.log(`\n📝 Summary:\n   ${status.summary}`);
              }
              if (opts.transcript && status.transcript) {
                console.log(`\n📜 Transcript:\n${status.transcript}`);
              }
            } catch (err) {
              console.error(
                "\n❌ Error:",
                err instanceof Error ? err.message : String(err)
              );
              process.exitCode = 1;
            }
          });
      },
      { commands: ["introduce", "introduce-status"] }
    );

    // Log configuration status on load
    if (!config.enabled) {
      api.logger.info("[introduction-agent] Plugin disabled");
    } else if (!validation.valid) {
      api.logger.warn(
        `[introduction-agent] Configuration incomplete: ${validation.errors.join("; ")}`
      );
    } else {
      api.logger.info(
        `[introduction-agent] Ready (owner: ${config.ownerName})`
      );
    }
  },
};

export default introductionAgentPlugin;
