// Places shown on the map.
// Land coordinates were checked against OpenStreetMap (Nominatim).
// Sea-life pins (type 'sea') mark an approximate AREA where the animals are often seen, not an exact spot.
// `approx: true` = position is a rough guess within the right atoll.
// `district` groups places by atoll (see DISTRICTS in js/i18n.js and island/island.js).
window.MV_PLACES = [
  // ---------- GETTING THERE & AROUND ----------
  {
    id: 'velana', type: 'go', emoji: '✈️', district: 'male',
    name: 'Velana International Airport', zh: '维拉纳国际机场',
    lat: 4.1962, lng: 73.5301,
    blurb: 'The gateway to the country, on its own island right next to the capital. Step out of arrivals and the sea is already turquoise.',
    tip: 'Book your resort transfer in advance: speedboat, seaplane or a domestic flight depending on where you are going.',
  },
  {
    id: 'seaplane', type: 'go', emoji: '🛩️', district: 'male', approx: true,
    name: 'Seaplane Lounge', zh: '水上飞机候机厅',
    lat: 4.2032, lng: 73.5293,
    blurb: 'A fleet of little red-and-white floatplanes takes off from the water here and hops over the atolls. The flight itself is half the holiday.',
    tip: 'Seaplanes fly in daylight only and luggage limits are tight (often around 20 kg), so pack soft bags and expect a wait.',
  },
  {
    id: 'ferry', type: 'go', emoji: '⛴️', district: 'male',
    name: 'Hulhumalé Ferry Terminal', zh: '胡鲁马累渡轮码头',
    lat: 4.2170, lng: 73.5373,
    blurb: 'Cheap public ferries and dhoni boats link the capital, the airport islands and the nearby local islands.',
    tip: 'Ferries are for locals first: bring small change, travel light and check the timetable, which changes on holidays.',
  },

  // ---------- ISLANDS ----------
  {
    id: 'male', type: 'island', emoji: '🕌', district: 'male',
    name: 'Malé', zh: '马累',
    lat: 4.1780, lng: 73.5107,
    blurb: 'The capital is one of the most crowded islands on Earth. Find the golden-domed Grand Friday Mosque, the 1658 coral-stone Old Friday Mosque and the lively fish market.',
    tip: 'An afternoon on foot is plenty. Dress modestly and check mosque visiting times first.',
  },
  {
    id: 'hulhumale', type: 'island', emoji: '🏙️', district: 'male',
    name: 'Hulhumalé', zh: '胡鲁马累',
    lat: 4.2139, lng: 73.5385,
    blurb: 'A planned island built on reclaimed reef beside the airport, with wide streets, cafés and a public beach.',
    tip: 'A handy first or last night: the airport is a short ride away and the Sinamalé Bridge links it to Malé.',
  },
  {
    id: 'maafushi', type: 'island', emoji: '🏝️', district: 'male',
    name: 'Maafushi', zh: '马富士岛',
    lat: 3.9412, lng: 73.4900,
    blurb: 'A local island that opened up guesthouse travel: a bikini beach, snorkelling trips, sandbank picnics and friendly cafés.',
    tip: 'Swimwear stays on the designated bikini beach; cover up in the village. Ferries run from Malé.',
  },
  {
    id: 'thulusdhoo', type: 'island', emoji: '🏄', district: 'male',
    name: 'Thulusdhoo', zh: '图鲁斯杜岛',
    lat: 4.3734, lng: 73.6485,
    blurb: 'The surf island, with the famous Cokes and Chickens breaks. The Coca-Cola bottling plant is the local landmark.',
    tip: 'The surf season is roughly March to November. Ask a local guide which break suits your level.',
  },
  {
    id: 'dhigurah', type: 'island', emoji: '🌴', district: 'ari',
    name: 'Dhigurah', zh: '迪古拉岛',
    lat: 3.5253, lng: 72.9230,
    blurb: 'A long, thin island in South Ari Atoll with a beach that seems to go on forever and a sandbank at one end.',
    tip: 'A popular base for whale shark trips. Use reef-safe sunscreen and dress modestly in the village.',
  },
  {
    id: 'addu', type: 'island', emoji: '🚲', district: 'south',
    name: 'Addu City (Gan)', zh: '阿杜城（甘岛）',
    lat: -0.6908, lng: 73.1557,
    blurb: 'The southernmost atoll, where islands are joined by a long causeway road, an old British air base sits on Gan, and everyone gets around by bike or scooter.',
    tip: 'Rent a bike or scooter for the link road. It is a long way south: fly from Malé.',
  },

  // ---------- HOTELS ----------
  {
    id: 'kurumba', type: 'hotel', emoji: '🏨', district: 'nmale',
    name: 'Kurumba Maldives', zh: '库鲁巴岛度假村',
    lat: 4.2256, lng: 73.5204,
    blurb: 'The first resort island in the Maldives, opened in 1972, just a short speedboat ride from the airport.',
    tip: 'Great for a short stay or a first-night splash: no seaplane needed. Buggies and bikes carry you between the beach and your room.',
  },
  {
    id: 'baros', type: 'hotel', emoji: '🏖️', district: 'nmale',
    name: 'Baros Maldives', zh: '巴罗斯度假村',
    lat: 4.2847, lng: 73.4272,
    blurb: 'A small palm-fringed island with overwater villas and a lively house reef you can snorkel straight from the sand.',
    tip: 'A roughly half-hour speedboat from the airport. Bring a snorkel: the reef starts right off the beach.',
  },
  {
    id: 'gili', type: 'hotel', emoji: '🛖', district: 'nmale',
    name: 'Gili Lankanfushi', zh: '吉利兰卡纳富士度假村',
    lat: 4.2952, lng: 73.5584,
    blurb: 'Huge thatched villas on long wooden jetties, bicycles instead of cars, and a barefoot “no news, no shoes” spirit.',
    tip: 'Reached by a short speedboat. Pack light: you will live in bare feet.',
  },
  {
    id: 'conrad', type: 'hotel', emoji: '🐚', district: 'ari',
    name: 'Conrad Maldives Rangali Island', zh: '康莱德朗格里岛度假村',
    lat: 3.6181, lng: 72.7234,
    blurb: 'Two islands joined by a walkway, and an undersea restaurant with glass walls five metres below the surface.',
    tip: 'A seaplane ride of around half an hour from Malé. Reserve the undersea restaurant well ahead.',
  },
  {
    id: 'soneva', type: 'hotel', emoji: '🌿', district: 'baa',
    name: 'Soneva Fushi', zh: '索尼娃富士度假村',
    lat: 5.1117, lng: 73.0829,
    blurb: 'Barefoot luxury inside the Baa Atoll UNESCO Biosphere Reserve: sandy paths, treehouse-style villas and an observatory for stargazing.',
    tip: 'A seaplane ride from Malé. Hanifaru Bay is a short trip away, best in the wetter months.',
  },
  {
    id: 'velaa', type: 'hotel', emoji: '⛳', district: 'baa',
    name: 'Velaa Private Island', zh: '维拉私人岛度假村',
    lat: 5.8311, lng: 73.2094,
    blurb: 'A private-island resort in Noonu Atoll with big pool villas and its own golf academy, all linked by buggies.',
    tip: 'Getting there takes a seaplane or domestic flight plus a short boat ride. Plan a full travel day.',
  },

  // ---------- SEA LIFE ----------
  {
    id: 'bananareef', type: 'sea', emoji: '🐠', district: 'nmale', approx: true, creature: 'reef',
    name: 'Banana Reef', zh: '香蕉礁',
    lat: 4.2342, lng: 73.5340,
    blurb: 'One of the first dive sites in the country. A banana-shaped reef with caves and overhangs, busy with groupers, Napoleon wrasse and clouds of yellow fish.',
    tip: 'Currents can be strong. Go with a local guide, and keep your fins off the coral.',
  },
  {
    id: 'dolphins', type: 'sea', emoji: '🐬', district: 'nmale', approx: true, creature: 'dolphin',
    name: 'Dolphin Cruise', zh: '海豚巡游',
    lat: 4.3600, lng: 73.4700,
    blurb: 'Spinner dolphins love racing boats and leaping out of the water at sunset. Evening cruises set out from many resorts and local islands.',
    tip: 'Sightings are never guaranteed. Choose operators who keep a respectful distance.',
  },
  {
    id: 'maayathila', type: 'sea', emoji: '🦈', district: 'ari', approx: true, creature: 'reefshark',
    name: 'Maaya Thila', zh: '玛雅礁',
    lat: 4.0914, lng: 72.8620,
    blurb: 'A coral pinnacle (a “thila”) in a protected area of North Ari, famous for night dives when white-tip reef sharks come out to hunt.',
    tip: 'Night dives need some experience and a guide. Snorkellers can watch reef fish by day.',
  },
  {
    id: 'whaleshark', type: 'sea', emoji: '🐋', district: 'ari', approx: true, creature: 'whaleshark',
    name: 'South Ari Whale Sharks', zh: '南阿里鲸鲨区',
    lat: 3.5200, lng: 72.8500,
    blurb: 'South Ari Atoll is one of the best places on Earth to swim beside a whale shark, the biggest fish in the sea, almost all year round.',
    tip: 'Never touch, chase or block one. Keep your distance and follow your guide.',
  },
  {
    id: 'turtles', type: 'sea', emoji: '🐢', district: 'ari', approx: true, creature: 'turtle',
    name: 'Sea Turtles', zh: '海龟',
    lat: 3.6000, lng: 72.9700,
    blurb: 'Green and hawksbill turtles graze on seagrass and house reefs all over the atolls. Slow down, float, and one will often cruise right past.',
    tip: 'Do not touch or ride them, and use reef-safe sunscreen.',
  },
  {
    id: 'hanifaru', type: 'sea', emoji: '🪽', district: 'baa', creature: 'manta',
    name: 'Hanifaru Bay', zh: '哈尼法鲁湾',
    lat: 5.1771, lng: 73.1479,
    blurb: 'A small bay in Baa Atoll where manta rays gather by the dozen to feed on plankton, sometimes joined by whale sharks. It is a protected area, snorkelling only.',
    tip: 'Best in the wetter months (roughly June to November). Visitor numbers are limited and you need a guide with a permit.',
  },
  {
    id: 'vaadhoo', type: 'sea', emoji: '✨', district: 'baa', creature: 'glow',
    name: 'Sea of Stars, Vaadhoo', zh: '星海 · 瓦杜岛',
    lat: 5.8554, lng: 72.9923,
    blurb: 'On very dark nights, glowing plankton can wash up and make the waves sparkle electric blue along the shore.',
    tip: 'It is never guaranteed. Try on moonless nights, keep lights off, and respect the village.',
  },
  {
    id: 'fuvahmulah', type: 'sea', emoji: '🐯', district: 'south', creature: 'tiger',
    name: 'Fuvahmulah Tiger Sharks', zh: '福瓦穆拉虎鲨',
    lat: -0.2948, lng: 73.4241,
    blurb: 'A single-island atoll in the deep south with steep drop-offs, two freshwater lakes and tiger sharks that visit all year.',
    tip: 'Shark dives are for experienced divers with trusted operators. Reach it by domestic flight.',
  },
];
