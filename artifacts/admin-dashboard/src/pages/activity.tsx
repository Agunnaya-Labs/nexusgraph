import { useListActivity, getListActivityQueryKey, useListOrganizations, getListOrganizationsQueryKey } from "@workspace/api-client-react";
import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Building2, Users, Network, Activity as ActivityIcon, ServerCrash, CreditCard, Search, Filter } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

const EVENT_TYPES = [
  { value: "all", label: "All Events" },
  { value: "subgraph_published", label: "Schema Published" },
  { value: "subgraph_degraded", label: "Subgraph Degraded" },
  { value: "org_created", label: "Org Created" },
  { value: "org_cancelled", label: "Org Cancelled" },
  { value: "user_created", label: "User Created" },
  { value: "user_suspended", label: "User Suspended" },
  { value: "plan_upgraded", label: "Plan Upgraded" },
  { value: "plan_downgraded", label: "Plan Downgraded" },
];

export default function Activity() {
  const [orgFilter, setOrgFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const { data: orgsData } = useListOrganizations({}, { query: { queryKey: getListOrganizationsQueryKey() } });

  const { data, isLoading } = useListActivity(
    { limit: 100, orgId: orgFilter === "all" ? null : Number(orgFilter) },
    { query: { queryKey: getListActivityQueryKey({ limit: 100, orgId: orgFilter === "all" ? null : Number(orgFilter) }) } }
  );

  const getEventIcon = (type: string) => {
    if (type.includes("degraded") || type.includes("cancelled")) return <ServerCrash className="w-4 h-4" />;
    if (type.includes("org")) return <Building2 className="w-4 h-4" />;
    if (type.includes("user")) return <Users className="w-4 h-4" />;
    if (type.includes("plan")) return <CreditCard className="w-4 h-4" />;
    if (type.includes("subgraph")) return <Network className="w-4 h-4" />;
    return <ActivityIcon className="w-4 h-4" />;
  };

  const getEventSeverity = (type: string) => {
    if (type.includes("degraded") || type.includes("suspended") || type.includes("cancelled")) return "destructive";
    if (type.includes("published") || type.includes("upgraded") || type.includes("created")) return "positive";
    return "neutral";
  };

  const severityClasses = {
    destructive: "bg-destructive/10 text-destructive border-destructive/20",
    positive: "bg-green-500/10 text-green-400 border-green-500/20",
    neutral: "bg-primary/10 text-primary border-primary/20",
  };

  const filtered = (data ?? []).filter((event) => {
    if (typeFilter !== "all" && event.type !== typeFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        event.description.toLowerCase().includes(q) ||
        (event.orgName?.toLowerCase().includes(q) ?? false) ||
        (event.userName?.toLowerCase().includes(q) ?? false)
      );
    }
    return true;
  });

  const criticalCount = (data ?? []).filter((e) => getEventSeverity(e.type) === "destructive").length;
  const positiveCount = (data ?? []).filter((e) => getEventSeverity(e.type) === "positive").length;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Audit Log</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Platform-wide activity feed and events</p>
        </div>
        <div className="flex items-center gap-2">
          {criticalCount > 0 && (
            <Badge variant="destructive" className="text-xs">{criticalCount} incidents</Badge>
          )}
          <Badge className="bg-green-500/10 text-green-400 border-green-500/20 text-xs">{positiveCount} deployments</Badge>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-0">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search events..."
                className="pl-9 bg-background/50 h-9 text-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={orgFilter} onValueChange={setOrgFilter}>
              <SelectTrigger className="w-full sm:w-[200px] h-9 text-sm">
                <Filter className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
                <SelectValue placeholder="All Organizations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Organizations</SelectItem>
                {orgsData?.organizations.map((org) => (
                  <SelectItem key={org.id} value={String(org.id)}>{org.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-[200px] h-9 text-sm">
                <SelectValue placeholder="All Events" />
              </SelectTrigger>
              <SelectContent>
                {EVENT_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent className="pt-4">
          {isLoading ? (
            <div className="space-y-6">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex gap-4">
                  <Skeleton className="w-9 h-9 rounded-full shrink-0" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <ActivityIcon className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No activity events match your filters.</p>
            </div>
          ) : (
            <div className="relative">
              <div className="absolute left-[18px] top-0 bottom-0 w-px bg-gradient-to-b from-border via-border to-transparent" />
              <div className="space-y-0">
                {filtered.map((event, i) => {
                  const severity = getEventSeverity(event.type);
                  return (
                    <div key={event.id} className={`relative flex items-start gap-4 py-4 ${i < filtered.length - 1 ? "border-b border-border/50" : ""}`}>
                      <div className={`flex items-center justify-center w-9 h-9 rounded-full border shrink-0 z-10 bg-background ${severityClasses[severity]}`}>
                        {getEventIcon(event.type)}
                      </div>
                      <div className="flex-1 min-w-0 pt-0.5">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1">
                          <p className="text-sm font-medium leading-snug">{event.description}</p>
                          <div className="flex items-center gap-2 shrink-0">
                            <time className="text-xs text-muted-foreground font-mono whitespace-nowrap">
                              {format(new Date(event.createdAt), "MMM d, HH:mm")}
                            </time>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 mt-1.5">
                          <Badge
                            variant="outline"
                            className={`text-xs font-mono px-1.5 py-0 ${severityClasses[severity]}`}
                          >
                            {event.type.replace(/_/g, " ")}
                          </Badge>
                          {event.orgName && (
                            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                              <Building2 className="w-3 h-3" /> {event.orgName}
                            </span>
                          )}
                          {event.userName && (
                            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                              <Users className="w-3 h-3" /> {event.userName}
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground ml-auto hidden sm:block">
                            {formatDistanceToNow(new Date(event.createdAt), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {filtered.length > 0 && (
            <p className="text-xs text-muted-foreground text-center pt-4 border-t border-border mt-4">
              Showing {filtered.length} event{filtered.length !== 1 ? "s" : ""}
              {search || typeFilter !== "all" || orgFilter !== "all" ? " (filtered)" : ""}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
