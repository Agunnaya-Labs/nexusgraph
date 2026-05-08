import { useEffect, useState, useRef, useCallback } from "react";
import { Link, Route, Switch, useLocation, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  LayoutDashboard, Users as UsersIcon, Building2, CreditCard, Network,
  Activity as ActivityIcon, Settings as SettingsIcon, LogOut, Menu, X,
  Search, Bell, AlertTriangle, ChevronRight, Loader2
} from "lucide-react";
import { useLogout, useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";

import NotFound from "@/pages/not-found";
import Dashboard from "./pages/dashboard";
import Login from "./pages/login";
import Organizations from "./pages/organizations";
import UsersPage from "./pages/users";
import Billing from "./pages/billing";
import Subgraphs from "./pages/subgraphs";
import SubgraphDetail from "./pages/subgraph-detail";
import Activity from "./pages/activity";
import Settings from "./pages/settings";
import OrganizationDetail from "./pages/organization-detail";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

function PrivateRoute({ component: Component, ...rest }: any) {
  const [, setLocation] = useLocation();
  const token = localStorage.getItem("nexusgraph_token");
  useEffect(() => {
    if (!token) setLocation("/login");
  }, [token, setLocation]);
  if (!token) return null;
  return <Component {...rest} />;
}

interface SearchResult {
  users: Array<{ id: number; name: string; email: string; role: string; status: string }>;
  organizations: Array<{ id: number; name: string; slug: string; status: string }>;
  subgraphs: Array<{ id: number; name: string; url: string; status: string }>;
}

function GlobalSearch({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [, setLocation] = useLocation();
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const doSearch = useCallback(async (q: string) => {
    if (q.length < 2) { setResults(null); return; }
    setIsSearching(true);
    try {
      const token = localStorage.getItem("nexusgraph_token");
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setResults(await res.json());
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    setQuery(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(q), 280);
  };

  const navigate = (path: string) => {
    setLocation(path);
    onClose();
  };

  const hasResults = results && (results.users.length + results.organizations.length + results.subgraphs.length) > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-2xl bg-card border border-border rounded-xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          {isSearching ? <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" /> : <Search className="w-5 h-5 text-muted-foreground" />}
          <input
            ref={inputRef}
            value={query}
            onChange={handleChange}
            placeholder="Search users, organizations, subgraphs..."
            className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground outline-none text-base"
          />
          <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 rounded border border-border text-xs text-muted-foreground font-mono">ESC</kbd>
        </div>
        {hasResults && (
          <div className="max-h-[420px] overflow-y-auto divide-y divide-border">
            {results!.organizations.length > 0 && (
              <div>
                <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider bg-muted/30">Organizations</div>
                {results!.organizations.map((org) => (
                  <button key={org.id} onClick={() => navigate(`/organizations/${org.id}`)} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left">
                    <Building2 className="w-4 h-4 text-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{org.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{org.slug}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </button>
                ))}
              </div>
            )}
            {results!.users.length > 0 && (
              <div>
                <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider bg-muted/30">Users</div>
                {results!.users.map((user) => (
                  <button key={user.id} onClick={() => navigate(`/users`)} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left">
                    <UsersIcon className="w-4 h-4 text-chart-2 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{user.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    </div>
                    <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${user.status === "active" ? "bg-green-500/10 text-green-400" : "bg-destructive/10 text-destructive"}`}>{user.status}</span>
                  </button>
                ))}
              </div>
            )}
            {results!.subgraphs.length > 0 && (
              <div>
                <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider bg-muted/30">Subgraphs</div>
                {results!.subgraphs.map((sg) => (
                  <button key={sg.id} onClick={() => navigate(`/subgraphs/${sg.id}`)} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left">
                    <Network className="w-4 h-4 text-chart-3 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{sg.name}</p>
                      <p className="text-xs text-muted-foreground font-mono truncate">{sg.url}</p>
                    </div>
                    <span className={`text-xs px-1.5 py-0.5 rounded font-mono ${sg.status === "healthy" ? "bg-green-500/10 text-green-400" : sg.status === "degraded" ? "bg-amber-500/10 text-amber-400" : "bg-destructive/10 text-destructive"}`}>{sg.status}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        {query.length >= 2 && !isSearching && !hasResults && (
          <div className="px-4 py-8 text-center text-muted-foreground text-sm">No results for "{query}"</div>
        )}
        {!query && (
          <div className="px-4 py-6 text-center text-muted-foreground text-sm">
            Type at least 2 characters to search
          </div>
        )}
      </div>
    </div>
  );
}

function Sidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [location, setLocation] = useLocation();
  const logoutMutation = useLogout();
  const { data: user } = useGetMe({
    query: { enabled: !!localStorage.getItem("nexusgraph_token"), queryKey: getGetMeQueryKey() },
  });

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        localStorage.removeItem("nexusgraph_token");
        queryClient.clear();
        setLocation("/login");
      },
    });
  };

  const navItems = [
    { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
    { href: "/organizations", label: "Organizations", icon: Building2 },
    { href: "/users", label: "Users", icon: UsersIcon },
    { href: "/billing", label: "Billing", icon: CreditCard },
    { href: "/subgraphs", label: "Subgraphs", icon: Network },
    { href: "/activity", label: "Activity", icon: ActivityIcon },
    { href: "/settings", label: "Settings", icon: SettingsIcon },
  ];

  const handleNavClick = () => {
    if (window.innerWidth < 1024) onClose();
  };

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden" onClick={onClose} />
      )}
      <div className={`fixed left-0 top-0 h-screen z-50 w-64 border-r border-border bg-card flex flex-col transition-transform duration-300 ease-in-out ${isOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}>
        <div className="p-5 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src="/logo.png" alt="NexusGraph" className="w-7 h-7 rounded-md" />
            <div>
              <span className="font-bold text-base tracking-tight text-foreground">NexusGraph</span>
              <p className="text-xs text-muted-foreground font-mono uppercase tracking-wider leading-none mt-0.5">Control Plane</p>
            </div>
          </div>
          <button onClick={onClose} className="lg:hidden p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-4">
          <nav className="space-y-0.5 px-3">
            {navItems.map((item) => {
              const isActive = location.startsWith(item.href) || (location === "/" && item.href === "/dashboard");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={handleNavClick}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-all duration-150 text-sm font-medium ${isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
                >
                  <item.icon className={`w-4 h-4 shrink-0 ${isActive ? "text-primary" : ""}`} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs shrink-0 uppercase">
                {user?.name?.charAt(0) || "U"}
              </div>
              <div className="truncate">
                <p className="text-sm font-medium text-foreground truncate leading-tight">{user?.name || "Loading..."}</p>
                <p className="text-xs text-muted-foreground truncate leading-tight">{user?.role || ""}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 text-muted-foreground hover:text-destructive transition-colors shrink-0 rounded-md hover:bg-destructive/10"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function Header({ onMenuClick, onSearchClick, alertCount }: { onMenuClick: () => void; onSearchClick: () => void; alertCount: number }) {
  const [location] = useLocation();

  const pageTitle: Record<string, string> = {
    "/dashboard": "Overview",
    "/organizations": "Organizations",
    "/users": "Users",
    "/billing": "Billing & Plans",
    "/subgraphs": "Subgraphs",
    "/activity": "Audit Log",
    "/settings": "Settings",
  };

  const title = Object.entries(pageTitle).find(([path]) => location.startsWith(path))?.[1] ?? "NexusGraph";

  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 h-14 border-b border-border bg-background/95 backdrop-blur px-4 lg:px-6">
      <button onClick={onMenuClick} className="lg:hidden p-2 -ml-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
        <Menu className="w-5 h-5" />
      </button>
      <div className="flex-1">
        <h2 className="text-sm font-semibold text-foreground hidden sm:block">{title}</h2>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onSearchClick}
          className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-border bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground text-sm transition-colors"
        >
          <Search className="w-4 h-4" />
          <span className="hidden sm:inline">Search</span>
          <kbd className="hidden md:inline-flex items-center px-1.5 py-0.5 rounded text-xs border border-border font-mono ml-1">⌘K</kbd>
        </button>
        <button className="relative p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
          <Bell className="w-4 h-4" />
          {alertCount > 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full" />
          )}
        </button>
      </div>
    </header>
  );
}

function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [alertCount, setAlertCount] = useState(0);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("nexusgraph_token");
    if (!token) return;
    fetch("/api/alerts", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.ok ? r.json() : [])
      .then((alerts: any[]) => setAlertCount(alerts.length))
      .catch(() => {});
  }, []);

  return (
    <div className="flex h-screen bg-background">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        <Header
          onMenuClick={() => setSidebarOpen(true)}
          onSearchClick={() => setSearchOpen(true)}
          alertCount={alertCount}
        />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Switch>
            <Route path="/" component={() => { const [, setLocation] = useLocation(); useEffect(() => setLocation("/dashboard"), []); return null; }} />
            <Route path="/dashboard" component={() => <PrivateRoute component={Dashboard} />} />
            <Route path="/organizations/:id" component={() => <PrivateRoute component={OrganizationDetail} />} />
            <Route path="/organizations" component={() => <PrivateRoute component={Organizations} />} />
            <Route path="/users" component={() => <PrivateRoute component={UsersPage} />} />
            <Route path="/billing" component={() => <PrivateRoute component={Billing} />} />
            <Route path="/subgraphs/:id" component={() => <PrivateRoute component={SubgraphDetail} />} />
            <Route path="/subgraphs" component={() => <PrivateRoute component={Subgraphs} />} />
            <Route path="/activity" component={() => <PrivateRoute component={Activity} />} />
            <Route path="/settings" component={() => <PrivateRoute component={Settings} />} />
            <Route component={NotFound} />
          </Switch>
        </main>
      </div>
      {searchOpen && <GlobalSearch onClose={() => setSearchOpen(false)} />}
    </div>
  );
}

function Router() {
  const [location] = useLocation();
  if (location === "/login") return <Login />;
  return <AppLayout />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
