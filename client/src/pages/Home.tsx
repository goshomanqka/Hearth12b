import { Link } from "wouter";
import {
  ArrowRight,
  ArrowUpRight,
  Box,
  Check,
  Play,
  ShieldCheck,
  Sparkles,
  Scan,
  Compass,
  Plus,
  ChevronRight,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { imagery, seedProperties, type Property } from "@shared/properties";
import SearchBar from "@/components/SearchBar";
import PropertyCard from "@/components/PropertyCard";
import { useMarketplace } from "@/contexts/MarketplaceContext";

export default function Home() {
  const { openTour } = useMarketplace();
  const query = trpc.marketplace.list.useQuery(
    { sort: "recommended" },
    {
      placeholderData: seedProperties.map(property => ({
        ...property,
        ownerId: null,
      })),
    }
  );
  const properties = (query.data ?? []).slice(0, 3) as Property[];
  return (
    <>
      <section className="hero">
        <img
          className="hero-image"
          src={imagery.hero}
          alt="A contemporary stone villa opening onto a peaceful pool and garden"
          fetchPriority="high"
        />
        <div className="hero-shade" />
        <div className="hero-content">
          <div className="hero-eyebrow">
            <span />A BETTER WAY HOME
          </div>
          <h1>
            Find your place.
            <br />
            Feel at <em>home.</em>
          </h1>
          <p>
            Discover exceptional spaces. Explore every corner.
            <br />
            Find the home that feels like you.
          </p>
          <Link href="/properties?toursOnly=true" className="hero-tour-link">
            <span className="small-play">
              <Play size={12} fill="currentColor" />
            </span>
            Step inside with 3D virtual tours
            <ArrowUpRight size={15} />
          </Link>
        </div>
        <div className="hero-caption">
          <span className="hero-caption-dot" />
          Beautiful homes. A new perspective.
        </div>
        <div className="hero-search-position">
          <SearchBar />
        </div>
      </section>
      <div className="trust-strip">
        <span>
          <ShieldCheck size={17} /> A considered collection of homes
        </span>
        <span>
          <Box size={17} /> Explore in 3D, from anywhere
        </span>
        <span>
          <Check size={17} /> Connect directly with owners
        </span>
      </div>
      <section className="section featured-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">SPACES WORTH DISCOVERING</span>
            <h2>A few places to fall for.</h2>
            <p>Thoughtfully selected homes, ready for your next chapter.</p>
          </div>
          <Link href="/properties" className="text-link">
            Explore all properties <ArrowRight size={18} />
          </Link>
        </div>
        {query.isError && (
          <div className="inline-alert">
            Live listings could not be loaded. Showing demo homes.{" "}
            <button onClick={() => query.refetch()}>Retry</button>
          </div>
        )}
        <div className="property-grid">
          {properties.map((p, i) => (
            <PropertyCard key={p.id} property={p} index={i} />
          ))}
        </div>
        <p className="demo-note">
          Explore our curated demo collection. Sample homes and prices are
          illustrative, not live listings.
        </p>
      </section>
      <section className="tour-feature section">
        <div className="tour-feature-visual">
          <img
            src={imagery.apartment}
            alt="A calm, light-filled apartment living space"
            loading="lazy"
          />
          <div className="tour-visual-shade" />
          <div className="tour-floating-label">
            <span className="pulse-dot" />
            <Box size={15} /> THE HEARTH 3D EXPERIENCE
          </div>
          <button
            className="tour-play-button"
            aria-label="Explore the conceptual 3D property tour"
            onClick={() => openTour(seedProperties[0])}
          >
            <Play size={26} fill="currentColor" />
          </button>
          <div className="tour-visual-bottom">
            <span>
              <Box size={16} /> Living room
            </span>
            <span>
              360°
              <Scan size={18} />
            </span>
          </div>
        </div>
        <div className="tour-feature-copy">
          <span className="eyebrow">
            <span className="tiny-square" /> YOUR NEXT HOME, FROM EVERY ANGLE
          </span>
          <h2>
            Don’t just see it.
            <br />
            <em>Step inside.</em>
          </h2>
          <p>
            Get a real feel for a space, without leaving yours. Our interactive
            3D walkthroughs let you explore room by room, at your own pace.
          </p>
          <div className="tour-benefits">
            <span>
              <Compass size={19} /> Move through every room
            </span>
            <span>
              <ExpandIcon /> Get a sense of the space
            </span>
            <span>
              <Check size={19} /> Visit with more confidence
            </span>
          </div>
          <button
            className="button button-dark"
            onClick={() => openTour(seedProperties[0])}
          >
            Experience a 3D tour <ArrowUpRight size={17} />
          </button>
          <small>Try our interactive conceptual apartment tour.</small>
        </div>
      </section>
      <section className="owner-strip section">
        <div className="owner-strip-icon">
          <HouseMark />
        </div>
        <div>
          <span className="eyebrow">FOR THE NEXT CHAPTER</span>
          <h2>Your property. Someone’s perfect place.</h2>
          <p>Share your home with people who will love it as much as you do.</p>
        </div>
        <Link href="/publish" className="button button-light">
          List your property
          <ArrowUpRight size={17} />
        </Link>
      </section>
    </>
  );
}
function ExpandIcon() {
  return <Scan size={19} />;
}
function HouseMark() {
  return (
    <svg width="50" height="54" viewBox="0 0 50 54" fill="none">
      <path
        d="M6 25 25 8l19 17v23H6V25Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path d="M18 48V30h14v18" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
