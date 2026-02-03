# Restaurant Reservation System

AI-powered restaurant reservation system that finds restaurants, looks up their phone numbers, and makes reservation calls automatically using Vapi AI.

## How to Use via Telegram

Simply message your Telegram bot:

> "Can you make a reservation for me at Carbone in New York for tomorrow at 7:30 PM for 2 people?"

The bot will:
1. Look up the restaurant using Google Places
2. Find the phone number
3. Call the restaurant using Vapi AI
4. Make the reservation for you
5. Report back with the results

## Example Commands

```
"Make a reservation at The French Laundry in Yountville for Friday at 7pm for 4 people"

"Book a table at Per Se tomorrow at 8:30pm for 2"

"Can you get me a reservation at Eleven Madison Park next Tuesday at 6pm for 3 people?"

"Check the status of my reservation call" (after making a reservation)
```

## What Information You Need to Provide

- **Restaurant name** (e.g., "Carbone", "The French Laundry")
- **Location** (city or "near me")
- **Date** (e.g., "tomorrow", "Friday", "January 30th")
- **Time** (e.g., "7:30 PM", "19:30")
- **Party size** (number of people)
- **Your name** (for the reservation)
- **Your phone number** (for callbacks)

The bot will ask for any missing information.

## How It Works

1. **Restaurant Lookup**: Uses Google Places API to find the restaurant and get its phone number
2. **AI Calling**: Uses Vapi to make an actual phone call to the restaurant
3. **Natural Conversation**: The AI assistant talks to the restaurant staff naturally to make the reservation
4. **Confirmation**: Reports back with the reservation details and call transcript

## Features

- ✅ Automatic restaurant lookup
- ✅ Natural language phone calls
- ✅ Works with any restaurant
- ✅ Full call transcripts
- ✅ Recording of calls
- ✅ Status tracking

## API Keys Required

- **Google Places API** - For restaurant lookups
- **Vapi API** - For making phone calls

Both are configured and ready to use!

## Files

- `restaurant-lookup.mjs` - Google Places integration
- `vapi-caller.mjs` - Vapi AI phone call integration
- `make-reservation.mjs` - Main orchestrator
- `../restaurant-reservations-mcp/` - MCP server for Telegram integration

## Troubleshooting

If the bot can't find a restaurant:
- Try being more specific with the name
- Include the city or neighborhood
- Make sure the restaurant exists and is listed on Google

If the call fails:
- The restaurant might not answer
- The phone number might be incorrect
- Vapi service might be temporarily unavailable

You can always check the call status to see transcripts and recordings.
