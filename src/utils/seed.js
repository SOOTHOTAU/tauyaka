const now = Date.now();
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const makePost = ({
  id, category, title, message,
  location = { label: "Bothaville • Town" },
  author = "Community",
  tsOffsetMin = 0, eventAt = null, images=[],
  communityId="bothaville",
  isVerified=false,
  contact={},
  createdAt = now - tsOffsetMin * 60 * 1000,
  expiryDate = null,
}) => ({
  id, category, title, message, location, author, communityId,
  timestamp: createdAt, createdAt,
  reactions: { helpful: rand(0, 45) }, ...(eventAt ? { eventAt } : {}), images,
  isVerified, contact, expiryDate
});

const daysFromNow = (d)=> now + d*24*60*60*1000;

const buildInitialPosts = () => {
  const posts = []; let id = 1;
  // Alerts
  posts.push(
    makePost({ id: `al${id++}`, category: "alert", title: "Water supply interruption", message: "Maintenance tomorrow 09:00–14:00. Please store water where possible.", author: "Nala Council", tsOffsetMin: 30, isVerified:true, expiryDate: daysFromNow(2) }),
    makePost({ id: `al${id++}`, category: "alert", title: "Load shedding Stage 2", message: "Scheduled 18:00–20:30 for Bothaville South.", location:{label:"Bothaville • South"}, author: "Municipality", tsOffsetMin: 180, isVerified:true, expiryDate: daysFromNow(1) }),
    makePost({ id: `al${id++}`, category: "alert", title: "Road closure on Main St", message: "Parade 12:00–16:00. Use Church Rd detour.", location:{label:"Bothaville • Main St"}, author: "Traffic Dept", tsOffsetMin: 300, isVerified:true, expiryDate: daysFromNow(1) })
  );
  // Ads
  posts.push(
    makePost({ id: `ad${id++}`, category: "ad", title: "Student Banking Special", message: "Get 20% off fees this month. T&Cs apply.", location:{label:"Sponsored"}, author: "FNB", tsOffsetMin: 10, contact:{ phone:"+27 11 123 4567" }, expiryDate: daysFromNow(10) }),
    makePost({ id: `ad${id++}`, category: "ad", title: "Weekend Deals", message: "Fresh produce & bakery specials all weekend.", location:{label:"Sponsored"}, author: "Pick n Pay", tsOffsetMin: 55, contact:{ phone:"+27 21 555 8888" }, expiryDate: daysFromNow(3) }),
    makePost({ id: `ad${id++}`, category: "ad", title: "Full Valet — R99", message: "Quick exterior wash + vacuum. Drive in today.", location:{label:"Sponsored"}, author: "Highway Car Wash", tsOffsetMin: 95, contact:{ phone:"+27 83 000 1234" }, expiryDate: daysFromNow(7) })
  );
  // Opportunities
  posts.push(
    makePost({ id: `op${id++}`, category: "opportunity", title: "Learnership — Retail (18.2)", message: "Apply by 30 Oct. Stipend provided. Matric required.", author: "Youth Centre", tsOffsetMin: 120, expiryDate: daysFromNow(20) }),
    makePost({ id: `op${id++}`, category: "opportunity", title: "Apprenticeship: Electrical", message: "12-month program. Tools provided. Apply on site.", author: "Tech Hub FS", tsOffsetMin: 240, expiryDate: daysFromNow(25) }),
    makePost({ id: `op${id++}`, category: "opportunity", title: "Bursary — Agriculture", message: "FS Department bursaries for 2026 intake. Closing 15 Nov.", author: "Dept. of Agriculture", tsOffsetMin: 350, expiryDate: daysFromNow(30) }),
    makePost({ id: `op${id++}`, category: "opportunity", title: "Local Business Grant", message: "Micro-grants up to R20,000 for startups. Pitch day next week.", author: "MCP", tsOffsetMin: 420, expiryDate: daysFromNow(9) })
  );
  // Events
  posts.push(
    makePost({ id: `ev${id++}`, category: "event", title: "Community Meeting: Park Upgrade", message: "Friday 17:00 at Town Hall. All welcome.", location:{label:"Bothaville • Town Hall"}, author: "Community Council", tsOffsetMin: 60, eventAt: now + 5 * 60 * 60 * 1000, expiryDate: daysFromNow(2) }),
    makePost({ id: `ev${id++}`, category: "event", title: "Youth Soccer Tournament", message: "Saturday 09:00 at Sports Grounds. Volunteers needed.", location:{label:"Bothaville • Sports Grounds"}, author: "Sports Association", tsOffsetMin: 210, eventAt: now + 26 * 60 * 60 * 1000, expiryDate: daysFromNow(2) }),
    makePost({ id: `ev${id++}`, category: "event", title: "Cultural Night", message: "Songs & food at Community Centre, 18:30.", location:{label:"Bothaville • Community Centre"}, author: "Local Culture Group", tsOffsetMin: 390, eventAt: now + 48 * 60 * 60 * 1000, expiryDate: daysFromNow(3) })
  );
  // Lost & Found
  posts.push(
    makePost({ id: `lf${id++}`, category: "lostfound", title: "Found small brown puppy", message: "Near taxi rank this morning. Red collar.", location:{label:"Bothaville • CBD"}, author: "Naledi", tsOffsetMin: 20, expiryDate: daysFromNow(14) }),
    makePost({ id: `lf${id++}`, category: "lostfound", title: "Lost: Black wallet", message: "Possibly at Spar parking yesterday evening.", author: "Thabo", tsOffsetMin: 80, expiryDate: daysFromNow(14) }),
    makePost({ id: `lf${id++}`, category: "lostfound", title: "Found: Keys with blue tag", message: "Dropped on Church Rd pavement.", author: "Maria", tsOffsetMin: 150, expiryDate: daysFromNow(14) }),
    makePost({ id: `lf${id++}`, category: "lostfound", title: "Missing: White cat", message: "Green eyes, responds to 'Lilly'.", author: "Sipho", tsOffsetMin: 260, expiryDate: daysFromNow(14) }),
    makePost({ id: `lf${id++}`, category: "lostfound", title: "Found: School backpack", message: "Blue bag with books. DM to describe.", author: "Ayesha", tsOffsetMin: 330, expiryDate: daysFromNow(14) }),
    makePost({ id: `lf${id++}`, category: "lostfound", title: "Lost: Silver ring", message: "Family heirloom. Reward offered.", author: "Johan", tsOffsetMin: 470, expiryDate: daysFromNow(14) }),
    makePost({ id: `lf${id++}`, category: "lostfound", title: "Found: ID card", message: "Name starts with K. At Library desk.", author: "Librarian", tsOffsetMin: 600, expiryDate: daysFromNow(14) })
  );
  // Community
  const commTitles = ["Free tutoring (Gr 10–12)","Community clean-up drive","Garden tools swap","Looking for a plumber","Chess club meets","Babysitting available","Food drive volunteers","Lift club to Welkom","Sewing lessons","Street soccer tonight","Band practice space","Second-hand textbooks","Math study group","Drama workshop","Weekly market idea"];
  const commMsgs = ["Saturday 10:00 at library. Maths & Physical Sciences.","This Sunday 08:00. Meet at corner of Main & Oak.","Borrow/lend spades, rakes. Comment if interested.","Any recommendations for affordable plumber?","Every Wed 17:00 at the library.","After school weekdays. Experienced sitter.","Need help packing parcels on Friday.","Leaving 07:15 weekdays. 3 seats.","Beginners welcome. Saturdays.","19:00 on Pine St. All ages.","Quiet garage available — evenings.","Looking for Grade 12 study guides.","Meet Thu 16:30 classroom 2.","Open call, Saturday 11:00.","Would you support a Saturday market?"];
  const commAuthors = ["Pontsho","Zanele","Peter","Naledi","Amina","Kabelo","Hope Org","Jabu","Lerato","Luis","Zinzi","Nash","Boitumelo","Tumi","Musa"];
  for (let i = 0; i < 15; i++) posts.push(makePost({ id: `cm${id++}`, category: "community", title: commTitles[i % commTitles.length], message: commMsgs[i % commMsgs.length], author: commAuthors[i % commAuthors.length], tsOffsetMin: 120 + i * 17, expiryDate: daysFromNow(21) }));
  
  // Market
  const marketTitles = ["Old couch for sale", "Unused bicycle", "Baby clothes bundle", "Samsung S21 phone", "Looking for Grade 10 textbooks"];
  const marketMsgs = ["Good condition, must collect. R500.", "Barely used, needs new tires. R800.", "0-6 months, various items. R200 for the lot.", "Excellent condition, with charger. R4500.", "Willing to buy second-hand Maths and Science books."];
  const marketAuthors = ["Sarah", "Mike", "Lerato", "Chris", "Jabu"];
  for (let i = 0; i < 5; i++) {
    posts.push(makePost({ 
      id: `mk${id++}`, 
      category: "market", 
      title: marketTitles[i], 
      message: marketMsgs[i], 
      author: marketAuthors[i], 
      tsOffsetMin: 200 + i * 25, 
      expiryDate: daysFromNow(14) 
    }));
  }

  posts.sort((a, b) => b.timestamp - a.timestamp); return posts;
};

export const initialPosts = buildInitialPosts();

export const initialServices = [
  { id: 'serv1', authorId: 'biz_001', name: "Custom Birthday Cakes", description: "Order 48 hours in advance.", hours: "Mon-Sat 08:00-16:00", status: "available" },
  { id: 'serv2', authorId: 'gov_001', name: "Driver's License Renewal", description: "Book online. Bring ID and proof of address.", hours: "Mon-Fri 09:00-15:00", status: "inquire" },
  { id: 'serv3', authorId: 'biz_002', name: "Plumbing Services", description: "24/7 emergency call-outs.", hours: "24/7", status: "available" },
  { id: 'serv4', authorId: 'ngo_001', name: "Legal Aid Clinic", description: "Free legal advice for qualifying residents.", hours: "Wednesdays 10:00-13:00", status: "booked" },
  { id: 'serv5', authorId: 'biz_001', name: "Fresh Bread Daily", description: "Sourdough, wholewheat, and rolls.", hours: "Mon-Sat 08:00-16:00", status: "available" },
];