import { useGetOrganization, getGetOrganizationQueryKey, useUpdateOrganization, useListUsers, getListUsersQueryKey, useListSubgraphs, getListSubgraphsQueryKey, useGetSubscription, getGetSubscriptionQueryKey } from "@workspace/api-client-react";
import { useParams, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Building2, Users, Network, Settings, ExternalLink, ArrowLeft, Save, Loader2, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { useState, useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

export default function OrganizationDetail() {
  const { id } = useParams<{ id: string }>();
  const orgId = Number(id);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: org, isLoading: isOrgLoading } = useGetOrganization(orgId, { query: { enabled: !!orgId, queryKey: getGetOrganizationQueryKey(orgId) } });
  const { data: sub, isLoading: isSubLoading } = useGetSubscription(orgId, { query: { enabled: !!orgId, queryKey: getGetSubscriptionQueryKey(orgId) } });
  const { data: usersData, isLoading: isUsersLoading } = useListUsers({ orgId }, { query: { enabled: !!orgId, queryKey: getListUsersQueryKey({ orgId }) } });
  const { data: subgraphsData, isLoading: isSubgraphsLoading } = useListSubgraphs({ orgId }, { query: { enabled: !!orgId, queryKey: getListSubgraphsQueryKey({ orgId }) } });

  const updateMutation = useUpdateOrganization();
  const [editName, setEditName] = useState("");
  const [editDomain, setEditDomain] = useState("");

  const initRef = useRef<number | null>(null);

  useEffect(() => {
    if (org && initRef.current !== org.id) {
      initRef.current = org.id;
      setEditName(org.name);
      setEditDomain(org.domain || "");
    }
  }, [org]);

  const handleUpdate = () => {
    updateMutation.mutate({ id: orgId, data: { name: editName, domain: editDomain } }, {
      onSuccess: () => {
        toast({ title: "Organization updated successfully" });
        queryClient.invalidateQueries({ queryKey: getGetOrganizationQueryKey(orgId) });
      },
      onError: (err: any) => {
        toast({ title: "Failed to update", description: err?.error || "Unknown error", variant: "destructive" });
      }
    });
  };

  if (isOrgLoading) {
    return <div className="space-y-6"><Skeleton className="h-24 w-full" /><Skeleton className="h-[400px] w-full" /></div>;
  }

  if (!org) {
    return <div>Organization not found</div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-4">
        <Link href="/organizations">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">{org.name}</h1>
            <Badge variant={org.status === 'active' ? 'default' : 'secondary'}>{org.status}</Badge>
            <Badge variant="outline">{org.planName}</Badge>
          </div>
          <p className="text-muted-foreground mt-1 font-mono text-sm">{org.slug}</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        <Card className="md:col-span-3">
          <Tabs defaultValue="overview" className="w-full">
            <div className="px-6 pt-6 pb-2 border-b border-border">
              <TabsList className="w-full justify-start bg-transparent h-auto p-0">
                <TabsTrigger value="overview" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 py-2">Overview</TabsTrigger>
                <TabsTrigger value="users" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 py-2">Users</TabsTrigger>
                <TabsTrigger value="subgraphs" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 py-2">Subgraphs</TabsTrigger>
                <TabsTrigger value="settings" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 py-2">Settings</TabsTrigger>
              </TabsList>
            </div>
            
            <TabsContent value="overview" className="p-6 m-0">
              <div className="grid gap-4 md:grid-cols-3">
                <Card className="bg-muted/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold font-mono">{org.userCount}</div>
                  </CardContent>
                </Card>
                <Card className="bg-muted/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Subgraphs</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold font-mono">{org.subgraphCount}</div>
                  </CardContent>
                </Card>
                <Card className="bg-muted/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Monthly Operations</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold font-mono">{(org.monthlyOperations / 1000).toFixed(1)}k</div>
                  </CardContent>
                </Card>
              </div>

              <div className="mt-8">
                <h3 className="text-lg font-semibold mb-4">Subscription Details</h3>
                {isSubLoading ? <Skeleton className="h-32 w-full" /> : sub && (
                  <div className="rounded-lg border border-border bg-card p-4 space-y-4">
                    <div className="flex justify-between items-center pb-4 border-b border-border">
                      <div>
                        <div className="font-medium text-lg">{sub.plan.name} Plan</div>
                        <div className="text-sm text-muted-foreground">Renews on {format(new Date(sub.currentPeriodEnd), 'MMM dd, yyyy')}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-xl">${sub.plan.priceMonthly}<span className="text-sm text-muted-foreground font-normal">/mo</span></div>
                        <Badge variant={sub.status === 'active' ? 'default' : 'destructive'}>{sub.status}</Badge>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-muted-foreground">Users Limit</div>
                        <div className="font-medium">{org.userCount} / {sub.plan.maxUsers || 'Unlimited'}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Subgraphs Limit</div>
                        <div className="font-medium">{org.subgraphCount} / {sub.plan.maxSubgraphs || 'Unlimited'}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="users" className="p-0 m-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Active</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isUsersLoading ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></TableCell></TableRow>
                  ) : usersData?.users.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No users found.</TableCell></TableRow>
                  ) : (
                    usersData?.users.map(user => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="font-medium">{user.name}</div>
                          <div className="text-xs text-muted-foreground">{user.email}</div>
                        </TableCell>
                        <TableCell><Badge variant="outline" className="capitalize">{user.role}</Badge></TableCell>
                        <TableCell><Badge variant={user.status === 'active' ? 'default' : 'secondary'} className="capitalize">{user.status}</Badge></TableCell>
                        <TableCell className="text-sm text-muted-foreground">{user.lastActiveAt ? format(new Date(user.lastActiveAt), 'MMM dd, yyyy') : 'Never'}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="subgraphs" className="p-0 m-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Subgraph</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Operations</TableHead>
                    <TableHead className="text-right">Error Rate</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isSubgraphsLoading ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></TableCell></TableRow>
                  ) : (subgraphsData ?? []).length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No subgraphs found.</TableCell></TableRow>
                  ) : (
                    (subgraphsData ?? []).map((subgraph) => (
                      <TableRow key={subgraph.id} className="group cursor-pointer">
                        <TableCell>
                          <div className="font-medium">{subgraph.name}</div>
                          <div className="text-xs text-muted-foreground font-mono">{subgraph.url}</div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${subgraph.status === 'healthy' ? 'bg-green-500' : 'bg-red-500'}`} />
                            <span className="capitalize text-sm">{subgraph.status}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">{subgraph.operationCount}</TableCell>
                        <TableCell className="text-right font-mono text-sm">{subgraph.errorRate}%</TableCell>
                        <TableCell className="text-right">
                          <Link href={`/subgraphs/${subgraph.id}`}>
                            <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                              <ArrowRight className="h-4 w-4" />
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="settings" className="p-6 m-0">
              <div className="max-w-md space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Organization Name</label>
                    <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Custom Domain</label>
                    <Input value={editDomain} onChange={(e) => setEditDomain(e.target.value)} placeholder="e.g. api.acme.com" />
                  </div>
                  <Button onClick={handleUpdate} disabled={updateMutation.isPending || (editName === org.name && editDomain === (org.domain || ""))}>
                    {updateMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Save Changes
                  </Button>
                </div>

                <div className="pt-6 border-t border-border">
                  <h4 className="text-sm font-semibold text-destructive mb-2">Danger Zone</h4>
                  <Button variant="destructive" disabled>Suspend Organization</Button>
                  <p className="text-xs text-muted-foreground mt-2">Suspending an organization blocks all API traffic and access to the dashboard.</p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Metadata</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <div className="text-muted-foreground mb-1">Created At</div>
                <div className="font-mono">{format(new Date(org.createdAt), 'MMM dd, yyyy HH:mm')}</div>
              </div>
              <div>
                <div className="text-muted-foreground mb-1">Organization ID</div>
                <div className="font-mono">{org.id}</div>
              </div>
              <div>
                <div className="text-muted-foreground mb-1">Status</div>
                <Badge variant={org.status === 'active' ? 'default' : 'secondary'} className="capitalize">{org.status}</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
