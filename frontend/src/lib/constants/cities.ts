export const SRI_LANKAN_CITIES = [
  'Colombo',
  'Kandy',
  'Galle',
  'Gampaha',
  'Negombo',
  'Kurunegala',
  'Matara',
  'Jaffna',
  'Kalutara',
  'Anuradhapura',
  'Ratnapura',
  'Badulla',
  'Batticaloa',
  'Nuwara Eliya',
  'Trincomalee',
  'Hambantota',
  'Matale',
  'Puttalam',
  'Kegalle',
  'Polonnaruwa',
  'Vavuniya',
  'Ampara',
  'Monaragala',
  'Mannar',
  'Kilinochchi',
  'Mullaitivu',
  'Dehiwala-Mount Lavinia',
  'Moratuwa',
  'Sri Jayawardenepura Kotte',
  'Maharagama',
  'Kesbewa',
  'Katunayake',
  'Wattala',
  'Kelaniya',
  'Panadura',
  'Beruwala',
  'Bentota',
  'Hikkaduwa',
  'Mirissa',
  'Tangalle',
  'Ella',
  'Bandarawela',
  'Dambulla',
  'Sigiriya',
  'Hatton',
  'Avissawella',
  'Chilaw',
  'Ja-Ela',
  'Horana',
  'Homagama',
  'Malabe',
  'Nugegoda',
  'Battaramulla',
  'Pannipitiya',
  'Kottawa',
  'Piliyandala',
  'Rajagiriya',
  'Nawalapitiya',
  'Weligama',
] as const;

export type SriLankanCity = (typeof SRI_LANKAN_CITIES)[number];

export function findMatchingCity(query: string): string | null {
  if (!query) return null;
  const normalized = query.trim().toLowerCase();
  const directMatch = SRI_LANKAN_CITIES.find(
    (c) => c.toLowerCase() === normalized
  );
  if (directMatch) return directMatch;

  const partialMatch = SRI_LANKAN_CITIES.find(
    (c) =>
      normalized.includes(c.toLowerCase()) ||
      c.toLowerCase().includes(normalized)
  );
  return partialMatch || null;
}
