import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  ArrowRight, 
  ChevronRight, 
  ChevronDown, 
  Clock, 
  MapPin, 
  Users, 
  ShieldCheck, 
  Cpu, 
  UserCheck, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  Heart, 
  Compass, 
  Hotel, 
  Car, 
  Ticket, 
  Utensils, 
  Navigation,
  Star,
  Zap,
  Luggage,
  Calendar,
  Send,
  Building,
  PhoneCall,
  Flame
} from 'lucide-react';
import { Destination } from '../types/tourflow';
import { BackgroundScene } from './DynamicBackground';

interface IndiaLandingExperienceProps {
  destinations: Destination[];
  currentScene?: BackgroundScene;
  onSelectDestination?: (dest: Destination) => void;
  onOpenCreateTrip: () => void;
  onStartChatWithPrompt: (prompt: string, initialParams?: { destination?: string; duration?: string }) => void;
  onNavigateTab?: (tab: 'landing' | 'workspace' | 'destinations' | 'catalog' | 'ai_console') => void;
  onSwitchToOperator?: () => void;
}

export default function IndiaLandingExperience({
  destinations,
  currentScene,
  onSelectDestination,
  onOpenCreateTrip,
  onStartChatWithPrompt,
  onNavigateTab,
  onSwitchToOperator,
}: IndiaLandingExperienceProps) {
  
  // Section 4: Destination Filters State
  const [activeRegionFilter, setActiveRegionFilter] = useState<string>('All');
  
  // Section 6: Dynamic Itinerary Simulator State
  const [selectedAlternative, setSelectedAlternative] = useState<number>(0);
  const [swapConfirmed, setSwapConfirmed] = useState<boolean>(false);
  
  // Section 7: Secondary Prompt Input State
  const [secondaryPrompt, setSecondaryPrompt] = useState<string>('');

  // Section 9: FAQ Accordion State
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  // -------------------------------------------------------------
  // DATA FOR SECTION 1: TRIPS MADE FOR YOU
  // -------------------------------------------------------------
  const curatedTrips = [
    {
      id: 'trip-rajasthan',
      title: 'Rajasthan Royal Heritage',
      region: 'Rajasthan',
      duration: '7 days',
      styleTags: 'Heritage + Culture',
      budget: '₹42,000',
      imageUrl: 'https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&w=1200&q=80',
      prompt: 'Plan a 7-day royal heritage tour of Rajasthan including Jaipur, Jodhpur, and Udaipur under ₹45,000',
      highlight: 'Forts & Lake Palaces',
    },
    {
      id: 'trip-kerala',
      title: 'Kerala Emerald Sanctuary',
      region: 'Kerala',
      duration: '6 days',
      styleTags: 'Backwaters + Nature',
      budget: '₹34,000',
      imageUrl: 'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=1200&q=80',
      prompt: 'Plan a 6-day relaxing Kerala getaway with Alleppey houseboats and Munnar tea hills under ₹35,000',
      highlight: 'Houseboats & Tea Mist',
    },
    {
      id: 'trip-himachal',
      title: 'Himachal Alpine Valley',
      region: 'Himachal Pradesh',
      duration: '5 days',
      styleTags: 'Mountains + Adventure',
      budget: '₹26,500',
      imageUrl: 'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=1200&q=80',
      prompt: 'Plan a 5-day mountain escape to Himachal Pradesh covering Manali, Solang Valley, and Kasol under ₹30,000',
      highlight: 'Cedar Trails & Snow Passes',
    },
    {
      id: 'trip-goa',
      title: 'Goa Coastal Bohemia',
      region: 'Goa',
      duration: '4 days',
      styleTags: 'Beaches + Nightlife',
      budget: '₹22,000',
      imageUrl: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=1200&q=80',
      prompt: 'Plan a 4-day vibrant beach and coastal retreat in South & North Goa under ₹25,000',
      highlight: 'Sunset Shacks & Heritage Villas',
    },
    {
      id: 'trip-kashmir',
      title: 'Kashmir Paradise Odyssey',
      region: 'Kashmir',
      duration: '7 days',
      styleTags: 'Mountains + Romance',
      budget: '₹48,000',
      imageUrl: 'https://images.unsplash.com/photo-1595815771614-ade9d652a65d?auto=format&fit=crop&w=1200&q=80',
      prompt: 'Plan a 7-day romantic vacation to Kashmir including Srinagar Dal Lake, Gulmarg, and Pahalgam under ₹50,000',
      highlight: 'Dal Shikaras & Pine Slopes',
    },
    {
      id: 'trip-northeast',
      title: 'Northeast Living Roots',
      region: 'Northeast India',
      duration: '8 days',
      styleTags: 'Nature + Culture',
      budget: '₹52,000',
      imageUrl: 'https://images.unsplash.com/photo-1622308644420-b20142dc993c?auto=format&fit=crop&w=1200&q=80',
      prompt: 'Plan an 8-day Northeast India trip exploring Meghalaya waterfalls, living root bridges, and Kaziranga under ₹55,000',
      highlight: 'Cloud Canyons & Crystal Rivers',
    },
    {
      id: 'trip-andaman',
      title: 'Andaman Coral Atolls',
      region: 'Andaman & Nicobar',
      duration: '6 days',
      styleTags: 'Beaches + Adventure',
      budget: '₹58,000',
      imageUrl: 'https://images.unsplash.com/photo-1589308078059-be1415eab4c3?auto=format&fit=crop&w=1200&q=80',
      prompt: 'Plan a 6-day tropical island trip to Havelock and Neil Island in Andaman under ₹60,000',
      highlight: 'Turquoise Lagoons & Scuba',
    },
    {
      id: 'trip-tamilnadu',
      title: 'Tamil Nadu Dravidian Marvels',
      region: 'Tamil Nadu',
      duration: '7 days',
      styleTags: 'Temples + Culture',
      budget: '₹32,000',
      imageUrl: 'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=1200&q=80',
      prompt: 'Plan a 7-day cultural and temple tour of Tamil Nadu covering Madurai, Thanjavur, and Chettinad under ₹35,000',
      highlight: 'Sculpted Gopurams & Cuisine',
    },
  ];

  // -------------------------------------------------------------
  // DATA FOR SECTION 3: INDIA, YOUR WAY (TRAVEL PERSONALITIES)
  // -------------------------------------------------------------
  const travelPersonalities = [
    {
      id: 'style-couples',
      title: 'Couples',
      tagline: 'Romantic escapes',
      destinations: 'Udaipur · Goa · Kashmir · Kerala',
      imageUrl: 'https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&w=1000&q=80',
      prompt: 'Plan a romantic couple holiday in India with boutique stays and candlelit dinners',
    },
    {
      id: 'style-families',
      title: 'Families',
      tagline: 'Easy, comfortable journeys',
      destinations: 'Kerala · Rajasthan · Ooty · Shimla',
      imageUrl: 'https://images.unsplash.com/photo-1506461883276-594a12b11cf3?auto=format&fit=crop&w=1000&q=80',
      prompt: 'Plan a relaxing and comfortable family vacation in India suitable for kids and elders',
    },
    {
      id: 'style-adventure',
      title: 'Adventure',
      tagline: 'For the thrill seekers',
      destinations: 'Manali · Rishikesh · Ladakh · Meghalaya',
      imageUrl: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=1000&q=80',
      prompt: 'Plan an adventure itinerary in India featuring river rafting, high mountain passes, and trekking',
    },
    {
      id: 'style-spiritual',
      title: 'Spiritual',
      tagline: 'Journeys with meaning',
      destinations: 'Varanasi · Ayodhya · Haridwar · Char Dham',
      imageUrl: 'https://images.unsplash.com/photo-1561361513-2d000a50f0dc?auto=format&fit=crop&w=1000&q=80',
      prompt: 'Plan a soulful spiritual pilgrimage along the sacred Ganga ghats and temples of Varanasi and Rishikesh',
    },
    {
      id: 'style-wildlife',
      title: 'Wildlife',
      tagline: 'Into the wild',
      destinations: 'Jim Corbett · Ranthambore · Kaziranga · Bandhavgarh',
      imageUrl: 'https://images.unsplash.com/photo-1547970810-dc1eac8161d7?auto=format&fit=crop&w=1000&q=80',
      prompt: 'Plan a 4-day wildlife safari trip in India with tiger tracking and jungle lodge stays',
    },
    {
      id: 'style-food',
      title: 'Food & Culture',
      tagline: 'Taste the real India',
      destinations: 'Delhi · Lucknow · Hyderabad · Amritsar',
      imageUrl: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=1000&q=80',
      prompt: 'Plan a culinary exploration across Old Delhi street food, Awadhi kebabs in Lucknow, and Hyderabadi biryani',
    },
    {
      id: 'style-heritage',
      title: 'Heritage',
      tagline: 'Stories carved in stone',
      destinations: 'Rajasthan · Hampi · Khajuraho · Madurai',
      imageUrl: 'https://images.unsplash.com/photo-1600100397608-f010f443b351?auto=format&fit=crop&w=1000&q=80',
      prompt: 'Plan a heritage explorer tour of the UNESCO World Heritage monuments in Hampi and Rajasthan',
    },
    {
      id: 'style-beach',
      title: 'Beach',
      tagline: 'Slow down by the sea',
      destinations: 'Goa · Andaman · Lakshadweep · Kerala',
      imageUrl: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=1000&q=80',
      prompt: 'Plan a slow coastal holiday in India with tranquil beaches, private villas, and fresh seafood',
    },
  ];

  // -------------------------------------------------------------
  // DATA FOR SECTION 4: WHERE IN INDIA? (REGION FILTER GRID)
  // -------------------------------------------------------------
  const regionFilters = [
    'All',
    'North',
    'South',
    'West',
    'East',
    'Northeast',
    'Himalayas',
    'Beaches',
    'Heritage',
    'Wildlife',
  ];

  const destinationCatalog = [
    {
      name: 'Rajasthan',
      tagline: 'Forts · Culture · Desert',
      region: ['North', 'West', 'Heritage'],
      imageUrl: 'https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&w=800&q=80',
      price: 'From ₹24,000',
    },
    {
      name: 'Kerala',
      tagline: 'Backwaters · Beaches · Ayurveda',
      region: ['South', 'Beaches', 'Nature'],
      imageUrl: 'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=800&q=80',
      price: 'From ₹22,000',
    },
    {
      name: 'Goa',
      tagline: 'Beaches · Heritage · Sunsets',
      region: ['West', 'Beaches'],
      imageUrl: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=800&q=80',
      price: 'From ₹15,000',
    },
    {
      name: 'Kashmir',
      tagline: 'Lakes · Mountains · Romance',
      region: ['North', 'Himalayas'],
      imageUrl: 'https://images.unsplash.com/photo-1595815771614-ade9d652a65d?auto=format&fit=crop&w=800&q=80',
      price: 'From ₹28,000',
    },
    {
      name: 'Himachal Pradesh',
      tagline: 'Snow Valleys · Cedar Forests · Adventure',
      region: ['North', 'Himalayas'],
      imageUrl: 'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=800&q=80',
      price: 'From ₹18,500',
    },
    {
      name: 'Uttarakhand',
      tagline: 'Ganga Ghats · High Valleys · Yoga',
      region: ['North', 'Himalayas', 'Spiritual'],
      imageUrl: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=800&q=80',
      price: 'From ₹16,000',
    },
    {
      name: 'Ladakh',
      tagline: 'High Passes · Monasteries · Stargazing',
      region: ['North', 'Himalayas'],
      imageUrl: 'https://images.unsplash.com/photo-1581793745862-99fde7fa73d2?auto=format&fit=crop&w=800&q=80',
      price: 'From ₹32,000',
    },
    {
      name: 'Meghalaya',
      tagline: 'Waterfalls · Mountains · Living Roots',
      region: ['Northeast', 'East'],
      imageUrl: 'https://images.unsplash.com/photo-1622308644420-b20142dc993c?auto=format&fit=crop&w=800&q=80',
      price: 'From ₹25,000',
    },
    {
      name: 'Sikkim',
      tagline: 'Kanchenjunga · Monasteries · Alpine Lakes',
      region: ['Northeast', 'Himalayas', 'East'],
      imageUrl: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=800&q=80',
      price: 'From ₹26,000',
    },
    {
      name: 'Tamil Nadu',
      tagline: 'Dravidian Temples · Hill Stations · Heritage',
      region: ['South', 'Heritage'],
      imageUrl: 'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=800&q=80',
      price: 'From ₹21,000',
    },
    {
      name: 'Karnataka',
      tagline: 'Hampi Ruins · Coffee Plantations · Coorg',
      region: ['South', 'Heritage'],
      imageUrl: 'https://images.unsplash.com/photo-1600100397608-f010f443b351?auto=format&fit=crop&w=800&q=80',
      price: 'From ₹19,000',
    },
    {
      name: 'Maharashtra',
      tagline: 'Western Ghats · Coastal Forts · Vineyards',
      region: ['West', 'Heritage'],
      imageUrl: 'https://images.unsplash.com/photo-1570168007204-dfb528c6958f?auto=format&fit=crop&w=800&q=80',
      price: 'From ₹14,000',
    },
    {
      name: 'Gujarat',
      tagline: 'White Rann · Stepwells · Gir Wildlife',
      region: ['West', 'Wildlife', 'Heritage'],
      imageUrl: 'https://images.unsplash.com/photo-1589308078059-be1415eab4c3?auto=format&fit=crop&w=800&q=80',
      price: 'From ₹20,000',
    },
    {
      name: 'Odisha',
      tagline: 'Sun Temple · Chilika Lake · Craft Villages',
      region: ['East', 'Heritage', 'Beaches'],
      imageUrl: 'https://images.unsplash.com/photo-1590050752117-238cb0fb12b1?auto=format&fit=crop&w=800&q=80',
      price: 'From ₹18,000',
    },
    {
      name: 'Andaman & Nicobar',
      tagline: 'Turquoise Lagoons · Coral Reefs · Bioluminescence',
      region: ['Beaches', 'East'],
      imageUrl: 'https://images.unsplash.com/photo-1589308078059-be1415eab4c3?auto=format&fit=crop&w=800&q=80',
      price: 'From ₹36,000',
    },
    {
      name: 'Lakshadweep',
      tagline: 'Pristine Atolls · Coral Lagoons · Scuba Diving',
      region: ['Beaches', 'South'],
      imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
      price: 'From ₹38,000',
    },
  ];

  const filteredDestinations = activeRegionFilter === 'All'
    ? destinationCatalog
    : destinationCatalog.filter((d) => d.region.includes(activeRegionFilter));

  // -------------------------------------------------------------
  // DATA FOR SECTION 5: MADE BY TRAVELERS (AUTHENTIC STORIES)
  // -------------------------------------------------------------
  const travelerStories = [
    {
      quote: "Our Rajasthan trip finally felt like OUR trip.",
      route: "Mumbai → Jaipur → Jodhpur → Udaipur",
      details: "7 days · ₹78,000 · 2 travelers",
      traveler: "Rhea & Kabir S.",
      location: "Mumbai",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80",
      photo: "https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&w=800&q=80",
      storySnippet: "Instead of the typical crowded tourist traps, WonderAi balanced hidden rooftop stepwell dinners in Jodhpur with serene private boat rides on Lake Pichola.",
    },
    {
      quote: "Kerala with two kids, without the chaos.",
      route: "Kochi → Munnar → Alleppey → Kovalam",
      details: "6 days · ₹64,000 · Family of 4",
      traveler: "The Mehta Family",
      location: "Bengaluru",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80",
      photo: "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=800&q=80",
      storySnippet: "Every drive was spaced perfectly with stops at tea factories and spice plantations that kept the kids fascinated. The verified driver was exceptionally courteous.",
    },
    {
      quote: "A road trip through the Himalayas.",
      route: "Delhi → Manali → Sissu → Kasol",
      details: "8 days · ₹52,000 · 3 travelers",
      traveler: "Arjun, Dev & Siddharth",
      location: "New Delhi",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80",
      photo: "https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=800&q=80",
      storySnippet: "When a sudden landslide blocked Atal Tunnel, WonderAi's real-time AI rerouted us instantly to a gorgeous riverside camp in Tirthan Valley within 15 minutes.",
    },
  ];

  // -------------------------------------------------------------
  // DATA FOR SECTION 6: DYNAMIC ITINERARY ALTERNATIVES
  // -------------------------------------------------------------
  const dynamicAlternatives = [
    {
      name: 'Taj Lake Palace, Udaipur',
      tag: 'Iconic Heritage',
      price: '₹16,200',
      priceDiff: '+₹1,700',
      rating: '4.8',
      distance: '0.4 km away',
      amenities: 'Lake View · Spa · Boat Transfer',
      operatorStatus: 'Instant Live Confirmation',
      image: 'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=400&q=80',
    },
    {
      name: 'Raffles Udaipur',
      tag: 'Luxury Island Haven',
      price: '₹18,500',
      priceDiff: '+₹4,000',
      rating: '4.7',
      distance: '1.2 km away',
      amenities: 'Private Butler · Lagoon Pool',
      operatorStatus: 'Instant Live Confirmation',
      image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=400&q=80',
    },
    {
      name: 'Aurika, Udaipur - Luxury by Lemon Tree',
      tag: 'Value Luxury Pick',
      price: '₹13,900',
      priceDiff: '-₹600',
      rating: '4.6',
      distance: '2.1 km away',
      amenities: 'Aravalli Vistas · Rooftop Pool',
      operatorStatus: 'Instant Live Confirmation',
      image: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=400&q=80',
    },
  ];

  // -------------------------------------------------------------
  // DATA FOR SECTION 9: FAQ
  // -------------------------------------------------------------
  const faqItems = [
    {
      q: 'How does the AI create my itinerary?',
      a: 'Our Gemini-powered engine analyzes your travel style, budget in ₹ INR, pacing, group size, and interests against real-time Indian destination maps, seasonal weather, and verified local inventory to generate a bespoke hour-by-hour plan in seconds.',
    },
    {
      q: 'Can I customize the itinerary?',
      a: 'Yes, completely! You can swap hotels, adjust durations, drag activity blocks, request slower pacing, or ask the AI to re-balance the budget at any moment with natural conversation.',
    },
    {
      q: 'Can I plan trips anywhere in India?',
      a: 'From Kashmir ski passes and Spiti valley trails to Kerala backwaters, Andaman coral atolls, and spiritual ghats in Varanasi, WonderAi covers all 28 states and 8 union territories.',
    },
    {
      q: 'Can I set a budget in rupees?',
      a: 'Yes. All pricing is native in Indian Rupees (₹ INR). You can set precise budget limits (e.g. "under ₹50,000") and the AI optimizes stays, transfers, and activities to match without hidden surcharges.',
    },
    {
      q: 'Can I plan multi-city trips?',
      a: 'Yes. WonderAi automatically computes optimal Indian inter-city transit (Vande Bharat trains, domestic flights, scenic highway routes) to prevent unnecessary backtracking.',
    },
    {
      q: 'Can I change my itinerary after booking?',
      a: 'Yes. Our platform connects directly with local tour operators and verified ground partners, making post-booking modifications, schedule shifts, or hotel upgrades seamless.',
    },
    {
      q: 'What happens if a hotel or activity becomes unavailable?',
      a: 'Our Dynamic Tour Operations engine immediately detects disruptions (e.g. sold-out rooms, weather closures) and presents 3 curated, price-matched alternatives. You choose, and the ground operator confirms instantly.',
    },
    {
      q: 'Can a tour operator modify my itinerary?',
      a: 'Yes. Certified local tour operators have access to the companion operations portal to verify permits, coordinate private transport drivers, and apply local timing optimizations.',
    },
    {
      q: 'Can I travel with a group?',
      a: 'Yes. You can specify group sizes (couples, families with kids/elders, or friend circles) and the AI adjusts vehicle capacity (Innova Crysta, Tempo Traveller) and room configurations accordingly.',
    },
    {
      q: 'Can I plan road trips?',
      a: 'Absolutely! Our road trip engine plots scenic driving itineraries, verified highway pitstops, EV charging/fuel stations, and scenic viewpoint stops tailored for Indian driving conditions.',
    },
  ];

  const handleSecondarySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (secondaryPrompt.trim()) {
      onStartChatWithPrompt(secondaryPrompt.trim());
    } else {
      onStartChatWithPrompt('Plan a 5-day luxury Rajasthan trip under ₹50,000');
    }
  };

  return (
    <div 
      id="india-landing-sections-wrapper" 
      className="relative z-20 w-full text-stone-900 overflow-hidden font-sans transition-colors duration-1000"
    >
      {/* 1. Atmospheric Seamless Soft Gradient Transition from Hero */}
      <div 
        className="absolute inset-0 pointer-events-none transition-colors duration-1000"
        style={{
          background: currentScene
            ? `linear-gradient(180deg, transparent 0%, ${currentScene.prominentColor}99 160px, ${currentScene.prominentColor}fa 360px, ${currentScene.prominentColor} 100%)`
            : 'linear-gradient(180deg, transparent 0%, rgba(12,10,23,0.7) 160px, rgba(12,10,23,0.98) 360px, #0C0A17 100%)',
        }}
      />

      {/* Radiant Glowing Light Leaks from rotating image */}
      <div 
        className="pointer-events-none absolute top-12 left-1/4 w-[650px] h-[650px] rounded-full blur-[150px] opacity-35 transition-all duration-1000"
        style={{ backgroundColor: currentScene?.glowColor || '#7065F0' }}
      />
      <div 
        className="pointer-events-none absolute top-1/3 -right-40 w-[600px] h-[600px] rounded-full blur-[160px] opacity-25 transition-all duration-1000"
        style={{ backgroundColor: currentScene?.secondaryGlow || '#EC4899' }}
      />
      <div 
        className="pointer-events-none absolute top-2/3 -left-32 w-[650px] h-[650px] rounded-full blur-[160px] opacity-30 transition-all duration-1000"
        style={{ backgroundColor: currentScene?.glowColor || '#38BDF8' }}
      />
      <div 
        className="pointer-events-none absolute bottom-40 right-1/4 w-[500px] h-[500px] rounded-full blur-[140px] opacity-20 transition-all duration-1000"
        style={{ backgroundColor: currentScene?.accentColor || '#A78BFA' }}
      />
      
      {/* ========================================================================= */}
      {/* SECTION 1 — TRIPS MADE FOR YOU */}
      {/* ========================================================================= */}
      <section id="section-trips-made-for-you" className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 sm:py-24 border-b border-white/10">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 sm:mb-14">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-purple-200 border border-white/15 text-xs font-bold uppercase tracking-wider mb-3">
              <Sparkles className="w-3.5 h-3.5 text-[#7065F0]" />
              <span>Tailored Indian Journeys</span>
            </div>
            <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight">
              Trips made for you
            </h2>
            <p className="mt-2 text-base sm:text-lg text-stone-200 font-medium">
              Tell us what you love. We'll build the rest.
            </p>
          </div>
          
          <button
            onClick={() => onStartChatWithPrompt('Show me the top curated travel packages for India with daily budgets')}
            className="mt-4 md:mt-0 inline-flex items-center gap-2 text-sm font-bold text-purple-300 hover:text-white transition-colors cursor-pointer group"
          >
            <span>Explore all handcrafted Indian routes</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {/* Trips Visual Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
          {curatedTrips.map((trip) => (
            <motion.div
              key={trip.id}
              whileHover={{ y: -6 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              onClick={() => onStartChatWithPrompt(trip.prompt, { destination: trip.title, duration: trip.duration })}
              className="group relative rounded-3xl overflow-hidden bg-stone-900/70 border border-white/15 shadow-xl hover:border-white/30 backdrop-blur-xl transition-all duration-300 cursor-pointer flex flex-col justify-between"
            >
              {/* Card Image Cover */}
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-stone-950">
                <img
                  src={trip.imageUrl}
                  alt={trip.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                
                {/* Duration Badge */}
                <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-xs font-bold shadow-sm flex items-center gap-1.5 border border-white/10">
                  <Clock className="w-3 h-3 text-[#7065F0]" />
                  <span>{trip.duration}</span>
                </div>

                {/* Highlight text bottom left on image */}
                <div className="absolute bottom-3 left-3 right-3 text-white">
                  <div className="text-[11px] font-medium text-white/80 uppercase tracking-wider">{trip.region}</div>
                  <div className="text-base font-bold leading-snug drop-shadow-sm">{trip.title}</div>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-4 sm:p-5 flex flex-col justify-between flex-1 space-y-3">
                <div className="flex items-center justify-between text-xs text-stone-300 font-semibold">
                  <span className="px-2.5 py-1 rounded-lg bg-white/10 text-stone-200 font-medium">
                    {trip.styleTags}
                  </span>
                </div>

                <div className="pt-2.5 border-t border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-stone-300 font-medium pr-2 truncate">
                    <Sparkles className="w-3.5 h-3.5 text-[#7065F0] shrink-0" />
                    <span className="truncate">{trip.highlight}</span>
                  </div>
                  
                  <div className="w-8 h-8 rounded-full bg-white/10 text-white group-hover:bg-[#7065F0] flex items-center justify-center transition-colors shrink-0">
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 2 — AI + HUMAN TOUR EXPERTISE */}
      {/* ========================================================================= */}
      <section id="section-ai-human-expertise" className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-24 border-b border-white/10">
        
        <div className="text-center max-w-3xl mx-auto mb-14 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-400/20 text-amber-300 text-xs font-bold uppercase tracking-wider mb-3">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>The Power of Hybrid Intelligence</span>
          </div>
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight">
            AI speed. Indian travel expertise.
          </h2>
          <p className="mt-3 text-base sm:text-lg text-stone-200 font-medium leading-relaxed">
            Build a personalized itinerary in minutes, then refine it with real-world travel expertise.
          </p>
        </div>

        {/* Two Visual Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
          
          {/* Column 1: AI PLANNER */}
          <div className="rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-indigo-900 via-slate-900 to-purple-950 text-white shadow-xl relative overflow-hidden flex flex-col justify-between border border-indigo-700/30">
            {/* Subtle glow background */}
            <div className="absolute top-0 right-0 w-72 h-72 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />
            
            <div>
              <div className="flex items-center justify-between pb-6 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-indigo-300">
                    <Sparkles className="w-5 h-5 text-indigo-300" />
                  </div>
                  <div>
                    <h3 className="font-display font-black text-xl tracking-wide text-white">✦ AI PLANNER</h3>
                    <p className="text-xs text-indigo-200/80">Sub-second itinerary generation & routing</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-indigo-500/30 border border-indigo-400/40 text-[11px] font-bold text-indigo-200">
                  Instant
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 py-6">
                {[
                  { title: 'Personalized itineraries', desc: 'Crafted to your exact pace and aesthetic' },
                  { title: 'Budget-aware planning', desc: 'Calculates true costs in INR with zero surprises' },
                  { title: 'Multi-city routing', desc: 'Optimal road and train links across Indian states' },
                  { title: 'Activity recommendations', desc: 'Hidden stepwells, heritage walks, culinary gems' },
                  { title: 'Instant itinerary changes', desc: 'Rebalance times or swap spots in seconds' },
                  { title: 'Real-time alternatives', desc: 'Automatic 3-option backup if plans shift' },
                ].map((item, idx) => (
                  <div key={idx} className="p-3.5 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                    <div className="flex items-center gap-2 text-indigo-300 font-bold text-xs mb-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />
                      <span>{item.title}</span>
                    </div>
                    <p className="text-[11px] text-stone-300 leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-white/10 flex items-center justify-between text-xs text-indigo-200">
              <span>Powered by Gemini 2.5 Multi-Modal Travel Engine</span>
              <button 
                onClick={() => onStartChatWithPrompt('Help me plan a personalized vacation across India with daily activities')}
                className="font-bold text-white hover:text-indigo-300 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <span>Try AI Planning</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Column 2: TOUR EXPERT */}
          <div className="rounded-3xl p-6 sm:p-8 bg-white border border-stone-200/90 shadow-xl flex flex-col justify-between relative overflow-hidden">
            <div>
              <div className="flex items-center justify-between pb-6 border-b border-stone-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-700">
                    <UserCheck className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="font-display font-black text-xl tracking-wide text-stone-900">◉ TOUR EXPERT</h3>
                    <p className="text-xs text-stone-500">Verified on-ground operations & local insight</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-[11px] font-bold text-amber-800">
                  Human Verified
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 py-6">
                {[
                  { title: 'Local destination knowledge', desc: 'Real-time road conditions & temple timing nuances' },
                  { title: 'Vendor coordination', desc: 'Direct access to verified drivers and houseboat owners' },
                  { title: 'Hotel & transport options', desc: 'Handpicked boutique havelis and trusted fleet' },
                  { title: 'Activity availability', desc: 'Safari permits & monument entry confirmations' },
                  { title: 'Human verification', desc: 'Every line item reviewed by regional specialists' },
                  { title: 'Support when plans change', desc: '24/7 on-call coordinator during your active trip' },
                ].map((item, idx) => (
                  <div key={idx} className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200/70 hover:bg-stone-100/80 transition-colors">
                    <div className="flex items-center gap-2 text-amber-800 font-bold text-xs mb-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" />
                      <span>{item.title}</span>
                    </div>
                    <p className="text-[11px] text-stone-600 leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
              <span>Backed by 180+ certified Indian ground operators</span>
              <button 
                onClick={onOpenCreateTrip}
                className="font-bold text-[#7065F0] hover:text-[#584be3] transition-colors flex items-center gap-1 cursor-pointer"
              >
                <span>Customize with Expert</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

        </div>

      </section>

      {/* ========================================================================= */}
      {/* SECTION 3 — TRAVEL YOUR INDIA (EDITORIAL STYLE) */}
      {/* ========================================================================= */}
      <section id="section-india-your-way" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-24 border-b border-stone-200/80">
        
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-12">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 text-rose-700 text-xs font-bold uppercase tracking-wider mb-3">
              <Heart className="w-3.5 h-3.5 text-rose-600" />
              <span>Personalized Travel Archetypes</span>
            </div>
            <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-black text-stone-950 tracking-tight">
              India, your way.
            </h2>
            <p className="mt-2 text-base sm:text-lg text-stone-600 font-medium">
              Every travel dream is distinct. Discover the archetype that resonates with you.
            </p>
          </div>

          <button
            onClick={() => onStartChatWithPrompt('Which Indian destination best matches my travel personality? Ask me 3 quick questions')}
            className="mt-4 sm:mt-0 text-sm font-bold text-[#7065F0] hover:text-[#584be3] transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <span>Take 1-minute Travel Quiz</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* 8 Editorial Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {travelPersonalities.map((item) => (
            <motion.div
              key={item.id}
              whileHover={{ y: -6 }}
              transition={{ duration: 0.25 }}
              onClick={() => onStartChatWithPrompt(item.prompt)}
              className="group relative rounded-3xl overflow-hidden aspect-[4/5] bg-stone-900 cursor-pointer shadow-md hover:shadow-2xl transition-all"
            >
              {/* Background Image */}
              <img
                src={item.imageUrl}
                alt={item.title}
                referrerPolicy="no-referrer"
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-108 transition-transform duration-700 ease-out opacity-85 group-hover:opacity-95"
                loading="lazy"
              />
              
              {/* Gradient Scrim */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-black/10 group-hover:via-black/25 transition-all" />

              {/* Top Pill */}
              <div className="absolute top-4 left-4">
                <span className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-xs font-bold border border-white/20">
                  {item.title}
                </span>
              </div>

              {/* Bottom Content */}
              <div className="absolute bottom-0 left-0 right-0 p-5 text-white space-y-1.5">
                <div className="text-lg font-black tracking-tight text-white group-hover:text-amber-300 transition-colors">
                  {item.tagline}
                </div>
                <div className="text-xs text-white/80 font-medium flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-[#7065F0] shrink-0" />
                  <span className="truncate">{item.destinations}</span>
                </div>
                
                <div className="pt-2 flex items-center gap-1 text-[11px] font-bold text-white/90 group-hover:translate-x-1 transition-transform">
                  <span>Plan this style</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>

      </section>

      {/* ========================================================================= */}
      {/* SECTION 4 — DISCOVER INDIA (WHERE IN INDIA?) */}
      {/* ========================================================================= */}
      <section id="section-where-in-india" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-24 border-b border-stone-200/80">
        
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-700 text-xs font-bold uppercase tracking-wider mb-3">
              <Compass className="w-3.5 h-3.5 text-emerald-600" />
              <span>Comprehensive Destination Atlas</span>
            </div>
            <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-black text-stone-950 tracking-tight">
              Where in India?
            </h2>
            <p className="mt-2 text-base text-stone-600 font-medium">
              Explore iconic states, hidden valleys, and serene coastal stretches.
            </p>
          </div>

          <span className="text-xs font-bold text-stone-400 mt-2 md:mt-0">
            Showing {filteredDestinations.length} curated regions
          </span>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-4 mb-8">
          {regionFilters.map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveRegionFilter(filter)}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeRegionFilter === filter
                  ? 'bg-stone-900 text-white shadow-sm'
                  : 'bg-white text-stone-700 hover:bg-stone-100 border border-stone-200/80'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>

        {/* Destination Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {filteredDestinations.map((dest, idx) => (
            <motion.div
              key={idx}
              whileHover={{ y: -4 }}
              transition={{ duration: 0.2 }}
              onClick={() => onStartChatWithPrompt(`Plan a 5-day comprehensive trip to ${dest.name} in India covering top highlights and local food`, { destination: dest.name, duration: '5 days' })}
              className="group bg-white rounded-2xl overflow-hidden border border-stone-200/90 shadow-2xs hover:shadow-lg transition-all cursor-pointer flex flex-col justify-between"
            >
              <div className="relative aspect-[16/10] overflow-hidden bg-stone-100">
                <img
                  src={dest.imageUrl}
                  alt={dest.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-xs text-white text-[10px] font-bold flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-[#7065F0]" />
                  <span>Explore</span>
                </span>
              </div>

              <div className="p-3.5 sm:p-4">
                <h4 className="font-display font-black text-stone-900 text-sm sm:text-base group-hover:text-[#7065F0] transition-colors">
                  {dest.name}
                </h4>
                <p className="text-xs text-stone-500 font-medium truncate mt-0.5">
                  {dest.tagline}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

      </section>

      {/* ========================================================================= */}
      {/* SECTION 5 — MADE BY TRAVELERS (AUTHENTIC STORIES) */}
      {/* ========================================================================= */}
      <section id="section-made-by-travelers" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-24 border-b border-white/10">
        
        <div className="text-center max-w-2xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-400/30 text-xs font-bold uppercase tracking-wider mb-3">
            <Users className="w-3.5 h-3.5 text-purple-300" />
            <span>Real Expeditions & Memories</span>
          </div>
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight">
            Made by travelers.
          </h2>
          <p className="mt-2 text-base sm:text-lg text-stone-200 font-medium">
            Real itineraries, real budgets, and genuine journeys planned on WonderAi.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          {travelerStories.map((story, idx) => (
            <div
              key={idx}
              className="bg-white rounded-3xl p-6 sm:p-7 border border-stone-200/90 shadow-sm flex flex-col justify-between space-y-6 hover:shadow-xl transition-shadow"
            >
              {/* Photo & Route Badge */}
              <div className="space-y-4">
                <div className="relative aspect-[16/10] rounded-2xl overflow-hidden bg-stone-100">
                  <img
                    src={story.photo}
                    alt={story.traveler}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-2.5 left-2.5 right-2.5 px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md text-white text-[11px] font-bold truncate">
                    {story.route}
                  </div>
                </div>

                {/* Quote */}
                <blockquote className="font-display font-bold text-lg sm:text-xl text-stone-900 leading-snug">
                  "{story.quote}"
                </blockquote>

                <p className="text-xs sm:text-sm text-stone-600 leading-relaxed font-normal">
                  {story.storySnippet}
                </p>
              </div>

              {/* Bottom Traveler Details */}
              <div className="pt-4 border-t border-stone-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img
                    src={story.avatar}
                    alt={story.traveler}
                    referrerPolicy="no-referrer"
                    className="w-9 h-9 rounded-full object-cover border border-stone-200"
                  />
                  <div>
                    <div className="text-xs font-bold text-stone-900">{story.traveler}</div>
                    <div className="text-[11px] text-stone-500">{story.location}</div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs font-black text-[#7065F0]">{story.details.split('·')[1]}</div>
                  <div className="text-[10px] text-stone-400 font-medium">{story.details.split('·')[0]}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

      </section>

      {/* ========================================================================= */}
      {/* SECTION 6 — DYNAMIC ITINERARY / REAL-TIME CHANGES */}
      {/* ========================================================================= */}
      <section id="section-dynamic-itinerary" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-24 border-b border-stone-200/80 bg-stone-950 text-white rounded-3xl my-12 shadow-2xl relative overflow-hidden">
        
        {/* Glow backdrop */}
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-[#7065F0]/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl mx-auto text-center mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold uppercase tracking-wider mb-3">
            <RefreshCw className="w-3.5 h-3.5 text-amber-400 animate-spin" style={{ animationDuration: '6s' }} />
            <span>Dynamic Tour Operations Engine</span>
          </div>
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight">
            Plans change. Your trip doesn't have to.
          </h2>
          <p className="mt-3 text-base sm:text-lg text-stone-300 font-medium">
            When hotel rooms sell out or monsoon routes shift, WonderAi and verified local operators instantly orchestrate backup stays and alternatives in real time.
          </p>
        </div>

        {/* Live Interactive UI Simulation */}
        <div className="relative z-10 max-w-4xl mx-auto bg-stone-900/90 border border-white/15 rounded-3xl p-5 sm:p-8 shadow-2xl backdrop-blur-xl">
          
          {/* Disruption Alert Bar */}
          <div className="p-4 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-extrabold uppercase tracking-wider text-amber-400">
                  ⚠️ Real-Time Disruption Alert
                </div>
                <div className="text-sm font-bold text-white">
                  Hotel unavailable: <span className="text-stone-300 font-normal">The Oberoi Udaivilas · Udaipur (₹14,500)</span>
                </div>
              </div>
            </div>
            <div className="px-3 py-1 rounded-full bg-white/10 text-xs font-bold text-stone-300 self-start sm:self-auto">
              Simulated Auto-Recovery
            </div>
          </div>

          {/* AI Found 3 Alternatives */}
          <div className="space-y-3 mb-6">
            <div className="flex items-center justify-between text-xs font-bold text-stone-400 px-1">
              <span className="flex items-center gap-1.5 text-indigo-300">
                <Sparkles className="w-3.5 h-3.5 text-[#7065F0]" />
                <span>AI found 3 curated alternatives matching your style & budget</span>
              </span>
              <span className="text-stone-400 hidden sm:inline">Tap to select replacement</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {dynamicAlternatives.map((alt, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    setSelectedAlternative(idx);
                    setSwapConfirmed(true);
                  }}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer text-left relative ${
                    selectedAlternative === idx
                      ? 'bg-gradient-to-b from-[#7065F0]/20 to-purple-950/40 border-[#7065F0] ring-2 ring-[#7065F0]/50 shadow-lg'
                      : 'bg-white/5 border-white/10 hover:bg-white/10'
                  }`}
                >
                  {selectedAlternative === idx && (
                    <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-[#7065F0] text-white flex items-center justify-center">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </div>
                  )}

                  <div className="text-[10px] font-extrabold uppercase text-[#7065F0] mb-1">
                    Option {String.fromCharCode(65 + idx)}
                  </div>
                  <div className="font-bold text-sm text-white mb-1 leading-snug">
                    {alt.name}
                  </div>
                  <div className="text-xs text-stone-400 font-medium mb-3">
                    {alt.tag} &bull; {alt.distance}
                  </div>

                  <div className="flex items-baseline justify-between pt-2 border-t border-white/10">
                    <div>
                      <span className="text-sm font-black text-white">{alt.price}</span>
                      <span className="text-[10px] text-stone-400"> / night</span>
                    </div>
                    <span className="text-[11px] font-bold text-amber-400 flex items-center gap-0.5">
                      <Star className="w-3 h-3 fill-amber-400" />
                      {alt.rating}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Operational Confirmation Workflow */}
          <div className="p-4 rounded-2xl bg-black/40 border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-2 sm:gap-4 text-stone-300 font-medium flex-wrap">
              <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                <CheckCircle2 className="w-4 h-4" />
                <span>Traveler chooses</span>
              </span>
              <span className="text-stone-600">→</span>
              <span className="flex items-center gap-1.5 text-indigo-300 font-bold">
                <CheckCircle2 className="w-4 h-4" />
                <span>Operator confirms</span>
              </span>
              <span className="text-stone-600">→</span>
              <span className="flex items-center gap-1.5 text-amber-300 font-bold">
                <CheckCircle2 className="w-4 h-4" />
                <span>Vendor booked</span>
              </span>
            </div>

            <button
              onClick={() => onStartChatWithPrompt('Show me how WonderAi handles real-time disruptions and hotel swaps on an active trip')}
              className="px-4 py-2 rounded-xl bg-[#7065F0] hover:bg-[#5e51ee] text-white font-bold text-xs transition-colors shrink-0 cursor-pointer"
            >
              Test Dynamic Itinerary Live
            </button>
          </div>

        </div>

      </section>

      {/* ========================================================================= */}
      {/* SECTION 7 — SECONDARY AI PLANNING CTA */}
      {/* ========================================================================= */}
      <section id="section-secondary-ai-cta" className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-24 text-center">
        
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#7065F0]/10 text-[#7065F0] text-xs font-bold uppercase tracking-wider mb-4">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Interactive AI Travel Studio</span>
        </div>
        
        <h2 className="font-display text-4xl sm:text-5xl md:text-6xl font-black text-stone-950 tracking-tight">
          Where will India take you?
        </h2>
        <p className="mt-3 text-lg text-stone-600 font-medium max-w-xl mx-auto">
          Tell us what you're imagining.
        </p>

        {/* Big AI Prompt Input Box */}
        <div className="mt-8 sm:mt-10 max-w-3xl mx-auto bg-white rounded-3xl sm:rounded-[36px] shadow-xl p-4 sm:p-5 border border-stone-200/90 text-left space-y-4">
          <form onSubmit={handleSecondarySubmit} className="flex items-center gap-3">
            <div className="pl-2 text-[#7065F0]">
              <Sparkles className="w-6 h-6" />
            </div>

            <input
              type="text"
              value={secondaryPrompt}
              onChange={(e) => setSecondaryPrompt(e.target.value)}
              placeholder="Plan my trip... (e.g. 6 days in Himachal for a couple under ₹40k)"
              className="flex-1 text-base sm:text-lg font-medium text-stone-800 placeholder:text-stone-400 bg-transparent focus:outline-none py-2"
            />

            <button
              type="submit"
              className="w-12 h-12 rounded-full bg-[#7065F0] hover:bg-[#5e51ee] text-white flex items-center justify-center shadow-md shadow-[#7065F0]/30 transition-all cursor-pointer shrink-0 active:scale-95"
            >
              <ArrowRight className="w-5 h-5" />
            </button>
          </form>

          {/* Prompt Ideas Pills */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-stone-100">
            {[
              '5 days in Kerala under ₹40,000',
              'Romantic Rajasthan trip for two',
              'Family vacation from Mumbai to Kashmir',
              '10-day Northeast India adventure',
              'Weekend road trip from Pune',
            ].map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => onStartChatWithPrompt(p)}
                className="px-3 py-1.5 rounded-full bg-stone-50 hover:bg-stone-100 border border-stone-200 text-stone-700 text-xs font-medium transition-colors cursor-pointer"
              >
                {p}
              </button>
            ))}
          </div>
        </div>

      </section>

      {/* ========================================================================= */}
      {/* SECTION 8 — TRUSTED TRAVEL NETWORK */}
      {/* ========================================================================= */}
      <section id="section-trusted-network" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-24 border-y border-stone-200/80 bg-white">
        
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-stone-100 text-stone-800 text-xs font-bold uppercase tracking-wider mb-3">
            <Building className="w-3.5 h-3.5 text-stone-600" />
            <span>Connected Unified Ecosystem</span>
          </div>
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-black text-stone-950 tracking-tight">
            One platform. Your entire trip.
          </h2>
          <p className="mt-2 text-base text-stone-600 font-medium">
            Seamless flow from prompt to on-ground execution.
          </p>
        </div>

        {/* Visual Architecture Flow: Traveler -> AI Planner -> Tour Operator -> Vendors */}
        <div className="max-w-4xl mx-auto mb-14">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
            
            {/* Step 1 */}
            <div className="p-5 rounded-2xl bg-stone-50 border border-stone-200 text-center space-y-2">
              <div className="w-10 h-10 rounded-xl bg-stone-900 text-white flex items-center justify-center mx-auto">
                <Users className="w-5 h-5" />
              </div>
              <div className="font-black text-sm text-stone-900">Traveler</div>
              <div className="text-[11px] text-stone-500">Shares style, dates & rupee budget</div>
            </div>

            {/* Step 2 */}
            <div className="p-5 rounded-2xl bg-[#7065F0]/10 border border-[#7065F0]/30 text-center space-y-2">
              <div className="w-10 h-10 rounded-xl bg-[#7065F0] text-white flex items-center justify-center mx-auto">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="font-black text-sm text-[#7065F0]">AI Planner</div>
              <div className="text-[11px] text-stone-600">Builds route & dynamic schedule</div>
            </div>

            {/* Step 3 */}
            <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 text-center space-y-2">
              <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center mx-auto">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="font-black text-sm text-amber-900">Tour Operator</div>
              <div className="text-[11px] text-amber-800">Verifies local permits & rates</div>
            </div>

            {/* Step 4 */}
            <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-2">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center mx-auto">
                <Luggage className="w-5 h-5" />
              </div>
              <div className="font-black text-sm text-emerald-900">Ground Network</div>
              <div className="text-[11px] text-emerald-800">Hotels · Cabs · Guides · Stays</div>
            </div>

          </div>
        </div>

        {/* Partner Categories */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 max-w-4xl mx-auto">
          {[
            { icon: <Hotel className="w-5 h-5 text-indigo-600" />, label: 'Hotels', count: 'Heritage & Boutique Stays' },
            { icon: <Car className="w-5 h-5 text-emerald-600" />, label: 'Transport', count: 'Verified Cabs & Drivers' },
            { icon: <Ticket className="w-5 h-5 text-rose-600" />, label: 'Activities', count: 'Safaris & Monument Access' },
            { icon: <Utensils className="w-5 h-5 text-amber-600" />, label: 'Experiences', count: 'Curated Dining & Food Walks' },
            { icon: <Compass className="w-5 h-5 text-cyan-600" />, label: 'Guides', count: 'Certified Storytellers' },
          ].map((cat, idx) => (
            <div key={idx} className="p-4 rounded-2xl bg-stone-50 border border-stone-200/80 text-center space-y-1.5">
              <div className="flex justify-center mb-1">{cat.icon}</div>
              <div className="text-xs font-black text-stone-900">{cat.label}</div>
              <div className="text-[10px] text-stone-500">{cat.count}</div>
            </div>
          ))}
        </div>

      </section>

      {/* ========================================================================= */}
      {/* SECTION 9 — FAQ (ACCORDION) */}
      {/* ========================================================================= */}
      <section id="section-faq" className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-24">
        
        <div className="text-center mb-12 sm:mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-white text-xs font-bold uppercase tracking-wider mb-3 border border-white/10">
            <span>Clarifications & Details</span>
          </div>
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight">
            Questions, answered.
          </h2>
          <p className="mt-2 text-base text-stone-200 font-medium">
            Everything you need to know about planning trips with WonderAi in India.
          </p>
        </div>

        {/* Accordion Container */}
        <div className="space-y-3">
          {faqItems.map((item, idx) => {
            const isOpen = openFaqIndex === idx;
            return (
              <div
                key={idx}
                className="rounded-2xl bg-stone-900/70 border border-white/15 overflow-hidden shadow-xl backdrop-blur-xl transition-all"
              >
                <button
                  onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                  className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4 font-display font-bold text-sm sm:text-base text-white hover:text-[#7065F0] transition-colors cursor-pointer"
                >
                  <span>{item.q}</span>
                  <ChevronDown className={`w-4 h-4 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180 text-[#7065F0]' : 'text-stone-400'}`} />
                </button>

                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="px-4 pb-5 sm:px-5 sm:pb-6 text-xs sm:text-sm text-stone-300 leading-relaxed border-t border-white/10 pt-3"
                    >
                      {item.a}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

      </section>

      {/* ========================================================================= */}
      {/* PREMIUM FOOTER */}
      {/* ========================================================================= */}
      <footer id="wonderai-main-footer" className="bg-stone-950 text-white border-t border-white/10 pt-16 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 pb-12 border-b border-white/10">
            
            {/* Brand column */}
            <div className="col-span-2 space-y-4">
              <div className="flex items-center gap-2">
                <svg className="w-6 h-6 fill-[#7065F0]" viewBox="0 0 24 24">
                  <path d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5L12 0Z" />
                </svg>
                <span className="font-display font-black text-2xl tracking-tight text-white">
                  WonderAi<span className="text-[#7065F0]">.</span>
                </span>
              </div>
              <p className="text-xs text-stone-400 max-w-sm leading-relaxed">
                AI-powered personalized and dynamic tour planning & tour operations platform built for India. Instant itineraries, real-time disruption handling, and verified local expertise.
              </p>
              <div className="text-xs text-stone-500">
                Native INR (₹) Pricing &bull; All 28 States & 8 UTs Covered
              </div>
            </div>

            {/* Column 1: Explore India */}
            <div className="space-y-3">
              <h5 className="text-xs font-bold text-white uppercase tracking-wider">Explore India</h5>
              <ul className="space-y-2 text-xs text-stone-400">
                <li>
                  <button onClick={() => { if (onNavigateTab) onNavigateTab('destinations'); }} className="hover:text-white transition-colors cursor-pointer">
                    Destinations
                  </button>
                </li>
                <li>
                  <button onClick={() => onStartChatWithPrompt('Inspire me with unique trip ideas for this season')} className="hover:text-white transition-colors cursor-pointer">
                    Trip Ideas
                  </button>
                </li>
                <li>
                  <button onClick={() => onStartChatWithPrompt('Suggest the best weekend getaways from major Indian cities')} className="hover:text-white transition-colors cursor-pointer">
                    Weekend Getaways
                  </button>
                </li>
                <li>
                  <button onClick={() => onStartChatWithPrompt('Plan a 5-day scenic road trip in India')} className="hover:text-white transition-colors cursor-pointer">
                    Road Trips
                  </button>
                </li>
              </ul>
            </div>

            {/* Column 2: Plan */}
            <div className="space-y-3">
              <h5 className="text-xs font-bold text-white uppercase tracking-wider">Plan</h5>
              <ul className="space-y-2 text-xs text-stone-400">
                <li>
                  <button onClick={onOpenCreateTrip} className="hover:text-white transition-colors cursor-pointer">
                    Create a Trip
                  </button>
                </li>
                <li>
                  <button onClick={() => { if (onNavigateTab) onNavigateTab('ai_console'); }} className="hover:text-white transition-colors cursor-pointer">
                    AI Planner
                  </button>
                </li>
                <li>
                  <button onClick={() => { if (onNavigateTab) onNavigateTab('workspace'); }} className="hover:text-white transition-colors cursor-pointer">
                    My Trips
                  </button>
                </li>
                <li>
                  <button onClick={() => { if (onNavigateTab) onNavigateTab('catalog'); }} className="hover:text-white transition-colors cursor-pointer">
                    Catalogue
                  </button>
                </li>
              </ul>
            </div>

            {/* Column 3: For Operators & Company */}
            <div className="space-y-3">
              <h5 className="text-xs font-bold text-white uppercase tracking-wider">For Operators</h5>
              <ul className="space-y-2 text-xs text-stone-400">
                <li>
                  <button 
                    onClick={() => {
                      if (onSwitchToOperator) onSwitchToOperator();
                      else onStartChatWithPrompt('How can tour operators join the WonderAi network?');
                    }} 
                    className="hover:text-white transition-colors cursor-pointer"
                  >
                    Operator Login
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => {
                      if (onSwitchToOperator) onSwitchToOperator();
                      else onStartChatWithPrompt('Explain the WonderAi tour operations dashboard');
                    }} 
                    className="hover:text-white transition-colors cursor-pointer"
                  >
                    Manage Tours
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => {
                      if (onSwitchToOperator) onSwitchToOperator();
                      else onStartChatWithPrompt('How do verified vendors connect with WonderAi?');
                    }} 
                    className="hover:text-white transition-colors cursor-pointer"
                  >
                    Vendor Network
                  </button>
                </li>
              </ul>

              <h5 className="text-xs font-bold text-white uppercase tracking-wider pt-3">Company</h5>
              <ul className="space-y-2 text-xs text-stone-400">
                <li><span className="text-stone-400">About WonderAi</span></li>
                <li><span className="text-stone-400">Contact & Support</span></li>
              </ul>
            </div>

          </div>

          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-stone-500 gap-4">
            <div>
              &copy; {new Date().getFullYear()} WonderAi Travel Technologies. All rights reserved.
            </div>
            <div className="flex items-center gap-6 text-stone-400">
              <span className="hover:text-white transition-colors cursor-pointer">Privacy Policy</span>
              <span className="hover:text-white transition-colors cursor-pointer">Terms of Service</span>
              <span className="hover:text-white transition-colors cursor-pointer">Security</span>
            </div>
          </div>

        </div>
      </footer>

    </div>
  );
}
