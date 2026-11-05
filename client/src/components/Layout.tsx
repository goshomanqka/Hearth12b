import { useState, useEffect, type ReactNode } from "react";
import { Link, useLocation, useSearch } from "wouter";
import {
  ArrowUpRight,
  ChevronDown,
  Heart,
  Menu,
  X,
  Plus,
  LogOut,
  UserRound,
  ArrowRight,
  Instagram,
  Linkedin,
} from "lucide-react";
import { useMarketplace } from "@/contexts/MarketplaceContext";

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <Link
      href="/"
      className={`brand ${light ? "brand-light" : ""}`}
      aria-label="Hearth home"
    >
      <svg
        width="32"
        height="34"
        viewBox="0 0 32 34"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M3 15L16 3l13 12v16H3V15Z"
          stroke="currentColor"
          strokeWidth="2.1"
          strokeLinejoin="round"
        />
        <path
          d="M10 31V19h12v12M10 12l6-5 6 5"
          stroke="currentColor"
          strokeWidth="2.1"
          strokeLinejoin="round"
        />
      </svg>
      <span>
        hearth<span className="brand-dot">.</span>
      </span>
    </Link>
  );
}
export default function Layout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const search = useSearch();
  const { user, loading, savedIds, signIn, logout } = useMarketplace();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  useEffect(() => {
    setMobileOpen(false);
    setAccountOpen(false);
    window.scrollTo({ top: 0 });
  }, [location, search]);
  return (
    <div className="site-shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="site-header">
        <div className="header-inner">
          <Logo />
          <nav
            className={`main-nav ${mobileOpen ? "mobile-open" : ""}`}
            aria-label="Main navigation"
          >
            <Link
              href="/properties?kind=sale"
              className={location === "/properties" ? "active" : ""}
            >
              Buy a home
            </Link>
            <Link href="/properties?kind=rent">Rent a home</Link>
            <Link href="/properties?toursOnly=true" className="nav-tour">
              3D tours<span>NEW</span>
            </Link>
            <Link href="/about">Why Hearth</Link>
            <div className="mobile-account">
              <button onClick={() => signIn()}>Sign in / Register</button>
              <Link href="/publish">List your property</Link>
            </div>
          </nav>
          <div className="header-actions">
            <Link
              href="/saved"
              className="icon-button saved-nav"
              aria-label={`Saved homes${savedIds.length ? `, ${savedIds.length} saved` : ""}`}
            >
              <Heart size={20} />
              {savedIds.length > 0 && (
                <span className="count-dot">{savedIds.length}</span>
              )}
            </Link>
            <div className="account-control">
              {user ? (
                <button
                  className="account-toggle"
                  onClick={() => setAccountOpen(!accountOpen)}
                >
                  <span className="avatar">
                    {(user.name ?? "You").charAt(0).toUpperCase()}
                  </span>
                  <ChevronDown size={14} />
                </button>
              ) : (
                <button
                  className="sign-in"
                  disabled={loading}
                  onClick={() => signIn()}
                >
                  {loading ? "Checking account…" : "Sign in"}
                </button>
              )}
              {accountOpen && (
                <div className="account-menu">
                  <strong>{user?.name || "Your account"}</strong>
                  <Link href="/account">
                    <UserRound size={16} /> My properties
                  </Link>
                  <Link href="/saved">
                    <Heart size={16} /> Saved homes
                  </Link>
                  <button
                    onClick={() => {
                      logout();
                      setAccountOpen(false);
                    }}
                  >
                    <LogOut size={16} /> Sign out
                  </button>
                </div>
              )}
            </div>
            <Link href="/publish" className="button button-dark list-button">
              <Plus size={16} /> List a property
            </Link>
            <button
              className="icon-button mobile-menu"
              aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </header>
      <main id="main">{children}</main>
      <footer className="site-footer">
        <div className="footer-top">
          <div className="footer-brand">
            <Logo light />
            <p>
              More than a place.
              <br />A place to call yours.
            </p>
            <span className="footer-note">
              Thoughtful homes. A better way to find them.
            </span>
          </div>
          <div className="footer-links">
            <div>
              <h4>Find your place</h4>
              <Link href="/properties?kind=sale">Homes for sale</Link>
              <Link href="/properties?kind=rent">Homes for rent</Link>
              <Link href="/properties?toursOnly=true">Explore 3D tours</Link>
              <Link href="/saved">Saved homes</Link>
            </div>
            <div>
              <h4>For homeowners</h4>
              <Link href="/publish">List your property</Link>
              <Link href="/account">Manage your listings</Link>
              <Link href="/about">How Hearth works</Link>
            </div>
            <div>
              <h4>A little about us</h4>
              <Link href="/about">Our approach</Link>
              <Link href="/help">
                Help & support <ArrowUpRight size={12} />
              </Link>
              <Link href="/help">Contact us</Link>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} Hearth. A better way home.</span>
          <div>
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
            <span className="footer-currency">English · USD</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
