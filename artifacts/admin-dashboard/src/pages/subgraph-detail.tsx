import { useGetSubgraph, getGetSubgraphQueryKey, useUpdateSubgraph, usePublishSubgraph } from "@workspace/api-client-react";
import { useParams, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ArrowLeft, Loader2, Network, Activity, Clock, ShieldAlert, CheckCircle2, History } from "lucide-react";
import { format } from "date-fns";
import { useState, useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const publishSchema = z.object({
  schemaVersion: z.string().min(1, "Schema version is required"),
  changelog: z.string().optional(),
});

type PublishFormValues = z.infer<typeof publishSchema>;

export default function SubgraphDetail() {
  const { id } = useParams<{ id: string }>();
  const subgraphId = Number(id);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: subgraph, isLoading } = useGetSubgraph(subgraphId, { query: { enabled: !!subgraphId, queryKey: getGetSubgraphQueryKey(subgraphId) } });

  const updateMutation = useUpdateSubgraph();
  const publishMutation = usePublishSubgraph();

  const [editName, setEditName] = useState("");
  const [editUrl, setEditUrl] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [isPublishOpen, setIsPublishOpen] = useState(false);

  const initRef = useRef<number | null>(null);

  useEffect(() => {
    if (subgraph && initRef.current !== subgraph.id) {
      initRef.current = subgraph.id;
      setEditName(subgraph.name);
      setEditUrl(subgraph.url);
      setEditDescription(subgraph.description || "");
    }
  }, [subgraph]);

  const form = useForm<PublishFormValues>({
    resolver: zodResolver(publishSchema),
    defaultValues: {
      schemaVersion: "",
      changelog: "",
    },
  });

  const handleUpdate = () => {
    updateMutation.mutate({ id: subgraphId, data: { name: editName, url: editUrl, description: editDescription } }, {
      onSuccess: () => {
        toast({ title: "Subgraph updated successfully" });
        queryClient.invalidateQueries({ queryKey: getGetSubgraphQueryKey(subgraphId) });
      },
      onError: (err: any) => {
        toast({ title: "Failed to update", description: err?.error || "Unknown error", variant: "destructive" });
      }
    });
  };

  const onPublish = (values: PublishFormValues) => {
    publishMutation.mutate({ id: subgraphId, data: values }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetSubgraphQueryKey(subgraphId) });
        setIsPublishOpen(false);
        form.reset();
        toast({ title: "Schema published successfully" });
      },
      onError: (error: any) => {
        toast({ title: "Failed to publish schema", description: error?.error || "Unknown error", variant: "destructive" });
      }
    });
  };

  // Mock data for charts
  const mockMetrics = Array.from({ length: 24 }).map((_, i) => ({
    time: `${i}:00`,
    ops: Math.floor(Math.random() * 5000) + 1000,
    errors: Math.floor(Math.random() * 50),
    latency: Math.floor(Math.random() * 100) + 20,
  }));

  if (isLoading) {
    return <div className="space-y-6"><Skeleton className="h-24 w-full" /><Skeleton className="h-[400px] w-full" /></div>;
  }

  if (!subgraph) {
    return <div>Subgraph not found</div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/subgraphs">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">{subgraph.name}</h1>
              <Badge variant="outline" className="flex items-center gap-1">
                <div className={`w-2 h-2 rounded-full ${
                  subgraph.status === 'healthy' ? 'bg-green-500' : 
                  subgraph.status === 'degraded' ? 'bg-yellow-500' : 'bg-red-500'
                }`} />
                <span className="capitalize">{subgraph.status}</span>
              </Badge>
            </div>
            <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
              <Link href={`/organizations/${subgraph.orgId}`} className="hover:underline">
                {subgraph.orgName}
              </Link>
              <span>•</span>
              <span className="font-mono text-xs">{subgraph.url}</span>
            </div>
          </div>
        </div>

        <Dialog open={isPublishOpen} onOpenChange={setIsPublishOpen}>
          <DialogTrigger asChild>
            <Button>Publish Schema</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Publish New Schema Version</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onPublish)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="schemaVersion"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Version Tag</FormLabel>
                      <FormControl>
                        <Input placeholder="v1.2.3" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="changelog"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Changelog (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Added new user fields" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end pt-4">
                  <Button type="submit" disabled={publishMutation.isPending}>
                    {publishMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Publish
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        <Card className="md:col-span-3">
          <Tabs defaultValue="metrics" className="w-full">
            <div className="px-6 pt-6 pb-2 border-b border-border">
              <TabsList className="w-full justify-start bg-transparent h-auto p-0">
                <TabsTrigger value="metrics" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 py-2">Metrics</TabsTrigger>
                <TabsTrigger value="schema" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 py-2">Schema History</TabsTrigger>
                <TabsTrigger value="settings" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 py-2">Settings</TabsTrigger>
              </TabsList>
            </div>
            
            <TabsContent value="metrics" className="p-6 m-0 space-y-6">
              <div className="grid gap-4 md:grid-cols-3">
                <Card className="bg-muted/30">
                  <CardHeader className="pb-2 flex flex-row items-center justify-between">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Operations (24h)</CardTitle>
                    <Activity className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold font-mono">{subgraph.operationCount.toLocaleString()}</div>
                  </CardContent>
                </Card>
                <Card className="bg-muted/30">
                  <CardHeader className="pb-2 flex flex-row items-center justify-between">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Error Rate</CardTitle>
                    <ShieldAlert className={`h-4 w-4 ${subgraph.errorRate > 5 ? 'text-destructive' : 'text-muted-foreground'}`} />
                  </CardHeader>
                  <CardContent>
                    <div className={`text-3xl font-bold font-mono ${subgraph.errorRate > 5 ? 'text-destructive' : ''}`}>{subgraph.errorRate}%</div>
                  </CardContent>
                </Card>
                <Card className="bg-muted/30">
                  <CardHeader className="pb-2 flex flex-row items-center justify-between">
                    <CardTitle className="text-sm font-medium text-muted-foreground">p99 Latency</CardTitle>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className={`text-3xl font-bold font-mono ${subgraph.p99Latency > 500 ? 'text-yellow-500' : ''}`}>{subgraph.p99Latency}ms</div>
                  </CardContent>
                </Card>
              </div>

              <div className="h-[300px] w-full mt-6">
                <h3 className="text-sm font-medium mb-4">Operations & Latency</h3>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={mockMetrics}>
                    <defs>
                      <linearGradient id="colorOps" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="time" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis yAxisId="left" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--chart-2))" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: 'var(--radius)' }}
                    />
                    <Area yAxisId="left" type="monotone" dataKey="ops" stroke="hsl(var(--primary))" fill="url(#colorOps)" />
                    <Area yAxisId="right" type="monotone" dataKey="latency" stroke="hsl(var(--chart-2))" fill="none" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </TabsContent>

            <TabsContent value="schema" className="p-6 m-0">
              <div className="space-y-6">
                <div className="flex items-start gap-4 p-4 rounded-lg border border-border bg-muted/20">
                  <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" />
                  <div>
                    <h4 className="font-medium">Current Version: {subgraph.schemaVersion || 'None'}</h4>
                    <p className="text-sm text-muted-foreground mt-1">Published {subgraph.lastPublishedAt ? format(new Date(subgraph.lastPublishedAt), 'MMM dd, yyyy HH:mm') : 'Never'}</p>
                  </div>
                </div>

                <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
                  {/* Mock history since it's not in the API yet */}
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full border border-border bg-background shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm">
                        <History className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded border border-border bg-card shadow-sm">
                        <div className="flex items-center justify-between mb-1">
                          <div className="font-bold font-mono text-sm">v1.0.{4-i}</div>
                          <time className="text-xs text-muted-foreground">Oct {15-i}, 2023</time>
                        </div>
                        <div className="text-sm text-muted-foreground">Automated schema publishing.</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="settings" className="p-6 m-0">
              <div className="max-w-md space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Subgraph Name</label>
                    <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Routing URL</label>
                    <Input value={editUrl} onChange={(e) => setEditUrl(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Description</label>
                    <Input value={editDescription} onChange={(e) => setEditDescription(e.target.value)} />
                  </div>
                  <Button onClick={handleUpdate} disabled={updateMutation.isPending || (editName === subgraph.name && editUrl === subgraph.url && editDescription === (subgraph.description || ""))}>
                    {updateMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Save Changes
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Subgraph Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <div className="text-muted-foreground mb-1">ID</div>
                <div className="font-mono">{subgraph.id}</div>
              </div>
              <div>
                <div className="text-muted-foreground mb-1">Created At</div>
                <div className="font-mono">{format(new Date(subgraph.createdAt), 'MMM dd, yyyy')}</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
