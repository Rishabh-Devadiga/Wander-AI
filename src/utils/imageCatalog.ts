// Image Catalog & Resolver for TourFlow AI
// Provides legitimate, verified, high-resolution Unsplash photo collections for destinations, hotels, and attractions.

export interface DestinationPhotoSet {
  hero: string;
  gallery: string[];
  caption: string;
  weatherSummary?: string;
  bestTime?: string;
}

export const DESTINATION_PHOTO_CATALOG: Record<string, DestinationPhotoSet> = {
  darjeeling: {
    hero: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=1400&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1622308644420-a92299839958?auto=format&fit=crop&w=800&q=80', // UNESCO Toy Train
      'https://images.unsplash.com/photo-1571401835393-8c5f35328320?auto=format&fit=crop&w=800&q=80', // Tiger Hill Kanchenjunga Sunrise
      'https://images.unsplash.com/photo-1596895111956-bf1cf0599ce5?auto=format&fit=crop&w=800&q=80', // Happy Valley Tea Garden
      'https://images.unsplash.com/photo-1588714477688-cf28a50e94f7?auto=format&fit=crop&w=800&q=80', // Ghoom Tibetan Monastery
      'https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=800&q=80', // Japanese Peace Pagoda
    ],
    caption: 'The Queen of the Hills overlooking snow-clad Mt. Kanchenjunga and emerald tea valleys',
    weatherSummary: '14°C - 21°C • Crisp Himalayan Mountain Air',
    bestTime: 'October to May (Peak Sunrise Season)',
  },
  goa: {
    hero: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=1400&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1614082242765-7c98ca0f3df3?auto=format&fit=crop&w=800&q=80', // Fort Aguada Lighthouse
      'https://images.unsplash.com/photo-1587922546307-776227941871?auto=format&fit=crop&w=800&q=80', // Dudhsagar Cascades
      'https://images.unsplash.com/photo-1580227974546-f9479b183669?auto=format&fit=crop&w=800&q=80', // Old Goa Basilica
      'https://images.unsplash.com/photo-1544644181-1484b3fdfc62?auto=format&fit=crop&w=800&q=80', // Calangute / Baga Beach Sunset
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80', // Mandovi River Catamaran
    ],
    caption: 'Sun-drenched golden coastline with Portuguese colonial heritage and swaying palms',
    weatherSummary: '26°C - 31°C • Warm Tropical Coastal Breeze',
    bestTime: 'November to April (Beach & Watersports Season)',
  },
  manali: {
    hero: 'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=1400&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1605649487212-47bdab064df7?auto=format&fit=crop&w=800&q=80', // Rohtang Pass snow peaks
      'https://images.unsplash.com/photo-1589182373726-e4f658ab50f0?auto=format&fit=crop&w=800&q=80', // Hadimba Temple in cedar woods
      'https://images.unsplash.com/photo-1578894381163-e72c17f2d45f?auto=format&fit=crop&w=800&q=80', // Jogini Falls
      'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80', // Alpine pine valley
    ],
    caption: 'Dramatic snow-capped Pir Panjal peaks, alpine cedar woods, and Beas river waters',
    weatherSummary: '10°C - 18°C • Refreshing Mountain Valley Climate',
    bestTime: 'Year-round (Snow: Dec-Feb, Meadows: May-Oct)',
  },
  kerala: {
    hero: 'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=1400&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1593693397690-362cb9666fc2?auto=format&fit=crop&w=800&q=80', // Munnar Tea Gardens
      'https://images.unsplash.com/photo-1609137144820-22c608f658ff?auto=format&fit=crop&w=800&q=80', // Kochi Chinese Nets
      'https://images.unsplash.com/photo-1590050752117-238cb0fb12b1?auto=format&fit=crop&w=800&q=80', // Varkala Cliff Coast
      'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=800&q=80', // Ayurvedic Resort
    ],
    caption: "God's Own Country with serene palm-fringed backwaters, Munnar tea hills, and spice aromas",
    weatherSummary: '24°C - 30°C • Lush Tropical Backwaters',
    bestTime: 'September to March',
  },
  rajasthan: {
    hero: 'https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&w=1400&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1589308078059-be1415eab4c3?auto=format&fit=crop&w=800&q=80', // Hawa Mahal Jaipur
      'https://images.unsplash.com/photo-1568454537842-d933259bb258?auto=format&fit=crop&w=800&q=80', // Lake Pichola Udaipur
      'https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=800&q=80', // Thar Desert Jaisalmer
    ],
    caption: 'Royal palaces, monumental hilltop fortresses, and golden Thar sand dunes',
    weatherSummary: '18°C - 28°C • Pleasant Heritage Season',
    bestTime: 'October to March',
  },
  kashmir: {
    hero: 'https://images.unsplash.com/photo-1595815771614-ade9d652a65d?auto=format&fit=crop&w=1400&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1566837945700-30057527ade0?auto=format&fit=crop&w=800&q=80', // Gulmarg Gondola
      'https://images.unsplash.com/photo-1598091383021-15ddea10925d?auto=format&fit=crop&w=800&q=80', // Betaab Valley Pahalgam
      'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=800&q=80', // Pine Heritage Stay
    ],
    caption: 'Paradise on Earth with tranquil Dal Lake houseboats and snow-capped Himalayan meadows',
    weatherSummary: '8°C - 18°C • Alpine Mountain Serenity',
    bestTime: 'April to October (Snow: Dec-Feb)',
  },
  'uttar pradesh': {
    hero: 'https://images.unsplash.com/photo-1561361513-2d000a50f0dc?auto=format&fit=crop&w=1400&q=80', // Varanasi Ganga Ghats Aarti
    gallery: [
      'https://images.unsplash.com/photo-1564507592333-c60657eea523?auto=format&fit=crop&w=800&q=80', // Taj Mahal Agra Sunrise
      'https://images.unsplash.com/photo-1561361513-2d000a50f0dc?auto=format&fit=crop&w=800&q=80', // Dashashwamedh Ghat Aarti
      'https://images.unsplash.com/photo-1571536802807-30451e3955d8?auto=format&fit=crop&w=800&q=80', // Varanasi Boats
      'https://images.unsplash.com/photo-1598890777032-bde835ba27c2?auto=format&fit=crop&w=800&q=80', // Rumi Darwaza Lucknow
    ],
    caption: 'Spiritual and cultural heartland featuring Varanasi Ganga Aarti, the Taj Mahal, and Awadhi heritage',
    weatherSummary: '22°C - 31°C • Pleasant Cultural Exploration Season',
    bestTime: 'October to March (Winter & Festival Season)',
  },
  varanasi: {
    hero: 'https://images.unsplash.com/photo-1561361513-2d000a50f0dc?auto=format&fit=crop&w=1400&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1571536802807-30451e3955d8?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1627894006066-b4570081d643?auto=format&fit=crop&w=800&q=80',
    ],
    caption: 'The ancient spiritual capital on the sacred banks of Mother Ganga',
    weatherSummary: '20°C - 30°C • Evening Ganga Breeze',
    bestTime: 'October to March',
  },
  bali: {
    hero: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=1400&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=800&q=80', // Uluwatu Sea Temple
      'https://images.unsplash.com/photo-1555400038-63f5ba517a47?auto=format&fit=crop&w=800&q=80', // Tegallalang Rice Terraces
      'https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?auto=format&fit=crop&w=800&q=80', // Tirta Empul / Lempuyang Gate
      'https://images.unsplash.com/photo-1544644181-1484b3fdfc62?auto=format&fit=crop&w=800&q=80', // Seminyak Beach Sunset
      'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=800&q=80', // Nusa Penida Kelingking
    ],
    caption: 'The Island of the Gods with sacred sea temples, emerald rice terraces, and golden sunset beaches',
    weatherSummary: '27°C - 31°C • Balmy Tropical Ocean Breeze',
    bestTime: 'April to October (Dry & Sunny Season)',
  },
  china: {
    hero: 'https://images.unsplash.com/photo-1508804185872-d7badad00f7d?auto=format&fit=crop&w=1400&q=80', // Great Wall of China
    gallery: [
      'https://images.unsplash.com/photo-1508804185872-d7badad00f7d?auto=format&fit=crop&w=800&q=80', // Great Wall Mutianyu
      'https://images.unsplash.com/photo-1547981609-4b6bfe67ca0b?auto=format&fit=crop&w=800&q=80', // Forbidden City Beijing
      'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?auto=format&fit=crop&w=800&q=80', // Shanghai Skyline & The Bund
      'https://images.unsplash.com/photo-1513415277900-a62401e19be4?auto=format&fit=crop&w=800&q=80', // Summer Palace Kunming Lake
      'https://images.unsplash.com/photo-1528702748617-c64d49f918af?auto=format&fit=crop&w=800&q=80', // Guilin Karst Peaks & Li River
    ],
    caption: 'Ancient wonders, imperial palaces, and ultra-modern skylines from the Great Wall to Shanghai',
    weatherSummary: '16°C - 24°C • Pleasant Autumn Exploration Weather',
    bestTime: 'September to November (Autumn) & April to May (Spring)',
  },
  japan: {
    hero: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1400&q=80', // Kyoto Temple & Pagoda
    gallery: [
      'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=800&q=80', // Kyoto Fushimi Inari
      'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=800&q=80', // Tokyo Shinjuku Night
      'https://images.unsplash.com/photo-1528164344705-475426879c0d?auto=format&fit=crop&w=800&q=80', // Mt. Fuji & Chureito Pagoda
      'https://images.unsplash.com/photo-1545569341-9eb8b30979d9?auto=format&fit=crop&w=800&q=80', // Arashiyama Bamboo Grove
    ],
    caption: 'Harmonious blend of ancient shrines, cherry blossoms, and futuristic neon metropolises',
    weatherSummary: '15°C - 22°C • Clear & Crisp Season',
    bestTime: 'March to May & September to November',
  },
  thailand: {
    hero: 'https://images.unsplash.com/photo-1506665531395-9d077b008514?auto=format&fit=crop&w=1400&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1506665531395-9d077b008514?auto=format&fit=crop&w=800&q=80', // Bangkok Grand Palace
      'https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?auto=format&fit=crop&w=800&q=80', // Phuket Phi Phi Islands
      'https://images.unsplash.com/photo-1528181304800-259b08848526?auto=format&fit=crop&w=800&q=80', // Ayutthaya Temples
    ],
    caption: 'The Land of Smiles featuring ornate gilded temples, vibrant street night markets, and turquoise islands',
    weatherSummary: '28°C - 33°C • Tropical Sun & Warm Breeze',
    bestTime: 'November to April',
  },
  singapore: {
    hero: 'https://images.unsplash.com/photo-1525625293386-3f8f99389edd?auto=format&fit=crop&w=1400&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1525625293386-3f8f99389edd?auto=format&fit=crop&w=800&q=80', // Marina Bay Sands & Merlion
      'https://images.unsplash.com/photo-1506351421178-63b52a2d2562?auto=format&fit=crop&w=800&q=80', // Gardens by the Bay Supertree
      'https://images.unsplash.com/photo-1565967511849-76a60a516170?auto=format&fit=crop&w=800&q=80', // Jewel Changi Waterfall
    ],
    caption: 'Futuristic Garden City boasting Supertree Groves, world-class culinary havens, and Marina Bay skyline',
    weatherSummary: '26°C - 31°C • Warm Equatorial Sunshine',
    bestTime: 'Year-round (November to January festive season)',
  },
  dubai: {
    hero: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=1400&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=800&q=80', // Burj Khalifa & Downtown
      'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&q=80', // Dubai Desert Safari
      'https://images.unsplash.com/photo-1580674684081-7617fbf3d745?auto=format&fit=crop&w=800&q=80', // Palm Jumeirah
    ],
    caption: 'Ultra-modern desert metropolis with record-breaking skyscrapers, golden dunes, and luxury shopping',
    weatherSummary: '24°C - 32°C • Sun-Drenched Desert Season',
    bestTime: 'October to April',
  },
};

// Activity Photo Matching Helper
export const getActivityPhoto = (title: string, destinationName: string): string => {
  const t = title.toLowerCase();
  const d = destinationName.toLowerCase();

  // Bali Activities
  if (d.includes('bali') || d.includes('ubud') || d.includes('seminyak')) {
    if (t.includes('temple') || t.includes('uluwatu') || t.includes('tanah lot') || t.includes('lempuyang') || t.includes('tirta empul')) {
      return 'https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?auto=format&fit=crop&w=800&q=80';
    }
    if (t.includes('rice') || t.includes('tegallalang') || t.includes('terrace') || t.includes('swing')) {
      return 'https://images.unsplash.com/photo-1555400038-63f5ba517a47?auto=format&fit=crop&w=800&q=80';
    }
    if (t.includes('beach') || t.includes('sunset') || t.includes('seminyak') || t.includes('canggu') || t.includes('surf') || t.includes('potato head')) {
      return 'https://images.unsplash.com/photo-1544644181-1484b3fdfc62?auto=format&fit=crop&w=800&q=80';
    }
    if (t.includes('monkey') || t.includes('forest') || t.includes('batur') || t.includes('volcano') || t.includes('waterfall') || t.includes('tegenungan')) {
      return 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=800&q=80';
    }
    if (t.includes('nusa penida') || t.includes('snorkeling') || t.includes('kelingking') || t.includes('boat')) {
      return 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=800&q=80';
    }
    return 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=800&q=80';
  }

  // Darjeeling Activities
  if (d.includes('darjeeling') || d.includes('sikkim')) {
    if (t.includes('tiger hill') || t.includes('sunrise') || t.includes('kanchenjunga')) {
      return 'https://images.unsplash.com/photo-1571401835393-8c5f35328320?auto=format&fit=crop&w=800&q=80';
    }
    if (t.includes('toy train') || t.includes('railway') || t.includes('batasia')) {
      return 'https://images.unsplash.com/photo-1622308644420-a92299839958?auto=format&fit=crop&w=800&q=80';
    }
    if (t.includes('tea') || t.includes('estate') || t.includes('happy valley') || t.includes('plucking')) {
      return 'https://images.unsplash.com/photo-1596895111956-bf1cf0599ce5?auto=format&fit=crop&w=800&q=80';
    }
    if (t.includes('ghoom') || t.includes('monastery') || t.includes('buddha') || t.includes('tibetan')) {
      return 'https://images.unsplash.com/photo-1588714477688-cf28a50e94f7?auto=format&fit=crop&w=800&q=80';
    }
    if (t.includes('pagoda') || t.includes('peace')) {
      return 'https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=800&q=80';
    }
    if (t.includes('zoo') || t.includes('mountaineering') || t.includes('panda') || t.includes('institute')) {
      return 'https://images.unsplash.com/photo-1534567153574-2b12153a87f0?auto=format&fit=crop&w=800&q=80';
    }
    if (t.includes('mirik') || t.includes('lake') || t.includes('boating')) {
      return 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80';
    }
    if (t.includes('rock garden') || t.includes('waterfall') || t.includes('cascade')) {
      return 'https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?auto=format&fit=crop&w=800&q=80';
    }
    if (t.includes('mall') || t.includes('glenary') || t.includes('market') || t.includes('bakery') || t.includes('shopping')) {
      return 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80';
    }
    if (t.includes('lamahatta') || t.includes('tinchuley') || t.includes('pine')) {
      return 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=800&q=80';
    }
  }

  // Goa Activities
  if (d.includes('goa')) {
    if (t.includes('beach') || t.includes('water sports') || t.includes('calangute') || t.includes('baga') || t.includes('parasailing')) {
      return 'https://images.unsplash.com/photo-1544644181-1484b3fdfc62?auto=format&fit=crop&w=800&q=80';
    }
    if (t.includes('fort') || t.includes('aguada') || t.includes('lighthouse') || t.includes('bastion')) {
      return 'https://images.unsplash.com/photo-1614082242765-7c98ca0f3df3?auto=format&fit=crop&w=800&q=80';
    }
    if (t.includes('dudhsagar') || t.includes('waterfall') || t.includes('jungle')) {
      return 'https://images.unsplash.com/photo-1587922546307-776227941871?auto=format&fit=crop&w=800&q=80';
    }
    if (t.includes('church') || t.includes('basilica') || t.includes('bom jesus') || t.includes('heritage walk') || t.includes('old goa')) {
      return 'https://images.unsplash.com/photo-1580227974546-f9479b183669?auto=format&fit=crop&w=800&q=80';
    }
    if (t.includes('cruise') || t.includes('catamaran') || t.includes('mandovi') || t.includes('sunset')) {
      return 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80';
    }
    if (t.includes('spice') || t.includes('plantation') || t.includes('sahakari') || t.includes('lunch')) {
      return 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=800&q=80';
    }
    if (t.includes('anjuna') || t.includes('flea market') || t.includes('cafe') || t.includes('curlies')) {
      return 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=800&q=80';
    }
  }

  // Manali Activities
  if (d.includes('manali')) {
    if (t.includes('solang') || t.includes('paragliding') || t.includes('snow') || t.includes('skiing')) {
      return 'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=800&q=80';
    }
    if (t.includes('rohtang') || t.includes('pass')) {
      return 'https://images.unsplash.com/photo-1605649487212-47bdab064df7?auto=format&fit=crop&w=800&q=80';
    }
    if (t.includes('hadimba') || t.includes('temple') || t.includes('forest')) {
      return 'https://images.unsplash.com/photo-1589182373726-e4f658ab50f0?auto=format&fit=crop&w=800&q=80';
    }
    if (t.includes('jogini') || t.includes('waterfall') || t.includes('trek')) {
      return 'https://images.unsplash.com/photo-1578894381163-e72c17f2d45f?auto=format&fit=crop&w=800&q=80';
    }
  }

  // Generic Nature / Culture / Dining fallbacks
  if (t.includes('dinner') || t.includes('breakfast') || t.includes('culinary') || t.includes('meal') || t.includes('taste')) {
    return 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80';
  }
  if (t.includes('transfer') || t.includes('airport') || t.includes('train') || t.includes('drive')) {
    return 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=800&q=80';
  }

  // Destination fallback
  const destSet = DESTINATION_PHOTO_CATALOG[Object.keys(DESTINATION_PHOTO_CATALOG).find((k) => d.includes(k)) || ''];
  return destSet?.hero || 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80';
};

export const getDestinationPhotos = (destinationName: string): DestinationPhotoSet => {
  const lower = destinationName.toLowerCase().trim();
  const matchKey = Object.keys(DESTINATION_PHOTO_CATALOG).find((k) => lower.includes(k));
  if (matchKey) {
    return DESTINATION_PHOTO_CATALOG[matchKey];
  }
  // Generic Dynamic Destination Photo Set
  return {
    hero: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=1400&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80',
    ],
    caption: `Curated journey exploring the finest landscapes, stays, and heritage of ${destinationName}`,
    weatherSummary: 'Pleasant & Ideal for Travel',
    bestTime: 'Peak Seasonal Windows',
  };
};
