import { useState } from "react";
import { useLocation } from "wouter";
import { MapPin, House, Banknote, Search, ArrowRight } from "lucide-react";

export default function SearchBar() {
  const [, navigate] = useLocation();
  const [kind, setKind] = useState("sale");
  const [location, setLocation] = useState("");
  const [type, setType] = useState("");
  const [price, setPrice] = useState("");
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = new URLSearchParams({ kind });
    if (location) q.set("location", location);
    if (type) q.set("type", type);
    if (price) q.set("maxPrice", price);
    navigate(`/properties?${q}`);
  };
  return (
    <div className="hero-search">
      <div className="search-tabs" role="group" aria-label="Listing status">
        <button
          onClick={() => {
            setKind("sale");
            setPrice("");
          }}
          className={kind === "sale" ? "selected" : ""}
        >
          Buy a home
        </button>
        <button
          onClick={() => {
            setKind("rent");
            setPrice("");
          }}
          className={kind === "rent" ? "selected" : ""}
        >
          Rent a home
        </button>
      </div>
      <form className="search-form" onSubmit={submit}>
        <label className="search-field search-location">
          <MapPin size={20} />
          <span>
            <strong>Location</strong>
            <input
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder="City, neighbourhood, or ZIP"
              aria-label="City, neighbourhood, or ZIP"
            />
          </span>
        </label>
        <label className="search-field">
          <House size={20} />
          <span>
            <strong>Property type</strong>
            <select
              value={type}
              onChange={e => setType(e.target.value)}
              aria-label="Property type"
            >
              <option value="">All property types</option>
              <option>Apartment</option>
              <option>House</option>
              <option>Loft</option>
            </select>
          </span>
        </label>
        <label className="search-field">
          <Banknote size={20} />
          <span>
            <strong>Price range</strong>
            <select
              value={price}
              onChange={e => setPrice(e.target.value)}
              aria-label="Maximum price"
            >
              <option value="">Any price</option>
              <option value={kind === "sale" ? "1500000" : "4500"}>
                {kind === "sale" ? "Up to $1.5 million" : "Up to $4,500 / mo"}
              </option>
              <option value={kind === "sale" ? "2000000" : "6000"}>
                {kind === "sale" ? "Up to $2 million" : "Up to $6,000 / mo"}
              </option>
              <option value={kind === "sale" ? "3000000" : "10000"}>
                {kind === "sale" ? "Up to $3 million" : "Up to $10,000 / mo"}
              </option>
            </select>
          </span>
        </label>
        <button className="button button-green search-submit" type="submit">
          <Search size={19} /> Find a home
          <ArrowRight size={16} />
        </button>
      </form>
    </div>
  );
}
