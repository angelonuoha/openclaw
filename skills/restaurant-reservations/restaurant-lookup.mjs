/**
 * Restaurant Lookup Service
 * Uses Google Places API to find restaurant information and phone numbers
 */

/**
 * Search for a restaurant using Google Places API
 * @param {string} restaurantName - Name of the restaurant
 * @param {string} location - Location (city, address, or "near me")
 * @param {string} apiKey - Google Places API key
 * @returns {Promise<Object>} Restaurant details including phone number
 */
export async function findRestaurant(restaurantName, location, apiKey) {
  const query = `${restaurantName} ${location}`;

  // Use Google Places API Text Search
  const searchUrl = new URL('https://maps.googleapis.com/maps/api/place/textsearch/json');
  searchUrl.searchParams.set('query', query);
  searchUrl.searchParams.set('type', 'restaurant');
  searchUrl.searchParams.set('key', apiKey);

  const searchResponse = await fetch(searchUrl.toString());
  const searchData = await searchResponse.json();

  if (!searchResponse.ok || searchData.status !== 'OK') {
    throw new Error(`Failed to find restaurant: ${searchData.status} - ${searchData.error_message || 'Unknown error'}`);
  }

  if (!searchData.results || searchData.results.length === 0) {
    throw new Error(`No restaurants found matching "${restaurantName}" in ${location}`);
  }

  // Get the top result
  const place = searchData.results[0];

  // Get detailed information including phone number
  const detailsUrl = new URL('https://maps.googleapis.com/maps/api/place/details/json');
  detailsUrl.searchParams.set('place_id', place.place_id);
  detailsUrl.searchParams.set('fields', 'name,formatted_address,formatted_phone_number,international_phone_number,opening_hours,rating,website');
  detailsUrl.searchParams.set('key', apiKey);

  const detailsResponse = await fetch(detailsUrl.toString());
  const detailsData = await detailsResponse.json();

  if (!detailsResponse.ok || detailsData.status !== 'OK') {
    throw new Error(`Failed to get restaurant details: ${detailsData.status}`);
  }

  const details = detailsData.result;

  return {
    name: details.name,
    address: details.formatted_address,
    phoneNumber: details.international_phone_number || details.formatted_phone_number,
    rating: details.rating,
    website: details.website,
    openingHours: details.opening_hours?.weekday_text,
    placeId: place.place_id
  };
}

/**
 * Format phone number for calling (E.164 format)
 * @param {string} phoneNumber - Phone number in any format
 * @returns {string} Formatted phone number for dialing
 */
export function formatPhoneForCalling(phoneNumber) {
  if (!phoneNumber) {
    throw new Error('No phone number provided');
  }

  // Remove all non-digit characters except leading +
  let cleaned = phoneNumber.replace(/[^\d+]/g, '');

  // If it starts with +, keep it; otherwise add +1 for US numbers
  if (!cleaned.startsWith('+')) {
    // Assume US number if no country code
    if (cleaned.length === 10) {
      cleaned = '+1' + cleaned;
    } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
      cleaned = '+' + cleaned;
    } else {
      throw new Error(`Invalid phone number format: ${phoneNumber}`);
    }
  }

  return cleaned;
}
