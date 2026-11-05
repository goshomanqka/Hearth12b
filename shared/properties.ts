export type Property = {
  id: number;
  ownerId: number | null;
  title: string;
  location: string;
  address: string;
  city: string;
  price: number;
  kind: "sale" | "rent";
  type: "Apartment" | "House" | "Loft";
  beds: number;
  baths: number;
  size: number;
  description: string;
  images: string[];
  amenities: string[];
  tourKind: "demo" | "model" | "embed" | "none";
  tourUrl: string | null;
  status: "draft" | "published" | "removed";
  featured: boolean;
  isDemo: boolean;
  latitude: number | null;
  longitude: number | null;
  createdAt: Date;
};

export const imagery = {
  hero: "/manus-storage/async-images/JBb2MrnlCoORlRFsWHg1kx/image-1.webp",
  apartment: "/manus-storage/async-images/JBb2MrnlCoORlRFsWHg1kx/image-2.webp",
  villa: "/manus-storage/async-images/JBb2MrnlCoORlRFsWHg1kx/image-3.webp",
  loft: "/manus-storage/async-images/JBb2MrnlCoORlRFsWHg1kx/image-4.webp",
};

const base = {
  ownerId: null,
  status: "published" as const,
  featured: true,
  isDemo: true,
  amenities: [
    "Air conditioning",
    "Natural light",
    "Modern kitchen",
    "Private outdoor space",
  ],
  tourKind: "demo" as const,
  tourUrl: null,
  createdAt: new Date("2026-11-01T12:00:00Z"),
};
export const seedProperties: Property[] = [
  {
    ...base,
    id: 1,
    title: "The West Village Residence",
    location: "West Village, New York",
    address: "120 Greenwich Avenue",
    city: "New York",
    price: 1250000,
    kind: "sale",
    type: "Apartment",
    beds: 2,
    baths: 2,
    size: 1450,
    images: [imagery.apartment],
    latitude: 40.7354,
    longitude: -74.0026,
    description:
      "An understated city sanctuary, thoughtfully designed around light, texture and everyday comfort. Generous windows bring the neighbourhood indoors, while a beautifully appointed open-plan kitchen connects to a relaxed living space. Oak floors, natural stone and carefully considered finishes lend every room an effortless sense of warmth. This is an illustrative demo property, not an active real-world listing.",
  },
  {
    ...base,
    id: 2,
    title: "Oakwood Hills Villa",
    location: "Beverly Hills, Los Angeles",
    address: "42 Oakwood Drive",
    city: "Los Angeles",
    price: 2850000,
    kind: "sale",
    type: "House",
    beds: 4,
    baths: 3,
    size: 3200,
    images: [imagery.villa],
    latitude: 34.0736,
    longitude: -118.4004,
    description:
      "Sculptural architecture meets a quieter way of living. This hillside home offers expansive indoor-outdoor spaces, a sunlit terrace and a secluded pool framed by mature landscaping. Four generous bedrooms and flexible entertaining spaces make room for every chapter of life. This is an illustrative demo property, not an active real-world listing.",
  },
  {
    ...base,
    id: 3,
    title: "The Brooklyn Loft",
    location: "Williamsburg, Brooklyn",
    address: "85 Wythe Avenue",
    city: "New York",
    price: 4200,
    kind: "rent",
    type: "Loft",
    beds: 2,
    baths: 2,
    size: 1280,
    images: [imagery.loft],
    latitude: 40.7213,
    longitude: -73.958,
    description:
      "A character-filled loft with a contemporary point of view. Oversized windows, warm oak floors and a flexible open plan create an inviting place to recharge. Independent cafés, waterfront walks and neighbourhood favourites are just beyond the door. This is an illustrative demo property, not an active real-world listing.",
  },
  {
    ...base,
    featured: false,
    id: 4,
    title: "A Sunlit Chelsea Apartment",
    location: "Chelsea, New York",
    address: "210 West 22nd Street",
    city: "New York",
    price: 5600,
    kind: "rent",
    type: "Apartment",
    beds: 3,
    baths: 2,
    size: 1650,
    images: [imagery.apartment],
    latitude: 40.7448,
    longitude: -73.9965,
    description:
      "A light-filled three-bedroom apartment with generous living spaces, elegant finishes and a practical modern kitchen. A calm retreat in one of the city's most vibrant neighbourhoods. This is an illustrative demo property, not an active real-world listing.",
  },
  {
    ...base,
    featured: false,
    id: 5,
    title: "Silver Lake Garden House",
    location: "Silver Lake, Los Angeles",
    address: "35 Silver Ridge Avenue",
    city: "Los Angeles",
    price: 1650000,
    kind: "sale",
    type: "House",
    beds: 3,
    baths: 2,
    size: 2400,
    images: [imagery.villa],
    latitude: 34.0869,
    longitude: -118.2702,
    description:
      "A thoughtfully designed family home with a secluded garden and natural materials throughout. Relaxed living spaces flow onto an outdoor terrace, inviting slow mornings and memorable evenings. This is an illustrative demo property, not an active real-world listing.",
  },
  {
    ...base,
    featured: false,
    id: 6,
    title: "The SoHo Atelier",
    location: "SoHo, New York",
    address: "68 Spring Street",
    city: "New York",
    price: 1890000,
    kind: "sale",
    type: "Loft",
    beds: 2,
    baths: 2,
    size: 1900,
    images: [imagery.loft],
    latitude: 40.7233,
    longitude: -73.9987,
    description:
      "An expressive city loft made for living and creating. Characterful architecture, expansive windows and tactile natural finishes bring a timeless quality to this adaptable home. This is an illustrative demo property, not an active real-world listing.",
  },
];

export function formatPrice(price: number, kind: "sale" | "rent") {
  return (
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(price) + (kind === "rent" ? " / mo" : "")
  );
}
