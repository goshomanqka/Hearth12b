import {
  createContext,
  useContext,
  useState,
  lazy,
  Suspense,
  type ReactNode,
} from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { startLogin } from "@/const";
import { toast } from "sonner";
import { X, ArrowUpRight, ShieldCheck, Heart, House } from "lucide-react";
import type { Property } from "@shared/properties";

const VirtualTour = lazy(() => import("@/components/VirtualTour"));
type ContextType = {
  user: ReturnType<typeof useAuth>["user"];
  loading: boolean;
  savedIds: number[];
  signIn: (mode?: "login" | "register") => void;
  logout: () => Promise<void>;
  toggleSaved: (id: number) => void;
  openTour: (property: Property) => void;
};
const MarketplaceContext = createContext<ContextType | null>(null);
export function useMarketplace() {
  const context = useContext(MarketplaceContext);
  if (!context) throw new Error("Marketplace provider is required");
  return context;
}
export function MarketplaceProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const utils = trpc.useUtils();
  const [authMode, setAuthMode] = useState<"login" | "register" | null>(null);
  const [tour, setTour] = useState<Property | null>(null);
  const saved = trpc.marketplace.favouriteIds.useQuery(undefined, {
    enabled: !!auth.user,
    retry: false,
  });
  const toggle = trpc.marketplace.toggleFavourite.useMutation({
    onSuccess: result => {
      utils.marketplace.favouriteIds.invalidate();
      toast.success(
        result.saved
          ? "Added to your saved homes"
          : "Removed from your saved homes"
      );
    },
    onError: e => toast.error(e.message),
  });
  const logout = async () => {
    await auth.logout();
    utils.marketplace.favouriteIds.setData(undefined, []);
    utils.marketplace.mine.setData(undefined, []);
    utils.marketplace.notifications.setData(undefined, []);
    toast.success("You’re signed out");
  };
  return (
    <MarketplaceContext.Provider
      value={{
        user: auth.user,
        loading: auth.loading,
        savedIds: auth.user ? (saved.data ?? []) : [],
        signIn: mode => setAuthMode(mode ?? "login"),
        logout,
        toggleSaved: id => {
          if (!auth.user) {
            setAuthMode("login");
            return;
          }
          if (!toggle.isPending) toggle.mutate({ propertyId: id });
        },
        openTour: setTour,
      }}
    >
      {children}
      {authMode && (
        <div className="modal-backdrop" onClick={() => setAuthMode(null)}>
          <section
            className="auth-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="auth-heading"
            onClick={e => e.stopPropagation()}
          >
            <button
              className="icon-button modal-close"
              aria-label="Close sign in"
              onClick={() => setAuthMode(null)}
            >
              <X size={21} />
            </button>
            <div className="auth-symbol">
              <House size={28} />
            </div>
            <span className="eyebrow">A BETTER WAY HOME</span>
            <h2 id="auth-heading">
              {authMode === "register"
                ? "Make yourself at home."
                : "Your next chapter starts here."}
            </h2>
            <p>
              Save the homes you love, connect with owners, and keep your
              property search in one place.
            </p>
            <div className="auth-benefits">
              <span>
                <Heart size={17} /> Your personal shortlist
              </span>
              <span>
                <ShieldCheck size={17} /> Secure account access
              </span>
            </div>
            <button
              className="button button-dark full-width"
              onClick={() => {
                try {
                  startLogin();
                } catch (e) {
                  toast.error(
                    e instanceof Error ? e.message : "Sign-in is unavailable"
                  );
                }
              }}
            >
              {authMode === "register"
                ? "Create account with Manus"
                : "Continue with Manus"}
              <ArrowUpRight size={18} />
            </button>
            <small>
              Secure sign-in. A new account is created automatically on your
              first visit.
            </small>
            <p className="auth-switch">
              {authMode === "register"
                ? "Already have an account?"
                : "New to Hearth?"}{" "}
              <button
                onClick={() =>
                  setAuthMode(authMode === "register" ? "login" : "register")
                }
              >
                {authMode === "register" ? "Sign in" : "Create an account"}
              </button>
            </p>
            <p className="auth-legal">
              By continuing, you agree to our <a href="/terms">Terms</a> and{" "}
              <a href="/privacy">Privacy Policy</a>.
            </p>
          </section>
        </div>
      )}
      {tour && (
        <Suspense
          fallback={
            <div className="modal-backdrop">
              <div className="loading-state">
                Preparing your 3D experience…
                <button
                  className="button button-light"
                  onClick={() => setTour(null)}
                >
                  Cancel
                </button>
              </div>
            </div>
          }
        >
          <VirtualTour
            kind={tour.tourKind}
            url={tour.tourUrl}
            title={tour.title}
            onClose={() => setTour(null)}
          />
        </Suspense>
      )}
    </MarketplaceContext.Provider>
  );
}
