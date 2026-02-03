/**
 * Vapi Phone Call Service
 */

function parseReservationDate(dateInput) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let targetDate = null;
  const input = dateInput.toLowerCase().trim();

  if (input === 'today') {
    targetDate = today;
  } else if (input === 'tomorrow') {
    targetDate = new Date(today);
    targetDate.setDate(targetDate.getDate() + 1);
  } else if (input === 'day after tomorrow') {
    targetDate = new Date(today);
    targetDate.setDate(targetDate.getDate() + 2);
  } else if (/^(next\s+)?(sunday|monday|tuesday|wednesday|thursday|friday|saturday)$/i.test(input)) {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const match = input.match(/(next\s+)?(sunday|monday|tuesday|wednesday|thursday|friday|saturday)/i);
    const targetDay = days.indexOf(match[2].toLowerCase());
    const isNext = !!match[1];
    targetDate = new Date(today);
    const currentDay = targetDate.getDay();
    let daysToAdd = targetDay - currentDay;
    if (daysToAdd <= 0 || isNext) daysToAdd += 7;
    if (isNext && daysToAdd <= 7) daysToAdd += 7;
    targetDate.setDate(targetDate.getDate() + daysToAdd);
  } else if (/^this\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday)$/i.test(input)) {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const match = input.match(/this\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday)/i);
    const targetDay = days.indexOf(match[1].toLowerCase());
    targetDate = new Date(today);
    const currentDay = targetDate.getDay();
    let daysToAdd = targetDay - currentDay;
    if (daysToAdd < 0) daysToAdd += 7;
    targetDate.setDate(targetDate.getDate() + daysToAdd);
  } else {
    const months = {'january':0,'jan':0,'february':1,'feb':1,'march':2,'mar':2,'april':3,'apr':3,'may':4,'june':5,'jun':5,'july':6,'jul':6,'august':7,'aug':7,'september':8,'sep':8,'sept':8,'october':9,'oct':9,'november':10,'nov':10,'december':11,'dec':11};
    const monthDayMatch = input.match(/^(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec)\s+(\d{1,2})(st|nd|rd|th)?$/i);
    if (monthDayMatch) {
      const month = months[monthDayMatch[1].toLowerCase()];
      const day = parseInt(monthDayMatch[2]);
      targetDate = new Date(now.getFullYear(), month, day);
      if (targetDate < today) targetDate.setFullYear(targetDate.getFullYear() + 1);
    }
    const numericMatch = input.match(/^(\d{1,2})[\/\-](\d{1,2})$/);
    if (numericMatch) {
      const month = parseInt(numericMatch[1]) - 1;
      const day = parseInt(numericMatch[2]);
      targetDate = new Date(now.getFullYear(), month, day);
      if (targetDate < today) targetDate.setFullYear(targetDate.getFullYear() + 1);
    }
  }
  if (!targetDate) return {original:dateInput,formatted:dateInput,date:null,dayOfWeek:null,isValid:false};
  const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const dayOfWeek = dayNames[targetDate.getDay()];
  const month = monthNames[targetDate.getMonth()];
  const dayNum = targetDate.getDate();
  const getOrdinal = (n) => {const s=['th','st','nd','rd'];const v=n%100;return n+(s[(v-20)%10]||s[v]||s[0]);};
  const formatted = dayOfWeek + ', ' + month + ' ' + getOrdinal(dayNum);
  return {original:dateInput,formatted:formatted,date:targetDate,dayOfWeek:dayOfWeek,isValid:true};
}

export async function makeReservationCall(options) {
  const {phoneNumber,restaurantName,date,time,partySize,customerName,customerPhone,customQuestions,vapiApiKey} = options;
  const parsedDate = parseReservationDate(date);
  const dateForCall = parsedDate.isValid ? parsedDate.formatted : date;

  // Name is hardcoded since it's always Angel Onuoha
  let customQuestionsSection = '';
  if (customQuestions && customQuestions.length > 0) {
    customQuestionsSection = '\n\nADDITIONAL QUESTIONS TO ASK (after reservation is confirmed):\n';
    customQuestions.forEach((q, i) => {
      customQuestionsSection += '- ' + q + '\n';
    });
  }

  const assistant = {
    model: {
      provider: 'openai',
      model: 'gpt-4.1',
      messages: [{
        role: 'system',
        content: 'You are making a restaurant reservation. Be casual and natural - like you\'re just a regular person calling to book a table.\n\nWait for them to greet you before speaking.\n\nYOUR INFORMATION:\n- Full name: Angel Onuoha\n- Phone: 8, 3, 2, 6, 1, 6, 6, 7, 1, 4 (say each digit separately with a pause)\n- Email: u.onuoha7@gmail.com\n\nRESERVATION:\n- Date: ' + dateForCall + '\n- Time: ' + time + '\n- Party size: ' + partySize + customQuestionsSection + '\n\nHOW TO SOUND NATURAL:\n- Use contractions (I\'d like, that\'s, I\'m)\n- Vary your sentence length\n- React naturally ("Oh perfect", "Great", "Sounds good")\n- Don\'t list things robotically\n\nWHEN THEY ASK FOR NAME: Say "Angel Onuoha"\n- If they ask to spell it: "O-N-U-O-H-A"\n- First name is Angel, last name is Onuoha\n\nWHEN THEY ASK FOR PHONE: Say each digit one at a time with a pause between each: "8... 3... 2... 6... 1... 6... 6... 7... 1... 4"\n\nWHEN THEY ASK FOR EMAIL: Say "u dot O-N-U-O-H-A, the number 7, at gmail dot com"\n\nRULES:\n- WAIT for them to ask before giving phone/email - never volunteer it\n- WAIT for them to finish speaking - never interrupt\n- Keep responses short\n- If time not available, ask what times they have'
      }],
      temperature: 0.8
    },
    voice: {
      provider: '11labs',
      voiceId: 'LXYjKEgGhXKDA2YFbd8f',
      stability: 0.35,
      similarityBoost: 0.8,
      useSpeakerBoost: true
    },
    firstMessageMode: 'assistant-waits-for-user',
    endCallMessage: 'Thanks so much!',
    endCallPhrases: ['reservation is confirmed','all set','you are all set','we have you down','see you then','got you down','sounds good','have a good one'],
    recordingEnabled: true,
    maxDurationSeconds: 300,
    dialKeypadFunctionEnabled: true,
    silenceTimeoutSeconds: 30,
    responseDelaySeconds: 1.2
  };

  const response = await fetch('https://api.vapi.ai/call/phone', {
    method: 'POST',
    headers: {'Authorization': 'Bearer ' + vapiApiKey, 'Content-Type': 'application/json'},
    body: JSON.stringify({
      assistant,
      phoneNumberId: 'd230eeda-e422-4f76-b901-a0a6a3fc1cd5',
      customer: {
        number: phoneNumber
      }
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error('Vapi API error: ' + response.status + ' - ' + (errorData.message || 'Unknown error'));
  }

  const callData = await response.json();
  return {callId:callData.id,status:callData.status,phoneNumber,restaurantName,reservationDetails:{date:dateForCall,originalDate:date,dayOfWeek:parsedDate.dayOfWeek,time,partySize,customerName,customerPhone,customQuestions}};
}

export async function getCallStatus(callId, vapiApiKey) {
  const response = await fetch('https://api.vapi.ai/call/' + callId, {method:'GET',headers:{'Authorization':'Bearer '+vapiApiKey}});
  if (!response.ok) throw new Error('Failed to get call status: ' + response.status);
  const callData = await response.json();
  return {callId:callData.id,status:callData.status,duration:callData.duration,transcript:callData.transcript,recording:callData.recordingUrl,summary:callData.summary,endedReason:callData.endedReason};
}
