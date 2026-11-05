import { Link } from "wouter";
import {
  Heart,
  BedDouble,
  Bath,
  Expand,
  MapPin,
  Box,
  ArrowUpRight,
} from "lucide-react";
import { formatPrice, type Property } from "@shared/properties";
import { useMarketplace } from "@/contexts/MarketplaceContext";

export default function PropertyCard({
  property,
  index = 0,
}: {
  property: Property;
  index?: number;
}) {
  const { savedIds, toggleSaved, openTour } = useMarketplace();
  const isSaved = savedIds.includes(property.id);
  const hasTour = property.tourKind !== "none";
  return (
    <article
      className="property-card"
      style={{ animationDelay: `${index * 70}ms` }}
    >
      <div className="property-image-wrap">
        <Link href={`/property/${property.id}`} className="property-image-link">
          <img
            className="property-image"
            src={property.images[0]}
            alt={`${property.title} — ${property.type.toLowerCase()} in ${property.location}`}
            loading="lazy"
          />
        </Link>
        <span className="listing-badge">
          FOR {property.kind === "sale" ? "SALE" : "RENT"}
        </span>
        <button
          className={`favorite-button ${isSaved ? "is-saved" : ""}`}
          aria-label={`${isSaved ? "Unsave" : "Save"} ${property.title}`}
          aria-pressed={isSaved}
          onClick={() => toggleSaved(property.id)}
        >
          <Heart size={18} fill={isSaved ? "currentColor" : "none"} />
        </button>
        {hasTour && (
          <button
            className="card-tour-badge"
            onClick={() => openTour(property)}
          >
            <Box size={15} /> 3D virtual tour
            <ArrowUpRight size={13} />
          </button>
        )}
      </div>
      <div className="property-card-body">
        <div className="property-price-row">
          <strong>{formatPrice(property.price, property.kind)}</strong>
          <span>{property.type}</span>
        </div>
        <h3>
          <Link href={`/property/${property.id}`}>{property.title}</Link>
        </h3>
        <p className="property-location">
          <MapPin size={14} />
          {property.location}
        </p>
        <div className="property-facts">
          <span>
            <BedDouble size={17} />
            {property.beds} beds
          </span>
          <span>
            <Bath size={17} />
            {property.baths} baths
          </span>
          <span>
            <Expand size={16} />
            {property.size.toLocaleString()} sq ft
          </span>
        </div>
      </div>
    </article>
  );
}
