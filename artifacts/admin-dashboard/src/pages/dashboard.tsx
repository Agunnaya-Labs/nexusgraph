import {
  useGetDashboardSummary, getGetDashboardSummaryQueryKey,
  useGetDashboardMetrics, getGetDashboardMetricsQueryKey,
  useGetPlanBreakdown, getGetPlanBreakdownQueryKey,
  useListActivity, getListActivityQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar
} from "recharts";
import {
  Building2, Users, Network, Activity as ActivityIcon, DollarSign,
  ServerCrash, TrendingUp, TrendingDown, ArrowUpRight, AlertTriangle,
  CheckCircle2, Clock, Zap, CreditCard, Link as LinkIcon
} from "lucide-react";
import { format } from "date-fns";
import { useState, useEffect } from "react";
import { Link } from "wouter";

interface Alert {
  id: string;
  severity: "critical" | "warning" | "info";
  title: string;
  description: string;
  orgName: string | null;
  resourceType: string;
  resourceName: string;
  createdAt: string;
}

function TrendBadge({ value, suffix = "" }: { value: number; suffix?: string }) {
  if (value === 0) return <span className="text-xs text-muted-foreground">No change</span>;
  const isUp = value > 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${isUp ? "text-green-400" : "text-destructive"}`}>
      {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {isUp ? "+" : ""}{value}{suffix}
    </span>
  );
}

export default function Dashboard() {
  const [period, setPeriod] = useState<"7d" | "30d" | "90d">("30d");
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(true);

  const { data: summary, isLoading: isSummaryLoading } = useGetDashboardSummary({
    query: { queryKey: getGetDashboardSummaryQueryKey(), refetchInterval: 60_000 },
  });
  const { data: metrics, isLoading: isMetricsLoading } = useGetDashboardMetrics(
    { period },
    { query: { queryKey: getGetDashboardMetricsQueryKey({ period }) } }
  );
  const { data: planBreakdown, isLoading: isPlanLoading } = useGetPlanBreakdown({
    query: { queryKey: getGetPlanBreakdownQueryKey() },
  });
  const { data: activity, isLoading: isActivityLoading } = useListActivity(
    { limit: 6 },
    { query: { queryKey: getListActivityQueryKey({ limit: 6 }) } }
  );

  useEffect(() => {
    const token = localStorage.getItem("nexusgraph_token");
    if (!token) return;
    setAlertsLoading(true);
    fetch("/api/alerts", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.ok ? r.json() : [])
      .then(setAlerts)
      .catch(() => setAlerts([]))
      .finally(() => setAlertsLoading(false));
  }, []);

  const COLORS = [
    "hsl(var(--chart-1))", "hsl(var(--chart-2))",
    "hsl(var(--chart-3))", "hsl(var(--chart-4))",
  ];

  const healthPct = summary
    ? Math.round((summary.healthySubgraphs / Math.max(summary.totalSubgraphs, 1)) * 100)
    : 0;

  const criticalAlerts = alerts.filter((a) => a.severity === "critical");
  const warningAlerts = alerts.filter((a) => a.severity === "warning");

  const revenueGrowth = summary ? Math.round((summary.newOrgsThisMonth / Math.max(summary.totalOrganizations - summary.newOrgsThisMonth, 1)) * 100) : 0;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-400">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Overview</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Platform performance and business metrics</p>
        </div>
        <div className="flex items-center gap-2">
          {alerts.length > 0 && (
            <Badge variant="destructive" className="gap-1 text-xs">
              <AlertTriangle className="w-3 h-3" />
              {alerts.length} alert{alerts.length !== 1 ? "s" : ""}
            </Badge>
          )}
          <div className="flex rounded-md border border-border overflow-hidden">
            {(["7d", "30d", "90d"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 text-xs font-mono transition-colors ${
                  period === p
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">Active Orgs</CardTitle>
            <Building2 className="h-4 w-4 text-primary/60" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {isSummaryLoading ? <Skeleton className="h-8 w-20 mb-1" /> : (
              <>
                <div className="text-2xl font-bold">{summary?.activeOrganizations}</div>
                <div className="mt-1 flex items-center gap-1">
                  <TrendBadge value={summary?.newOrgsThisMonth ?? 0} suffix=" this mo." />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">Monthly Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-primary/60" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {isSummaryLoading ? <Skeleton className="h-8 w-24 mb-1" /> : (
              <>
                <div className="text-2xl font-bold">${summary?.monthlyRevenue.toLocaleString()}</div>
                <div className="mt-1">
                  <TrendBadge value={revenueGrowth} suffix="%" />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">Active Users</CardTitle>
            <Users className="h-4 w-4 text-primary/60" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {isSummaryLoading ? <Skeleton className="h-8 w-16 mb-1" /> : (
              <>
                <div className="text-2xl font-bold">{summary?.activeUsers}</div>
                <p className="text-xs text-muted-foreground mt-1">{summary?.totalUsers} total</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className={criticalAlerts.length > 0 ? "border-destructive/40" : ""}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">Subgraph Health</CardTitle>
            <Network className={`h-4 w-4 ${criticalAlerts.length > 0 ? "text-destructive/60" : "text-green-500/60"}`} />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {isSummaryLoading ? <Skeleton className="h-8 w-16 mb-1" /> : (
              <>
                <div className="text-2xl font-bold">{healthPct}%</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {summary?.healthySubgraphs}/{summary?.totalSubgraphs} healthy
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Secondary KPIs */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-3">
        <Card className="sm:col-span-1">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-chart-1/10 flex items-center justify-center shrink-0">
              <Zap className="w-5 h-5 text-chart-1" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Monthly Operations</p>
              {isSummaryLoading ? <Skeleton className="h-6 w-24 mt-1" /> : (
                <p className="text-lg font-bold">{(summary?.totalMonthlyOperations ?? 0).toLocaleString()}</p>
              )}
            </div>
          </CardContent>
        </Card>
        <Card className="sm:col-span-1">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-chart-2/10 flex items-center justify-center shrink-0">
              <CreditCard className="w-5 h-5 text-chart-2" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">ARR</p>
              {isSummaryLoading ? <Skeleton className="h-6 w-24 mt-1" /> : (
                <p className="text-lg font-bold">${((summary?.monthlyRevenue ?? 0) * 12).toLocaleString()}</p>
              )}
            </div>
          </CardContent>
        </Card>
        <Card className="sm:col-span-1">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-chart-3/10 flex items-center justify-center shrink-0">
              <ArrowUpRight className="w-5 h-5 text-chart-3" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Churned This Month</p>
              {isSummaryLoading ? <Skeleton className="h-6 w-16 mt-1" /> : (
                <p className="text-lg font-bold">{summary?.churnedOrgsThisMonth ?? 0}</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts Panel */}
      {!alertsLoading && alerts.length > 0 && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-destructive" />
                <CardTitle className="text-sm text-destructive">Active Alerts</CardTitle>
              </div>
              <div className="flex gap-2">
                {criticalAlerts.length > 0 && (
                  <Badge variant="destructive" className="text-xs">{criticalAlerts.length} Critical</Badge>
                )}
                {warningAlerts.length > 0 && (
                  <Badge className="text-xs bg-amber-500/20 text-amber-400 border-amber-500/30">{warningAlerts.length} Warning</Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            {alerts.slice(0, 4).map((alert) => (
              <div key={alert.id} className={`flex items-start gap-3 p-3 rounded-lg border ${
                alert.severity === "critical" ? "bg-destructive/10 border-destructive/20" : "bg-amber-500/5 border-amber-500/20"
              }`}>
                {alert.severity === "critical"
                  ? <ServerCrash className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                  : <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{alert.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{alert.description}</p>
                </div>
                {alert.orgName && (
                  <span className="text-xs text-muted-foreground font-mono shrink-0 hidden sm:block">{alert.orgName}</span>
                )}
              </div>
            ))}
            {alerts.length > 4 && (
              <p className="text-xs text-muted-foreground text-center pt-1">
                + {alerts.length - 4} more alert{alerts.length - 4 !== 1 ? "s" : ""}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Platform Operations</CardTitle>
                <CardDescription className="text-xs mt-0.5">Request volume and errors — {period}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pl-2 pr-4">
            {isMetricsLoading ? <Skeleton className="h-[260px] w-full" /> : (
              <div className="h-[260px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={metrics} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                    <defs>
                      <linearGradient id="colorOps" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorErrors" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(v) => format(new Date(v), period === "90d" ? "MMM d" : "d MMM")}
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "var(--radius)", fontSize: 12 }}
                      itemStyle={{ color: "hsl(var(--foreground))" }}
                      labelStyle={{ color: "hsl(var(--muted-foreground))", marginBottom: 2 }}
                    />
                    <Area type="monotone" dataKey="operations" name="Operations" stroke="hsl(var(--primary))" strokeWidth={2} fillOpacity={1} fill="url(#colorOps)" />
                    <Area type="monotone" dataKey="errors" name="Errors" stroke="hsl(var(--destructive))" strokeWidth={1.5} fillOpacity={1} fill="url(#colorErrors)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-base">Plan Distribution</CardTitle>
            <CardDescription className="text-xs">Revenue by subscription tier</CardDescription>
          </CardHeader>
          <CardContent>
            {isPlanLoading ? <Skeleton className="h-[260px] w-full" /> : (
              <div>
                <div className="h-[180px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={planBreakdown} cx="50%" cy="50%" innerRadius={55} outerRadius={75} paddingAngle={4} dataKey="revenue" nameKey="planName">
                        {planBreakdown?.map((_entry, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(v: number) => [`$${v.toLocaleString()}`, "Revenue"]}
                        contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "var(--radius)", fontSize: 12 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2 mt-2">
                  {planBreakdown?.map((entry, i) => (
                    <div key={entry.planSlug} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        <span className="text-muted-foreground">{entry.planName}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs font-mono">
                        <span className="text-muted-foreground">{entry.orgCount} org{entry.orgCount !== 1 ? "s" : ""}</span>
                        <span className="font-semibold text-foreground">${entry.revenue.toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Latency chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">p99 Latency Trend</CardTitle>
          <CardDescription className="text-xs">99th percentile request latency across all subgraphs (ms)</CardDescription>
        </CardHeader>
        <CardContent className="pl-2 pr-4">
          {isMetricsLoading ? <Skeleton className="h-[160px] w-full" /> : (
            <div className="h-[160px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics} margin={{ top: 4, right: 4, bottom: 0, left: 0 }} barSize={period === "90d" ? 3 : period === "30d" ? 6 : 12}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tickFormatter={(v) => format(new Date(v), "d")} stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} unit="ms" />
                  <Tooltip
                    contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "var(--radius)", fontSize: 12 }}
                    formatter={(v: number) => [`${v}ms`, "p99 Latency"]}
                  />
                  <Bar dataKey="p99Latency" name="p99 Latency" fill="hsl(var(--chart-3))" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Recent Activity</CardTitle>
            <CardDescription className="text-xs">Latest platform events</CardDescription>
          </div>
          <Link href="/activity">
            <Button variant="ghost" size="sm" className="text-xs gap-1">
              View all <LinkIcon className="w-3 h-3" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {isActivityLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : (
            <div className="space-y-0 divide-y divide-border">
              {activity?.map((event) => (
                <div key={event.id} className="flex items-start gap-3 py-3">
                  <div className={`p-1.5 rounded-full mt-0.5 shrink-0 ${
                    event.type.includes("degraded") || event.type.includes("suspended") || event.type.includes("cancelled")
                      ? "bg-destructive/10 text-destructive"
                      : event.type.includes("published") || event.type.includes("upgraded") || event.type.includes("created")
                      ? "bg-green-500/10 text-green-400"
                      : "bg-primary/10 text-primary"
                  }`}>
                    {event.type.includes("degraded") || event.type.includes("cancelled")
                      ? <ServerCrash className="w-3.5 h-3.5" />
                      : event.type.includes("org") ? <Building2 className="w-3.5 h-3.5" />
                      : event.type.includes("user") ? <Users className="w-3.5 h-3.5" />
                      : event.type.includes("plan") ? <CreditCard className="w-3.5 h-3.5" />
                      : <ActivityIcon className="w-3.5 h-3.5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-snug truncate">{event.description}</p>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      <span>{format(new Date(event.createdAt), "MMM d, h:mm a")}</span>
                      {event.orgName && (
                        <>
                          <span>·</span>
                          <span className="truncate">{event.orgName}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={`text-xs font-mono shrink-0 hidden sm:inline-flex ${
                      event.type.includes("degraded") || event.type.includes("cancelled") || event.type.includes("suspended")
                        ? "border-destructive/30 text-destructive"
                        : event.type.includes("published") || event.type.includes("upgraded") || event.type.includes("created")
                        ? "border-green-500/30 text-green-400"
                        : "border-primary/30 text-primary"
                    }`}
                  >
                    {event.type.replace(/_/g, " ")}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
