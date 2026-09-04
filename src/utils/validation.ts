// TourFlow AI Trip Validation & Information Extraction Utilities
// Enforces strict rules for destinations, origins, dates, durations, travelers, and budgets.

export const INVALID_DESTINATIONS_SET = new Set([
  // Calendar & Months
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
  'jan', 'feb', 'mar', 'apr', 'jun', 'jul', 'aug', 'sep', 'sept', 'oct', 'nov', 'dec',
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
  'mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun', 'weekend', 'weekdays',
  'summer', 'monsoon', 'winter', 'spring', 'autumn', 'fall',
  'today', 'tomorrow', 'yesterday', 'next week', 'this week', 'next month', 'this month',
  'day', 'days', 'week', 'weeks', 'month', 'months', 'year', 'years',

  // Greetings & Pleasantries
  'hello', 'hi', 'hey', 'howdy', 'hola', 'namaste', 'morning', 'good morning',
  'evening', 'good evening', 'afternoon', 'good afternoon', 'night', 'good night',
  'bye', 'goodbye', 'thanks', 'thank', 'thank you', 'welcome', 'please', 'help',
  'ok', 'okay', 'yes', 'no', 'yeah', 'nope', 'cool', 'awesome', 'nice', 'great',
  'fine', 'sure', 'test', 'testing', 'sample', 'demo', 'bot', 'assistant', 'ai',

  // Non-geographic / Placeholders / Figurative
  'heaven', 'hell', 'paradise', 'earth', 'world', 'universe', 'mars', 'moon', 'sky',
  'somewhere', 'anywhere', 'nowhere', 'everywhere', 'here', 'there', 'home',
  'office', 'work', 'school', 'college', 'house', 'room', 'bed', 'place', 'city',
  'none', 'null', 'undefined', 'na', 'unknown',

  // Common verbs & questions
  'who', 'what', 'where', 'when', 'why', 'how', 'which', 'whose', 'whom',
  'go', 'going', 'visit', 'travel', 'plan', 'planning', 'want', 'like', 'need', 'wish',
  'see', 'view', 'explore', 'exploring', 'tell', 'show', 'give', 'make', 'create',

  // Travel components
  'trip', 'tour', 'holiday', 'vacation', 'flight', 'flights', 'train', 'trains', 'bus', 'buses', 'road',
  'hotel', 'hotels', 'stay', 'stays', 'resort', 'resorts', 'cab', 'cabs', 'car', 'cars',
  'family', 'couple', 'solo', 'friends', 'people', 'persons', 'travelers', 'pax', 'adults', 'children', 'guests',
  'budget', 'cheap', 'cheaper', 'luxury', 'moderate', 'itinerary', 'destination', 'origin',

  // Prepositions & common stop words
  'to', 'from', 'in', 'on', 'at', 'by', 'for', 'with', 'about', 'against', 'between',
  'into', 'through', 'during', 'before', 'after', 'above', 'below', 'up', 'down', 'out',
  'off', 'over', 'under', 'again', 'further', 'then', 'once', 'and', 'or', 'but', 'if',
  'the', 'a', 'an', 'this', 'that', 'these', 'those', 'my', 'your', 'our', 'their', 'his', 'her'
]);

export const MONTHS_MAP: Record<string, number> = {
  jan: 0, january: 0,
  feb: 1, february: 1,
  mar: 2, march: 2,
  apr: 3, april: 3,
  may: 4,
  jun: 5, june: 5,
  jul: 6, july: 6,
  aug: 7, august: 7,
  sep: 8, sept: 8, september: 8,
  oct: 9, october: 9,
  nov: 10, november: 10,
  dec: 11, december: 11,
};

export const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const FULL_MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

/**
 * Validates whether a candidate string is a real geographic place.
 * Returns true if the string is INVALID (e.g. a greeting, month, date, number, season, or generic word).
 */
export function isInvalidDestination(val: string | null | undefined): boolean {
  if (!val || typeof val !== 'string') return true;
  let raw = val.trim();
  if (raw.length < 2) return true;

  // Clean leading/trailing prepositions: "from Heaven to" -> "Heaven"
  raw = raw.replace(/^(?:from|to|in|at|for|with|into|towards|out\s+of|departing\s+from|leaving\s+from)\s+/i, '').trim();
  raw = raw.replace(/\s+(?:to|from|in|at|for|with|on|and|or)$/i, '').trim();
  if (raw.length < 2) return true;

  const clean = raw.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
  if (!clean || clean.length < 2) return true;

  // Exact match against invalid list
  if (INVALID_DESTINATIONS_SET.has(clean)) return true;

  // Pure digits or currency or duration phrases (e.g. "90000", "6 days", "₹90,000", "90k")
  if (/^\d+$/.test(clean)) return true;
  if (/^\d+\s*(?:day|days|night|nights|week|weeks|month|months|k|lakh|lac|rs|inr)$/.test(clean)) return true;

  // Multi-word phrase check: if ALL words or the main core word are invalid stop words
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length > 0) {
    const validWords = words.filter(w => !INVALID_DESTINATIONS_SET.has(w));
    if (validWords.length === 0) return true;
    // If phrase is just conversational words like "hello there", "from heaven to", "good morning"
    if (words.some(w => ['hello', 'hi', 'hey', 'heaven', 'test', 'demo'].includes(w))) return true;
  }

  // Check if string is a month or date expression (e.g. "21st September", "21 September to 26 September", "in September 2026")
  const monthRegex = /\b(?:january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec)\b/i;
  if (monthRegex.test(raw)) {
    const words = raw.split(/[\s,–\-]+/).map(w => w.toLowerCase().replace(/[^a-z0-9]/g, '')).filter(Boolean);
    const nonDateWords = words.filter(w => 
      !INVALID_DESTINATIONS_SET.has(w) && 
      !/^\d+/.test(w) && 
      !['in', 'on', 'for', 'from', 'to', 'during', 'of', 'the', 'a', 'an', 'at', 'between', 'and'].includes(w)
    );
    if (nonDateWords.length === 0) {
      return true;
    }
  }

  return false;
}

/**
 * Accurately parses user budget across various notations (numbers, lakhs, k, INR/Rs symbols, under/within phrases).
 */
export function parseBudget(text: string | null | undefined): number | null {
  if (!text || typeof text !== 'string') return null;
  const clean = text.trim();
  if (!clean) return null;

  // 1. Lakhs match e.g. "1.5 lakh", "2 lakhs", "3 lac", "2.5 l", "budget 2 lakh"
  const lakhMatch = clean.match(/([0-9]+(?:\.[0-9]+)?)\s*(?:lakhs?|lacs?|\bl\b)/i);
  if (lakhMatch) {
    const val = parseFloat(lakhMatch[1]) * 100000;
    if (!isNaN(val) && val >= 3000 && val <= 50000000) return Math.round(val);
  }

  // 2. K match e.g. "30k", "50 k", "80k inr", "budget 45k", "under 40k"
  const kMatch = clean.match(/([0-9]+(?:\.[0-9]+)?)\s*k\b/i);
  if (kMatch) {
    const val = parseFloat(kMatch[1]) * 1000;
    if (!isNaN(val) && val >= 1000 && val <= 10000000) return Math.round(val);
  }

  // 3. Explicit budget prefix or constraint phrasing: "budget 40000", "under 30000", "within 50000", "max 60000", "around 35000", "upto 50000", "below 45000", "have 40000", "spend 50000", "change budget to 35000"
  const phraseMatch = clean.match(/(?:budget|under|within|max|maximum|around|upto|up\s+to|below|have|spend|spending|make\s+it|set\s+to|reduce\s+to|change\s+to|cost)\s*(?:of|is|to)?\s*(?:₹|Rs\.?|INR)?\s*([0-9]{1,3}(?:,[0-9]{2,3})+|[0-9]{3,})/i);
  if (phraseMatch) {
    const rawNum = phraseMatch[1].replace(/,/g, '');
    const val = parseInt(rawNum, 10);
    if (!isNaN(val) && val >= 1000 && val <= 50000000) return val;
  }

  // 4. Currency symbol match: "₹40,000", "Rs 50000", "INR 60000", "40000 INR", "50000 rupees"
  const currencyMatch = clean.match(/(?:₹|Rs\.?|INR)\s*([0-9]{1,3}(?:,[0-9]{2,3})+|[0-9]{3,})/i) || clean.match(/([0-9]{1,3}(?:,[0-9]{2,3})+|[0-9]{4,})\s*(?:₹|Rs\.?|INR|rupees|inr|bucks)\b/i);
  if (currencyMatch) {
    const rawNum = currencyMatch[1].replace(/,/g, '');
    const val = parseInt(rawNum, 10);
    if (!isNaN(val) && val >= 1000 && val <= 50000000) return val;
  }

  // 5. Standalone numbers that represent budget: e.g. "30000", "50,000", "45000"
  // (Ignore calendar years 2024 - 2030)
  const standaloneMatch = clean.match(/^\s*(?:₹|Rs\.?|INR)?\s*([0-9]{1,3}(?:,[0-9]{2,3})+|[0-9]{4,7})\s*$/i);
  if (standaloneMatch) {
    const rawNum = standaloneMatch[1].replace(/,/g, '');
    const val = parseInt(rawNum, 10);
    if (val >= 2024 && val <= 2030) return null;
    if (!isNaN(val) && val >= 3000 && val <= 50000000) return val;
  }

  return null;
}

export interface ParsedDates {
  start_date: string | null;
  end_date: string | null;
  formatted_dates: string | null;
  duration_days: number | null;
  travel_month: string | null;
  is_valid: boolean;
}

/**
 * Accurately parses explicit date ranges or intended travel months.
 */
export function parseDateRange(text: string): ParsedDates {
  const clean = text.trim();
  const currentYear = new Date().getFullYear();

  // Check for month mention (e.g. "in September", "for October", "during November")
  let travelMonth: string | null = null;
  const monthMatch = clean.match(/\b(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec)\b/i);
  if (monthMatch) {
    const mIdx = MONTHS_MAP[monthMatch[1].toLowerCase()];
    if (mIdx !== undefined) {
      travelMonth = FULL_MONTH_NAMES[mIdx];
    }
  }

  // Pattern 1: ISO dates e.g. "2026-09-21 to 2026-09-26" or "2026-09-21 - 2026-09-26"
  const isoMatch = clean.match(/(\d{4}-\d{2}-\d{2})\s*(?:to|-|–|until|through)\s*(\d{4}-\d{2}-\d{2})/i);
  if (isoMatch) {
    const s = new Date(isoMatch[1]);
    const e = new Date(isoMatch[2]);
    if (!isNaN(s.getTime()) && !isNaN(e.getTime()) && e >= s) {
      const diffDays = Math.round((e.getTime() - s.getTime()) / 86400000) + 1;
      const sFmt = `${MONTH_NAMES[s.getMonth()]} ${s.getDate()}`;
      const eFmt = `${MONTH_NAMES[e.getMonth()]} ${e.getDate()}, ${e.getFullYear()}`;
      return {
        start_date: isoMatch[1],
        end_date: isoMatch[2],
        formatted_dates: `${sFmt} – ${eFmt}`,
        duration_days: Math.max(1, diffDays),
        travel_month: FULL_MONTH_NAMES[s.getMonth()],
        is_valid: true,
      };
    }
  }

  // Pattern 2: "from September 21 to September 26" / "Sep 21 to Sep 26" / "September 21 to 26" / "Sep 21–26" / "Sep 21 - 26"
  const monthDayRangeMatch = clean.match(
    /(?:from\s+)?([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?\s*(?:to|-|–|until|through)\s*(?:([A-Za-z]+)\s+)?(\d{1,2})(?:st|nd|rd|th)?(?:\s*,?\s*(\d{4}))?/i
  );
  if (monthDayRangeMatch) {
    const m1Str = monthDayRangeMatch[1].toLowerCase();
    const d1 = parseInt(monthDayRangeMatch[2], 10);
    const m2Str = (monthDayRangeMatch[3] || monthDayRangeMatch[1]).toLowerCase();
    const d2 = parseInt(monthDayRangeMatch[4], 10);
    const year = monthDayRangeMatch[5] ? parseInt(monthDayRangeMatch[5], 10) : currentYear;

    if (MONTHS_MAP[m1Str] !== undefined && MONTHS_MAP[m2Str] !== undefined) {
      const m1 = MONTHS_MAP[m1Str];
      const m2 = MONTHS_MAP[m2Str];
      const s = new Date(year, m1, d1);
      const e = new Date(year, m2, d2);
      if (!isNaN(s.getTime()) && !isNaN(e.getTime()) && e >= s) {
        const diffDays = Math.round((e.getTime() - s.getTime()) / 86400000) + 1;
        const sIso = `${year}-${String(m1 + 1).padStart(2, '0')}-${String(d1).padStart(2, '0')}`;
        const eIso = `${year}-${String(m2 + 1).padStart(2, '0')}-${String(d2).padStart(2, '0')}`;
        const sFmt = `${MONTH_NAMES[m1]} ${d1}`;
        const eFmt = m1 === m2 ? `${d2}, ${year}` : `${MONTH_NAMES[m2]} ${d2}, ${year}`;
        return {
          start_date: sIso,
          end_date: eIso,
          formatted_dates: `${sFmt} – ${eFmt}`,
          duration_days: Math.max(1, diffDays),
          travel_month: FULL_MONTH_NAMES[m1],
          is_valid: true,
        };
      }
    }
  }

  // Pattern 3: "21 September to 26 September" / "21 to 26 September" / "21st Sep - 26th Sep" / "21st to 26th September"
  const dayMonthRangeMatch = clean.match(
    /(?:from\s+)?(\d{1,2})(?:st|nd|rd|th)?(?:\s+([A-Za-z]+))?\s*(?:to|-|–|until|through)\s*(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+)(?:\s*,?\s*(\d{4}))?/i
  );
  if (dayMonthRangeMatch) {
    const d1 = parseInt(dayMonthRangeMatch[1], 10);
    const m2Str = dayMonthRangeMatch[4].toLowerCase();
    const m1Str = (dayMonthRangeMatch[2] || dayMonthRangeMatch[4]).toLowerCase();
    const d2 = parseInt(dayMonthRangeMatch[3], 10);
    const year = dayMonthRangeMatch[5] ? parseInt(dayMonthRangeMatch[5], 10) : currentYear;

    if (MONTHS_MAP[m1Str] !== undefined && MONTHS_MAP[m2Str] !== undefined) {
      const m1 = MONTHS_MAP[m1Str];
      const m2 = MONTHS_MAP[m2Str];
      const s = new Date(year, m1, d1);
      const e = new Date(year, m2, d2);
      if (!isNaN(s.getTime()) && !isNaN(e.getTime()) && e >= s) {
        const diffDays = Math.round((e.getTime() - s.getTime()) / 86400000) + 1;
        const sIso = `${year}-${String(m1 + 1).padStart(2, '0')}-${String(d1).padStart(2, '0')}`;
        const eIso = `${year}-${String(m2 + 1).padStart(2, '0')}-${String(d2).padStart(2, '0')}`;
        const sFmt = `${MONTH_NAMES[m1]} ${d1}`;
        const eFmt = m1 === m2 ? `${d2}, ${year}` : `${MONTH_NAMES[m2]} ${d2}, ${year}`;
        return {
          start_date: sIso,
          end_date: eIso,
          formatted_dates: `${sFmt} – ${eFmt}`,
          duration_days: Math.max(1, diffDays),
          travel_month: FULL_MONTH_NAMES[m1],
          is_valid: true,
        };
      }
    }
  }

  // Pattern 4: "from 21st September for 6 days"
  const startAndDurationMatch = clean.match(
    /(?:from|starting|departing)?\s*(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+)(?:\s*,?\s*(\d{4}))?\s*(?:for)?\s*(\d+)\s*(?:day|days)/i
  );
  if (startAndDurationMatch) {
    const d1 = parseInt(startAndDurationMatch[1], 10);
    const mStr = startAndDurationMatch[2].toLowerCase();
    const year = startAndDurationMatch[3] ? parseInt(startAndDurationMatch[3], 10) : currentYear;
    const dur = parseInt(startAndDurationMatch[4], 10);

    if (MONTHS_MAP[mStr] !== undefined && dur > 0) {
      const m1 = MONTHS_MAP[mStr];
      const s = new Date(year, m1, d1);
      const e = new Date(s.getTime() + (dur - 1) * 86400000);
      if (!isNaN(s.getTime()) && !isNaN(e.getTime())) {
        const sIso = `${year}-${String(m1 + 1).padStart(2, '0')}-${String(d1).padStart(2, '0')}`;
        const eIso = `${e.getFullYear()}-${String(e.getMonth() + 1).padStart(2, '0')}-${String(e.getDate()).padStart(2, '0')}`;
        const sFmt = `${MONTH_NAMES[s.getMonth()]} ${s.getDate()}`;
        const eFmt = s.getMonth() === e.getMonth() ? `${e.getDate()}, ${e.getFullYear()}` : `${MONTH_NAMES[e.getMonth()]} ${e.getDate()}, ${e.getFullYear()}`;
        return {
          start_date: sIso,
          end_date: eIso,
          formatted_dates: `${sFmt} – ${eFmt}`,
          duration_days: dur,
          travel_month: FULL_MONTH_NAMES[m1],
          is_valid: true,
        };
      }
    }
  }

  // If only month is provided
  return {
    start_date: null,
    end_date: null,
    formatted_dates: null,
    duration_days: null,
    travel_month: travelMonth,
    is_valid: false,
  };
}

export interface TripValidationResult {
  is_ready_to_generate: boolean;
  destination_valid: boolean;
  dates_valid: boolean;
  origin_valid: boolean;
  duration_valid: boolean;
  travelers_valid: boolean;
  budget_valid: boolean;
  clarification_needed: boolean;
  clarification_question: string | null;
  missing_fields: string[];
  errors: string[];
}

/**
 * Validates extracted trip fields strictly before checklist rendering or trip generation.
 * Enforces zero-default fallback policy and generates precise clarification questions when fields are missing.
 */
export function validateTripFields(params: {
  destination?: string | null;
  origin?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  formatted_dates?: string | null;
  duration_days?: number | null;
  travelers?: number | null;
  budget?: number | null;
  travel_month?: string | null;
}): TripValidationResult {
  const errors: string[] = [];
  const missingFields: string[] = [];

  // 1. Destination Rule
  const isDestValid = Boolean(params.destination && !isInvalidDestination(params.destination));
  if (!isDestValid) {
    missingFields.push('destination');
    if (params.travel_month) {
      errors.push(`Destination cannot be a month. Travel period is set to ${params.travel_month}.`);
    } else {
      errors.push('Destination must be a real geographic place (city, region, state, or country).');
    }
  }

  // 2. Origin Rule (Origin must be provided, valid, and not equal destination)
  let isOriginValid = false;
  if (!params.origin) {
    missingFields.push('origin');
    errors.push('Origin (departure city) is required.');
  } else if (isInvalidDestination(params.origin)) {
    errors.push('Origin is not a valid geographic place.');
  } else if (params.destination && params.origin.trim().toLowerCase() === params.destination.trim().toLowerCase()) {
    errors.push('Origin and destination cannot be the same location.');
  } else {
    isOriginValid = true;
  }

  // 3. Date Rule (Explicit dates required before generation)
  const isDatesValid = Boolean(params.start_date && params.end_date);
  if (!isDatesValid) {
    missingFields.push('dates');
    errors.push('Explicit travel dates (start date and end date) are required.');
  }

  // 4. Duration matches dates when both provided
  let isDurationValid = true;
  if (params.start_date && params.end_date && params.duration_days) {
    const s = new Date(params.start_date);
    const e = new Date(params.end_date);
    if (!isNaN(s.getTime()) && !isNaN(e.getTime()) && e >= s) {
      const diffDays = Math.round((e.getTime() - s.getTime()) / 86400000) + 1;
      if (Math.abs(diffDays - params.duration_days) > 1) {
        errors.push(`Duration (${params.duration_days} days) does not match date range (${diffDays} days).`);
      }
    } else {
      isDurationValid = false;
      errors.push('Travel dates are not in chronological order.');
    }
  }

  // 5. Traveler count is strictly explicit & > 0
  const isTravelersValid = Boolean(typeof params.travelers === 'number' && params.travelers > 0 && params.travelers <= 100);
  if (!isTravelersValid) {
    missingFields.push('travelers');
    errors.push('Traveler count must be explicitly specified.');
  }

  // 6. Budget is strictly explicit & > 0
  const isBudgetValid = Boolean(typeof params.budget === 'number' && params.budget > 0);
  if (!isBudgetValid) {
    missingFields.push('budget');
    errors.push('Target budget must be explicitly specified.');
  }

  const isReady = isDestValid && isDatesValid && isOriginValid && isDurationValid && isTravelersValid && isBudgetValid;

  // Build targeted clarification question based on logged parameters vs missing parameters
  let clarificationQuestion: string | null = null;

  if (!isReady) {
    // 1. If destination is completely missing
    if (!isDestValid) {
      if (params.travel_month) {
        clarificationQuestion = `I noted your planned travel in **${params.travel_month}**, but what destination would you like to explore? (e.g. Darjeeling, Manali, Goa, Kerala, Kashmir, Rajasthan)`;
      } else {
        clarificationQuestion = 'Where would you like to travel? Please specify a geographic destination (e.g. Darjeeling, Manali, Goa).';
      }
    } else {
      // Build summary of what is already logged
      let routeStr = '';
      if (isOriginValid && params.origin) {
        routeStr = `from **${params.origin}** to **${params.destination}**`;
      } else {
        routeStr = `to **${params.destination}**`;
      }

      const travelersStr = (isTravelersValid && params.travelers) ? ` for **${params.travelers} travelers**` : '';
      
      const datesDisplay = params.formatted_dates || (params.start_date && params.end_date ? `${params.start_date} – ${params.end_date}` : null);
      const datesStr = (isDatesValid && datesDisplay) ? ` (${datesDisplay})` : '';

      const loggedPrefix = `I've logged your trip ${routeStr}${travelersStr}${datesStr}.`;

      // Now determine the specific missing question
      if (!isBudgetValid && isOriginValid && isTravelersValid && isDatesValid) {
        clarificationQuestion = `${loggedPrefix} **What is your target budget for this trip?**`;
      } else if (!isDatesValid && isOriginValid && isTravelersValid && isBudgetValid) {
        if (params.travel_month) {
          clarificationQuestion = `${loggedPrefix} What exact dates would you like to travel in **${params.travel_month}**? (e.g., ${params.travel_month.slice(0, 3)} 21 to ${params.travel_month.slice(0, 3)} 26)`;
        } else {
          clarificationQuestion = `${loggedPrefix} **What dates would you like to travel?** (e.g., September 21 to September 26, 2026)`;
        }
      } else if (!isOriginValid && isTravelersValid && isDatesValid && isBudgetValid) {
        clarificationQuestion = `${loggedPrefix} **Where will you be departing from?** (e.g. Mumbai, Delhi, Kolkata)`;
      } else if (!isTravelersValid && isOriginValid && isDatesValid && isBudgetValid) {
        clarificationQuestion = `${loggedPrefix} **How many travelers will be joining this trip?**`;
      } else {
        // Multiple fields missing
        const asks: string[] = [];
        if (!isOriginValid) asks.push('where you will be departing from');
        if (!isDatesValid) {
          if (params.travel_month) asks.push(`what exact dates in ${params.travel_month}`);
          else asks.push('what dates you would like to travel');
        }
        if (!isTravelersValid) asks.push('how many travelers');
        if (!isBudgetValid) asks.push('what your target budget is');

        const prefixWithDuration = params.duration_days && !isDatesValid
          ? `I've logged your **${params.duration_days}-day** trip to **${params.destination}**!`
          : loggedPrefix;

        if (asks.length === 1) {
          clarificationQuestion = `${prefixWithDuration} What is your ${asks[0]}?`;
        } else if (asks.length === 2) {
          clarificationQuestion = `${prefixWithDuration} Could you let me know ${asks[0]} and ${asks[1]}?`;
        } else {
          const lastAsk = asks.pop();
          clarificationQuestion = `${prefixWithDuration} Could you specify ${asks.join(', ')}, and ${lastAsk}?`;
        }
      }
    }
  }

  return {
    is_ready_to_generate: isReady,
    destination_valid: isDestValid,
    dates_valid: isDatesValid,
    origin_valid: isOriginValid,
    duration_valid: isDurationValid,
    travelers_valid: isTravelersValid,
    budget_valid: isBudgetValid,
    clarification_needed: !isReady,
    clarification_question: clarificationQuestion,
    missing_fields: missingFields,
    errors,
  };
}
