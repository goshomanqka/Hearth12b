import {
  getPublicProperties,
  getPublicProperty,
  filterAndSortProperties,
} from "./marketplace";
import { formatPrice, type Property } from "../shared/properties";

function escape(value: string) {
  return value.replace(
    /[&<>"']/g,
    c =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!
  );
}
const staticPages: Record<
  string,
  { title: string; description: string; heading: string; paragraphs: string[] }
> = {
  "/": {
    title: "Hearth — Discover beautiful homes for sale and rent",
    description:
      "Find a home that feels like you. Explore beautiful houses, apartments and lofts for sale or rent with interactive 3D tours on Hearth.",
    heading: "Find your place. Feel at home.",
    paragraphs: [
      "Discover exceptional spaces. Explore every corner. Find the home that feels like you.",
      "Browse houses, apartments and lofts for sale or rent. Search by location, price, size and bedrooms. Save your favourites and connect directly with property owners.",
      "Explore our interactive conceptual 3D apartment tour, or owner-supplied property models and hosted walkthroughs. Demo homes and prices are illustrative, not active real-world listings.",
    ],
  },
  "/properties": {
    title: "Explore homes for sale and rent — Hearth",
    description:
      "Discover your next home on Hearth. Browse houses, apartments and lofts with location, price, area and bedroom filters and interactive virtual tours.",
    heading: "Find somewhere that feels like you.",
    paragraphs: [
      "Explore distinctive houses, apartments and lofts — thoughtfully brought together.",
      "Search homes for sale or rent by location, price range, size and number of bedrooms. Open any property to view its details and available 3D tour.",
    ],
  },
  "/about": {
    title: "A more thoughtful property marketplace — Hearth",
    description:
      "Discover the Hearth approach to finding a home: considered property discovery, saved favourites, direct owner contact and interactive 3D virtual tours.",
    heading: "A home is more than an address.",
    paragraphs: [
      "It’s the light in the morning. The room for what comes next. The feeling that you’ve found your place.",
      "Hearth brings together homes for sale and rent in a simple, considered marketplace. Search by location, budget, size and bedrooms, save your favourites and connect directly with owners.",
      "Demo photography, homes and prices are illustrative. The sample 3D apartment is conceptual, not a measured scan. Owners can upload real listing photography and GLB models, or add supported hosted tours.",
    ],
  },
  "/help": {
    title: "Help with property discovery and owner listings — Hearth",
    description:
      "Learn how to create an account, save homes, publish owner listings, add 3D tours and receive in-app property enquiries on Hearth.",
    heading: "Let’s make it feel simple.",
    paragraphs: [
      "Sign in securely with Manus to create your Hearth account. Your first visit automatically creates an account.",
      "Save a home by tapping its heart. Publish your property by entering the details, uploading at least one photo and optionally adding a GLB model or supported Matterport or Kuula tour.",
      "Enquiries and publishing updates appear in your Hearth account inbox. Demo homes do not receive enquiries. Use a current WebGL-enabled browser for 3D tours and verify any property independently before making a commitment.",
    ],
  },
  "/privacy": {
    title: "Privacy and information handling — Hearth",
    description:
      "How Hearth uses account information, saved homes, property records, uploaded media and in-app enquiries in this marketplace implementation.",
    heading: "Privacy, in plain language.",
    paragraphs: [
      "Hearth uses the name, email and identifier returned by secure Manus authentication to protect your account. Passwords are not handled by Hearth.",
      "Saved homes, listings, uploads and enquiries use the project’s managed database and storage. Published listing details are public; account inboxes and drafts require authentication.",
      "Removing a property hides its listing, but uploaded media may remain in storage. Do not upload confidential material. Maps and hosted tours use their respective service providers. Commercial operators should provide a verified privacy contact and retention policy.",
    ],
  },
  "/terms": {
    title: "Marketplace terms and responsible use — Hearth",
    description:
      "Understand Hearth’s marketplace role, illustrative demo collection, owner responsibilities and the need to verify any property transaction independently.",
    heading: "A clear understanding.",
    paragraphs: [
      "Hearth is a property discovery platform, not a brokerage, escrow service or guarantee of any listing’s legitimacy.",
      "Demo homes and prices are illustrative. The sample tour is conceptual, not a measured property scan. Owners must have rights to list their property and share uploaded photography and models.",
      "Visits, agreements and payments happen outside Hearth. Verify ownership, availability, condition and legal requirements independently. Commercial operators should add jurisdiction-specific legal documentation and support contacts before public launch.",
    ],
  },
};

function cards(properties: Property[]) {
  return properties
    .map(
      p =>
        `<article><a href="/property/${p.id}"><img src="${escape(p.images[0] ?? "")}" alt="${escape(p.title)}" width="320" height="210"/><h2>${escape(p.title)}</h2></a><p>${escape(p.location)} · ${escape(formatPrice(p.price, p.kind))}</p><p>${p.beds} bedrooms · ${p.baths} bathrooms · ${p.size} sq ft · ${escape(p.type)}</p>${p.isDemo ? "<small>Illustrative demo listing</small>" : ""}</article>`
    )
    .join("");
}

export async function renderPublicPage(
  template: string,
  requestUrl: string
): Promise<{ html: string; status: number }> {
  const url = new URL(requestUrl, "http://route.invalid");
  const pathname = url.pathname;
  let title = "Your account — Hearth";
  let description =
    "Secure account access for your saved homes and owner listings.";
  let heading = "Your Hearth";
  let body =
    "<p>Sign in to manage your properties, view your saved homes and open your private inbox.</p>";
  let status = 200;
  let image = "";
  const privatePage =
    ["/account", "/saved", "/publish"].includes(pathname) ||
    /^\/publish\/[1-9]\d*$/.test(pathname);
  const detailMatch = pathname.match(/^\/property\/(\d+)$/);
  if (detailMatch) {
    const property = await getPublicProperty(Number(detailMatch[1]));
    if (!property) {
      status = 404;
      title = "Home not found — Hearth";
      heading = "This home couldn’t be found.";
      description =
        "The property is unavailable or no longer listed on Hearth.";
      body =
        '<p>Try exploring the collection for another home.</p><a href="/properties">Explore homes</a>';
    } else {
      title = `${property.title} — ${property.location} | Hearth`;
      description = `${property.type} for ${property.kind === "sale" ? "sale" : "rent"} in ${property.location}. ${property.beds} bedrooms, ${property.baths} bathrooms, ${property.size} sq ft. ${formatPrice(property.price, property.kind)}.`;
      heading = property.title;
      image = property.images[0] ?? "";
      body = `<img src="${escape(image)}" alt="${escape(property.title)}" width="900"/><p>${escape(property.address)}, ${escape(property.location)}</p><p>${escape(formatPrice(property.price, property.kind))} · ${property.beds} bedrooms · ${property.baths} bathrooms · ${property.size} sq ft</p><h2>A little about this home.</h2><p>${escape(property.description)}</p><h2>Amenities</h2><ul>${property.amenities.map(a => `<li>${escape(a)}</li>`).join("")}</ul>${property.tourKind !== "none" ? `<h2>Interactive virtual walkthrough</h2><p>${property.tourKind === "demo" ? "Conceptual 3D apartment tour — not a measured scan of this listing." : "Owner-supplied property walkthrough available with JavaScript enabled."}</p>` : ""}`;
    }
  } else if (staticPages[pathname]) {
    const page = staticPages[pathname];
    ({ title, description, heading } = page);
    body = page.paragraphs.map(p => `<p>${escape(p)}</p>`).join("");
    if (pathname === "/" || pathname === "/properties") {
      const all = await getPublicProperties();
      const number = (key: string) => {
        const n = url.searchParams.get(key);
        return n && Number.isFinite(Number(n))
          ? Math.max(0, Number(n))
          : undefined;
      };
      const kind = url.searchParams.get("kind");
      const type = url.searchParams.get("type");
      const filtered =
        pathname === "/"
          ? all.slice(0, 3)
          : filterAndSortProperties(all, {
              kind: kind === "sale" || kind === "rent" ? kind : undefined,
              type:
                type === "House" || type === "Apartment" || type === "Loft"
                  ? type
                  : undefined,
              location: url.searchParams.get("location") ?? undefined,
              minPrice: number("minPrice"),
              maxPrice: number("maxPrice"),
              minSize: number("minSize"),
              maxSize: number("maxSize"),
              beds: number("beds"),
              toursOnly: url.searchParams.get("toursOnly") === "true",
            });
      body += `<h2>${pathname === "/" ? "A few places to fall for." : `${filtered.length} homes to explore`}</h2><div>${cards(filtered)}</div>`;
    }
  } else if (!privatePage) {
    status = 404;
    title = "Page not found — Hearth";
    heading = "A little off the beaten path.";
    description = "This page could not be found.";
    body =
      '<p>Find your way back to the homes.</p><a href="/properties">Explore homes</a>';
  }
  const origin = process.env.PUBLIC_SITE_URL;
  let absolute = "";
  try {
    if (origin && new URL(origin).protocol === "https:")
      absolute = new URL(pathname, origin).toString();
  } catch {}
  const extra = `<meta name="twitter:title" content="${escape(title)}"/><meta name="twitter:description" content="${escape(description)}"/>${privatePage || status === 404 ? '<meta name="robots" content="noindex, nofollow"/>' : ""}${absolute ? `<link rel="canonical" href="${escape(absolute)}"/><meta property="og:url" content="${escape(absolute)}"/>` : ""}${absolute && image ? `<meta property="og:image" content="${escape(new URL(image, absolute).toString())}"/><meta name="twitter:image" content="${escape(new URL(image, absolute).toString())}"/>` : ""}`;
  const content = `<div id="root"><div style="max-width:1100px;margin:40px auto;padding:24px;font-family:Georgia,serif"><nav><a href="/">Hearth</a> · <a href="/properties?kind=sale">Buy a home</a> · <a href="/properties?kind=rent">Rent a home</a> · <a href="/about">Why Hearth</a></nav><main><h1>${escape(heading)}</h1>${body}</main></div></div>`;
  const html = template
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${escape(title)}</title>`)
    .replace(
      /<meta name="description" content="[^"]*"\s*\/>/,
      `<meta name="description" content="${escape(description)}"/>`
    )
    .replace(
      /<meta property="og:title" content="[^"]*"\s*\/>/,
      `<meta property="og:title" content="${escape(title)}"/>`
    )
    .replace(
      /<meta property="og:description" content="[^"]*"\s*\/>/,
      `<meta property="og:description" content="${escape(description)}"/>`
    )
    .replace("</head>", `${extra}</head>`)
    .replace('<div id="root"></div>', content);
  return { html, status };
}
