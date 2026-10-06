/* Website copy for Zavtoo Paani Filter Pvt Ltd (from paanifilter.com).
 * Prices and bookable services come from the database; this is the marketing text around them. */

export const COMPANY = {
  name: "Zavtoo Paani Filter Pvt Ltd",
  brand: "Paani Filter",
  tagline: "Pure Water • Pure Life",
  owner: "Aditya Badwal",
  phone: "89-294-546-47",
  phoneHref: "tel:+918929454647",
  whatsapp: "89-294-546-47",
  whatsappHref: "https://wa.me/918929454647",
  email: "Paanifilter9@gmail.com",
  website: "zavtoo.in",
  websiteHref: "https://zavtoo.in",
  address: "K-15, Raja Puri, Dwarka Road, New Delhi – 110059",
  mapHref: "https://maps.google.com/?q=Raja+Puri+Dwarka+Road+New+Delhi+110059",
  hours: "Mon – Sun: 8:00 AM – 8:00 PM",
  about: "India's most trusted water purifier sales, service & spare parts company with 20+ years of pure water expertise.",
  offer: { code: "PURE30", text: "Get 30% off your first service!" },
};

/** WhatsApp link with a ready-to-send message. */
/** Dedicated support lines — shown together on Contact us and in the footer. */
export const HELPLINES = [
  { label: "Customer help", number: "89-294-546-47", href: "tel:+918929454647" },
  { label: "Technician help", number: "89-290-290-04", href: "tel:+918929029004" },
  { label: "Shipping help", number: "89-290-290-05", href: "tel:+918929029005" },
  { label: "Account help", number: "89-290-290-06", href: "tel:+918929029006" },
] as const;
export const helpline = (label: (typeof HELPLINES)[number]["label"]) => HELPLINES.find((h) => h.label === label)!;

export const whatsappWith = (text: string) => `${COMPANY.whatsappHref}?text=${encodeURIComponent(text)}`;

export const STATS = [
  { value: "50K+", label: "Happy customers" },
  { value: "20+", label: "Years experience" },
  { value: "500+", label: "Spare parts" },
  { value: "Pan India", label: "Delivery" },
];

export const VALUE_PROPS = [
  { title: "100% Genuine Parts", detail: "Certified & authentic products" },
  { title: "Pan India Delivery", detail: "Fast shipping nationwide" },
  { title: "24/7 Support", detail: "Expert help anytime" },
  { title: "20+ Years Experience", detail: "Trusted since 2004" },
  { title: "Best Prices", detail: "Guaranteed lowest prices" },
];

/** Homepage "Complete Water Purifier Solutions" cards. `href` points at booking or the shop. */
export const HOME_SERVICES = [
  { title: "Repair & Maintenance", text: "Expert technicians at your doorstep for all types of RO water purifier repairs and maintenance services.",
    points: ["Same day service available", "All brands & models covered", "Genuine spare parts used", "90-day service warranty"], cta: "Book repair service", href: "/services/repair" },
  { title: "New Installation", text: "Professional installation of new RO water purifiers at your home or office by certified technicians.",
    points: ["Free site inspection", "Expert installation team", "Demo & usage training", "Post-installation support"], cta: "Book installation", href: "/services/installation" },
  { title: "AMC Plans", text: "Annual Maintenance Contract plans for hassle-free water purifier upkeep all year round at the best rates.",
    points: ["2–6 service visits/year", "Free filter replacements", "Priority service booking", "Discounted spare parts"], cta: "View AMC plans", href: "/services#amc" },
  { title: "Filter Replacement", text: "Timely filter and membrane replacement to ensure your water purifier delivers 100% pure drinking water.",
    points: ["All filter types available", "Genuine membranes only", "Quick 30-min service", "Performance testing done"], cta: "Replace filters", href: "/services/filter-change" },
  { title: "Spare Parts Delivery", text: "Order genuine RO spare parts online and get them delivered anywhere in India with fast shipping.",
    points: ["500+ parts in stock", "All brand compatible", "Pan India shipping", "Secure packaging"], cta: "Order parts", href: "/shop?category=spare" },
  { title: "Water Quality Testing", text: "Professional water quality testing to identify the right purification solution for your home's water source.",
    points: ["TDS level testing", "Contamination detection", "Expert recommendation", "Free report provided"], cta: "Book testing", href: "/services/water-test" },
];

/** Labels shown on the Services page cards, by service type. */
export const SERVICE_BADGES: Record<string, string> = {
  Repair: "⚡ Fast Response", "Filter Change": "✅ Most Needed", Installation: "🏆 Premium",
  "Deep Cleaning": "🌊 Hygiene", "Water Test": "🔬 Testing", AMC: "🛡️ Best Value",
};

export const SERVICE_TITLES: Record<string, string> = {
  Repair: "RO Repair Service", "Filter Change": "Filter & Membrane Replacement", Installation: "New RO Installation",
  "Deep Cleaning": "Deep Cleaning & Sanitization", "Water Test": "Water Quality Testing", AMC: "Annual Maintenance (AMC)", Uninstall: "Uninstall & Reinstall",
};

export const AMC = {
  intro: "Get complete peace of mind with our flexible AMC plans. Regular servicing, priority support, free filter replacements & much more — all covered under one affordable plan for the entire year.",
  benefits: ["2 to 6 guaranteed service visits per year", "Free filter & membrane replacements", "Priority technician dispatch",
    "Up to 30% discount on all spare parts", "24/7 emergency WhatsApp support", "Annual water quality test included"],
  plans: [
    { name: "Silver Plan", icon: "🥈", price: 999, features: ["2 Service Visits", "Filter Inspection", "Basic Cleaning", "Phone Support"] },
    { name: "Gold Plan", icon: "🥇", price: 1799, best: true, features: ["4 Service Visits", "Free Filters Included", "Deep Cleaning", "Priority Support", "20% Off Spare Parts"] },
    { name: "Platinum Plan", icon: "💎", price: 2999, features: ["6 Service Visits", "All Parts Free", "UV Sanitization", "24/7 Emergency", "30% Off All Parts"] },
  ],
};

export const ADVANTAGES = [
  { icon: "🏅", title: "20+ Years Experience", text: "Trusted by 50,000+ customers since 2004. Our expertise in water purification is unmatched in the industry." },
  { icon: "🔩", title: "Any Brand, Any Model", text: "We service and supply spare parts for all RO brands — Kent, Aquaguard, Pureit, LG, Livpure & more." },
  { icon: "⚡", title: "Quick Service", text: "Technician at your door within 2–4 hours. Real-time tracking of your service request available." },
  { icon: "💰", title: "Best Price Guarantee", text: "We guarantee the most competitive prices on spare parts and services. No hidden charges, ever." },
  { icon: "✅", title: "Genuine Products Only", text: "100% authentic spare parts with quality certification. Your family's health is our top priority." },
  { icon: "🇮🇳", title: "Pan India Network", text: "Serving customers across all major cities and towns in India with a growing network of certified technicians." },
  { icon: "📞", title: "24/7 Customer Support", text: "Round-the-clock support via call, WhatsApp, and online chat. We're always here when you need us." },
  { icon: "🛡️", title: "Service Warranty", text: "Every service comes with a 90-day warranty. If issues recur, we fix them absolutely free of cost." },
];

export const STEPS = [
  { icon: "📱", title: "Contact or Book Online", text: "Call us, WhatsApp, or fill the online form with your details, service type, location and preferred time." },
  { icon: "✅", title: "Get Instant Confirmation", text: "Receive booking confirmation via SMS & WhatsApp with your technician's name, contact, and ETA." },
  { icon: "🧑‍🔧", title: "Technician Arrives", text: "Our certified technician arrives within 2–4 hours with all required tools, genuine parts and equipment." },
  { icon: "🏅", title: "Done! Get Warranty", text: "Service completed with quality check. Receive your 90-day warranty certificate and digital invoice." },
];

export const TESTIMONIALS = [
  { name: "Rahul Sharma", place: "Dwarka, New Delhi", text: "Excellent service! Technician came within 2 hours and fixed my RO purifier perfectly. Very professional and explained everything. Highly recommend!" },
  { name: "Priya Kulkarni", place: "Bangalore, Karnataka", text: "Ordered membrane online — got it next day! Quality is genuine and at much lower price than local market. Will order again for sure." },
  { name: "Amit Verma", place: "Noida, Uttar Pradesh", text: "Took AMC plan for my Kent purifier. Best decision ever! 4 services done, zero issues. Their team is knowledgeable and always on time." },
  { name: "Sunita Mishra", place: "Mumbai, Maharashtra", text: "Fast delivery, genuine parts, affordable prices. Bought the complete service kit — everything was exactly as described. Great packaging too!" },
  { name: "Rajesh Gupta", place: "Gurgaon, Haryana", text: "Customer support is amazing! Called at 9 PM with an issue, they guided me through over WhatsApp. Next morning technician arrived. Simply outstanding!" },
  { name: "Nisha Kapoor", place: "Rajouri Garden, Delhi", text: "Been using their services for 3 years. Never disappointed. Aditya ji and his team are true professionals. Best RO service in Delhi NCR!" },
];

export const REVIEW_STATS = [
  { value: "4.9", label: "Average rating" }, { value: "50,000+", label: "Happy customers" },
  { value: "98%", label: "Satisfaction rate" }, { value: "15K+", label: "5-star reviews" },
];

export const BRANDS = ["Kent RO", "Aquaguard", "Pureit", "LG Puricare", "Livpure", "A.O. Smith", "Eureka Forbes", "HUL", "Havells", "Blue Star", "Whirlpool"];

export const BOOKING_SERVICES = ["RO Repair", "Filter Replacement", "New Installation", "AMC Plan", "Water Quality Testing", "Spare Parts Order"];

/* ───────────── About us ───────────── */

export const ABOUT = {
  title: "20 Years of Delivering Pure Water to India",
  intro: "Zavtoo Paani Filter Pvt Ltd is India's trusted name in RO water purifier sales, service and spare parts — built on expertise, integrity and a passion for pure water.",
  stats: [{ value: "2004", label: "Founded in" }, { value: "20+", label: "Years experience" }, { value: "50K+", label: "Happy customers" },
    { value: "500+", label: "Spare parts" }, { value: "4.9/5", label: "Customer rating" }, { value: "98%", label: "Satisfaction" }],
  storyTitle: "From a Small Shop to India's Trusted Brand",
  story: [
    "It all began in 2004 when Aditya Badwal started a small water purifier shop in Raja Puri, Dwarka, New Delhi. With a simple goal — to make clean, pure drinking water accessible to every Indian family — and a deep passion for quality service, the journey began.",
    "Over two decades, through hard work, genuine relationships, and an unwavering commitment to quality, Zavtoo Paani Filter Pvt Ltd has grown into one of India's most trusted names in RO water purifier sales, service, and spare parts supply.",
    "Today, we serve thousands of homes, offices, and businesses across India — offering multi-brand support, 500+ genuine spare parts, professional installation, repair services, and pan-India delivery. Our team of certified technicians ensures your family always drinks 100% pure water.",
    "Our promise is simple — Any brand, any model, anywhere in India. Pure water for every Indian home.",
  ],
  pillars: [
    { kicker: "Mission", title: "What We Do", text: "To provide every Indian household with access to affordable, reliable and expert RO water purifier services and genuine spare parts — ensuring clean, safe drinking water for all.",
      points: ["Make pure water accessible to all", "Deliver expert service at fair prices", "Supply only 100% genuine products", "Build lasting customer relationships"] },
    { kicker: "Vision", title: "Where We're Going", text: "To become India's number one multi-brand RO water purifier service network — with a certified technician and genuine spare parts available in every city, town and village across the nation.",
      points: ["Pan India service network by 2026", "10 lakh+ happy customers milestone", "Same-day service in all metro cities", "India's most trusted water purifier brand"] },
    { kicker: "Values", title: "What We Stand For", text: "Our core values define every interaction, every service, and every decision we make as a company. They are the foundation of the trust our 50,000+ customers place in us every day.",
      points: ["Integrity & Transparency always", "Quality without compromise", "Customer satisfaction first", "Continuous innovation & growth"] },
  ],
  founder: {
    name: "Aditya Badwal",
    role: "Founder & Managing Director, Zavtoo Paani Filter Pvt Ltd",
    credentials: ["20+ Years Industry Experience", "Based in New Delhi, India", "Certified Water Purifier Expert"],
    bio: [
      "Aditya Badwal started his journey in the water purifier industry over 20 years ago with a dream — to make clean, safe drinking water available to every Indian family at an affordable price. What started as a small repair shop in Raja Puri, Dwarka, New Delhi, has transformed into a full-fledged company serving thousands of customers pan India.",
      "With deep technical knowledge of all major RO brands and models, Aditya has personally trained hundreds of technicians and built a system that prioritizes customer satisfaction above everything else. His hands-on approach, transparent pricing and commitment to genuine products have earned the trust of over 50,000 customers.",
    ],
    stats: [{ value: "20+", label: "Years in industry" }, { value: "50K+", label: "Customers served" }, { value: "All", label: "Brands covered" }],
    quote: "Every drop of pure water we deliver is a promise kept. Our customers' health is our greatest responsibility and our biggest motivation to keep improving every single day.",
  },
  timeline: [
    { year: "2004", title: "The Beginning — First Shop Opens", text: "Aditya Badwal opens the first Paani Filter shop in Raja Puri, Dwarka, New Delhi. Starting with basic RO repair services and a handful of spare parts, the mission to provide pure water begins." },
    { year: "2008", title: "Spare Parts Store Launched", text: "Expanded to a full spare parts store with 100+ products. Started supplying genuine RO membranes, filters, pumps and accessories to customers and local technicians." },
    { year: "2012", title: "Multi-Brand Service Expertise", text: "Achieved expertise in servicing all major RO brands including Kent, Aquaguard, Pureit and Livpure. Built a team of certified technicians to handle 100+ service requests per month." },
    { year: "2016", title: "Digital Presence & Online Orders", text: "Launched online spare parts ordering system. Started taking service bookings via WhatsApp and Facebook. Customer base grew to 20,000+ across Delhi NCR region." },
    { year: "2020", title: "Pan India Delivery Begins", text: "Despite pandemic challenges, launched pan India spare parts delivery service. Partnered with major courier companies to reach customers across all Indian states with fast, reliable delivery." },
    { year: "2024", title: "50,000+ Customers Milestone", text: "Reached the landmark of 50,000+ happy customers. Launched the new website with online booking, e-commerce, and customer dashboard. Now operating as Zavtoo Paani Filter Pvt Ltd." },
  ],
  achievements: [
    { value: "50,000+", title: "Happy Customers", text: "Families across India enjoying pure water every day" },
    { value: "1 Lakh+", title: "Services Completed", text: "Repair, installation and maintenance jobs done" },
    { value: "500+", title: "Spare Parts Available", text: "Genuine parts for all major RO brands in stock" },
    { value: "4.9/5", title: "Average Rating", text: "Consistently rated by thousands of happy customers" },
    { value: "28+", title: "States Covered", text: "Delivery and service network across India" },
    { value: "20+", title: "Years Experience", text: "Two decades of water purifier industry expertise" },
    { value: "2 Hr", title: "Response Time", text: "Average technician arrival time in major cities" },
    { value: "90 Day", title: "Service Warranty", text: "On every repair and maintenance service we do" },
  ],
  values: [
    { icon: "🤝", title: "Integrity & Honesty", text: "We believe in complete transparency — honest pricing, genuine products, and straightforward communication with every customer, every time." },
    { icon: "⭐", title: "Quality First", text: "From the spare parts we stock to the technicians we deploy — quality is non-negotiable. We never compromise on what goes into your water purifier." },
    { icon: "💙", title: "Customer Care", text: "Our customers are our family. We go above and beyond to ensure satisfaction, offering 90-day warranty, 24/7 WhatsApp support and no-questions-asked service." },
    { icon: "⚡", title: "Speed & Reliability", text: "When your water purifier breaks down, every hour matters. Our 2-hour response time and same-day service commitment means you're never without pure water for long." },
    { icon: "🚀", title: "Continuous Innovation", text: "We constantly update our knowledge, expand our product range, and improve our processes to stay ahead in the ever-evolving water purification industry." },
    { icon: "🇮🇳", title: "Made for India", text: "We understand India's diverse water quality challenges and tailor our services and products specifically for Indian homes, water sources and budgets." },
  ],
  whyIntro: "Choosing Paani Filter means choosing 20 years of expertise, genuine products, certified technicians and a team that truly cares about your family's health and wellbeing.",
  why: [
    { title: "100% Genuine Products", text: "Only ISI-certified, authentic spare parts used in every service" },
    { title: "Any Brand, Any Model", text: "Kent, Aquaguard, Pureit, Livpure, LG, A.O. Smith & more" },
    { title: "2-Hour Service Response", text: "Fast technician dispatch to your doorstep in major cities" },
    { title: "90-Day Service Warranty", text: "Free re-service if the same issue recurs within 90 days" },
    { title: "Best Price Guarantee", text: "Lowest prices on services and spare parts — no hidden charges" },
    { title: "24/7 WhatsApp Support", text: "Round-the-clock support via WhatsApp, call and online chat" },
  ],
  brands: [
    { name: "Kent RO", note: "Authorized Service" }, { name: "Aquaguard", note: "Expert Service" }, { name: "Pureit HUL", note: "Certified Technicians" },
    { name: "Livpure", note: "All Models Covered" }, { name: "A.O. Smith", note: "Premium Service" },
  ],
};

/* ───────────── Contact us ───────────── */

export const CONTACT = {
  title: "We're Here to Help You Every Step of the Way",
  intro: "Have a question, need a service, or want to track your order? Our expert support team is just a call or message away — 7 days a week.",
  cards: [
    { icon: "📞", title: "Call Us", text: "Speak directly with our experts. Available 7 days a week.", value: COMPANY.phone, href: COMPANY.phoneHref, note: "⚡ Instant Response" },
    { icon: "💬", title: "WhatsApp", text: "Send us a message anytime. Quick replies guaranteed.", value: COMPANY.whatsapp, href: COMPANY.whatsappHref, note: "💬 Chat Anytime" },
    { icon: "✉️", title: "Email Us", text: "Drop us an email for detailed queries or complaints.", value: COMPANY.email, href: `mailto:${COMPANY.email}`, note: "📨 Reply in 2 Hours" },
    { icon: "📍", title: "Visit Us", text: "Come visit our store in Dwarka, New Delhi.", value: "K-15, Raja Puri, New Delhi", href: COMPANY.mapHref, note: "🕗 Mon–Sun 8AM–8PM" },
  ],
  conversation: "Whether you need to book a service, track an order, ask about spare parts, or just have a question — we're always ready to help. Reach out through any channel you prefer.",
  storeHours: [["Monday – Saturday", "8:00 AM – 8:00 PM"], ["Sunday", "9:00 AM – 6:00 PM"]],
  techHours: [["Monday – Saturday", "8:00 AM – 8:00 PM"], ["Sunday", "9:00 AM – 5:00 PM"]],
  supportHours: [["Phone Support", "8 AM – 8 PM"], ["WhatsApp", "24 / 7"], ["Email Support", "24 / 7"], ["Online Booking", "24 / 7"],
    ["Emergency", "WhatsApp only"], ["Response Time", "Within 2 hours"], ["Public Holidays", "Limited hours"]],
  channels: [
    { icon: "📞", title: "Phone Call", text: "Talk directly with our water purifier experts for instant help and service booking.", cta: "Call Now", href: COMPANY.phoneHref },
    { icon: "💬", title: "WhatsApp Chat", text: "Send us photos, videos or messages on WhatsApp for quick diagnosis and support.", cta: "Chat Now", href: COMPANY.whatsappHref },
    { icon: "✉️", title: "Email Support", text: "For detailed complaints, billing queries, or business proposals — email us anytime.", cta: "Send Email", href: `mailto:${COMPANY.email}` },
    { icon: "📋", title: "Online Form", text: "Fill our contact form for service bookings, enquiries, or feedback. Easy & quick!", cta: "Fill Form", href: "#contact-form" },
  ],
  faq: [
    ["What are your contact hours?", "We are available Monday to Saturday from 8:00 AM to 8:00 PM, and Sunday from 9:00 AM to 6:00 PM. For urgent issues, you can WhatsApp us at any time and we will respond at the earliest possible."],
    ["How quickly will I get a response after submitting the contact form?", "We aim to respond within 30 minutes during business hours. For forms submitted after 8 PM, we will respond first thing the next morning. WhatsApp messages typically get faster replies."],
    ["Can I visit your store directly without an appointment?", "Yes! You are welcome to visit our store at K-15, Raja Puri, Dwarka Road, New Delhi during business hours. No appointment is necessary. Our team will assist you with purchases, spare parts, or any service-related queries."],
    ["Do you provide support for all RO brands?", "Absolutely! We provide sales, service, and spare parts support for all major RO brands including Kent, Aquaguard, Pureit, Livpure, LG Puricare, A.O. Smith, Eureka Forbes, Havells, Blue Star, and many more."],
    ["How can I track my spare parts order?", "After placing your order, you will receive a tracking link via SMS and WhatsApp. You can also contact us directly with your order number on WhatsApp or phone and we will provide real-time status updates."],
    ["Is there a helpline number for emergencies?", "For after-hours emergencies, please WhatsApp us at 89-294-546-47. While phone calls may not be answered after 8 PM, WhatsApp messages are monitored and we will assist you as quickly as possible."],
  ],
};

/* ───────────── Spare parts showcase (photographed stock, price on request) ───────────── */

const partPhotos = (name: string) => [1, 2, 3].map((n) => `/products/parts/${name}-${n}.jpg`);

export const PARTS_SHOWCASE = [
  { id: "blue-cap-cartridge", name: "Inline Filter Cartridge — Blue Twist Cap",
    text: "White inline cartridge with a blue twist-lock cap. Opens fully: blue inner core sealed with a red O-ring, so it can be cleaned and refilled.",
    tags: ["Twist-lock cap", "O-ring sealed", "Refillable"], photos: partPhotos("blue-cap-cartridge") },
  { id: "grey-cap-cartridge", name: "Inline Filter Cartridge — Grey Twist Cap",
    text: "White inline cartridge with a grey twist-lock cap and dark inner core with red sealing ring. Unscrews for cleaning and media change.",
    tags: ["Twist-lock cap", "Sealed inner core", "Refillable"], photos: partPhotos("grey-cap-cartridge") },
  { id: "black-inline-cartridge", name: "Black Inline Filter Cartridge",
    text: "Glossy black inline cartridge with push-fit inlet and outlet ports and a screw-fixed end cap for a secure, leak-free fit.",
    tags: ["Push-fit ports", "Screw-fixed cap", "Compact"], photos: partPhotos("black-inline-cartridge") },
  { id: "osmo-housing", name: "OSMO Filter Housing with Wall Clamp",
    text: "White OSMO housing with a clear bowl, black screw cap with red sealing ring, side push-fit ports and a wall-mounting clamp.",
    tags: ["Clear bowl", "Wall clamp included", "Push-fit ports"], photos: partPhotos("osmo-housing") },
  { id: "membrane-housing", name: "RO Membrane Housing (White)",
    text: "White RO membrane housing with a threaded screw cap, red O-ring seal and push-fit end ports for domestic RO purifiers.",
    tags: ["Threaded cap", "O-ring seal", "Push-fit ports"], photos: partPhotos("membrane-housing") },
  { id: "sediment-spun-filter", name: "PP Spun Sediment Filter",
    text: "Melt-blown polypropylene spun cartridge that traps dirt, sand and rust before they reach the membrane.",
    tags: ["Spun PP", "Pre-filter", "All brands"], photos: partPhotos("sediment-spun-filter"), productId: "sediment-5" },
];
