#!/usr/bin/env node
/**
 * Restaurant Reservation Orchestrator
 * Combines restaurant lookup and Vapi calling to make reservations
 */

import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { findRestaurant, formatPhoneForCalling } from './restaurant-lookup.mjs';
import { makeReservationCall, getCallStatus } from './vapi-caller.mjs';

// Load environment variables
const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, '..', '..', 'credentials', 'api-keys.txt') });

const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;
const VAPI_API_KEY = process.env.VAPI_API_KEY;

/**
 * Make a restaurant reservation
 * @param {Object} options - Reservation options
 * @param {string} options.restaurantName - Name of the restaurant
 * @param {string} options.location - Location (city or "near me")
 * @param {string} options.date - Reservation date
 * @param {string} options.time - Reservation time
 * @param {number} options.partySize - Number of people
 * @param {string} options.customerName - Name for the reservation
 * @param {string} options.customerPhone - Customer's phone number
 * @returns {Promise<Object>} Reservation result
 */
export async function makeReservation(options) {
  const {
    restaurantName,
    location = 'near me',
    date,
    time,
    partySize,
    customerName = 'Angel Onuoha',
    customerPhone = '+18326166714'
  } = options;

  console.log('\n🔍 Step 1: Looking up restaurant...');
  console.log(`   Restaurant: ${restaurantName}`);
  console.log(`   Location: ${location}`);

  // Step 1: Find the restaurant and get its phone number
  let restaurant;
  try {
    restaurant = await findRestaurant(restaurantName, location, GOOGLE_PLACES_API_KEY);
    console.log(`\n✅ Found: ${restaurant.name}`);
    console.log(`   Address: ${restaurant.address}`);
    console.log(`   Phone: ${restaurant.phoneNumber}`);
    if (restaurant.rating) {
      console.log(`   Rating: ${restaurant.rating}/5`);
    }
  } catch (error) {
    console.error(`\n❌ Failed to find restaurant: ${error.message}`);
    throw error;
  }

  if (!restaurant.phoneNumber) {
    throw new Error('Restaurant phone number not available');
  }

  // Format phone number for calling
  const formattedPhone = formatPhoneForCalling(restaurant.phoneNumber);
  console.log(`   Formatted phone: ${formattedPhone}`);

  console.log('\n📞 Step 2: Making reservation call via Vapi...');
  console.log(`   Date: ${date}`);
  console.log(`   Time: ${time}`);
  console.log(`   Party size: ${partySize}`);
  console.log(`   Name: ${customerName}`);

  // Step 2: Make the call via Vapi
  let callResult;
  try {
    callResult = await makeReservationCall({
      phoneNumber: formattedPhone,
      restaurantName: restaurant.name,
      date,
      time,
      partySize,
      customerName,
      customerPhone,
      vapiApiKey: VAPI_API_KEY
    });

    console.log(`\n✅ Call initiated!`);
    console.log(`   Call ID: ${callResult.callId}`);
    console.log(`   Status: ${callResult.status}`);
  } catch (error) {
    console.error(`\n❌ Failed to initiate call: ${error.message}`);
    throw error;
  }

  // Return the result
  return {
    success: true,
    restaurant: {
      name: restaurant.name,
      address: restaurant.address,
      phone: restaurant.phoneNumber,
      rating: restaurant.rating,
      website: restaurant.website
    },
    call: {
      callId: callResult.callId,
      status: callResult.status,
      phoneNumber: formattedPhone
    },
    reservation: {
      date,
      time,
      partySize,
      customerName,
      customerPhone
    },
    message: `Call initiated to ${restaurant.name}. The AI assistant is now calling to make your reservation for ${partySize} people on ${date} at ${time}.`
  };
}

/**
 * Check the status of a reservation call
 * @param {string} callId - The Vapi call ID
 * @returns {Promise<Object>} Call status and details
 */
export async function checkReservationStatus(callId) {
  console.log(`\n📊 Checking call status for ${callId}...`);

  try {
    const status = await getCallStatus(callId, VAPI_API_KEY);

    console.log(`   Status: ${status.status}`);
    if (status.duration) {
      console.log(`   Duration: ${status.duration}s`);
    }
    if (status.endedReason) {
      console.log(`   Ended: ${status.endedReason}`);
    }

    return {
      success: true,
      callId: status.callId,
      status: status.status,
      duration: status.duration,
      transcript: status.transcript,
      recording: status.recording,
      summary: status.summary,
      endedReason: status.endedReason
    };
  } catch (error) {
    console.error(`\n❌ Failed to get call status: ${error.message}`);
    throw error;
  }
}

// CLI interface for testing
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help') {
    console.log(`
Restaurant Reservation System

Usage:
  node make-reservation.mjs --restaurant "Restaurant Name" --location "City" --date "tomorrow" --time "7:30 PM" --party 2 --name "Your Name" --phone "+12125551234"

Options:
  --restaurant    Restaurant name (required)
  --location      Location/city (default: "near me")
  --date          Reservation date (required, e.g., "tomorrow", "Friday", "Jan 30")
  --time          Reservation time (required, e.g., "7:30 PM")
  --party         Party size (required, number of people)
  --name          Your name for the reservation (required)
  --phone         Your phone number (required, E.164 format recommended)
  --status        Check status of a call by call ID

Example:
  node make-reservation.mjs \\
    --restaurant "The French Laundry" \\
    --location "Yountville, CA" \\
    --date "Friday" \\
    --time "7:00 PM" \\
    --party 2 \\
    --name "John Doe" \\
    --phone "+14155551234"

Check call status:
  node make-reservation.mjs --status CALL_ID
`);
    process.exit(0);
  }

  // Parse arguments
  const options = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].substring(2);
      const value = args[i + 1];
      options[key] = value;
      i++;
    }
  }

  // Check if this is a status check
  if (options.status) {
    try {
      const result = await checkReservationStatus(options.status);
      console.log('\n📋 Call Details:');
      console.log(JSON.stringify(result, null, 2));
    } catch (error) {
      console.error(`\n❌ Error: ${error.message}`);
      process.exit(1);
    }
    return;
  }

  // Validate required fields for making a reservation
  const required = ['restaurant', 'date', 'time', 'party', 'name', 'phone'];
  const missing = required.filter(key => !options[key]);

  if (missing.length > 0) {
    console.error(`❌ Missing required options: ${missing.map(k => '--' + k).join(', ')}`);
    console.error('Run with --help for usage information.');
    process.exit(1);
  }

  try {
    const result = await makeReservation({
      restaurantName: options.restaurant,
      location: options.location || 'near me',
      date: options.date,
      time: options.time,
      partySize: parseInt(options.party),
      customerName: options.name,
      customerPhone: options.phone
    });

    console.log('\n🎉 Success!');
    console.log('\n📋 Reservation Details:');
    console.log(JSON.stringify(result, null, 2));

    console.log('\n💡 Tip: Check the call status in a few minutes with:');
    console.log(`   node make-reservation.mjs --status ${result.call.callId}`);
  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
    process.exit(1);
  }
}

// Only run main() if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
