import { useEffect, useState } from "react";
import { useLocation, useSearch } from "wouter";
import {
  Search,
  SlidersHorizontal,
  X,
  Box,
  MapPin,
  ArrowRight,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import PropertyCard from "@/components/PropertyCard";
import type { Property } from "@shared/properties";

type Filters = {
  kind: string;
  location: string;
  type: string;
  minPrice: string;
  maxPrice: string;
  minSize: string;
  maxSize: string;
  beds: string;
  toursOnly: boolean;
  sort: string;
};
const initial = (search: string): Filters => {
  const q = new URLSearchParams(search);
  return {
    kind: q.get("kind") ?? "",
    location: q.get("location") ?? "",
    type: q.get("type") ?? "",
    minPrice: q.get("minPrice") ?? "",
    maxPrice: q.get("maxPrice") ?? "",
    minSize: q.get("minSize") ?? "",
    maxSize: q.get("maxSize") ?? "",
    beds: q.get("beds") ?? "",
    toursOnly: q.get("toursOnly") === "true",
    sort: q.get("sort") ?? "recommended",
  };
};
export default function Discover() {
  const search = useSearch();
  const [, navigate] = useLocation();
  const [filters, setFilters] = useState(() => initial(search));
  const [advanced, setAdvanced] = useState(false);
  useEffect(() => {
    setFilters(initial(search));
  }, [search]);
  const submitted = initial(search);
  const validNumber = (value: string) =>
    value && Number.isFinite(Number(value))
      ? Math.max(0, Number(value))
      : undefined;
  const query = trpc.marketplace.list.useQuery({
    kind:
      submitted.kind === "sale" || submitted.kind === "rent"
        ? submitted.kind
        : undefined,
    location: submitted.location || undefined,
    type: ["Apartment", "House", "Loft"].includes(submitted.type)
      ? (submitted.type as "Apartment" | "House" | "Loft")
      : undefined,
    minPrice: validNumber(submitted.minPrice),
    maxPrice: validNumber(submitted.maxPrice),
    minSize: validNumber(submitted.minSize),
    maxSize: validNumber(submitted.maxSize),
    beds: validNumber(submitted.beds),
    toursOnly: submitted.toursOnly,
    sort: ["recommended", "price-asc", "price-desc", "newest"].includes(
      submitted.sort
    )
      ? (submitted.sort as
          | "recommended"
          | "price-asc"
          | "price-desc"
          | "newest")
      : "recommended",
  });
  const update = (key: keyof Filters, value: string | boolean) =>
    setFilters(old => ({ ...old, [key]: value }));
  const apply = (next = filters) => {
    const q = new URLSearchParams();
    Object.entries(next).forEach(([k, v]) => {
      if (v && v !== "recommended") q.set(k, String(v));
    });
    navigate(`/properties${q.size ? `?${q}` : ""}`);
  };
  const reset = () => {
    setFilters(initial(""));
    navigate("/properties");
  };
  return (
    <div className="browse-page section">
      <div className="browse-intro">
        <span className="eyebrow">MAKE ROOM FOR YOUR NEXT CHAPTER</span>
        <h1>
          {submitted.toursOnly
            ? "A new way to see your next home."
            : submitted.kind === "rent"
              ? "Find a place to make your own."
              : "Find somewhere that feels like you."}
        </h1>
        <p>
          {submitted.toursOnly
            ? "Go beyond the photos. Explore our homes in interactive 3D."
            : "Explore distinctive houses, apartments and lofts — thoughtfully brought together."}
        </p>
      </div>
      <form
        className="browse-search"
        onSubmit={e => {
          e.preventDefault();
          apply();
        }}
      >
        <label className="browse-location">
          <Search size={19} />
          <input
            value={filters.location}
            onChange={e => update("location", e.target.value)}
            placeholder="City, neighbourhood, or address"
            aria-label="Search location"
          />
        </label>
        <select
          value={filters.kind}
          onChange={e => update("kind", e.target.value)}
          aria-label="Sale or rent"
        >
          <option value="">Buy or rent</option>
          <option value="sale">For sale</option>
          <option value="rent">For rent</option>
        </select>
        <select
          value={filters.type}
          onChange={e => update("type", e.target.value)}
          aria-label="Property type"
        >
          <option value="">All property types</option>
          <option>Apartment</option>
          <option>House</option>
          <option>Loft</option>
        </select>
        <button
          type="button"
          className={`button button-light ${advanced ? "filter-selected" : ""}`}
          onClick={() => setAdvanced(!advanced)}
        >
          <SlidersHorizontal size={17} />
          Filters
        </button>
        <button className="button button-dark" type="submit">
          Search
          <ArrowRight size={16} />
        </button>
      </form>
      {advanced && (
        <div className="advanced-filters">
          <div className="filter-group">
            <strong>
              Price {filters.kind === "rent" ? "(USD / month)" : "(USD)"}
            </strong>
            <div className="range-inputs">
              <input
                aria-label="Minimum price"
                type="number"
                min="0"
                placeholder="Min price"
                value={filters.minPrice}
                onChange={e => update("minPrice", e.target.value)}
              />
              <span>—</span>
              <input
                aria-label="Maximum price"
                type="number"
                min="0"
                placeholder="Max price"
                value={filters.maxPrice}
                onChange={e => update("maxPrice", e.target.value)}
              />
            </div>
          </div>
          <div className="filter-group">
            <strong>Size (sq ft)</strong>
            <div className="range-inputs">
              <input
                aria-label="Minimum size"
                type="number"
                min="0"
                placeholder="Min size"
                value={filters.minSize}
                onChange={e => update("minSize", e.target.value)}
              />
              <span>—</span>
              <input
                aria-label="Maximum size"
                type="number"
                min="0"
                placeholder="Max size"
                value={filters.maxSize}
                onChange={e => update("maxSize", e.target.value)}
              />
            </div>
          </div>
          <div className="filter-group">
            <strong>Bedrooms</strong>
            <select
              aria-label="Minimum bedrooms"
              value={filters.beds}
              onChange={e => update("beds", e.target.value)}
            >
              <option value="">Any bedrooms</option>
              {[1, 2, 3, 4, 5].map(n => (
                <option key={n} value={n}>
                  {n}+ bedrooms
                </option>
              ))}
            </select>
          </div>
          <label className="tour-check">
            <input
              type="checkbox"
              checked={filters.toursOnly}
              onChange={e => update("toursOnly", e.target.checked)}
            />
            <Box size={17} /> 3D tours only
          </label>
          <div className="filter-actions">
            <button type="button" className="text-link" onClick={reset}>
              Reset filters
            </button>
            <button
              type="button"
              className="button button-green"
              onClick={() => apply()}
            >
              Apply filters
            </button>
          </div>
        </div>
      )}
      <div className="results-heading">
        <div>
          <strong>
            {query.isLoading
              ? "Finding your next home…"
              : `${query.data?.length ?? 0} homes to explore`}
          </strong>
          {search && (
            <button className="clear-filter" onClick={reset}>
              Clear filters
              <X size={13} />
            </button>
          )}
        </div>
        <label>
          Sort by
          <select
            value={submitted.sort}
            onChange={e => apply({ ...filters, sort: e.target.value })}
          >
            <option value="recommended">Recommended</option>
            <option value="price-asc">Price: low to high</option>
            <option value="price-desc">Price: high to low</option>
            <option value="newest">Newest listings</option>
          </select>
        </label>
      </div>
      {query.isLoading ? (
        <div className="property-grid">
          {[1, 2, 3].map(i => (
            <div key={i} className="card-skeleton" />
          ))}
        </div>
      ) : query.isError ? (
        <div className="empty-state">
          <h2>We couldn’t load the homes.</h2>
          <p>{query.error.message}</p>
          <button
            className="button button-dark"
            onClick={() => query.refetch()}
          >
            Try again
          </button>
        </div>
      ) : query.data?.length ? (
        <div className="property-grid browse-grid">
          {(query.data as Property[]).map((p, i) => (
            <PropertyCard key={p.id} property={p} index={i} />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-icon">
            <Search size={30} />
          </div>
          <h2>A little more room in your search?</h2>
          <p>
            We couldn’t find a home matching these filters. Try a wider price
            range or another neighbourhood.
          </p>
          <button className="button button-dark" onClick={reset}>
            Explore all homes
          </button>
        </div>
      )}
      <p className="demo-note">
        Demo homes are illustrative. Owner-published properties appear alongside
        our demo collection.
      </p>
    </div>
  );
}
