import { useState } from "react";
import { Link, useSearch } from "wouter";
import {
  Heart,
  Plus,
  House,
  Bell,
  ArrowRight,
  Pencil,
  Trash2,
  Check,
  ShieldCheck,
  LogOut,
  Clock,
  ArrowUpRight,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useMarketplace } from "@/contexts/MarketplaceContext";
import PropertyCard from "@/components/PropertyCard";
import { formatPrice, type Property } from "@shared/properties";

export default function Account({
  savedOnly = false,
}: {
  savedOnly?: boolean;
}) {
  const { user, loading, signIn, savedIds, logout } = useMarketplace();
  const search = useSearch();
  const [selected, setSelected] = useState(
    savedOnly ? "saved" : (new URLSearchParams(search).get("tab") ?? "listings")
  );
  const [removeId, setRemoveId] = useState<number | null>(null);
  const tab = savedOnly ? "saved" : selected;
  const utils = trpc.useUtils();
  const homes = trpc.marketplace.list.useQuery(
    {},
    { enabled: !!user && tab === "saved" }
  );
  const mine = trpc.marketplace.mine.useQuery(undefined, {
    enabled: !!user && tab === "listings",
    retry: false,
  });
  const notifications = trpc.marketplace.notifications.useQuery(undefined, {
    enabled: !!user && !savedOnly,
    retry: false,
  });
  const remove = trpc.marketplace.remove.useMutation({
    onSuccess: () => {
      setRemoveId(null);
      utils.marketplace.mine.invalidate();
      utils.marketplace.list.invalidate();
      toast.success("Listing removed from the marketplace");
    },
    onError: e => toast.error(e.message),
  });
  const read = trpc.marketplace.markRead.useMutation({
    onSuccess: () => utils.marketplace.notifications.invalidate(),
    onError: e => toast.error(e.message),
  });
  if (loading)
    return <div className="section loading-state">Checking your account…</div>;
  if (!user)
    return (
      <div className="section account-page">
        <div className="account-gate">
          <div className="empty-icon">
            {savedOnly ? <Heart size={29} /> : <House size={29} />}
          </div>
          <span className="eyebrow">A SPACE OF YOUR OWN</span>
          <h1>
            {savedOnly
              ? "Keep the homes you love, close."
              : "Your next chapter, in one place."}
          </h1>
          <p>
            {savedOnly
              ? "Sign in to save your favourite homes and come back to them whenever you’re ready."
              : "Manage your listings, revisit saved homes and keep track of conversations with prospective buyers."}
          </p>
          <button className="button button-dark" onClick={() => signIn()}>
            Sign in to your account
            <ArrowUpRight size={17} />
          </button>
          <button className="account-create" onClick={() => signIn("register")}>
            New to Hearth? Create an account
          </button>
          <div className="account-gate-note">
            <ShieldCheck size={16} />
            Secure access. Your shortlist stays yours.
          </div>
        </div>
      </div>
    );
  const savedHomes = (homes.data ?? []).filter(p =>
    savedIds.includes(p.id)
  ) as Property[];
  return (
    <div className="account-page section">
      <div className="account-heading">
        <div>
          <span className="eyebrow">YOUR HEARTH</span>
          <h1>
            {savedOnly
              ? "A few places you could call home."
              : `Hello, ${user.name?.split(" ")[0] || "there"}.`}
          </h1>
          <p>
            {savedOnly
              ? "Your personal collection of possibilities."
              : "Your listings, conversations and next chapter — all together."}
          </p>
        </div>
        {!savedOnly && (
          <Link href="/publish" className="button button-dark">
            <Plus size={17} /> List a property
          </Link>
        )}
      </div>
      {!savedOnly && (
        <div className="account-tabs" role="tablist">
          <button
            role="tab"
            aria-selected={tab === "listings"}
            className={tab === "listings" ? "selected" : ""}
            onClick={() => setSelected("listings")}
          >
            <House size={16} />
            My properties
          </button>
          <button
            role="tab"
            aria-selected={tab === "saved"}
            className={tab === "saved" ? "selected" : ""}
            onClick={() => setSelected("saved")}
          >
            <Heart size={16} />
            Saved homes<span>{savedIds.length}</span>
          </button>
          <button
            role="tab"
            aria-selected={tab === "notifications"}
            className={tab === "notifications" ? "selected" : ""}
            onClick={() => setSelected("notifications")}
          >
            <Bell size={16} />
            Inbox
            {notifications.data?.some(n => !n.read) && (
              <i className="unread-dot" />
            )}
          </button>
        </div>
      )}
      {tab === "saved" &&
        (homes.isLoading ? (
          <div className="loading-state">Collecting your saved homes…</div>
        ) : homes.isError ? (
          <div className="empty-state">
            <h2>Your saved homes couldn’t be loaded.</h2>
            <button
              className="button button-dark"
              onClick={() => homes.refetch()}
            >
              Retry
            </button>
          </div>
        ) : savedHomes.length ? (
          <div className="property-grid">
            {savedHomes.map(p => (
              <PropertyCard key={p.id} property={p} />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">
              <Heart size={28} />
            </div>
            <h2>Your shortlist starts with a little love.</h2>
            <p>
              Tap the heart on a home that catches your eye. We’ll keep it here
              for you.
            </p>
            <Link href="/properties" className="button button-dark">
              Explore homes
              <ArrowRight size={17} />
            </Link>
          </div>
        ))}
      {tab === "listings" &&
        (mine.isLoading ? (
          <div className="loading-state">Loading your properties…</div>
        ) : mine.isError ? (
          <div className="empty-state">
            <h2>Your listings couldn’t be loaded.</h2>
            <p>{mine.error.message}</p>
            <button
              className="button button-dark"
              onClick={() => mine.refetch()}
            >
              Retry
            </button>
          </div>
        ) : mine.data?.length ? (
          <div className="owner-listings">
            {(mine.data as Property[]).map(p => (
              <article className="owner-listing" key={p.id}>
                <img src={p.images[0]} alt={p.title} />
                <div className="owner-listing-info">
                  <span className={`status-tag ${p.status}`}>
                    {p.status === "published" ? "LIVE ON HEARTH" : "DRAFT"}
                  </span>
                  <h3>{p.title}</h3>
                  <p>{p.location}</p>
                  <strong>{formatPrice(p.price, p.kind)}</strong>
                </div>
                <div className="owner-listing-actions">
                  {p.status === "published" && (
                    <Link href={`/property/${p.id}`} className="text-link">
                      View
                      <ArrowUpRight size={14} />
                    </Link>
                  )}
                  <Link
                    href={`/publish/${p.id}`}
                    className="button button-light"
                  >
                    <Pencil size={14} />
                    Edit
                  </Link>
                  <button
                    className="icon-button"
                    aria-label={`Remove ${p.title}`}
                    onClick={() => setRemoveId(p.id)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">
              <House size={29} />
            </div>
            <h2>Every home has a story. Share yours.</h2>
            <p>
              Create your first listing, add beautiful photos, and give buyers a
              new perspective with a virtual tour.
            </p>
            <Link href="/publish" className="button button-dark">
              <Plus size={17} />
              List your first property
            </Link>
          </div>
        ))}
      {tab === "notifications" &&
        (notifications.isLoading ? (
          <div className="loading-state">Opening your inbox…</div>
        ) : notifications.isError ? (
          <div className="empty-state">
            <h2>We couldn’t open your inbox.</h2>
            <button
              className="button button-dark"
              onClick={() => notifications.refetch()}
            >
              Retry
            </button>
          </div>
        ) : notifications.data?.length ? (
          <div className="notification-list">
            {notifications.data.map(n => (
              <article
                key={n.id}
                className={`notification ${n.read ? "" : "unread"}`}
              >
                <div className="notification-icon">
                  <Bell size={20} />
                </div>
                <div>
                  <h3>{n.title}</h3>
                  <p>{n.content}</p>
                  <small>{new Date(n.createdAt).toLocaleString()}</small>
                </div>
                {!n.read && (
                  <button
                    className="text-link"
                    onClick={() => read.mutate({ id: n.id })}
                    disabled={read.isPending}
                  >
                    <Check size={14} />
                    Mark read
                  </button>
                )}
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">
              <Bell size={27} />
            </div>
            <h2>A little quiet, for now.</h2>
            <p>
              Listing updates and property enquiries will appear here. Nothing
              gets lost along the way.
            </p>
          </div>
        ))}
      {removeId !== null && (
        <div className="modal-backdrop" onClick={() => setRemoveId(null)}>
          <section
            className="confirm-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="remove-heading"
            onClick={e => e.stopPropagation()}
          >
            <Trash2 size={27} />
            <h2 id="remove-heading">Remove this listing?</h2>
            <p>
              It will no longer appear on Hearth. This removes the listing
              record from your dashboard and marketplace, but uploaded media is
              retained in storage.
            </p>
            <div>
              <button
                className="button button-light"
                onClick={() => setRemoveId(null)}
              >
                Keep listing
              </button>
              <button
                className="button button-dark"
                disabled={remove.isPending}
                onClick={() => remove.mutate({ id: removeId })}
              >
                {remove.isPending ? "Removing…" : "Remove listing"}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
