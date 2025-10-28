// src/context/DataContext.js
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

/** AsyncStorage with in-memory fallback (no new deps) */
let AsyncStorage;
try {
  AsyncStorage = require("@react-native-async-storage/async-storage").default;
} catch {
  const mem = {};
  AsyncStorage = {
    async getItem(k) { return mem[k] ?? null; },
    async setItem(k, v) { mem[k] = v; },
    async removeItem(k) { delete mem[k]; },
    async multiRemove(keys) { keys.forEach((k) => delete mem[k]); },
  };
}

/** Utils */
const H = {
  hour: 1000 * 60 * 60,
  day: 1000 * 60 * 60 * 24,
  now: () => Date.now(),
};
const isObj = (v) => !!v && typeof v === "object" && !Array.isArray(v);
const ensureArray = (v) => (Array.isArray(v) ? v : []);
const ensureObject = (v) => (isObj(v) ? v : {});
const safeParseArray = (raw) => {
  if (!raw) return [];
  try { const v = JSON.parse(raw); return Array.isArray(v) ? v : []; }
  catch { return []; }
};
const safeParseObject = (raw) => {
  if (!raw) return {};
  try { const v = JSON.parse(raw); return isObj(v) ? v : {}; }
  catch { return {}; }
};

/** Storage keys (scoped to demo) */
const K = {
  POSTS: "yaka.posts.v2",
  COMMENTS: "yaka.comments.v2",
  MARKETPLACE: "yaka.marketplace.v2",
  UI: "yaka.ui.v1",

  // Groups
  GROUPS: "yaka.groups.v1",
  GROUP_MEMBERSHIPS: "yaka.groupMemberships.v1",
  GROUP_POSTS: "yaka.groupPosts.v1",
  NOTIFICATIONS: "yaka.notifications.v1",
};

/** Demo users (stable IDs for authorId) */
const DEMO_USERS = {
  u_local_01: { id: "u_local_01", name: "Thabo Molefe" },
  u_local_02: { id: "u_local_02", name: "Naledi Mokoena" },
  u_local_03: { id: "u_local_03", name: "Kabelo Seabi" },
  u_local_04: { id: "u_local_04", name: "Mpho Dlamini" },
  u_local_05: { id: "u_local_05", name: "Boitumelo Nthebe" },
  u_local_06: { id: "u_local_06", name: "Refilwe M" },
  u_local_07: { id: "u_local_07", name: "Oupa N" },
  u_local_08: { id: "u_local_08", name: "Sindi T" },
};

/** ------------------------ Build Seed (SA content) --------------------- */
function buildSeed() {
  const now = H.now();

  // Alerts (4)
  const alerts = [
    {
      id: "p_missing_child_01",
      category: "alert",
      title: "Missing child: Karabo (7) — last seen near Bothaville taxi rank",
      title_st:
        "Ngoana o lahlehileng: Karabo (7) — o qetellitse ho bonoa taxi rank Bothaville",
      message:
        "Karabo wore a pink hoodie and school shoes. If seen, call Free State SAPS or 10111. Please share.",
      message_st:
        "Karabo o ne a apere k'hudi e pinki le lieta tsa sekolo. Ha o mo bona, letsetsa SAPS Free State kapa 10111. Ke kopa le role karolo.",
      author: "Free State SAPS",
      authorId: "u_local_01",
      timestamp: now - 2 * H.hour,
      durationDays: 10,
      reactions: { helpful: 48 },
      location: "Bothaville, FS",
    },
    {
      id: "p_water_outage_01",
      category: "alert",
      title: "Planned water outage tonight — tankers in Ward 3",
      title_st: "Ho tla khaoloa metsi bosiung bona — ditanka Ward 3",
      message:
        "Maintenance on main line from 21:00–05:00. Tankers to park at Ward 3 clinic and community hall.",
      message_st:
        "Tlhokomelo mothating o moholo ho tloha 21:00–05:00. Ditanka di tla ema kliniking ya Ward 3 le holo ya setjhaba.",
      author: "Nala Local Municipality",
      authorId: "u_local_02",
      timestamp: now - 1 * H.day,
      durationDays: 7,
      reactions: { helpful: 9 },
      location: "Bothaville, FS",
    },
    {
      id: "p_loadshedding_01",
      category: "alert",
      title: "Stage 4 load shedding this evening — Bothaville & Wesselsbron",
      title_st: "Load shedding Boemo 4 bosiung bona — Bothaville & Wesselsbron",
      message:
        "Expect 18:00–20:30 and 22:00–00:30 slots. Charge devices and prepare.",
      message_st:
        "Lebella di-slot tsa 18:00–20:30 le 22:00–00:30. Tjhaaja didivayise 'me o itokisetse.",
      author: "Eskom Notice",
      authorId: "u_local_03",
      timestamp: now - 18 * H.hour,
      durationDays: 7,
      reactions: { helpful: 12 },
      location: "Bothaville & Wesselsbron, FS",
    },
    {
      id: "p_road_closure_r34",
      category: "alert",
      title: "R34 near Kroonstad: road closure due to protest action",
      title_st: "R34 pela Kroonstad: tsela e koetsiwe ka lebaka la diprotesta",
      message:
        "Use alternative routes via Viljoenskroon. Drive with caution and avoid the area if possible.",
      message_st:
        "Sebelisa ditsela tse ding ka Viljoenskroon. Kganna ka tlhokomelo mme o qobe sebaka ha ho kgoneha.",
      author: "FS Traffic Update",
      authorId: "u_local_04",
      timestamp: now - 3 * H.day,
      durationDays: 7,
      reactions: { helpful: 7 },
      location: "Kroonstad, FS",
    },
  ];

  // Events (3)
  const events = [
    {
      id: "p_event_meeting_01",
      category: "event",
      title: "Ward 3 Community Meeting — service delivery updates",
      title_st: "Seboka sa Setjhaba Ward 3 — ntlafatso ya ditshebeletso",
      message:
        "Ward councillor briefing at the community hall, Tue 18:00. Bring questions and proposals.",
      message_st:
        "Councillor o tla fana ka tlaleho holo ya setjhaba, Labobedi 18:00. Tlisang dipotso le ditlhahiso.",
      author: "Ward 3 Office",
      authorId: "u_local_05",
      timestamp: now - 20 * H.hour,
      durationDays: 10,
      reactions: { helpful: 15 },
      location: "Bothaville, FS",
    },
    {
      id: "p_event_music_01",
      category: "event",
      title: "Welkom Music Fest — local artists live",
      title_st: "Welkom Music Fest — baetsi ba lehae ba phela",
      message:
        "Sat from 12:00 at Welkom Stadium. Kids zone, food stalls, and security on site.",
      message_st:
        "Moqebelo ho tloha 12:00 Welkom Stadium. Sebaka sa bana, dije tsa seterateng, le tshireletso.",
      author: "Matjhabeng Arts",
      authorId: "u_local_03",
      timestamp: now - 1 * H.day,
      durationDays: 14,
      reactions: { helpful: 39 },
      location: "Welkom, FS",
    },
    {
      id: "p_event_family_01",
      category: "event",
      title: "Family Fun Day — games, soccer & netball",
      title_st: "Letsatsi la Lelapa — dipapadi, soccer & netball",
      message:
        "Sun 10:00 at Bothaville Primary fields. Bring camp chairs and sunscreen.",
      message_st:
        "Sontaha 10:00 masimong a Bothaville Primary. Tlisang ditulo le sunscreen.",
      author: "Bothaville Community",
      authorId: "u_local_04",
      timestamp: now - 28 * H.hour,
      durationDays: 10,
      reactions: { helpful: 11 },
      location: "Bothaville, FS",
    },
  ];

  // Opportunities (7)
  const opportunities = [
    {
      id: "p_opp_epwp_01",
      category: "opportunity",
      title: "EPWP General Workers — Matjhabeng intake",
      title_st: "EPWP Basebetsi ba Akaretsang — kamohelo Matjhabeng",
      message:
        "Short-term placements. Apply at municipal offices with ID copy and CV.",
      message_st:
        "Mosebetsi wa nako e kgutshwane. Kgothaletsa ofising ya masepala ka kopi ya ID le CV.",
      author: "Matjhabeng Municipality",
      authorId: "u_local_02",
      timestamp: now - 3 * H.day,
      durationDays: 14,
      reactions: { helpful: 22 },
      location: "Welkom, FS",
    },
    {
      id: "p_opp_shopassistant_01",
      category: "opportunity",
      title: "Shop assistant — weekend shifts",
      title_st: "Mothusi lebenkeleng — dithifi tsa mafelo-beke",
      message:
        "Local hardware in Bothaville CBD needs 2 assistants. Drop CV in-store.",
      message_st:
        "Hardware ya lehae Bothaville CBD e batla bathusi ba 2. Tlohela CV ka hare ho lebenkele.",
      author: "Bothaville Hardware",
      authorId: "u_local_05",
      timestamp: now - 2 * H.day,
      durationDays: 10,
      reactions: { helpful: 8 },
      location: "Bothaville, FS",
    },
    {
      id: "p_opp_bursary_01",
      category: "opportunity",
      title: "Motsepe Foundation bursary — Free State learners",
      title_st: "Motsepe Foundation bursary — baithuti ba Free State",
      message:
        "Applications open for 2026 studies. Strong math/science preferred. Apply online.",
      message_st:
        "Dikopo di butse bakeng sa dithuto tsa 2026. Ba nang le mathematics/science ba kgothalletswa. Kopa inthaneteng.",
      author: "Education Desk",
      authorId: "u_local_01",
      timestamp: now - 16 * H.hour,
      durationDays: 14,
      reactions: { helpful: 41 },
      location: "Free State",
    },
    {
      id: "p_opp_tender_grass_01",
      category: "opportunity",
      title: "Tender: grass cutting — Nala Local Municipality",
      title_st: "Tender: ho kgaola jwang — Nala Local Municipality",
      message:
        "Request for quotes for ward open spaces. CIDB not required for small sections.",
      message_st:
        "Kopo ya ditefello bakeng sa mabala a bulehileng a ward. CIDB ha e hlokahale bakeng sa dikarolo tse nyane.",
      author: "Supply Chain Nala",
      authorId: "u_local_03",
      timestamp: now - 4 * H.day,
      durationDays: 14,
      reactions: { helpful: 10 },
      location: "Nala LM, FS",
    },
    {
      id: "p_opp_learnership_fnb_01",
      category: "opportunity",
      title: "Learnership: Banking youth intake — Welkom",
      title_st: "Learnership: Ho kena ha bacha ka banka — Welkom",
      message:
        "12-month learnership with stipend. Matric required. Apply with short motivation.",
      message_st:
        "Learnership ya dikgwedi tse 12 ka moputso o monyane. Matric e hlokahala. Kopa ka motheo o mokgutshwane.",
      author: "Regional Bank Partner",
      authorId: "u_local_04",
      timestamp: now - 36 * H.hour,
      durationDays: 14,
      reactions: { helpful: 13 },
      location: "Welkom, FS",
    },
    {
      id: "p_opp_sidegig_cleaning_01",
      category: "opportunity",
      title: "Side-gig: Saturday hall cleaning — stipend R300",
      title_st: "Mosebetsi o monyane: ho hloekisa holo ka Moqebelo — R300",
      message:
        "Church hall needs 3 people 07:00–10:00. Bring ID. Tea & bread provided.",
      message_st:
        "Holo ya kereke e batla batho ba 3 07:00–10:00. Tlisang ID. Tee le bohobe lia fanoa.",
      author: "Local Church Committee",
      authorId: "u_local_05",
      timestamp: now - 2 * H.day,
      durationDays: 7,
      reactions: { helpful: 6 },
      location: "Bothaville, FS",
    },
    {
      id: "p_opp_marketday_vendors_01",
      category: "opportunity",
      title: "Vendors wanted for Market Day — Bothaville Square",
      title_st: "Barekisi ba batlwa bakeng sa Market Day — Bothaville Square",
      message:
        "Book a stall for R100. Food, crafts, and fresh produce encouraged.",
      message_st:
        "Buka sethala ka R100. Dijo, mesebetsi ya matsoho, le ditholwana di a amoheleha.",
      author: "Event Organiser",
      authorId: "u_local_02",
      timestamp: now - 30 * H.hour,
      durationDays: 10,
      reactions: { helpful: 9 },
      location: "Bothaville, FS",
    },
  ];

  // Lost & Found (8)
  const lostfound = [
    {
      id: "p_lf_id_01",
      category: "lostfound",
      title: "Found: SA ID — surname 'Mokoena' near taxi rank",
      title_st: "Fumanehile: ID ya SA — fane 'Mokoena' pela taxi rank",
      message:
        "Collect at Ward 3 community office. Bring proof to verify.",
      message_st:
        "Tlo tla e lata ofising ya setjhaba Ward 3. Tlisang bopaki ho netefatsa.",
      author: "Ward 3 Office",
      authorId: "u_local_02",
      timestamp: now - 10 * H.hour,
      durationDays: 14,
      reactions: { helpful: 17 },
      location: "Bothaville, FS",
    },
    {
      id: "p_lf_phone_01",
      category: "lostfound",
      title: "Found phone: Huawei with cracked screen at Spar",
      title_st:
        "Fumanehile founo: Huawei e nang le skrine e robehileng ho Spar",
      message:
        "Describe lock screen to claim. Ask for Thabo at the front desk.",
      message_st:
        "Hlalosa lock screen ho paka hore ke ya hao. Batla Thabo tafoleng ya kamohelo.",
      author: "Spar Bothaville",
      authorId: "u_local_01",
      timestamp: now - 6 * H.hour,
      durationDays: 14,
      reactions: { helpful: 33 },
      location: "Bothaville, FS",
    },
    {
      id: "p_lf_wallet_01",
      category: "lostfound",
      title: "Lost: brown wallet — last seen near FNB ATM",
      title_st:
        "Lahlehile: wallet e sootho — e qetellang ho bonwa pela FNB ATM",
      message:
        "Contains ID & bank cards. Reward offered. Contact via comments.",
      message_st:
        "E na le ID le dikarata tsa banka. Ho na le moputso. Ikgokaganye ka dikoments.",
      author: "Kabelo Seabi",
      authorId: "u_local_03",
      timestamp: now - 2 * H.day,
      durationDays: 10,
      reactions: { helpful: 5 },
      location: "Bothaville, FS",
    },
    {
      id: "p_lf_dog_01",
      category: "lostfound",
      title: "Missing dog — brown mixed breed, responds to 'Buddy'",
      title_st: "Ntja e lahlehileng — mmala o sootho, e araba 'Buddy'",
      message:
        "Seen last night near Welkom Station. Friendly but scared.",
      message_st:
        "E qetellang ho bonwa bosiung bo fetileng pela Welkom Station. E mosa empa e tshaba.",
      author: "Naledi Mokoena",
      authorId: "u_local_02",
      timestamp: now - 3 * H.day,
      durationDays: 14,
      reactions: { helpful: 7 },
      location: "Welkom, FS",
    },
    {
      id: "p_lf_schoolbag_01",
      category: "lostfound",
      title: "Found: school bag with Grade 7 books",
      title_st: "Fumanehile: mokotla wa sekolo o nang le dibuka tsa Grade 7",
      message:
        "Picked up at sports field. Name reads 'Lerato'. Collect at gate office.",
      message_st:
        "O phamotswe masimong a dipapadi. Lebitso ke 'Lerato'. Lata ho ofisi ya heke.",
      author: "Coach Mpho",
      authorId: "u_local_04",
      timestamp: now - 20 * H.hour,
      durationDays: 10,
      reactions: { helpful: 16 },
      location: "Bothaville, FS",
    },
    {
      id: "p_lf_keys_01",
      category: "lostfound",
      title: "Lost: bunch of keys with blue tag",
      title_st: "Lahlehile: dithapo tsa dinotlolo ka tag e putsoa",
      message:
        "Possibly dropped near clinic parking. Please return if found.",
      message_st:
        "E kanna ya wela pela parking ya kliniki. Ka kopo e kgutliseng ha le e fumana.",
      author: "Boitumelo Nthebe",
      authorId: "u_local_05",
      timestamp: now - 36 * H.hour,
      durationDays: 7,
      reactions: { helpful: 4 },
      location: "Bothaville, FS",
    },
    {
      id: "p_lf_certificate_01",
      category: "lostfound",
      title: "Found: Matric certificate copy",
      title_st: "Fumanehile: kopi ya lengolo la Matric",
      message:
        "Name 'Refilwe M'. Keep safe at library front desk.",
      message_st:
        "Lebitso 'Refilwe M'. E bolokilwe tafoleng ya pele la laeborari.",
      author: "Community Library",
      authorId: "u_local_06",
      timestamp: now - 22 * H.hour,
      durationDays: 14,
      reactions: { helpful: 14 },
      location: "Bothaville, FS",
    },
    {
      id: "p_lf_bicycle_01",
      category: "lostfound",
      title: "Found bicycle — silver BMX near taxi route",
      title_st: "Fumanehile baesekele — silver BMX pela tsela ya ditaxi",
      message:
        "Left locked by fence. Describe stickers to claim.",
      message_st:
        "E setswe e notletswe pela terata. Hlalosa di-sticker ho paka hore ke ya hao.",
      author: "Oupa N",
      authorId: "u_local_07",
      timestamp: now - 4 * H.day,
      durationDays: 10,
      reactions: { helpful: 5 },
      location: "Kroonstad, FS",
    },
  ];

  // Community (1)
  const community = [
    {
      id: "p_comm_clothing_donation_01",
      category: "community",
      title: "Clothing donations needed for winter — Ward 3 drive",
      title_st: "Monehelo wa diaparo bakeng sa mariha — letsholo la Ward 3",
      message:
        "Clean jackets, shoes, and blankets welcome. Drop off at community hall weekdays 08:00–16:00.",
      message_st:
        "Dikobo, diaparo le dieta tse hlwekileng di a amoheleha. Tlisang holo ya setjhaba ka mosebetsi 08:00–16:00.",
      author: "Ward 3 Volunteers",
      authorId: "u_local_08",
      timestamp: now - 12 * H.hour,
      durationDays: 14,
      reactions: { helpful: 28 },
      location: "Bothaville, FS",
    },
  ];

  const posts = [...alerts, ...events, ...opportunities, ...lostfound, ...community];

  // Comments map: ensure every postId is present (at least [])
  const comments = {};
  for (const p of posts) comments[p.id] = [];

  // Boost trending via comments
  const push = (pid, arr) => { comments[pid] = comments[pid].concat(arr); };
  const nowMs = now;
  push("p_missing_child_01", [
    { id: "c_mc_1", authorId: "u_local_02", text: "Any update?", timestamp: nowMs - 90 * 60 * 1000 },
    { id: "c_mc_2", authorId: "u_local_03", text: "Saw police near taxi rank.", timestamp: nowMs - 80 * 60 * 1000 },
    { id: "c_mc_3", authorId: "u_local_04", text: "Sharing in groups 🙏", timestamp: nowMs - 70 * 60 * 1000 },
    { id: "c_mc_4", authorId: "u_local_05", text: "Praying for safe return.", timestamp: nowMs - 60 * 60 * 1000 },
    { id: "c_mc_5", authorId: "u_local_06", text: "Any clothing details?", timestamp: nowMs - 50 * 60 * 1000 },
    { id: "c_mc_6", authorId: "u_local_07", text: "Will check taxi route now.", timestamp: nowMs - 40 * 60 * 1000 },
    { id: "c_mc_7", authorId: "u_local_08", text: "Please post photo.", timestamp: nowMs - 30 * 60 * 1000 },
    { id: "c_mc_8", authorId: "u_local_01", text: "SAPS on it. Keep sharing.", timestamp: nowMs - 20 * 60 * 1000 },
  ]);
  push("p_event_music_01", [
    { id: "c_em_1", authorId: "u_local_05", text: "Which gate for parking?", timestamp: nowMs - 22 * H.hour },
    { id: "c_em_2", authorId: "u_local_03", text: "Kids allowed?", timestamp: nowMs - 21 * H.hour },
    { id: "c_em_3", authorId: "u_local_04", text: "Line-up fire!", timestamp: nowMs - 20 * H.hour },
    { id: "c_em_4", authorId: "u_local_02", text: "Any shade tents?", timestamp: nowMs - 19 * H.hour },
    { id: "c_em_5", authorId: "u_local_01", text: "Food prices fair?", timestamp: nowMs - 18 * H.hour },
  ]);
  push("p_opp_bursary_01", [
    { id: "c_mb_1", authorId: "u_local_02", text: "Closing date?", timestamp: nowMs - 12 * H.hour },
    { id: "c_mb_2", authorId: "u_local_03", text: "Do they fund diplomas?", timestamp: nowMs - 11 * H.hour },
    { id: "c_mb_3", authorId: "u_local_04", text: "Docs needed?", timestamp: nowMs - 10 * H.hour },
    { id: "c_mb_4", authorId: "u_local_05", text: "Thanks for sharing!", timestamp: nowMs - 9 * H.hour },
    { id: "c_mb_5", authorId: "u_local_06", text: "Link please?", timestamp: nowMs - 8 * H.hour },
    { id: "c_mb_6", authorId: "u_local_07", text: "Prefer STEM?", timestamp: nowMs - 7 * H.hour },
  ]);
  push("p_lf_phone_01", [
    { id: "c_fp_1", authorId: "u_local_08", text: "Which counter?", timestamp: nowMs - 5 * H.hour },
    { id: "c_fp_2", authorId: "u_local_03", text: "Is it a Y7?", timestamp: nowMs - 4.5 * H.hour },
    { id: "c_fp_3", authorId: "u_local_02", text: "I'll ask manager.", timestamp: nowMs - 4 * H.hour },
    { id: "c_fp_4", authorId: "u_local_01", text: "Front desk confirmed.", timestamp: nowMs - 3.5 * H.hour },
    { id: "c_fp_5", authorId: "u_local_04", text: "Owner found yet?", timestamp: nowMs - 3 * H.hour },
  ]);
  push("p_comm_clothing_donation_01", [
    { id: "c_cd_1", authorId: "u_local_01", text: "Do you take kids’ shoes?", timestamp: nowMs - 10 * H.hour },
    { id: "c_cd_2", authorId: "u_local_02", text: "Can I drop Sunday?", timestamp: nowMs - 9 * H.hour },
    { id: "c_cd_3", authorId: "u_local_03", text: "Do you collect blankets?", timestamp: nowMs - 8 * H.hour },
    { id: "c_cd_4", authorId: "u_local_04", text: "I have jackets size M.", timestamp: nowMs - 7 * H.hour },
    { id: "c_cd_5", authorId: "u_local_05", text: "Bless you guys.", timestamp: nowMs - 6 * H.hour },
  ]);

  // Sponsored marketplace items (promoHelpers expects sponsorHomeUntil)
  const sponsorHomeUntil = now + 7 * H.day;
  const sponsoredItems = [
    {
      id: "mk_spar_01",
      title: "Spar Weekend Specials",
      description: "Deals on basics. Valid this weekend.",
      price: null,
      images: [{ uri: "https://picsum.photos/seed/spar/800/600" }],
      sponsorHomeUntil,
      sponsorTag: "Sponsored",
      storefrontId: "store_spar_bothaville",
      sellerName: "Spar Bothaville",
    },
    {
      id: "mk_fnb_01",
      title: "FNB Youth Account",
      description: "Open a youth account. Data-free services.",
      price: null,
      images: [{ uri: "https://picsum.photos/seed/fnb/800/600" }],
      sponsorHomeUntil,
      sponsorTag: "Sponsored",
      storefrontId: "store_fnb_info",
      sellerName: "FNB Free State",
    },
    {
      id: "mk_carwash_01",
      title: "eKasi Carwash",
      description: "Quick wash from R50. 08:00–18:00.",
      price: null,
      images: [{ uri: "https://picsum.photos/seed/carwash/800/600" }],
      sponsorHomeUntil,
      sponsorTag: "Sponsored",
      storefrontId: "store_ekasi_carwash",
      sellerName: "eKasi Carwash",
    },
    {
      id: "mk_kota_01",
      title: "Kota Joint",
      description: "Lunch kota + drink combo.",
      price: null,
      images: [{ uri: "https://picsum.photos/seed/kota/800/600" }],
      sponsorHomeUntil,
      sponsorTag: "Sponsored",
      storefrontId: "store_kota_joint",
      sellerName: "Kota Joint Bothaville",
    },
  ];

  // --- COMMUNITY GROUPS SEED (8, short descriptions) ---
  const groups = [
    {
      id: "grp_ward3_care",
      name: "Ward 3 Care Forum",
      description: "Food drives & cleanups.",
      icon: "people-circle-outline",
      creatorId: "u_local_01",
    },
    {
      id: "grp_bothaville_youth",
      name: "Bothaville Youth",
      description: "Bursaries & skills.",
      icon: "school-outline",
      creatorId: "u_local_02",
    },
    {
      id: "grp_matjhabeng_farmers",
      name: "Matjhabeng Farmers",
      description: "Advice & markets.",
      icon: "leaf-outline",
      creatorId: "u_local_03",
    },
    {
      id: "grp_women_business",
      name: "Women in Business FS",
      description: "Support & networking.",
      icon: "briefcase-outline",
      creatorId: "u_local_04",
    },
    {
      id: "grp_ward4_safety",
      name: "Ward 4 Safety",
      description: "Patrols & updates.",
      icon: "shield-checkmark-outline",
      creatorId: "u_local_05",
    },
    {
      id: "grp_township_creatives",
      name: "eKasi Creatives",
      description: "Art & collabs.",
      icon: "color-palette-outline",
      creatorId: "u_local_06",
    },
    {
      id: "grp_bothaville_market",
      name: "Market Vendors",
      description: "Stalls & logistics.",
      icon: "storefront-outline",
      creatorId: "u_local_07",
    },
    {
      id: "grp_faith_motivators",
      name: "Faith & Motivation",
      description: "Prayer & uplift.",
      icon: "heart-outline",
      creatorId: "u_local_08",
    },
  ];
  const groupMemberships = {};
  const groupPosts = {};
  groups.forEach((g) => {
    groupMemberships[g.id] = []; // no members yet
    groupPosts[g.id] = [];       // no posts yet
  });

  // Initial notifications (empty here; provider will set a welcome)
  const notifications = [];

  return {
    posts, comments, sponsoredItems,
    groups, groupMemberships, groupPosts,
    notifications,
  };
}

/** Idempotent seed + shape repair */
async function ensureSeeded() {
  const [
    rawPosts,
    rawComments,
    rawMarketplace,
    rawUi,
    rawGroups,
    rawGroupMemberships,
    rawGroupPosts,
    rawNotifications,
  ] = await Promise.all([
    AsyncStorage.getItem(K.POSTS),
    AsyncStorage.getItem(K.COMMENTS),
    AsyncStorage.getItem(K.MARKETPLACE),
    AsyncStorage.getItem(K.UI),
    AsyncStorage.getItem(K.GROUPS),
    AsyncStorage.getItem(K.GROUP_MEMBERSHIPS),
    AsyncStorage.getItem(K.GROUP_POSTS),
    AsyncStorage.getItem(K.NOTIFICATIONS),
  ]);

  let posts = safeParseArray(rawPosts);
  let comments = safeParseObject(rawComments);
  let marketplace = safeParseObject(rawMarketplace);
  if (!Array.isArray(marketplace.items)) marketplace.items = [];
  if (!isObj(marketplace.storefronts)) marketplace.storefronts = {};

  let groups = safeParseArray(rawGroups);
  let groupMemberships = safeParseObject(rawGroupMemberships);
  let groupPosts = safeParseObject(rawGroupPosts);
  let notifications = safeParseArray(rawNotifications);

  // Seed posts/comments/marketplace if empty/malformed
  if (posts.length === 0 || !isObj(comments)) {
    const seed = buildSeed();
    posts = seed.posts;
    comments = seed.comments;
    // Merge/Upsert sponsors
    const byId = {};
    for (const it of marketplace.items) if (it && it.id) byId[it.id] = it;
    for (const it of seed.sponsoredItems) byId[it.id] = it;
    marketplace.items = Object.values(byId);

    await AsyncStorage.setItem(K.POSTS, JSON.stringify(posts));
    await AsyncStorage.setItem(K.COMMENTS, JSON.stringify(comments));
    await AsyncStorage.setItem(K.MARKETPLACE, JSON.stringify(marketplace));
  } else {
    // Repair comments shape
    const fixed = {};
    for (const p of posts) fixed[p.id] = ensureArray(comments[p.id]);
    comments = fixed;

    // Refresh/insert sponsors if missing/expired
    const { sponsoredItems } = buildSeed();
    const byId = {};
    for (const it of marketplace.items) if (it && it.id) byId[it.id] = it;
    for (const it of sponsoredItems) {
      const existing = byId[it.id];
      const until = Number(existing?.sponsorHomeUntil ?? 0);
      if (!existing || !Number.isFinite(until) || until <= H.now()) byId[it.id] = it;
    }
    marketplace.items = Object.values(byId);

    await AsyncStorage.setItem(K.COMMENTS, JSON.stringify(comments));
    await AsyncStorage.setItem(K.MARKETPLACE, JSON.stringify(marketplace));
  }

  // Seed groups if empty
  if (groups.length === 0 || !isObj(groupMemberships) || !isObj(groupPosts)) {
    const seed = buildSeed();
    groups = seed.groups;
    groupMemberships = seed.groupMemberships;
    groupPosts = seed.groupPosts;

    await AsyncStorage.setItem(K.GROUPS, JSON.stringify(groups));
    await AsyncStorage.setItem(K.GROUP_MEMBERSHIPS, JSON.stringify(groupMemberships));
    await AsyncStorage.setItem(K.GROUP_POSTS, JSON.stringify(groupPosts));
  } else {
    // Repair shapes
    const gm = {};
    const gp = {};
    for (const g of groups) {
      gm[g.id] = ensureArray(groupMemberships[g.id]);
      gp[g.id] = ensureArray(groupPosts[g.id]);
    }
    groupMemberships = gm;
    groupPosts = gp;

    await AsyncStorage.setItem(K.GROUP_MEMBERSHIPS, JSON.stringify(groupMemberships));
    await AsyncStorage.setItem(K.GROUP_POSTS, JSON.stringify(groupPosts));
  }

  // Notifications (seed welcome if none)
  if (!Array.isArray(notifications)) notifications = [];
  if (notifications.length === 0) {
    notifications = [
      {
        id: "n1",
        type: "system",
        title: "Welcome to Yaka",
        message: "Your local digital noticeboard is live.",
        read: false,
        timestamp: H.now() - 3 * H.hour,
      },
    ];
    await AsyncStorage.setItem(K.NOTIFICATIONS, JSON.stringify(notifications));
  }

  // UI state (optional)
  let ui = safeParseObject(rawUi);
  const uiSafe = {
    bookmarks: ensureObject(ui.bookmarks),
    helpfuls: ensureObject(ui.helpfuls),
    rsvps: ensureObject(ui.rsvps),
    mediaLoaded: ensureObject(ui.mediaLoaded),
    homeDismissedAlerts: ensureObject(ui.homeDismissedAlerts),
    reports: Array.isArray(ui.reports) ? ui.reports : [],
  };
  await AsyncStorage.setItem(K.UI, JSON.stringify(uiSafe));

  return {
    posts, comments, marketplace, ui: uiSafe,
    groups, groupMemberships, groupPosts,
    notifications,
  };
}

/** Context + Provider */
const DEFAULT_VALUE = {
  loading: true,

  // content
  posts: [],
  comments: {},
  marketplace: { items: [], storefronts: {} },

  // groups
  groups: [],
  groupMemberships: {},
  groupPosts: {},

  users: DEMO_USERS,
  notifications: [],

  // UI buckets expected by components:
  bookmarks: {},
  helpfuls: {},
  rsvps: {},
  mediaLoaded: {},
  homeDismissedAlerts: {},
  reports: [],

  // setters (no-ops default)
  setPosts: () => {},
  setBookmarks: () => {},
  setHelpfuls: () => {},
  setRsvps: () => {},
  setMediaLoaded: () => {},
  setHomeDismissedAlerts: () => {},
  setReports: () => {},
  setGroups: () => {},
  setGroupMemberships: () => {},
  setGroupPosts: () => {},
  setNotifications: () => {},

  // helpers
  addReactionHelpful: () => {},
  addComment: () => {},

  // group helpers
  createGroup: () => {},
  deleteGroup: () => {},
  joinGroup: () => {},
  leaveGroup: () => {},
  postToGroup: () => {},
  broadcastToGroup: () => {},

  refreshFromStorage: () => {},
};

const DataContext = createContext(DEFAULT_VALUE);
DataContext.displayName = "DataContext";
export const useData = () => {
  const ctx = useContext(DataContext);
  return isObj(ctx) ? ctx : DEFAULT_VALUE;
};

export function DataProvider({ children }) {
  const [loading, setLoading] = useState(true);

  const [posts, setPosts] = useState(DEFAULT_VALUE.posts);
  const [comments, setComments] = useState(DEFAULT_VALUE.comments);
  const [marketplace, setMarketplace] = useState(DEFAULT_VALUE.marketplace);

  // groups
  const [groups, setGroups] = useState(DEFAULT_VALUE.groups);
  const [groupMemberships, setGroupMemberships] = useState(DEFAULT_VALUE.groupMemberships);
  const [groupPosts, setGroupPosts] = useState(DEFAULT_VALUE.groupPosts);

  // UI state buckets required by HomeScreen/PostCard
  const [bookmarks, setBookmarks] = useState(DEFAULT_VALUE.bookmarks);
  const [helpfuls, setHelpfuls] = useState(DEFAULT_VALUE.helpfuls);
  const [rsvps, setRsvps] = useState(DEFAULT_VALUE.rsvps);
  const [mediaLoaded, setMediaLoaded] = useState(DEFAULT_VALUE.mediaLoaded);
  const [homeDismissedAlerts, setHomeDismissedAlerts] = useState(DEFAULT_VALUE.homeDismissedAlerts);
  const [reports, setReports] = useState(DEFAULT_VALUE.reports);

  const [notifications, setNotifications] = useState(DEFAULT_VALUE.notifications);

  const users = DEMO_USERS;

  const refreshFromStorage = useCallback(async () => {
    setLoading(true);
    try {
      const seeded = await ensureSeeded();
      setPosts(ensureArray(seeded.posts));
      setComments(ensureObject(seeded.comments));
      const mk = ensureObject(seeded.marketplace);
      setMarketplace({
        items: ensureArray(mk.items),
        storefronts: ensureObject(mk.storefronts),
      });

      // groups
      setGroups(ensureArray(seeded.groups));
      setGroupMemberships(ensureObject(seeded.groupMemberships));
      setGroupPosts(ensureObject(seeded.groupPosts));

      // notifications
      setNotifications(ensureArray(seeded.notifications));

      // hydrate UI state buckets safely
      const ui = ensureObject(seeded.ui);
      setBookmarks(ensureObject(ui.bookmarks));
      setHelpfuls(ensureObject(ui.helpfuls));
      setRsvps(ensureObject(ui.rsvps));
      setMediaLoaded(ensureObject(ui.mediaLoaded));
      setHomeDismissedAlerts(ensureObject(ui.homeDismissedAlerts));
      setReports(Array.isArray(ui.reports) ? ui.reports : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshFromStorage();
  }, [refreshFromStorage]);

  // Persist UI buckets opportunistically
  useEffect(() => {
    const ui = { bookmarks, helpfuls, rsvps, mediaLoaded, homeDismissedAlerts, reports };
    AsyncStorage.setItem(K.UI, JSON.stringify(ui)).catch(() => {});
  }, [bookmarks, helpfuls, rsvps, mediaLoaded, homeDismissedAlerts, reports]);

  // Persist groups on change
  useEffect(() => { AsyncStorage.setItem(K.GROUPS, JSON.stringify(groups)).catch(() => {}); }, [groups]);
  useEffect(() => { AsyncStorage.setItem(K.GROUP_MEMBERSHIPS, JSON.stringify(groupMemberships)).catch(() => {}); }, [groupMemberships]);
  useEffect(() => { AsyncStorage.setItem(K.GROUP_POSTS, JSON.stringify(groupPosts)).catch(() => {}); }, [groupPosts]);
  useEffect(() => { AsyncStorage.setItem(K.NOTIFICATIONS, JSON.stringify(notifications)).catch(() => {}); }, [notifications]);

  /** Post helpers (existing) */
  const addReactionHelpful = useCallback(async (postId) => {
    setPosts((prev) => {
      const next = ensureArray(prev).map((p) =>
        p.id === postId
          ? { ...p, reactions: { helpful: (p.reactions?.helpful || 0) + 1 } }
          : p
      );
      AsyncStorage.setItem(K.POSTS, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const addComment = useCallback(async (postId, text, authorId = "u_local_01") => {
    const newC = { id: `c_${Math.random().toString(36).slice(2, 8)}`, authorId, text, timestamp: H.now() };
    setComments((prevRaw) => {
      const prev = ensureObject(prevRaw);
      const list = ensureArray(prev[postId]);
      const next = { ...prev, [postId]: [...list, newC] };
      AsyncStorage.setItem(K.COMMENTS, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  /** --------- GROUP HELPERS (Create/Join/Leave/Delete/Post/Broadcast) ---------- */

  const createGroup = useCallback((creatorId, nameRaw, descriptionRaw, icon = "people-outline") => {
    const name = String(nameRaw || "").trim();
    const description = String(descriptionRaw || "").trim().slice(0, 80); // short desc
    if (name.length < 3) return null;

    const g = {
      id: `grp_${Date.now()}`,
      name,
      description,
      icon,
      creatorId: creatorId || "u_local_01",
    };

    setGroups((prev) => [g, ...ensureArray(prev)]);
    setGroupMemberships((prev) => {
      const p = ensureObject(prev);
      return { ...p, [g.id]: creatorId ? [creatorId] : [] };
    });
    setGroupPosts((prev) => {
      const p = ensureObject(prev);
      return { ...p, [g.id]: [] };
    });
    return g;
  }, []);

  const deleteGroup = useCallback((groupId) => {
    if (!groupId) return;
    setGroups((prev) => ensureArray(prev).filter((g) => g.id !== groupId));
    setGroupMemberships((prev) => {
      const p = ensureObject(prev); const n = { ...p }; delete n[groupId]; return n;
    });
    setGroupPosts((prev) => {
      const p = ensureObject(prev); const n = { ...p }; delete n[groupId]; return n;
    });
  }, []);

  const joinGroup = useCallback((groupId, userId) => {
    if (!groupId || !userId) return;
    setGroupMemberships((prev) => {
      const p = ensureObject(prev);
      const cur = ensureArray(p[groupId]);
      if (cur.includes(userId)) return p;
      const next = { ...p, [groupId]: [...cur, userId] };
      return next;
    });
  }, []);

  const leaveGroup = useCallback((groupId, userId) => {
    if (!groupId || !userId) return;
    setGroupMemberships((prev) => {
      const p = ensureObject(prev);
      const cur = ensureArray(p[groupId]).filter((id) => id !== userId);
      return { ...p, [groupId]: cur };
    });
  }, []);

  const postToGroup = useCallback((groupId, authorId, textRaw) => {
    if (!groupId || !authorId) return null;
    const text = String(textRaw || "").trim();
    if (!text) return null;
    const post = { id: `gp_${Date.now()}`, authorId, text, timestamp: H.now() };
    setGroupPosts((prev) => {
      const p = ensureObject(prev);
      const list = ensureArray(p[groupId]);
      return { ...p, [groupId]: [post, ...list] };
    });
    return post;
  }, []);

  const broadcastToGroup = useCallback((groupId, title, message) => {
    // simple global notifications list (demo)
    setNotifications((prev) => {
      const now = H.now();
      const n = {
        id: `bn_${now}_${groupId}`,
        type: "group_broadcast",
        groupId,
        title: String(title || "Group message"),
        message: String(message || ""),
        read: false,
        timestamp: now,
      };
      return [n, ...ensureArray(prev)];
    });
  }, []);

  const value = useMemo(
    () => ({
      loading,

      // content
      posts,
      comments,
      marketplace,

      // groups
      groups, setGroups,
      groupMemberships, setGroupMemberships,
      groupPosts, setGroupPosts,

      users,

      notifications,
      setNotifications,

      // UI state buckets + setters
      bookmarks, setBookmarks,
      helpfuls, setHelpfuls,
      rsvps, setRsvps,
      mediaLoaded, setMediaLoaded,
      homeDismissedAlerts, setHomeDismissedAlerts,
      reports, setReports,

      // expose setPosts because PostCard uses it
      setPosts,

      // helpers
      addReactionHelpful,
      addComment,

      // group helpers
      createGroup,
      deleteGroup,
      joinGroup,
      leaveGroup,
      postToGroup,
      broadcastToGroup,

      refreshFromStorage,
    }),
    [
      loading,
      posts, comments, marketplace,
      groups, groupMemberships, groupPosts,
      users,
      notifications,
      bookmarks, helpfuls, rsvps, mediaLoaded, homeDismissedAlerts, reports,
      setBookmarks, setHelpfuls, setRsvps, setMediaLoaded, setHomeDismissedAlerts, setReports,
      setPosts, setGroups, setGroupMemberships, setGroupPosts, setNotifications,
      addReactionHelpful, addComment,
      createGroup, deleteGroup, joinGroup, leaveGroup, postToGroup, broadcastToGroup,
      refreshFromStorage,
    ]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export default DataContext;
