import { Link, useLocation } from "wouter";
import { ArrowRight, Box, Heart, House } from "lucide-react";
export default function Info() {
  const [location] = useLocation();
  const type = location.slice(1);
  const data: Record<
    string,
    {
      eyebrow: string;
      title: string;
      intro: string;
      sections: { title: string; text: string }[];
    }
  > = {
    about: {
      eyebrow: "THE HEARTH APPROACH",
      title: "A home is more than an address.",
      intro:
        "It’s the light in the morning. The room for what comes next. The feeling that you’ve found your place.",
      sections: [
        {
          title: "A more thoughtful way to discover.",
          text: "Hearth brings together homes for sale and rent in a simple, considered marketplace. Search by location, budget, size and bedrooms. Keep your favourites close, and connect directly with property owners.",
        },
        {
          title: "See it from a new perspective.",
          text: "Interactive virtual tours help you explore a space before you visit. Our sample tour is a conceptual 3D apartment, not a measured scan of our demo listings. Owners can upload their own GLB models or add a supported Matterport or Kuula tour.",
        },
        {
          title: "Your property, your story.",
          text: "Owners can create listings, upload photography, save drafts and publish when they’re ready. Your account gives you control over your properties and keeps buyer enquiries and publishing updates in an in-app inbox.",
        },
        {
          title: "An honest starting point.",
          text: "Our demo homes, generated photography and illustrative prices show what the platform can do. They are not real available properties. Owner-published listings are separate; always verify ownership, condition and availability before making a commitment.",
        },
      ],
    },
    help: {
      eyebrow: "A LITTLE GUIDANCE",
      title: "Let’s make it feel simple.",
      intro:
        "A few helpful answers for finding your place or sharing your property.",
      sections: [
        {
          title: "How do I create an account?",
          text: "Select Sign in or Create an account and continue through secure Manus authentication. Your first sign-in creates your Hearth account automatically. The same account gives you saved homes and owner listing tools.",
        },
        {
          title: "How do favourites work?",
          text: "Tap the heart on any property to add it to your saved homes. Sign in first so your shortlist is stored with your account and is available when you come back.",
        },
        {
          title: "How do I publish a property?",
          text: "Choose List a property, fill in the details, add at least one photo, and optionally upload a GLB model or add a Matterport/Kuula tour link. Save a draft or publish. Edit or remove your listings from My properties.",
        },
        {
          title: "How do enquiries work?",
          text: "Signed-in visitors can send enquiries on owner-published property pages. The owner receives the message in their Hearth inbox. This version uses in-app notifications, not customer email. Enquiries are disabled for demo homes.",
        },
        {
          title: "A tour won’t load. What should I do?",
          text: "Use a current WebGL-enabled browser, check your connection and try again. Owner-uploaded GLB models may take a little longer to load. Hosted tours depend on the provider allowing embedding; the tour viewer offers a link to open the original tour.",
        },
        {
          title: "Stay safe while searching.",
          text: "Verify property details and the owner’s identity independently. Never transfer deposits or share sensitive financial documents before confirming a property’s legitimacy. Hearth is a marketplace, not an escrow or verification service.",
        },
      ],
    },
    privacy: {
      eyebrow: "YOUR INFORMATION",
      title: "Privacy, in plain language.",
      intro:
        "This privacy notice describes the information used by this Hearth marketplace website.",
      sections: [
        {
          title: "Account information.",
          text: "We use the identity information returned by secure Manus authentication, including your name, email and account identifier, to create and protect your account. Passwords are not handled by Hearth.",
        },
        {
          title: "Marketplace activity.",
          text: "Your saved homes, owner listings, uploaded media and in-app notifications are stored in the project’s managed database and file storage. Enquiries include your message, account identity and any phone number you choose to share, and are visible to the relevant property owner.",
        },
        {
          title: "Listing visibility and uploaded files.",
          text: "Published property details and listing photography are public. Drafts and account inboxes require authentication. Removing a listing hides its database record from the marketplace; uploaded files may remain in durable storage. Do not upload confidential documents or private images.",
        },
        {
          title: "Sessions and service providers.",
          text: "Cookies and browser session storage support secure sign-in. The hosting platform provides infrastructure and analytics. Property location maps use a Google Maps proxy. Hosted virtual tours are supplied by their respective third-party providers and are subject to those providers’ policies.",
        },
        {
          title: "Your choices.",
          text: "You can remove favourites, edit or remove your listings, leave optional phone fields blank and sign out. This version does not include a self-service account-deletion or data-export screen. A public operator should add a verified privacy contact and appropriate retention policy before operating this service commercially.",
        },
      ],
    },
    terms: {
      eyebrow: "USING HEARTH",
      title: "A clear understanding.",
      intro:
        "These terms describe use of this marketplace implementation. Review property information independently before any real-world transaction.",
      sections: [
        {
          title: "A discovery platform, not an agent.",
          text: "Hearth lets visitors browse properties, save favourites and contact owners. It does not provide brokerage, valuations, financing, escrow, payment processing or a guarantee of any listing’s legitimacy.",
        },
        {
          title: "Demo collection.",
          text: "Sample homes, property images and prices are illustrative. The conceptual 3D apartment is not a measured scan of the demo listings. Demo properties cannot receive enquiries and should not be treated as available inventory.",
        },
        {
          title: "Your listings and media.",
          text: "Only publish property information that is accurate and that you are authorised to share. You are responsible for ensuring that you have rights to photographs, models and hosted tours. Do not include confidential information, discriminatory terms or misleading claims.",
        },
        {
          title: "Accounts and enquiries.",
          text: "Keep your authentication account secure. Be respectful in messages and avoid sharing sensitive personal or financial information. Enquiries and listing updates are delivered through the in-app account inbox in this version.",
        },
        {
          title: "Transactions happen independently.",
          text: "Visits, agreements and any payments take place outside Hearth. Verify ownership, availability, legal requirements, property condition and all agreement terms. Consult qualified local professionals when appropriate.",
        },
        {
          title: "Commercial launch preparation.",
          text: "This implementation is a functional marketplace foundation, not a substitute for jurisdiction-specific legal documentation. A public operator should provide a legal entity, verified support and privacy contacts, moderation processes and locally appropriate terms before commercial launch.",
        },
      ],
    },
  };
  const content = data[type] ?? data.about;
  return (
    <div className="info-page section">
      <div className="info-heading">
        <span className="eyebrow">{content.eyebrow}</span>
        <h1>{content.title}</h1>
        <p>{content.intro}</p>
      </div>
      <div className="info-content">
        {content.sections.map(s => (
          <section key={s.title}>
            <h2>{s.title}</h2>
            <p>{s.text}</p>
          </section>
        ))}
      </div>
      <div className="info-cta">
        <span>Room for a new perspective?</span>
        <Link href="/properties" className="button button-dark">
          Explore homes
          <ArrowRight size={16} />
        </Link>
      </div>
    </div>
  );
}
