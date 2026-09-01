// Location Search Catalog & Smart Description Generator for TourFlow AI

export interface LocationSpot {
  name: string;
  category: 'Viewpoint' | 'Heritage' | 'Nature' | 'Beach' | 'Culture' | 'Adventure' | 'Dining' | 'Shopping' | 'Sightseeing';
  cost: number;
  duration_minutes: number;
  description: string;
  tips?: string;
  image_url?: string;
}

export const POPULAR_LOCATION_CATALOG: Record<string, LocationSpot[]> = {
  darjeeling: [
    {
      name: 'Tiger Hill Sunrise Vantage',
      category: 'Viewpoint',
      cost: 150,
      duration_minutes: 120,
      description: 'Panoramic Himalayan vantage point offering legendary dawn vistas of Mt. Kanchenjunga bathed in golden morning light. Early 4:00 AM departure recommended for peak visibility.',
      tips: 'Carry thermal jackets and reach by 4:45 AM for optimal viewing terrace seats.',
    },
    {
      name: 'Batasia Loop & Gorkha War Memorial',
      category: 'Heritage',
      cost: 50,
      duration_minutes: 60,
      description: 'Iconic spiral railway loop surrounded by landscaped manicured gardens, 360-degree Kanchenjunga views, and the solemn Gorkha War Memorial.',
      tips: 'Catch the UNESCO heritage steam train winding around the loop for dramatic photography.',
    },
    {
      name: 'Ghoom Tibetan Buddhist Monastery',
      category: 'Culture',
      cost: 0,
      duration_minutes: 45,
      description: 'Historic monastery founded in 1875 enshrining a magnificent 15-foot statue of Maitreya Future Buddha and antique Tibetan prayer scrolls.',
      tips: 'Spin the large prayer wheels clockwise and enjoy the tranquil incense atmosphere.',
    },
    {
      name: 'Happy Valley Tea Estate & Factory',
      category: 'Sightseeing',
      cost: 100,
      duration_minutes: 90,
      description: 'Darjeeling’s second oldest tea garden spanning 437 acres. Features guided artisanal tea plucking tours and aromatic multi-grade tea tasting sessions.',
      tips: 'Freshly packaged first-flush and muscatel orthodox teas available at estate cellar prices.',
    },
    {
      name: 'Japanese Peace Pagoda & Nipponzan Temple',
      category: 'Culture',
      cost: 0,
      duration_minutes: 60,
      description: 'Serene double-storied Buddhist pagoda showcasing 4 polished gold-leaf avatars of Lord Buddha with sweeping valley panoramas.',
      tips: 'Join the rhythmic evening prayer chants accompanied by traditional Japanese drums at 4:30 PM.',
    },
    {
      name: 'Padmaja Naidu Himalayan Zoological Park & HMI',
      category: 'Nature',
      cost: 120,
      duration_minutes: 120,
      description: 'High-altitude nature reserve conserving endangered Red Pandas, Snow Leopards, and Himalayan Black Bears, adjacent to the mountaineering museum.',
      tips: 'Closed on Thursdays. Combine with a visit to Tenzing Norgay memorial rock.',
    },
    {
      name: 'Mall Road & Chowrasta Promenade',
      category: 'Shopping',
      cost: 0,
      duration_minutes: 90,
      description: 'Pedestrian-only open promenade flanked by cedar trees, heritage tea cafes like Glenary’s and Das Studio, and Tibetan handcraft emporiums.',
      tips: 'Grab warm apple pies and Darjeeling brew on Glenary’s open balcony at dusk.',
    },
    {
      name: 'Rock Garden & Ganga Maya Park',
      category: 'Nature',
      cost: 100,
      duration_minutes: 120,
      description: 'Multi-tiered terraced garden cut through natural mountain cascades with stone seating bridges and vibrant flowering slopes.',
      tips: 'Scenic steep drive through tea valleys; great spot for family picnics and mountain stream photography.',
    },
  ],

  goa: [
    {
      name: 'Fort Aguada & 1864 Portuguese Lighthouse',
      category: 'Heritage',
      cost: 50,
      duration_minutes: 90,
      description: 'Well-preserved 17th-century Portuguese fortress commanding panoramic Arabian Sea views at the mouth of the Mandovi River.',
      tips: 'Best visited during late afternoon for cooler sea breezes and sunset silhouettes.',
    },
    {
      name: 'Dudhsagar Waterfalls Trek & Jeep Safari',
      category: 'Adventure',
      cost: 1500,
      duration_minutes: 240,
      description: 'Four-tiered 310m milky white cascade crashing through the Bhagwan Mahavir Wildlife Sanctuary with a natural jungle swimming pool.',
      tips: 'Mandatory life jackets provided. Keep snacks secure from sanctuary monkeys.',
    },
    {
      name: 'Basilica of Bom Jesus & Old Goa Cathedrals',
      category: 'Heritage',
      cost: 0,
      duration_minutes: 90,
      description: 'UNESCO World Heritage baroque landmark holding the sacred relics of St. Francis Xavier, featuring ornate gilded altars and carved wood pillars.',
      tips: 'Modest attire required covering shoulders and knees. Photography allowed in courtyards.',
    },
    {
      name: 'Baga & Calangute Beach Watersports Hub',
      category: 'Beach',
      cost: 1200,
      duration_minutes: 150,
      description: 'Bustling golden sands with parasailing, jet skiing, banana boat rides, and beachside shacks playing ambient sundowner tunes.',
      tips: 'Book certified tandem parasailing for aerial coastline photography.',
    },
    {
      name: 'Anjuna Flea Market & Curties Sunset Point',
      category: 'Shopping',
      cost: 0,
      duration_minutes: 120,
      description: 'Vibrant bohemian beachside bazaar offering handmade jewellery, spice mixes, brass sculptures, and beachwear overlooking volcanic cliff rocks.',
      tips: 'Wednesday markets are largest. Bargaining is standard practice.',
    },
    {
      name: 'Palolem Beach Kayaking & Butterfly Beach Boat Tour',
      category: 'Beach',
      cost: 600,
      duration_minutes: 120,
      description: 'Crescent-shaped serene South Goa bay lined with swaying coconut palms, shallow calm waters for sea kayaking, and dolphin spotting cruises.',
      tips: 'Rent double kayaks during morning high tide to explore secluded rocky coves.',
    },
  ],

  manali: [
    {
      name: 'Solang Valley Adventure & Paragliding Arena',
      category: 'Adventure',
      cost: 1800,
      duration_minutes: 180,
      description: 'High-altitude adventure meadow offering tandem paragliding flights, zorbing, ATV quad biking, and cable car ropeways against snow peaks.',
      tips: 'Fly early in the morning between 8:30 AM and 11:30 AM for steady thermals and clearest views.',
    },
    {
      name: 'Hadimba Devi Ancient Cedar Forest Temple',
      category: 'Heritage',
      cost: 0,
      duration_minutes: 60,
      description: '16th-century four-tiered pagoda temple constructed from carved deodar wood in the heart of Dhungri pine sanctuary.',
      tips: 'Photograph the centuries-old antler carvings and stroll the tranquil pine trails.',
    },
    {
      name: 'Jogini Falls Mountain Trail & Vashisht Hot Springs',
      category: 'Nature',
      cost: 0,
      duration_minutes: 120,
      description: 'Refreshing alpine trail passing through apple orchards and pine groves ending at cascading mountain falls, followed by natural sulfur baths.',
      tips: 'Wear sturdy grip shoes for the gentle 40-minute rocky ascent from Vashisht village.',
    },
    {
      name: 'Atal Tunnel & Sissu Waterfall Lahaul Valley Excursion',
      category: 'Sightseeing',
      cost: 800,
      duration_minutes: 240,
      description: 'Engineering marvel crossing under the Pir Panjal range into the rugged barren landscapes and crystal blue streams of Lahaul Valley.',
      tips: 'Carry warm windcheaters as temperature drops significantly on the North Portal side.',
    },
    {
      name: 'Old Manali Cafes & Live Acoustic Music Trail',
      category: 'Culture',
      cost: 450,
      duration_minutes: 120,
      description: 'Quaint stone-and-wood mountain village with rustic wooden balconies, artisan bakeries, wood-fired pizza ovens, and local craft shops.',
      tips: 'Try trout fish specialities and hot spiced apple cider at Cafe 1947 by the river.',
    },
  ],

  kerala: [
    {
      name: 'Alleppey Backwaters Houseboat Cruise',
      category: 'Nature',
      cost: 2500,
      duration_minutes: 240,
      description: 'Tranquil navigation through palm-lined lagoons, paddy fields, and narrow canals with freshly prepared authentic Kerala banana-leaf meals.',
      tips: 'Afternoon cruises offer the best birdwatching and peaceful village sunset reflections.',
    },
    {
      name: 'Munnar Kolukkumalai Sunrise & Tea Plantation Tour',
      category: 'Viewpoint',
      cost: 650,
      duration_minutes: 180,
      description: 'Highest organic tea estate in the world (7,900 ft) featuring cloud-bed sunrises and vintage orthodox tea manufacturing demonstrations.',
      tips: 'Jeep safari required from Suryanelli base; reach the peak before dawn.',
    },
    {
      name: 'Fort Kochi Heritage Walk & Chinese Fishing Nets',
      category: 'Heritage',
      cost: 0,
      duration_minutes: 90,
      description: 'Colonial maritime precinct with cantilevered Chinese fishing nets, Mattancherry Dutch Palace murals, and the historic Jewish Synagogue.',
      tips: 'Visit the nets around 5:30 PM to see local fishermen operating the counterweight wooden beams at sunset.',
    },
    {
      name: 'Periyar Tiger Reserve Boat Safari (Thekkady)',
      category: 'Nature',
      cost: 450,
      duration_minutes: 120,
      description: 'Protected wildlife sanctuary centered around an artificial lake where wild elephant herds, sambar deer, and rare aquatic birds congregate.',
      tips: 'Advance booking online recommended for the 7:30 AM morning safari slot.',
    },
    {
      name: 'Varkala Cliff Sunset Promenade & Beach',
      category: 'Beach',
      cost: 0,
      duration_minutes: 120,
      description: 'Striking red laterite geological cliffs overlooking the Arabian Sea, packed with organic seafood shacks, yoga shalas, and surf rentals.',
      tips: 'Climb down the cliff stairs to Papanasam Beach, known for mineral natural springs.',
    },
  ],

  kashmir: [
    {
      name: 'Dal Lake Shikara Ride & Floating Flower Market',
      category: 'Culture',
      cost: 800,
      duration_minutes: 90,
      description: 'Peaceful wooden gondola cruise through lotus pads, historic wooden houseboats, and floating vegetable and saffron bazaars in Srinagar.',
      tips: 'Dawn 5:30 AM shikara ride captures the authentic floating wholesale trade.',
    },
    {
      name: 'Gulmarg Gondola Phase 1 & 2 Apharwat Peak',
      category: 'Adventure',
      cost: 1650,
      duration_minutes: 210,
      description: 'World’s highest operating passenger cable car reaching 13,780 ft with year-round snow fields, skiing slopes, and Himalayan panorama.',
      tips: 'Phase 2 tickets sell out days in advance; keep government photo ID handy.',
    },
    {
      name: 'Betaab Valley & Aru Valley Alpine Meadows (Pahalgam)',
      category: 'Nature',
      cost: 300,
      duration_minutes: 180,
      description: 'Lush alpine basin surrounded by snow-covered mountain ridges, dense deodar forests, and the crystal Lidder River.',
      tips: 'Hire local ponies or enjoy an easy stroll along the river bank.',
    },
    {
      name: 'Mughal Gardens (Shalimar & Nishat Bagh)',
      category: 'Heritage',
      cost: 50,
      duration_minutes: 90,
      description: 'Terraced Persian-style pleasure gardens built by Emperor Jahangir featuring running water cascades, carved fountains, and ancient Chinar trees.',
      tips: 'Spring (April) and Autumn (October) offer vibrant flower beds and fiery golden Chinar leaves.',
    },
  ],

  bali: [
    {
      name: 'Uluwatu Sea Cliff Temple & Kecak Fire Dance',
      category: 'Culture',
      cost: 750,
      duration_minutes: 150,
      description: 'Dramatic temple perched atop a 70-meter limestone sea cliff, hosting the mesmerizing sunset Kecak dance performance against crashing ocean waves.',
      tips: 'Watch out for resident cliff monkeys; reserve amphitheatre tickets before 5:00 PM.',
    },
    {
      name: 'Tegallalang Emerald Rice Terraces & Jungle Swing',
      category: 'Nature',
      cost: 400,
      duration_minutes: 120,
      description: 'UNESCO-listed valley of stepped emerald paddy fields using the ancient Subak irrigation system, with iconic high-flying jungle swings.',
      tips: 'Visit early morning to avoid tour crowds and enjoy the soft morning mist.',
    },
    {
      name: 'Tirta Empul Holy Spring Purification Ritual',
      category: 'Culture',
      cost: 350,
      duration_minutes: 90,
      description: 'Ancient 10th-century water temple where travelers and locals participate in traditional Melukat purification baths under carved stone spouts.',
      tips: 'Special green sarongs are rented on-site for entering the holy spring pool.',
    },
    {
      name: 'Seminyak & Canggu Beach Sunset Beach Clubs',
      category: 'Beach',
      cost: 1000,
      duration_minutes: 180,
      description: 'World-renowned coastal sunset strip with infinity pools, oceanfront daybeds, artisan tropical cocktails, and live DJ sets.',
      tips: 'Book daybeds 1-2 days ahead if planning to visit during prime sunset hours (4:30 PM - 7:00 PM).',
    },
    {
      name: 'Nusa Penida Kelingking T-Rex Cliff & Broken Beach Day Trip',
      category: 'Adventure',
      cost: 2200,
      duration_minutes: 300,
      description: 'Iconic T-Rex shaped coastal limestone headland dropping into turquoise waters, accompanied by natural rock archways and manta ray viewpoints.',
      tips: 'Speedboats depart from Sanur harbour at 7:30 AM; bring cash for island environmental fees.',
    },
  ],

  puri: [
    {
      name: 'Shree Jagannath Temple & Heritage Complex',
      category: 'Culture',
      cost: 0,
      duration_minutes: 120,
      description: 'Sacred 12th-century holy shrine of the Char Dham pilgrimage renowned for its 214-foot soaring spire, mystical non-casting shadow flag, and Mahaprasad culinary traditions.',
      tips: 'Traditional dress required; phones and electronic leather items are kept in secure lockers outside the Lion Gate (Singhadwara).',
    },
    {
      name: 'Golden Beach & Puri Promenade',
      category: 'Beach',
      cost: 0,
      duration_minutes: 90,
      description: 'Blue Flag certified pristine coastal stretch offering soft sands, gentle surf, sand art showcases by master sculptors, and evening sea breeze walks.',
      tips: 'Best visited at sunrise for calm ocean walks and sunset for fresh seafood skewers.',
    },
    {
      name: 'Konark Sun Temple UNESCO World Heritage Site',
      category: 'Heritage',
      cost: 80,
      duration_minutes: 150,
      description: 'Monumental 13th-century chariot of the Sun God carved with 24 intricate stone sundial wheels and stone-sculpted galloping war horses.',
      tips: 'Located 35 km from Puri along the scenic Marine Drive. Evening light and sound show is exceptional.',
    },
    {
      name: 'Chilika Lake & Raghurajpur Heritage Crafts Village',
      category: 'Nature',
      cost: 950,
      duration_minutes: 240,
      description: 'Asia’s largest brackish water lagoon inhabited by Irrawaddy dolphins and migratory birds, coupled with the Pattachitra artisan painter village.',
      tips: 'Hire government-authorized motorized boats at Satapada for dolphin watching.',
    },
  ],

  'uttar pradesh': [
    {
      name: 'Varanasi Dashashwamedh Ghat Evening Ganga Aarti',
      category: 'Culture',
      cost: 300,
      duration_minutes: 120,
      description: 'Mesmerizing spiritual ceremony where Hindu priests perform synchronized fire rituals with brass lamps, conch shells, and chanting along the holy river.',
      tips: 'Hire a wooden boat by 5:30 PM to view the aarti directly from the river.',
    },
    {
      name: 'Taj Mahal Monument of Love (Agra)',
      category: 'Heritage',
      cost: 250,
      duration_minutes: 180,
      description: '17th-century white marble mausoleum commissioned by Mughal Emperor Shah Jahan, acclaimed globally as the jewel of Muslim art in India.',
      tips: 'Closed on Fridays. Enter through East Gate at sunrise for fewer crowds and soft golden glow on marble.',
    },
    {
      name: 'Sarnath Deer Park & Dhamek Stupa',
      category: 'Heritage',
      cost: 50,
      duration_minutes: 120,
      description: 'Holy site where Lord Buddha delivered his first sermon after enlightenment, featuring the 128-foot stone cylinder stupa and Ashoka pillar.',
      tips: 'Visit the adjacent archaeological museum housing the original 4-lion Ashoka Capital.',
    },
    {
      name: 'Bara Imambara & Bhulbhulaiya Maze (Lucknow)',
      category: 'Heritage',
      cost: 100,
      duration_minutes: 120,
      description: 'Grand 18th-century architectural complex built without beams or girders, featuring an intricate 3D acoustic maze of 489 identical doorways.',
      tips: 'Hire an authorized local guide to navigate the maze safely and witness whispering wall acoustics.',
    },
  ],

  china: [
    {
      name: 'Great Wall of China (Mutianyu Section & Cable Car)',
      category: 'Heritage',
      cost: 1800,
      duration_minutes: 240,
      description: 'Superbly preserved section of the monumental ancient stone fortification traversing steep forested mountain ridges with watchtowers and toboggan rides.',
      tips: 'Take the cable car up to Tower 14 and slide down the alpine toboggan for an unforgettable experience.',
    },
    {
      name: 'Forbidden City & Imperial Palace Museum (Beijing)',
      category: 'Heritage',
      cost: 650,
      duration_minutes: 180,
      description: 'Vast 720,000 sqm imperial palace complex with 980 surviving buildings, ornate red-and-gold halls, and courtyards of the Ming and Qing dynasties.',
      tips: 'Real-name passport booking required days in advance. Enter via the Meridian Gate.',
    },
    {
      name: 'The Bund & Huangpu River Evening Skyline Cruise (Shanghai)',
      category: 'Sightseeing',
      cost: 850,
      duration_minutes: 120,
      description: 'Historic colonial waterfront boulevard gazing across the river at the futuristic illuminated skyscrapers of Lujiazui and the Oriental Pearl Tower.',
      tips: 'Lighting turns on punctually at 7:00 PM; book open-top ferry tickets for unobstructed skyline photos.',
    },
    {
      name: 'Terracotta Army Emperor Qinshihuang Mausoleum (Xi’an)',
      category: 'Heritage',
      cost: 1200,
      duration_minutes: 210,
      description: 'Archaeological wonder discovering thousands of life-sized terracotta soldiers, battle horses, and bronze war chariots buried over 2,200 years ago.',
      tips: 'Pit 1 contains the largest infantry formation; rent an audio guide for deep historical context.',
    },
  ],

  thailand: [
    {
      name: 'Bangkok Grand Palace & Wat Phra Kaew (Emerald Buddha)',
      category: 'Heritage',
      cost: 1200,
      duration_minutes: 150,
      description: 'Spectacular royal complex featuring gold-leaf spires, mosaic-encrusted pagodas, and Thailand’s most sacred jade Buddha statue.',
      tips: 'Strict dress code: pants/long skirts covering ankles and sleeves covering shoulders required.',
    },
    {
      name: 'Phi Phi Islands Speedboat & Maya Bay Marine Tour (Phuket)',
      category: 'Adventure',
      cost: 2800,
      duration_minutes: 360,
      description: 'Crystal turquoise lagoons surrounded by towering limestone karsts, world-class coral reef snorkeling, and secluded white sand beaches.',
      tips: 'National park fees included; bring waterproof camera cases for snorkeling with reef fish.',
    },
    {
      name: 'Wat Arun (Temple of Dawn) Chao Phraya Ferry',
      category: 'Culture',
      cost: 250,
      duration_minutes: 90,
      description: 'Landmark riverfront Khmer-style prang tower decorated with millions of pieces of colorful Chinese porcelain and glazed ceramics.',
      tips: 'Rent traditional Thai costumes on-site for photography on the temple terraces.',
    },
    {
      name: 'Chiang Mai Night Bazaar & Street Food Trail',
      category: 'Shopping',
      cost: 400,
      duration_minutes: 120,
      description: 'Sprawling night market featuring Lanna silk handcrafts, silver jewellery, woodcarvings, and steaming stalls serving authentic Khao Soi noodle soup.',
      tips: 'Try freshly fried banana roti and mango sticky rice from street carts.',
    },
  ],

  dubai: [
    {
      name: 'Burj Khalifa Observation Deck (At the Top 124 & 125)',
      category: 'Viewpoint',
      cost: 3200,
      duration_minutes: 120,
      description: 'Soar up the world’s tallest tower in high-speed double-decker elevators to enjoy 360-degree vistas of Dubai’s skyline, desert, and Arabian Gulf.',
      tips: 'Sunset admission (5:00 PM - 6:30 PM) is the most sought-after slot for daytime-to-night transitions.',
    },
    {
      name: 'Dubai Desert 4x4 Dune Bashing & Bedouin Camp Safari',
      category: 'Adventure',
      cost: 2400,
      duration_minutes: 300,
      description: 'Thrilling rollercoaster ride over golden sand dunes, camel rides, sandboarding, falconry displays, and a lavish BBQ dinner with belly dancing.',
      tips: 'Wear comfortable slip-on footwear for desert sands and carry a light jacket for breezy evenings.',
    },
    {
      name: 'Dubai Mall & Dubai Fountain Synchronization Show',
      category: 'Sightseeing',
      cost: 0,
      duration_minutes: 90,
      description: 'World’s largest retail and entertainment destination with an Olympic ice rink, colossal indoor aquarium, and choreographed musical fountain dances.',
      tips: 'Fountain shows run every 30 minutes from 6:00 PM onwards outside the waterfront promenade.',
    },
    {
      name: 'Dubai Marina Luxury Yacht Cruise & JBR Walk',
      category: 'Sightseeing',
      cost: 1800,
      duration_minutes: 120,
      description: 'Glide past hyper-modern illuminated residential towers, Bluewaters Island, and the Ain Dubai observation wheel on a sunset catamaran.',
      tips: 'Includes soft refreshments and swimming stops in the lagoon during afternoon departures.',
    },
  ],
};

/**
 * Searches and returns matching location spots for a given destination and query.
 */
export function searchLocationsForDestination(
  destinationName: string | null | undefined,
  query = ''
): LocationSpot[] {
  const destClean = (destinationName || '').toLowerCase().trim();
  const qClean = query.toLowerCase().trim();

  // Find exact or closest destination match in catalog
  let spots: LocationSpot[] = [];
  for (const [key, list] of Object.entries(POPULAR_LOCATION_CATALOG)) {
    if (destClean.includes(key) || key.includes(destClean)) {
      spots = list;
      break;
    }
  }

  // If destination not in preset catalog, construct rich smart procedural spots for that destination
  if (spots.length === 0) {
    const dTitle = destinationName && destinationName.trim().length > 1 
      ? destinationName.trim() 
      : 'Local Destination';

    spots = [
      {
        name: `${dTitle} Historic Heritage & Old Town Quarter`,
        category: 'Heritage',
        cost: 100,
        duration_minutes: 90,
        description: `Explore the historical center of ${dTitle}, featuring iconic architecture, cobblestone alleys, and centuries of local heritage and folklore.`,
        tips: 'Comfortable walking shoes recommended; morning light provides ideal conditions for architectural photography.',
      },
      {
        name: `${dTitle} Panoramic Viewpoint & Sky Deck`,
        category: 'Viewpoint',
        cost: 250,
        duration_minutes: 60,
        description: `Highest vantage point in ${dTitle} offering breathtaking 360-degree panoramic perspectives over the city, valleys, and surrounding landscapes.`,
        tips: 'Visit around sunset to witness the city lights coming alive against the twilight skyline.',
      },
      {
        name: `${dTitle} Cultural Artisan Bazaar & Market Street`,
        category: 'Shopping',
        cost: 0,
        duration_minutes: 90,
        description: `Bustling local market packed with regional craft workshops, handwoven textiles, authentic spices, and street culinary delicacies of ${dTitle}.`,
        tips: 'Cash preferred by local vendors; feel free to sample traditional snacks and artisanal teas.',
      },
      {
        name: `${dTitle} Nature Reserve & Botanical Sanctuary`,
        category: 'Nature',
        cost: 150,
        duration_minutes: 120,
        description: `Tranquil green sanctuary showcasing indigenous flora, manicured nature pathways, tranquil water fountains, and birdwatching trails.`,
        tips: 'Great midday respite away from urban bustle with shady benches and scenic picnic spots.',
      },
      {
        name: `${dTitle} Traditional Culinary Tasting Tour`,
        category: 'Dining',
        cost: 650,
        duration_minutes: 90,
        description: `Immersive tasting experience sampling authentic chef-curated regional recipes, secret family sauces, and traditional beverages native to ${dTitle}.`,
        tips: 'Come with an appetite; vegetarian and dietary customization options readily available.',
      },
      {
        name: `${dTitle} Sunset Waterfront Promenade`,
        category: 'Beach',
        cost: 0,
        duration_minutes: 60,
        description: `Scenic paved promenade flanking the water with open-air cafes, vibrant street buskers, and spectacular golden hour views.`,
        tips: 'Grab a fresh beverage and relax on the benches as dusk settles over the horizon.',
      },
    ];
  }

  if (!qClean) return spots;

  // Filter spots by query
  return spots.filter(
    (s) =>
      s.name.toLowerCase().includes(qClean) ||
      s.category.toLowerCase().includes(qClean) ||
      s.description.toLowerCase().includes(qClean)
  );
}

/**
 * Automatically generates a comprehensive description and travel tips when a user enters any custom location name.
 */
export function generateAutoDescriptionForLocation(
  locationName: string,
  destinationName?: string
): { title: string; description: string; cost: number; category: string } {
  const loc = locationName.trim();
  const dest = destinationName ? destinationName.trim() : 'the region';
  const lLower = loc.toLowerCase();

  // Check if it exists in presets first
  const allPresets = searchLocationsForDestination(destinationName, loc);
  const exact = allPresets.find(p => p.name.toLowerCase() === lLower);
  if (exact) {
    return {
      title: exact.name,
      description: exact.description,
      cost: exact.cost,
      category: exact.category,
    };
  }

  // Detect category based on keywords
  let category = 'Sightseeing';
  let cost = 100;
  let desc = `Explore ${loc} in ${dest}. Enjoy guided exploration of the scenic grounds, notable architectural highlights, and local culture.`;

  if (/view|hill|peak|top|sunrise|sunset|deck|tower|point|lookout/i.test(lLower)) {
    category = 'Viewpoint';
    cost = 150;
    desc = `Spectacular vantage spot at ${loc} offering sweeping panoramic views across ${dest}. Ideal for photography, golden hour vistas, and relaxed scenic sightseeing.`;
  } else if (/temple|monastery|church|cathedral|mosque|shrine|basilica|ashram/i.test(lLower)) {
    category = 'Culture';
    cost = 0;
    desc = `Historic sacred landmark at ${loc}. Discover centuries of spiritual heritage, intricately carved sanctums, tranquil courtyards, and traditional prayer customs.`;
  } else if (/fort|palace|museum|memorial|monument|castle|tomb|ruins|heritage/i.test(lLower)) {
    category = 'Heritage';
    cost = 250;
    desc = `Architectural and historical landmark of ${dest} at ${loc}. Walk through preserved galleries, monumental ramparts, and historic chambers reflecting regal heritage.`;
  } else if (/beach|coast|cove|bay|island|kayak|snork|scuba|surf/i.test(lLower)) {
    category = 'Beach';
    cost = 300;
    desc = `Coastal sanctuary at ${loc} featuring pristine waters, soft sands, and refreshing maritime breezes. Perfect for water activities, coastal relaxation, and sunset walks.`;
  } else if (/waterfall|falls|lake|valley|forest|park|garden|trail|trek|woods|sanctuary/i.test(lLower)) {
    category = 'Nature';
    cost = 100;
    desc = `Refreshing natural escape at ${loc} surrounded by lush greenery and scenic hiking pathways. Experience fresh mountain air, rich biodiversity, and calming stream sounds.`;
  } else if (/market|bazaar|mall|shopping|street|chowk|promenade/i.test(lLower)) {
    category = 'Shopping';
    cost = 0;
    desc = `Vibrant shopping and artisan hub at ${loc}. Browse regional handicrafts, local souvenirs, authentic street food delicacies, and traditional wares.`;
  } else if (/food|cafe|restaurant|bistro|brewery|dine|dinner|lunch|breakfast|tea/i.test(lLower)) {
    category = 'Dining';
    cost = 500;
    desc = `Popular dining destination at ${loc} serving regional gastronomic specialties, chef-crafted signature platters, and locally brewed beverages in a warm atmosphere.`;
  } else if (/safari|paragliding|rafting|ride|cable|ropeway|climbing|bungee|atv|adventure/i.test(lLower)) {
    category = 'Adventure';
    cost = 1200;
    desc = `Thrilling outdoor adventure at ${loc}. Enjoy adrenaline-pumping guided activities, safety-certified equipment, and spectacular landscape perspectives.`;
  }

  return {
    title: loc.startsWith('Visit ') || loc.startsWith('Explore ') ? loc : `Visit ${loc}`,
    description: desc,
    cost,
    category,
  };
}
