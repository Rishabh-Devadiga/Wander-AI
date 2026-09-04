// Real geographic coordinates dataset and resolver for TourFlow AI

export interface GeoLocationPoint {
  id: string;
  name: string;
  category: 'origin' | 'destination' | 'hotel' | 'activity' | 'airport' | 'station' | 'transfer';
  lat: number;
  lng: number;
  dayNumber?: number; // 0 for general/transport, 1..N for specific day
  description?: string;
  price?: number;
  timeSlot?: string;
  imageUrl?: string;
  rating?: number;
  address?: string;
  badge?: string;
}

export interface GeoRouteSegment {
  id: string;
  fromName: string;
  toName: string;
  mode: 'flight' | 'train' | 'drive' | 'walk' | 'transfer';
  coordinates: [number, number][]; // [lat, lng] array
  dayNumber?: number; // 0 for main transfer, 1..N for day itinerary
  duration?: string;
  distanceKm?: number;
  color?: string;
  isDashed?: boolean;
}

/**
 * Calculates Great Circle / Haversine distance in kilometers between two lat/lng points
 */
export function calculateHaversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(2));
}

// Canonical real-world coordinates for major Indian & international destinations and hubs
export const CANONICAL_COORDINATES: Record<string, { lat: number; lng: number; type?: string; airport?: { name: string; code: string; lat: number; lng: number }; station?: { name: string; code: string; lat: number; lng: number } }> = {
  // Cities & Regions
  mumbai: {
    lat: 19.0760,
    lng: 72.8777,
    airport: { name: 'Chhatrapati Shivaji Maharaj Intl Airport', code: 'BOM', lat: 19.0896, lng: 72.8656 },
    station: { name: 'Chhatrapati Shivaji Terminus', code: 'CSMT', lat: 18.9401, lng: 72.8354 }
  },
  delhi: {
    lat: 28.6139,
    lng: 77.2090,
    airport: { name: 'Indira Gandhi Intl Airport', code: 'DEL', lat: 28.5562, lng: 77.1000 },
    station: { name: 'New Delhi Railway Station', code: 'NDLS', lat: 28.6430, lng: 77.2223 }
  },
  bangalore: {
    lat: 12.9716,
    lng: 77.5946,
    airport: { name: 'Kempegowda Intl Airport', code: 'BLR', lat: 13.1986, lng: 77.7066 },
    station: { name: 'KSR Bengaluru Station', code: 'SBC', lat: 12.9781, lng: 77.5694 }
  },
  bengaluru: {
    lat: 12.9716,
    lng: 77.5946,
    airport: { name: 'Kempegowda Intl Airport', code: 'BLR', lat: 13.1986, lng: 77.7066 }
  },
  kolkata: {
    lat: 22.5726,
    lng: 88.3639,
    airport: { name: 'Netaji Subhash Chandra Bose Intl Airport', code: 'CCU', lat: 22.6547, lng: 88.4467 },
    station: { name: 'Howrah Junction', code: 'HWH', lat: 22.5839, lng: 88.3426 }
  },
  chennai: {
    lat: 13.0827,
    lng: 80.2707,
    airport: { name: 'Chennai Intl Airport', code: 'MAA', lat: 12.9941, lng: 80.1709 },
    station: { name: 'Chennai Central', code: 'MAS', lat: 13.0827, lng: 80.2755 }
  },
  hyderabad: {
    lat: 17.3850,
    lng: 78.4867,
    airport: { name: 'Rajiv Gandhi Intl Airport', code: 'HYD', lat: 17.2403, lng: 78.4294 },
    station: { name: 'Secunderabad Junction', code: 'SC', lat: 17.4344, lng: 78.5015 }
  },
  pune: {
    lat: 18.5204,
    lng: 73.8567,
    airport: { name: 'Pune Intl Airport', code: 'PNQ', lat: 18.5822, lng: 73.9197 }
  },
  ahmedabad: {
    lat: 23.0225,
    lng: 72.5714,
    airport: { name: 'Sardar Vallabhbhai Patel Intl Airport', code: 'AMD', lat: 23.0772, lng: 72.6347 }
  },
  jaipur: {
    lat: 26.9124,
    lng: 75.7873,
    airport: { name: 'Jaipur Intl Airport', code: 'JAI', lat: 26.8242, lng: 75.8122 }
  },
  chandigarh: {
    lat: 30.7333,
    lng: 76.7794,
    airport: { name: 'Shaheed Bhagat Singh Intl Airport', code: 'IXC', lat: 30.6735, lng: 76.7885 }
  },
  kochi: {
    lat: 9.9312,
    lng: 76.2673,
    airport: { name: 'Cochin Intl Airport', code: 'COK', lat: 10.1556, lng: 76.3906 },
    station: { name: 'Ernakulam Junction', code: 'ERS', lat: 9.9678, lng: 76.2863 }
  },
  cochin: {
    lat: 9.9312,
    lng: 76.2673,
    airport: { name: 'Cochin Intl Airport', code: 'COK', lat: 10.1556, lng: 76.3906 }
  },

  // Main Holiday Destinations & Transit Hubs
  darjeeling: {
    lat: 27.0410,
    lng: 88.2663,
    airport: { name: 'Bagdogra Intl Airport', code: 'IXB', lat: 26.6812, lng: 88.3286 },
    station: { name: 'New Jalpaiguri Junction', code: 'NJP', lat: 26.6865, lng: 88.4419 }
  },
  bagdogra: {
    lat: 26.6812,
    lng: 88.3286,
    airport: { name: 'Bagdogra Airport (IXB)', code: 'IXB', lat: 26.6812, lng: 88.3286 }
  },
  njp: {
    lat: 26.6865,
    lng: 88.4419,
    station: { name: 'New Jalpaiguri Junction (NJP)', code: 'NJP', lat: 26.6865, lng: 88.4419 }
  },
  siliguri: {
    lat: 26.7271,
    lng: 88.3953
  },

  manali: {
    lat: 32.2396,
    lng: 77.1887,
    airport: { name: 'Kullu-Manali Airport (Bhuntar)', code: 'KUU', lat: 31.8767, lng: 77.1542 }
  },
  bhuntar: {
    lat: 31.8767,
    lng: 77.1542,
    airport: { name: 'Kullu-Bhuntar Airport (KUU)', code: 'KUU', lat: 31.8767, lng: 77.1542 }
  },
  kullu: {
    lat: 31.9579,
    lng: 77.1095
  },

  goa: {
    lat: 15.2993,
    lng: 74.1240,
    airport: { name: 'Dabolim Airport / Mopa Intl Airport', code: 'GOI/GOX', lat: 15.3808, lng: 73.8314 },
    station: { name: 'Madgaon Junction', code: 'MAO', lat: 15.2750, lng: 73.9744 }
  },
  dabolim: {
    lat: 15.3808,
    lng: 73.8314,
    airport: { name: 'Goa Dabolim Airport (GOI)', code: 'GOI', lat: 15.3808, lng: 73.8314 }
  },
  mopa: {
    lat: 15.7533,
    lng: 73.8644,
    airport: { name: 'Manohar Intl Airport Mopa (GOX)', code: 'GOX', lat: 15.7533, lng: 73.8644 }
  },
  madgaon: {
    lat: 15.2750,
    lng: 73.9744,
    station: { name: 'Madgaon Railway Station (MAO)', code: 'MAO', lat: 15.2750, lng: 73.9744 }
  },
  panaji: {
    lat: 15.4909,
    lng: 73.8278
  },

  kerala: {
    lat: 10.0889,
    lng: 77.0595, // Munnar default
    airport: { name: 'Cochin Intl Airport (COK)', code: 'COK', lat: 10.1556, lng: 76.3906 },
    station: { name: 'Ernakulam Junction (ERS)', code: 'ERS', lat: 9.9678, lng: 76.2863 }
  },
  munnar: {
    lat: 10.0889,
    lng: 77.0595,
    airport: { name: 'Cochin Intl Airport (COK)', code: 'COK', lat: 10.1556, lng: 76.3906 }
  },
  alleppey: {
    lat: 9.4981,
    lng: 76.3388
  },
  alappuzha: {
    lat: 9.4981,
    lng: 76.3388
  },

  rajasthan: {
    lat: 26.9124,
    lng: 75.7873, // Jaipur default
    airport: { name: 'Jaipur Intl Airport (JAI)', code: 'JAI', lat: 26.8242, lng: 75.8122 }
  },
  udaipur: {
    lat: 24.5854,
    lng: 73.7125,
    airport: { name: 'Maharana Pratap Airport (UDR)', code: 'UDR', lat: 24.6177, lng: 73.8961 }
  },
  jodhpur: {
    lat: 26.2389,
    lng: 73.0243,
    airport: { name: 'Jodhpur Airport (JDH)', code: 'JDH', lat: 26.2514, lng: 73.0489 }
  },

  kashmir: {
    lat: 34.0837,
    lng: 74.7973, // Srinagar default
    airport: { name: 'Sheikh ul-Alam Intl Airport (SXR)', code: 'SXR', lat: 33.9871, lng: 74.7741 }
  },
  srinagar: {
    lat: 34.0837,
    lng: 74.7973,
    airport: { name: 'Srinagar Airport (SXR)', code: 'SXR', lat: 33.9871, lng: 74.7741 }
  },
  gulmarg: {
    lat: 34.0484,
    lng: 74.3805
  },
  pahalgam: {
    lat: 34.0300,
    lng: 75.3300
  },

  shimla: {
    lat: 31.1048,
    lng: 77.1734,
    airport: { name: 'Shimla Airport (JUB)', code: 'JUB', lat: 31.0818, lng: 77.0678 }
  },
  ooty: {
    lat: 11.4102,
    lng: 76.6950,
    airport: { name: 'Coimbatore Intl Airport (CJB)', code: 'CJB', lat: 11.0298, lng: 77.0434 }
  },
  rishikesh: {
    lat: 30.0869,
    lng: 78.2676,
    airport: { name: 'Dehradun Jolly Grant Airport (DED)', code: 'DED', lat: 30.1897, lng: 78.1803 }
  },
  ladakh: {
    lat: 34.1526,
    lng: 77.5771,
    airport: { name: 'Kushok Bakula Rimpochee Airport (IXL)', code: 'IXL', lat: 34.1359, lng: 77.5465 }
  },
  leh: {
    lat: 34.1526,
    lng: 77.5771,
    airport: { name: 'Leh Airport (IXL)', code: 'IXL', lat: 34.1359, lng: 77.5465 }
  },
  andaman: {
    lat: 11.6234,
    lng: 92.7265,
    airport: { name: 'Veer Savarkar Intl Airport (IXZ)', code: 'IXZ', lat: 11.6412, lng: 92.7297 }
  },
  dubai: {
    lat: 25.2048,
    lng: 55.2708,
    airport: { name: 'Dubai Intl Airport (DXB)', code: 'DXB', lat: 25.2532, lng: 55.3657 }
  },
  bali: {
    lat: -8.4095,
    lng: 115.1889,
    airport: { name: 'Ngurah Rai Intl Airport (DPS)', code: 'DPS', lat: -8.7482, lng: 115.1672 }
  },
  singapore: {
    lat: 1.3521,
    lng: 103.8198,
    airport: { name: 'Singapore Changi Airport (SIN)', code: 'SIN', lat: 1.3644, lng: 103.9915 }
  },
  thailand: {
    lat: 13.7563,
    lng: 100.5018,
    airport: { name: 'Suvarnabhumi Airport (BKK)', code: 'BKK', lat: 13.6900, lng: 100.7501 }
  },
  bangkok: {
    lat: 13.7563,
    lng: 100.5018,
    airport: { name: 'Bangkok Suvarnabhumi (BKK)', code: 'BKK', lat: 13.6900, lng: 100.7501 }
  },
  paris: {
    lat: 48.8566,
    lng: 2.3522,
    airport: { name: 'Charles de Gaulle Airport (CDG)', code: 'CDG', lat: 49.0097, lng: 2.5479 }
  },
  london: {
    lat: 51.5074,
    lng: -0.1278,
    airport: { name: 'London Heathrow Airport (LHR)', code: 'LHR', lat: 51.4700, lng: -0.4543 }
  }
};

// Verified Landmark, Activity & Hotel Real-World Coordinates
export const VERIFIED_POINTS: Record<string, { lat: number; lng: number; category: 'hotel' | 'activity' | 'destination' | 'airport' | 'station'; address?: string; rating?: number }> = {
  // DARJEELING ATTRACTIONS
  'tiger hill': { lat: 26.9944, lng: 88.2861, category: 'activity', address: 'Tiger Hill Summit, Darjeeling', rating: 4.8 },
  'batasia loop': { lat: 27.0168, lng: 88.2471, category: 'activity', address: 'Ghoom-Darjeeling Loop, West Bengal', rating: 4.7 },
  'ghoom monastery': { lat: 27.0125, lng: 88.2575, category: 'activity', address: 'Ghoom, Darjeeling', rating: 4.6 },
  'darjeeling mall': { lat: 27.0428, lng: 88.2676, category: 'activity', address: 'Chowrasta Mall Road, Darjeeling', rating: 4.7 },
  'chowrasta': { lat: 27.0428, lng: 88.2676, category: 'activity', address: 'The Mall, Darjeeling', rating: 4.7 },
  'himalayan mountaineering institute': { lat: 27.0592, lng: 88.2558, category: 'activity', address: 'Jawahar Parbat, Darjeeling', rating: 4.8 },
  'padmaja naidu himalayan zoological park': { lat: 27.0592, lng: 88.2558, category: 'activity', address: 'Zoo Road, Darjeeling', rating: 4.7 },
  'happy valley tea estate': { lat: 27.0526, lng: 88.2612, category: 'activity', address: 'Lebong Cart Rd, Darjeeling', rating: 4.6 },
  'japanese peace pagoda': { lat: 27.0302, lng: 88.2685, category: 'activity', address: 'Jalapahar, Darjeeling', rating: 4.7 },
  'rock garden': { lat: 27.0210, lng: 88.2325, category: 'activity', address: 'Chunnu Summer Falls, Darjeeling', rating: 4.4 },
  'ganga maya park': { lat: 27.0180, lng: 88.2280, category: 'activity', address: 'Ganga Maya Lake, Darjeeling', rating: 4.3 },
  'darjeeling ropeway': { lat: 27.0620, lng: 88.2530, category: 'activity', address: 'Singamari, Darjeeling', rating: 4.5 },
  "glenary's": { lat: 27.0435, lng: 88.2660, category: 'activity', address: 'Nehru Road, Darjeeling', rating: 4.8 },
  'himalayan railway': { lat: 27.0380, lng: 88.2630, category: 'activity', address: 'Darjeeling Railway Station', rating: 4.9 },
  'toy train': { lat: 27.0380, lng: 88.2630, category: 'activity', address: 'Darjeeling Station to Ghoom', rating: 4.9 },
  'tea garden': { lat: 27.0526, lng: 88.2612, category: 'activity', address: 'Happy Valley Tea Estate', rating: 4.6 },
  'lamahatta': { lat: 27.0700, lng: 88.3500, category: 'activity', address: 'Lamahatta Eco Park', rating: 4.6 },
  'mirik lake': { lat: 26.8900, lng: 88.1800, category: 'activity', address: 'Sumendu Lake, Mirik', rating: 4.5 },

  // DARJEELING HOTELS
  'mayfair darjeeling': { lat: 27.0456, lng: 88.2655, category: 'hotel', address: 'Opposite Governor House, Darjeeling', rating: 4.8 },
  'windamere hotel': { lat: 27.0439, lng: 88.2701, category: 'hotel', address: 'Observatory Hill, Darjeeling', rating: 4.7 },
  'cedar inn': { lat: 27.0378, lng: 88.2690, category: 'hotel', address: 'Jalapahar Road, Darjeeling', rating: 4.6 },
  'the elgin darjeeling': { lat: 27.0415, lng: 88.2682, category: 'hotel', address: 'H.D. Lama Road, Darjeeling', rating: 4.7 },
  'central heritage resort': { lat: 27.0440, lng: 88.2670, category: 'hotel', address: 'Robertson Road, Darjeeling', rating: 4.4 },
  'sinclairs darjeeling': { lat: 27.0390, lng: 88.2640, category: 'hotel', address: '18/1 Gandhi Road, Darjeeling', rating: 4.5 },

  // GOA ATTRACTIONS & HOTELS
  'baga beach': { lat: 15.5553, lng: 73.7517, category: 'activity', address: 'North Goa', rating: 4.7 },
  'calangute beach': { lat: 15.5439, lng: 73.7553, category: 'activity', address: 'North Goa', rating: 4.6 },
  'anjuna beach': { lat: 15.5804, lng: 73.7431, category: 'activity', address: 'Anjuna Flea Market, Goa', rating: 4.6 },
  'fort aguada': { lat: 15.4925, lng: 73.7736, category: 'activity', address: 'Candolim, Goa', rating: 4.7 },
  'chapora fort': { lat: 15.6059, lng: 73.7380, category: 'activity', address: 'Vagator, Goa', rating: 4.7 },
  'basilica of bom jesus': { lat: 15.5009, lng: 73.9116, category: 'activity', address: 'Old Goa', rating: 4.8 },
  'dudhsagar falls': { lat: 15.3144, lng: 74.3143, category: 'activity', address: 'Sonaulim, Goa', rating: 4.8 },
  'fontainhas': { lat: 15.4989, lng: 73.8278, category: 'activity', address: 'Latin Quarter, Panaji', rating: 4.7 },
  'mandovi river cruise': { lat: 15.4975, lng: 73.8340, category: 'activity', address: 'Panaji Jetty, Goa', rating: 4.5 },
  'palolem beach': { lat: 15.0100, lng: 74.0232, category: 'activity', address: 'South Goa', rating: 4.8 },
  'taj exotica resort': { lat: 15.2483, lng: 73.9234, category: 'hotel', address: 'Benaulim Beach, South Goa', rating: 4.9 },
  'w goa': { lat: 15.6025, lng: 73.7392, category: 'hotel', address: 'Vagator Beach, Goa', rating: 4.8 },
  'heritage village resort': { lat: 15.3400, lng: 73.8900, category: 'hotel', address: 'Arossim Beach, Goa', rating: 4.6 },

  // MANALI ATTRACTIONS & HOTELS
  'solang valley': { lat: 32.3166, lng: 77.1575, category: 'activity', address: 'Solang, Manali', rating: 4.8 },
  'atal tunnel': { lat: 32.3644, lng: 77.1356, category: 'activity', address: 'Pir Panjal Range, Manali', rating: 4.9 },
  'rohtang pass': { lat: 32.3716, lng: 77.2466, category: 'activity', address: 'Leh-Manali Highway', rating: 4.9 },
  'hadimba temple': { lat: 32.2483, lng: 77.1806, category: 'activity', address: 'Dhungri Forest, Manali', rating: 4.7 },
  'old manali': { lat: 32.2535, lng: 77.1750, category: 'activity', address: 'Old Manali Village & Cafes', rating: 4.7 },
  'jogini falls': { lat: 32.2680, lng: 77.1880, category: 'activity', address: 'Vashisht, Manali', rating: 4.8 },
  'vashisht hot springs': { lat: 32.2633, lng: 77.1873, category: 'activity', address: 'Vashisht Village', rating: 4.5 },
  'the himalayan resort': { lat: 32.2470, lng: 77.1820, category: 'hotel', address: 'Hadimba Road, Manali', rating: 4.8 },
  'span resort & spa': { lat: 32.1330, lng: 77.1670, category: 'hotel', address: 'Kullu Manali Highway', rating: 4.7 },

  // MUNNAR & KERALA
  'tea museum munnar': { lat: 10.0880, lng: 77.0580, category: 'activity', address: 'KDHP Tea Museum, Munnar', rating: 4.6 },
  'eravikulam national park': { lat: 10.2000, lng: 77.0500, category: 'activity', address: 'Rajamalai, Munnar', rating: 4.8 },
  'mattupetty dam': { lat: 10.1060, lng: 77.1240, category: 'activity', address: 'Mattupetty, Munnar', rating: 4.5 },
  'top station munnar': { lat: 10.1240, lng: 77.2450, category: 'activity', address: 'Kannandevan Hills, Munnar', rating: 4.7 },
  'alleppey houseboat': { lat: 9.4981, lng: 76.3388, category: 'activity', address: 'Punnamada Lake, Alappuzha', rating: 4.8 },

  // RAJASTHAN & JAIPUR
  'amber fort': { lat: 26.9855, lng: 75.8513, category: 'activity', address: 'Devisinghpura, Amer, Jaipur', rating: 4.8 },
  'hawa mahal': { lat: 26.9239, lng: 75.8267, category: 'activity', address: 'Badi Choupad, Jaipur', rating: 4.7 },
  'city palace jaipur': { lat: 26.9258, lng: 75.8236, category: 'activity', address: 'Tulsi Marg, Gangori Bazar, Jaipur', rating: 4.8 },
  'jal mahal': { lat: 26.9534, lng: 75.8462, category: 'activity', address: 'Amer Road, Jaipur', rating: 4.6 },
  'nahargarh fort': { lat: 26.9374, lng: 75.8155, category: 'activity', address: 'Krishna Nagar, Brahampuri, Jaipur', rating: 4.7 },

  // KASHMIR
  'dal lake': { lat: 34.0837, lng: 74.8373, category: 'activity', address: 'Srinagar, Jammu & Kashmir', rating: 4.9 },
  'gulmarg gondola': { lat: 34.0484, lng: 74.3805, category: 'activity', address: 'Gulmarg, Baramulla', rating: 4.9 },
  'mughal gardens': { lat: 34.1480, lng: 74.8720, category: 'activity', address: 'Shalimar Bagh, Srinagar', rating: 4.7 },
  'betaab valley': { lat: 34.0300, lng: 75.3300, category: 'activity', address: 'Pahalgam, Anantnag', rating: 4.8 },
};

// Deterministic geo resolver with fuzzy keyword matching
export function resolveCoordinates(
  name: string,
  destinationName?: string,
  indexSeed: number = 0
): { lat: number; lng: number; isEstimated?: boolean } {
  if (!name) {
    if (destinationName && CANONICAL_COORDINATES[destinationName.toLowerCase().trim()]) {
      const dest = CANONICAL_COORDINATES[destinationName.toLowerCase().trim()];
      return { lat: dest.lat, lng: dest.lng };
    }
    return { lat: 20.5937, lng: 78.9629 }; // India center
  }

  const cleanName = name.toLowerCase().trim();

  // 1. Direct match in verified points catalog
  if (VERIFIED_POINTS[cleanName]) {
    return { lat: VERIFIED_POINTS[cleanName].lat, lng: VERIFIED_POINTS[cleanName].lng };
  }

  // 2. Substring match in verified points catalog
  for (const [key, pt] of Object.entries(VERIFIED_POINTS)) {
    if (cleanName.includes(key) || key.includes(cleanName)) {
      return { lat: pt.lat, lng: pt.lng };
    }
  }

  // 3. Match in canonical cities & destinations
  for (const [cityName, cityData] of Object.entries(CANONICAL_COORDINATES)) {
    if (cleanName === cityName || cleanName.includes(cityName)) {
      if (cleanName.includes('airport') && cityData.airport) {
        return { lat: cityData.airport.lat, lng: cityData.airport.lng };
      }
      if ((cleanName.includes('station') || cleanName.includes('railway') || cleanName.includes('train')) && cityData.station) {
        return { lat: cityData.station.lat, lng: cityData.station.lng };
      }
      return { lat: cityData.lat, lng: cityData.lng };
    }
  }

  // 4. If destination is known, cluster within realistic radius (1.5 - 6 km) around the destination center
  if (destinationName) {
    const destKey = destinationName.toLowerCase().trim();
    const destData = CANONICAL_COORDINATES[destKey];
    const baseLat = destData ? destData.lat : 27.0410;
    const baseLng = destData ? destData.lng : 88.2663;

    // Deterministic hash based on name characters so marker doesn't jump randomly on re-renders
    let hash = 0;
    for (let i = 0; i < cleanName.length; i++) {
      hash = (hash << 5) - hash + cleanName.charCodeAt(i);
      hash |= 0;
    }
    const angle = ((Math.abs(hash) + indexSeed * 53) % 360) * (Math.PI / 180);
    const distanceKm = 0.8 + ((Math.abs(hash * 31) % 40) / 10); // 0.8 to 4.8 km offset

    // 1 deg latitude ≈ 111 km, 1 deg longitude ≈ 111 * cos(lat) km
    const latOffset = (distanceKm / 111) * Math.sin(angle);
    const lngOffset = (distanceKm / (111 * Math.cos((baseLat * Math.PI) / 180))) * Math.cos(angle);

    return {
      lat: Number((baseLat + latOffset).toFixed(5)),
      lng: Number((baseLng + lngOffset).toFixed(5)),
      isEstimated: true,
    };
  }

  // 5. Default fallback
  return { lat: 27.0410, lng: 88.2663 };
}

// Generate intermediate curved arc coordinates for flight paths (great circle simulation)
export function generateCurvedFlightPath(
  start: [number, number],
  end: [number, number],
  steps: number = 40
): [number, number][] {
  const points: [number, number][] = [];
  const [lat1, lng1] = start;
  const [lat2, lng2] = end;

  // Midpoint calculation
  const midLat = (lat1 + lat2) / 2;
  const midLng = (lng1 + lng2) / 2;

  // Calculate perpendicular vector for smooth curve arc
  const dLat = lat2 - lat1;
  const dLng = lng2 - lng1;
  const dist = Math.sqrt(dLat * dLat + dLng * dLng);

  // Curve height proportional to distance
  const curveFactor = Math.min(dist * 0.15, 3.5);
  const perpLat = -dLng / dist;
  const perpLng = dLat / dist;

  // Peak of the curve
  const peakLat = midLat + perpLat * curveFactor;
  const peakLng = midLng + perpLng * curveFactor;

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    // Quadratic Bezier interpolation: B(t) = (1-t)^2 * P0 + 2(1-t)t * P1 + t^2 * P2
    const lat = (1 - t) * (1 - t) * lat1 + 2 * (1 - t) * t * peakLat + t * t * lat2;
    const lng = (1 - t) * (1 - t) * lng1 + 2 * (1 - t) * t * peakLng + t * t * lng2;
    points.push([Number(lat.toFixed(5)), Number(lng.toFixed(5))]);
  }

  return points;
}

// Extract all map points, airport hubs, hotel, activities, and routes from a canonical Trip
export function extractTripMapData(trip: any): {
  points: GeoLocationPoint[];
  routes: GeoRouteSegment[];
  center: [number, number];
  bounds?: [[number, number], [number, number]];
  availableDays: number[];
} {
  const points: GeoLocationPoint[] = [];
  const routes: GeoRouteSegment[] = [];
  const destName = trip.destination?.name || 'Darjeeling';
  const destSlug = trip.destination?.slug || destName.toLowerCase();
  const originName = trip.origin || 'Mumbai';

  // 1. Destination Main Point
  const destCoords = trip.destination?.latitude && trip.destination?.longitude
    ? { lat: trip.destination.latitude, lng: trip.destination.longitude }
    : resolveCoordinates(destName);

  points.push({
    id: 'point-destination',
    name: destName,
    category: 'destination',
    lat: destCoords.lat,
    lng: destCoords.lng,
    dayNumber: 0,
    description: trip.destination?.description || `Primary trip destination: ${destName}`,
    badge: 'Destination',
    imageUrl: trip.destination?.hero_image_url
  });

  // 2. Origin City Point
  const originCoords = resolveCoordinates(originName);
  points.push({
    id: 'point-origin',
    name: originName,
    category: 'origin',
    lat: originCoords.lat,
    lng: originCoords.lng,
    dayNumber: 0,
    description: `Trip origin departure city: ${originName}`,
    badge: 'Origin Departure'
  });

  // 3. Transit Hub / Airport / Station Point
  let transitPoint: GeoLocationPoint | null = null;
  const transport = trip.selected_transport;
  if (transport?.transit_hub) {
    const transitCoords = resolveCoordinates(transport.transit_hub, destName);
    const isAirport = transport.transit_hub.toLowerCase().includes('airport') || transport.mode === 'flight';
    transitPoint = {
      id: 'point-transit',
      name: transport.transit_hub,
      category: isAirport ? 'airport' : 'station',
      lat: transitCoords.lat,
      lng: transitCoords.lng,
      dayNumber: 0,
      description: `${transport.title} (${transport.operator}) • Arrival at ${transport.arrival_time}`,
      price: transport.total_price,
      badge: isAirport ? 'Airport Hub' : 'Railway Hub'
    };
    points.push(transitPoint);

    // Route 1: Origin -> Transit Hub (Flight/Train line)
    const flightArc = generateCurvedFlightPath(
      [originCoords.lat, originCoords.lng],
      [transitCoords.lat, transitCoords.lng]
    );

    routes.push({
      id: 'route-origin-transit',
      fromName: originName,
      toName: transport.transit_hub,
      mode: transport.mode || 'flight',
      coordinates: flightArc,
      dayNumber: 0,
      duration: transport.duration_str,
      color: transport.mode === 'flight' ? '#3B82F6' : '#EAB308',
      isDashed: true
    });
  }

  // 4. Hotel / Accommodation Points (Multi-hotel & Day-specific Stay support)
  const hotelPointsByDay = new Map<number, GeoLocationPoint>();
  const uniqueHotels = new Map<string, { hotel: any; dayNumbers: number[] }>();

  // Extract from daily_accommodations if available, otherwise fallback to selected_accommodation
  if (trip.daily_accommodations && Array.isArray(trip.daily_accommodations) && trip.daily_accommodations.length > 0) {
    trip.daily_accommodations.forEach((da: any) => {
      if (da?.hotel) {
        const hId = da.hotel.id || da.hotel.name;
        if (!uniqueHotels.has(hId)) {
          uniqueHotels.set(hId, { hotel: da.hotel, dayNumbers: [da.day_number] });
        } else {
          uniqueHotels.get(hId)!.dayNumbers.push(da.day_number);
        }
      }
    });
  } else if (trip.selected_accommodation) {
    uniqueHotels.set(trip.selected_accommodation.id, {
      hotel: trip.selected_accommodation,
      dayNumbers: Array.from({ length: trip.duration_days || 5 }, (_, i) => i + 1)
    });
  }

  let previousHotelPoint: GeoLocationPoint | null = null;
  let primaryHotelPoint: GeoLocationPoint | null = null;

  uniqueHotels.forEach(({ hotel, dayNumbers }, hId) => {
    const hotelCoords = hotel.latitude && hotel.longitude
      ? { lat: hotel.latitude, lng: hotel.longitude }
      : resolveCoordinates(hotel.name, destName, 1);

    const minDay = Math.min(...dayNumbers);
    const maxDay = Math.max(...dayNumbers);
    const daySpanLabel = dayNumbers.length === 1
      ? `Night ${minDay} Stay`
      : `Nights ${minDay}–${maxDay} Stay`;

    const hPoint: GeoLocationPoint = {
      id: `point-hotel-${hId}`,
      name: hotel.name,
      category: 'hotel',
      lat: hotelCoords.lat,
      lng: hotelCoords.lng,
      dayNumber: minDay,
      description: `${hotel.room_type} • ${hotel.location}`,
      price: hotel.price_per_night,
      rating: hotel.rating,
      badge: uniqueHotels.size > 1 ? daySpanLabel : (hotel.badge?.replace('_', ' ').toUpperCase() || 'STAY'),
      imageUrl: hotel.hero_image,
      address: hotel.location
    };

    points.push(hPoint);
    if (!primaryHotelPoint) primaryHotelPoint = hPoint;

    dayNumbers.forEach((d) => {
      hotelPointsByDay.set(d, hPoint);
    });

    // Draw inter-hotel relocation transfer route if moving to a new hotel
    if (previousHotelPoint && previousHotelPoint.id !== hPoint.id) {
      routes.push({
        id: `route-hotel-switch-${previousHotelPoint.id}-${hPoint.id}`,
        fromName: previousHotelPoint.name,
        toName: hPoint.name,
        mode: 'transfer',
        coordinates: [
          [previousHotelPoint.lat, previousHotelPoint.lng],
          [hPoint.lat, hPoint.lng]
        ],
        dayNumber: minDay,
        duration: '45 mins stay relocation',
        color: '#8B5CF6',
        isDashed: true
      });
    }
    previousHotelPoint = hPoint;
  });

  // Route 2: Transit Hub -> Initial Hotel (Cab/Transfer line)
  if (transitPoint && primaryHotelPoint) {
    routes.push({
      id: 'route-transit-hotel',
      fromName: transitPoint.name,
      toName: primaryHotelPoint.name,
      mode: 'transfer',
      coordinates: [
        [transitPoint.lat, transitPoint.lng],
        [primaryHotelPoint.lat, primaryHotelPoint.lng]
      ],
      dayNumber: 1,
      duration: transport?.dependent_transfer?.duration_str || '1.5 hrs',
      color: '#10B981',
      isDashed: false
    });
  }

  // 5. Day-by-Day Activities
  const availableDaysSet = new Set<number>();
  if (trip.itinerary && Array.isArray(trip.itinerary)) {
    // Group active (non-disabled) activities by day
    const dayGroups: Record<number, any[]> = {};

    trip.itinerary.forEach((item: any, idx: number) => {
      const day = item.day_number || 1;
      availableDaysSet.add(day);

      // Skip disabled activities for map routes and active markers
      if (item.is_disabled) {
        return;
      }

      if (!dayGroups[day]) dayGroups[day] = [];
      dayGroups[day].push(item);

      // Resolve coordinates for each item
      const itemCoords = item.latitude && item.longitude
        ? { lat: item.latitude, lng: item.longitude }
        : resolveCoordinates(item.title, destName, idx + 2);

      points.push({
        id: `point-activity-${item.id || idx}`,
        name: item.title,
        category: item.item_type === 'transport' ? 'transfer' : 'activity',
        lat: itemCoords.lat,
        lng: itemCoords.lng,
        dayNumber: day,
        description: item.description,
        price: item.cost,
        timeSlot: item.start_time ? `${item.start_time} - ${item.end_time || ''}` : undefined,
        imageUrl: item.image_url,
        badge: `Day ${day}`
      });
    });

    // Create day route polylines connecting hotel and day's activities
    Object.entries(dayGroups).forEach(([dayStr, items]) => {
      const dayNum = Number(dayStr);
      const dayPoints: [number, number][] = [];
      const dayHotelPoint = hotelPointsByDay.get(dayNum) || primaryHotelPoint;

      // Start at hotel if available
      if (dayHotelPoint) {
        dayPoints.push([dayHotelPoint.lat, dayHotelPoint.lng]);
      }

      // Add each activity point in order
      items.forEach((it) => {
        const p = points.find((pt) => pt.id === `point-activity-${it.id || ''}` || pt.name === it.title);
        if (p) {
          dayPoints.push([p.lat, p.lng]);
        }
      });

      // Loop back to hotel in the evening
      if (dayHotelPoint && dayPoints.length > 1) {
        dayPoints.push([dayHotelPoint.lat, dayHotelPoint.lng]);
      }

      if (dayPoints.length >= 2) {
        routes.push({
          id: `route-day-${dayNum}`,
          fromName: `Day ${dayNum} Circuit`,
          toName: `${items.length} Stops`,
          mode: 'drive',
          coordinates: dayPoints,
          dayNumber: dayNum,
          color: getDayColor(dayNum),
          isDashed: false
        });
      }
    });
  }

  // Determine active center and bounds
  const lats = points.map((p) => p.lat);
  const lngs = points.map((p) => p.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  return {
    points,
    routes,
    center: [destCoords.lat, destCoords.lng],
    bounds: [
      [minLat - 0.05, minLng - 0.05],
      [maxLat + 0.05, maxLng + 0.05]
    ],
    availableDays: Array.from(availableDaysSet).sort((a, b) => a - b)
  };
}

// Distinct theme colors for day circuits
export function getDayColor(dayNumber: number): string {
  const colors = [
    '#7065F0', // Day 1: Purple
    '#F59E0B', // Day 2: Amber
    '#EC4899', // Day 3: Pink
    '#06B6D4', // Day 4: Cyan
    '#10B981', // Day 5: Emerald
    '#8B5CF6', // Day 6: Violet
    '#F97316', // Day 7: Orange
  ];
  return colors[(dayNumber - 1) % colors.length];
}
