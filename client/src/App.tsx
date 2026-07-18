import { CelebrationHost } from "@/components/CelebrationBanner";
import { OnboardingTour } from "@/components/OnboardingTour";
import { SiteShell } from "@/components/SiteShell";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LocaleProvider } from "@/contexts/LocaleContext";
import { useGuestProgressMerge } from "@/hooks/useGuestProgressMerge";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { lazy, Suspense, useEffect } from "react";
import { Route, Switch } from "wouter";
import { Loader2 } from "lucide-react";

const Home = lazy(() => import("./pages/Home"));
const BasicsHubPage = lazy(() => import("./pages/BasicsHubPage"));
const BasicsModulePage = lazy(() => import("./pages/BasicsModulePage"));
const CurriculumPage = lazy(() =>
  import("./pages/LearningPages").then(m => ({ default: m.CurriculumPage })),
);
const DashboardPage = lazy(() =>
  import("./pages/LearningPages").then(m => ({ default: m.DashboardPage })),
);
const PlannerPage = lazy(() =>
  import("./pages/LearningPages").then(m => ({ default: m.PlannerPage })),
);
const TutorPage = lazy(() =>
  import("./pages/LearningPages").then(m => ({ default: m.TutorPage })),
);
const AdminPage = lazy(() =>
  import("./pages/LearningPages").then(m => ({ default: m.AdminPage })),
);
const LessonPage = lazy(() => import("./pages/LessonPage"));
const MockTestPage = lazy(() => import("./pages/MockTestPage"));
const CertificatePage = lazy(() => import("./pages/CertificatePage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const FaqPage = lazy(() => import("./pages/FaqPage"));
const NotFound = lazy(() => import("./pages/NotFound"));

function PageFallback() {
  return (
    <div className="container flex min-h-[40vh] items-center justify-center py-20">
      <Loader2 className="size-8 animate-spin text-[var(--gold-dark)]" aria-label="Loading" />
    </div>
  );
}

function GuestMergeBootstrap() {
  useGuestProgressMerge();
  return null;
}

function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (import.meta.env.DEV) return;
    void navigator.serviceWorker.register("/sw.js").catch(() => {
      // ignore SW failures in unsupported environments
    });
  }, []);
  return null;
}

function Router() {
  return (
    <SiteShell>
      <Suspense fallback={<PageFallback />}>
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/basics" component={BasicsHubPage} />
          <Route path="/basics/:moduleId" component={BasicsModulePage} />
          <Route path="/curriculum" component={CurriculumPage} />
          <Route path="/lesson/:chapter" component={LessonPage} />
          <Route path="/mock-test" component={MockTestPage} />
          <Route path="/dashboard" component={DashboardPage} />
          <Route path="/planner" component={PlannerPage} />
          <Route path="/tutor" component={TutorPage} />
          <Route path="/profile" component={ProfilePage} />
          <Route path="/profile/setup" component={ProfilePage} />
          <Route path="/certificate/:code" component={CertificatePage} />
          <Route path="/faq" component={FaqPage} />
          <Route path="/admin" component={AdminPage} />
          <Route path="/404" component={NotFound} />
          <Route component={NotFound} />
        </Switch>
      </Suspense>
    </SiteShell>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <LocaleProvider>
          <TooltipProvider>
            <Toaster richColors position="top-right" />
            <GuestMergeBootstrap />
            <PwaRegister />
            <OnboardingTour />
            <CelebrationHost />
            <Router />
          </TooltipProvider>
        </LocaleProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
