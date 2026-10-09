import { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import { WorkloadProvider } from './state/workload-context';
import AppShell from './components/app-shell';
import DashboardPage from './pages/dashboard';
import WorkloadsPage from './pages/workloads';
import WorkloadDetailPage from './pages/workload-detail';
import RegionsPage from './pages/regions';
import SchedulerPage from './pages/scheduler';
import ComparisonPage from './pages/comparison';

const queryClient = new QueryClient();

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function Router() {
  return <WorkloadProvider><RoutedErrorBoundary><AppShell><Switch>
    <Route path="/" component={DashboardPage} />
    <Route path="/dashboard" component={DashboardPage} />
    <Route path="/workloads" component={WorkloadsPage} />
    <Route path="/workloads/:id" component={WorkloadDetailPage} />
    <Route path="/regions" component={RegionsPage} />
    <Route path="/scheduler" component={SchedulerPage} />
    <Route path="/comparison" component={ComparisonPage} />
    <Route component={NotFound} />
  </Switch></AppShell></RoutedErrorBoundary></WorkloadProvider>;
}

function App() {
  return <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
        <Router />
      </WouterRouter>
      <Toaster />
    </TooltipProvider>
  </QueryClientProvider>;
}

export default App;
