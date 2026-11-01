/* Privacy Policy and Terms & Conditions of Zavtoo Paani Filter Pvt Ltd (from paanifilter.com),
 * kept as data so the website renders them in its own style. */

export type Block =
  | { p: string }
  | { h: string }
  | { ul: string[] }
  | { ol: { title: string; text: string }[] }
  | { table: { head: string[]; rows: string[][] } }
  | { note: { title: string; text: string } };

export interface PolicySection { title: string; sub?: string; blocks: Block[] }
export interface Policy { title: string; intro: string; meta: string[]; sections: PolicySection[] }

const CONTACT_LINE = "Paanifilter9@gmail.com or call 89-294-546-47";

export const PRIVACY: Policy = {
  title: "Zavtoo Privacy Policy",
  intro: "How Zavtoo Paani Filter Pvt Ltd handles information in the Zavtoo app and on zavtoo.in, including customer, technician and dealer accounts.",
  meta: ["Last updated: 15 October 2026", "Applies to Zavtoo Android app and website"],
  sections: [
    { title: "Who we are", blocks: [
      { p: "Zavtoo Paani Filter Pvt Ltd operates Zavtoo (Android package in.zavtoo.customer) and zavtoo.in for water purifier purchases, spare parts and service bookings. The app includes customer, technician and dealer access. Contact: Paanifilter9@gmail.com; account support: +91 8929029006; K-15, Raja Puri, Dwarka Road, New Delhi – 110059, India." },
    ] },
    { title: "Information you provide", blocks: [
      { ul: [
        "Account information: name, email, mobile number, account identifier and login credentials processed by our authentication provider. Optional customer profile fields include date of birth and gender.",
        "Orders and services: addresses, PIN codes, map coordinates you save, purifier details, appointment dates, service issues, booking history, purchased items, payment method/status and wallet or referral transactions.",
        "Communications: support messages, uploaded photos, reviews and ratings you choose to submit. Reviews may be visible to other users.",
        "Technician information: profile photo, skills, languages, experience, service areas, assigned jobs, parts inventory, earnings, payout records and verification status. Technician profile information and photos may be visible to customers. Profile photos use publicly accessible storage URLs.",
        "Dealer information: shop and owner name, contact details, address, service areas, GSTIN if provided, verification status, listings, team details, orders and settlement records. Shop and product listings are visible to users.",
      ] },
      { p: "The current app records payment methods, amounts and payment status. It does not ask for card numbers, CVV, UPI PINs or bank login passwords. Never send those details in support messages." },
    ] },
    { title: "Location, camera and photos", blocks: [
      { p: "With your permission, location can be used to pin a service address and coordinate technician visits. When a technician starts a ride for an assigned job, the app can send precise live coordinates to show the technician to the assigned customer and authorized operations staff. Location sharing stops when the active ride ends or the tracking screen/app session stops. The app does not request Android background-location permission and continuous tracking while the app is closed is not supported." },
      { p: "Camera or photo selection is used when you choose to add RO photos, support attachments, profile photos or product pictures. We upload the images you select, rather than your entire photo library. You can deny or revoke camera and location access in Android Settings; features needing that access may then be unavailable. You can enter an address manually." },
    ] },
    { title: "Device information and local storage", blocks: [
      { p: "Our hosting, authentication, database, storage and map providers receive network information such as your IP address and browser/device request information when delivering the service. The app uses device/browser storage to remember login sessions, selected account role, onboarding status and cart contents. Signing out removes the relevant login session; uninstalling or clearing app storage removes local app data but does not delete your server account." },
    ] },
    { title: "Why we use information", blocks: [
      { ul: ["Create and authenticate accounts; manage customer, technician and dealer access.", "Fulfil orders, arrange visits, share job details, provide tracking and maintain service history.", "Manage listings, stock, verification, reviews, wallet records and settlements.", "Answer support requests, send service-related updates, prevent misuse and meet applicable legal obligations."] },
      { p: "We do not sell personal information. The current app does not integrate an advertising SDK or Google Analytics. Contact us to change communication preferences or request correction of your information." },
    ] },
    { title: "Who receives information", blocks: [
      { ul: [
        "Supabase processes authentication, database records, real-time updates and uploaded files on our behalf. Website hosting providers deliver the app's web content.",
        "Assigned technicians, relevant dealers and authorized Zavtoo staff receive the contact, address, service and order information needed for their work. Delivery providers receive fulfilment details when required.",
        "OpenStreetMap tile servers receive network requests and the map area displayed. Opening Google Maps, WhatsApp, email or telephone links uses those services under their own privacy terms.",
        "We may disclose necessary records to comply with applicable legal requests, resolve disputes or protect users and the service.",
      ] },
      { p: "Service providers may process information outside your state or country. Access to private account records is controlled through authentication and database permissions. Public profile and listing images can be viewed by anyone with their URL. No online service can guarantee absolute security." },
    ] },
    { title: "Retention and deletion", blocks: [
      { p: "We retain account information while needed to operate your account and services. You can request deletion of your Zavtoo account and associated data at zavtoo.in/delete-account without signing in, or through the Delete account link in your customer, technician or dealer profile. You can also email Paanifilter9@gmail.com with the subject 'Zavtoo account deletion'." },
      { p: "Deletion requests are handled by our support team. Identify the account role and registered email or phone number; we may verify ownership before acting. Do not send your password, OTP, identity documents or payment PIN. We will explain the status and expected completion time after verification. Opening an email draft alone does not submit a request: you must send it." },
      { p: "Deletion covers your login and associated profile, saved addresses, optional profile details, uploaded personal photos and support data that no longer need to be kept. Order, invoice, payment, warranty, fraud-prevention and dispute records may be retained where required for those purposes or by law. Public listings and technician/dealer records need review for active jobs, third-party orders and settlement obligations. We will explain any retained categories, reasons and applicable retention periods when handling your request. Backup copies may remain until the provider's normal backup cycle expires; they are not used to restore a deleted account for ordinary service use." },
      { p: "You may also request a copy, correction or deletion of particular personal information without closing your account by contacting the same email address. Removing the app or logging out is not an account deletion request." },
    ] },
    { title: "Children and policy changes", blocks: [
      { p: "Zavtoo is intended for adult customers and business users, not children under 18. If you believe a child has provided personal information, contact us so we can investigate and remove it where appropriate." },
      { p: "We update this page when our data practices change and revise the date above. Material changes will be communicated through the service where appropriate. Privacy questions and requests can be sent to Paanifilter9@gmail.com or the address listed above." },
    ] },
  ],
};

export const TERMS: Policy = {
  title: "Terms & Conditions",
  intro: "Please read these Terms and Conditions carefully before using our website, purchasing any products, or booking any services from Zavtoo Paani Filter Pvt Ltd.",
  meta: ["Effective: 1st January 2024", "Updated: 1st November 2024", "Governed by Indian Law"],
  sections: [
    { title: "Introduction", blocks: [
      { note: { title: "Important: By using our services, you agree to these Terms", text: "Accessing zavtoo.in, booking a service, or making a purchase constitutes your acceptance of these Terms & Conditions. If you disagree, please discontinue use of our services." } },
      { p: "Welcome to Zavtoo Paani Filter Pvt Ltd (\"Paani Filter\", \"Company\", \"we\", \"us\", or \"our\"). These Terms and Conditions (\"Terms\") govern your access to and use of our website zavtoo.in, our mobile applications, and all services, products, and features we offer — including RO water purifier sales, repair services, spare parts, AMC plans, and delivery." },
      { p: "These Terms constitute a legally binding agreement between you (\"User\", \"Customer\", \"you\") and Zavtoo Paani Filter Pvt Ltd, registered in India with its principal office at K-15, Raja Puri, Dwarka Road, New Delhi – 110059." },
      { p: "By accessing our website, creating an account, placing an order, or booking a service, you confirm that you have read, understood, and agree to be bound by these Terms and our Privacy Policy." },
      { p: "Please Read Carefully: If you do not agree with any part of these Terms and Conditions, please refrain from using our website or services. Continued use of zavtoo.in constitutes your acceptance of these terms." },
    ] },
    { title: "Definitions", sub: "Key terms used throughout this document", blocks: [
      { p: "For the purpose of clarity, the following terms carry the meanings defined below whenever used in this document:" },
      { table: { head: ["Term", "Definition"], rows: [
        ["\"Company\" / \"We\" / \"Us\"", "Zavtoo Paani Filter Pvt Ltd, owner and operator of zavtoo.in"],
        ["\"Website\"", "The website accessible at zavtoo.in and all associated subdomains and pages"],
        ["\"User\" / \"You\" / \"Customer\"", "Any individual or entity accessing the website or using our services"],
        ["\"Services\"", "All RO water purifier repair, installation, maintenance, AMC plans, water testing, and related services offered by us"],
        ["\"Products\"", "RO water purifiers, spare parts, filters, membranes, and any other items sold on our website"],
        ["\"Order\"", "A confirmed purchase request for products or a confirmed booking request for services"],
        ["\"Technician\"", "Certified service professional deployed by Paani Filter to perform services at customer premises"],
        ["\"AMC\"", "Annual Maintenance Contract — subscription-based maintenance plan offered by Paani Filter"],
        ["\"Content\"", "All text, images, logos, videos, product descriptions, and other materials on our website"],
      ] } },
    ] },
    { title: "Use of Website", sub: "Acceptable use and access terms for zavtoo.in", blocks: [
      { p: "By accessing and using zavtoo.in, you confirm that you are at least 18 years of age or accessing the site under the supervision of a parent or legal guardian. You agree to use our website only for lawful purposes and in accordance with these Terms." },
      { h: "Permitted Uses" },
      { p: "Browsing our products, placing orders, booking services, creating an account, reading content, contacting us for support, and using our tools for legitimate personal or business purposes." },
      { h: "Prohibited Uses" },
      { p: "Attempting to hack, scrape, reverse-engineer, spam, impersonate others, upload malicious content, or use our site for any fraudulent, unlawful, or unauthorized commercial purposes." },
      { p: "We reserve the right to suspend or terminate access to our website for any user who violates these terms, engages in prohibited activities, or acts in a manner harmful to our services, other users, or our reputation." },
      { note: { title: "Website Availability", text: "We strive to keep zavtoo.in available 24/7, but we do not guarantee uninterrupted access. The website may be temporarily unavailable due to maintenance, updates, or technical issues beyond our control. We are not liable for any inconvenience caused by downtime." } },
    ] },
    { title: "Services Terms", sub: "Terms applicable to all service bookings and technician visits", blocks: [
      { p: "All service bookings made through our website, phone, or WhatsApp are subject to the following terms. By booking a service, you agree to these conditions." },
      { h: "Booking & Scheduling" },
      { ul: [
        "Service bookings are subject to technician availability in your area at the requested date and time.",
        "We will confirm your booking via SMS and/or WhatsApp within 1-2 hours of submission during business hours.",
        "You must provide accurate information including your address, contact number, RO brand, and description of the problem.",
        "You are responsible for ensuring someone is present at the service location during the scheduled visit window.",
        "If you need to reschedule, please inform us at least 4 hours before the scheduled visit to avoid a cancellation charge.",
      ] },
      { h: "Service Execution" },
      { ul: [
        "Our technicians carry valid ID and service authorization. You may ask to verify their identity before allowing access.",
        "All services are performed using genuine, certified spare parts. We will seek your approval before replacing any part and inform you of the associated cost.",
        "The final service cost may differ from the initial estimate if additional issues are discovered during the visit.",
        "A detailed service report and digital invoice will be provided upon completion of every service visit.",
      ] },
      { h: "Cancellation Policy" },
      { ol: [
        { title: "Free Cancellation (4+ hours notice)", text: "Cancel your service booking at least 4 hours before the scheduled time with no cancellation charge. Refund processed within 3-5 business days if prepaid." },
        { title: "Late Cancellation (less than 4 hours)", text: "Cancellations within 4 hours of the scheduled visit may incur a nominal cancellation fee of ₹100–₹200 to cover technician travel costs." },
        { title: "No-Show Policy", text: "If no one is present at the service location when the technician arrives and we are not informed in advance, a ₹200 visit charge may apply for rescheduling." },
        { title: "Company Cancellation", text: "In rare cases where we must cancel (technician unavailability, emergency), we will notify you immediately and offer a full refund or priority rescheduling at no extra cost." },
      ] },
    ] },
    { title: "Ordering & Payment", sub: "How orders are placed, confirmed, and paid for", blocks: [
      { p: "All purchases made on zavtoo.in are subject to product availability and acceptance of your order. Placing an order does not constitute a guaranteed purchase until you receive an order confirmation from us." },
      { h: "Order Process" },
      { ul: [
        "Orders are placed through our website, WhatsApp, or by calling us directly at 89-294-546-47.",
        "You will receive an order confirmation via SMS/WhatsApp/email within 1-2 hours of placing your order.",
        "We reserve the right to cancel or modify any order if the product is out of stock, if pricing errors occur, or if fraud is suspected.",
        "All prices displayed on our website are inclusive of GST (Goods and Services Tax) unless stated otherwise.",
      ] },
      { h: "Payment Methods" },
      { ul: [
        "UPI Payments: Google Pay, PhonePe, Paytm, BHIM, and all UPI-compatible payment apps accepted.",
        "Cards: All major debit and credit cards including Visa, MasterCard, RuPay accepted via our secure payment gateway.",
        "Net Banking: Online bank transfers accepted from all major Indian banks through our integrated payment gateway.",
        "Cash on Delivery: COD available for orders below ₹2,000 and in select pin codes. Service payments accepted in cash at completion.",
      ] },
      { note: { title: "Payment Security", text: "All online payments are processed through PCI-DSS compliant payment gateways (Razorpay/PayU). We do not store your card details on our servers. Never share your OTP, card details, or bank passwords with anyone, including our team." } },
      { h: "Pricing & Taxes" },
      { ul: [
        "All prices are in Indian Rupees (INR) and are subject to change without prior notice.",
        "GST is applicable on all products and services as per current Indian tax regulations.",
        "Shipping charges, if applicable, will be clearly displayed before order confirmation.",
        "We strive to maintain accurate pricing, but errors may occasionally occur. We reserve the right to cancel orders placed at incorrect prices after informing the customer.",
      ] },
    ] },
    { title: "Delivery & Shipping", sub: "Shipping timelines, coverage, and delivery terms", blocks: [
      { p: "We provide pan India delivery of spare parts and products through trusted courier partners. The following terms apply to all deliveries made by Zavtoo Paani Filter Pvt Ltd." },
      { table: { head: ["Delivery Type", "Timeline", "Coverage", "Charges"], rows: [
        ["Standard Delivery", "3–7 Business Days", "Pan India", "₹50–₹150 (Free above ₹499)"],
        ["Express Delivery", "1–3 Business Days", "Major cities", "₹150–₹300"],
        ["Same Day Delivery", "Same Day (Order by 12 PM)", "Delhi NCR only", "₹200–₹400"],
        ["Technician Visit", "2–4 Hours", "Service areas only", "Included in service charge"],
      ] } },
      { ul: [
        "Delivery timelines are estimates and may vary due to location, courier availability, weather, or festive seasons.",
        "You will receive tracking information via SMS/WhatsApp once your order is dispatched. For delivery questions, call our shipping helpline at 89-290-290-05.",
        "Please ensure someone is available at the delivery address. Failed delivery attempts may result in re-delivery charges.",
        "Inspect your delivery at the time of receipt. Report any damaged or incorrect items within 24 hours of delivery.",
        "We are not responsible for delays caused by courier partners, natural disasters, strikes, or other events beyond our control (force majeure).",
      ] },
    ] },
    { title: "Returns & Refunds Policy", sub: "When and how returns and refunds are processed", blocks: [
      { p: "We want you to be completely satisfied with your purchase. Our returns and refunds policy is designed to be fair and straightforward. Please read the following carefully before requesting a return or refund." },
      { h: "Product Returns" },
      { table: { head: ["Situation", "Return Eligible?", "Return Window"], rows: [
        ["Wrong product delivered", "Yes", "Within 7 days of delivery"],
        ["Damaged product received", "Yes", "Within 24 hours of delivery"],
        ["Defective/non-functional product", "Yes", "Within 7 days of delivery"],
        ["Change of mind / wrong order placed", "Conditional", "Within 24 hours (unused, sealed only)"],
        ["Product opened/used/installed", "No", "Not applicable"],
        ["Damaged by customer misuse", "No", "Not applicable"],
        ["Custom/special order items", "No", "Not applicable"],
      ] } },
      { h: "Refund Process" },
      { ol: [
        { title: "Raise a Return Request", text: "Contact us within the return window via WhatsApp, phone (89-294-546-47), or email (Paanifilter9@gmail.com) with your order number, photos of the product, and reason for return." },
        { title: "Return Review (1–2 Days)", text: "Our team will review your request and photos within 1–2 business days and confirm whether the return is approved, requesting any additional information if needed." },
        { title: "Product Pickup or Drop", text: "Approved returns will be picked up by our courier partner (for eligible areas) or you may be asked to ship the product to our address. Return shipping is borne by us for eligible returns." },
        { title: "Refund Processing (5–7 Days)", text: "Once the returned product is received and inspected, refunds are processed within 5–7 business days to your original payment method (UPI, bank account, or card)." },
      ] },
      { note: { title: "Service Refunds", text: "If you are dissatisfied with a service within the 90-day warranty period for the same issue, we will re-perform the service absolutely free. Refunds for completed services are generally not provided unless we have failed to perform the agreed service. Prepaid service bookings cancelled with proper notice are fully refunded within 3–5 business days." } },
    ] },
    { title: "Warranty Policy", sub: "Product and service warranty coverage terms", blocks: [
      { p: "Zavtoo Paani Filter Pvt Ltd stands behind the quality of its products and services. The following warranty terms apply to all purchases and services:" },
      { h: "Service Warranty" },
      { p: "All repair and maintenance services performed by our certified technicians come with a 90-day (3-month) service warranty. If the same issue recurs within 90 days of the original service, we will re-perform the service completely free of charge — including labor and any parts that were replaced during the original service." },
      { ul: [
        "The 90-day warranty begins from the date of service completion as documented in your service invoice.",
        "Warranty claims must be raised by contacting us via phone or WhatsApp with your original invoice number.",
        "Warranty does not cover damage caused by misuse, power surges, water contamination beyond normal levels, or unauthorized tampering by third parties.",
        "Warranty is void if the system has been modified or serviced by unauthorized technicians after our service visit.",
      ] },
      { h: "Product Warranty" },
      { table: { head: ["Product Type", "Warranty Period", "Coverage"], rows: [
        ["RO Membranes", "6 Months", "Manufacturing defects only"],
        ["Booster Pumps & Motors", "3 Months", "Manufacturing defects, functional failure"],
        ["Filters (Sediment/Carbon)", "10 Days", "Genuineness & quality defects only"],
        ["SMPS / Power Adapters", "3 Months", "Manufacturing defects, burnout"],
        ["Complete RO Systems", "1 Year", "As per manufacturer warranty terms"],
        ["Spare Parts & Fittings", "10 Days", "Genuineness & defects only"],
      ] } },
      { note: { title: "Warranty Exclusions", text: "Warranties do not cover: normal wear and tear, damage from improper installation by the customer, damage from excessive TDS levels, physical damage, water damage from external flooding, or products modified after purchase. Manufacturer warranties (where applicable) are governed by the respective manufacturer's terms." } },
    ] },
    { title: "User Accounts", sub: "Account registration, security, and responsibilities", blocks: [
      { p: "To access certain features of our website, including order tracking, service history, and AMC management, you may need to register for an account. The following terms apply to all user accounts on zavtoo.in:" },
      { ul: [
        "You must be at least 18 years of age to create an account. Minors may only access our services through a parent or guardian's account.",
        "You are responsible for providing accurate, complete, and current information during registration and keeping it updated.",
        "You are solely responsible for maintaining the confidentiality of your password and for all activities that occur under your account.",
        "You agree to notify us immediately at Paanifilter9@gmail.com or call our account helpline at 89-290-290-06 if you suspect any unauthorized use of your account.",
        "You may not create multiple accounts for the same person or transfer your account to another person without our written consent.",
        "We reserve the right to suspend or terminate accounts that violate these Terms, contain false information, or are used for fraudulent purposes.",
      ] },
      { note: { title: "Account Security Tip", text: "Use a strong, unique password for your Paani Filter account. Enable two-factor authentication if available. Never share your login credentials with anyone. Our staff will never ask for your password via phone, email, or WhatsApp." } },
    ] },
    { title: "Intellectual Property", sub: "Ownership of website content and brand assets", blocks: [
      { p: "All content on zavtoo.in — including but not limited to text, graphics, logos, button icons, images, audio clips, digital downloads, data compilations, and software — is the exclusive property of Zavtoo Paani Filter Pvt Ltd and is protected by Indian and international copyright, trademark, and intellectual property laws." },
      { ul: [
        "The \"Paani Filter\" name, logo, and all associated brand assets are trademarks of Zavtoo Paani Filter Pvt Ltd.",
        "You may not reproduce, duplicate, copy, sell, resell, or exploit any content from our website without express written permission from us.",
        "You may print or download content for personal, non-commercial use only, provided you do not modify the content and retain all copyright notices.",
        "Using our brand name, logo, or content for commercial purposes, creating derivative works, or passing off our content as your own is strictly prohibited and may result in legal action.",
      ] },
      { p: `For permissions to use our content, brand assets, or to report intellectual property violations, contact us at ${CONTACT_LINE}.` },
    ] },
    { title: "Prohibited Uses", sub: "Activities strictly forbidden on our platform", blocks: [
      { p: "In addition to the general use restrictions mentioned earlier, the following specific activities are strictly prohibited when using zavtoo.in or our services. Violation of these terms may result in immediate account termination and legal action:" },
      { ul: [
        "Using our platform to transmit any unsolicited commercial communications (spam) or bulk messaging.",
        "Attempting to gain unauthorized access to any part of our website, servers, databases, or other systems.",
        "Introducing viruses, trojans, malware, or any other malicious or harmful code to our systems.",
        "Using automated bots, scrapers, or crawlers to extract data from our website without written permission.",
        "Impersonating any person, company, or entity, or falsely claiming any affiliation with Paani Filter.",
        "Using our platform to conduct any illegal activity under Indian law, including fraud, money laundering, or copyright infringement.",
        "Submitting false service requests, fake reviews, or fraudulent payment information.",
        "Reselling or commercially exploiting our services or products without prior written authorization from us.",
        "Engaging in any conduct that restricts or inhibits any other user from using or enjoying our website or services.",
      ] },
      { note: { title: "Consequences of Violation", text: "Violation of prohibited uses may result in immediate termination of your account, blocking of access to our services, reporting to law enforcement authorities, and/or civil or criminal legal proceedings as applicable under Indian law." } },
    ] },
    { title: "Limitation of Liability", sub: "The extent of our legal responsibility to you", blocks: [
      { p: "To the maximum extent permitted by applicable Indian law, Zavtoo Paani Filter Pvt Ltd, its directors, employees, partners, and affiliates shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of our services." },
      { h: "What We Are Not Liable For" },
      { ul: [
        "Any loss of data, business, revenue, or profits arising from inability to access our website or use our services.",
        "Damages resulting from unauthorized access to your account due to your failure to maintain password security.",
        "Delays or failures in delivery or service caused by third-party courier partners, weather conditions, or events beyond our reasonable control (force majeure).",
        "Pre-existing damage to your water purifier or property that was not caused by our technician's work.",
        "Any health issues claimed to result from water quality, except where directly attributable to a service defect within the warranty period and supported by appropriate documentation.",
        "Content on third-party websites linked from zavtoo.in.",
      ] },
      { p: "In all cases where we are found liable, our maximum liability shall not exceed the total amount paid by you for the specific product or service giving rise to the claim. This limitation applies regardless of the form of action, whether in contract, tort, or otherwise." },
      { note: { title: "Disclaimer of Warranties", text: "Our website and services are provided on an \"as is\" and \"as available\" basis without any warranties of any kind, either expressed or implied, except as explicitly stated in our warranty policy section above. We do not warrant that our website will be error-free, secure, or always available." } },
    ] },
    { title: "Governing Law & Dispute Resolution", sub: "Legal jurisdiction and how disputes are resolved", blocks: [
      { p: "These Terms and Conditions are governed by and construed in accordance with the laws of the Republic of India, without regard to any conflict of law provisions. By using our services, you submit to the exclusive jurisdiction of Indian courts." },
      { h: "Dispute Resolution Process" },
      { ol: [
        { title: "Informal Resolution First", text: "Contact us directly at 89-294-546-47 or Paanifilter9@gmail.com. We will make every effort to resolve your concern amicably within 7–14 business days through good faith negotiation." },
        { title: "Consumer Forum (if needed)", text: "If informal resolution fails, consumers in India may approach the appropriate Consumer Disputes Redressal Commission under the Consumer Protection Act, 2019." },
        { title: "Arbitration", text: "For commercial disputes, both parties may agree to settle through arbitration under the Arbitration and Conciliation Act, 1996, with proceedings held in New Delhi, India." },
        { title: "Court Jurisdiction", text: "If arbitration is not agreed upon, disputes shall be subject to the exclusive jurisdiction of the courts located in New Delhi, India." },
      ] },
      { note: { title: "Applicable Laws", text: "These terms are subject to applicable Indian laws including the Information Technology Act 2000, Consumer Protection Act 2019, Indian Contract Act 1872, and other applicable regulations." } },
    ] },
    { title: "Changes to These Terms", sub: "How and when we update our Terms & Conditions", blocks: [
      { p: "Zavtoo Paani Filter Pvt Ltd reserves the right to modify, update, or replace any part of these Terms and Conditions at any time. Changes may be made to reflect updates in our services, legal requirements, business practices, or feedback from customers." },
      { h: "How We Notify You" },
      { ul: [
        "We will update the \"Last Updated\" date at the top of this page whenever changes are made.",
        "For significant changes, we will send a notification via email to registered customers at least 7 days before the changes take effect.",
        "A notice banner may be displayed on our website homepage for material changes.",
        "Customers who have opted into WhatsApp notifications will receive an alert about major policy changes.",
      ] },
      { p: "Your continued use of zavtoo.in or our services after any changes to these Terms constitutes your acceptance of the updated Terms. If you do not agree with the changes, please discontinue using our services and contact us to close your account." },
      { note: { title: "Current Version", text: "This is Version 2.0 of our Terms & Conditions, effective from 1st January 2024 and last updated on 1st November 2024. Previous versions are available upon written request to Paanifilter9@gmail.com." } },
    ] },
    { title: "Contact Us About These Terms", sub: "Our team is happy to explain any part of these terms", blocks: [
      { p: "If you have any questions, concerns, or need clarification about any part of these Terms and Conditions, please reach out to us. We are committed to being transparent and will respond to all legitimate enquiries within 2–3 business days." },
      { table: { head: ["", ""], rows: [
        ["Company Name", "Zavtoo Paani Filter Pvt Ltd"], ["Business Owner", "Aditya Badwal"],
        ["Registered Address", "K-15, Raja Puri, Dwarka Road, New Delhi – 110059"], ["Support Hours", "Mon – Sun: 8:00 AM – 8:00 PM"],
        ["Customer help", "89-294-546-47"], ["Technician help", "89-290-290-04"],
        ["Shipping help", "89-290-290-05"], ["Account help", "89-290-290-06"],
        ["WhatsApp", "89-294-546-47"], ["Email", "Paanifilter9@gmail.com"],
        ["Website", "zavtoo.in"],
      ] } },
    ] },
  ],
};
