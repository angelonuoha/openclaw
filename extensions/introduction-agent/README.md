# Introduction Agent

Make introduction phone calls using VAPI AI with ElevenLabs voice. Bella will call the specified phone number, introduce itself as your AI assistant, and explain what it can help with.

## Features

- **Outbound calls via VAPI** - Uses VAPI's AI phone calling platform with ElevenLabs voice
- **Personalized introductions** - Introduces itself as your (Angel's) AI assistant
- **Security guardrails** - The agent is instructed to never share personal information
- **Natural conversation** - Responds to questions, handles objections gracefully
- **Call recording** - All calls are recorded with transcripts available
- **CLI, tool, and gateway support** - Use via command line, agent tools, or remote gateway

## How It Works

1. You provide a phone number to call
2. VAPI initiates the call using your configured phone number
3. Bella answers and introduces itself when the recipient picks up
4. The AI agent explains what it can help with and answers questions
5. The call is recorded and transcript is available afterwards

## Prerequisites

The extension uses your existing VAPI setup:
- **VAPI API Key**: `050a0e94-39e7-4a08-867b-449d28fcc359`
- **Phone Number ID**: `d230eeda-e422-4f76-b901-a0a6a3fc1cd5`
- **Voice ID**: `LXYjKEgGhXKDA2YFbd8f` (Angel's custom voice)

These are pre-configured with defaults from your existing restaurant reservations setup.

## Configuration

The extension works out of the box with environment variables. Optionally add to `~/.moltbot/config.json`:

```json
{
  "plugins": {
    "entries": {
      "introduction-agent": {
        "enabled": true,
        "ownerName": "Angel",
        "ownerPhone": "+18326166714",
        "ownerEmail": "u.onuoha7@gmail.com"
      }
    }
  }
}
```

Or set `VAPI_API_KEY` in your environment (already configured in `~/.clawdbot/credentials/api-keys.txt`).

### Configuration Options

| Option | Required | Default | Description |
|--------|----------|---------|-------------|
| `enabled` | No | `true` | Enable/disable the plugin |
| `vapiApiKey` | Yes* | env var | VAPI API key (*uses env if not set) |
| `vapiPhoneNumberId` | No | built-in | Your VAPI phone number ID |
| `defaultToNumber` | No | - | Default phone number to call |
| `ownerName` | No | `"Angel"` | Your name |
| `ownerPhone` | No | `"+18326166714"` | Your callback phone |
| `ownerEmail` | No | `"u.onuoha7@gmail.com"` | Your email |
| `voiceId` | No | built-in | ElevenLabs voice ID |
| `voiceStability` | No | `0.5` | Voice stability (0-1) |
| `voiceSimilarityBoost` | No | `0.75` | Voice similarity (0-1) |
| `useSpeakerBoost` | No | `true` | Enable speaker boost for clarity |
| `maxDurationSeconds` | No | `300` | Max call duration |
| `responseDelaySeconds` | No | `1.0` | Response delay for natural conversation |
| `silenceTimeoutSeconds` | No | `30` | Silence timeout before ending |

## Usage

### CLI

```bash
# Call a specific number
moltbot introduce --to +15551234567

# Personalize with recipient's name
moltbot introduce --to +15551234567 --name "John"

# Use a custom first message
moltbot introduce --to +15551234567 --message "Hi! This is Bella calling about..."

# Check call status
moltbot introduce-status --id <call-id>

# Get full transcript
moltbot introduce-status --id <call-id> --transcript

# Output as JSON
moltbot introduce-status --id <call-id> --json
```

### Agent Tool

Two tools are available to agents:

**`introduction_call`** - Make an introduction call:
```
Use the introduction_call tool to call +15551234567 and introduce yourself.
```

**`check_introduction_status`** - Check call status:
```
Use check_introduction_status with callId "abc-123" to see the transcript.
```

### Gateway Methods

**`introduction.call`** - Initiate a call:
```json
{
  "method": "introduction.call",
  "params": {
    "to": "+15551234567",
    "recipientName": "John",
    "customMessage": "Optional custom first message"
  }
}
```

**`introduction.status`** - Check call status:
```json
{
  "method": "introduction.status",
  "params": {
    "callId": "abc-123-def"
  }
}
```

## What Bella Says

When the call connects, Bella will:

1. **Introduce itself**: "Hi! This is Bella, Angel's AI assistant..."
2. **Explain its purpose**: "I'm calling to introduce myself and let you know I'm available to help..."
3. **Describe capabilities**: Answering questions, scheduling, reminders, messaging platforms
4. **Answer questions**: Responds naturally to whatever the recipient asks
5. **End politely**: If they're not interested or busy, thanks them and ends the call

## Security Guardrails

The introduction agent has built-in security rules:

1. **No personal information sharing** - Won't reveal addresses, financial info, or private details
2. **Contact info only on request** - Only shares your phone/email if specifically asked
3. **Honest AI disclosure** - Always identifies itself as an AI assistant
4. **Boundary enforcement** - Politely declines inappropriate requests
5. **Graceful call ending** - Ends call politely if conversation becomes inappropriate

## Example Conversation

```
Bella: Hi! This is Bella, Angel's AI assistant. I'm calling to introduce
          myself and let you know I'm available to help you with various things.
          Is now a good time to chat?

Recipient: Oh, hi! Yeah, I have a minute. What kind of things can you help with?

Bella: Great! I can help with answering questions, scheduling and reminders,
          and I work across different messaging platforms like Telegram, WhatsApp,
          and Discord. I'm available 24/7, so you can reach out anytime.

Recipient: That's cool. How do I get in touch?

Bella: You can message me on Telegram or WhatsApp - Angel can share the
          contact info with you. Or just ask Angel to connect us!

Recipient: Sounds good. Thanks for calling!

Bella: Thanks for your time! Have a great day!
```

## Troubleshooting

### "VAPI API key not configured" error
Set `VAPI_API_KEY` in your environment or add `vapiApiKey` to the plugin config.

### Call not connecting
- Verify the phone number is in E.164 format (+15551234567)
- Check your VAPI dashboard for call logs
- Ensure your VAPI account has sufficient balance

### No recording/transcript available
Recordings take a few minutes to process after the call ends. Try checking status again after a minute or two.

## Files

```
extensions/introduction-agent/
├── package.json              # Extension package definition
├── index.ts                  # Main plugin entry point
├── clawdbot.plugin.json      # UI configuration schema
├── README.md                 # This file
└── src/
    ├── config.ts             # Configuration schema with Zod validation
    ├── vapi-client.ts        # VAPI API client for phone calls
    └── prompts.ts            # System prompt and message generation
```
