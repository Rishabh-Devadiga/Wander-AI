import { geminiService, Type } from './services/geminiService';
import { logger } from './utils/logger';
import { ItineraryItem, TransportBookingOption, AccommodationOption } from '../types/tourflow';

// Curated image assets for authentic visual rendering
export const ATTRACTION_PHOTOS: Record<string, string[]> = {
  darjeeling: [
    'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1571401835393-8c5f35328320?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1622308644420-a92299839958?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1588714477688-cf28a50e94f7?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1596895111956-bf1cf0599ce5?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1534567153574-2b12153a87f0?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80',
  ],
  manali: [
    'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1605649487212-47bdab064df7?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1589182373726-e4f658ab50f0?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1578894381163-e72c17f2d45f?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1517824806704-9040b037703b?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1506012787146-f92b2d7d6d96?auto=format&fit=crop&w=800&q=80',
  ],
  bali: [
    'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1555400038-63f5ba517a47?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1544644181-1484b3fdfc62?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=800&q=80',
  ],
  goa: [
    'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1614082242765-7c98ca0f3df3?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1544644181-1484b3fdfc62?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1580227974546-f9479b183669?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1587922546307-776227941871?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
  ],
  kerala: [
    'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1593693397690-362cb9666fc2?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1596895111956-bf1cf0599ce5?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=800&q=80',
  ],
  london: [
    'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1529655683826-aba9b3e77383?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1533929736458-ca588d08c8be?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1508849789987-4e5333c12b78?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1543783207-ec64e4d95325?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1520986606214-8b456906c813?auto=format&fit=crop&w=800&q=80',
  ],
  puri: [
    'https://images.unsplash.com/photo-1609137144822-4a00e572074f?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1614082242765-7c98ca0f3df3?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
  ],
  china: [
    'https://images.unsplash.com/photo-1508804185872-d7badad00f7d?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1547981609-4b6bfe67ca0b?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1513415277900-a62401e19be4?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1528702748617-c64d49f918af?auto=format&fit=crop&w=800&q=80',
  ],
};

export interface RawDayPlanItem {
  day: number;
  date?: string;
  title: string;
  type: 'activity' | 'transport' | 'meal' | 'hotel' | 'sightseeing' | 'leisure';
  location: string;
  startTime: string;
  endTime: string;
  duration?: string;
  estimatedCost: number;
  description: string;
  image_url?: string;
}

export interface RawDayPlan {
  dayNumber: number;
  dayThemeTitle: string;
  geographicArea: string;
  items: RawDayPlanItem[];
}

// Rich Knowledge Base of 8+ distinct day clusters per destination
export const DESTINATION_KNOWLEDGE_BASE: Record<string, {
  days: RawDayPlan[];
  backupActivities: Array<{ title: string; desc: string; loc: string; cost: number; type: RawDayPlanItem['type']; time: [string, string]; image_url?: string }>;
}> = {
  china: {
    days: [
      {
        dayNumber: 1,
        dayThemeTitle: 'Beijing Arrival, Ancient Hutong Rickshaw Tour & Quanjude Roast Duck',
        geographicArea: 'Shichahai & Nanluoguxiang Hutongs, Beijing',
        items: [
          {
            day: 1,
            title: 'Nanluoguxiang Historic Hutong Courtyard Walk & Tea Tasting',
            type: 'activity',
            location: 'Nanluoguxiang, Dongcheng, Beijing',
            startTime: '04:00 PM',
            endTime: '06:30 PM',
            duration: '2.5 hrs',
            estimatedCost: 1200,
            description: 'Explore the ancient narrow gray-brick alleyways (hutongs) of Beijing, marveling at traditional Siheyuan courtyards and tasting local jasmine teas.',
            image_url: 'https://images.unsplash.com/photo-1547981609-4b6bfe67ca0b?auto=format&fit=crop&w=800&q=80',
          },
          {
            day: 1,
            title: 'Authentic Crispy Peking Roast Duck Welcome Dinner',
            type: 'meal',
            location: 'Quanjude / Bianyifang Heritage Restaurant, Beijing',
            startTime: '07:00 PM',
            endTime: '09:00 PM',
            duration: '2 hrs',
            estimatedCost: 2200,
            description: 'Savor traditional wood-fired Peking Duck hand-carved tableside, served with warm steamed pancakes, sweet bean sauce, scallions, and cucumber.',
            image_url: 'https://images.unsplash.com/photo-1508804185872-d7badad00f7d?auto=format&fit=crop&w=800&q=80',
          },
        ],
      },
      {
        dayNumber: 2,
        dayThemeTitle: 'Forbidden City Imperial Grandeur & Tiananmen Square',
        geographicArea: 'Imperial Core, Dongcheng District, Beijing',
        items: [
          {
            day: 2,
            title: 'Tiananmen Square & Meridian Gate Entry to The Forbidden City',
            type: 'sightseeing',
            location: 'Forbidden City (Palace Museum), Beijing',
            startTime: '08:30 AM',
            endTime: '01:00 PM',
            duration: '4.5 hrs',
            estimatedCost: 2400,
            description: 'Walk the majestic halls and golden-roofed pavilions where Ming and Qing emperors ruled China for five centuries, admiring imperial jade and porcelain.',
            image_url: 'https://images.unsplash.com/photo-1547981609-4b6bfe67ca0b?auto=format&fit=crop&w=800&q=80',
          },
          {
            day: 2,
            title: 'Jingshan Park Panoramic Pavilion & Royal Temple of Heaven',
            type: 'sightseeing',
            location: 'Temple of Heaven Park, Chongwen District',
            startTime: '02:30 PM',
            endTime: '06:00 PM',
            duration: '3.5 hrs',
            estimatedCost: 1500,
            description: 'Climb Jingshan Hill for the iconic overhead view of the Forbidden City roofs, then explore the Hall of Prayer for Good Harvests.',
            image_url: 'https://images.unsplash.com/photo-1513415277900-a62401e19be4?auto=format&fit=crop&w=800&q=80',
          },
        ],
      },
      {
        dayNumber: 3,
        dayThemeTitle: 'The Great Wall of China (Mutianyu) & Summer Palace',
        geographicArea: 'Huairou District & Haidian, Beijing',
        items: [
          {
            day: 3,
            title: 'Mutianyu Great Wall Hike & Scenic Cable Car Ride',
            type: 'activity',
            location: 'Mutianyu Great Wall, Huairou District',
            startTime: '08:00 AM',
            endTime: '01:30 PM',
            duration: '5.5 hrs',
            estimatedCost: 3200,
            description: 'Ascend the magnificent UNESCO world wonder surrounded by lush pine ridges, hiking across ancient granite watchtowers and taking the thrilling toboggan slide.',
            image_url: 'https://images.unsplash.com/photo-1508804185872-d7badad00f7d?auto=format&fit=crop&w=800&q=80',
          },
          {
            day: 3,
            title: 'Summer Palace Royal Gardens & Kunming Lake Dragon Boat',
            type: 'sightseeing',
            location: 'Summer Palace, Haidian District',
            startTime: '03:00 PM',
            endTime: '06:30 PM',
            duration: '3.5 hrs',
            estimatedCost: 1800,
            description: 'Glide across the tranquil Kunming Lake on a dragon boat, stroll through the painted Long Corridor, and gaze upon the Marble Boat.',
            image_url: 'https://images.unsplash.com/photo-1513415277900-a62401e19be4?auto=format&fit=crop&w=800&q=80',
          },
        ],
      },
      {
        dayNumber: 4,
        dayThemeTitle: 'High-Speed Bullet Train to Shanghai & The Bund Sunset',
        geographicArea: 'Huangpu River & The Bund, Shanghai',
        items: [
          {
            day: 4,
            title: 'Fuxing High-Speed Rail Journey to Shanghai (350 km/h)',
            type: 'transport',
            location: 'Beijing South to Shanghai Hongqiao Station',
            startTime: '08:30 AM',
            endTime: '01:00 PM',
            duration: '4.5 hrs',
            estimatedCost: 3800,
            description: 'Experience China’s world-leading high-speed bullet train smoothly crossing eastern China’s landscapes in record speed.',
            image_url: 'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?auto=format&fit=crop&w=800&q=80',
          },
          {
            day: 4,
            title: 'The Bund Historic Architecture Walk & Huangpu River Night Cruise',
            type: 'activity',
            location: 'Zhongshan East 1st Rd, The Bund, Shanghai',
            startTime: '05:30 PM',
            endTime: '08:30 PM',
            duration: '3 hrs',
            estimatedCost: 2000,
            description: 'Admire 1920s neoclassical architecture while viewing the dazzling futuristic neon skyline of Lujiazui across the Huangpu River.',
            image_url: 'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?auto=format&fit=crop&w=800&q=80',
          },
        ],
      },
      {
        dayNumber: 5,
        dayThemeTitle: 'Yu Garden Classical Pavilion, French Concession & Xiao Long Bao',
        geographicArea: 'Old City & French Concession, Shanghai',
        items: [
          {
            day: 5,
            title: 'Yu Garden Ming Dynasty Classical Gardens & Nine-Turning Bridge',
            type: 'sightseeing',
            location: 'Yu Garden, Huangpu District, Shanghai',
            startTime: '09:00 AM',
            endTime: '12:30 PM',
            duration: '3.5 hrs',
            estimatedCost: 1400,
            description: 'Wander across tranquil koi ponds, carved dragon walls, rockeries, and the famous Mid-Lake Pavilion Teahouse dating back to 1559.',
            image_url: 'https://images.unsplash.com/photo-1547981609-4b6bfe67ca0b?auto=format&fit=crop&w=800&q=80',
          },
          {
            day: 5,
            title: 'French Concession Plane Trees Walk, Tianzifang Arts & Din Tai Fung Lunch',
            type: 'activity',
            location: 'Tianzifang & Fuxing Middle Rd, Shanghai',
            startTime: '01:30 PM',
            endTime: '05:30 PM',
            duration: '4 hrs',
            estimatedCost: 1800,
            description: 'Explore boutique alley galleries in Shikumen buildings and enjoy world-famous steamed soup dumplings (Xiao Long Bao).',
            image_url: 'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?auto=format&fit=crop&w=800&q=80',
          },
        ],
      },
      {
        dayNumber: 6,
        dayThemeTitle: 'Shanghai Tower Top of Shanghai Observation & Souvenir Farewell',
        geographicArea: 'Lujiazui Financial District & Pudong, Shanghai',
        items: [
          {
            day: 6,
            title: 'Shanghai Tower 118th Floor Observation Deck (632m)',
            type: 'sightseeing',
            location: 'Shanghai Tower, Lujiazui Ring Rd, Pudong',
            startTime: '09:30 AM',
            endTime: '12:30 PM',
            duration: '3 hrs',
            estimatedCost: 2200,
            description: 'Take the world’s second-fastest elevator up to the clouds for a 360-degree panoramic vista across all of Shanghai and the Yangtze delta.',
            image_url: 'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?auto=format&fit=crop&w=800&q=80',
          },
        ],
      },
    ],
    backupActivities: [
      {
        title: '798 Art District Contemporary Galleries & Bauhaus Studios',
        desc: 'Explore converted 1950s military factory spaces filled with cutting-edge sculptures, photography exhibits, and hipster cafes.',
        loc: '798 Art Zone, Chaoyang District, Beijing',
        cost: 600,
        type: 'activity',
        time: ['02:00 PM', '05:00 PM'],
        image_url: 'https://images.unsplash.com/photo-1547981609-4b6bfe67ca0b?auto=format&fit=crop&w=800&q=80',
      },
      {
        title: 'Zhujiajiao Ancient Water Town Gondola Cruise & Stone Bridges',
        desc: 'Glide along 1,700-year-old canals lined with weeping willows, historic dynasty mansions, and traditional teahouses.',
        loc: 'Zhujiajiao Water Town, Qingpu District, Shanghai',
        cost: 1600,
        type: 'activity',
        time: ['09:00 AM', '01:00 PM'],
        image_url: 'https://images.unsplash.com/photo-1528702748617-c64d49f918af?auto=format&fit=crop&w=800&q=80',
      },
    ],
  },
  darjeeling: {
    days: [
      {
        dayNumber: 1,
        dayThemeTitle: 'Arrival, Chowrasta Stroll & Colonial Sunset',
        geographicArea: 'Darjeeling Town & Mall Road',
        items: [
          {
            day: 1,
            title: 'Chowrasta Mall Road Leisure Walk & Glenary’s Bakery',
            type: 'activity',
            location: 'The Mall, Chowrasta, Darjeeling',
            startTime: '04:30 PM',
            endTime: '07:00 PM',
            duration: '2.5 hrs',
            estimatedCost: 1200,
            description: 'Acclimatize with a peaceful evening stroll across pedestrian Mall Road, browsing historic Oxford Book & Stationery and sampling warm apple pies at heritage Glenary’s.',
            image_url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80',
          },
          {
            day: 1,
            title: 'Himalayan Welcome Dinner at Keventers Terrace / Kunga',
            type: 'meal',
            location: 'Clubside, Darjeeling',
            startTime: '07:30 PM',
            endTime: '09:00 PM',
            duration: '1.5 hrs',
            estimatedCost: 1800,
            description: 'Authentic Tibetan steamed momos, hot thukpa, and locally brewed Darjeeling first flush tea with panoramic nighttime valley views.',
            image_url: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=800&q=80',
          },
        ],
      },
      {
        dayNumber: 2,
        dayThemeTitle: 'Tiger Hill Sunrise, Batasia Loop & Ghoom Circuit',
        geographicArea: 'Ghoom & Tiger Hill Ridge',
        items: [
          {
            day: 2,
            title: 'Tiger Hill Dawn Sunrise over Mt. Kanchenjunga',
            type: 'sightseeing',
            location: 'Tiger Hill (2,590m), Senchal Wildlife Sanctuary',
            startTime: '04:30 AM',
            endTime: '07:30 AM',
            duration: '3 hrs',
            estimatedCost: 1800,
            description: 'Early morning private 4x4 drive to witness golden alpenglow illuminating the world’s third-highest peak (Mt. Kanchenjunga) and Mt. Everest.',
            image_url: 'https://images.unsplash.com/photo-1571401835393-8c5f35328320?auto=format&fit=crop&w=800&q=80',
          },
          {
            day: 2,
            title: 'Batasia Loop War Memorial & Scenic Mountain Spiral',
            type: 'sightseeing',
            location: 'Batasia Loop, Hill Cart Road, Ghoom',
            startTime: '08:30 AM',
            endTime: '10:00 AM',
            duration: '1.5 hrs',
            estimatedCost: 600,
            description: 'Marvel at the engineering marvel of the railway spiral loops and manicured landscaped gardens honoring brave Gorkha soldiers.',
            image_url: 'https://images.unsplash.com/photo-1622308644420-a92299839958?auto=format&fit=crop&w=800&q=80',
          },
          {
            day: 2,
            title: 'Ghoom Monastery (Yiga Choeling) & Sacred Maitreya Buddha',
            type: 'activity',
            location: 'Ghoom Monastery Road, Ghoom',
            startTime: '10:30 AM',
            endTime: '12:30 PM',
            duration: '2 hrs',
            estimatedCost: 500,
            description: 'Explore the revered 1850s Gelugpa monastery housing the 15-foot gold-leaf statue of the Future Buddha and historic Tibetan manuscripts.',
            image_url: 'https://images.unsplash.com/photo-1588714477688-cf28a50e94f7?auto=format&fit=crop&w=800&q=80',
          },
          {
            day: 2,
            title: 'UNESCO Himalayan Railway Heritage Steam Toy Train Joyride',
            type: 'activity',
            location: 'Darjeeling Station to Ghoom',
            startTime: '02:00 PM',
            endTime: '04:30 PM',
            duration: '2.5 hrs',
            estimatedCost: 3200,
            description: 'Iconic steam-locomotive joyride chugging along misty mountain cliffs, ringing vintage brass whistles and overlooking tea valleys.',
            image_url: 'https://images.unsplash.com/photo-1622308644420-a92299839958?auto=format&fit=crop&w=800&q=80',
          },
        ],
      },
      {
        dayNumber: 3,
        dayThemeTitle: 'Happy Valley Organic Tea Estate & Master Tasting',
        geographicArea: 'Happy Valley & Lebong Ridge',
        items: [
          {
            day: 3,
            title: 'Happy Valley Tea Estate Plucking Walk & Heritage Factory Tour',
            type: 'activity',
            location: 'Happy Valley Tea Estate, Lebong Cart Road',
            startTime: '09:30 AM',
            endTime: '12:30 PM',
            duration: '3 hrs',
            estimatedCost: 2200,
            description: 'Walk through rolling emerald slopes alongside local tea pluckers and learn the orthodox two-leaves-and-a-bud rolling and fermentation process.',
            image_url: 'https://images.unsplash.com/photo-1596895111956-bf1cf0599ce5?auto=format&fit=crop&w=800&q=80',
          },
          {
            day: 3,
            title: 'Sommelier Tea Cupping & Organic Tasting Experience',
            type: 'meal',
            location: 'Happy Valley Tasting Pavilion',
            startTime: '01:00 PM',
            endTime: '02:30 PM',
            duration: '1.5 hrs',
            estimatedCost: 1500,
            description: 'Sample spring First Flush, muscatel Second Flush, and fragrant White Teas paired with homemade highland finger sandwiches.',
            image_url: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=800&q=80',
          },
          {
            day: 3,
            title: 'Tibetan Refugee Self-Help Centre & Handloom Workshops',
            type: 'activity',
            location: 'Hill Side, Lebong, Darjeeling',
            startTime: '03:00 PM',
            endTime: '05:30 PM',
            duration: '2.5 hrs',
            estimatedCost: 800,
            description: 'Witness artisans handcrafting intricate Tibetan woolen carpets, thangka paintings, and wood carvings preserving ancient heritage.',
            image_url: 'https://images.unsplash.com/photo-1588714477688-cf28a50e94f7?auto=format&fit=crop&w=800&q=80',
          },
        ],
      },
      {
        dayNumber: 4,
        dayThemeTitle: 'HMI, Padmaja Naidu Himalayan Zoo & Ropeway',
        geographicArea: 'Jawahar Parbat & Singamari',
        items: [
          {
            day: 4,
            title: 'Himalayan Mountaineering Institute & Tenzing Norgay Memorial',
            type: 'sightseeing',
            location: 'Jawahar Parbat, Darjeeling',
            startTime: '09:00 AM',
            endTime: '11:30 AM',
            duration: '2.5 hrs',
            estimatedCost: 900,
            description: 'Explore historical expedition gear from Sir Edmund Hillary and Tenzing Norgay’s 1953 Everest summit alongside modern climbing archives.',
            image_url: 'https://images.unsplash.com/photo-1534567153574-2b12153a87f0?auto=format&fit=crop&w=800&q=80',
          },
          {
            day: 4,
            title: 'Padmaja Naidu Himalayan Zoological Park (Red Pandas & Snow Leopards)',
            type: 'sightseeing',
            location: 'Birch Hill Road, Darjeeling',
            startTime: '11:45 AM',
            endTime: '01:45 PM',
            duration: '2 hrs',
            estimatedCost: 1100,
            description: 'Visit India’s largest high-altitude zoo specialized in captive breeding of endangered Red Pandas, Snow Leopards, and Himalayan Black Bears.',
            image_url: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=800&q=80',
          },
          {
            day: 4,
            title: 'Rangeet Valley Passenger Cable Car / Ropeway Ride',
            type: 'activity',
            location: 'Singamari Ropeway Station',
            startTime: '02:30 PM',
            endTime: '04:30 PM',
            duration: '2 hrs',
            estimatedCost: 1600,
            description: 'Glide high over dense tea valleys and cascading mountain streams down to Tukvar Valley with breathtaking 360-degree aerial vistas.',
            image_url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80',
          },
        ],
      },
      {
        dayNumber: 5,
        dayThemeTitle: 'Japanese Peace Pagoda, Rock Garden & Chunnu Waterfalls',
        geographicArea: 'Jalapahar & Barbotey Valley',
        items: [
          {
            day: 5,
            title: 'Japanese Peace Pagoda & Nipponzan Myohoji Buddhist Temple',
            type: 'sightseeing',
            location: 'West Point, Jalapahar, Darjeeling',
            startTime: '09:00 AM',
            endTime: '11:00 AM',
            duration: '2 hrs',
            estimatedCost: 500,
            description: 'Serene towering white stupa showcasing four gold-carved avatars of Lord Buddha amidst tranquil alpine pine forests.',
            image_url: 'https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=800&q=80',
          },
          {
            day: 5,
            title: 'Barbotey Rock Garden & Chunnu Summer Waterfalls Excursion',
            type: 'activity',
            location: 'Rock Garden Road, Barbotey Valley',
            startTime: '11:45 AM',
            endTime: '02:30 PM',
            duration: '2.75 hrs',
            estimatedCost: 1400,
            description: 'Multi-tiered terraced waterfall garden sculpted directly out of mountain rock faces with winding footbridges and blooming flowerbeds.',
            image_url: 'https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?auto=format&fit=crop&w=800&q=80',
          },
          {
            day: 5,
            title: 'Ganga Maya Park Boating & Twilight Colonial Tea Lounge',
            type: 'leisure',
            location: 'Ganga Maya Valley, Darjeeling',
            startTime: '03:00 PM',
            endTime: '05:30 PM',
            duration: '2.5 hrs',
            estimatedCost: 1200,
            description: 'Peaceful pedal boating on fresh spring waters followed by evening hot chocolate and acoustic piano by the fireplace at Windamere Lounge.',
            image_url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80',
          },
        ],
      },
      {
        dayNumber: 6,
        dayThemeTitle: 'Mirik Lake Alpine Meadows & Tea Country Day Trip',
        geographicArea: 'Mirik Valley & Indo-Nepal Border',
        items: [
          {
            day: 6,
            title: 'Scenic Drive to Mirik Lake (Sumendu Lake) & Floating Arch Bridge',
            type: 'activity',
            location: 'Mirik Valley (1,495m), Darjeeling District',
            startTime: '09:00 AM',
            endTime: '01:00 PM',
            duration: '4 hrs',
            estimatedCost: 2800,
            description: 'Drive along rolling cardamom groves and pine ridges to the pristine mountain lake spanned by an 80-foot rainbow footbridge.',
            image_url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80',
          },
          {
            day: 6,
            title: 'Boating on Sumendu Lake & Pashupati Nagar Border Market',
            type: 'sightseeing',
            location: 'Mirik & Pashupati Nagar Indo-Nepal Border',
            startTime: '01:30 PM',
            endTime: '04:30 PM',
            duration: '3 hrs',
            estimatedCost: 1600,
            description: 'Enjoy tranquil family boating surrounded by cryptomeria pine groves and visit the unique Indo-Nepal trading outpost.',
            image_url: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=800&q=80',
          },
        ],
      },
      {
        dayNumber: 7,
        dayThemeTitle: 'Kurseong Land of White Orchids & Eagle’s Crag',
        geographicArea: 'Kurseong Valley',
        items: [
          {
            day: 7,
            title: 'Eagle’s Crag Viewpoint & Kurseong Dowhill Pine Forest Walk',
            type: 'sightseeing',
            location: 'Eagle’s Crag, Kurseong (1,458m)',
            startTime: '09:00 AM',
            endTime: '12:30 PM',
            duration: '3.5 hrs',
            estimatedCost: 1800,
            description: 'Panoramic views over the sprawling Siliguri plains, Teesta river meandering ribbons, and mystical Dowhill heritage schools.',
            image_url: 'https://images.unsplash.com/photo-1571401835393-8c5f35328320?auto=format&fit=crop&w=800&q=80',
          },
          {
            day: 7,
            title: 'Makaibari Biodynamic Tea Estate Tour & Workers Homestay Tea Session',
            type: 'activity',
            location: 'Makaibari, Kurseong',
            startTime: '01:30 PM',
            endTime: '04:30 PM',
            duration: '3 hrs',
            estimatedCost: 2000,
            description: 'Visit the world’s oldest registered tea factory producing celestial bio-dynamic Silver Tips Imperial moon-plucked tea.',
            image_url: 'https://images.unsplash.com/photo-1596895111956-bf1cf0599ce5?auto=format&fit=crop&w=800&q=80',
          },
        ],
      },
      {
        dayNumber: 8,
        dayThemeTitle: 'Botanical Gardens, Bhutia Handicrafts Market & Departure',
        geographicArea: 'Darjeeling Central & Lloyd Gardens',
        items: [
          {
            day: 8,
            title: 'Lloyd Botanical Gardens & Himalayan Orchid Conservatory',
            type: 'sightseeing',
            location: 'Lochnagar, Darjeeling',
            startTime: '09:00 AM',
            endTime: '11:00 AM',
            duration: '2 hrs',
            estimatedCost: 600,
            description: 'Stroll through preserved colonial glasshouses housing over 150 species of rare Himalayan alpine orchids and ancient rhododendrons.',
            image_url: 'https://images.unsplash.com/photo-1596895111956-bf1cf0599ce5?auto=format&fit=crop&w=800&q=80',
          },
          {
            day: 8,
            title: 'Bhutia Market Souvenir Shopping (Darjeeling Tea & Handknitted Woollens)',
            type: 'leisure',
            location: 'Chowrasta & Bhutia Market, Darjeeling',
            startTime: '11:15 AM',
            endTime: '01:00 PM',
            duration: '1.75 hrs',
            estimatedCost: 1500,
            description: 'Pick up authenticated estate wooden tea caddies, handcrafted prayer wheels, woolen shawls, and locally roasted coffee beans.',
            image_url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80',
          },
        ],
      },
    ],
    backupActivities: [
      {
        title: 'Singalila National Park Birdwatching & Manebhanjan Gateway Walk',
        desc: 'Spot rare blood pheasants, satyr tragopans, and fire-tailed sunbirds on the edge of the Himalayan ridge.',
        loc: 'Manebhanjan, Singalila Range',
        cost: 1800,
        type: 'activity',
        time: ['09:00 AM', '12:30 PM'],
        image_url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80',
      },
      {
        title: 'Tinchuley Village & Takdah Heritage Cedar Forest Trail',
        desc: 'Explore peaceful eco-tourism hamlets known for organic orange orchards and colonial British cantonment bungalows.',
        loc: 'Tinchuley Eco-Village',
        cost: 1600,
        type: 'activity',
        time: ['01:30 PM', '04:30 PM'],
        image_url: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=800&q=80',
      },
      {
        title: 'St. Andrew’s Colonial Church & Mahakal Temple Sacred Ridge',
        desc: 'Historical 1843 Anglican stone chapel and hilltop shrine where Hindu and Buddhist prayers co-mingle.',
        loc: 'Observatory Hill, Darjeeling',
        cost: 400,
        type: 'sightseeing',
        time: ['09:30 AM', '11:30 AM'],
        image_url: 'https://images.unsplash.com/photo-1588714477688-cf28a50e94f7?auto=format&fit=crop&w=800&q=80',
      },
      {
        title: 'Lamahatta Eco-Park Pine Canopy & Sacred Wishing Lake Hike',
        desc: 'Walk through manicured alpine gardens draped in vibrant Buddhist prayer flags up to the sacred hilltop lake.',
        loc: 'Lamahatta, Darjeeling Highway',
        cost: 1200,
        type: 'activity',
        time: ['02:00 PM', '04:30 PM'],
        image_url: 'https://images.unsplash.com/photo-1571401835393-8c5f35328320?auto=format&fit=crop&w=800&q=80',
      },
    ],
  },
  manali: {
    days: [
      {
        dayNumber: 1,
        dayThemeTitle: 'Arrival & Old Manali Cedar Pine Stroll',
        geographicArea: 'Old Manali & Mall Road',
        items: [
          {
            day: 1,
            title: 'Old Manali Village & Manu Temple Heritage Walk',
            type: 'activity',
            location: 'Old Manali Village',
            startTime: '04:30 PM',
            endTime: '07:00 PM',
            duration: '2.5 hrs',
            estimatedCost: 800,
            description: 'Unwind along stone-paved alleyways lined with wooden Kath-Kuni houses, apple orchards, and artisan cafes.',
            image_url: 'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=800&q=80',
          },
          {
            day: 1,
            title: 'Riverside Himachali Trout Dinner at Cafe 1947',
            type: 'meal',
            location: 'Manalsu River, Old Manali',
            startTime: '07:30 PM',
            endTime: '09:30 PM',
            duration: '2 hrs',
            estimatedCost: 2000,
            description: 'Fresh pan-fried Beas river trout, Himachali siddu, and warm spiced apple cider beside rushing mountain waters.',
            image_url: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=800&q=80',
          },
        ],
      },
      {
        dayNumber: 2,
        dayThemeTitle: 'Solang Valley High-Altitude Adventure & Cable Car',
        geographicArea: 'Solang Valley (2,560m)',
        items: [
          {
            day: 2,
            title: 'Solang Valley Tandem Paragliding & Ropeway Gondola to Anjani Mahadev',
            type: 'activity',
            location: 'Solang Valley Adventure Base Camp',
            startTime: '09:00 AM',
            endTime: '01:30 PM',
            duration: '4.5 hrs',
            estimatedCost: 3800,
            description: 'High-octane tandem flight with certified pilots overlooking snow-dusted Pir Panjal peaks followed by the panoramic gondola.',
            image_url: 'https://images.unsplash.com/photo-1605649487212-47bdab064df7?auto=format&fit=crop&w=800&q=80',
          },
          {
            day: 2,
            title: 'All-Terrain Quad Biking (ATV) & Zorbing through Alpine Meadows',
            type: 'activity',
            location: 'Solang Meadow Grounds',
            startTime: '02:30 PM',
            endTime: '05:00 PM',
            duration: '2.5 hrs',
            estimatedCost: 2200,
            description: 'Drive rugged 4x4 quad bikes along glacial stream banks and roll down green mountain slopes.',
            image_url: 'https://images.unsplash.com/photo-1506012787146-f92b2d7d6d96?auto=format&fit=crop&w=800&q=80',
          },
        ],
      },
      {
        dayNumber: 3,
        dayThemeTitle: 'Hadimba Pagoda Temple & Jogini Waterfall Pine Trek',
        geographicArea: 'Dhungri Forest & Vashisht Village',
        items: [
          {
            day: 3,
            title: 'Hadimba Devi 1553 AD Ancient Deodar Wood Pagoda Temple',
            type: 'sightseeing',
            location: 'Dhungri Forest Sanctuary, Manali',
            startTime: '09:30 AM',
            endTime: '11:30 AM',
            duration: '2 hrs',
            estimatedCost: 400,
            description: 'Centuries-old 4-tiered pagoda temple adorned with wood carvings of mythological motifs amidst giant cedar forest.',
            image_url: 'https://images.unsplash.com/photo-1589182373726-e4f658ab50f0?auto=format&fit=crop&w=800&q=80',
          },
          {
            day: 3,
            title: 'Jogini Waterfalls Scenic Pine Trek & Vashisht Natural Sulphur Springs',
            type: 'activity',
            location: 'Vashisht Village to Jogini Cascades',
            startTime: '12:30 PM',
            endTime: '04:30 PM',
            duration: '4 hrs',
            estimatedCost: 1200,
            description: 'Gentle family nature hike through apple orchards and pine groves ending at the roaring waterfall pool and therapeutic hot springs.',
            image_url: 'https://images.unsplash.com/photo-1578894381163-e72c17f2d45f?auto=format&fit=crop&w=800&q=80',
          },
        ],
      },
      {
        dayNumber: 4,
        dayThemeTitle: 'Atal Tunnel Engineering Marvel & Sissu Lahaul Valley Excursion',
        geographicArea: 'Atal Tunnel & Lahaul Valley',
        items: [
          {
            day: 4,
            title: 'Drive through Atal Tunnel (9.02 km) to Sissu Waterfall & Chandra River',
            type: 'activity',
            location: 'Sissu (3,120m), Lahaul Valley',
            startTime: '09:00 AM',
            endTime: '02:00 PM',
            duration: '5 hrs',
            estimatedCost: 4200,
            description: 'Cross beneath Rohtang Pass into the dramatic trans-Himalayan desert landscape to witness the 50-meter Sissu glacier waterfall.',
            image_url: 'https://images.unsplash.com/photo-1517824806704-9040b037703b?auto=format&fit=crop&w=800&q=80',
          },
          {
            day: 4,
            title: 'Zip-lining over Chandra River & Tibetan Butter Tea Experience',
            type: 'activity',
            location: 'Sissu Adventure Park',
            startTime: '02:30 PM',
            endTime: '04:30 PM',
            duration: '2 hrs',
            estimatedCost: 1800,
            description: 'Thrilling aerial zip-line soaring directly across the crystal blue Chandra river with views of hanging glaciers.',
            image_url: 'https://images.unsplash.com/photo-1506012787146-f92b2d7d6d96?auto=format&fit=crop&w=800&q=80',
          },
        ],
      },
      {
        dayNumber: 5,
        dayThemeTitle: 'Naggar Castle Heritage & Nicholas Roerich Art Gallery',
        geographicArea: 'Naggar Valley',
        items: [
          {
            day: 5,
            title: 'Naggar Castle 15th-Century Royal Timber Citadel',
            type: 'sightseeing',
            location: 'Naggar Heritage Town (1,760m)',
            startTime: '09:30 AM',
            endTime: '12:30 PM',
            duration: '3 hrs',
            estimatedCost: 1400,
            description: 'Historic seat of the Kullu Rajas built in earthquake-resistant stone-and-timber architecture with unmatched Beas valley vistas.',
            image_url: 'https://images.unsplash.com/photo-1589182373726-e4f658ab50f0?auto=format&fit=crop&w=800&q=80',
          },
          {
            day: 5,
            title: 'Nicholas Roerich International Art Estate & Tripura Sundari Temple',
            type: 'activity',
            location: 'Roerich Estate, Naggar',
            startTime: '01:30 PM',
            endTime: '04:30 PM',
            duration: '3 hrs',
            estimatedCost: 900,
            description: 'Explore the private mountain studio of the famed Russian philosopher-painter showcasing luminous Himalayan canvases.',
            image_url: 'https://images.unsplash.com/photo-1578894381163-e72c17f2d45f?auto=format&fit=crop&w=800&q=80',
          },
        ],
      },
      {
        dayNumber: 6,
        dayThemeTitle: 'Mall Road Woollens, Tibetan Monastery & Return Departure',
        geographicArea: 'Manali Town Center',
        items: [
          {
            day: 6,
            title: 'Himalayan Nyingmapa Tibetan Buddhist Monastery & Prayer Wheels',
            type: 'sightseeing',
            location: 'Mall Road, Manali',
            startTime: '09:30 AM',
            endTime: '11:00 AM',
            duration: '1.5 hrs',
            estimatedCost: 300,
            description: 'Peaceful morning spin of brass prayer wheels and viewing colorful Buddhist frescoes in central Manali.',
            image_url: 'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=800&q=80',
          },
          {
            day: 6,
            title: 'Mall Road Artisan Shopping (Kullu Shawls, Pure Honey & Apple Jams)',
            type: 'leisure',
            location: 'Manali Mall Road & Tibetan Market',
            startTime: '11:15 AM',
            endTime: '01:00 PM',
            duration: '1.75 hrs',
            estimatedCost: 1500,
            description: 'Pick up authenticated Handloom Kullu woollen caps, pashminas, organic pine honey, and Himalayan dried apricots.',
            image_url: 'https://images.unsplash.com/photo-1517824806704-9040b037703b?auto=format&fit=crop&w=800&q=80',
          },
        ],
      },
    ],
    backupActivities: [
      {
        title: 'Hampta Pass Trekkers Base & Sethan Igloo Village Excursion',
        desc: 'Explore the scenic Buddhist village of Sethan perched atop granite cliffs above the tree line.',
        loc: 'Sethan Valley, Manali',
        cost: 2400,
        type: 'activity',
        time: ['09:00 AM', '01:00 PM'],
        image_url: 'https://images.unsplash.com/photo-1506012787146-f92b2d7d6d96?auto=format&fit=crop&w=800&q=80',
      },
      {
        title: 'Manali Nature Park Deodar Forest Walk & Beas Riverside Picnic',
        desc: 'Stroll through protected virgin cedar woods flanking the roaring glacial river.',
        loc: 'Van Vihar National Park',
        cost: 400,
        type: 'leisure',
        time: ['02:00 PM', '04:30 PM'],
        image_url: 'https://images.unsplash.com/photo-1578894381163-e72c17f2d45f?auto=format&fit=crop&w=800&q=80',
      },
    ],
  },
  goa: {
    days: [
      {
        dayNumber: 1,
        dayThemeTitle: 'Arrival & Candolim Beach Golden Hour Sunset',
        geographicArea: 'North Goa Coast',
        items: [
          {
            day: 1,
            title: 'Candolim Beachside Sunset & Fresh Tender Coconut Refreshment',
            type: 'leisure',
            location: 'Candolim Beach, North Goa',
            startTime: '04:30 PM',
            endTime: '06:30 PM',
            duration: '2 hrs',
            estimatedCost: 800,
            description: 'Unwind along golden sands dipping your toes in warm Arabian sea waters with coastal sea breeze.',
            image_url: 'https://images.unsplash.com/photo-1544644181-1484b3fdfc62?auto=format&fit=crop&w=800&q=80',
          },
          {
            day: 1,
            title: 'Authentic Goan Seafood Dinner at Fisherman’s Wharf',
            type: 'meal',
            location: 'Calangute / Panaji Waterfront',
            startTime: '07:30 PM',
            endTime: '09:30 PM',
            duration: '2 hrs',
            estimatedCost: 2200,
            description: 'Fresh Kingfish rava fry, butter garlic tiger prawns, and traditional Goan prawn curry with poi bread.',
            image_url: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=800&q=80',
          },
        ],
      },
      {
        dayNumber: 2,
        dayThemeTitle: 'Fort Aguada Lighthouse & Baga Watersports',
        geographicArea: 'Sinquerim & Baga Bay',
        items: [
          {
            day: 2,
            title: 'Fort Aguada 17th-Century Portuguese Citadel & Lighthouse',
            type: 'sightseeing',
            location: 'Sinquerim Hilltop, Candolim',
            startTime: '09:00 AM',
            endTime: '11:30 AM',
            duration: '2.5 hrs',
            estimatedCost: 1200,
            description: 'Explore the monumental hilltop fortress overlooking the vast confluence of the Mandovi River and the Arabian Sea.',
            image_url: 'https://images.unsplash.com/photo-1614082242765-7c98ca0f3df3?auto=format&fit=crop&w=800&q=80',
          },
          {
            day: 2,
            title: 'Baga Beach Watersports (Parasailing, Jet Ski & Bumper Ride)',
            type: 'activity',
            location: 'Baga Beach Watersport Bay',
            startTime: '01:30 PM',
            endTime: '04:30 PM',
            duration: '3 hrs',
            estimatedCost: 3800,
            description: 'High-octane guided watersport adventure with certified instructors and safety lifejackets.',
            image_url: 'https://images.unsplash.com/photo-1544644181-1484b3fdfc62?auto=format&fit=crop&w=800&q=80',
          },
        ],
      },
      {
        dayNumber: 3,
        dayThemeTitle: 'UNESCO Old Goa Churches & Sahakari Organic Spice Plantation',
        geographicArea: 'Old Goa & Ponda Foothills',
        items: [
          {
            day: 3,
            title: 'Basilica of Bom Jesus & Se Cathedral Heritage Walk',
            type: 'sightseeing',
            location: 'Old Goa UNESCO Heritage Complex',
            startTime: '09:30 AM',
            endTime: '12:00 PM',
            duration: '2.5 hrs',
            estimatedCost: 600,
            description: 'Marvel at 400-year-old Baroque architecture housing the sacred relics of St. Francis Xavier and the largest church bell in Asia.',
            image_url: 'https://images.unsplash.com/photo-1580227974546-f9479b183669?auto=format&fit=crop&w=800&q=80',
          },
          {
            day: 3,
            title: 'Sahakari Spice Plantation Guided Tour & Traditional Goan Banana-Leaf Buffet',
            type: 'activity',
            location: 'Curti, Ponda, Goa',
            startTime: '01:00 PM',
            endTime: '04:30 PM',
            duration: '3.5 hrs',
            estimatedCost: 2600,
            description: 'Walk through lush vanilla, cinnamon, and nutmeg groves followed by authentic local buffet and herbal welcome drinks.',
            image_url: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=800&q=80',
          },
        ],
      },
      {
        dayNumber: 4,
        dayThemeTitle: 'Dudhsagar Waterfalls 4x4 Jungle Safari Excursion',
        geographicArea: 'Bhagwan Mahavir Wildlife Sanctuary',
        items: [
          {
            day: 4,
            title: 'Dudhsagar Four-Tiered Milky Waterfalls Open-Top 4x4 Jeep Safari',
            type: 'activity',
            location: 'Mollem National Park & Dudhsagar',
            startTime: '08:30 AM',
            endTime: '02:30 PM',
            duration: '6 hrs',
            estimatedCost: 4400,
            description: 'Drive through dense Western Ghats jungle streams to the roaring 310m milky waterfall and swim in pristine natural pools.',
            image_url: 'https://images.unsplash.com/photo-1587922546307-776227941871?auto=format&fit=crop&w=800&q=80',
          },
          {
            day: 4,
            title: 'Mandovi River Sunset Luxury Catamaran Cruise with Folk Dance',
            type: 'activity',
            location: 'Santa Monica Jetty, Panaji',
            startTime: '05:30 PM',
            endTime: '07:30 PM',
            duration: '2 hrs',
            estimatedCost: 2000,
            description: 'Glide past illuminated colonial riverfront promenades accompanied by traditional Dekhni and Fugdi folk dances.',
            image_url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
          },
        ],
      },
      {
        dayNumber: 5,
        dayThemeTitle: 'South Goa Pristine Beaches (Palolem & Butterfly Beach) Dolphin Safari',
        geographicArea: 'Canacona & South Goa',
        items: [
          {
            day: 5,
            title: 'Palolem Crescent Beach Boat Safari & Butterfly Beach Dolphin Spotting',
            type: 'activity',
            location: 'Palolem Beach, South Goa',
            startTime: '09:00 AM',
            endTime: '01:00 PM',
            duration: '4 hrs',
            estimatedCost: 2800,
            description: 'Morning catamaran cruise along tranquil coves to spot wild Indo-Pacific humpback dolphins and swim in turquoise waters.',
            image_url: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=800&q=80',
          },
          {
            day: 5,
            title: 'Cabo de Rama Fort Clifftop Panorama & Beach Lounge Sunset',
            type: 'sightseeing',
            location: 'Cabo de Rama, Canacona',
            startTime: '03:30 PM',
            endTime: '06:30 PM',
            duration: '3 hrs',
            estimatedCost: 1200,
            description: 'Ancient cliff fortress with dramatic sheer drops into the azure Arabian Sea and unobstructed horizon sunset.',
            image_url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
          },
        ],
      },
      {
        dayNumber: 6,
        dayThemeTitle: 'Fontainhas Latin Quarter Photo Walk & Homeward Transit',
        geographicArea: 'Panaji Heritage Quarter',
        items: [
          {
            day: 6,
            title: 'Fontainhas Colourful Portuguese Latin Quarter Heritage Walk',
            type: 'sightseeing',
            location: 'Fontainhas, Panaji',
            startTime: '09:30 AM',
            endTime: '11:30 AM',
            duration: '2 hrs',
            estimatedCost: 600,
            description: 'Stroll cobblestone lanes with pastel-painted Portuguese villas, Azulejos ceramic tiles, and quaint heritage bakeries.',
            image_url: 'https://images.unsplash.com/photo-1580227974546-f9479b183669?auto=format&fit=crop&w=800&q=80',
          },
          {
            day: 6,
            title: 'Goan Cashew Nut & Feni Artisan Tasting at Panaji Municipal Market',
            type: 'leisure',
            location: 'Panaji Market, Goa',
            startTime: '11:45 AM',
            endTime: '01:00 PM',
            duration: '1.25 hrs',
            estimatedCost: 1500,
            description: 'Sample roasted organic W240 cashews, local spices, bebinca layered dessert cakes, and handcrafted souvenirs.',
            image_url: 'https://images.unsplash.com/photo-1544644181-1484b3fdfc62?auto=format&fit=crop&w=800&q=80',
          },
        ],
      },
    ],
    backupActivities: [
      {
        title: 'Chapora Fort (Dil Chahta Hai Point) & Vagator Red Cliff Stroll',
        desc: 'Iconic clappboard ramparts overlooking Ozran beach and Morjim sandbar.',
        loc: 'Chapora, Vagator',
        cost: 500,
        type: 'sightseeing',
        time: ['04:00 PM', '06:30 PM'],
        image_url: 'https://images.unsplash.com/photo-1614082242765-7c98ca0f3df3?auto=format&fit=crop&w=800&q=80',
      },
      {
        title: 'Sal Backwaters Kayaking & Mangrove Birdwatching Expedition',
        desc: 'Paddle quietly through serene mangrove canopies spotting kingfishers and river otters.',
        loc: 'Sal River, Mobor',
        cost: 2200,
        type: 'activity',
        time: ['08:30 AM', '11:30 AM'],
        image_url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
      },
    ],
  },
  london: {
    days: [
      {
        dayNumber: 1,
        dayThemeTitle: 'Arrival, Thames South Bank Stroll & Traditional Pub Welcome',
        geographicArea: 'South Bank & Westminster',
        items: [
          {
            day: 1,
            title: 'Thames South Bank Promenade & Millennium Bridge Twilight Walk',
            type: 'activity',
            location: 'South Bank, London',
            startTime: '04:30 PM',
            endTime: '07:00 PM',
            duration: '2.5 hrs',
            estimatedCost: 1500,
            description: 'Stroll along the lively pedestrian South Bank with views of the London Eye, Shakespeare’s Globe, and St. Paul’s Cathedral across the river.',
            image_url: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=800&q=80',
          },
          {
            day: 1,
            title: 'Classic British Gastropub Welcome Dinner & Ale Tasting',
            type: 'meal',
            location: 'The Anchor Bankside / Southwark',
            startTime: '07:30 PM',
            endTime: '09:30 PM',
            duration: '2 hrs',
            estimatedCost: 3500,
            description: 'Enjoy crisp golden fish & chips, shepherd’s pie, artisan craft ales, and sticky toffee pudding in a riverside tavern.',
            image_url: 'https://images.unsplash.com/photo-1533929736458-ca588d08c8be?auto=format&fit=crop&w=800&q=80',
          },
        ],
      },
      {
        dayNumber: 2,
        dayThemeTitle: 'Royal Westminster, Buckingham Palace & British Museum',
        geographicArea: 'Westminster & Bloomsbury',
        items: [
          {
            day: 2,
            title: 'Westminster Abbey & Big Ben Palace of Westminster Tour',
            type: 'sightseeing',
            location: 'Parliament Square, Westminster',
            startTime: '09:00 AM',
            endTime: '11:30 AM',
            duration: '2.5 hrs',
            estimatedCost: 3200,
            description: 'Visit the historic coronation church of British monarchs dating back to 1066 and iconic Big Ben bell tower.',
            image_url: 'https://images.unsplash.com/photo-1529655683826-aba9b3e77383?auto=format&fit=crop&w=800&q=80',
          },
          {
            day: 2,
            title: 'Buckingham Palace Changing of the Guard & St. James’s Park',
            type: 'sightseeing',
            location: 'Buckingham Palace Road, London',
            startTime: '11:45 AM',
            endTime: '01:00 PM',
            duration: '1.25 hrs',
            estimatedCost: 0,
            description: 'Witness the iconic military ceremony of the King’s Guard in full red tunics and bearskin caps.',
            image_url: 'https://images.unsplash.com/photo-1529655683826-aba9b3e77383?auto=format&fit=crop&w=800&q=80',
          },
          {
            day: 2,
            title: 'The British Museum Guided Highlights (Rosetta Stone & Parthenon Sculptures)',
            type: 'activity',
            location: 'Great Russell Street, Bloomsbury',
            startTime: '02:30 PM',
            endTime: '05:30 PM',
            duration: '3 hrs',
            estimatedCost: 1800,
            description: 'Explore the vast glass-domed Great Court housing world-renowned treasures of human history and civilization.',
            image_url: 'https://images.unsplash.com/photo-1508849789987-4e5333c12b78?auto=format&fit=crop&w=800&q=80',
          },
        ],
      },
      {
        dayNumber: 3,
        dayThemeTitle: 'Tower of London, Tower Bridge Walkway & Borough Market',
        geographicArea: 'City of London & London Bridge',
        items: [
          {
            day: 3,
            title: 'Tower of London Crown Jewels & Medieval Fortress Tour',
            type: 'sightseeing',
            location: 'Tower Hill, London EC3N 4AB',
            startTime: '09:30 AM',
            endTime: '12:00 PM',
            duration: '2.5 hrs',
            estimatedCost: 3800,
            description: 'Meet the Yeoman Warders (Beefeaters), see the sparkling Crown Jewels and 1000-year-old White Tower.',
            image_url: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=800&q=80',
          },
          {
            day: 3,
            title: 'Tower Bridge Glass Floor High-Level Walkway & Engine Rooms',
            type: 'activity',
            location: 'Tower Bridge Road, London',
            startTime: '12:15 PM',
            endTime: '01:30 PM',
            duration: '1.25 hrs',
            estimatedCost: 1600,
            description: 'Walk across the suspended glass floor 42 meters above the River Thames watching London traffic beneath your feet.',
            image_url: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=800&q=80',
          },
          {
            day: 3,
            title: 'Borough Market Artisan Street Food Safari & Coffee Tasting',
            type: 'meal',
            location: 'Southwark Street, London Bridge',
            startTime: '02:00 PM',
            endTime: '04:30 PM',
            duration: '2.5 hrs',
            estimatedCost: 2800,
            description: 'Sample artisanal British cheeses, truffled risotto, hot salt beef bagels, and freshly baked Portuguese pastries.',
            image_url: 'https://images.unsplash.com/photo-1543783207-ec64e4d95325?auto=format&fit=crop&w=800&q=80',
          },
        ],
      },
      {
        dayNumber: 4,
        dayThemeTitle: 'Kensington Palace, Royal Museums & Hyde Park Rowing',
        geographicArea: 'South Kensington & Hyde Park',
        items: [
          {
            day: 4,
            title: 'Natural History Museum & Victoria and Albert (V&A) Design Galleries',
            type: 'sightseeing',
            location: 'Cromwell Road, South Kensington',
            startTime: '09:30 AM',
            endTime: '12:30 PM',
            duration: '3 hrs',
            estimatedCost: 1200,
            description: 'Marvel at the iconic blue whale skeleton in Hintze Hall and world-class fashion, sculpture, and design exhibitions.',
            image_url: 'https://images.unsplash.com/photo-1508849789987-4e5333c12b78?auto=format&fit=crop&w=800&q=80',
          },
          {
            day: 4,
            title: 'Hyde Park Serpentine Boating & Kensington Palace Sunken Garden Walk',
            type: 'activity',
            location: 'Hyde Park & Kensington Gardens',
            startTime: '02:00 PM',
            endTime: '05:00 PM',
            duration: '3 hrs',
            estimatedCost: 2200,
            description: 'Pedal boat across the Serpentine lake, stroll past Princess Diana Memorial Fountain, and admire Kensington Palace gardens.',
            image_url: 'https://images.unsplash.com/photo-1533929736458-ca588d08c8be?auto=format&fit=crop&w=800&q=80',
          },
        ],
      },
      {
        dayNumber: 5,
        dayThemeTitle: 'Greenwich Royal Observatory, Prime Meridian & Thames Clipper Cruise',
        geographicArea: 'Maritime Greenwich',
        items: [
          {
            day: 5,
            title: 'Thames Uber Boat / Clipper Scenic River Voyage to Greenwich',
            type: 'activity',
            location: 'Westminster Pier to Greenwich Pier',
            startTime: '09:30 AM',
            endTime: '10:45 AM',
            duration: '1.25 hrs',
            estimatedCost: 1400,
            description: 'High-speed catamaran cruise beneath Tower Bridge past Canary Wharf skyscrapers and the historic London Docklands.',
            image_url: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=800&q=80',
          },
          {
            day: 5,
            title: 'Royal Observatory Greenwich & Historic Prime Meridian Line (GMT)',
            type: 'sightseeing',
            location: 'Blackheath Avenue, Greenwich Park',
            startTime: '11:15 AM',
            endTime: '02:00 PM',
            duration: '2.75 hrs',
            estimatedCost: 2400,
            description: 'Stand with one foot in the eastern hemisphere and one in the western hemisphere on the world-famous Longitude 0° meridian.',
            image_url: 'https://images.unsplash.com/photo-1520986606214-8b456906c813?auto=format&fit=crop&w=800&q=80',
          },
          {
            day: 5,
            title: 'Cutty Sark 1869 Tea Clipper Ship & Greenwich Market Stalls',
            type: 'activity',
            location: 'King William Walk, Greenwich',
            startTime: '02:30 PM',
            endTime: '05:00 PM',
            duration: '2.5 hrs',
            estimatedCost: 2000,
            description: 'Explore the world’s sole surviving tea clipper sailing ship that raced across the oceans from China and India.',
            image_url: 'https://images.unsplash.com/photo-1533929736458-ca588d08c8be?auto=format&fit=crop&w=800&q=80',
          },
        ],
      },
      {
        dayNumber: 6,
        dayThemeTitle: 'Covent Garden Street Performers, West End & Departure',
        geographicArea: 'Covent Garden & Soho',
        items: [
          {
            day: 6,
            title: 'Covent Garden Piazza & Apple Market Heritage Crafts Stroll',
            type: 'leisure',
            location: 'Covent Garden, London WC2E 8RF',
            startTime: '09:30 AM',
            endTime: '11:30 AM',
            duration: '2 hrs',
            estimatedCost: 800,
            description: 'Enjoy world-famous acoustic street performers and browse bespoke handmade leather goods, artwork, and tea boutiques.',
            image_url: 'https://images.unsplash.com/photo-1543783207-ec64e4d95325?auto=format&fit=crop&w=800&q=80',
          },
          {
            day: 6,
            title: 'Fortnum & Mason Afternoon Tea Keepsakes & Regent Street Souvenirs',
            type: 'leisure',
            location: 'Piccadilly & Regent Street',
            startTime: '11:45 AM',
            endTime: '01:00 PM',
            duration: '1.25 hrs',
            estimatedCost: 2500,
            description: 'Pick up authentic royal blend teas, English shortbread biscuits, and London keepsake souvenirs before Heathrow transfer.',
            image_url: 'https://images.unsplash.com/photo-1543783207-ec64e4d95325?auto=format&fit=crop&w=800&q=80',
          },
        ],
      },
    ],
    backupActivities: [
      {
        title: 'St. Paul’s Cathedral Dome Climb & Whispering Gallery',
        desc: 'Climb to the Golden Gallery at the top of Sir Christopher Wren’s dome for 360-degree London vistas.',
        loc: 'St. Paul’s Churchyard, London',
        cost: 2600,
        type: 'sightseeing',
        time: ['10:00 AM', '12:30 PM'],
        image_url: 'https://images.unsplash.com/photo-1520986606214-8b456906c813?auto=format&fit=crop&w=800&q=80',
      },
      {
        title: 'Tate Modern Contemporary Art & Turbine Hall',
        desc: 'Explore groundbreaking contemporary installations in the converted Bankside power station with free general admission.',
        loc: 'Bankside, London SE1 9TG',
        cost: 600,
        type: 'activity',
        time: ['02:00 PM', '04:30 PM'],
        image_url: 'https://images.unsplash.com/photo-1508849789987-4e5333c12b78?auto=format&fit=crop&w=800&q=80',
      },
    ],
  },
  puri: {
    days: [
      // PHASE 1: Days 1-4: Temple Heritage, Grand Road, Beach Promenade, Local Culinary Walks
      {
        dayNumber: 1,
        dayThemeTitle: 'Arrival, Golden Beach Sunset & Badadanda Evening Stroll',
        geographicArea: 'Puri Beachfront & Grand Road',
        items: [
          {
            day: 1,
            title: 'Golden Beach Promenade Walk & Sunset by the Bay of Bengal',
            type: 'activity',
            location: 'Golden Beach (Blue Flag Certified), Puri',
            startTime: '04:30 PM',
            endTime: '07:00 PM',
            duration: '2.5 hrs',
            estimatedCost: 600,
            description: 'Relax after arrival with a serene walk along the clean sands of Puri Blue Flag Golden Beach, listening to ocean waves and gentle sea breezes.',
            image_url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
          },
          {
            day: 1,
            title: 'Badadanda (Grand Road) Evening Atmosphere & Traditional Odia Sweets',
            type: 'meal',
            location: 'Badadanda (Grand Road), Puri',
            startTime: '07:30 PM',
            endTime: '09:00 PM',
            duration: '1.5 hrs',
            estimatedCost: 1200,
            description: 'Stroll along historic Badadanda sampling authentic freshly prepared Chenna Poda, Khaja, and hot spiced ginger tea.',
            image_url: 'https://images.unsplash.com/photo-1609137144822-4a00e572074f?auto=format&fit=crop&w=800&q=80',
          },
        ],
      },
      {
        dayNumber: 2,
        dayThemeTitle: 'Shree Jagannath Temple Darshan & Sacred Ananda Bazar Mahaprasad',
        geographicArea: 'Jagannath Temple Complex',
        items: [
          {
            day: 2,
            title: 'Shree Jagannath Temple Morning Darshan & Architectural Heritage Tour',
            type: 'sightseeing',
            location: 'Shree Jagannath Temple, Singhadwara (Lion’s Gate)',
            startTime: '07:30 AM',
            endTime: '11:00 AM',
            duration: '3.5 hrs',
            estimatedCost: 1500,
            description: 'Experience the divine atmosphere of the 12th-century Kalinga-style temple dedicated to Lord Jagannath, Balabhadra, and Subhadra.',
            image_url: 'https://images.unsplash.com/photo-1609137144822-4a00e572074f?auto=format&fit=crop&w=800&q=80',
          },
          {
            day: 2,
            title: 'Sacred Ananda Bazar 56 Bhog Mahaprasad Feast',
            type: 'meal',
            location: 'Ananda Bazar, Jagannath Temple Compound',
            startTime: '12:00 PM',
            endTime: '01:30 PM',
            duration: '1.5 hrs',
            estimatedCost: 1400,
            description: 'Partake in traditional earthen-pot cooked Mahaprasad prepared in the world’s largest traditional clay-pot kitchen.',
            image_url: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=800&q=80',
          },
          {
            day: 2,
            title: 'Narendra Pokhari Sacred Tank Stroll & Chandan Yatra Pavilion',
            type: 'activity',
            location: 'Narendra Pokhari, Puri',
            startTime: '03:30 PM',
            endTime: '05:30 PM',
            duration: '2 hrs',
            estimatedCost: 400,
            description: 'Explore the 14th-century holy water reservoir surrounded by ancient ghats where the iconic Chandan Yatra boat festivals take place.',
            image_url: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=800&q=80',
          },
        ],
      },
      {
        dayNumber: 3,
        dayThemeTitle: 'Gundicha Temple, Indradyumna Tank & Swargadwar Coastal Walk',
        geographicArea: 'Gundicha & Swargadwar',
        items: [
          {
            day: 3,
            title: 'Gundicha Temple (Garden Palace of Lord Jagannath)',
            type: 'sightseeing',
            location: 'Grand Road North End, Gundicha Temple',
            startTime: '09:00 AM',
            endTime: '11:30 AM',
            duration: '2.5 hrs',
            estimatedCost: 600,
            description: 'Visit the peaceful garden sanctuary where the holy deities reside during the annual world-renowned Rath Yatra festival.',
            image_url: 'https://images.unsplash.com/photo-1609137144822-4a00e572074f?auto=format&fit=crop&w=800&q=80',
          },
          {
            day: 3,
            title: 'Indradyumna Holy Tank & Nilakantheswar Temple Exploration',
            type: 'activity',
            location: 'Near Gundicha Temple, Puri',
            startTime: '12:00 PM',
            endTime: '02:00 PM',
            duration: '2 hrs',
            estimatedCost: 500,
            description: 'Learn ancient legends at the historic King Indradyumna stepwell, home to century-old sacred turtles.',
            image_url: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=800&q=80',
          },
          {
            day: 3,
            title: 'Swargadwar Beach Bazaar & Local Handloom Stalls Walk',
            type: 'leisure',
            location: 'Swargadwar Sea Face, Puri',
            startTime: '04:30 PM',
            endTime: '07:30 PM',
            duration: '3 hrs',
            estimatedCost: 1200,
            description: 'Browse local seashells, Sambalpuri handloom sarees, and taste piping-hot crab cutlets and coastal fish fry at Swargadwar night market.',
            image_url: 'https://images.unsplash.com/photo-1614082242765-7c98ca0f3df3?auto=format&fit=crop&w=800&q=80',
          },
        ],
      },
      {
        dayNumber: 4,
        dayThemeTitle: 'Lokanath Ancient Shiva Shrine & Chakratirtha Coastal Trail',
        geographicArea: 'Lokanath & Chakratirtha',
        items: [
          {
            day: 4,
            title: 'Sri Lokanath Temple (Submerged Shivalinga Shrine)',
            type: 'sightseeing',
            location: 'Lokanath Road, Western Puri',
            startTime: '08:30 AM',
            endTime: '11:00 AM',
            duration: '2.5 hrs',
            estimatedCost: 600,
            description: 'Visit the revered 11th-century Shaivite shrine where the sacred Shivalinga remains perpetually immersed under natural spring waters.',
            image_url: 'https://images.unsplash.com/photo-1609137144822-4a00e572074f?auto=format&fit=crop&w=800&q=80',
          },
          {
            day: 4,
            title: 'Chakratirtha Beach, Chakra Narayan Temple & Lighthouse Viewpoint',
            type: 'activity',
            location: 'Chakratirtha Road, Puri',
            startTime: '03:00 PM',
            endTime: '06:00 PM',
            duration: '3 hrs',
            estimatedCost: 800,
            description: 'Climb the historic Puri Lighthouse for panoramic aerial views of the coastline and visit the serene Chakra Narayan shrine.',
            image_url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
          },
        ],
      },

      // PHASE 2: Days 5-8: Crafts Villages (Raghurajpur), Artisanal Shopping, Marine Life, Coastal Walks
      {
        dayNumber: 5,
        dayThemeTitle: 'Raghurajpur UNESCO Heritage Crafts Village & Pattachitra Art',
        geographicArea: 'Raghurajpur Artisan Village (14 km from Puri)',
        items: [
          {
            day: 5,
            title: 'Raghurajpur Heritage Crafts Village & Master Pattachitra Painter Studio',
            type: 'activity',
            location: 'Raghurajpur Village, Puri District',
            startTime: '09:30 AM',
            endTime: '01:30 PM',
            duration: '4 hrs',
            estimatedCost: 2400,
            description: 'Interact with national-award winning master painters creating natural stone-color Pattachitra scroll art, palm-leaf engravings, and papier-mâché masks.',
            image_url: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=800&q=80',
          },
          {
            day: 5,
            title: 'Gotipua Traditional Folk Dance Performance & Rural Odia Thali Lunch',
            type: 'meal',
            location: 'Raghurajpur Cultural Gurukul',
            startTime: '02:00 PM',
            endTime: '04:00 PM',
            duration: '2 hrs',
            estimatedCost: 1800,
            description: 'Enjoy a live acrobatic Gotipua dance recital (the precursor to classical Odissi) followed by an authentic plantain-leaf rural lunch.',
            image_url: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=800&q=80',
          },
        ],
      },
      {
        dayNumber: 6,
        dayThemeTitle: 'Artisanal Coir Craft, Coconut Groves & Danda Dance Heritage',
        geographicArea: 'Bata & Sakhigopal Village',
        items: [
          {
            day: 6,
            title: 'Sakhigopal Temple & Radharani Heritage Pilgrimage',
            type: 'sightseeing',
            location: 'Sakhigopal Town, near Puri',
            startTime: '09:00 AM',
            endTime: '12:00 PM',
            duration: '3 hrs',
            estimatedCost: 800,
            description: 'Visit the historic shrine of Lord Krishna who came as a witness (Sakshi) from Vrindavan, surrounded by verdant coconut plantations.',
            image_url: 'https://images.unsplash.com/photo-1609137144822-4a00e572074f?auto=format&fit=crop&w=800&q=80',
          },
          {
            day: 6,
            title: 'Coir Handicrafts Cluster & Palm-Weaving Workshop',
            type: 'activity',
            location: 'Teisipur & Batamangala Road',
            startTime: '01:30 PM',
            endTime: '04:30 PM',
            duration: '3 hrs',
            estimatedCost: 1000,
            description: 'Observe eco-friendly artisanal toys, home decor, and intricate ropes crafted entirely from natural coconut husk fibers.',
            image_url: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=800&q=80',
          },
        ],
      },
      {
        dayNumber: 7,
        dayThemeTitle: 'Marine Drive Coastal Estuary & Balukhand Wildlife Sanctuary',
        geographicArea: 'Balukhand-Konark Coastal Belt',
        items: [
          {
            day: 7,
            title: 'Balukhand-Konark Coastal Wildlife Sanctuary Nature Walk',
            type: 'activity',
            location: 'Marine Drive, Balukhand Forest Range',
            startTime: '07:00 AM',
            endTime: '10:30 AM',
            duration: '3.5 hrs',
            estimatedCost: 1200,
            description: 'Guided forest walk through casuarina and cashew groves to spot herds of wild Blackbuck antelopes, spotted deer, and coastal migratory birds.',
            image_url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80',
          },
          {
            day: 7,
            title: 'Puri Beach Market Seafood Tasting & Shell Artisans Souvenirs',
            type: 'leisure',
            location: 'VIP Road Beach Market, Puri',
            startTime: '04:00 PM',
            endTime: '07:30 PM',
            duration: '3.5 hrs',
            estimatedCost: 1600,
            description: 'Sample fresh prawn curry, pan-seared pomfret, and pick up polished mother-of-pearl handicrafts and traditional conch shells.',
            image_url: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=800&q=80',
          },
        ],
      },
      {
        dayNumber: 8,
        dayThemeTitle: 'Puri Sand Art Institute & Sudarshan Craft Museum',
        geographicArea: 'Sudarshan Nagar & Sea Beach',
        items: [
          {
            day: 8,
            title: 'Sudarshan Crafts Museum & Traditional Stone Carving Gallery',
            type: 'sightseeing',
            location: 'Station Road, Sudarshan Nagar, Puri',
            startTime: '09:30 AM',
            endTime: '12:30 PM',
            duration: '3 hrs',
            estimatedCost: 900,
            description: 'Founded by Padma Vibhushan Sudarshan Sahoo, marvel at master sculptors carving soapstone, sandstone, and wood sculptures.',
            image_url: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=800&q=80',
          },
          {
            day: 8,
            title: 'Puri Beach Golden Sand Art Workshop & Sculpting Session',
            type: 'activity',
            location: 'Golden Beach Sand Art Pavilion',
            startTime: '03:30 PM',
            endTime: '06:30 PM',
            duration: '3 hrs',
            estimatedCost: 1500,
            description: 'Learn the techniques of creating intricate sand sculptures on the shore with guidance from local sand artists inspired by Sudarsan Pattnaik.',
            image_url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
          },
        ],
      },

      // PHASE 3: Days 9-12: Excursions (Konark, Pipili, Chilika Lake Satapada)
      {
        dayNumber: 9,
        dayThemeTitle: 'Konark Sun Temple UNESCO Wonder & Chandrabhaga Beach',
        geographicArea: 'Konark Sun Temple Corridor (35 km from Puri)',
        items: [
          {
            day: 9,
            title: 'Konark Sun Temple (Black Pagoda) Architectural Expedition',
            type: 'sightseeing',
            location: 'Konark, Puri District',
            startTime: '08:30 AM',
            endTime: '12:30 PM',
            duration: '4 hrs',
            estimatedCost: 2600,
            description: 'Explore the 13th-century UNESCO World Heritage monument shaped as a monumental colossal stone chariot with 24 intricate sundial wheels.',
            image_url: 'https://images.unsplash.com/photo-1609137144822-4a00e572074f?auto=format&fit=crop&w=800&q=80',
          },
          {
            day: 9,
            title: 'Chandrabhaga Clean Beach Stroll & Coastal Surfing Point',
            type: 'activity',
            location: 'Chandrabhaga Beach, Konark',
            startTime: '01:30 PM',
            endTime: '04:30 PM',
            duration: '3 hrs',
            estimatedCost: 1200,
            description: 'Relax along the pristine sands where the sacred river meets the sea, known as India’s first certified Blue Flag eco-beach.',
            image_url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
          },
        ],
      },
      {
        dayNumber: 10,
        dayThemeTitle: 'Pipili Applique Craft Village & Dhauli Shanti Stupa Day Trip',
        geographicArea: 'Pipili & Dhauli Hills (Bhubaneswar Route)',
        items: [
          {
            day: 10,
            title: 'Pipili Applique Crafts Village Street & Colorful Canopy Workshops',
            type: 'activity',
            location: 'Pipili Main Bazaar, Puri-Bhubaneswar Highway',
            startTime: '09:00 AM',
            endTime: '12:30 PM',
            duration: '3.5 hrs',
            estimatedCost: 1800,
            description: 'Walk through streets decorated with vibrant appliqué canopies, lanterns (Trasa), and temple umbrellas hand-stitched by generations of tailors.',
            image_url: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=800&q=80',
          },
          {
            day: 10,
            title: 'Dhauli Peace Pagoda (Shanti Stupa) & Ashokan Rock Edicts',
            type: 'sightseeing',
            location: 'Dhauli Hill, Daya River Bank',
            startTime: '01:30 PM',
            endTime: '04:30 PM',
            duration: '3 hrs',
            estimatedCost: 1400,
            description: 'Stand atop the hill overlooking the historic Kalinga battlefield where Emperor Ashoka embraced Buddhism and non-violence in 261 BC.',
            image_url: 'https://images.unsplash.com/photo-1609137144822-4a00e572074f?auto=format&fit=crop&w=800&q=80',
          },
        ],
      },
      {
        dayNumber: 11,
        dayThemeTitle: 'Chilika Lake Satapada Boat Safari & Irrawaddy Dolphin Sighting',
        geographicArea: 'Chilika Lake & Satapada Lagoon (50 km from Puri)',
        items: [
          {
            day: 11,
            title: 'Satapada Motorized Catamaran Cruise on Chilika Asia’s Largest Lagoon',
            type: 'activity',
            location: 'Satapada Jetty, Chilika Lake',
            startTime: '08:00 AM',
            endTime: '01:00 PM',
            duration: '5 hrs',
            estimatedCost: 3600,
            description: 'Cruise through Asia’s largest brackish water lagoon to spot playful endangered Irrawaddy dolphins and rare migratory waterfowl.',
            image_url: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=800&q=80',
          },
          {
            day: 11,
            title: 'Rajhans Island Sea-Mouth Exploration & Lagoon Crab Lunch',
            type: 'meal',
            location: 'Rajhans Island & Sea-Mouth Meeting Point',
            startTime: '01:30 PM',
            endTime: '04:30 PM',
            duration: '3 hrs',
            estimatedCost: 2200,
            description: 'Visit the natural sandbar separating Chilika Lake from the Bay of Bengal and enjoy fresh butter garlic tiger prawns and mud crabs.',
            image_url: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=800&q=80',
          },
        ],
      },
      {
        dayNumber: 12,
        dayThemeTitle: 'Alarnath Temple Brahmagiri & Mangalajodi Bird Sanctuary',
        geographicArea: 'Brahmagiri & Chilika North Marshes',
        items: [
          {
            day: 12,
            title: 'Alarnath Temple (Anavasara Sanctuary) Brahmagiri',
            type: 'sightseeing',
            location: 'Brahmagiri Town (25 km from Puri)',
            startTime: '09:00 AM',
            endTime: '12:00 PM',
            duration: '3 hrs',
            estimatedCost: 1000,
            description: 'Visit the historic shrine where Chaitanya Mahaprabhu worshipped Lord Vishnu, renowned for its delectable sweet Kheer (rice pudding) offering.',
            image_url: 'https://images.unsplash.com/photo-1609137144822-4a00e572074f?auto=format&fit=crop&w=800&q=80',
          },
          {
            day: 12,
            title: 'Traditional Country Canoe Ride through Lotus Marshlands',
            type: 'activity',
            location: 'Brahmagiri Inland Wetlands',
            startTime: '01:30 PM',
            endTime: '04:30 PM',
            duration: '3 hrs',
            estimatedCost: 1400,
            description: 'Glide quietly through village lotus marshes spotting purple moorhens, openbill storks, and kingfishers.',
            image_url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80',
          },
        ],
      },

      // PHASE 4: Days 13-17: Wellness, Beach Relaxation, Baliharachandi, Departure
      {
        dayNumber: 13,
        dayThemeTitle: 'Baliharachandi Sand Dune Beach & Secluded Estuary Excursion',
        geographicArea: 'Baliharachandi (27 km south of Puri)',
        items: [
          {
            day: 13,
            title: 'Baliharachandi Temple on Rolling Sand Dunes & River Estuary',
            type: 'sightseeing',
            location: 'Baliharachandi Coast, Puri District',
            startTime: '09:00 AM',
            endTime: '01:00 PM',
            duration: '4 hrs',
            estimatedCost: 1600,
            description: 'Visit the Goddess Harachandi shrine perched atop sweeping coastal dunes where the Bhargavi River channel pours into the ocean.',
            image_url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
          },
          {
            day: 13,
            title: 'Picnic by the Casuarina Dunes & Solitary Beach Walk',
            type: 'leisure',
            location: 'Baliharachandi Sandbar Coast',
            startTime: '01:30 PM',
            endTime: '04:30 PM',
            duration: '3 hrs',
            estimatedCost: 1200,
            description: 'Unwind on quiet secluded sands surrounded by whispering casuarina groves away from city crowds.',
            image_url: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=800&q=80',
          },
        ],
      },
      {
        dayNumber: 14,
        dayThemeTitle: 'Traditional Ayurvedic Coastal Wellness & Herbal Steam Spa',
        geographicArea: 'Chakratirtha Coastal Wellness Centre',
        items: [
          {
            day: 14,
            title: 'Ayurvedic Abhyanga Full-Body Massage & Shirodhara Session',
            type: 'activity',
            location: 'Puri Coastal Ayurvedic Wellness Sanctuary',
            startTime: '09:30 AM',
            endTime: '12:30 PM',
            duration: '3 hrs',
            estimatedCost: 3200,
            description: 'Rejuvenate body and mind with authentic warm medicated herbal oil treatments, herbal steam baths, and soothing head therapy.',
            image_url: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80',
          },
          {
            day: 14,
            title: 'Ocean Breeze Yoga & Guided Sunset Meditation on Golden Sands',
            type: 'leisure',
            location: 'Golden Beach Yoga Deck, Puri',
            startTime: '04:30 PM',
            endTime: '06:30 PM',
            duration: '2 hrs',
            estimatedCost: 800,
            description: 'Gentle restorative yoga postures and breathing exercises attuned to the rhythmic roar of the Bay of Bengal.',
            image_url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
          },
        ],
      },
      {
        dayNumber: 15,
        dayThemeTitle: 'Belinga Marine Coast, Cashew Plantations & Old Mathas Circuit',
        geographicArea: 'Puri South Coast & Ancient Mathas',
        items: [
          {
            day: 15,
            title: 'Ancient Mathas Heritage Walk (Embar Matha & Jagannath Ballav Matha)',
            type: 'sightseeing',
            location: 'Old Puri Monastery Quarter',
            startTime: '09:30 AM',
            endTime: '12:30 PM',
            duration: '3 hrs',
            estimatedCost: 700,
            description: 'Discover centuries-old monastic institutions (Mathas) preserving sacred religious libraries, ancient manuscripts, and floral gardens.',
            image_url: 'https://images.unsplash.com/photo-1609137144822-4a00e572074f?auto=format&fit=crop&w=800&q=80',
          },
          {
            day: 15,
            title: 'Belinga Coastal Cashew Orchards & Sunset Tea Tasting',
            type: 'activity',
            location: 'Belinga Coastal Farm Road',
            startTime: '02:30 PM',
            endTime: '05:30 PM',
            duration: '3 hrs',
            estimatedCost: 1100,
            description: 'Visit local cashew and betel leaf (Paan) farmers learning traditional crop cultivation and tasting fresh roasted cashews.',
            image_url: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=800&q=80',
          },
        ],
      },
      {
        dayNumber: 16,
        dayThemeTitle: 'Farewell Beach Picnic, Mahaprasad Experience & Souvenir Hubs',
        geographicArea: 'Badadanda Bazaar & Golden Beach',
        items: [
          {
            day: 16,
            title: 'Grand Road Souvenir Shopping (Authentic Khaja, Pattachitra & Brass Idols)',
            type: 'leisure',
            location: 'Badadanda Craft Stalls & Boyanika Odia Handloom Showroom',
            startTime: '09:30 AM',
            endTime: '01:00 PM',
            duration: '3.5 hrs',
            estimatedCost: 2500,
            description: 'Pick up authenticated GI-tagged Puri Khaja sweet boxes, Kotpad and Ikat handloom fabrics, and stone miniatures of the Trinity.',
            image_url: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=800&q=80',
          },
          {
            day: 16,
            title: 'Farewell Sunset Coastal Dinner with Bay of Bengal Views',
            type: 'meal',
            location: 'Mayfair Waves Seafront Dining Pavilion, Puri',
            startTime: '06:30 PM',
            endTime: '09:00 PM',
            duration: '2.5 hrs',
            estimatedCost: 2800,
            description: 'Celebrate the journey with a multi-course Odia feast featuring Dalma, Machha Besara, Santula, and sweet Rasabali under the stars.',
            image_url: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=800&q=80',
          },
        ],
      },
      {
        dayNumber: 17,
        dayThemeTitle: 'Morning Shore Sunrise Reflection, Hotel Checkout & Homeward Departure',
        geographicArea: 'Puri to Bhubaneswar Hub (BBI/PURI)',
        items: [
          {
            day: 17,
            title: 'Golden Sunrise Over the Sacred Ocean Waters & Beach Walk',
            type: 'sightseeing',
            location: 'Golden Beach Coastline, Puri',
            startTime: '06:00 AM',
            endTime: '08:00 AM',
            duration: '2 hrs',
            estimatedCost: 0,
            description: 'Witness the serene red sunrise ascending over the open horizon of the Bay of Bengal for a peaceful final morning memory.',
            image_url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
          },
          {
            day: 17,
            title: 'Hotel Checkout & Departure Transfer to Airport / Railway Station',
            type: 'transport',
            location: 'Puri to Bhubaneswar BBI Airport / Puri Railway Station',
            startTime: '10:30 AM',
            endTime: '12:30 PM',
            duration: '2 hrs',
            estimatedCost: 2200,
            description: 'Chauffeured transfer along the scenic Puri-Bhubaneswar highway for homeward flight or rail connection. Cherished memories of Jagannath Puri!',
            image_url: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=800&q=80',
          },
        ],
      },
    ],
    backupActivities: [
      {
        title: 'Chilika Mangalajodi Eco-Village Birdwatching Canoe Safari',
        desc: 'Observe hundreds of thousands of migratory waterfowl in a community-protected wetland sanctuary.',
        loc: 'Mangalajodi Lagoon, Chilika',
        cost: 2200,
        type: 'activity',
        time: ['08:00 AM', '12:00 PM'],
        image_url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80',
      },
      {
        title: 'Bata Mangala Temple Heritage Stop & Morning Coconut Offering',
        desc: 'Traditional welcoming shrine on the entrance road into sacred Puri Dham.',
        loc: 'Bata Mangala Road, Puri Highway',
        cost: 400,
        type: 'sightseeing',
        time: ['09:30 AM', '11:00 AM'],
        image_url: 'https://images.unsplash.com/photo-1609137144822-4a00e572074f?auto=format&fit=crop&w=800&q=80',
      },
      {
        title: 'Odishan Folk Puppet (Kandhei Nacha) & Terracotta Pottery Workshop',
        desc: 'Learn ancient village puppetry and terracotta sculpting with local craftsmen.',
        loc: 'Heritage Craft Studio, Puri',
        cost: 1200,
        type: 'activity',
        time: ['02:30 PM', '05:00 PM'],
        image_url: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=800&q=80',
      },
    ],
  },
  bali: {
    days: [
      {
        dayNumber: 1,
        dayThemeTitle: 'Ubud River Valley Arrival & Sacred Monkey Forest',
        geographicArea: 'Central Ubud, Bali',
        items: [
          {
            day: 1,
            title: 'Sacred Monkey Forest Sanctuary (Mandala Suci Wenara Wana)',
            type: 'activity',
            location: 'Padangtegal, Ubud, Bali',
            startTime: '04:30 PM',
            endTime: '06:30 PM',
            duration: '2 hrs',
            estimatedCost: 1100,
            description: 'Stroll through moss-draped ancient banyan trees, holy river gorges, and encounter playful Balinese long-tailed macaques.',
            image_url: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=800&q=80',
          },
          {
            day: 1,
            title: 'Welcome Dinner: Traditional Balinese Nasi Campur & Bebek Betutu',
            type: 'meal',
            location: 'Bebek Bengil Dirty Duck Diner, Ubud',
            startTime: '07:00 PM',
            endTime: '09:00 PM',
            duration: '2 hrs',
            estimatedCost: 1800,
            description: 'Savor slow-cooked crispy duck seasoned with authentic Balinese bumbu spices overlooking serene lotus ponds.',
            image_url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80',
          },
        ],
      },
      {
        dayNumber: 2,
        dayThemeTitle: 'Tegallalang Rice Terraces, Giant Swing & Tirta Empul',
        geographicArea: 'Tegallalang & Tampaksiring, Bali',
        items: [
          {
            day: 2,
            title: 'Tegallalang Emerald Rice Terraces & Traditional Subak Irrigation Walk',
            type: 'sightseeing',
            location: 'Tegallalang, Gianyar, Bali',
            startTime: '08:30 AM',
            endTime: '11:00 AM',
            duration: '2.5 hrs',
            estimatedCost: 800,
            description: 'Explore breathtaking emerald green rice paddies sculpted into the hillside using the ancient UNESCO-recognized Subak community water-sharing system.',
            image_url: 'https://images.unsplash.com/photo-1555400038-63f5ba517a47?auto=format&fit=crop&w=800&q=80',
          },
          {
            day: 2,
            title: 'Alas Harum Jungle Canopy Giant Swing & Coffee Tasting',
            type: 'activity',
            location: 'Alas Harum Agro, Tegallalang, Bali',
            startTime: '11:15 AM',
            endTime: '01:00 PM',
            duration: '1.75 hrs',
            estimatedCost: 2200,
            description: 'Soar high above lush jungle gorges on adrenaline giant swings and taste organic civet Luwak coffee infusions.',
            image_url: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=800&q=80',
          },
          {
            day: 2,
            title: 'Balinese Harvest Lunch Overlooking Jungle Ravines',
            type: 'meal',
            location: 'Cretya Ubud Valley Lounge',
            startTime: '01:15 PM',
            endTime: '02:45 PM',
            duration: '1.5 hrs',
            estimatedCost: 1900,
            description: 'Dine by layered cascading infinity pools with panoramic views of the tropical jungle canopy.',
            image_url: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=800&q=80',
          },
          {
            day: 2,
            title: 'Tirta Empul Holy Water Temple Melukat Purification Ritual',
            type: 'activity',
            location: 'Tampaksiring, Gianyar, Bali',
            startTime: '03:15 PM',
            endTime: '05:45 PM',
            duration: '2.5 hrs',
            estimatedCost: 1200,
            description: 'Don traditional sarongs and immerse in sacred crystalline spring waters at the 10th-century Hindu temple for a blessing ritual.',
            image_url: 'https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?auto=format&fit=crop&w=800&q=80',
          },
        ],
      },
      {
        dayNumber: 3,
        dayThemeTitle: 'Kintamani Mt. Batur Caldera & Volcano Lake Vistas',
        geographicArea: 'Kintamani Highlands, Bali',
        items: [
          {
            day: 3,
            title: 'Kintamani Volcano Overlook & Panoramic Mount Batur Caldera Drive',
            type: 'sightseeing',
            location: 'Penelokan, Kintamani, Bali',
            startTime: '09:00 AM',
            endTime: '11:45 AM',
            duration: '2.75 hrs',
            estimatedCost: 900,
            description: 'Marvel at sweeping vistas of active Mount Batur and the crescent-shaped Lake Batur set inside a massive prehistoric caldera.',
            image_url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80',
          },
          {
            day: 3,
            title: 'Lakeside Buffet Lunch at Grand Puncak Sari Kintamani',
            type: 'meal',
            location: 'Grand Puncak Sari, Kintamani',
            startTime: '12:00 PM',
            endTime: '01:30 PM',
            duration: '1.5 hrs',
            estimatedCost: 1600,
            description: 'Relish fresh grilled fish and Indonesian buffet dishes against the dramatic backdrop of volcanic lava fields.',
            image_url: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=800&q=80',
          },
          {
            day: 3,
            title: 'Batur Natural Hot Springs Thermal Soak & Relaxation',
            type: 'activity',
            location: 'Toya Bungkah, Lake Batur, Bali',
            startTime: '02:00 PM',
            endTime: '04:30 PM',
            duration: '2.5 hrs',
            estimatedCost: 1500,
            description: 'Unwind in mineral-rich volcanic thermal pools right at the edge of Lake Batur with restorative mountain air.',
            image_url: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=800&q=80',
          },
        ],
      },
      {
        dayNumber: 4,
        dayThemeTitle: 'Tegenungan Waterfall, Campuhan Ridge & Balinese Spa',
        geographicArea: 'Southern Ubud & Sukawati, Bali',
        items: [
          {
            day: 4,
            title: 'Tegenungan Cascading Waterfall & River Valley Gorge',
            type: 'sightseeing',
            location: 'Kemenuh, Sukawati, Bali',
            startTime: '09:00 AM',
            endTime: '11:30 AM',
            duration: '2.5 hrs',
            estimatedCost: 800,
            description: 'Descend lush forest stairs to a thunderous natural waterfall with cool swimming pools and scenic wooden viewing decks.',
            image_url: 'https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?auto=format&fit=crop&w=800&q=80',
          },
          {
            day: 4,
            title: 'Campuhan Ridge Scenic Hillside Trail & Palm Valley Stroll',
            type: 'activity',
            location: 'Campuhan Valley, Ubud, Bali',
            startTime: '12:00 PM',
            endTime: '01:30 PM',
            duration: '1.5 hrs',
            estimatedCost: 400,
            description: 'A serene ridge walk between the Sungai Cerik and Sungai Wos rivers surrounded by tall tropical grasses and distant hillside temples.',
            image_url: 'https://images.unsplash.com/photo-1555400038-63f5ba517a47?auto=format&fit=crop&w=800&q=80',
          },
          {
            day: 4,
            title: 'Traditional Balinese Herbal Boreh Massage & Flower Bath',
            type: 'activity',
            location: 'Karsa Spa / Ubud Botanic Sanctuary',
            startTime: '03:00 PM',
            endTime: '05:30 PM',
            duration: '2.5 hrs',
            estimatedCost: 2800,
            description: 'Pamper yourself with authentic Balinese deep-tissue massage using warm clove-ginger boreh paste followed by an aromatic frangipani flower bath.',
            image_url: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=800&q=80',
          },
        ],
      },
      {
        dayNumber: 5,
        dayThemeTitle: 'Transfer to Seminyak Shores, Beach Surfing & Sunset Beach Club',
        geographicArea: 'Seminyak & Canggu Coast, Bali',
        items: [
          {
            day: 5,
            title: 'Scenic Coastal Transfer & Check-in at Seminyak Beachfront Resort',
            type: 'transport',
            location: 'Seminyak Beach, Bali',
            startTime: '10:00 AM',
            endTime: '12:00 PM',
            duration: '2 hrs',
            estimatedCost: 1500,
            description: 'Private chauffeur transit from Ubud highlands down to the vibrant coastal beaches of Seminyak.',
            image_url: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=800&q=80',
          },
          {
            day: 5,
            title: 'Echo Beach Surfing & Sun-Kissed Coastal Boardwalk Walk',
            type: 'activity',
            location: 'Echo Beach, Canggu, Bali',
            startTime: '02:30 PM',
            endTime: '05:00 PM',
            duration: '2.5 hrs',
            estimatedCost: 1200,
            description: 'Watch world-class surfers carve through peeling waves, browse trendy surf boutiques, and soak up the coastal ambiance.',
            image_url: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=800&q=80',
          },
          {
            day: 5,
            title: 'Sunset Session & Coastal Tapas at Potato Head Beach Club',
            type: 'meal',
            location: 'Petitenget Beach, Seminyak, Bali',
            startTime: '05:30 PM',
            endTime: '08:30 PM',
            duration: '3 hrs',
            estimatedCost: 2600,
            description: 'Lounge by the oceanfront amphitheater pool with craft cocktails and eclectic Asian tapas as the crimson sun dips below the horizon.',
            image_url: 'https://images.unsplash.com/photo-1544644181-1484b3fdfc62?auto=format&fit=crop&w=800&q=80',
          },
        ],
      },
      {
        dayNumber: 6,
        dayThemeTitle: 'Majestic Uluwatu Cliff Temple & Jimbaran Seafood Sunset',
        geographicArea: 'Bukit Peninsula & Jimbaran Bay, Bali',
        items: [
          {
            day: 6,
            title: 'Uluwatu Cliff Sea Temple (Pura Luhur Uluwatu)',
            type: 'sightseeing',
            location: 'Pecatu, South Kuta, Bali',
            startTime: '03:00 PM',
            endTime: '05:30 PM',
            duration: '2.5 hrs',
            estimatedCost: 1000,
            description: 'Perched 70 meters above crashing Indian Ocean waves on a sheer limestone cliff, this 11th-century sanctuary guards the island from evil spirits.',
            image_url: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=800&q=80',
          },
          {
            day: 6,
            title: 'Sunset Kecak & Fire Dance Performance Over Cliff Amphitheater',
            type: 'activity',
            location: 'Uluwatu Open-Air Stage, Bali',
            startTime: '06:00 PM',
            endTime: '07:15 PM',
            duration: '1.25 hrs',
            estimatedCost: 1600,
            description: 'Mesmerizing chorus of 50 bare-chested chanting men enacting the heroic Ramayana epic against a fiery sunset sky.',
            image_url: 'https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?auto=format&fit=crop&w=800&q=80',
          },
          {
            day: 6,
            title: 'Candlelit Grilled Seafood Banquet on Jimbaran Beach',
            type: 'meal',
            location: 'Menega Cafe, Jimbaran Bay, Bali',
            startTime: '07:45 PM',
            endTime: '09:45 PM',
            duration: '2 hrs',
            estimatedCost: 2800,
            description: 'Feast on freshly caught red snapper, jumbo prawns, and squid grilled over coconut husks with feet in the golden sand.',
            image_url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
          },
        ],
      },
      {
        dayNumber: 7,
        dayThemeTitle: 'Nusa Penida Island Day Cruise: Kelingking & Crystal Bay',
        geographicArea: 'Nusa Penida Island, Bali',
        items: [
          {
            day: 7,
            title: 'Fast Speedboat Transfer from Sanur Harbour to Nusa Penida',
            type: 'transport',
            location: 'Sanur Port to Toya Pakeh Harbour',
            startTime: '07:30 AM',
            endTime: '08:45 AM',
            duration: '1.25 hrs',
            estimatedCost: 1800,
            description: 'Cruising across the Badung Strait on a high-speed catamaran with ocean spray and sea breeze.',
            image_url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
          },
          {
            day: 7,
            title: 'Kelingking T-Rex Secret Point & Broken Beach Exploration',
            type: 'sightseeing',
            location: 'Kelingking Beach, Nusa Penida, Bali',
            startTime: '09:30 AM',
            endTime: '12:30 PM',
            duration: '3 hrs',
            estimatedCost: 1200,
            description: 'Witness the world-famous T-Rex shaped limestone ridge plunging into sapphire ocean waters, followed by the natural stone arch of Pasih Uug.',
            image_url: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=800&q=80',
          },
          {
            day: 7,
            title: 'Crystal Bay Coral Reef Snorkeling with Manta Rays & Sea Turtles',
            type: 'activity',
            location: 'Crystal Bay, Nusa Penida, Bali',
            startTime: '01:30 PM',
            endTime: '03:45 PM',
            duration: '2.25 hrs',
            estimatedCost: 2400,
            description: 'Submerge into crystal-clear turquoise waters buzzing with vibrant coral gardens, clownfish, and graceful manta rays.',
            image_url: 'https://images.unsplash.com/photo-1544644181-1484b3fdfc62?auto=format&fit=crop&w=800&q=80',
          },
        ],
      },
      {
        dayNumber: 8,
        dayThemeTitle: 'Tanah Lot Ocean Temple & Artisan Souvenirs Departure',
        geographicArea: 'Tabanan & Denpasar Airport, Bali',
        items: [
          {
            day: 8,
            title: 'Tanah Lot Ancient Sea Temple on Offshore Rock Formation',
            type: 'sightseeing',
            location: 'Beraban, Kediri, Tabanan, Bali',
            startTime: '08:30 AM',
            endTime: '11:00 AM',
            duration: '2.5 hrs',
            estimatedCost: 900,
            description: 'Admire the 16th-century sea shrine perched atop an offshore rock battered by crashing ocean swells.',
            image_url: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=800&q=80',
          },
          {
            day: 8,
            title: 'Seminyak Flea Market & Krisna Oleh-Oleh Souvenir Shopping',
            type: 'leisure',
            location: 'Krisna Oleh-Oleh Khas Bali, Tuban',
            startTime: '11:30 AM',
            endTime: '01:30 PM',
            duration: '2 hrs',
            estimatedCost: 1500,
            description: 'Pick up authentic Balinese batik sarongs, hand-carved teakwood masks, organic coconut oils, and dried tropical fruits before leaving.',
            image_url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80',
          },
        ],
      },
    ],
    backupActivities: [
      {
        title: 'Pura Ulun Danu Beratan Water Temple on Lake Beratan',
        desc: 'Picturesque floating Hindu-Buddhist water temple nestled in cool Bedugul mountain mists.',
        loc: 'Candikuning, Baturiti, Tabanan, Bali',
        cost: 950,
        type: 'sightseeing',
        time: ['10:00 AM', '12:30 PM'],
        image_url: 'https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?auto=format&fit=crop&w=800&q=80',
      },
      {
        title: 'Ayung River White Water Rafting Adventure',
        desc: 'Exciting Grade II-III rafting through deep jungle gorges, hidden waterfalls, and carved stone cliffs.',
        loc: 'Ayung River Valley, Ubud, Bali',
        cost: 2500,
        type: 'activity',
        time: ['09:00 AM', '12:30 PM'],
        image_url: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=800&q=80',
      },
    ],
  },
};

/**
 * Universal dynamic template generator for any other destination (e.g. Kerala, Kashmir, Jaipur, etc.)
 */
export function generateUniversalDestinationDays(destName: string, durationDays: number): RawDayPlan[] {
  const plans: RawDayPlan[] = [];
  const lower = destName.toLowerCase();

  const dayThemes = [
    { title: 'Arrival, Hotel Settle-in & Heritage Twilight Stroll', area: `Central ${destName}` },
    { title: 'Iconic Historical Landmarks & Cultural Monoliths', area: `Heritage District, ${destName}` },
    { title: 'Scenic Natural Landscapes, Valleys & Eco-Walks', area: `Outskirts & Scenic Ridge, ${destName}` },
    { title: 'Immersive Local Artisan Workshops & Regional Culinary Tasting', area: `Crafts Quarter, ${destName}` },
    { title: 'High-Viewpoint Excursion, Lakes & Countryside Trails', area: `Surrounding Valley, ${destName}` },
    { title: 'Offbeat Village Circuit, Riverside Leisure & Sunset View', area: `Country Basin, ${destName}` },
    { title: 'Botanical Conservatories, Mountain Waterfalls & Wildlife Park', area: `Forest Range, ${destName}` },
    { title: 'Artisan Souvenirs, Local Spice/Bazaar Stroll & Homeward Journey', area: `Market Square, ${destName}` },
  ];

  for (let d = 1; d <= durationDays; d++) {
    const theme = dayThemes[(d - 1) % dayThemes.length];
    const items: RawDayPlanItem[] = [];

    if (d === 1) {
      items.push({
        day: 1,
        title: `${destName} Central Promenade & Twilight Heritage Stroll`,
        type: 'activity',
        location: `Central Boulevard, ${destName}`,
        startTime: '04:30 PM',
        endTime: '07:00 PM',
        duration: '2.5 hrs',
        estimatedCost: 1000,
        description: `Acclimatize with a relaxing evening walk exploring iconic colonial architecture, boutique craft shops, and tasting regional evening snacks.`,
        image_url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80',
      });
      items.push({
        day: 1,
        title: `Welcome Dinner: Authentic Regional Specialties of ${destName}`,
        type: 'meal',
        location: `Heritage Dining Room, ${destName}`,
        startTime: '07:30 PM',
        endTime: '09:00 PM',
        duration: '1.5 hrs',
        estimatedCost: 1800,
        description: `Indulge in a curated multi-course welcome dinner highlighting the authentic seasonal cuisine of ${destName}.`,
        image_url: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=800&q=80',
      });
    } else if (d === durationDays) {
      items.push({
        day: d,
        title: `Morning Flora Gardens & Cultural Museum in ${destName}`,
        type: 'sightseeing',
        location: `Botanical Enclave, ${destName}`,
        startTime: '09:00 AM',
        endTime: '11:00 AM',
        duration: '2 hrs',
        estimatedCost: 800,
        description: `Tranquil morning visit through heritage gardens showcasing regional botanical species and local artifacts.`,
        image_url: 'https://images.unsplash.com/photo-1596895111956-bf1cf0599ce5?auto=format&fit=crop&w=800&q=80',
      });
      items.push({
        day: d,
        title: `Artisan Souvenir Bazaar & Handcrafted Keepsakes Shopping`,
        type: 'leisure',
        location: `Old Market Square, ${destName}`,
        startTime: '11:15 AM',
        endTime: '01:00 PM',
        duration: '1.75 hrs',
        estimatedCost: 1500,
        description: `Pick up authentic handcrafted mementos, locally produced spices, organic teas, and regional textiles before departure.`,
        image_url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80',
      });
    } else {
      // Distinct middle days
      if (d === 2) {
        items.push({
          day: d,
          title: `Famous Landmark & Historic Citadel Exploration in ${destName}`,
          type: 'sightseeing',
          location: `North Ridge, ${destName}`,
          startTime: '09:00 AM',
          endTime: '12:30 PM',
          duration: '3.5 hrs',
          estimatedCost: 2000,
          description: `Guided morning discovery of the most celebrated monument in ${destName} with rich storytelling and architecture.`,
          image_url: 'https://images.unsplash.com/photo-1571401835393-8c5f35328320?auto=format&fit=crop&w=800&q=80',
        });
        items.push({
          day: d,
          title: `Traditional Artisan Lunch & Scenic Viewpoint Overlook`,
          type: 'meal',
          location: `Panorama Terrace, ${destName}`,
          startTime: '01:00 PM',
          endTime: '02:30 PM',
          duration: '1.5 hrs',
          estimatedCost: 1600,
          description: `Enjoy delicious local recipes while taking in sprawling valley and mountain vistas.`,
          image_url: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=800&q=80',
        });
        items.push({
          day: d,
          title: `Cultural Sanctuary & Ancient Monastery/Temple Grounds`,
          type: 'activity',
          location: `East Hill, ${destName}`,
          startTime: '03:00 PM',
          endTime: '05:30 PM',
          duration: '2.5 hrs',
          estimatedCost: 900,
          description: `Experience the peace of centuries-old spiritual sanctuaries and sacred art in ${destName}.`,
          image_url: 'https://images.unsplash.com/photo-1588714477688-cf28a50e94f7?auto=format&fit=crop&w=800&q=80',
        });
      } else if (d === 3) {
        items.push({
          day: d,
          title: `Lush Plantation/Orchard Walk & Guided Agricultural Tasting`,
          type: 'activity',
          location: `Green Belt Valley, ${destName}`,
          startTime: '09:30 AM',
          endTime: '12:30 PM',
          duration: '3 hrs',
          estimatedCost: 2400,
          description: `Walk through certified organic estates, learn harvesting traditions, and sample fresh farm infusions.`,
          image_url: 'https://images.unsplash.com/photo-1596895111956-bf1cf0599ce5?auto=format&fit=crop&w=800&q=80',
        });
        items.push({
          day: d,
          title: `Nature Trail & Cascading Waterfalls Forest Exploration`,
          type: 'sightseeing',
          location: `Forest Sanctuary, ${destName}`,
          startTime: '01:30 PM',
          endTime: '04:30 PM',
          duration: '3 hrs',
          estimatedCost: 1200,
          description: `Gentle scenic nature trail through protected pine and broadleaf forests ending at clear waterfall pools.`,
          image_url: 'https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?auto=format&fit=crop&w=800&q=80',
        });
      } else if (d === 4) {
        items.push({
          day: d,
          title: `High-Altitude Cable Car / Scenic Ridge Panorama Expedition`,
          type: 'activity',
          location: `High Ridge Station, ${destName}`,
          startTime: '09:00 AM',
          endTime: '12:30 PM',
          duration: '3.5 hrs',
          estimatedCost: 2600,
          description: `Ascend to dramatic viewpoints offering 360-degree views of snow peaks and valley basins.`,
          image_url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80',
        });
        items.push({
          day: d,
          title: `Highland Wildlife Conservation Sanctuary & Rare Species Encounter`,
          type: 'sightseeing',
          location: `Zoological Sanctuary, ${destName}`,
          startTime: '01:30 PM',
          endTime: '04:30 PM',
          duration: '3 hrs',
          estimatedCost: 1100,
          description: `Observe indigenous fauna and alpine flora in a world-class natural habitat conservatory.`,
          image_url: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=800&q=80',
        });
      } else if (d === 5) {
        items.push({
          day: d,
          title: `Full-Day Countryside Lake & Pine Forest Day Trip from ${destName}`,
          type: 'activity',
          location: `Lake Valley Basin, near ${destName}`,
          startTime: '09:00 AM',
          endTime: '01:30 PM',
          duration: '4.5 hrs',
          estimatedCost: 3200,
          description: `Scenic excursion to a tranquil mountain lake surrounded by pine ridges, with peaceful family boating.`,
          image_url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80',
        });
        items.push({
          day: d,
          title: `Rustic Mountain Cafe & Sunset Photography Moment`,
          type: 'leisure',
          location: `Sunset Point, near ${destName}`,
          startTime: '02:30 PM',
          endTime: '05:00 PM',
          duration: '2.5 hrs',
          estimatedCost: 1400,
          description: `Relax with local hot beverages and artisanal treats overlooking changing dusk colors across the horizon.`,
          image_url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80',
        });
      } else {
        items.push({
          day: d,
          title: `Offbeat Heritage Village & Crafts Immersion in ${destName}`,
          type: 'activity',
          location: `Old Artisan Settlement, ${destName}`,
          startTime: '09:30 AM',
          endTime: '01:00 PM',
          duration: '3.5 hrs',
          estimatedCost: 1800,
          description: `Interactive visit with master weavers, potters, and traditional woodcarvers preserving ancient local trades.`,
          image_url: 'https://images.unsplash.com/photo-1580227974546-f9479b183669?auto=format&fit=crop&w=800&q=80',
        });
        items.push({
          day: d,
          title: `Riverside Relaxation & Twilight Acoustic Lounge`,
          type: 'leisure',
          location: `Riverfront Promenade, ${destName}`,
          startTime: '02:30 PM',
          endTime: '05:30 PM',
          duration: '3 hrs',
          estimatedCost: 1200,
          description: `Serene riverside stroll followed by live traditional instrumental music in a cozy heritage lounge.`,
          image_url: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=800&q=80',
        });
      }
    }

    plans.push({
      dayNumber: d,
      dayThemeTitle: `Day ${d}: ${theme.title}`,
      geographicArea: theme.area,
      items,
    });
  }

  return plans;
}

/**
 * Normalizes title / place strings to detect duplicate attractions across days
 */
export function normalizeAttractionKey(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\b(the|and|or|of|in|at|visit|walk|tour|excursion|day|trip|experience|stroll|morning|evening|afternoon|leisure|scenic|drive|guided|heritage|famous|iconic)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Strict Itinerary Validation & Deduplication Engine
 * Enforces all 10 prompt rules:
 * 1. Exactly requested duration (Day 1 to Day N)
 * 2. Zero repeated activities/attractions/restaurants
 * 3. Geographically sound day structure
 * 4. Realistic non-overlapping times
 * 5. Cost calculation accuracy
 */
export function validateAndEnforceItinerary(params: {
  tripId: string;
  destName: string;
  durationDays: number;
  startDate?: string;
  endDate?: string;
  transport: TransportBookingOption;
  accommodation: AccommodationOption;
  dailyAccommodations?: Array<{ day_number: number; hotel: AccommodationOption }>;
  rawItems?: RawDayPlanItem[];
  travelerCount?: number;
  budgetTier?: 'budget' | 'moderate' | 'luxury';
  totalBudget?: number;
}): ItineraryItem[] {
  const { tripId, destName, durationDays, transport, accommodation, dailyAccommodations, rawItems = [], travelerCount = 4, totalBudget = 0 } = params;
  const lowerDest = destName.toLowerCase();
  const destKBKey = Object.keys(DESTINATION_KNOWLEDGE_BASE).find((k) => lowerDest.includes(k));
  const destKB = destKBKey ? DESTINATION_KNOWLEDGE_BASE[destKBKey] : null;

  const validItinerary: ItineraryItem[] = [];
  const seenAttractionTokens = new Set<string>();

  // Dynamic budget-aware activity cost scaler to strictly prevent budget blowouts
  const transportCost = (transport?.total_price || 0) + (transport?.dependent_transfer?.cost || 0);
  const accommodationCost = accommodation?.total_price || 0;
  const effectiveTargetBudget = totalBudget > 0 ? totalBudget : (transportCost + accommodationCost + (travelerCount * 1200 * durationDays));
  const estimatedMeals = Math.round(travelerCount * 400 * durationDays);
  const maxActivityBudget = Math.max(800, effectiveTargetBudget - transportCost - accommodationCost - estimatedMeals);
  const expectedActivityCount = Math.max(2, (durationDays - 1) * 2 + 2);
  const targetPerActivityCost = Math.max(150, Math.floor(maxActivityBudget / expectedActivityCount));

  const scaleActivityCost = (rawCost?: number | null, fallbackBase: number = 800): number => {
    const base = rawCost && rawCost > 0 ? rawCost : fallbackBase;
    if (base > targetPerActivityCost * 1.3) {
      return Math.max(100, Math.min(base, Math.round(targetPerActivityCost * (base / 1200))));
    }
    return Math.max(100, Math.min(base, Math.round(targetPerActivityCost * 1.1)));
  };

  const getDayHotel = (dayNum: number): AccommodationOption => {
    if (dailyAccommodations && dailyAccommodations.length > 0) {
      const match = dailyAccommodations.find((d) => d.day_number === dayNum);
      if (match?.hotel) return match.hotel;
    }
    return accommodation;
  };

  // Helper to extract keywords from title
  const extractTokens = (str: string) => {
    return normalizeAttractionKey(str).split(' ').filter((w) => w.length > 3);
  };

  // Helper to check if an attraction is already in seenAttractionTokens
  const isDuplicateActivity = (title: string): boolean => {
    const tokens = extractTokens(title);
    if (tokens.length === 0) return false;
    let matchCount = 0;
    for (const t of tokens) {
      if (seenAttractionTokens.has(t)) {
        matchCount++;
      }
    }
    // If more than 50% of distinctive tokens already seen, mark as duplicate
    return matchCount > 0 && matchCount >= Math.ceil(tokens.length * 0.5);
  };

  const registerAttraction = (title: string) => {
    const tokens = extractTokens(title);
    tokens.forEach((t) => seenAttractionTokens.add(t));
  };

  // Get backup activities pool for replacements
  const backupPool = destKB ? [...destKB.backupActivities] : [];
  let backupIdx = 0;

  // Fallback days if rawItems missing or incomplete
  const baseDays = destKB ? destKB.days : generateUniversalDestinationDays(destName, durationDays);

  for (let day = 1; day <= durationDays; day++) {
    let orderIndex = 1;

    if (day === 1) {
      // 1. Ingress Transport
      validItinerary.push({
        id: `iti-${tripId}-d1-1`,
        trip_id: tripId,
        day_number: 1,
        order_index: orderIndex++,
        item_type: 'transport',
        title: `${transport.operator}: Departure from ${transport.origin_city || 'Origin'} to ${transport.transit_hub}`,
        description: `Scheduled arrival at ${transport.arrival_time}. ${transport.dependent_transfer.title}.`,
        start_time: transport.departure_time,
        end_time: transport.arrival_time,
        cost: transport.total_price,
        status: 'confirmed',
        image_url: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=800&q=80',
        location: transport.transit_hub,
      });

      // 2. Transfer to Hotel Basecamp
      validItinerary.push({
        id: `iti-${tripId}-d1-2`,
        trip_id: tripId,
        day_number: 1,
        order_index: orderIndex++,
        item_type: 'transport',
        title: transport.dependent_transfer.title,
        description: transport.dependent_transfer.description,
        start_time: transport.arrival_time,
        end_time: transport.dependent_transfer.arrival_at_destination,
        cost: transport.dependent_transfer.cost,
        status: 'confirmed',
        image_url: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=800&q=80',
        location: destName,
      });

      // 3. Hotel Check-in
      const day1Hotel = getDayHotel(1);
      validItinerary.push({
        id: `iti-${tripId}-d1-3`,
        trip_id: tripId,
        day_number: 1,
        order_index: orderIndex++,
        item_type: 'hotel',
        title: `Check-in: ${day1Hotel.name}`,
        description: `Unpack and relax in your ${day1Hotel.room_type}. Welcome refreshments.`,
        start_time: transport.dependent_transfer.arrival_at_destination,
        end_time: '04:30 PM',
        cost: day1Hotel.price_per_night,
        status: 'confirmed',
        image_url: day1Hotel.hero_image,
        location: day1Hotel.location,
      });

      // Day 1 afternoon & evening activities (strictly post-arrival in destination)
      const day1Raw = rawItems.filter((i) => i.day === 1 && i.type !== 'transport' && i.type !== 'hotel');
      const day1ItemsToUse = day1Raw.length > 0 ? day1Raw : (baseDays[0]?.items || []);

      // Calculate arrival & check-in completion time in minutes to prevent pre-arrival activity clashes
      let arrivalMinutes = 990; // Default 04:30 PM (990 mins)
      const arrivalTimeStr = transport.dependent_transfer?.arrival_at_destination || '04:30 PM';
      const arrivalMatch = arrivalTimeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
      if (arrivalMatch) {
        let h = parseInt(arrivalMatch[1], 10);
        const m = parseInt(arrivalMatch[2], 10);
        const isPM = arrivalMatch[3].toUpperCase() === 'PM';
        if (isPM && h !== 12) h += 12;
        if (!isPM && h === 12) h = 0;
        arrivalMinutes = h * 60 + m;
      }

      let currentDay1Pointer = Math.max(990, arrivalMinutes + 15); // At least 15 min after check-in

      for (const item of day1ItemsToUse) {
        if (!isDuplicateActivity(item.title)) {
          registerAttraction(item.title);

          // Ensure start time is strictly after arrival in destination
          let itemStartMinutes = currentDay1Pointer;
          if (item.startTime) {
            const smMatch = item.startTime.match(/(\d+):(\d+)\s*(AM|PM)/i);
            if (smMatch) {
              let sh = parseInt(smMatch[1], 10);
              const sm = parseInt(smMatch[2], 10);
              const sPM = smMatch[3].toUpperCase() === 'PM';
              if (sPM && sh !== 12) sh += 12;
              if (!sPM && sh === 12) sh = 0;
              const parsedMins = sh * 60 + sm;
              if (parsedMins >= arrivalMinutes) {
                itemStartMinutes = Math.max(currentDay1Pointer, parsedMins);
              }
            }
          }

          const itemEndMinutes = Math.min(1320, itemStartMinutes + 120); // 2 hours duration
          
          const formatMin = (mins: number) => {
            const h24 = Math.floor(mins / 60) % 24;
            const m = mins % 60;
            const period = h24 >= 12 ? 'PM' : 'AM';
            const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
            return `${h12 < 10 ? '0' : ''}${h12}:${m < 10 ? '0' : ''}${m} ${period}`;
          };

          const sTime = formatMin(itemStartMinutes);
          const eTime = formatMin(itemEndMinutes);
          currentDay1Pointer = itemEndMinutes + 30;

          validItinerary.push({
            id: `iti-${tripId}-d1-${orderIndex}`,
            trip_id: tripId,
            day_number: 1,
            order_index: orderIndex++,
            item_type: (item.type as any) || 'activity',
            title: item.title,
            description: item.description,
            start_time: sTime,
            end_time: eTime,
            cost: scaleActivityCost(item.estimatedCost, 600),
            status: 'confirmed',
            image_url: item.image_url || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80',
            location: item.location || destName,
          });
        }
      }

      // Overnight Day 1
      validItinerary.push({
        id: `iti-${tripId}-d1-hotel-night`,
        trip_id: tripId,
        day_number: 1,
        order_index: orderIndex++,
        item_type: 'hotel',
        title: `Overnight Stay: ${day1Hotel.name}`,
        description: `Rest and recharge for the upcoming day trips.`,
        start_time: '09:30 PM',
        end_time: '08:00 AM',
        cost: 0, // Included in room total
        status: 'confirmed',
        image_url: day1Hotel.hero_image,
        location: day1Hotel.location,
      });

    } else if (day === durationDays) {
      // Departure Day (Day N)
      const depRaw = rawItems.filter((i) => i.day === day && i.type !== 'transport');
      const fallbackDepDay = baseDays[Math.min(baseDays.length - 1, durationDays - 1)] || baseDays[baseDays.length - 1];
      const depItemsToUse = depRaw.length > 0 ? depRaw : (fallbackDepDay?.items || []);

      for (const item of depItemsToUse) {
        let finalTitle = item.title;
        let finalDesc = item.description;
        let finalLoc = item.location;
        let finalCost = item.estimatedCost;
        let finalPhoto = item.image_url;

        if (isDuplicateActivity(finalTitle)) {
          // Replace with unique departure shopping/botanical activity
          finalTitle = `Morning Botanical Gardens & Local Artisans Bazaar in ${destName}`;
          finalDesc = `Enjoy a serene morning walk among exotic plants followed by last-minute souvenir shopping.`;
          finalLoc = `Central ${destName}`;
          finalCost = 400;
        }

        registerAttraction(finalTitle);

        validItinerary.push({
          id: `iti-${tripId}-d${day}-${orderIndex}`,
          trip_id: tripId,
          day_number: day,
          order_index: orderIndex++,
          item_type: (item.type as any) || 'activity',
          title: finalTitle,
          description: finalDesc,
          start_time: item.startTime || (orderIndex === 1 ? '09:00 AM' : '11:15 AM'),
          end_time: item.endTime || (orderIndex === 1 ? '11:00 AM' : '01:00 PM'),
          cost: scaleActivityCost(finalCost, 500),
          status: 'confirmed',
          image_url: finalPhoto || 'https://images.unsplash.com/photo-1596895111956-bf1cf0599ce5?auto=format&fit=crop&w=800&q=80',
          location: finalLoc || destName,
        });
      }

      // Hotel Checkout & Homeward Transit
      validItinerary.push({
        id: `iti-${tripId}-d${day}-${orderIndex}`,
        trip_id: tripId,
        day_number: day,
        order_index: orderIndex++,
        item_type: 'transport',
        title: `Hotel Checkout & Homeward Transfer to ${transport.transit_hub}`,
        description: `Dedicated drop-off to connect seamlessly with your return ${transport.mode}. Wonderful memories of ${destName}!`,
        start_time: '01:30 PM',
        end_time: '04:30 PM',
        cost: transport.dependent_transfer.cost,
        status: 'confirmed',
        image_url: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=800&q=80',
        location: destName,
      });

    } else {
      // Middle Days (Day 2 through Day N-1)
      const dayRaw = rawItems.filter((i) => i.day === day && i.type !== 'transport' && i.type !== 'hotel');
      
      // Determine base day items from knowledge base
      let dayItemsToUse = dayRaw;
      if (dayItemsToUse.length === 0) {
        const sourceDayIdx = (day - 1) < baseDays.length ? (day - 1) : ((day - 1) % baseDays.length);
        dayItemsToUse = baseDays[sourceDayIdx]?.items || [];
      }

      for (const item of dayItemsToUse) {
        let finalTitle = item.title;
        let finalDesc = item.description;
        let finalLoc = item.location;
        let finalCost = item.estimatedCost;
        let finalType = item.type;
        let finalTimes: [string, string] = [item.startTime || '09:30 AM', item.endTime || '12:30 PM'];
        let finalPhoto = item.image_url;

        // Check and replace duplicates dynamically
        if (isDuplicateActivity(finalTitle)) {
          if (backupPool.length > backupIdx) {
            const repl = backupPool[backupIdx++];
            finalTitle = repl.title;
            finalDesc = repl.desc;
            finalLoc = repl.loc;
            finalCost = repl.cost;
            finalType = repl.type;
            finalTimes = repl.time;
            finalPhoto = repl.image_url;
          } else {
            // Dynamic destination-aware unique replacement
            const isCoastal = lowerDest.includes('puri') || lowerDest.includes('goa') || lowerDest.includes('kerala') || lowerDest.includes('beach');
            if (isCoastal) {
              finalTitle = `Coastal Estuary Exploration & Traditional Fishermen Harbor Walk (Day ${day})`;
              finalDesc = `Discover vibrant marine coastal docks, observe traditional boat weaving, and enjoy fresh coconut water along peaceful palm-fringed inlets.`;
              finalLoc = `Coastal Waterside Promenade, ${destName}`;
              finalCost = 600;
              finalType = 'activity';
              finalPhoto = 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80';
            } else {
              finalTitle = `Heritage Crafts Guild & Regional Botanical Overlook (Day ${day})`;
              finalDesc = `Visit local artisan studios preserving ancestral weaving and carving traditions, followed by panoramic hillside valley viewpoints.`;
              finalLoc = `Upper Artisan Quarter, ${destName}`;
              finalCost = 600;
              finalType = 'activity';
              finalPhoto = 'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=800&q=80';
            }
          }
        }

        registerAttraction(finalTitle);

        validItinerary.push({
          id: `iti-${tripId}-d${day}-${orderIndex}`,
          trip_id: tripId,
          day_number: day,
          order_index: orderIndex++,
          item_type: (finalType as any) || 'activity',
          title: finalTitle,
          description: finalDesc,
          start_time: finalTimes[0],
          end_time: finalTimes[1],
          cost: scaleActivityCost(finalCost, 600),
          status: 'confirmed',
          image_url: finalPhoto || 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80',
          location: finalLoc || destName,
        });
      }

      // Overnight stay for middle days
      const dayHotel = getDayHotel(day);
      validItinerary.push({
        id: `iti-${tripId}-d${day}-hotel`,
        trip_id: tripId,
        day_number: day,
        order_index: orderIndex++,
        item_type: 'hotel',
        title: `Overnight Stay: ${dayHotel.name}`,
        description: `Rest and recharge in your ${dayHotel.room_type}.`,
        start_time: '08:30 PM',
        end_time: '08:00 AM',
        cost: 0, // Included in accommodation booking
        status: 'confirmed',
        image_url: dayHotel.hero_image,
        location: dayHotel.location,
      });
    }
  }

  return validItinerary;
}

/**
 * Gemini AI Structured Generator for Complete Day 1 to Day N Non-Repetitive Itinerary
 */
export async function generateAIStructuredItinerary(params: {
  geminiClient?: any;
  tripId: string;
  destName: string;
  durationDays: number;
  startDate?: string;
  endDate?: string;
  travelerCount: number;
  travelType: string;
  totalBudget: number;
  origin: string;
  transport: TransportBookingOption;
  accommodation: AccommodationOption;
  dailyAccommodations?: Array<{ day_number: number; hotel: AccommodationOption }>;
  interests?: string[];
  budgetTier?: 'budget' | 'moderate' | 'luxury';
}): Promise<ItineraryItem[]> {
  const {
    tripId,
    destName,
    durationDays,
    startDate,
    endDate,
    travelerCount,
    travelType,
    totalBudget,
    origin,
    transport,
    accommodation,
    dailyAccommodations,
    interests = ['sightseeing', 'culture', 'nature', 'scenic_views'],
    budgetTier = 'moderate',
  } = params;

  let rawItems: RawDayPlanItem[] = [];

  if (geminiService.isAvailable()) {
    try {
      const remainingActivityBudget = Math.max(
        1000,
        Math.round(totalBudget - (transport.total_price || 0) - (accommodation.total_price || 0))
      );

      const prompt = `You are the master travel itinerary architect for TourFlow AI.
Generate a structured, complete, realistic, and strictly NON-REPETITIVE day-by-day itinerary for:
- Destination: "${destName}"
- EXACT Requested Duration: ${durationDays} days (Day 1 through Day ${durationDays})
- Origin: ${origin}
- Dates: ${startDate || 'Sep 21, 2026'} to ${endDate || 'Sep 26, 2026'}
- Travelers: ${travelerCount} (${travelType})
- Total Target Budget: ₹${totalBudget.toLocaleString()} (Transport: ₹${(transport.total_price || 0).toLocaleString()}, Hotel: ₹${(accommodation.total_price || 0).toLocaleString()})
- Interests: ${interests.join(', ')}
- Transport Mode: ${transport.mode} (${transport.operator}, arrives at destination hub ${transport.transit_hub} at ${transport.arrival_time})
- Hotel: ${accommodation.name} (${accommodation.location})

STRICT MANDATES:
1. STRICT BUDGET ADHERENCE: All activity and experience costs combined MUST be economical and stay strictly within the remaining budget pool (approx ₹${remainingActivityBudget.toLocaleString()}). Each individual activity estimatedCost should be between ₹200 and ₹1200 for ${travelerCount} travelers.
2. FULL DURATION: You MUST generate 3 to 4 distinct items for every single day from Day 1 to Day ${durationDays}.
3. ZERO REPETITION: Do NOT repeat the same attraction, activity, viewpoint, temple, tea estate, or restaurant across different days. Every day must feature completely different, authentic attractions of ${destName}.
4. GEOGRAPHICAL CLUSTERING: Group attractions on the same day that are geographically close to each other. Do not zigzag across the city.
5. LOGICAL PROGRESSION:
   - Day 1: Arrival, transit to hotel, check-in, leisure stroll nearby (e.g. Mall Road / beach sunset), and welcome dinner.
   - Middle Days (Day 2 to Day ${durationDays - 1}): Clustered thematic day trips (e.g., sunrise/monuments, tea gardens/plantations, adventure/nature trails, waterfalls/lake excursions, heritage arts).
   - Final Day (Day ${durationDays}): Morning botanical gardens or artisan market shopping, checkout, and homeward transit.
6. REALISTIC NON-OVERLAPPING TIME SLOTS:
   - Provide realistic "startTime" and "endTime" (e.g. "09:00 AM", "12:30 PM").
   - Include realistic durations and realistic estimated costs in INR for ${travelerCount} people.`;

      const itineraryItemSchema = {
        type: Type.OBJECT,
        properties: {
          day: { type: Type.INTEGER },
          title: { type: Type.STRING },
          type: { 
            type: Type.STRING,
            enum: ['activity', 'sightseeing', 'meal', 'leisure', 'transport', 'hotel']
          },
          location: { type: Type.STRING },
          startTime: { type: Type.STRING },
          endTime: { type: Type.STRING },
          duration: { type: Type.STRING },
          estimatedCost: { type: Type.INTEGER },
          description: { type: Type.STRING },
        },
        required: ['day', 'title', 'type', 'location', 'startTime', 'endTime', 'estimatedCost', 'description'],
      };

      rawItems = await geminiService.generateStructured<RawDayPlanItem[]>(
        prompt,
        {
          type: Type.ARRAY,
          items: itineraryItemSchema,
        },
        {
          systemInstruction: 'You are TourFlow AI master itinerary generator. Return only a validated JSON array of structured day items conforming strictly to schema.',
        }
      );
    } catch (err: any) {
      logger.warn('Gemini structured itinerary generation note, using validated knowledge base engine:', { module: 'itineraryEngine' }, err);
    }
  }

  // Enforce validation and deduplication
  return validateAndEnforceItinerary({
    tripId,
    destName,
    durationDays,
    startDate,
    endDate,
    transport,
    accommodation,
    dailyAccommodations,
    rawItems,
    travelerCount,
    budgetTier,
    totalBudget,
  });
}
