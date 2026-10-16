export const APP_NAME = 'Dart Smart Salon';

export const SITE_DESCRIPTION =
  'All-in-one salon management software for appointments, POS, inventory, payroll, and multi-branch operations — built for modern salons in Sri Lanka.';

export const CONTACT_EMAIL = 'info@dartcodes.com';
export const CONTACT_PHONE = '+94 77 455 2144';
export const CONTACT_PHONE_RAW = '+94774552144';
export const CONTACT_HOURS = 'Monday – Saturday, 8:30 AM – 6:00 PM';
export const COMPANY_NAME = 'DartCodes (Pvt) Ltd.';
export const COMPANY_ADDRESS = 'Level 4, Colombo 03, Sri Lanka';
export const WHATSAPP_NUMBER = '94774552144';
export const WHATSAPP_URL = 'https://wa.me/94774552144';

export const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/features', label: 'Product' },
  { href: '/solutions', label: 'Solutions' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/about', label: 'About' },
  { href: '/faq', label: 'FAQ' },
  { href: '/contact', label: 'Contact' },
] as const;

export const FEATURE_ITEMS = [
  {
    icon: 'Calendar',
    title: 'Smart Calendar & Bookings',
    description: 'Color-coded scheduling, zero double-booking, and automated SMS & WhatsApp reminders.',
    href: '/features#appointments',
  },
  {
    icon: 'CreditCard',
    title: 'Express POS & Fast Checkout',
    description: 'Sub-5s ticket checkout, split-tender payments, thermal printing, and WhatsApp digital bills.',
    href: '/features#pos',
  },
  {
    icon: 'Users',
    title: 'Client CRM & Formulas',
    description: 'Detailed client dossiers with color formulations, allergy warnings, and lifetime visit history.',
    href: '/features#customers',
  },
  {
    icon: 'Package',
    title: 'Inventory & Stock Alerts',
    description: 'Retail stock deductions, back-bar usage tracking, supplier ledgers, and low-inventory alerts.',
    href: '/features#inventory',
  },
  {
    icon: 'Scissors',
    title: 'Staff Rosters & Attendance',
    description: 'Role-based permissions, customizable shift rosters, and daily check-ins for stylists and receptionists.',
    href: '/features#staff',
  },
  {
    icon: 'Wallet',
    title: 'Commissions & Payroll',
    description: 'Automated tiered commission calculations for services and retail, salary advances, and payslips.',
    href: '/features#payroll',
  },
  {
    icon: 'Store',
    title: 'Multi-Branch Oversight',
    description: 'Unified command center to monitor sales, staff schedules, and inventory transfers across all branches.',
    href: '/features#branches',
  },
  {
    icon: 'BarChart3',
    title: 'Live Analytics & Reports',
    description: 'Real-time profit & loss, daily cash drawer balancing, best-selling services, and client retention KPIs.',
    href: '/features#reports',
  },
] as const;

export const FAQ_ITEMS = [
  {
    category: 'Getting Started',
    question: 'Can I try Dart Smart Salon before committing to a plan?',
    answer:
      'Yes! All plans include a 21-day full-access free trial. You can test appointment scheduling, POS checkout, staff commissions, and inventory with zero upfront payment and no credit card required.',
  },
  {
    category: 'Getting Started',
    question: 'How do I migrate from spreadsheets, paper books, or other software?',
    answer:
      'Our dedicated onboarding team helps you import your existing client list, service catalog, prices, and stock inventory. We also provide step-by-step video tutorials and guided staff training sessions.',
  },
  {
    category: 'Features & Hardware',
    question: 'What hardware do I need to run Dart Smart Salon?',
    answer:
      'Dart Smart Salon runs seamlessly on any standard desktop PC, laptop, iPad/Android tablet, or smartphone via any web browser. It connects directly with standard ESC/POS thermal receipt printers and barcode scanners.',
  },
  {
    category: 'Features & Hardware',
    question: 'Does the system send automated appointment reminders to clients?',
    answer:
      'Yes. Dart Smart Salon can automatically send booking confirmation and 24-hour reminder messages via WhatsApp and SMS, reducing client no-shows by up to 75%.',
  },
  {
    category: 'Multi-Branch',
    question: 'Does the platform support multiple branches and salon chains?',
    answer:
      'Absolutely. Our Gold and Enterprise tiers support multi-branch management. Salon owners can switch between locations with one click, compare branch revenues in real-time, and transfer inventory between salons.',
  },
  {
    category: 'Security & Billing',
    question: 'How secure is our salon and customer data?',
    answer:
      'Your salon data is isolated in a private, encrypted cloud database with automated daily backups. Access is protected by role-based permissions, ensuring stylists only view their schedules while financial figures remain admin-only.',
  },
  {
    category: 'Security & Billing',
    question: 'What payment methods are supported for subscriptions?',
    answer:
      'We process subscription payments securely via PayHere, supporting all major credit/debit cards (Visa, MasterCard, Amex) and local mobile banking solutions in Sri Lanka. Invoices and receipts are generated automatically.',
  },
  {
    category: 'Security & Billing',
    question: 'Can I cancel or upgrade my subscription plan anytime?',
    answer:
      'Yes, you have full flexibility. You can switch between Monthly and Yearly billing, upgrade from Basic to Gold as your salon expands, or cancel anytime with no lock-in contracts or penalty fees.',
  },
] as const;

export const TRUST_METRICS = [
  { value: '99.9%', label: 'Cloud Uptime SLA' },
  { value: '100+', label: 'Salons & Spas' },
  { value: '< 5s', label: 'Express Checkout Speed' },
  { value: '0', label: 'Booking Conflicts' },
] as const;

export const SALON_TYPES = [
  'Hair Salons & Studios',
  'Beauty & Aesthetic Clinics',
  'Nail Bars & Lounges',
  'Day Spas & Wellness',
  'Barbershops & Grooming',
  'Multi-Branch Salon Chains',
] as const;
