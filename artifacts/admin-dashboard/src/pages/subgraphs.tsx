import { useState } from "react";
import { Link } from "wouter";
import { useListSubgraphs, getListSubgraphsQueryKey, useCreateSubgraph, useListOrganizations, getListOrganizationsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import {
  Search, Plus, Network, Loader2, ArrowRight, CheckCircle2, AlertTriangle,
  ServerCrash, HelpCircle, Zap, Clock, Activity, RefreshCw
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

const createSubgraphSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  url: z.string().url("Must be a valid URL"),
  orgId: z.coerce.number().min(1, "Please select an organization"),
  description: z.string().optional(),
});

type CreateSubgraphFormValues = z.infer<typeof createSubgraphSchema>;

function StatusDot({ status }: { status: string }) {
  if (status === "healthy") return (
    <span className="flex items-center gap-1.5 text-green-400 text-sm">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-60" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400" />
      </span>
      Healthy
    </span>
  );
  if (status === "degraded") return (
    <span className="flex items-center gap-1.5 text-amber-400 text-sm">
      <AlertTriangle className="w-3.5 h-3.5" /> Degraded
    </span>
  );
  if (status === "unreachable") return (
    <span className="flex items-center gap-1.5 text-destructive text-sm">
      <ServerCrash className="w-3.5 h-3.5" /> Unreachable
    </span>
  );
  return (
    <span className="flex items-center gap-1.5 text-muted-foreground text-sm">
      <HelpCircle className="w-3.5 h-3.5" /> Unknown
    </span>
  );
}

function ErrorRateBar({ rate }: { rate: number }) {
  const color = rate > 5 ? "bg-destructive" : rate > 2 ? "bg-amber-500" : "bg-green-500";
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(rate * 10, 100)}%` }} />
      </div>
      <span className={`font-mono text-xs ${rate > 5 ? "text-destructive font-bold" : rate > 2 ? "text-amber-400" : "text-muted-foreground"}`}>
        {rate.toFixed(1)}%
      </span>
    </div>
  );
}

export default function Subgraphs() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading, dataUpdatedAt } = useListSubgraphs(
    { status: statusFilter === "all" ? null : statusFilter },
    {
      query: {
        queryKey: getListSubgraphsQueryKey({ status: statusFilter === "all" ? null : statusFilter }),
        refetchInterval: 30_000,
      }
    }
  );

  const { data: orgs } = useListOrganizations({}, { query: { queryKey: getListOrganizationsQueryKey() } });
  const createMutation = useCreateSubgraph();

  const form = useForm<CreateSubgraphFormValues>({
    resolver: zodResolver(createSubgraphSchema),
    defaultValues: { name: "", url: "", orgId: undefined, description: "" },
  });

  const onSubmit = (values: CreateSubgraphFormValues) => {
    createMutation.mutate({ data: values }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListSubgraphsQueryKey() });
        setIsCreateOpen(false);
        form.reset();
        toast({ title: "Subgraph registered successfully" });
      },
      onError: (error: any) => {
        toast({
          title: "Failed to register subgraph",
          description: error?.error || "Unknown error occurred",
          variant: "destructive",
        });
      },
    });
  };

  const filteredSubgraphs = (data ?? []).filter(
    (sub) =>
      sub.name.toLowerCase().includes(search.toLowerCase()) ||
      sub.orgName.toLowerCase().includes(search.toLowerCase())
  );

  const healthyCount = (data ?? []).filter((s) => s.status === "healthy").length;
  const degradedCount = (data ?? []).filter((s) => s.status === "degraded").length;
  const unreachableCount = (data ?? []).filter((s) => s.status === "unreachable").length;
  const total = data?.length ?? 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Subgraphs</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Federated GraphQL schemas across all tenants</p>
        </div>
        <div className="flex items-center gap-2">
          {dataUpdatedAt > 0 && (
            <span className="text-xs text-muted-foreground flex items-center gap-1 hidden sm:flex">
              <RefreshCw className="w-3 h-3" />
              Updated {formatDistanceToNow(dataUpdatedAt, { addSuffix: true })}
            </span>
          )}
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="w-4 h-4" /> Register Subgraph
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Register New Subgraph</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subgraph Name</FormLabel>
                      <FormControl><Input placeholder="users-api" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="url" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Routing URL</FormLabel>
                      <FormControl><Input placeholder="https://api.acme.com/graphql" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="orgId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Organization</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value ? String(field.value) : undefined}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Select an organization" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {orgs?.organizations.map((org) => (
                            <SelectItem key={org.id} value={String(org.id)}>{org.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="description" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl><Input placeholder="Handles user auth and profiles" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <div className="flex justify-end pt-2">
                    <Button type="submit" disabled={createMutation.isPending}>
                      {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Register Subgraph
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Health summary bar */}
      {total > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card">
            <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" />
            <div>
              <p className="text-xl font-bold">{healthyCount}</p>
              <p className="text-xs text-muted-foreground">Healthy</p>
            </div>
          </div>
          <div className={`flex items-center gap-3 p-3 rounded-lg border ${degradedCount > 0 ? "border-amber-500/30 bg-amber-500/5" : "border-border bg-card"}`}>
            <AlertTriangle className={`w-5 h-5 shrink-0 ${degradedCount > 0 ? "text-amber-400" : "text-muted-foreground"}`} />
            <div>
              <p className="text-xl font-bold">{degradedCount}</p>
              <p className="text-xs text-muted-foreground">Degraded</p>
            </div>
          </div>
          <div className={`flex items-center gap-3 p-3 rounded-lg border ${unreachableCount > 0 ? "border-destructive/30 bg-destructive/5" : "border-border bg-card"}`}>
            <ServerCrash className={`w-5 h-5 shrink-0 ${unreachableCount > 0 ? "text-destructive" : "text-muted-foreground"}`} />
            <div>
              <p className="text-xl font-bold">{unreachableCount}</p>
              <p className="text-xs text-muted-foreground">Unreachable</p>
            </div>
          </div>
        </div>
      )}

      <Card>
        <CardHeader className="pb-0">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search subgraphs..."
                className="pl-9 bg-background/50 h-9 text-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[160px] h-9 text-sm">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="healthy">Healthy</SelectItem>
                <SelectItem value="degraded">Degraded</SelectItem>
                <SelectItem value="unreachable">Unreachable</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent className="p-0 mt-4">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subgraph</TableHead>
                  <TableHead className="hidden md:table-cell">Organization</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden sm:table-cell">Error Rate</TableHead>
                  <TableHead className="hidden lg:table-cell">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> p99</span>
                  </TableHead>
                  <TableHead className="hidden lg:table-cell">
                    <span className="flex items-center gap-1"><Activity className="w-3 h-3" /> Ops</span>
                  </TableHead>
                  <TableHead className="hidden xl:table-cell">Published</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center">
                      <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : filteredSubgraphs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center text-muted-foreground text-sm">
                      No subgraphs found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSubgraphs.map((subgraph) => (
                    <TableRow key={subgraph.id} className="group hover:bg-muted/30 transition-colors">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                            subgraph.status === "healthy" ? "bg-green-500/10 text-green-400" :
                            subgraph.status === "degraded" ? "bg-amber-500/10 text-amber-400" :
                            "bg-destructive/10 text-destructive"
                          }`}>
                            <Network className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="font-medium text-sm">{subgraph.name}</div>
                            <div className="text-xs text-muted-foreground font-mono">
                              {subgraph.schemaVersion || "no schema"}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <span className="text-sm text-muted-foreground">{subgraph.orgName}</span>
                      </TableCell>
                      <TableCell>
                        <StatusDot status={subgraph.status} />
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <ErrorRateBar rate={subgraph.errorRate} />
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <span className={`font-mono text-xs ${subgraph.p99Latency > 300 ? "text-amber-400" : "text-muted-foreground"}`}>
                          {subgraph.p99Latency}ms
                        </span>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <span className="font-mono text-xs text-muted-foreground">
                          {(subgraph.operationCount / 1000).toFixed(1)}k
                        </span>
                      </TableCell>
                      <TableCell className="hidden xl:table-cell">
                        <span className="text-xs text-muted-foreground">
                          {subgraph.lastPublishedAt
                            ? formatDistanceToNow(new Date(subgraph.lastPublishedAt), { addSuffix: true })
                            : "Never"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Link href={`/subgraphs/${subgraph.id}`}>
                          <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                            <ArrowRight className="h-3.5 w-3.5" />
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
