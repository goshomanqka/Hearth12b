import { useEffect, useState } from "react";
import { Link, useParams } from "wouter";
import {
  ArrowLeft,
  ArrowRight,
  Heart,
  Share2,
  Box,
  BedDouble,
  Bath,
  Expand,
  MapPin,
  Check,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  X,
  MessageCircle,
  Play,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { formatPrice, type Property as PropertyType } from "@shared/properties";
import { useMarketplace } from "@/contexts/MarketplaceContext";
import NotFound from "./NotFound";

export default function Property() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const query = trpc.marketplace.detail.useQuery(
    { id },
    { enabled: Number.isInteger(id) && id > 0, retry: false }
  );
  const { user, signIn, savedIds, toggleSaved, openTour } = useMarketplace();
  const [photo, setPhoto] = useState(0);
  const [gallery, setGallery] = useState(false);
  const [message, setMessage] = useState("");
  const [phone, setPhone] = useState("");
  const [sent, setSent] = useState(false);
  const [mapError, setMapError] = useState(false);
  useEffect(() => {
    setPhoto(0);
    setGallery(false);
    setMessage("");
    setPhone("");
    setSent(false);
    setMapError(false);
  }, [id]);
  const enquire = trpc.marketplace.enquire.useMutation({
    onSuccess: () => {
      setSent(true);
      toast.success("Your enquiry is in the owner’s inbox");
    },
    onError: e => toast.error(e.message),
  });
  if (
    !Number.isInteger(id) ||
    id < 1 ||
    query.error?.data?.code === "NOT_FOUND"
  )
    return <NotFound />;
  if (query.isLoading)
    return <div className="section loading-state">Finding your home…</div>;
  if (query.isError)
    return (
      <div className="section empty-state">
        <h2>This home couldn’t be loaded.</h2>
        <p>{query.error.message}</p>
        <button className="button button-dark" onClick={() => query.refetch()}>
          Try again
        </button>
      </div>
    );
  if (!query.data) return <NotFound />;
  const p = query.data as PropertyType;
  const hasTour = p.tourKind !== "none";
  const mapUrl = mapError ? null : `/api/property-map/${p.id}`;
  const share = async () => {
    try {
      if (navigator.share)
        await navigator.share({ title: p.title, url: window.location.href });
      else {
        await navigator.clipboard.writeText(window.location.href);
        toast.success("Property link copied");
      }
    } catch (e) {
      if (!(e instanceof DOMException && e.name === "AbortError"))
        toast.error("Could not share this property");
    }
  };
  return (
    <div className="detail-page section">
      <div className="detail-topbar">
        <Link href="/properties" className="text-link">
          <ArrowLeft size={16} /> Back to homes
        </Link>
        <div>
          <button className="text-link" onClick={share}>
            <Share2 size={16} />
            Share
          </button>
          <button className="text-link" onClick={() => toggleSaved(p.id)}>
            <Heart
              size={16}
              fill={savedIds.includes(p.id) ? "currentColor" : "none"}
            />
            {savedIds.includes(p.id) ? "Saved" : "Save"}
          </button>
        </div>
      </div>
      <div className="detail-heading">
        <div>
          <span className="eyebrow">
            {p.type.toUpperCase()} · FOR {p.kind === "sale" ? "SALE" : "RENT"}
            {p.isDemo ? " · DEMO HOME" : ""}
          </span>
          <h1>{p.title}</h1>
          <p>
            <MapPin size={16} />
            {p.address}, {p.location}
          </p>
        </div>
        <div className="detail-price">
          <strong>{formatPrice(p.price, p.kind)}</strong>
          <span>{p.kind === "sale" ? "Asking price" : "Monthly rent"}</span>
        </div>
      </div>
      <div className="detail-hero">
        <img src={p.images[photo]} alt={`${p.title} — photo ${photo + 1}`} />
        {p.images.length > 1 && (
          <>
            <button
              className="gallery-arrow gallery-prev"
              aria-label="Previous photograph"
              onClick={() =>
                setPhoto((photo - 1 + p.images.length) % p.images.length)
              }
            >
              <ChevronLeft />
            </button>
            <button
              className="gallery-arrow gallery-next"
              aria-label="Next photograph"
              onClick={() => setPhoto((photo + 1) % p.images.length)}
            >
              <ChevronRight />
            </button>
          </>
        )}
        <div className="detail-hero-buttons">
          <button
            className="button button-light"
            onClick={() => setGallery(true)}
          >
            <Expand size={17} />
            View{" "}
            {p.images.length === 1 ? "photo" : `all ${p.images.length} photos`}
          </button>
          {hasTour && (
            <button className="button button-green" onClick={() => openTour(p)}>
              <Box size={17} />
              Step inside in 3D
            </button>
          )}
        </div>
      </div>
      <div className="detail-columns">
        <div className="detail-main">
          <div className="detail-facts">
            <span>
              <BedDouble size={22} />
              <strong>{p.beds}</strong> bedrooms
            </span>
            <span>
              <Bath size={22} />
              <strong>{p.baths}</strong> bathrooms
            </span>
            <span>
              <Expand size={21} />
              <strong>{p.size.toLocaleString()}</strong> sq ft
            </span>
            <span>
              <HouseIcon />
              <strong>{p.type}</strong>
            </span>
          </div>
          {hasTour && (
            <section className="detail-tour-banner">
              <div className="detail-tour-icon">
                <Box size={27} />
              </div>
              <div>
                <span className="eyebrow">SEE IT FROM EVERY ANGLE</span>
                <h3>Get a feel for your next home.</h3>
                <p>
                  {p.tourKind === "demo"
                    ? "Explore an interactive conceptual apartment. This is not a measured scan of this listing."
                    : "Explore this home at your own pace with its owner-supplied virtual walkthrough."}
                </p>
              </div>
              <button
                className="button button-dark"
                onClick={() => openTour(p)}
              >
                Explore tour
                <ArrowUpRightIcon />
              </button>
            </section>
          )}
          <section className="detail-section">
            <h2>A little about this home.</h2>
            <p>{p.description}</p>
          </section>
          <section className="detail-section">
            <h2>The details that make a difference.</h2>
            <div className="amenities">
              {p.amenities.map(a => (
                <span key={a}>
                  <Check size={17} />
                  {a}
                </span>
              ))}
            </div>
          </section>
          <section className="detail-section">
            <h2>A neighbourhood to call yours.</h2>
            <p>
              {p.isDemo
                ? "Approximate neighbourhood location for this demo home."
                : `${p.address}, ${p.location}`}
            </p>
            {mapUrl ? (
              <img
                className="location-map"
                src={mapUrl}
                alt={`Map of ${p.location}`}
                loading="lazy"
                onError={() => setMapError(true)}
              />
            ) : (
              <div className="map-fallback">
                <MapPin size={24} />
                <p>{p.location}</p>
              </div>
            )}
            <a
              className="text-link map-external"
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.isDemo ? p.location : `${p.address}, ${p.location}`)}`}
              target="_blank"
              rel="noreferrer"
            >
              Explore the neighbourhood on Google Maps
              <ArrowUpRightIcon />
            </a>
          </section>
        </div>
        <aside className="contact-card">
          <span className="eyebrow">START A CONVERSATION</span>
          <h3>Imagine yourself here?</h3>
          <p>
            {p.isDemo
              ? "This demo home helps you explore the Hearth experience. Enquiries aren’t sent for sample listings."
              : "Ask a question or arrange a visit. The owner will receive your message in their Hearth inbox."}
          </p>
          <div className="contact-person">
            <div className="avatar">{p.isDemo ? "H" : "O"}</div>
            <div>
              <strong>
                {p.isDemo ? "Hearth demo collection" : "Property owner"}
              </strong>
              <span>
                {p.isDemo ? "Illustrative listing" : "Direct owner listing"}
              </span>
            </div>
            <ShieldCheck size={20} />
          </div>
          {sent ? (
            <div className="enquiry-success">
              <Check size={28} />
              <h4>Message delivered.</h4>
              <p>
                Your enquiry is saved in your account. The owner can contact you
                using your account email{phone ? ` or ${phone}` : ""}.
              </p>
              <Link href="/account?tab=notifications" className="text-link">
                View your account
                <ArrowRight size={15} />
              </Link>
            </div>
          ) : (
            <form
              onSubmit={e => {
                e.preventDefault();
                if (!user) {
                  signIn();
                  return;
                }
                enquire.mutate({ propertyId: p.id, message, phone });
              }}
            >
              <label>
                Your message
                <textarea
                  disabled={p.isDemo}
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  required
                  minLength={10}
                  maxLength={2000}
                  placeholder={
                    p.isDemo
                      ? "Messages are disabled for demo homes."
                      : "Hi, I’m interested in this home. When would be a good time to visit?"
                  }
                />
              </label>
              <label>
                Phone number <span>(optional)</span>
                <input
                  disabled={p.isDemo}
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  maxLength={40}
                  placeholder="How can the owner reach you?"
                />
              </label>
              <button
                className="button button-dark full-width"
                disabled={p.isDemo || enquire.isPending}
                type="submit"
              >
                <MessageCircle size={17} />
                {enquire.isPending
                  ? "Sending…"
                  : user
                    ? "Send enquiry"
                    : "Sign in to enquire"}
              </button>
              {!p.isDemo && (
                <small className="enquiry-disclosure">
                  Your name, account email, message and any optional phone
                  number are shared with this property’s owner.
                </small>
              )}
            </form>
          )}
          <div className="contact-safe">
            <ShieldCheck size={15} />
            Never transfer money before verifying a property.
          </div>
        </aside>
      </div>
      {gallery && (
        <div
          className="modal-backdrop gallery-modal"
          role="dialog"
          aria-modal="true"
          aria-label="Property photographs"
          onClick={() => setGallery(false)}
        >
          <button
            className="icon-button gallery-close"
            aria-label="Close gallery"
            onClick={() => setGallery(false)}
          >
            <X />
          </button>
          <div
            className="gallery-modal-content"
            onClick={e => e.stopPropagation()}
          >
            <img src={p.images[photo]} alt={`${p.title} photo ${photo + 1}`} />
            <div className="gallery-modal-controls">
              <button
                className="icon-button"
                disabled={p.images.length < 2}
                onClick={() =>
                  setPhoto((photo - 1 + p.images.length) % p.images.length)
                }
                aria-label="Previous photo"
              >
                <ChevronLeft />
              </button>
              <span>
                {photo + 1} / {p.images.length}
              </span>
              <button
                className="icon-button"
                disabled={p.images.length < 2}
                onClick={() => setPhoto((photo + 1) % p.images.length)}
                aria-label="Next photo"
              >
                <ChevronRight />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
function ArrowUpRightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M7 17 17 7M7 7h10v10" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}
function HouseIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path
        d="m3 10 9-7 9 7v11H3V10Z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
    </svg>
  );
}
