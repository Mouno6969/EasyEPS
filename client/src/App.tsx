import { SiteShell } from "@/components/SiteShell";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LocaleProvider } from "@/contexts/LocaleContext";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import {
  AdminPage as EasyEPSAdminPage,
  CurriculumPage,
  DashboardPage,
  PlannerPage,
  TutorPage,
} from "./pages/LearningPages";
import BasicsHubPage from "./pages/BasicsHubPage";
import BasicsModulePage from "./pages/BasicsModulePage";
import CertificatePage from "./pages/CertificatePage";
import LessonPage from "./pages/LessonPage";
import MockTestPage from "./pages/MockTestPage";
import NotFound from "./pages/NotFound";
import ProfilePage from "./pages/ProfilePage";
import { Route, Switch } from "wouter";

function Router() {
  return <SiteShell><Switch>
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
    <Route path="/admin" component={EasyEPSAdminPage} />
    <Route path="/404" component={NotFound} />
    <Route component={NotFound} />
  </Switch></SiteShell>;
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <LocaleProvider>
          <TooltipProvider>
            <Toaster richColors position="top-right" />
            <Router />
          </TooltipProvider>
        </LocaleProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
