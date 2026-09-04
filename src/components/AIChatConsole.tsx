import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowUp, Sparkles, Check, Paperclip, Mic, ChevronDown, 
  MapPin, Users, Calendar, Heart, ArrowLeft,
  DollarSign, RefreshCw, Send, ShieldAlert, SlidersHorizontal,
  Luggage, Calculator, Bed, Mountain, Car, CheckSquare, Square,
  Share2, Printer, CheckCircle2, AlertTriangle, Star, History,
  Sliders, MessageSquare, Compass, X, ArrowRight, Eye, RefreshCcw,
  Plane, Train, Bus, ExternalLink, ShieldCheck, Clock, Tag, ArrowLeftRight,
  Camera, Sun, CloudSun, Maximize2, Download, EyeOff, Plus, Minus, Trash2, SlidersVertical
} from 'lucide-react';
import { TourFlowApi } from '../services/api';
import { Trip, Destination, TripPreference, ItineraryItem, TransportBookingOption, AccommodationOption, PossibleOptionItem } from '../types/tourflow';
import { SmartImage } from './SmartImage';
import { TripInteractiveMap } from './TripInteractiveMap';
import { PossibleOptionsTray } from './PossibleOptionsTray';
import { getDestinationPhotos, getActivityPhoto, DESTINATION_PHOTO_CATALOG } from '../utils/imageCatalog';
import { isInvalidDestination, parseBudget, parseDateRange } from '../utils/validation';
import { exportTripToPDF } from '../utils/pdfExport';
import { InChatTripChecklist } from './InChatTripChecklist';
import { DestinationPreviewStudio } from './DestinationPreviewStudio';
import { AddActivityModal } from './AddActivityModal';

interface AIChatConsoleProps {
  initialPrompt?: string;
  initialDestination?: string;
  initialDuration?: string;
  initialPayload?: any;
  destinations?: Destination[];
  onAutoFillTrip?: (extracted: Record<string, any>) => void;
  onNavigateToWorkspace?: () => void;
  onBackToHome?: () => void;
  onOpenEditPreferences?: (trip: Trip) => void;
}

interface ChecklistState {
  where_to: string | null;
  where_from: string | null;
  who_is_coming: string | null;
  when_you_go: string | null;
  what_you_are_after: string | null;
  travel_dates: string | null;
  start_date: string | null;
  end_date: string | null;
  travel_month?: string | null;
  is_dates_valid: boolean;
  is_ready_to_generate?: boolean;
}

export default function AIChatConsole({ 
  initialPrompt, 
  initialDestination,
  initialDuration,
  initialPayload,
  destinations = [],
  onAutoFillTrip, 
  onNavigateToWorkspace,
  onBackToHome,
  onOpenEditPreferences
}: AIChatConsoleProps) {
  // Workspace View State: 'planning' | 'generating' | 'generated'
  const [workspaceState, setWorkspaceState] = useState<'planning' | 'generating' | 'generated'>('planning');

  // Generated Trip State
  const [generatedTrip, setGeneratedTrip] = useState<Trip | null>(null);
  const [activeTripTab, setActiveTripTab] = useState<'itinerary' | 'map' | 'options' | 'possibilities' | 'packing' | 'split'>('itinerary');
  const [selectedDayForMap, setSelectedDayForMap] = useState<number | null>(null);

  // Dynamic parameter ranking state ('budget' | 'distance' | 'rating' | 'speed')
  const [activeRanking, setActiveRanking] = useState<'budget' | 'distance' | 'rating' | 'speed' | null>(null);

  // Booking Choice Modal State (AI Guide vs Self Booking)
  const [bookingModal, setBookingModal] = useState<{
    isOpen: boolean;
    type: 'transport' | 'hotel';
    item: any;
    dayNumber?: number;
  } | null>(null);

  // Activity In-Place Management Modals
  const [addActivityModal, setAddActivityModal] = useState<{ isOpen: boolean; dayNumber: number } | null>(null);
  const [swapActivityModal, setSwapActivityModal] = useState<{ isOpen: boolean; item: ItineraryItem } | null>(null);
  const [editActivityModal, setEditActivityModal] = useState<{ isOpen: boolean; item: ItineraryItem } | null>(null);

  // Dynamic Possible Options Tray
  const [possibleOptions, setPossibleOptions] = useState<PossibleOptionItem[]>([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState<boolean>(false);

  // Mobile active tab ('chat' | 'trip')
  const [mobileTab, setMobileTab] = useState<'chat' | 'trip'>('chat');

  // Generation step animation (1-4)
  const [generationStep, setGenerationStep] = useState<number>(1);

  // Gallery photo selection & preview modal
  const [activeGalleryIndex, setActiveGalleryIndex] = useState<number>(0);
  const [photoModal, setPhotoModal] = useState<{ url: string; title: string; subtitle?: string } | null>(null);

  // Modals for manual change
  const [showTransportModal, setShowTransportModal] = useState(false);
  const [showHotelModal, setShowHotelModal] = useState(false);
  const [selectedDayForHotelChange, setSelectedDayForHotelChange] = useState<number | null>(null);
  const [showDateModal, setShowDateModal] = useState(false);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [adjustingBudgetVal, setAdjustingBudgetVal] = useState<number>(75000);
  const [adjustingBudgetInputStr, setAdjustingBudgetInputStr] = useState<string>('75000');
  const [changingEntityLoading, setChangingEntityLoading] = useState(false);

  // Date selection state
  const [pickerStartDate, setPickerStartDate] = useState('2026-09-21');
  const [pickerEndDate, setPickerEndDate] = useState('2026-09-26');

  // Chat conversation
  const [messages, setMessages] = useState<Array<{
    id: string;
    sender: 'user' | 'bot';
    text: string;
    suggestions?: string[];
    isTripUpdate?: boolean;
  }>>(() => {
    if (initialPrompt && initialPrompt.trim()) {
      return [
        {
          id: 'msg-init',
          sender: 'user',
          text: initialPrompt,
        },
      ];
    }
    const dest = initialDestination || null;
    const dur = initialDuration || null;
    if (dest) {
      return [
        {
          id: 'msg-1',
          sender: 'user',
          text: `${dur ? `${dur} ` : ''}trip to ${dest}`,
        },
        {
          id: 'msg-2',
          sender: 'bot',
          text: `Welcome to **${dest}**! I've logged your destination in the trip checklist on the right.\n\nTo get this itinerary planned, where will you be traveling from, how many travelers, what dates would you like to travel, and what is your target budget?`,
          suggestions: ['From Mumbai', 'Sep 21 to Sep 26', 'Family of 4', 'Budget ₹90,000'],
        },
      ];
    }
    return [
      {
        id: 'msg-welcome',
        sender: 'bot',
        text: `👋 Welcome to **TourFlow AI**! I'm your real-time intelligent travel concierge.\n\nTell me where you want to go, your travel dates, travel group, duration, and target budget (e.g. *"I want to go to Darjeeling for a family trip of 4 people from September 21 to September 26 with a budget of ₹90,000."*).`,
        suggestions: [
          'Darjeeling from Mumbai Sep 21 to Sep 26 for 4 budget ₹90,000',
          'Goa beach trip for 5 days under ₹60,000',
          'Kashmir romantic 6 days with luxury stays',
          'Kerala backwaters 7 days with houseboats',
        ],
      },
    ];
  });

  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [checklist, setChecklist] = useState<ChecklistState>({
    where_to: initialDestination || null,
    where_from: null,
    who_is_coming: null,
    when_you_go: initialDuration || null,
    what_you_are_after: null,
    travel_dates: null,
    start_date: null,
    end_date: null,
    is_dates_valid: false,
  });

  // Packing list state
  const defaultPacking = [
    { id: 'p1', category: 'Clothing & Layers', text: 'Comfortable walking footwear & thermal/linen layers', checked: true },
    { id: 'p2', category: 'Clothing & Layers', text: 'Windproof light jacket / breathable wear', checked: true },
    { id: 'p3', category: 'Essentials & Tech', text: 'Government ID cards (Aadhaar / Passports) & Vouchers', checked: true },
    { id: 'p4', category: 'Essentials & Tech', text: 'Fast-charging Power bank (10,000mAh+) & Camera', checked: false },
    { id: 'p5', category: 'Health & Wellness', text: 'Medical kit (Motion sickness, Paracetamol, Band-aids)', checked: true },
    { id: 'p6', category: 'Health & Wellness', text: 'UV Sunscreen SPF 50+ & Lip Balm', checked: false },
    { id: 'p7', category: 'Accessories', text: 'Polarized UV400 Sunglasses & Daypack (20L)', checked: false },
  ];
  const [packingItems, setPackingItems] = useState(defaultPacking);
  const [newPackingText, setNewPackingText] = useState('');

  // Expense splitter state
  const [expenses, setExpenses] = useState([
    { id: 'e1', title: 'Verified Stays & Mountain Resort', amount: 32500, paidBy: 'Traveler 1' },
    { id: 'e2', title: 'IndiGo Flight + Chauffeur Transit', amount: 27200, paidBy: 'Traveler 2' },
    { id: 'e3', title: 'Curated Sightseeing & Activities Passes', amount: 16000, paidBy: 'Traveler 1' },
  ]);
  const [newExpTitle, setNewExpTitle] = useState('');
  const [newExpAmount, setNewExpAmount] = useState('');

  // Toasts and exit
  const [copiedShare, setCopiedShare] = useState(false);
  const [tripUpdateToast, setTripUpdateToast] = useState<string | null>(null);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [pendingExitTarget, setPendingExitTarget] = useState<'home' | 'workspace' | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const hasInitializedPrompt = useRef(false);

  // Sync state if initialDestination or initialDuration change
  useEffect(() => {
    if (initialDestination || initialDuration) {
      setChecklist((prev) => ({
        ...prev,
        where_to: initialDestination || prev.where_to,
        when_you_go: initialDuration || prev.when_you_go,
      }));
    }
  }, [initialDestination, initialDuration]);

  const hasHandledPayload = useRef(false);

  // Initial payload handoff from "Generate Itinerary with WanderFlow AI"
  useEffect(() => {
    if (initialPayload && !hasHandledPayload.current) {
      hasHandledPayload.current = true;
      handleAutoGenerateFromPayload(initialPayload);
    }
  }, [initialPayload]);

  // Initial prompt handle
  useEffect(() => {
    if (initialPrompt && !hasInitializedPrompt.current && initialPrompt.trim() !== '') {
      hasInitializedPrompt.current = true;
      handleSendMessage(initialPrompt, true);
    }
  }, [initialPrompt]);

  // Load possible options whenever trip is loaded or destination changes
  useEffect(() => {
    const dest = generatedTrip?.destination?.name || checklist.where_to;
    if (dest && !isInvalidDestination(dest)) {
      setIsLoadingOptions(true);
      TourFlowApi.getPossibleOptions(dest)
        .then((opts) => setPossibleOptions(opts || []))
        .catch(() => setPossibleOptions([]))
        .finally(() => setIsLoadingOptions(false));
    }
  }, [generatedTrip?.destination?.name, checklist.where_to]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const renderInlineMarkdown = (text: string) => {
    if (!text) return null;
    let processed = text;

    // Convert single asterisk around words (e.g. *Bali* or *Ubud*) to double asterisks so they become bold
    processed = processed.replace(/(^|[^*])\*([A-Za-z0-9\s,–\-]+?)\*([^*]|$)/g, '$1**$2**$3');

    // List of destinations, origins, and major attractions to auto-bold
    const placeRegex = /\b(bali|ubud|seminyak|canggu|uluwatu|kintamani|tegallalang|tanah lot|nusa penida|uttar pradesh|darjeeling|manali|goa|kerala|kashmir|rajasthan|puri|jagannath puri|varanasi|shimla|ladakh|agra|mumbai|delhi|kolkata|bangalore|chennai)\b/gi;

    // Capitalize known place names
    processed = processed.replace(placeRegex, (match) => {
      return match.split(' ').map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
    });

    const tokens: (string | React.ReactNode)[] = [];
    const regex = /(\*\*[^*]+?\*\*|\*[^*]+?\*)/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(processed)) !== null) {
      if (match.index > lastIndex) {
        const plain = processed.substring(lastIndex, match.index).replace(/\*/g, '');
        if (plain) tokens.push(plain);
      }

      const matchedStr = match[0];
      if (matchedStr.startsWith('**') && matchedStr.endsWith('**')) {
        const boldText = matchedStr.slice(2, -2).trim().replace(/\*/g, '');
        tokens.push(
          <strong key={`b-${match.index}`} className="font-bold text-stone-950">
            {boldText}
          </strong>
        );
      } else if (matchedStr.startsWith('*') && matchedStr.endsWith('*')) {
        const boldText = matchedStr.slice(1, -1).trim().replace(/\*/g, '');
        tokens.push(
          <strong key={`sb-${match.index}`} className="font-bold text-stone-950">
            {boldText}
          </strong>
        );
      }

      lastIndex = regex.lastIndex;
    }

    if (lastIndex < processed.length) {
      const trailing = processed.substring(lastIndex).replace(/\*/g, '');
      if (trailing) tokens.push(trailing);
    }

    return tokens.length > 0 ? tokens : processed.replace(/\*/g, '');
  };

  const formatPlaceAndMarkdown = (rawText: string) => {
    if (!rawText) return null;
    const paragraphs = rawText.split(/\n\s*\n/);

    return paragraphs.map((para, pIdx) => {
      const lines = para.split('\n');
      const isBulletList = lines.length > 1 && lines.every((l) => /^\s*[-•*]\s+/.test(l));

      if (isBulletList) {
        return (
          <ul key={pIdx} className="space-y-1.5 my-2 pl-2">
            {lines.map((line, lIdx) => {
              const cleanLine = line.replace(/^\s*[-•*]\s+/, '');
              return (
                <li key={lIdx} className="flex items-start gap-2 text-stone-900 leading-relaxed">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#7065F0] mt-2 shrink-0" />
                  <span>{renderInlineMarkdown(cleanLine)}</span>
                </li>
              );
            })}
          </ul>
        );
      }

      return (
        <p key={pIdx} className="whitespace-pre-line leading-relaxed text-stone-900">
          {renderInlineMarkdown(para)}
        </p>
      );
    });
  };

  const capturedCount = [
    checklist.where_to,
    checklist.where_from,
    checklist.who_is_coming,
    checklist.when_you_go,
    checklist.what_you_are_after,
    checklist.travel_dates,
  ].filter(Boolean).length;
  
  const progressPercent = Math.round((capturedCount / 6) * 100);

  // Is Generate My Trip enabled? REQUIRES ALL MANDATORY PARAMETERS VERIFIED
  const isDatesProvided = Boolean(
    checklist.travel_dates && 
    checklist.travel_dates.trim() !== '' && 
    checklist.start_date && 
    checklist.end_date
  );
  const isDestValid = Boolean(checklist.where_to && !isInvalidDestination(checklist.where_to));
  const isOriginProvided = Boolean(checklist.where_from && !isInvalidDestination(checklist.where_from));
  const isTravelersProvided = Boolean(checklist.who_is_coming);
  const isBudgetProvided = Boolean(checklist.what_you_are_after);
  const isGenerateAllowed = Boolean(
    isDestValid && 
    isOriginProvided && 
    isDatesProvided && 
    isTravelersProvided && 
    isBudgetProvided && 
    checklist.is_ready_to_generate !== false
  );

  // Send message to AI Chat
  const handleSendMessage = async (textToSend?: string, isInitialCall = false) => {
    const query = textToSend || inputMessage.trim();
    if (!query || (loading && !isInitialCall)) return;

    const normalized = query.trim().toLowerCase();
    if (
      normalized === 'generate my trip' ||
      normalized === 'generate trip' ||
      normalized === 'generate' ||
      normalized === 'generate my trip now' ||
      normalized === 'plan my trip' ||
      normalized.startsWith('generate') ||
      normalized.includes('generate my trip') ||
      normalized.includes('generate trip')
    ) {
      // If Bali is specifically mentioned in the generate query, lock it into checklist
      if (normalized.includes('bali') && !checklist.where_to) {
        setChecklist((prev) => ({ ...prev, where_to: 'Bali' }));
      }
      setInputMessage('');
      handleGenerateTripNow();
      return;
    }

    let newMessages = messages;
    if (!isInitialCall) {
      const userMsgId = `user-${Date.now()}`;
      newMessages = [...messages, { id: userMsgId, sender: 'user' as const, text: query }];
      setMessages(newMessages);
      setInputMessage('');
    }

    // Deterministic instant client-side destination extraction to ensure checklist updates immediately
    const detectClientDestination = (text: string): string | null => {
      const clean = text.trim();
      if (clean.length < 2) return null;

      // Do NOT extract if the message is pure greeting / chit-chat
      if (/^(?:hi|hello|hey|howdy|hola|namaste|good morning|good evening|good afternoon|thanks|thank you|cool|awesome|great|ok|okay)[!.? ]*$/i.test(clean)) {
        return null;
      }

      const catalog = [
        { name: 'China', regex: /\b(?:china|beijing|shanghai|guangzhou|shenzhen|chengdu|xian|xi'an)\b/i },
        { name: 'Japan', regex: /\b(?:japan|tokyo|kyoto|osaka|fuji)\b/i },
        { name: 'Bali', regex: /\b(?:bali|denpasar|ubud|seminyak|canggu|uluwatu|nusa penida)\b/i },
        { name: 'Thailand', regex: /\b(?:thailand|bangkok|phuket|pattaya|krabi|chiang mai|koh samui)\b/i },
        { name: 'Dubai', regex: /\b(?:dubai|abu dhabi|uae)\b/i },
        { name: 'Singapore', regex: /\b(?:singapore|sentosa)\b/i },
        { name: 'Switzerland', regex: /\b(?:switzerland|swiss|zurich|interlaken|geneva)\b/i },
        { name: 'France', regex: /\b(?:france|paris|nice|lyon)\b/i },
        { name: 'Italy', regex: /\b(?:italy|rome|florence|venice|milan)\b/i },
        { name: 'United Kingdom', regex: /\b(?:uk|united kingdom|london|scotland|edinburgh)\b/i },
        { name: 'Darjeeling', regex: /\bdarjeeling\b/i },
        { name: 'Goa', regex: /\bgoa\b/i },
        { name: 'Manali', regex: /\bmanali\b|\bsolang\b/i },
        { name: 'Kerala', regex: /\bkerala\b|\bmunnar\b|\balleppey\b|\bkochi\b/i },
        { name: 'Kashmir', regex: /\bkashmir\b|\bsrinagar\b|\bgulmarg\b|\bpahalgam\b/i },
        { name: 'Puri', regex: /\b(?:puri|jagannath|jagannath puri)\b/i },
        { name: 'Uttar Pradesh', regex: /\b(?:uttar pradesh|varanasi|kashi|ayodhya|mathura|lucknow|agra)\b/i },
        { name: 'Rajasthan', regex: /\b(?:rajasthan|jaipur|udaipur|jodhpur|jaisalmer)\b/i },
        { name: 'Shimla', regex: /\bshimla\b/i },
        { name: 'Ooty', regex: /\booty\b/i },
        { name: 'Rishikesh', regex: /\brishikesh\b|\bharidwar\b/i },
        { name: 'Ladakh', regex: /\b(?:ladakh|leh)\b/i },
        { name: 'Sikkim', regex: /\b(?:sikkim|gangtok)\b/i },
        { name: 'Andaman', regex: /\b(?:andaman|havelock|port blair)\b/i },
        { name: 'Maldives', regex: /\bmaldives\b/i },
      ];
      for (const item of catalog) {
        if (item.regex.test(clean)) return item.name;
      }

      // Explicit prefix requirement (NEVER optional)
      const directMatch = clean.match(/^(?:i\s+want\s+to\s+(?:go\s+to|visit)|plan\s+a\s+trip\s+to|plan\s+a\s+visit\s+to|trip\s+to|tour\s+to|travel\s+to|destination\s*(?:is|:))\s+([A-Za-z\s]{2,30})$/i);
      if (directMatch && directMatch[1] && !isInvalidDestination(directMatch[1])) {
        return directMatch[1].trim();
      }
      return null;
    };

    const immediateDest = detectClientDestination(query);
    if (immediateDest) {
      setChecklist((prev) => ({ ...prev, where_to: immediateDest }));
    }

    setLoading(true);

    try {
      const historyPayload = messages.slice(-8).map((m) => ({
        role: (m.sender === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
        content: m.text,
      }));

      const res = await TourFlowApi.aiChat(query, checklist, generatedTrip, historyPayload);
      
      if (res.checklist) {
        const checkedDest = (res.checklist.where_to && !isInvalidDestination(res.checklist.where_to)) ? res.checklist.where_to : null;
        setChecklist((prev) => ({
          where_to: checkedDest ?? (isInvalidDestination(prev.where_to) ? null : prev.where_to),
          where_from: res.checklist?.where_from ?? prev.where_from,
          who_is_coming: res.checklist?.who_is_coming ?? prev.who_is_coming,
          when_you_go: res.checklist?.when_you_go ?? prev.when_you_go,
          what_you_are_after: res.checklist?.what_you_are_after ?? prev.what_you_are_after,
          travel_dates: res.checklist?.travel_dates ?? prev.travel_dates,
          start_date: res.checklist?.start_date ?? prev.start_date,
          end_date: res.checklist?.end_date ?? prev.end_date,
          travel_month: (res.checklist as any)?.travel_month ?? prev.travel_month,
          is_dates_valid: Boolean(res.checklist?.is_dates_valid ?? (res.checklist?.travel_dates ?? prev.travel_dates)),
          is_ready_to_generate: (res.checklist as any)?.is_ready_to_generate ?? true,
        }));
      }

      // If AI modified the trip in-place
      if (res.updated_trip) {
        setGeneratedTrip(res.updated_trip);
        if (res.updated_trip.packing_items) {
          setPackingItems(res.updated_trip.packing_items);
        }
        if (res.updated_trip.expenses) {
          setExpenses(res.updated_trip.expenses);
        }
        const updatedDest = (res.updated_trip.destination?.name && !isInvalidDestination(res.updated_trip.destination.name)) 
          ? res.updated_trip.destination.name 
          : (res.checklist?.where_to && !isInvalidDestination(res.checklist.where_to)) ? res.checklist.where_to : null;

        setChecklist({
          where_to: updatedDest,
          where_from: res.updated_trip.origin || res.checklist?.where_from || null,
          who_is_coming: `${res.updated_trip.traveler_count} Travelers (${res.updated_trip.travel_type ? res.updated_trip.travel_type.charAt(0).toUpperCase() + res.updated_trip.travel_type.slice(1) : 'Family'})`,
          when_you_go: `${res.updated_trip.duration_days} days`,
          what_you_are_after: `Budget ₹${res.updated_trip.total_budget?.toLocaleString()}`,
          travel_dates: res.updated_trip.formatted_dates || null,
          start_date: res.updated_trip.start_date || null,
          end_date: res.updated_trip.end_date || null,
          is_dates_valid: true,
          is_ready_to_generate: true,
        });

        if (workspaceState === 'generated') {
          setTripUpdateToast('Trip schedule, transport & pricing updated live! ✨');
          setTimeout(() => setTripUpdateToast(null), 4000);
        }
      }

      setMessages([
        ...newMessages,
        {
          id: `bot-${Date.now()}`,
          sender: 'bot',
          text: res.response,
          suggestions: res.suggestions,
          isTripUpdate: Boolean(res.updated_trip),
        },
      ]);
    } catch (err: any) {
      setMessages([
        ...newMessages,
        {
          id: `bot-err-${Date.now()}`,
          sender: 'bot',
          text: `I've updated your trip parameters. Let me know if you would like to refine your dates, destination, duration, travelers, or budget!`,
          suggestions: ['Sep 21 to Sep 26', 'From Mumbai', 'Budget ₹90,000'],
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Auto-generate itinerary when handed off directly from modal form payload
  const handleAutoGenerateFromPayload = async (payload: any) => {
    setWorkspaceState('generating');
    setGenerationStep(1);
    setMobileTab('trip');

    const destName = payload.destination || 'Darjeeling';
    const durDays = payload.durationDays || 4;
    const budgetVal = payload.budget || 60000;
    const travelersCount = payload.travelerCount || 2;
    const travelType = (payload.companions || 'couple').toLowerCase().includes('solo') ? 'solo'
      : (payload.companions || 'couple').toLowerCase().includes('couple') ? 'couple'
      : (payload.companions || 'couple').toLowerCase().includes('friends') ? 'friends' : 'family';
    const origin = payload.originCity || 'Mumbai';
    const startDate = payload.dates?.startDate || '2026-09-21';
    const endDate = payload.dates?.endDate || '2026-09-26';
    const formattedDates = payload.dates?.formattedDates || `${startDate} – ${endDate}`;

    setChecklist({
      where_to: destName,
      where_from: origin,
      who_is_coming: `${travelersCount} Travelers (${payload.companions || travelType})`,
      when_you_go: `${durDays} days`,
      what_you_are_after: `Budget ₹${budgetVal.toLocaleString()}`,
      travel_dates: formattedDates,
      start_date: startDate,
      end_date: endDate,
      is_dates_valid: true,
      is_ready_to_generate: true,
    });

    setMessages([
      {
        id: `bot-gen-${Date.now()}`,
        sender: 'bot',
        text: `✨ Generating your interactive **${durDays}-day** WanderFlow itinerary to **${destName}** from **${origin}** for **${travelersCount} travelers** (${formattedDates}, Target Budget: **₹${budgetVal.toLocaleString()}**) right here in your live workspace!`,
      },
    ]);

    setTimeout(() => setGenerationStep(2), 500);
    setTimeout(() => setGenerationStep(3), 1000);
    setTimeout(() => setGenerationStep(4), 1500);

    try {
      const createdTrip = await TourFlowApi.createTrip({
        title: payload.title || `${durDays}-Day ${travelType.charAt(0).toUpperCase() + travelType.slice(1)} Trip to ${destName}`,
        destination_name: destName,
        destination_id: payload.destinationId,
        duration_days: durDays,
        start_date: startDate,
        end_date: endDate,
        formatted_dates: formattedDates,
        total_budget: budgetVal,
        traveler_count: travelersCount,
        travel_type: travelType as any,
        origin: origin,
        pace: payload.pace || 'balanced',
        preferences: {
          budget_tier: budgetVal > 150000 ? 'luxury' : 'moderate',
          interests: payload.interests || ['Scenic Views', 'Local Culture'],
          travel_companions: travelType,
          accommodation_types: ['boutique'],
          transport_preferences: ['flight'],
          dietary_requirements: [],
          special_requests: payload.specialRequests || `Origin: ${origin}. Target budget: ₹${budgetVal.toLocaleString()}`,
        },
      });

      if (createdTrip.packing_items) setPackingItems(createdTrip.packing_items);
      if (createdTrip.expenses) setExpenses(createdTrip.expenses);

      setTimeout(() => {
        setGeneratedTrip(createdTrip);
        setWorkspaceState('generated');

        setMessages((prev) => [
          ...prev,
          {
            id: `bot-ready-${Date.now()}`,
            sender: 'bot',
            text: `🎉 **Your interactive WanderFlow draft itinerary for ${createdTrip.destination?.name || destName} is ready!**\n\n- **Route & Transport**: ${createdTrip.selected_transport?.operator} (${createdTrip.selected_transport?.duration_str})\n- **Stay**: ${createdTrip.selected_accommodation?.name}\n- **Estimated Cost**: ₹${createdTrip.total_cost?.toLocaleString()} of ₹${createdTrip.total_budget.toLocaleString()} target budget.\n\nYou can chat with me to **edit, swap, add, or delete** any day, hotel, or activity in real time, or use the dynamic ranking and booking buttons!`,
            suggestions: [
              'Rank by budget 💰',
              'Rank by speed ⚡',
              'Rank by rating ⭐',
              'Add scenic viewpoint on Day 2',
              'Swap Day 3 activity',
              'Make the trip cheaper',
            ],
          },
        ]);
      }, 1800);
    } catch (err) {
      console.error('Failed to auto-generate trip from payload', err);
      setWorkspaceState('planning');
    }
  };

  // Dynamic Parameter Ranking for Hotels & Transports
  const handleApplyRanking = (criterion: 'budget' | 'distance' | 'rating' | 'speed') => {
    if (!generatedTrip) return;
    setActiveRanking(criterion);

    const updatedTrip = { ...generatedTrip };

    // 1. Sort transport alternatives
    if (updatedTrip.transport_alternatives && updatedTrip.transport_alternatives.length > 0) {
      const allTransports = [updatedTrip.selected_transport, ...updatedTrip.transport_alternatives].filter(Boolean) as TransportBookingOption[];
      
      allTransports.sort((a, b) => {
        if (criterion === 'budget') {
          return a.total_price - b.total_price;
        } else if (criterion === 'speed') {
          const aDur = parseInt(a.duration_str?.match(/\d+/)?.[0] || '99', 10);
          const bDur = parseInt(b.duration_str?.match(/\d+/)?.[0] || '99', 10);
          return aDur - bDur;
        } else if (criterion === 'rating') {
          const aRating = a.badge === 'recommended' ? 5 : 4;
          const bRating = b.badge === 'recommended' ? 5 : 4;
          return bRating - aRating;
        } else {
          return a.mode === 'flight' ? -1 : 1;
        }
      });

      updatedTrip.transport_alternatives = allTransports.map((t, idx) => ({
        ...t,
        badge: idx === 0 ? (`#1 ${criterion.toUpperCase()} PICK` as any) : t.badge,
      }));
    }

    // 2. Sort accommodation alternatives
    if (updatedTrip.accommodation_alternatives && updatedTrip.accommodation_alternatives.length > 0) {
      const allAccom = [updatedTrip.selected_accommodation, ...updatedTrip.accommodation_alternatives].filter(Boolean) as AccommodationOption[];

      allAccom.sort((a, b) => {
        if (criterion === 'budget') {
          return a.price_per_night - b.price_per_night;
        } else if (criterion === 'rating') {
          return (b.rating || 0) - (a.rating || 0);
        } else if (criterion === 'speed' || criterion === 'distance') {
          return (b.rating || 4) - (a.rating || 4);
        }
        return 0;
      });

      updatedTrip.accommodation_alternatives = allAccom.map((acc, idx) => ({
        ...acc,
        badge: idx === 0 ? (`#1 ${criterion.toUpperCase()} STAY` as any) : acc.badge,
      }));
    }

    setGeneratedTrip(updatedTrip);
    setTripUpdateToast(`Options dynamically re-ranked by ${criterion.toUpperCase()}!`);
    setTimeout(() => setTripUpdateToast(null), 3000);

    setMessages((prev) => [
      ...prev,
      {
        id: `bot-rank-${Date.now()}`,
        sender: 'bot',
        text: `📊 **Re-ranked all transport and hotel options based on ${criterion.toUpperCase()}**:

- **Transport Top Pick**: ${updatedTrip.transport_alternatives?.[0]?.operator || updatedTrip.selected_transport?.operator} (₹${(updatedTrip.transport_alternatives?.[0]?.total_price || updatedTrip.selected_transport?.total_price)?.toLocaleString()})
- **Stay Top Pick**: ${updatedTrip.accommodation_alternatives?.[0]?.name || updatedTrip.selected_accommodation?.name} (₹${(updatedTrip.accommodation_alternatives?.[0]?.price_per_night || updatedTrip.selected_accommodation?.price_per_night)?.toLocaleString()}/night, ⭐ ${updatedTrip.accommodation_alternatives?.[0]?.rating || 4.8})

You can select any option or lock it in via AI Guide or direct self-booking!`,
        suggestions: ['Lock in top transport', 'Lock in top hotel', 'View day itinerary', 'Add activity on Day 2'],
      },
    ]);
  };

  // Lock Booking Choice (Option A: AI Guide vs Option B: External self-booking)
  const handleConfirmBookingChoice = async (bookingMode: 'ai_guide' | 'self_booking') => {
    if (!bookingModal || !generatedTrip) return;
    const { type, item, dayNumber } = bookingModal;
    setChangingEntityLoading(true);

    try {
      const itemTitle = item.title || item.name || item.operator || 'Selected Booking';
      const itemAmount = item.total_price || (item.price_per_night ? item.price_per_night * (item.nights || generatedTrip.duration_days) : 0);
      const provider = item.operator || item.name || 'WanderFlow Direct Partner';

      let externalUrl = `https://www.makemytrip.com/search?q=${encodeURIComponent(generatedTrip.destination?.name || 'India')}`;
      if (type === 'transport') {
        if (item.mode === 'flight') externalUrl = `https://www.makemytrip.com/flights`;
        else if (item.mode === 'train') externalUrl = `https://www.irctc.co.in/nget/train-search`;
        else externalUrl = `https://www.makemytrip.com/cabs`;
      } else {
        externalUrl = `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(generatedTrip.destination?.name || 'India')}`;
      }

      const res = await TourFlowApi.lockBookingChoice(generatedTrip.id, {
        item_type: type,
        item_id: item.id || `custom-${Date.now()}`,
        booking_mode: bookingMode,
        details: {
          title: itemTitle,
          amount: itemAmount,
          provider: provider,
          external_url: externalUrl,
        },
      });

      if (res.trip) {
        setGeneratedTrip(res.trip);
      }

      const bookingRef = res.booking?.booking_reference || (bookingMode === 'ai_guide' ? `WFLW-AI-${Math.floor(10000 + Math.random()*90000)}` : `WFLW-EXT-${Math.floor(10000 + Math.random()*90000)}`);

      setBookingModal(null);
      setTripUpdateToast(bookingMode === 'ai_guide' ? `Booking confirmed via WanderFlow AI Guide! Ref: ${bookingRef}` : `External booking link opened. Ref: ${bookingRef}`);
      setTimeout(() => setTripUpdateToast(null), 4000);

      if (bookingMode === 'self_booking') {
        window.open(externalUrl, '_blank');
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `bot-bkg-${Date.now()}`,
          sender: 'bot',
          text: bookingMode === 'ai_guide' 
            ? `✅ **Confirmed with WanderFlow AI Concierge!**\n\n- **Item**: ${itemTitle}\n- **Booking Ref**: \`${bookingRef}\`\n- **Status**: Verified & Confirmed\n- **Payment**: Included in package\n\nYour voucher and itinerary have been synced.`
            : `🔗 **External Booking Selected**\n\n- **Item**: ${itemTitle}\n- **Tracking Ref**: \`${bookingRef}\`\n- **Provider**: ${provider}\n- We've opened the official partner booking portal. Once booked, keep this reference for your trip summary.`,
          suggestions: ['View full itinerary', 'Book remaining stays', 'Add custom activity', 'Share itinerary'],
        },
      ]);
    } catch (err: any) {
      alert(`Booking error: ${err?.message || 'Could not lock booking'}`);
    } finally {
      setChangingEntityLoading(false);
    }
  };

  // Add Itinerary Activity
  const handleAddActivity = async (dayNumber: number, activity: { title: string; start_time: string; end_time: string; cost: number; description?: string; location?: string }) => {
    if (!generatedTrip) return;
    try {
      const updated = await TourFlowApi.addItineraryActivity(generatedTrip.id, {
        day_number: dayNumber,
        title: activity.title,
        description: activity.description,
        start_time: activity.start_time,
        end_time: activity.end_time,
        cost: activity.cost,
        location: activity.location,
      });
      setGeneratedTrip(updated);
      setAddActivityModal(null);
      setTripUpdateToast(`Added "${activity.title}" to Day ${dayNumber}!`);
      setTimeout(() => setTripUpdateToast(null), 3000);

      setMessages((prev) => [
        ...prev,
        {
          id: `bot-act-add-${Date.now()}`,
          sender: 'bot',
          text: `➕ Added **${activity.title}** to Day ${dayNumber} (${activity.start_time} - ${activity.end_time}, ₹${activity.cost.toLocaleString()}). Recalculated total cost: **₹${updated.total_cost?.toLocaleString()}**.`,
          suggestions: ['View Day itinerary', 'Add another activity', 'Swap an activity'],
        },
      ]);
    } catch (err: any) {
      alert(`Error adding activity: ${err?.message || 'Please try again'}`);
    }
  };

  // Swap Itinerary Activity
  const handleSwapActivity = async (itemId: string, newActivity: { title: string; description?: string; cost?: number; image_url?: string }) => {
    if (!generatedTrip) return;
    try {
      const updated = await TourFlowApi.swapItineraryActivity(generatedTrip.id, {
        item_id: itemId,
        new_title: newActivity.title,
        new_description: newActivity.description,
        new_cost: newActivity.cost,
        new_image_url: newActivity.image_url,
      });
      setGeneratedTrip(updated);
      setSwapActivityModal(null);
      setTripUpdateToast(`Swapped activity for "${newActivity.title}"!`);
      setTimeout(() => setTripUpdateToast(null), 3000);

      setMessages((prev) => [
        ...prev,
        {
          id: `bot-act-swap-${Date.now()}`,
          sender: 'bot',
          text: `🔄 Swapped activity with **${newActivity.title}** (₹${(newActivity.cost || 0).toLocaleString()}). Schedule and cost updated.`,
          suggestions: ['View Day itinerary', 'Edit activity timing', 'Lock in hotel'],
        },
      ]);
    } catch (err: any) {
      alert(`Error swapping activity: ${err?.message || 'Please try again'}`);
    }
  };

  // Edit Itinerary Activity
  const handleEditActivity = async (itemId: string, edits: { title?: string; description?: string; start_time?: string; end_time?: string; cost?: number }) => {
    if (!generatedTrip) return;
    try {
      const updated = await TourFlowApi.editItineraryActivity(generatedTrip.id, {
        item_id: itemId,
        ...edits,
      });
      setGeneratedTrip(updated);
      setEditActivityModal(null);
      setTripUpdateToast(`Updated activity details!`);
      setTimeout(() => setTripUpdateToast(null), 3000);

      setMessages((prev) => [
        ...prev,
        {
          id: `bot-act-edit-${Date.now()}`,
          sender: 'bot',
          text: `✏️ Updated activity details for **${edits.title || 'selected item'}**. New total cost: **₹${updated.total_cost?.toLocaleString()}**.`,
          suggestions: ['View Day itinerary', 'Lock in bookings', 'Share itinerary'],
        },
      ]);
    } catch (err: any) {
      alert(`Error editing activity: ${err?.message || 'Please try again'}`);
    }
  };

  // Delete Itinerary Activity
  const handleDeleteActivity = async (itemId: string, itemTitle: string, dayNumber: number) => {
    if (!generatedTrip) return;
    if (!window.confirm(`Are you sure you want to remove "${itemTitle}" from Day ${dayNumber}?`)) return;
    try {
      const updated = await TourFlowApi.deleteItineraryActivity(generatedTrip.id, itemId);
      setGeneratedTrip(updated);
      setTripUpdateToast(`Removed "${itemTitle}" from Day ${dayNumber}`);
      setTimeout(() => setTripUpdateToast(null), 3000);

      setMessages((prev) => [
        ...prev,
        {
          id: `bot-act-del-${Date.now()}`,
          sender: 'bot',
          text: `🗑️ Removed **${itemTitle}** from Day ${dayNumber}. Total cost adjusted to **₹${updated.total_cost?.toLocaleString()}**.`,
          suggestions: ['Add new activity', 'View Day itinerary', 'Make it cheaper'],
        },
      ]);
    } catch (err: any) {
      alert(`Error removing activity: ${err?.message || 'Please try again'}`);
    }
  };

  // Toggle Activity Enable/Disable (Select/Deselect without deleting)
  const handleToggleActivity = async (itemId: string, itemTitle?: string) => {
    if (!generatedTrip) return;
    try {
      const updated = await TourFlowApi.toggleItineraryActivity(generatedTrip.id, itemId);
      setGeneratedTrip(updated);
      const isNowDisabled = updated.itinerary.find((i: any) => i.id === itemId)?.is_disabled;
      setTripUpdateToast(isNowDisabled ? `Deselected "${itemTitle || 'activity'}" (Cost excluded)` : `Re-enabled "${itemTitle || 'activity'}"`);
      setTimeout(() => setTripUpdateToast(null), 3000);
      setMessages((prev) => [
        ...prev,
        {
          id: `bot-toggle-${Date.now()}`,
          sender: 'bot',
          text: isNowDisabled
            ? `⏸️ Deselected **${itemTitle || 'activity'}**. Total cost recalculated to **₹${updated.total_cost?.toLocaleString()}**.`
            : `▶️ Re-included **${itemTitle || 'activity'}**. Total cost recalculated to **₹${updated.total_cost?.toLocaleString()}**.`,
          suggestions: ['View itinerary', 'Check budget', 'Possible options'],
        },
      ]);
    } catch (err: any) {
      alert(`Error toggling activity: ${err?.message || 'Please try again'}`);
    }
  };

  // Add Day Leg
  const handleAddDayLeg = async () => {
    if (!generatedTrip) return;
    try {
      const updated = await TourFlowApi.addDayLeg(generatedTrip.id);
      setGeneratedTrip(updated);
      setTripUpdateToast(`Extended trip to ${updated.duration_days} Days! 🗓️`);
      setTimeout(() => setTripUpdateToast(null), 3000);
      setMessages((prev) => [
        ...prev,
        {
          id: `bot-add-day-${Date.now()}`,
          sender: 'bot',
          text: `✨ Added **Day ${updated.duration_days}** to your itinerary with tailored sightseeing and updated budget allocations.`,
          suggestions: ['View Day itinerary', 'Add activity to new day', 'Recalculate budget'],
        },
      ]);
    } catch (err: any) {
      alert(`Error extending trip: ${err?.message || 'Please try again'}`);
    }
  };

  // Remove Day Leg
  const handleRemoveDayLeg = async (dayNumber: number) => {
    if (!generatedTrip) return;
    if (generatedTrip.duration_days <= 1) {
      alert('A trip must have at least 1 day.');
      return;
    }
    if (!window.confirm(`Are you sure you want to remove Day ${dayNumber} from your trip?`)) return;
    try {
      const updated = await TourFlowApi.removeDayLeg(generatedTrip.id, dayNumber);
      setGeneratedTrip(updated);
      if (selectedDayForMap === dayNumber) {
        setSelectedDayForMap(null);
      }
      setTripUpdateToast(`Removed Day ${dayNumber}. Total duration: ${updated.duration_days} Days`);
      setTimeout(() => setTripUpdateToast(null), 3000);
      setMessages((prev) => [
        ...prev,
        {
          id: `bot-rem-day-${Date.now()}`,
          sender: 'bot',
          text: `🗑️ Removed Day ${dayNumber}. Your itinerary has been re-indexed to **${updated.duration_days} Days** with updated costs.`,
          suggestions: ['View itinerary', 'Check budget', 'Add day back'],
        },
      ]);
    } catch (err: any) {
      alert(`Error removing day: ${err?.message || 'Please try again'}`);
    }
  };

  // Add Activity from Possible Options Tray
  const handleAddFromTray = async (dayNumber: number, option: PossibleOptionItem) => {
    if (!generatedTrip) return;
    try {
      const updated = await TourFlowApi.addItineraryActivity(generatedTrip.id, {
        day_number: dayNumber,
        title: option.title,
        description: option.description,
        cost: option.cost,
        location: option.location,
        image_url: option.image_url,
        duration: option.duration,
        item_type: 'activity',
      });
      setGeneratedTrip(updated);
      setTripUpdateToast(`Added "${option.title}" to Day ${dayNumber}! ✨`);
      setTimeout(() => setTripUpdateToast(null), 3000);
      setMessages((prev) => [
        ...prev,
        {
          id: `bot-tray-add-${Date.now()}`,
          sender: 'bot',
          text: `✨ Added **${option.title}** to Day ${dayNumber} (₹${option.cost.toLocaleString()}). Recalculated timeline and total budget to **₹${updated.total_cost?.toLocaleString()}**.`,
          suggestions: ['View Day itinerary', 'Swap another stop', 'Lock in hotel'],
        },
      ]);
    } catch (err: any) {
      alert(`Error adding option: ${err?.message || 'Please try again'}`);
    }
  };

  // Export Trip to Formatted PDF
  const handleExportPDF = () => {
    if (!generatedTrip) return;
    exportTripToPDF({
      title: generatedTrip.title,
      destination: generatedTrip.destination?.name || 'Trip Destination',
      origin: generatedTrip.origin,
      dates: generatedTrip.formatted_dates || `${generatedTrip.duration_days} Days`,
      durationDays: generatedTrip.duration_days,
      travelers: generatedTrip.traveler_count,
      travelType: generatedTrip.travel_type,
      targetBudget: generatedTrip.total_budget,
      totalCost: generatedTrip.total_cost,
      currency: 'INR',
      transport: generatedTrip.transport ? {
        operator: generatedTrip.transport.operator,
        mode: generatedTrip.transport.mode,
        route_summary: generatedTrip.transport.route_summary,
        departure_time: generatedTrip.transport.departure_time,
        arrival_time: generatedTrip.transport.arrival_time,
        total_price: generatedTrip.transport.total_price,
      } : undefined,
      accommodation: generatedTrip.accommodation ? {
        name: generatedTrip.accommodation.name,
        category: generatedTrip.accommodation.category,
        location: generatedTrip.accommodation.location,
        room_type: generatedTrip.accommodation.room_type,
        total_price: generatedTrip.accommodation.total_price,
        price_per_night: generatedTrip.accommodation.price_per_night,
        nights: generatedTrip.accommodation.nights,
      } : undefined,
      costBreakdown: generatedTrip.cost_breakdown,
      itinerary: (generatedTrip.itinerary || []).map((item) => ({
        day_number: item.day_number,
        order_index: item.order_index,
        item_type: item.item_type,
        title: item.title,
        description: item.description,
        start_time: item.start_time,
        end_time: item.end_time,
        cost: item.cost,
        location: item.location,
      })),
    });
    setTripUpdateToast('PDF Itinerary downloaded successfully! 📄');
    setTimeout(() => setTripUpdateToast(null), 3000);
  };

  // Generate My Trip - In-place transformation without leaving the workspace!
  const handleGenerateTripNow = async () => {
    // If no destination is provided yet, prompt the user with suggestions
    if (!checklist.where_to || isInvalidDestination(checklist.where_to)) {
      setMessages((prev) => [
        ...prev,
        {
          id: `bot-missing-dest-${Date.now()}`,
          sender: 'bot',
          text: `Please select or mention your destination (e.g. **Uttar Pradesh**, **Goa**, **Darjeeling**, or **Manali**) so I can generate your trip!`,
          suggestions: ['Uttar Pradesh', 'Goa', 'Darjeeling', 'Manali'],
        },
      ]);
      return;
    }

    const destName = checklist.where_to;
    const durMatch = checklist.when_you_go?.match(/\d+/);
    const durDays = durMatch ? parseInt(durMatch[0], 10) : 7;

    // Auto-resolve dates if not explicitly provided
    let startDate = checklist.start_date;
    let endDate = checklist.end_date;
    let formattedDates = checklist.travel_dates;

    if (!startDate || !endDate || !formattedDates || formattedDates.trim() === '') {
      const now = new Date();
      const start = new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000);
      const end = new Date(start.getTime() + (durDays - 1) * 24 * 60 * 60 * 1000);
      startDate = start.toISOString().split('T')[0];
      endDate = end.toISOString().split('T')[0];
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      formattedDates = `${monthNames[start.getMonth()]} ${start.getDate()} – ${monthNames[end.getMonth()]} ${end.getDate()}, ${end.getFullYear()}`;
    }

    const parsedBudgetValue = checklist.what_you_are_after ? parseBudget(checklist.what_you_are_after) : null;
    const budgetVal = parsedBudgetValue && parsedBudgetValue > 0 ? parsedBudgetValue : Math.max(40000, durDays * 8000);

    const travelersMatch = checklist.who_is_coming?.match(/\d+/);
    const travelersCount = travelersMatch 
      ? parseInt(travelersMatch[0], 10) 
      : (checklist.who_is_coming?.toLowerCase().includes('solo') ? 1 : 2);
    
    const travelType = checklist.who_is_coming?.toLowerCase().includes('solo') ? 'solo' 
      : checklist.who_is_coming?.toLowerCase().includes('couple') ? 'couple' 
      : checklist.who_is_coming?.toLowerCase().includes('family') ? 'family' : 'friends';

    const originCity = checklist.where_from || 'Delhi';

    // Synchronize checklist state with verified parameters
    setChecklist({
      where_to: destName,
      where_from: originCity,
      who_is_coming: `${travelersCount} Travelers (${travelType.charAt(0).toUpperCase() + travelType.slice(1)})`,
      when_you_go: `${durDays} days`,
      what_you_are_after: `Budget ₹${budgetVal.toLocaleString()}`,
      travel_dates: formattedDates,
      start_date: startDate,
      end_date: endDate,
      is_dates_valid: true,
      is_ready_to_generate: true,
    });

    setWorkspaceState('generating');
    setGenerationStep(1);
    setMobileTab('trip');

    setMessages((prev) => [
      ...prev,
      {
        id: `bot-gen-${Date.now()}`,
        sender: 'bot',
        text: `✨ Generating your verified **${durDays}-day** itinerary to **${destName}** from **${originCity}** for **${travelersCount} travelers** (${formattedDates}, Target Budget: **₹${budgetVal.toLocaleString()}**) right here in your workspace!`,
      },
    ]);

    setTimeout(() => setGenerationStep(2), 600);
    setTimeout(() => setGenerationStep(3), 1200);
    setTimeout(() => setGenerationStep(4), 1800);

    try {
      const newTrip = await TourFlowApi.createTrip({
        title: `${durDays}-Day ${travelType.charAt(0).toUpperCase() + travelType.slice(1)} Trip to ${destName}`,
        destination_name: destName,
        duration_days: durDays,
        start_date: startDate,
        end_date: endDate,
        formatted_dates: formattedDates,
        total_budget: budgetVal,
        traveler_count: travelersCount,
        travel_type: travelType,
        origin: originCity,
        pace: 'balanced',
        preferences: {
          budget_tier: checklist.what_you_are_after?.toLowerCase().includes('luxury') ? 'luxury' : 'moderate',
          interests: ['scenic_views', 'culture', 'nature', 'sightseeing'],
          travel_companions: travelType,
          accommodation_types: ['boutique'],
          transport_preferences: ['flight'],
          dietary_requirements: [],
          special_requests: `Origin: ${originCity}. Dates: ${formattedDates}. Target budget: ₹${budgetVal.toLocaleString()}`,
        },
      });

      if (newTrip.packing_items) setPackingItems(newTrip.packing_items);
      if (newTrip.expenses) setExpenses(newTrip.expenses);

      setTimeout(() => {
        setGeneratedTrip(newTrip);
        setWorkspaceState('generated');

        setMessages((prev) => [
          ...prev,
          {
            id: `bot-ready-${Date.now()}`,
            sender: 'bot',
            text: `🎉 **Your verified trip to ${newTrip.destination?.name || destName} is ready on the right panel!**\n\n- **Route & Transport**: ${newTrip.selected_transport?.operator} (${newTrip.selected_transport?.duration_str})\n- **Stay**: ${newTrip.selected_accommodation?.name}\n- **Total Cost**: ₹${newTrip.total_cost?.toLocaleString()} of ₹${newTrip.total_budget.toLocaleString()} target budget.\n\nYou can change flights, hotels, or ask me anything in chat!`,
            suggestions: [
              'Find me a cheaper hotel',
              'I prefer train instead of flight',
              'Change my flight',
              'Make the trip cheaper',
              'Find a 4-star resort',
            ],
          },
        ]);
      }, 2100);

    } catch (e) {
      console.error(e);
      setTimeout(() => {
        setWorkspaceState('planning');
      }, 1000);
    }
  };

  // Switch Transport via Modal / Click
  const handleSelectTransportOption = async (transportId: string) => {
    if (!generatedTrip) return;
    setChangingEntityLoading(true);
    try {
      const updated = await TourFlowApi.changeTransport(generatedTrip.id, transportId);
      setGeneratedTrip(updated);
      setShowTransportModal(false);
      setTripUpdateToast(`Switched transport to ${updated.selected_transport?.operator}!`);
      setTimeout(() => setTripUpdateToast(null), 3500);

      setMessages((prev) => [
        ...prev,
        {
          id: `bot-change-trans-${Date.now()}`,
          sender: 'bot',
          text: `🔄 Updated transport to **${updated.selected_transport?.operator}** (${updated.selected_transport?.mode.toUpperCase()}). Day 1 arrival timeline and transfer details adjusted accordingly. New total cost: **₹${updated.total_cost?.toLocaleString()}**.`,
          suggestions: ['Find me a cheaper hotel', 'Change back to flight', 'Make the trip cheaper'],
        },
      ]);
    } catch (err) {
      console.error(err);
    } finally {
      setChangingEntityLoading(false);
    }
  };

  // Switch Accommodation via Modal / Click
  const handleSelectHotelOption = async (accommodationId: string) => {
    if (!generatedTrip) return;
    setChangingEntityLoading(true);
    try {
      if (selectedDayForHotelChange !== null) {
        const updated = await TourFlowApi.changeDailyAccommodation(generatedTrip.id, selectedDayForHotelChange, accommodationId);
        setGeneratedTrip(updated);
        setShowHotelModal(false);
        const dayHotel = updated.daily_accommodations?.find((d) => d.day_number === selectedDayForHotelChange)?.hotel;
        const dayHotelName = dayHotel?.name || 'custom hotel';
        setTripUpdateToast(`Updated Night ${selectedDayForHotelChange} stay to ${dayHotelName}!`);
        setTimeout(() => setTripUpdateToast(null), 3500);

        setMessages((prev) => [
          ...prev,
          {
            id: `bot-change-hotel-${Date.now()}`,
            sender: 'bot',
            text: `🏨 Updated Day **${selectedDayForHotelChange}** accommodation to **${dayHotelName}**. Itinerary schedule and pricing updated. New total cost: **₹${updated.total_cost?.toLocaleString()}**.`,
            suggestions: ['View day-by-day itinerary', 'Change another day hotel', 'Make the trip cheaper'],
          },
        ]);
      } else {
        const updated = await TourFlowApi.changeAccommodation(generatedTrip.id, accommodationId);
        setGeneratedTrip(updated);
        setShowHotelModal(false);
        setTripUpdateToast(`Switched stay to ${updated.selected_accommodation?.name}!`);
        setTimeout(() => setTripUpdateToast(null), 3500);

        setMessages((prev) => [
          ...prev,
          {
            id: `bot-change-hotel-${Date.now()}`,
            sender: 'bot',
            text: `🏨 Switched overall accommodation to **${updated.selected_accommodation?.name}** (${updated.selected_accommodation?.category.toUpperCase()}). Overnight stay schedule and budget recalculated. New total cost: **₹${updated.total_cost?.toLocaleString()}**.`,
            suggestions: ['I prefer train', 'Change my flight', 'View day-by-day itinerary'],
          },
        ]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setChangingEntityLoading(false);
    }
  };

  // Apply Dates from Date Picker
  const handleApplyDates = (sIso: string, eIso: string) => {
    const s = new Date(sIso);
    const e = new Date(eIso);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const diffDays = Math.max(1, Math.round((e.getTime() - s.getTime()) / 86400000) + 1);
    const fmt = `${months[s.getMonth()]} ${s.getDate()} – ${months[e.getMonth()]} ${e.getDate()}, ${e.getFullYear()}`;

    setChecklist((prev) => ({
      ...prev,
      travel_dates: fmt,
      start_date: sIso,
      end_date: eIso,
      when_you_go: `${diffDays} days`,
      is_dates_valid: true,
    }));
    setShowDateModal(false);

    setMessages((prev) => [
      ...prev,
      {
        id: `user-dates-${Date.now()}`,
        sender: 'user',
        text: `Travel dates: ${fmt} (${diffDays} days)`,
      },
      {
        id: `bot-dates-${Date.now()}`,
        sender: 'bot',
        text: `Got it! I've set your travel dates to **${fmt}** (${diffDays} days). Your checklist is ready to generate!`,
        suggestions: ['Generate my trip', 'From Mumbai', 'Budget ₹90,000'],
      },
    ]);
  };

  const handleShareTrip = () => {
    if (!generatedTrip) return;
    const itinerarySummary = generatedTrip.itinerary
      ?.map((i) => `• Day ${i.day_number}: ${i.title} (${i.start_time || 'Flexible'})`)
      .join('\n') || 'Itinerary generated via TourFlow AI';

    const shareText = `🌟 *${generatedTrip.title}*\n📍 Dates: ${generatedTrip.formatted_dates || '6 Days'}\n💰 Budget: ₹${generatedTrip.total_cost?.toLocaleString()} of ₹${generatedTrip.total_budget?.toLocaleString()}\n👥 Travelers: ${generatedTrip.traveler_count}\n✈️ Transport: ${generatedTrip.selected_transport?.operator}\n🏨 Stay: ${generatedTrip.selected_accommodation?.name}\n\n*Schedule Highlights:*\n${itinerarySummary}\n\nPlanned with TourFlow AI ✨`;

    navigator.clipboard.writeText(shareText);
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 3000);
  };

  const handleRequestExit = (target: 'home' | 'workspace') => {
    setPendingExitTarget(target);
    setShowExitConfirm(true);
  };

  const handleConfirmExit = () => {
    setWorkspaceState('planning');
    setGeneratedTrip(null);
    setMessages([
      {
        id: 'msg-fresh',
        sender: 'bot',
        text: "Where would you like to travel next? Tell me your dream destination, travel dates, group size, and budget!",
        suggestions: ['Darjeeling Sep 21-26 for 4 budget ₹90,000', 'Goa 5 days from Mumbai', 'Kashmir 6 days in October'],
      },
    ]);
    setChecklist({
      where_to: null,
      where_from: null,
      who_is_coming: null,
      when_you_go: null,
      what_you_are_after: null,
      travel_dates: null,
      start_date: null,
      end_date: null,
      is_dates_valid: false,
    });
    setInputMessage('');
    setShowExitConfirm(false);

    const target = pendingExitTarget;
    setPendingExitTarget(null);

    if (target === 'workspace') {
      onNavigateToWorkspace?.();
    } else {
      onBackToHome?.();
    }
  };

  return (
    <div id="tourflow-stateful-workspace-container" className="min-h-screen bg-stone-50 flex flex-col font-sans text-stone-900 selection:bg-[#7065F0] selection:text-white relative">
      
      {/* 1. Header Bar */}
      <header className="h-16 px-4 sm:px-8 border-b border-stone-200/80 bg-white/95 backdrop-blur-md flex items-center justify-between shrink-0 sticky top-0 z-40 shadow-2xs">
        
        {/* Left: Brand Logo & Exit */}
        <div className="flex items-center gap-3 sm:gap-4">
          <button
            onClick={() => handleRequestExit('home')}
            className="p-2 rounded-full hover:bg-stone-100 text-stone-600 hover:text-stone-900 transition-colors cursor-pointer flex items-center gap-1.5"
            title="Exit Workspace"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-xs font-semibold text-stone-600 hidden sm:inline">Exit</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleRequestExit('home')}
              className="font-display text-2xl sm:text-3xl font-black text-stone-950 tracking-tight cursor-pointer"
            >
              TourFlow<span className="text-[#7065F0]">.</span>
            </button>

            {/* Workspace Mode Badge */}
            <div className={`hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ml-2 ${
              workspaceState === 'generated'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : workspaceState === 'generating'
                ? 'bg-purple-50 text-purple-800 border-purple-200 animate-pulse'
                : 'bg-[#ECE8FF] text-stone-900 border-purple-200'
            }`}>
              <span className={`w-2 h-2 rounded-full ${
                workspaceState === 'generated' ? 'bg-emerald-500' : 'bg-[#7065F0] animate-ping'
              }`} />
              <span>
                {workspaceState === 'generated' 
                  ? 'Itinerary Active & Interactive' 
                  : workspaceState === 'generating'
                  ? 'Building Itinerary...' 
                  : `Planning Mode (${capturedCount}/6)`}
              </span>
            </div>
          </div>
        </div>

        {/* Mobile View Toggle Segment */}
        <div className="flex lg:hidden items-center p-1 rounded-full bg-stone-100 border border-stone-200 text-xs font-bold">
          <button
            onClick={() => setMobileTab('chat')}
            className={`px-3 py-1 rounded-full transition-all ${
              mobileTab === 'chat' ? 'bg-white text-stone-950 shadow-2xs' : 'text-stone-600'
            }`}
          >
            Chat
          </button>
          <button
            onClick={() => setMobileTab('trip')}
            className={`px-3 py-1 rounded-full transition-all ${
              mobileTab === 'trip' ? 'bg-white text-stone-950 shadow-2xs' : 'text-stone-600'
            }`}
          >
            {workspaceState === 'generated' ? 'Trip' : 'Checklist'}
          </button>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {workspaceState === 'generated' && (
            <button
              onClick={handleShareTrip}
              className="px-3.5 py-1.5 rounded-full border border-stone-200 hover:border-stone-400 bg-white text-xs font-bold text-stone-800 flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-95"
            >
              <Share2 className="w-3.5 h-3.5 text-[#7065F0]" />
              <span>{copiedShare ? 'Copied Link!' : 'Share'}</span>
            </button>
          )}

          <button
            onClick={() => handleRequestExit('workspace')}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border border-stone-200 hover:border-stone-400 flex items-center justify-center text-stone-700 hover:text-stone-950 transition-all cursor-pointer bg-stone-50"
            title="Saved Trips"
          >
            <Users className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Live Toast for AI modifications */}
      <AnimatePresence>
        {tripUpdateToast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 bg-stone-950 text-white px-5 py-2.5 rounded-full text-xs font-bold shadow-xl flex items-center gap-2 border border-stone-700"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>{tripUpdateToast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. SPLIT-SCREEN WORKSPACE LAYOUT */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-[calc(100vh-64px)] max-h-[calc(100vh-64px)]">
        
        {/* ========================================================= */}
        {/* LEFT COLUMN: Persistent TourFlow Chat Stream (~50%)       */}
        {/* ========================================================= */}
        <div className={`w-full lg:w-1/2 flex flex-col justify-between bg-white border-r border-stone-200/80 relative max-h-[calc(100vh-64px)] ${
          mobileTab === 'trip' ? 'hidden lg:flex' : 'flex'
        }`}>
          
          {/* Conversation Stream */}
          <div 
            ref={chatContainerRef}
            className="flex-1 overflow-y-auto px-4 sm:px-8 lg:px-10 py-6 space-y-6 max-w-2xl mx-auto w-full"
          >
            {workspaceState === 'generated' && (
              <div className="p-3.5 rounded-2xl bg-purple-50 border border-purple-100 text-xs text-stone-700 flex items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#7065F0] shrink-0" />
                  <span><strong>AI Live Assistant:</strong> Ask me to modify your transport, hotel, or schedule!</span>
                </div>
                <button
                  onClick={() => handleSendMessage("Find me a cheaper hotel")}
                  className="px-2.5 py-1 rounded-lg bg-white border border-purple-200 text-[#7065F0] font-bold text-[11px] hover:bg-purple-50 shrink-0 cursor-pointer"
                >
                  Cheaper Hotel
                </button>
              </div>
            )}

            {messages.map((msg) => (
              <div 
                key={msg.id} 
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'} space-y-2`}
              >
                {msg.sender === 'user' ? (
                  <div className="max-w-[88%] sm:max-w-[80%] px-5 py-3 rounded-3xl bg-[#ECE8FF] text-stone-950 text-sm sm:text-[15px] font-normal shadow-2xs leading-relaxed">
                    {msg.text}
                  </div>
                ) : (
                  <div className="space-y-3 max-w-full text-stone-900 text-sm sm:text-[15px] leading-relaxed font-normal">
                    {formatPlaceAndMarkdown(msg.text)}

                    {msg.suggestions && msg.suggestions.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-1.5">
                        {msg.suggestions.map((sug, sIdx) => {
                          const sugLower = sug.toLowerCase();
                          const isGenSug = sugLower.includes('generate') || sugLower.includes('plan my trip');
                          return (
                            <button
                              key={sIdx}
                              onClick={() => {
                                if (isGenSug) {
                                  handleGenerateTripNow();
                                } else if (sugLower.includes('bali')) {
                                  // Direct selection of Bali updates checklist directly in chat
                                  setChecklist((prev) => ({ ...prev, where_to: 'Bali' }));
                                } else {
                                  handleSendMessage(sug);
                                }
                              }}
                              className={`px-3.5 py-1.5 rounded-full border text-xs font-medium transition-all shadow-2xs cursor-pointer active:scale-95 flex items-center gap-1.5 ${
                                isGenSug
                                  ? 'bg-[#0F172A] border-[#0F172A] text-white hover:bg-black font-bold shadow-xs'
                                  : 'border-stone-200 bg-white hover:bg-stone-50 text-stone-900 hover:border-[#7065F0]'
                              }`}
                            >
                              {isGenSug && <Sparkles className="w-3.5 h-3.5 text-amber-300" />}
                              <span>{sug}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}

            {/* DIRECT IN-CHAT TRIP CHECKLIST (Only in chat during planning!) */}
            {workspaceState === 'planning' && (
              <InChatTripChecklist
                checklist={checklist}
                capturedCount={capturedCount}
                progressPercent={progressPercent}
                onSelectDestination={(dest) => {
                  setChecklist((prev) => ({
                    ...prev,
                    where_to: dest,
                  }));
                }}
                onSelectOrigin={(city) => {
                  setChecklist((prev) => ({
                    ...prev,
                    where_from: city,
                  }));
                }}
                onSelectTravelers={(trav) => {
                  setChecklist((prev) => ({
                    ...prev,
                    who_is_coming: trav,
                  }));
                }}
                onSelectBudget={(bgt) => {
                  setChecklist((prev) => ({
                    ...prev,
                    what_you_are_after: bgt,
                  }));
                }}
                onSelectDuration={(dur) => {
                  setChecklist((prev) => ({
                    ...prev,
                    when_you_go: dur,
                  }));
                }}
                onSelectDatesModal={() => setShowDateModal(true)}
                onQuickDates={(datesStr) => {
                  const parsed = parseDateRange(datesStr);
                  if (parsed.is_valid && parsed.start_date && parsed.end_date) {
                    setChecklist((prev) => ({
                      ...prev,
                      travel_dates: parsed.formatted_dates || datesStr,
                      start_date: parsed.start_date,
                      end_date: parsed.end_date,
                      travel_month: parsed.travel_month || prev.travel_month,
                      when_you_go: parsed.duration_days ? `${parsed.duration_days} days` : prev.when_you_go,
                      is_dates_valid: true,
                    }));
                  } else {
                    setChecklist((prev) => ({
                      ...prev,
                      travel_dates: datesStr,
                      is_dates_valid: true,
                    }));
                  }
                }}
                onGenerateTrip={handleGenerateTripNow}
                isGenerating={workspaceState === 'generating'}
              />
            )}

            {loading && (
              <div className="flex items-center gap-2 text-stone-500 text-xs sm:text-sm py-2">
                <RefreshCw className="w-4 h-4 animate-spin text-[#7065F0]" />
                <span className="font-medium">
                  {workspaceState === 'generated' ? 'TourFlow AI is updating your live itinerary...' : 'TourFlow AI is crafting suggestions...'}
                </span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <div className="absolute bottom-28 right-6 lg:right-8 pointer-events-auto">
            <button
              onClick={scrollToBottom}
              className="w-8 h-8 rounded-full bg-white border border-stone-200/90 shadow-md flex items-center justify-center text-stone-600 hover:text-stone-950 transition-all cursor-pointer hover:shadow-lg active:scale-90"
              title="Scroll to bottom"
            >
              <ChevronDown className="w-4 h-4 stroke-[2.2]" />
            </button>
          </div>

          {/* Bottom Chat Input */}
          <div className="p-3.5 sm:px-8 lg:px-10 pb-5 bg-white shrink-0 max-w-2xl mx-auto w-full space-y-2 border-t border-stone-100">
            {workspaceState === 'generated' && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                <span className="text-[11px] font-bold text-stone-500 shrink-0 flex items-center gap-1">
                  <SlidersHorizontal className="w-3 h-3 text-[#7065F0]" />
                  Rank options:
                </span>
                {(['budget', 'speed', 'rating', 'distance'] as const).map((crit) => (
                  <button
                    key={crit}
                    onClick={() => handleApplyRanking(crit)}
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold shrink-0 transition-all flex items-center gap-1 cursor-pointer border ${
                      activeRanking === crit
                        ? 'bg-purple-100 border-purple-400 text-purple-900 font-bold shadow-2xs'
                        : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                    }`}
                  >
                    {crit === 'budget' && '💰 Budget'}
                    {crit === 'speed' && '⚡ Speed'}
                    {crit === 'rating' && '⭐ Rating'}
                    {crit === 'distance' && '📍 Distance'}
                  </button>
                ))}
              </div>
            )}

            <div className="rounded-3xl border border-stone-200/90 bg-white p-3 sm:p-3.5 shadow-sm focus-within:border-stone-400 focus-within:shadow-md transition-all space-y-2">
              <textarea
                id="tourflow-chat-input"
                rows={2}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder={workspaceState === 'generated' ? "Ask to change hotel, switch to train, or adjust budget..." : "Enter trip details (e.g. Darjeeling for 4 people from Sep 21 to Sep 26 budget ₹90,000)..."}
                className="w-full text-stone-900 placeholder:text-stone-400 text-sm sm:text-base bg-transparent border-0 focus:outline-hidden resize-none leading-relaxed"
              />

              <div className="flex items-center justify-between pt-0.5">
                <button
                  type="button"
                  onClick={() => setShowDateModal(true)}
                  className="px-2.5 py-1 rounded-full text-xs font-semibold text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-colors cursor-pointer flex items-center gap-1.5 border border-stone-200"
                  title="Pick Dates"
                >
                  <Calendar className="w-3.5 h-3.5 text-[#7065F0]" />
                  <span>Pick Dates</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    id="tourflow-send-btn"
                    onClick={() => handleSendMessage()}
                    disabled={!inputMessage.trim() || loading}
                    className="w-8 h-8 rounded-full bg-[#D8C7FF] hover:bg-[#C9B3FE] disabled:opacity-40 disabled:hover:bg-[#D8C7FF] text-stone-950 flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-xs"
                    title="Send message"
                  >
                    <ArrowUp className="w-4 h-4 stroke-[2.4]" />
                  </button>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-stone-400 text-center select-none">
              AI-assisted travel intelligence • Real verified routes & transparent estimates.
            </p>
          </div>

        </div>

        {/* ========================================================= */}
        {/* RIGHT COLUMN: Dynamic Workspace Content (50% width)       */}
        {/* ========================================================= */}
        <div className={`w-full lg:w-1/2 overflow-y-auto max-h-[calc(100vh-64px)] ${
          mobileTab === 'chat' ? 'hidden lg:block' : 'block'
        }`}>
          
          {/* ======================================================= */}
          {/* STATE 1: PLANNING (Live Destination & Journey Studio)   */}
          {/* ======================================================= */}
          {workspaceState === 'planning' && (
            <DestinationPreviewStudio
              checklist={checklist}
              onGenerateTrip={handleGenerateTripNow}
              onPickDates={() => setShowDateModal(true)}
              onSelectBudget={(bgt) => {
                setChecklist((prev) => ({
                  ...prev,
                  what_you_are_after: bgt,
                }));
              }}
            />
          )}

          {/* ======================================================= */}
          {/* STATE 2: GENERATING ANIMATION                           */}
          {/* ======================================================= */}
          {workspaceState === 'generating' && (
            <div className="min-h-full bg-stone-900 text-white p-6 sm:p-10 flex flex-col items-center justify-center space-y-8">
              <div className="max-w-md w-full text-center space-y-6">
                <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full border-2 border-[#7065F0]/30 animate-ping" />
                  <div className="absolute inset-2 rounded-full border-2 border-t-[#7065F0] border-transparent animate-spin" />
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#7065F0] to-pink-500 text-white flex items-center justify-center shadow-lg shadow-[#7065F0]/40">
                    <Sparkles className="w-6 h-6 text-amber-300" />
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#7065F0] block">
                    AI Itinerary & Route Engine
                  </span>
                  <h3 className="font-display text-2xl sm:text-3xl font-black text-white">
                    Crafting your journey to {checklist.where_to || 'India'}
                  </h3>
                  <p className="text-xs sm:text-sm text-stone-300 max-w-sm mx-auto">
                    Resolving verified airlines/rail routes, boutique accommodations, and dynamic day plans...
                  </p>
                </div>

                <div className="space-y-2.5 text-left pt-4">
                  <div className={`p-3 rounded-2xl border transition-all flex items-center gap-3 ${
                    generationStep >= 1 ? 'bg-white/10 border-white/20 text-white' : 'bg-white/5 border-transparent text-stone-500'
                  }`}>
                    {generationStep > 1 ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> : <RefreshCw className="w-4 h-4 text-[#7065F0] animate-spin shrink-0" />}
                    <span className="text-xs font-semibold">1. Grounding route & transport for {checklist.travel_dates || 'your dates'}</span>
                  </div>

                  <div className={`p-3 rounded-2xl border transition-all flex items-center gap-3 ${
                    generationStep >= 2 ? 'bg-white/10 border-white/20 text-white' : 'bg-white/5 border-transparent text-stone-500'
                  }`}>
                    {generationStep > 2 ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> : generationStep === 2 ? <RefreshCw className="w-4 h-4 text-[#7065F0] animate-spin shrink-0" /> : <div className="w-4 h-4 rounded-full border border-stone-600 shrink-0" />}
                    <span className="text-xs font-semibold">2. Selecting boutique stays & room configurations</span>
                  </div>

                  <div className={`p-3 rounded-2xl border transition-all flex items-center gap-3 ${
                    generationStep >= 3 ? 'bg-white/10 border-white/20 text-white' : 'bg-white/5 border-transparent text-stone-500'
                  }`}>
                    {generationStep > 3 ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> : generationStep === 3 ? <RefreshCw className="w-4 h-4 text-[#7065F0] animate-spin shrink-0" /> : <div className="w-4 h-4 rounded-full border border-stone-600 shrink-0" />}
                    <span className="text-xs font-semibold">3. Sequencing arrival transfer & day-by-day activities</span>
                  </div>

                  <div className={`p-3 rounded-2xl border transition-all flex items-center gap-3 ${
                    generationStep >= 4 ? 'bg-white/10 border-white/20 text-white' : 'bg-white/5 border-transparent text-stone-500'
                  }`}>
                    {generationStep === 4 ? <RefreshCw className="w-4 h-4 text-[#7065F0] animate-spin shrink-0" /> : <div className="w-4 h-4 rounded-full border border-stone-600 shrink-0" />}
                    <span className="text-xs font-semibold">4. Computing canonical cost breakdown & budget audit</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================= */}
          {/* STATE 3: GENERATED TRIP WORKSPACE (Rich Multi-Tab View) */}
          {/* ======================================================= */}
          {workspaceState === 'generated' && generatedTrip && (
            <div className="p-4 sm:p-6 lg:p-8 space-y-6 bg-stone-50">
              
              {/* Destination Photo Gallery & Hero Showcase */}
              {(() => {
                const destName = generatedTrip.destination?.name || 'Darjeeling';
                const photoSet = getDestinationPhotos(destName);
                const allPhotos = [
                  photoSet.hero,
                  ...(photoSet.gallery || [])
                ];
                const activePhotoUrl = allPhotos[activeGalleryIndex % allPhotos.length] || photoSet.hero;

                return (
                  <div className="rounded-3xl overflow-hidden bg-white border border-stone-200/90 shadow-sm space-y-0">
                    {/* Main Hero Photo Container */}
                    <div className="relative w-full h-56 sm:h-72 overflow-hidden group">
                      <SmartImage
                        src={activePhotoUrl}
                        alt={`${destName} scenic vista`}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        containerClassName="w-full h-full"
                        priority={true}
                        onClick={() => setPhotoModal({ url: activePhotoUrl, title: destName, subtitle: photoSet.caption })}
                      />
                      
                      {/* Gradient overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent flex flex-col justify-between p-4 sm:p-6 pointer-events-none">
                        <div className="flex items-center justify-between flex-wrap gap-2 pointer-events-auto">
                          <div className="flex items-center gap-2">
                            <span className="px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-white/95 text-stone-950 backdrop-blur-xs shadow-xs">
                              {generatedTrip.status}
                            </span>
                            <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-black/50 text-white backdrop-blur-xs border border-white/20 flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-amber-300" />
                              {generatedTrip.origin ? `${generatedTrip.origin} → ` : ''}{destName}
                            </span>
                          </div>

                          <button
                            onClick={() => setPhotoModal({ url: activePhotoUrl, title: destName, subtitle: photoSet.caption })}
                            className="p-2 rounded-full bg-black/50 hover:bg-black/80 text-white backdrop-blur-xs transition-colors cursor-pointer"
                            title="Expand photo"
                          >
                            <Maximize2 className="w-4 h-4" />
                          </button>
                        </div>

                        <div>
                          <h1 className="font-display text-2xl sm:text-3xl font-black text-white tracking-tight drop-shadow-md">
                            {generatedTrip.title}
                          </h1>
                          <p className="text-xs sm:text-sm text-stone-200 font-medium mt-1 drop-shadow-sm flex items-center gap-3 flex-wrap">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-stone-300" />
                              {generatedTrip.formatted_dates || `${generatedTrip.duration_days} Days`}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Users className="w-3.5 h-3.5 text-stone-300" />
                              {generatedTrip.traveler_count} Travelers ({generatedTrip.travel_type})
                            </span>
                            {photoSet.weatherSummary && (
                              <>
                                <span>•</span>
                                <span className="flex items-center gap-1 text-amber-200 font-semibold">
                                  <CloudSun className="w-3.5 h-3.5 text-amber-300" />
                                  {photoSet.weatherSummary}
                                </span>
                              </>
                            )}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Interactive Destination Photo Strip / Gallery */}
                    <div className="p-3 sm:p-4 bg-stone-50/90 border-t border-stone-100 flex items-center justify-between gap-2 overflow-x-auto">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-extrabold uppercase tracking-wider text-stone-600 shrink-0 flex items-center gap-1">
                          <Camera className="w-3.5 h-3.5 text-[#7065F0]" />
                          <span>Photos ({allPhotos.length}):</span>
                        </span>
                        <div className="flex items-center gap-2">
                          {allPhotos.map((url, idx) => (
                            <button
                              key={idx}
                              onClick={() => setActiveGalleryIndex(idx)}
                              className={`w-12 h-9 rounded-lg overflow-hidden shrink-0 border-2 transition-all cursor-pointer ${
                                (activeGalleryIndex % allPhotos.length) === idx
                                  ? 'border-[#7065F0] ring-2 ring-[#7065F0]/30 scale-105'
                                  : 'border-stone-200 opacity-70 hover:opacity-100'
                              }`}
                            >
                              <img
                                src={url}
                                alt={`Thumbnail ${idx + 1}`}
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                            </button>
                          ))}
                        </div>
                      </div>

                      {photoSet.bestTime && (
                        <span className="text-[11px] font-semibold text-stone-600 shrink-0 hidden md:inline-block">
                          ✨ Best season: <strong>{photoSet.bestTime}</strong>
                        </span>
                      )}
                    </div>

                    {/* Trip Status & Navigation Tabs */}
                    <div className="p-4 sm:p-6 space-y-4 border-t border-stone-100">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <p className="text-xs sm:text-sm text-stone-600 italic">
                          "{photoSet.caption}"
                        </p>

                        {/* Budget Target & Total Cost Status */}
                        <div 
                          onClick={() => {
                            setAdjustingBudgetVal(generatedTrip.total_budget || 75000);
                            setAdjustingBudgetInputStr((generatedTrip.total_budget || 75000).toString());
                            setShowBudgetModal(true);
                          }}
                          className="bg-stone-50 hover:bg-purple-50/70 p-3 sm:p-4 rounded-2xl border border-stone-200 hover:border-purple-300 text-right shrink-0 cursor-pointer transition-all group shadow-2xs hover:shadow-xs"
                          title="Click to adjust trip budget"
                        >
                          <div className="flex items-center justify-end gap-1.5 mb-0.5">
                            <SlidersHorizontal className="w-3 h-3 text-[#7065F0] group-hover:scale-110 transition-transform" />
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-stone-500 group-hover:text-[#7065F0] transition-colors">
                              Total Estimated Cost (Adjust)
                            </span>
                          </div>
                          <div className="text-xl sm:text-2xl font-black text-stone-950 font-display">
                            ₹{generatedTrip.total_cost?.toLocaleString()}
                          </div>
                          <div className="text-[11px] font-bold text-emerald-700 mt-0.5 flex items-center justify-end gap-1">
                            <Check className="w-3 h-3" />
                            <span>
                              {generatedTrip.cost_breakdown?.remaining_budget && generatedTrip.cost_breakdown.remaining_budget >= 0
                                ? `₹${generatedTrip.cost_breakdown.remaining_budget.toLocaleString()} under budget`
                                : `Target: ₹${generatedTrip.total_budget.toLocaleString()}`}
                            </span>
                          </div>
                          <div className="mt-1.5 pt-1.5 border-t border-stone-200/60 flex items-center justify-end gap-1 text-[10px] font-bold text-[#7065F0]">
                            <span>✏️ Adjust Budget</span>
                          </div>
                        </div>
                      </div>

                      {/* Workspace Navigation Tabs & PDF Export Button */}
                      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-100 pt-4">
                        <div className="flex items-center gap-2 overflow-x-auto">
                          <button
                            onClick={() => setActiveTripTab('itinerary')}
                            className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer shrink-0 ${
                              activeTripTab === 'itinerary'
                                ? 'bg-stone-950 text-white shadow-xs'
                                : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                            }`}
                          >
                            Itinerary ({generatedTrip.duration_days} Days)
                          </button>
                          <button
                            onClick={() => setActiveTripTab('map')}
                            className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                              activeTripTab === 'map'
                                ? 'bg-stone-950 text-white shadow-xs'
                                : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                            }`}
                          >
                            <Compass className="w-3.5 h-3.5 text-[#7065F0]" />
                            <span>Live Map & Route</span>
                          </button>
                          <button
                            onClick={() => setActiveTripTab('options')}
                            className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer shrink-0 ${
                              activeTripTab === 'options'
                                ? 'bg-stone-950 text-white shadow-xs'
                                : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                            }`}
                          >
                            Transport & Stays
                          </button>
                          <button
                            onClick={() => setActiveTripTab('possibilities')}
                            className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                              activeTripTab === 'possibilities'
                                ? 'bg-[#7065F0] text-white shadow-xs'
                                : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                            }`}
                          >
                            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                            <span>Possible Options ({possibleOptions.length})</span>
                          </button>
                          <button
                            onClick={() => setActiveTripTab('packing')}
                            className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer shrink-0 ${
                              activeTripTab === 'packing'
                                ? 'bg-stone-950 text-white shadow-xs'
                                : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                            }`}
                          >
                            Packing & Essentials
                          </button>
                        </div>

                        {/* Export PDF Button */}
                        <button
                          onClick={handleExportPDF}
                          className="px-3.5 py-2 rounded-full text-xs font-bold bg-[#7065F0] hover:bg-[#584cdb] text-white flex items-center gap-1.5 shadow-sm transition-all cursor-pointer shrink-0 active:scale-95"
                          title="Download complete trip itinerary as PDF"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download PDF</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* TAB: LIVE MAP & ROUTE */}
              {activeTripTab === 'map' && (
                <div className="space-y-6">
                  {/* Full Interactive Map */}
                  <TripInteractiveMap
                    trip={generatedTrip}
                    selectedDay={selectedDayForMap}
                    onSelectDay={setSelectedDayForMap}
                  />

                  {/* Route & Geographic Stops Quick Summary */}
                  <div className="p-6 rounded-3xl bg-white border border-stone-200/90 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="p-2 rounded-xl bg-purple-100 text-[#7065F0]">
                          <Compass className="w-5 h-5" />
                        </span>
                        <div>
                          <h3 className="text-base font-bold text-stone-950">
                            Geographic Waypoints & Circuits
                          </h3>
                          <p className="text-xs text-stone-500">
                            {selectedDayForMap ? `Showing Day ${selectedDayForMap} highlights & route` : 'Showing full route from origin across all trip days'}
                          </p>
                        </div>
                      </div>

                      {selectedDayForMap !== null && (
                        <button
                          onClick={() => setSelectedDayForMap(null)}
                          className="px-3 py-1 rounded-full text-xs font-bold bg-stone-100 hover:bg-stone-200 text-stone-800 cursor-pointer"
                        >
                          Show All Days
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                      {/* Origin & Hub Stop */}
                      <div className="p-3.5 rounded-2xl bg-blue-50/60 border border-blue-100 space-y-1">
                        <div className="flex items-center gap-2 text-xs font-bold text-blue-900">
                          <Plane className="w-4 h-4 text-blue-600" />
                          <span>Origin Departure & Ingress</span>
                        </div>
                        <p className="text-xs text-stone-700 font-medium">
                          {generatedTrip.origin || 'Mumbai'} → {generatedTrip.selected_transport?.transit_hub || 'Transit Hub'}
                        </p>
                        <span className="text-[11px] text-blue-700 block">
                          {generatedTrip.selected_transport?.title} ({generatedTrip.selected_transport?.duration_str})
                        </span>
                      </div>

                      {/* Hotel / Stay Hub */}
                      {generatedTrip.selected_accommodation && (
                        <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-100 space-y-1">
                          <div className="flex items-center gap-2 text-xs font-bold text-emerald-900">
                            <Bed className="w-4 h-4 text-emerald-600" />
                            <span>Stay Basecamp</span>
                          </div>
                          <p className="text-xs text-stone-700 font-medium">
                            {generatedTrip.selected_accommodation.name}
                          </p>
                          <span className="text-[11px] text-emerald-700 block">
                            {generatedTrip.selected_accommodation.location} ({generatedTrip.selected_accommodation.nights} Nights)
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Filtered Day Activities */}
                    <div className="space-y-2 pt-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500">
                        {selectedDayForMap ? `Day ${selectedDayForMap} Stops` : 'All Itinerary Sightseeing Stops'}
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {generatedTrip.itinerary
                          .filter((it) => selectedDayForMap === null || it.day_number === selectedDayForMap)
                          .map((item, idx) => (
                            <div
                              key={item.id || idx}
                              className="p-3 rounded-xl bg-stone-50 border border-stone-200/80 flex items-start gap-2.5 hover:border-purple-300 transition-colors"
                            >
                              <span className="w-6 h-6 rounded-full bg-stone-900 text-white font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                                D{item.day_number}
                              </span>
                              <div className="min-w-0">
                                <h5 className="text-xs font-bold text-stone-950 truncate">
                                  {item.title}
                                </h5>
                                <p className="text-[11px] text-stone-500 truncate">
                                  {item.start_time} - {item.end_time} • {item.item_type}
                                </p>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: ITINERARY */}
              {activeTripTab === 'itinerary' && (
                <div className="space-y-6">
                  {/* Embedded Itinerary Interactive Map */}
                  <TripInteractiveMap
                    trip={generatedTrip}
                    selectedDay={selectedDayForMap}
                    onSelectDay={setSelectedDayForMap}
                  />

                  {/* Horizontal Day Tab Carousel with Auto-Centering + Add Day Leg Action */}
                  <div className="p-3 bg-white rounded-2xl border border-stone-200/90 shadow-2xs flex items-center justify-between gap-2 overflow-x-auto scroll-smooth no-scrollbar">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedDayForMap(null)}
                        className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer shrink-0 ${
                          selectedDayForMap === null
                            ? 'bg-stone-950 text-white shadow-xs'
                            : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                        }`}
                      >
                        All {generatedTrip.duration_days} Days View
                      </button>
                      {Array.from({ length: generatedTrip.duration_days }, (_, i) => i + 1).map((dayNum) => {
                        const dayHotel = generatedTrip.daily_accommodations?.find((d) => d.day_number === dayNum)?.hotel || generatedTrip.selected_accommodation;
                        const isSplitStay = dayHotel && generatedTrip.selected_accommodation && dayHotel.name !== generatedTrip.selected_accommodation.name;
                        return (
                          <button
                            key={dayNum}
                            onClick={(e) => {
                              setSelectedDayForMap(dayNum);
                              e.currentTarget.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                            }}
                            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                              selectedDayForMap === dayNum
                                ? 'bg-[#7065F0] text-white shadow-xs'
                                : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                            }`}
                          >
                            <span>Day {dayNum}</span>
                            {isSplitStay && (
                              <span className="w-2 h-2 rounded-full bg-amber-400" title="Split Stay Basecamp" />
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Add Day Leg button */}
                    <button
                      onClick={handleAddDayLeg}
                      className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition-all cursor-pointer shrink-0 flex items-center gap-1 shadow-2xs"
                      title="Add an extra day to your itinerary"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Add Day Leg</span>
                    </button>
                  </div>

                  {Array.from({ length: generatedTrip.duration_days }, (_, i) => i + 1)
                    .filter((dayNum) => selectedDayForMap === null || selectedDayForMap === dayNum)
                    .map((dayNum) => {
                    const dayItems = generatedTrip.itinerary.filter((item) => item.day_number === dayNum);
                    const dayHotel = generatedTrip.daily_accommodations?.find((d) => d.day_number === dayNum)?.hotel || generatedTrip.selected_accommodation;
                    const isSplitStay = dayHotel && generatedTrip.selected_accommodation && dayHotel.name !== generatedTrip.selected_accommodation.name;

                    return (
                      <div key={dayNum} className="p-6 rounded-3xl bg-white border border-stone-200/90 shadow-sm space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-stone-100 pb-3 gap-2">
                          <div className="flex items-center gap-2.5">
                            <span className="w-8 h-8 rounded-full bg-stone-950 text-white font-bold text-xs flex items-center justify-center">
                              D{dayNum}
                            </span>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="text-base font-bold text-stone-950">
                                  Day {dayNum} Schedule
                                </h3>
                                {isSplitStay && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-100 text-purple-900 border border-purple-200 flex items-center gap-1">
                                    <Bed className="w-3 h-3 text-purple-700" />
                                    <span>Split Stay Basecamp: {dayHotel?.name}</span>
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] text-stone-500 font-medium">
                                {dayNum === 1 ? 'Arrival & Transit Hub Transfer' : dayNum === generatedTrip.duration_days ? 'Artisan Souvenirs & Homeward Transit' : 'Curated Sightseeing & Activities'}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {generatedTrip.duration_days > 1 && (
                              <button
                                onClick={() => handleRemoveDayLeg(dayNum)}
                                className="px-2.5 py-1.5 rounded-full bg-stone-100 hover:bg-rose-50 hover:text-rose-700 text-stone-600 text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer"
                                title={`Remove Day ${dayNum}`}
                              >
                                <Trash2 className="w-3 h-3" />
                                <span className="hidden sm:inline">Remove Day</span>
                              </button>
                            )}
                            <button
                              onClick={() => setAddActivityModal({ isOpen: true, dayNumber: dayNum })}
                              className="px-3 py-1.5 rounded-full bg-purple-50 hover:bg-purple-100 text-purple-900 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer border border-purple-200"
                            >
                              <span>+ Add Activity</span>
                            </button>
                          </div>
                        </div>

                        <div className="space-y-3">
                          {dayItems.map((item) => {
                            const actPhoto = item.image_url || getActivityPhoto(item.title, generatedTrip.destination?.name || '');
                            const isDisabled = Boolean(item.is_disabled);

                            return (
                              <div 
                                key={item.id} 
                                className={`p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row items-start gap-3.5 ${
                                  isDisabled 
                                    ? 'bg-stone-100/70 border-dashed border-stone-300 opacity-65' 
                                    : 'bg-stone-50 border-stone-200/80 hover:border-stone-300'
                                }`}
                              >
                                {/* Activity Real-World Photo Thumbnail with Toggle */}
                                <div className="w-full sm:w-32 h-24 rounded-xl overflow-hidden shrink-0 group relative bg-stone-200 cursor-pointer"
                                  onClick={() => setPhotoModal({
                                    url: actPhoto,
                                    title: item.title,
                                    subtitle: `Day ${dayNum} • ${item.start_time} - ${item.end_time}`
                                  })}
                                >
                                  <SmartImage
                                    src={actPhoto}
                                    alt={item.title}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                    containerClassName="w-full h-full"
                                  />
                                  <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-black/60 backdrop-blur-xs text-[9px] font-bold text-white flex items-center gap-1">
                                    <Camera className="w-2.5 h-2.5 text-amber-300" />
                                    <span>Photo</span>
                                  </div>
                                </div>

                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between gap-2 flex-wrap">
                                    <div className="flex items-center gap-2">
                                      {/* Checkbox Select / Deselect */}
                                      <button
                                        onClick={() => handleToggleActivity(item.id, item.title)}
                                        className="p-1 rounded-md hover:bg-stone-200 text-stone-700 transition-colors cursor-pointer"
                                        title={isDisabled ? 'Re-enable in itinerary & budget' : 'Deselect / Exclude from budget'}
                                      >
                                        {isDisabled ? (
                                          <Square className="w-4 h-4 text-stone-400" />
                                        ) : (
                                          <CheckSquare className="w-4 h-4 text-emerald-600" />
                                        )}
                                      </button>

                                      <span className="p-1 rounded-lg bg-white text-[#7065F0] shrink-0 border border-stone-200 shadow-2xs">
                                        {item.item_type === 'transport' ? <Car className="w-3.5 h-3.5" /> : item.item_type === 'hotel' ? <Bed className="w-3.5 h-3.5" /> : <Mountain className="w-3.5 h-3.5" />}
                                      </span>

                                      <h4 className={`text-sm font-bold ${isDisabled ? 'line-through text-stone-500' : 'text-stone-950'}`}>
                                        {item.title}
                                      </h4>

                                      {isDisabled && (
                                        <span className="text-[10px] font-bold text-stone-500 bg-stone-200 px-2 py-0.5 rounded-full">
                                          Excluded from Budget (₹0)
                                        </span>
                                      )}
                                    </div>

                                    <span className="text-xs font-semibold text-stone-500 bg-white px-2.5 py-0.5 rounded-full border border-stone-200">
                                      {item.start_time} - {item.end_time}
                                    </span>
                                  </div>

                                  {/* Walking Intensity & Rest Buffers */}
                                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                    {item.walking_intensity && (
                                      <span className="text-[10px] font-semibold text-stone-600 bg-white px-2 py-0.5 rounded-md border border-stone-200/60">
                                        Pace: {item.walking_intensity}
                                      </span>
                                    )}
                                    {item.rest_buffer_minutes && (
                                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">
                                        +{item.rest_buffer_minutes}m downtime buffer
                                      </span>
                                    )}
                                  </div>

                                  {item.description && (
                                    <p className="text-xs text-stone-600 mt-1.5 leading-relaxed">
                                      {item.description}
                                    </p>
                                  )}

                                  {/* Activity action buttons */}
                                  <div className="pt-2 flex items-center justify-between border-t border-stone-200/60 mt-2 flex-wrap gap-2">
                                    <span className="text-[11px] font-bold text-stone-700">
                                      {isDisabled ? (
                                        <span className="text-stone-400 line-through">₹{item.cost?.toLocaleString()}</span>
                                      ) : item.cost ? (
                                        `₹${item.cost.toLocaleString()}`
                                      ) : (
                                        'Included in Plan'
                                      )}
                                    </span>

                                    <div className="flex items-center gap-1.5">
                                      <button
                                        onClick={() => handleToggleActivity(item.id, item.title)}
                                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold transition-colors cursor-pointer border ${
                                          isDisabled 
                                            ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200' 
                                            : 'bg-stone-100 hover:bg-stone-200 text-stone-700 border-stone-200'
                                        }`}
                                      >
                                        {isDisabled ? 'Include' : 'Exclude'}
                                      </button>
                                      <button
                                        onClick={() => setEditActivityModal({ isOpen: true, item })}
                                        className="px-2.5 py-0.5 rounded-full bg-white hover:bg-stone-100 text-stone-700 text-[10px] font-bold transition-colors cursor-pointer border border-stone-200"
                                      >
                                        Edit
                                      </button>
                                      <button
                                        onClick={() => setSwapActivityModal({ isOpen: true, item })}
                                        className="px-2.5 py-0.5 rounded-full bg-amber-50 hover:bg-amber-100 text-amber-900 text-[10px] font-bold transition-colors cursor-pointer border border-amber-200"
                                      >
                                        Swap
                                      </button>
                                      <button
                                        onClick={() => handleDeleteActivity(item.id, item.title, dayNum)}
                                        className="px-2.5 py-0.5 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-700 text-[10px] font-bold transition-colors cursor-pointer border border-rose-200"
                                      >
                                        Delete
                                      </button>
                                    </div>
                                  </div>

                                  {item.item_type === 'hotel' && (
                                    <div className="pt-2 flex items-center justify-between border-t border-stone-200/60 mt-2">
                                      <span className="text-[11px] text-purple-700 font-semibold flex items-center gap-1">
                                        <Bed className="w-3.5 h-3.5" /> Night {dayNum} Accommodation
                                      </span>
                                      <button
                                        onClick={() => {
                                          setSelectedDayForHotelChange(dayNum);
                                          setShowHotelModal(true);
                                        }}
                                        className="px-3 py-1 rounded-full bg-purple-100 hover:bg-purple-200 text-purple-900 text-[11px] font-bold transition-colors cursor-pointer"
                                      >
                                        Change Day {dayNum} Hotel
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}

                  {/* Embedded Possible Options Tray in Itinerary Tab */}
                  <PossibleOptionsTray
                    trip={generatedTrip}
                    options={possibleOptions}
                    isLoading={isLoadingOptions}
                    onAddActivity={handleAddFromTray}
                    onSwapWithOption={(opt) => {
                      const firstItem = generatedTrip.itinerary?.[0];
                      if (firstItem) {
                        setSwapActivityModal({ isOpen: true, item: firstItem });
                      }
                    }}
                  />
                </div>
              )}

              {/* TAB: DEDICATED POSSIBLE OPTIONS TRAY */}
              {activeTripTab === 'possibilities' && (
                <div className="space-y-6">
                  <PossibleOptionsTray
                    trip={generatedTrip}
                    options={possibleOptions}
                    isLoading={isLoadingOptions}
                    onAddActivity={handleAddFromTray}
                    onSwapWithOption={(opt) => {
                      const firstItem = generatedTrip.itinerary?.[0];
                      if (firstItem) {
                        setSwapActivityModal({ isOpen: true, item: firstItem });
                      }
                    }}
                  />
                </div>
              )}

              {/* TAB 3: TRANSPORT & STAYS COMPARISON */}
              {activeTripTab === 'options' && (
                <div className="space-y-8">
                  {/* Transport Alternatives Grid */}
                  <div className="p-6 rounded-3xl bg-white border border-stone-200/90 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-bold text-stone-950 flex items-center gap-2">
                        <Plane className="w-4 h-4 text-blue-600" />
                        <span>All Verified Transport Options ({generatedTrip.origin || 'Mumbai'} → {generatedTrip.destination?.name})</span>
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[generatedTrip.selected_transport, ...(generatedTrip.transport_alternatives || [])].filter(Boolean).map((opt) => {
                        const isCurrent = opt.id === generatedTrip.selected_transport?.id;
                        return (
                          <div 
                            key={opt.id}
                            className={`p-5 rounded-2xl border transition-all space-y-3 flex flex-col justify-between ${
                              isCurrent ? 'bg-blue-50/50 border-blue-500 shadow-xs ring-2 ring-blue-500/20' : 'bg-white border-stone-200 hover:border-stone-300'
                            }`}
                          >
                            <div className="space-y-3">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                                      opt.badge === 'recommended' ? 'bg-blue-100 text-blue-900' : opt.badge === 'cheapest' ? 'bg-emerald-100 text-emerald-900' : 'bg-purple-100 text-purple-900'
                                    }`}>
                                      {opt.badge}
                                    </span>
                                    {opt.distance_km && (
                                      <span className="text-[10px] text-stone-500 font-semibold">
                                        {opt.distance_km} km Geodesic
                                      </span>
                                    )}
                                  </div>
                                  <h4 className="text-sm font-bold text-stone-950 mt-1">
                                    {opt.operator}
                                  </h4>
                                  <span className="text-xs text-stone-500 block">
                                    {opt.departure_time} - {opt.arrival_time} • {opt.duration_str}
                                  </span>
                                </div>

                                <div className="text-right">
                                  <span className="text-base font-black text-stone-950 font-display">
                                    ₹{opt.total_price.toLocaleString()}
                                  </span>
                                  <span className="text-[10px] text-stone-500 block">₹{opt.price_per_person.toLocaleString()}/person</span>
                                </div>
                              </div>

                              <p className="text-xs text-stone-600 leading-relaxed">
                                {opt.rationale}
                              </p>

                              {/* Dependent transfer summary */}
                              {opt.dependent_transfer && (
                                <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-200/80 text-[11px] text-stone-700 flex items-center gap-2">
                                  <Car className="w-3.5 h-3.5 text-[#7065F0] shrink-0" />
                                  <span className="truncate">{opt.dependent_transfer.title} (₹{opt.dependent_transfer.cost})</span>
                                </div>
                              )}

                              {/* Aggregator links */}
                              {opt.aggregator_links && opt.aggregator_links.length > 0 && (
                                <div className="space-y-1">
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">Live Aggregators & Direct Portals</span>
                                  <div className="flex flex-wrap gap-1">
                                    {opt.aggregator_links.slice(0, 3).map((link, lIdx) => (
                                      <a
                                        key={lIdx}
                                        href={link.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 flex items-center gap-1 border border-stone-200"
                                      >
                                        <span>{link.title.replace(' Live Search', '').replace(' Official Portal', '')}</span>
                                        <ExternalLink className="w-2.5 h-2.5 text-stone-500" />
                                      </a>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>

                            <div className="flex items-center justify-between pt-3 border-t border-stone-100 flex-wrap gap-2">
                              <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                                <ShieldCheck className="w-3.5 h-3.5" />
                                {opt.verification_status === 'verified' ? 'Live Verified' : 'Sample Option'}
                              </span>

                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => setBookingModal({ isOpen: true, type: 'transport', item: opt })}
                                  className="px-3 py-1 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
                                >
                                  <ShieldCheck className="w-3.5 h-3.5" />
                                  <span>Book</span>
                                </button>

                                {isCurrent ? (
                                  <span className="px-3 py-1 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center gap-1">
                                    <Check className="w-3.5 h-3.5" /> Selected
                                  </span>
                                ) : (
                                  <button
                                    onClick={() => handleSelectTransportOption(opt.id)}
                                    disabled={changingEntityLoading}
                                    className="px-3 py-1 rounded-full bg-stone-900 hover:bg-black text-white text-xs font-bold transition-all cursor-pointer"
                                  >
                                    Select This
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Accommodation Alternatives Grid */}
                  <div className="p-6 rounded-3xl bg-white border border-stone-200/90 shadow-sm space-y-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <h3 className="text-base font-bold text-stone-950 flex items-center gap-2">
                        <Bed className="w-4 h-4 text-purple-600" />
                        <span>All Verified Stays & Resorts in {generatedTrip.destination?.name}</span>
                      </h3>
                      <span className="text-xs text-stone-500 font-medium">
                        Change stay for entire trip or customize individual nights
                      </span>
                    </div>

                    {/* Day-by-Day Stay Breakdown Card */}
                    <div className="p-4 rounded-2xl bg-purple-50/50 border border-purple-100 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-purple-950 uppercase tracking-wider flex items-center gap-1.5">
                          <Bed className="w-3.5 h-3.5 text-purple-700" /> Day-by-Day Nightly Stay Plan
                        </span>
                        <button
                          onClick={() => {
                            setSelectedDayForHotelChange(null);
                            setShowHotelModal(true);
                          }}
                          className="text-xs font-bold text-purple-700 hover:text-purple-950 underline cursor-pointer"
                        >
                          Change All Nights
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                        {Array.from({ length: generatedTrip.duration_days }, (_, i) => i + 1).map((dayNum) => {
                          const dayAlloc = generatedTrip.daily_accommodations?.find((d) => d.day_number === dayNum)?.hotel || generatedTrip.selected_accommodation;
                          return (
                            <div key={dayNum} className="p-3 rounded-xl bg-white border border-purple-200/70 shadow-2xs flex items-center justify-between gap-2">
                              <div className="min-w-0">
                                <span className="text-[10px] font-extrabold text-purple-800 uppercase block">
                                  Night {dayNum} (Day {dayNum})
                                </span>
                                <h5 className="text-xs font-bold text-stone-900 truncate">
                                  {dayAlloc?.name || 'Assigned Hotel'}
                                </h5>
                                <span className="text-[10px] text-stone-500 block">
                                  ₹{dayAlloc?.price_per_night?.toLocaleString()}/nt • {dayAlloc?.category || 'boutique'}
                                </span>
                              </div>
                              <button
                                onClick={() => {
                                  setSelectedDayForHotelChange(dayNum);
                                  setShowHotelModal(true);
                                }}
                                className="px-2.5 py-1 rounded-full bg-purple-100 hover:bg-purple-200 text-purple-900 text-[10px] font-bold shrink-0 cursor-pointer transition-colors"
                              >
                                Switch
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[generatedTrip.selected_accommodation, ...(generatedTrip.accommodation_alternatives || [])].filter(Boolean).map((acc) => {
                        const isCurrent = acc.id === generatedTrip.selected_accommodation?.id;
                        const stayImg = acc.hero_image || acc.images?.[0] || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80';
                        return (
                          <div 
                            key={acc.id}
                            className={`p-4 rounded-2xl border transition-all space-y-3 flex flex-col justify-between ${
                              isCurrent ? 'bg-purple-50/50 border-purple-500 shadow-xs ring-2 ring-purple-500/20' : 'bg-white border-stone-200 hover:border-stone-300'
                            }`}
                          >
                            <div className="space-y-3">
                              {/* Real-world stay photo banner */}
                              <div 
                                className="w-full h-36 rounded-xl overflow-hidden relative group cursor-pointer"
                                onClick={() => setPhotoModal({
                                  url: stayImg,
                                  title: acc.name,
                                  subtitle: `${acc.room_type} • ${acc.location}`
                                })}
                              >
                                <SmartImage
                                  src={stayImg}
                                  alt={acc.name}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                  containerClassName="w-full h-full"
                                />
                                <div className="absolute top-2 left-2 flex items-center gap-1.5">
                                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider shadow-xs ${
                                    acc.badge === 'cheapest' ? 'bg-emerald-100 text-emerald-900' : acc.badge === 'luxury' ? 'bg-amber-100 text-amber-900' : 'bg-purple-100 text-purple-900'
                                  }`}>
                                    {acc.badge.replace('_', ' ')}
                                  </span>
                                </div>
                                <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-xs text-[10px] font-bold text-white flex items-center gap-1">
                                  <Camera className="w-3 h-3 text-amber-300" />
                                  <span>View</span>
                                </div>
                              </div>

                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <h4 className="text-sm font-bold text-stone-950">
                                    {acc.name}
                                  </h4>
                                  <span className="text-xs text-stone-500 block">
                                    {acc.room_type} • ⭐ {acc.rating}
                                  </span>
                                </div>

                                <div className="text-right">
                                  <span className="text-base font-black text-stone-950 font-display">
                                    ₹{acc.total_price.toLocaleString()}
                                  </span>
                                  <span className="text-[10px] text-stone-500 block">
                                    ₹{acc.price_per_night.toLocaleString()}/nt
                                  </span>
                                </div>
                              </div>

                              <p className="text-xs text-stone-600 leading-relaxed">
                                {acc.why_it_matches}
                              </p>
                            </div>

                            <div className="flex items-center justify-between pt-2 border-t border-stone-100 mt-2 flex-wrap gap-2">
                              <span className="text-[11px] text-stone-500 font-semibold">
                                {acc.nights} nights for {generatedTrip.traveler_count} guests
                              </span>

                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => setBookingModal({ isOpen: true, type: 'hotel', item: acc })}
                                  className="px-3 py-1 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
                                >
                                  <ShieldCheck className="w-3.5 h-3.5" />
                                  <span>Book</span>
                                </button>

                                {isCurrent ? (
                                  <span className="px-3 py-1 rounded-full bg-purple-600 text-white text-xs font-bold flex items-center gap-1">
                                    <Check className="w-3.5 h-3.5" /> Selected
                                  </span>
                                ) : (
                                  <button
                                    onClick={() => handleSelectHotelOption(acc.id)}
                                    disabled={changingEntityLoading}
                                    className="px-3 py-1 rounded-full bg-stone-900 hover:bg-black text-white text-xs font-bold transition-all cursor-pointer"
                                  >
                                    Select Stay
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: PACKING & ESSENTIALS */}
              {activeTripTab === 'packing' && (
                <div className="p-6 rounded-3xl bg-white border border-stone-200/90 shadow-sm space-y-4">
                  <h3 className="text-base font-bold text-stone-950 flex items-center gap-2">
                    <Luggage className="w-4 h-4 text-[#7065F0]" />
                    <span>Packing Checklist for {generatedTrip.destination?.name}</span>
                  </h3>

                  <div className="space-y-2">
                    {packingItems.map((item) => (
                      <div 
                        key={item.id} 
                        onClick={() => setPackingItems((prev) => prev.map((p) => p.id === item.id ? { ...p, checked: !p.checked } : p))}
                        className="p-3 rounded-2xl bg-stone-50 border border-stone-200 flex items-center gap-3 cursor-pointer hover:bg-stone-100 transition-colors"
                      >
                        <div className={`w-5 h-5 rounded-md flex items-center justify-center ${
                          item.checked ? 'bg-stone-950 text-white' : 'border border-stone-400 bg-white'
                        }`}>
                          {item.checked && <Check className="w-3.5 h-3.5" />}
                        </div>
                        <span className={`text-xs sm:text-sm ${item.checked ? 'line-through text-stone-400 font-medium' : 'text-stone-900 font-semibold'}`}>
                          {item.text}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}

        </div>

      </div>

      {/* MODAL: DATE PICKER */}
      {showDateModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-stone-950 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#7065F0]" />
                <span>Select Travel Dates</span>
              </h3>
              <button 
                onClick={() => setShowDateModal(false)}
                className="p-1 rounded-full text-stone-400 hover:text-stone-900 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">Start Date</label>
                <input
                  type="date"
                  value={pickerStartDate}
                  onChange={(e) => setPickerStartDate(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-300 text-sm font-semibold text-stone-900 focus:outline-hidden focus:border-[#7065F0]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">End Date</label>
                <input
                  type="date"
                  value={pickerEndDate}
                  onChange={(e) => setPickerEndDate(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-300 text-sm font-semibold text-stone-900 focus:outline-hidden focus:border-[#7065F0]"
                />
              </div>

              {/* Quick Presets */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-stone-500 block">Quick Presets</span>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => { setPickerStartDate('2026-09-21'); setPickerEndDate('2026-09-26'); }}
                    className="px-3 py-1.5 rounded-full bg-stone-100 hover:bg-stone-200 text-xs font-semibold text-stone-800 cursor-pointer"
                  >
                    Sep 21 – Sep 26 (6 Days)
                  </button>
                  <button
                    onClick={() => { setPickerStartDate('2026-10-10'); setPickerEndDate('2026-10-15'); }}
                    className="px-3 py-1.5 rounded-full bg-stone-100 hover:bg-stone-200 text-xs font-semibold text-stone-800 cursor-pointer"
                  >
                    Oct 10 – Oct 15 (6 Days)
                  </button>
                  <button
                    onClick={() => { setPickerStartDate('2026-11-05'); setPickerEndDate('2026-11-10'); }}
                    className="px-3 py-1.5 rounded-full bg-stone-100 hover:bg-stone-200 text-xs font-semibold text-stone-800 cursor-pointer"
                  >
                    Nov 5 – Nov 10 (6 Days)
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setShowDateModal(false)}
                className="flex-1 py-2.5 rounded-full border border-stone-300 text-xs font-bold text-stone-700 hover:bg-stone-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleApplyDates(pickerStartDate, pickerEndDate)}
                className="flex-1 py-2.5 rounded-full bg-stone-950 hover:bg-black text-white text-xs font-bold cursor-pointer"
              >
                Apply Dates
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CHANGE TRANSPORT */}
      {showTransportModal && generatedTrip && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-2xl w-full shadow-2xl space-y-5 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-stone-950 flex items-center gap-2">
                <Plane className="w-5 h-5 text-blue-600" />
                <span>Select Transport Option</span>
              </h3>
              <button 
                onClick={() => setShowTransportModal(false)}
                className="p-1 rounded-full text-stone-400 hover:text-stone-900 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              {[generatedTrip.selected_transport, ...(generatedTrip.transport_alternatives || [])].filter(Boolean).map((opt) => {
                const isCurrent = opt.id === generatedTrip.selected_transport?.id;
                return (
                  <div 
                    key={opt.id}
                    className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isCurrent ? 'bg-blue-50/70 border-blue-500 ring-2 ring-blue-500/20' : 'bg-stone-50 border-stone-200 hover:border-stone-300'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-stone-200 text-stone-800">
                          {opt.badge}
                        </span>
                        <strong className="text-sm font-bold text-stone-950">{opt.operator}</strong>
                        {opt.distance_km && (
                          <span className="text-[10px] text-stone-500 font-semibold">
                            ({opt.distance_km} km Geodesic)
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-stone-600 mt-1">
                        {opt.departure_time} - {opt.arrival_time} ({opt.duration_str})
                      </p>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        <span className="text-[11px] text-emerald-700 font-semibold">
                          ✓ {opt.verification_label}
                        </span>
                        {opt.aggregator_links?.[0] && (
                          <a
                            href={opt.aggregator_links[0].url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] text-[#7065F0] hover:underline font-bold flex items-center gap-0.5"
                          >
                            <span>{opt.aggregator_links[0].title}</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                      <div className="text-right">
                        <div className="text-base font-black text-stone-950 font-display">
                          ₹{opt.total_price.toLocaleString()}
                        </div>
                        <span className="text-[10px] text-stone-500">₹{opt.price_per_person.toLocaleString()}/person</span>
                      </div>

                      {isCurrent ? (
                        <span className="px-4 py-2 rounded-full bg-blue-600 text-white text-xs font-bold">
                          Selected
                        </span>
                      ) : (
                        <button
                          onClick={() => handleSelectTransportOption(opt.id)}
                          disabled={changingEntityLoading}
                          className="px-4 py-2 rounded-full bg-stone-950 hover:bg-black text-white text-xs font-bold cursor-pointer"
                        >
                          Select
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CHANGE HOTEL */}
      {showHotelModal && generatedTrip && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-2xl w-full shadow-2xl space-y-5 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-stone-950 flex items-center gap-2">
                  <Bed className="w-5 h-5 text-purple-600" />
                  <span>Select Accommodation</span>
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  {selectedDayForHotelChange !== null
                    ? `Choosing stay specifically for Night ${selectedDayForHotelChange} (Day ${selectedDayForHotelChange})`
                    : `Applying stay across all ${generatedTrip.duration_days} nights of the trip`}
                </p>
              </div>
              <button 
                onClick={() => setShowHotelModal(false)}
                className="p-1 rounded-full text-stone-400 hover:text-stone-900 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Night Selector Filter Pills */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-stone-500 block">
                Apply Change To:
              </span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => setSelectedDayForHotelChange(null)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                    selectedDayForHotelChange === null
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                  }`}
                >
                  All Nights ({generatedTrip.duration_days} Nts)
                </button>
                {Array.from({ length: generatedTrip.duration_days }, (_, i) => i + 1).map((dayNum) => (
                  <button
                    key={dayNum}
                    onClick={() => setSelectedDayForHotelChange(dayNum)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                      selectedDayForHotelChange === dayNum
                        ? 'bg-purple-600 text-white shadow-xs'
                        : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                    }`}
                  >
                    Night {dayNum}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              {[generatedTrip.selected_accommodation, ...(generatedTrip.accommodation_alternatives || [])].filter(Boolean).map((acc) => {
                const currentDayHotelId = selectedDayForHotelChange !== null
                  ? (generatedTrip.daily_accommodations?.find((d) => d.day_number === selectedDayForHotelChange)?.hotel?.id || generatedTrip.selected_accommodation?.id)
                  : generatedTrip.selected_accommodation?.id;
                const isCurrent = acc.id === currentDayHotelId;
                const hotelImg = acc.hero_image || acc.images?.[0] || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80';
                return (
                  <div 
                    key={acc.id}
                    className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                      isCurrent ? 'bg-purple-50/70 border-purple-500 ring-2 ring-purple-500/20' : 'bg-stone-50 border-stone-200 hover:border-stone-300'
                    }`}
                  >
                    <div className="flex items-start gap-3.5 min-w-0">
                      <div className="w-20 h-16 rounded-xl overflow-hidden shrink-0 bg-stone-200">
                        <SmartImage
                          src={hotelImg}
                          alt={acc.name}
                          className="w-full h-full object-cover"
                          containerClassName="w-full h-full"
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-stone-200 text-stone-800">
                            {acc.badge.replace('_', ' ')}
                          </span>
                          <strong className="text-sm font-bold text-stone-950 truncate">{acc.name}</strong>
                        </div>
                        <p className="text-xs text-stone-600 mt-1">
                          {acc.room_type} • ⭐ {acc.rating} ({acc.review_count})
                        </p>
                        <p className="text-[11px] text-stone-500 italic mt-0.5 line-clamp-1">
                          "{acc.why_it_matches}"
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-stone-200">
                      <div className="text-right">
                        <div className="text-base font-black text-stone-950 font-display">
                          {selectedDayForHotelChange !== null ? `₹${acc.price_per_night.toLocaleString()}` : `₹${acc.total_price.toLocaleString()}`}
                        </div>
                        <span className="text-[10px] text-stone-500">
                          {selectedDayForHotelChange !== null ? 'for this night' : `₹${acc.price_per_night.toLocaleString()}/night`}
                        </span>
                      </div>

                      {isCurrent ? (
                        <span className="px-4 py-2 rounded-full bg-purple-600 text-white text-xs font-bold shrink-0">
                          Selected
                        </span>
                      ) : (
                        <button
                          onClick={() => handleSelectHotelOption(acc.id)}
                          disabled={changingEntityLoading}
                          className="px-4 py-2 rounded-full bg-stone-950 hover:bg-black text-white text-xs font-bold cursor-pointer shrink-0"
                        >
                          {selectedDayForHotelChange !== null ? `Assign Night ${selectedDayForHotelChange}` : 'Select for All Nights'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: PHOTO LIGHTBOX */}
      {photoModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-stone-900 rounded-3xl overflow-hidden max-w-3xl w-full shadow-2xl border border-white/10 space-y-0">
            <div className="relative w-full max-h-[70vh] bg-black flex items-center justify-center overflow-hidden">
              <img
                src={photoModal.url}
                alt={photoModal.title}
                className="w-full h-full max-h-[70vh] object-contain"
                referrerPolicy="no-referrer"
              />
              <button
                onClick={() => setPhotoModal(null)}
                className="absolute top-4 right-4 p-2 rounded-full bg-black/60 hover:bg-black/90 text-white backdrop-blur-xs transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-5 bg-stone-950 flex items-center justify-between gap-4">
              <div>
                <h4 className="text-base font-bold text-white tracking-tight">
                  {photoModal.title}
                </h4>
                {photoModal.subtitle && (
                  <p className="text-xs text-stone-400 mt-0.5">
                    {photoModal.subtitle}
                  </p>
                )}
              </div>

              <button
                onClick={() => setPhotoModal(null)}
                className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Exit Confirmation Modal */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4 text-center">
            <h3 className="text-lg font-bold text-stone-950">
              Exit Trip Workspace?
            </h3>
            <p className="text-xs text-stone-600">
              Are you sure you want to return to the home screen? You can start another trip inquiry at any time.
            </p>
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setShowExitConfirm(false)}
                className="flex-1 py-2.5 rounded-full border border-stone-300 text-xs font-bold text-stone-700 hover:bg-stone-50 cursor-pointer"
              >
                Stay
              </button>
              <button
                onClick={handleConfirmExit}
                className="flex-1 py-2.5 rounded-full bg-stone-950 hover:bg-black text-white text-xs font-bold cursor-pointer"
              >
                Exit Workspace
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: BOOKING CHOICE MODAL (AI Guide vs Self Booking) */}
      {bookingModal && bookingModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-6 border border-stone-200">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#7065F0] block">
                  Reserve & Lock Selection
                </span>
                <h3 className="text-lg sm:text-xl font-bold text-stone-950 mt-0.5">
                  Choose Booking Mode
                </h3>
              </div>
              <button
                onClick={() => setBookingModal(null)}
                className="p-1.5 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Selected item summary */}
            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200/80 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-900">
                  {bookingModal.item?.name || bookingModal.item?.title || bookingModal.item?.operator}
                </span>
                <span className="text-sm font-black text-stone-950 font-display">
                  ₹{(bookingModal.item?.total_price || bookingModal.item?.price_per_night || 0).toLocaleString()}
                </span>
              </div>
              <p className="text-[11px] text-stone-500">
                {bookingModal.type === 'transport' 
                  ? `${bookingModal.item?.departure_time} - ${bookingModal.item?.arrival_time} • ${bookingModal.item?.duration_str}`
                  : `${bookingModal.item?.room_type || 'Room'} • ${bookingModal.item?.location}`}
              </p>
            </div>

            {/* Choice Cards */}
            <div className="space-y-3">
              {/* Option A: WanderFlow AI Guide */}
              <div 
                onClick={() => handleConfirmBookingChoice('ai_guide')}
                className="p-4 rounded-2xl border-2 border-[#7065F0]/30 hover:border-[#7065F0] bg-purple-50/40 hover:bg-purple-50 transition-all cursor-pointer space-y-2 group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-xl bg-[#ECE8FF] text-[#7065F0]">
                      <Sparkles className="w-4 h-4" />
                    </span>
                    <span className="text-sm font-bold text-stone-950 group-hover:text-[#7065F0] transition-colors">
                      Let WanderFlow AI Guide Book
                    </span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-900 text-[10px] font-extrabold uppercase">
                    Recommended
                  </span>
                </div>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Instant confirmed reservation with zero platform surcharge. AI generates verified PNR & digital vouchers synced directly into your live itinerary.
                </p>
              </div>

              {/* Option B: Self Booking */}
              <div 
                onClick={() => handleConfirmBookingChoice('self_booking')}
                className="p-4 rounded-2xl border border-stone-200 hover:border-stone-400 bg-white hover:bg-stone-50 transition-all cursor-pointer space-y-2 group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-xl bg-stone-100 text-stone-700">
                      <ExternalLink className="w-4 h-4" />
                    </span>
                    <span className="text-sm font-bold text-stone-950 group-hover:text-stone-900 transition-colors">
                      Book Myself (External Partner)
                    </span>
                  </div>
                  <span className="text-[11px] text-stone-500 font-medium">
                    MakeMyTrip / IndiGo / IRCTC
                  </span>
                </div>
                <p className="text-xs text-stone-600 leading-relaxed">
                  We redirect you to the official partner portal with prefilled dates, route, and guest count. We will link the external reference to your trip.
                </p>
              </div>
            </div>

            <button
              onClick={() => setBookingModal(null)}
              className="w-full py-2.5 rounded-full text-xs font-bold text-stone-500 hover:text-stone-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD ACTIVITY MODAL WITH LOCATION SEARCH, AUTO-DESCRIPTION & TIME CLASH PROTECTION */}
      {addActivityModal && addActivityModal.isOpen && generatedTrip && (
        <AddActivityModal
          dayNumber={addActivityModal.dayNumber}
          trip={generatedTrip}
          onClose={() => setAddActivityModal(null)}
          onSubmit={(dayNum, act) => {
            handleAddActivity(dayNum, act);
          }}
        />
      )}

      {/* MODAL 3: EDIT ACTIVITY MODAL */}
      {editActivityModal && editActivityModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              handleEditActivity(editActivityModal.item.id, {
                title: String(fd.get('title') || editActivityModal.item.title),
                start_time: String(fd.get('startTime') || editActivityModal.item.start_time),
                end_time: String(fd.get('endTime') || editActivityModal.item.end_time),
                cost: Number(fd.get('cost') || editActivityModal.item.cost || 0),
                description: String(fd.get('description') || editActivityModal.item.description || ''),
              });
            }}
            className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-4 border border-stone-200"
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#7065F0] block">
                  Day {editActivityModal.item.day_number}
                </span>
                <h3 className="text-lg font-bold text-stone-950">
                  Edit Activity
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditActivityModal(null)}
                className="p-1.5 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">Title</label>
                <input
                  name="title"
                  defaultValue={editActivityModal.item.title}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-stone-50 border border-stone-200 text-sm focus:outline-hidden focus:border-[#7065F0]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">Start Time</label>
                  <input
                    name="startTime"
                    defaultValue={editActivityModal.item.start_time}
                    className="w-full px-3.5 py-2 rounded-xl bg-stone-50 border border-stone-200 text-sm focus:outline-hidden focus:border-[#7065F0]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">End Time</label>
                  <input
                    name="endTime"
                    defaultValue={editActivityModal.item.end_time}
                    className="w-full px-3.5 py-2 rounded-xl bg-stone-50 border border-stone-200 text-sm focus:outline-hidden focus:border-[#7065F0]"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">Cost (₹)</label>
                <input
                  name="cost"
                  type="number"
                  defaultValue={editActivityModal.item.cost || 0}
                  className="w-full px-3.5 py-2 rounded-xl bg-stone-50 border border-stone-200 text-sm focus:outline-hidden focus:border-[#7065F0]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">Description</label>
                <textarea
                  name="description"
                  rows={2}
                  defaultValue={editActivityModal.item.description || ''}
                  className="w-full px-3.5 py-2 rounded-xl bg-stone-50 border border-stone-200 text-sm focus:outline-hidden focus:border-[#7065F0] resize-none"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setEditActivityModal(null)}
                className="flex-1 py-2.5 rounded-full border border-stone-300 text-xs font-bold text-stone-700 hover:bg-stone-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-full bg-stone-950 hover:bg-black text-white text-xs font-bold cursor-pointer"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 4: SWAP ACTIVITY / TRANSPORT / HOTEL MODAL */}
      {swapActivityModal && swapActivityModal.isOpen && (() => {
        const item = swapActivityModal.item;
        const itemType = item.item_type;
        const itemTitleLower = (item.title || '').toLowerCase();
        const isTransport = itemType === 'transport' || 
          itemType === 'flight' || 
          itemType === 'cab' || 
          itemType === 'train' || 
          itemType === 'bus' || 
          itemTitleLower.includes('flight') || 
          itemTitleLower.includes('train') || 
          itemTitleLower.includes('departure from') || 
          itemTitleLower.includes('transit') || 
          itemTitleLower.includes('transfer') || 
          itemTitleLower.includes('cab') ||
          itemTitleLower.includes('volvo') ||
          itemTitleLower.includes('indigo');

        const isHotel = itemType === 'hotel' || 
          itemTitleLower.includes('check-in') || 
          itemTitleLower.includes('stay') || 
          itemTitleLower.includes('resort');

        let alternativesList: Array<{ title: string; desc: string; cost: number; image_url?: string }> = [];

        if (isTransport) {
          const altTransports = generatedTrip?.transport_alternatives || [];
          if (altTransports.length > 0) {
            alternativesList = altTransports.map((t) => ({
              title: `${t.operator}: ${t.title}`,
              desc: `${t.route_summary} • ${t.duration_str} (${t.departure_time} - ${t.arrival_time})`,
              cost: t.total_price,
              image_url: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=800&q=80',
            }));
          }
          if (alternativesList.length === 0) {
            const dest = generatedTrip?.destination?.name || 'Destination';
            const orig = generatedTrip?.preferences?.special_requests?.match(/Origin:\s*([^.]+)/i)?.[1]?.trim() || 'Origin';
            alternativesList = [
              {
                title: `IndiGo / Air India Direct Flight (${orig} to ${dest})`,
                desc: `Scheduled non-stop air route with standard cabin and check-in baggage allowance`,
                cost: Math.round((generatedTrip?.selected_transport?.total_price || 14000) * 1.05),
              },
              {
                title: `Vande Bharat / Superfast Express AC Rail Corridor`,
                desc: `High-speed scenic rail transit with reserved panoramic executive seating`,
                cost: Math.round((generatedTrip?.selected_transport?.total_price || 14000) * 0.45),
              },
              {
                title: `Executive Multi-Axle Volvo AC Sleeper Coach`,
                desc: `Comfortable overnight intercity transit with ergonomic reclining berths`,
                cost: Math.round((generatedTrip?.selected_transport?.total_price || 14000) * 0.3),
              },
              {
                title: `Dedicated Private Chauffeur SUV / Sedan Highway Transfer`,
                desc: `Door-to-door direct scenic highway drive with flexible sightseeing stops`,
                cost: Math.round((generatedTrip?.selected_transport?.total_price || 14000) * 0.8),
              },
            ];
          }
        } else if (isHotel) {
          const hotelAlts = generatedTrip?.accommodation_alternatives || [];
          if (hotelAlts.length > 0) {
            alternativesList = hotelAlts.map((h) => ({
              title: `${h.name} (${h.category.toUpperCase()})`,
              desc: `${h.room_type} • ${h.location} • Rating: ${h.rating}★`,
              cost: h.price_per_night,
              image_url: h.hero_image,
            }));
          }
          if (alternativesList.length === 0) {
            alternativesList = [
              { title: 'Heritage Boutique Valley Retreat', desc: 'Colonial ambiance with mountain view balcony & breakfast', cost: 6500 },
              { title: 'Luxury Panoramic Spa Resort', desc: 'Infinity pool, heated rooms, wellness therapies & fine dining', cost: 11500 },
              { title: 'Scenic Eco-Lodge & Plantation Homestay', desc: 'Organic farm-to-table meals & quiet nature trails', cost: 3800 },
            ];
          }
        } else {
          if (possibleOptions && possibleOptions.length > 0) {
            alternativesList = possibleOptions
              .filter((o) => o.title !== item.title)
              .slice(0, 8)
              .map((o) => ({
                title: o.title,
                desc: o.description,
                cost: o.cost,
                image_url: o.image_url,
              }));
          }
          if (alternativesList.length === 0) {
            const dest = generatedTrip?.destination?.name || 'Destination';
            alternativesList = [
              { title: `Heritage & Cultural Guild Tour in ${dest}`, desc: 'Guided artisan workshop walk & regional history landmarks', cost: 800 },
              { title: `Scenic Sunrise & Panoramic Ridge Excursion in ${dest}`, desc: 'Spectacular dawn vistas, photography points & fresh refreshments', cost: 1200 },
              { title: `Regional Culinary & Tasting Trail in ${dest}`, desc: 'Authentic regional dishes, tea/coffee sampling & market stroll', cost: 950 },
              { title: `Nature Sanctuary & Eco-Trail Walk in ${dest}`, desc: 'Peaceful guided forest reserve canopy walk and birdwatching', cost: 600 },
            ];
          }
        }

        const categoryLabel = isTransport ? 'Swap Transport' : isHotel ? 'Swap Accommodation' : 'Swap Activity';
        const subtitleLabel = isTransport 
          ? 'Recommended Transport Options:' 
          : isHotel 
          ? 'Recommended Stay Options:' 
          : `Recommended Alternatives for ${generatedTrip?.destination?.name || 'this destination'}:`;

        return (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-5 border border-stone-200">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#7065F0] block">
                    {categoryLabel}
                  </span>
                  <h3 className="text-lg font-bold text-stone-950">
                    Replace "{item.title}"
                  </h3>
                </div>
                <button
                  onClick={() => setSwapActivityModal(null)}
                  className="p-1.5 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                <span className="text-xs font-bold text-stone-700 block">
                  {subtitleLabel}
                </span>

                {alternativesList.map((rec, i) => (
                  <div
                    key={i}
                    onClick={() => handleSwapActivity(item.id, {
                      title: rec.title,
                      description: rec.desc,
                      cost: rec.cost,
                      image_url: rec.image_url,
                    })}
                    className="p-3.5 rounded-2xl bg-stone-50 hover:bg-purple-50/70 border border-stone-200 hover:border-purple-300 transition-all cursor-pointer flex items-center justify-between gap-3 group"
                  >
                    <div className="min-w-0">
                      <h5 className="text-xs font-bold text-stone-900 group-hover:text-purple-950 truncate">
                        {rec.title}
                      </h5>
                      <p className="text-[11px] text-stone-500 truncate">
                        {rec.desc}
                      </p>
                    </div>
                    <span className="text-xs font-bold text-purple-900 shrink-0">
                      {rec.cost ? `₹${rec.cost.toLocaleString()}` : 'Free'}
                    </span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setSwapActivityModal(null)}
                className="w-full py-2.5 rounded-full text-xs font-bold text-stone-500 hover:text-stone-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        );
      })()}

      {/* MODAL 5: ADJUST TRIP TARGET BUDGET MODAL */}
      {showBudgetModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-5 border border-stone-200">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-purple-100 flex items-center justify-center text-[#7065F0]">
                  <SlidersHorizontal className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#7065F0] block">
                    Budget Control
                  </span>
                  <h3 className="text-lg font-bold text-stone-950">
                    Adjust Target Trip Budget
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setShowBudgetModal(false)}
                className="p-1.5 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200/80 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-stone-800 block">Total Budget Ceiling</span>
                  <span className="text-[11px] text-stone-500">
                    ~₹{Math.round(adjustingBudgetVal / (generatedTrip?.traveler_count || 2)).toLocaleString('en-IN')}/person for {generatedTrip?.traveler_count || 2} travelers
                  </span>
                </div>
                <span className="text-xl font-black text-[#7065F0] font-display">
                  ₹{adjustingBudgetVal.toLocaleString('en-IN')}
                </span>
              </div>

              {/* Range slider */}
              <div className="space-y-1.5">
                <input
                  type="range"
                  min="15000"
                  max="350000"
                  step="2500"
                  value={adjustingBudgetVal}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    setAdjustingBudgetVal(val);
                    setAdjustingBudgetInputStr(val.toString());
                  }}
                  className="w-full h-2.5 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-[#7065F0]"
                />
                <div className="flex justify-between text-[10px] text-stone-400 font-bold">
                  <span>₹15,000 (Economy)</span>
                  <span>₹1,75,000</span>
                  <span>₹3,50,000+ (Luxury)</span>
                </div>
              </div>

              {/* Direct Input & Steppers */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const next = Math.max(10000, adjustingBudgetVal - 5000);
                    setAdjustingBudgetVal(next);
                    setAdjustingBudgetInputStr(next.toString());
                  }}
                  className="w-10 h-10 rounded-xl bg-white border border-stone-200 hover:bg-stone-100 text-stone-800 flex items-center justify-center font-bold cursor-pointer active:scale-95 transition-all shadow-2xs"
                  title="Decrease by ₹5,000"
                >
                  <Minus className="w-4 h-4" />
                </button>

                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500 font-bold text-sm">
                    ₹
                  </span>
                  <input
                    type="text"
                    value={adjustingBudgetInputStr}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/[^0-9]/g, '');
                      setAdjustingBudgetInputStr(raw);
                      const parsed = parseInt(raw, 10);
                      if (!isNaN(parsed) && parsed > 0) {
                        setAdjustingBudgetVal(parsed);
                      }
                    }}
                    placeholder="Enter custom budget amount"
                    className="w-full pl-7 pr-3 py-2 rounded-xl border border-stone-200 text-sm font-bold text-stone-900 bg-white focus:outline-hidden focus:border-[#7065F0] shadow-2xs"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const next = Math.min(1000000, adjustingBudgetVal + 5000);
                    setAdjustingBudgetVal(next);
                    setAdjustingBudgetInputStr(next.toString());
                  }}
                  className="w-10 h-10 rounded-xl bg-white border border-stone-200 hover:bg-stone-100 text-stone-800 flex items-center justify-center font-bold cursor-pointer active:scale-95 transition-all shadow-2xs"
                  title="Increase by ₹5,000"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Preset Brackets */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] uppercase font-bold tracking-wider text-stone-400 block">
                  Quick Brackets
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[35000, 50000, 75000, 100000, 150000, 200000].map((bVal) => (
                    <button
                      key={bVal}
                      type="button"
                      onClick={() => {
                        setAdjustingBudgetVal(bVal);
                        setAdjustingBudgetInputStr(bVal.toString());
                      }}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                        adjustingBudgetVal === bVal
                          ? 'bg-[#7065F0] text-white shadow-xs'
                          : 'bg-white border border-stone-200 text-stone-700 hover:border-[#7065F0] hover:text-[#7065F0]'
                      }`}
                    >
                      ₹{bVal.toLocaleString('en-IN')}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <p className="text-[11px] text-stone-500 leading-relaxed">
              💡 TourFlow AI will automatically rebalance your verified transport fares, hotel tiers, and sightseeing passes so they remain strictly within this new budget limit.
            </p>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowBudgetModal(false)}
                className="flex-1 py-3 rounded-full border border-stone-300 text-xs font-bold text-stone-700 hover:bg-stone-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowBudgetModal(false);
                  handleSendMessage(`Please update my trip target budget to ₹${adjustingBudgetVal.toLocaleString('en-IN')} and optimize expenses accordingly.`);
                }}
                className="flex-1 py-3 rounded-full bg-[#0F172A] hover:bg-black text-white text-xs font-bold shadow-md cursor-pointer flex items-center justify-center gap-2 active:scale-98 transition-all"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Apply & Re-balance Trip</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
