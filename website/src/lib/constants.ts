export const APP_NAME = 'Dart Smart Salon';

export const SITE_DESCRIPTION =
  'All-in-one salon management software for appointments, POS, inventory, payroll, and growth — built for modern salons in Sri Lanka.';

export const CONTACT_EMAIL = 'info@dartcodes.com';
export const CONTACT_PHONE = '+94 77 455 2144';
export const CONTACT_PHONE_RAW = '+94774552144';
export const CONTACT_HOURS = 'Mon – Fri, 8:30 AM – 5:30 PM';
export const COMPANY_NAME = 'DartCodes (Pvt) Ltd.';
export const WHATSAPP_NUMBER = '94774552144';
export const WHATSAPP_URL = 'https://wa.me/94774552144';

export const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/features', label: 'Product' },
  { href: '/solutions', label: 'Solutions' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/faq', label: 'Resources' },
] as const;


export const FEATURE_ITEMS = [
  {
    icon: 'Calendar',
    title: 'Appointments',
    description: 'Schedule, confirm, and manage bookings across staff and services.',
    href: '/features#appointments',
  },
  {
    icon: 'Users',
    title: 'Customer Management',
    description: 'Profiles, visit history, and relationships that keep clients coming back.',
    href: '/features#customers',
  },
  {
    icon: 'Scissors',
    title: 'Staff Management',
    description: 'Roles, permissions, and team visibility for salon admins and staff.',
    href: '/features#staff',
  },
  {
    icon: 'Package',
    title: 'Inventory',
    description: 'Stock levels, products, and supply tracking tied to your services.',
    href: '/features#inventory',
  },
  {
    icon: 'CreditCard',
    title: 'Point of Sale',
    description: 'Fast checkout, services, products, and receipts from one screen.',
    href: '/features#pos',
  },
  {
    icon: 'ChartNoAxesCombined',
    title: 'Payroll & Loans',
    description: 'Payroll runs, advances, and employee loan tracking in one place.',
    href: '/features#payroll',
  },
  {
    icon: 'Settings',
    title: 'Expenses',
    description: 'Track salon expenses and keep finances organized by branch.',
    href: '/features#expenses',
  },
  {
    icon: 'Bell',
    title: 'Reports & Analytics',
    description: 'Dashboards and reports for revenue, staff, and operations.',
    href: '/features#reports',
  },
] as const;

export const FAQ_ITEMS = [
  {
    question: 'Can I try Dart Smart Salon before paying?',
    answer:
      'Paid plans include a trial period where configured in your plan. Start signup from Pricing and complete PayHere checkout when you are ready.',
  },
  {
    question: 'Does the platform support multiple branches?',
    answer:
      'Multi-branch capabilities are available on higher-tier plans. Compare plans on the Pricing page or contact us for Custom arrangements.',
  },
  {
    question: 'Where is my data hosted?',
    answer:
      'Your salon data is securely hosted in its own isolated cloud environment with automatic daily backups and strict encryption.',
  },
  {
    question: 'How do I migrate from spreadsheets or another tool?',
    answer:
      'Contact our team with your current setup. We can guide onboarding, staff training, and a phased rollout.',
  },
] as const;
