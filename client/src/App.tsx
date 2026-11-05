import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { MarketplaceProvider } from "./contexts/MarketplaceContext";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import Discover from "./pages/Discover";
import Property from "./pages/Property";
import Account from "./pages/Account";
import Publish from "./pages/Publish";
import Info from "./pages/Info";
import NotFound from "./pages/NotFound";
import PageMetadata from "./components/PageMetadata";

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <MarketplaceProvider>
            <PageMetadata />
            <Layout>
              <Switch>
                <Route path="/" component={Home} />
                <Route path="/properties" component={Discover} />
                <Route path="/property/:id" component={Property} />
                <Route path="/saved">{() => <Account savedOnly />}</Route>
                <Route path="/account">{() => <Account />}</Route>
                <Route path="/publish" component={Publish} />
                <Route path="/publish/:id" component={Publish} />
                <Route path="/about" component={Info} />
                <Route path="/help" component={Info} />
                <Route path="/privacy" component={Info} />
                <Route path="/terms" component={Info} />
                <Route path="/404" component={NotFound} />
                <Route component={NotFound} />
              </Switch>
            </Layout>
          </MarketplaceProvider>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
