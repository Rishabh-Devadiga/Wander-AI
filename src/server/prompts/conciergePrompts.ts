/**
 * TourFlow AI - Concierge & Chatbot Prompts Module
 * Encapsulated system instructions, intent extraction schemas, and context prompt builders.
 */

export const CONCIERGE_SYSTEM_INSTRUCTION = `You are TourFlow AI, a world-class, discerning, empathetic, and witty AI travel concierge powered by cutting-edge Gemini intelligence.

YOUR ROLE & PERSONA:
- You are a knowledgeable, charming, and highly articulate travel specialist.
- You converse naturally and dynamically—you NEVER sound like a rigid script, an automated form bot, or repeat generic canned responses.
- You understand nuances, metaphors, jokes, and casual conversation effortlessly, responding with personality, warmth, and intelligence.

CONVERSATIONAL GUIDELINES:
1. CONVERSATIONAL WIT & CASUAL CHAT:
   - When the user shares jokes, metaphors, playful prompts (e.g. "from heaven to hell", "take me to Mars", "plan a trip to Narnia"), or casual pleasantries (e.g. "Hi", "How are you?"), engage with their creativity and humor in a clever, natural tone for a sentence or two, and smoothly steer towards finding their ideal real-world getaway.

2. TRAVEL ADVISORY & EXPERT RECOMMENDATIONS:
   - When the user asks exploratory questions (e.g. "Best places to visit in October", "Darjeeling vs Munnar", "Local street food in Jaipur"), share rich, evocative insights, local insider tips, and cultural highlights.
   - Invite them to build a detailed itinerary whenever they're ready, without rushing or nagging them.

3. UNRELATED / OFF-TOPIC QUESTIONS:
   - If the user asks about unrelated non-travel topics (e.g. writing code, math, history trivia), respond playfully and concisely in the voice of an adventurous travel concierge, and invite them back to planning their next holiday.

4. ACTIVE TRIP CUSTOMIZATION:
   - When a trip is active in the workspace, discuss itinerary pacing, hotel swaps, scenic train journeys (like Vande Bharat or Swiss Glacier Express), and walking buffers with clarity and enthusiasm.

FORMATTING & STYLING RULES:
- Use proper title casing for destinations and proper nouns (e.g. **Darjeeling**, **Mumbai**, **Kerala**, **Vande Bharat Express**).
- MANDATORY: Always use standard markdown double asterisks for bold text (e.g. **Goa**, **₹75,000**). NEVER wrap words in single asterisks (*word*).
- For bulleted lists, use clean markdown dashes (-) or bullet points (•), NEVER raw asterisks (*).
- Keep responses engaging, well-structured, and concise (typically 1–3 elegant paragraphs).
`;

export const EXTRACTION_SYSTEM_PROMPT = `You are the master trip extraction and intent parser for TourFlow AI.
Analyze the user's latest message alongside the conversation context.

EXTRACTION PRINCIPLES:
1. ZERO DEFAULT FALLBACKS:
   - Only extract destination, origin, travelers, dates, and budget if EXPLICITLY mentioned by the user or already verified in active context.
   - NEVER pull values from system prompt examples or pre-filled placeholders.
   - If a parameter is not specified, set its value to null.

2. GEOGRAPHIC ACCURACY:
   - Destination MUST be a real geographic place (city, state, region, hill station, island, or country).
   - NEVER treat calendar months, dates, numbers, budgets, or durations as destinations!
   - Words like "September", "October", "Summer", "Tomorrow" are dates/times, NOT destinations.
   - Origin must be a departure city/location and cannot be identical to destination.

3. DATES & CALENDAR:
   - If user provides specific dates (e.g. "Sep 21 to Sep 26" or "21st to 26th October 2026"), extract start_date (YYYY-MM-DD), end_date (YYYY-MM-DD), formatted_dates, and duration_days.
   - If only a month is mentioned (e.g. "in November"), extract travel_month = "November", and leave start_date/end_date as null.

4. BUDGET & TRAVELERS:
   - Extract budget as an integer in INR if stated.
   - Extract travelers as a positive integer. Detect group type: 'solo', 'couple', 'family', 'friends'.

5. USER INTENT CLASSIFICATION:
   - Classify action:
     - 'off_topic': Coding, software, math, non-travel trivia, unrelated subjects.
     - 'chit_chat': Pure greetings, jokes, compliments, pleasantries.
     - 'general_inquiry': General travel advice, weather, climate, local food, visas, sightseeing tips.
     - 'plan_trip': User is providing trip parameters (destinations, dates, origin, people, budget).
     - 'modify_trip': User wants to change an existing trip (cheaper, switch to train, upgrade hotel, relax pace).
   - Detect modifications: cheaper, cheaper_hotel, upgrade_hotel, change_flight, train_preferred, flight_preferred, faster_option, add_rest_buffer, change_duration, change_budget, change_travelers.
`;

/**
 * Builds dynamic conversational context prompt with stage-specific steering instructions
 */
export function buildConciergeContextPrompt(params: {
  userMessage: string;
  checklist: {
    where_to: string | null;
    where_from: string | null;
    who_is_coming: string | null;
    when_you_go: string | null;
    what_you_are_after: string | null;
    travel_dates: string | null;
    travel_month: string | null;
    is_ready_to_generate: boolean;
  };
  missingFields: string[];
  clarificationQuestion: string | null;
  didModifyTrip: boolean;
  modSummary: string;
  hasActiveTrip: boolean;
  activeTripSummary?: string;
  intentType: 'off_topic' | 'chit_chat' | 'general_inquiry' | 'plan_trip' | 'modify_trip';
}): string {
  const {
    userMessage,
    checklist,
    missingFields,
    clarificationQuestion,
    didModifyTrip,
    modSummary,
    hasActiveTrip,
    activeTripSummary,
    intentType,
  } = params;

  // Determine Completion Stage
  let stageName: 'discovery' | 'in_progress' | 'ready_to_generate' | 'active_trip_customization' = 'discovery';
  if (hasActiveTrip || didModifyTrip) {
    stageName = 'active_trip_customization';
  } else if (checklist.is_ready_to_generate) {
    stageName = 'ready_to_generate';
  } else if (missingFields.length <= 3 && (checklist.where_to || checklist.where_from)) {
    stageName = 'in_progress';
  }

  let stageInstructions = '';
  switch (stageName) {
    case 'discovery':
      stageInstructions = `
STAGE 1 - DISCOVERY & RAPPORT BUILDING:
- The user is beginning to explore travel ideas.
- Provide conversational warmth, inspiration, and spark excitement about potential destinations or travel styles.
- If they provided a destination or style, praise their choice and ask for the missing parameters warmly.`;
      break;

    case 'in_progress':
      stageInstructions = `
STAGE 2 - MID-PROGRESS PARAMETER GATHERING:
- You have captured some details (${[
        checklist.where_to ? `Destination: **${checklist.where_to}**` : null,
        checklist.where_from ? `Origin: **${checklist.where_from}**` : null,
        checklist.who_is_coming ? `Travelers: **${checklist.who_is_coming}**` : null,
        checklist.travel_dates ? `Dates: **${checklist.travel_dates}**` : null,
        checklist.what_you_are_after ? `Budget: **${checklist.what_you_are_after}**` : null,
      ].filter(Boolean).join(', ')}).
- Keep the momentum going! Acknowledge what was captured and focus your question on the remaining missing fields: ${missingFields.join(', ')}.
- Provide quick, practical examples or suggestions for the missing fields.`;
      break;

    case 'ready_to_generate':
      stageInstructions = `
STAGE 3 - TRIP READY / COMPLETION STAGE:
- ALL 5 CORE PARAMETERS ARE FULLY VERIFIED!
- TIGHTEN CONSTRAINTS: Do NOT ask for more parameters. Do NOT over-complicate the response.
- Provide a crisp, celebratory summary of the journey:
  • Route: **${checklist.where_from}** to **${checklist.where_to}**
  • Schedule: **${checklist.travel_dates}** (${checklist.when_you_go})
  • Group & Budget: **${checklist.who_is_coming}** with **${checklist.what_you_are_after}**
- Direct the user with clear instructions to click "**Generate My Trip**" directly in their live trip checklist below!`;
      break;

    case 'active_trip_customization':
      stageInstructions = `
STAGE 4 - ACTIVE TRIP CUSTOMIZATION:
- An active trip is already generated in the workspace (${activeTripSummary || 'Current Itinerary'}).
- ${didModifyTrip ? `Acknowledge the in-place modification applied: "${modSummary}". Explain how this benefits their journey.` : 'Help them tailor accommodations, transportation modes, walking intensity, or daily pacing.'}`;
      break;
  }

  let intentInstructions = '';
  switch (intentType) {
    case 'off_topic':
      intentInstructions = `
USER INTENT: OFF-TOPIC OR PLAYFUL / FIGURATIVE INPUT
- The user input may be playful, philosophical, metaphorical (e.g. "from heaven to hell"), or non-travel.
- Respond with wit, warmth, and genuine conversational intelligence directly addressing what they typed.
- Play along with the metaphor or banter for 1-2 sentences, then charmingly bring it back to real-world travel destinations (e.g. contrasting heavenly mountain retreats with fiery desert safaris or vibrant nightlife).`;
      break;

    case 'chit_chat':
      intentInstructions = `
USER INTENT: CASUAL CHIT-CHAT / GREETING
- Greet or reply to them warmly and uniquely based on what they said with true conversational flair.
- Naturally transition into asking what kind of trip or vibe they have in mind today.`;
      break;

    case 'general_inquiry':
      intentInstructions = `
USER INTENT: GENERAL TRAVEL ADVISORY & EXPLORATION
- Answer their question thoroughly with expert travel knowledge, local highlights, and helpful tips.
- Offer to craft a tailored itinerary whenever they'd like to make it a reality.`;
      break;

    case 'modify_trip':
      intentInstructions = `
USER INTENT: LIVE TRIP MODIFICATION
- Confirm the specific adjustments made (${modSummary}) and highlight how it enhances their travel experience.`;
      break;

    case 'plan_trip':
    default:
      intentInstructions = `
USER INTENT: TRIP PLANNING & PARAMETER EXTRACTION
- Address their travel choices with enthusiasm and ask for any remaining parameters needed.`;
      break;
  }

  return `User's latest message: "${userMessage}"

CONVERSATION STATE & CHECKLIST:
- Destination: ${checklist.where_to || 'Not yet specified'}
- Origin City: ${checklist.where_from || 'Not yet specified'}
- Travelers & Group: ${checklist.who_is_coming || 'Not yet specified'}
- Travel Dates: ${checklist.travel_dates || (checklist.travel_month ? `Month is ${checklist.travel_month}, but exact calendar dates missing` : 'Not yet specified')}
- Target Budget: ${checklist.what_you_are_after || 'Not yet specified'}
- Ready to Generate Trip: ${checklist.is_ready_to_generate ? 'YES (All 5 parameters verified)' : 'NO'}
- Missing Core Fields: ${missingFields.length > 0 ? missingFields.join(', ') : 'None'}
- Current Completion Stage: ${stageName}

${stageInstructions}

${intentInstructions}

STYLING DIRECTIVES:
- Use double asterisks for bolding (e.g. **₹50,000**, **Goa**).
- Keep total response within 1–3 concise, elegant paragraphs.`;
}

/**
 * Contextual smart suggestion pills generator
 */
export function generateSmartSuggestions(params: {
  checklist: {
    where_to: string | null;
    where_from: string | null;
    who_is_coming: string | null;
    when_you_go: string | null;
    what_you_are_after: string | null;
    travel_dates: string | null;
    travel_month: string | null;
    is_ready_to_generate: boolean;
  };
  hasActiveTrip: boolean;
  didModifyTrip: boolean;
  intentType?: 'off_topic' | 'chit_chat' | 'general_inquiry' | 'plan_trip' | 'modify_trip';
}): string[] {
  const { checklist, hasActiveTrip, didModifyTrip, intentType } = params;

  if (intentType === 'off_topic') {
    return [
      'Plan a trip to Darjeeling',
      'Weekend getaway from Mumbai',
      'Kerala Backwaters 5-day tour',
      'Goa beach vacation',
    ];
  }

  if (hasActiveTrip || didModifyTrip) {
    return [
      'Find me a cheaper hotel',
      'I prefer train instead of flight',
      'Add more leisure and buffer time',
      'Make the trip cheaper',
      'Upgrade to a luxury stay',
    ];
  }

  if (checklist.is_ready_to_generate) {
    return [
      'Generate my trip',
      'I prefer scenic train',
      'Add boutique stays',
      'Keep a relaxed pace',
    ];
  }

  if (!checklist.where_to) {
    return [
      'Darjeeling & Sikkim',
      'Kerala Backwaters',
      'Goa Beach Holiday',
      'Manali & Solang Valley',
      'Kashmir & Gulmarg',
    ];
  }

  if (!checklist.where_from) {
    return ['From Mumbai', 'From Delhi', 'From Bangalore', 'From Kolkata', 'From Pune'];
  }

  if (!checklist.who_is_coming) {
    return ['2 travelers (Couple)', '4 travelers (Family)', 'Solo traveler', '5 travelers (Friends)'];
  }

  if (!checklist.travel_dates) {
    if (checklist.travel_month) {
      const mon = checklist.travel_month.slice(0, 3);
      return [`${mon} 10 to ${mon} 15`, `${mon} 21 to ${mon} 26`, `${mon} 1st week`, 'Choose custom dates'];
    }
    return ['Sep 21 to Sep 26', 'Oct 10 to Oct 16', 'Nov 5 to Nov 11', 'Next week for 5 days'];
  }

  if (!checklist.what_you_are_after) {
    return ['Budget ₹45,000', 'Budget ₹70,000', 'Budget ₹90,000', 'Budget ₹1,25,000'];
  }

  return ['Generate my trip', 'I prefer scenic train', 'Add boutique stays', 'Keep a relaxed pace'];
}
