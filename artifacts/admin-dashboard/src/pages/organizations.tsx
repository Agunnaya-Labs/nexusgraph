import { useState } from "react";
import { Link } from "wouter";
import { useListOrganizations, getListOrganizationsQueryKey, useCreateOrganization, useListBillingPlans, getListBillingPlansQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Search, Plus, Building2, Loader2, ArrowRight, Users, Network, Globe } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

const createOrgSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  slug: z.string().min(2, "Slug must be at least 2 characters").regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric and hyphens only"),
  domain: z.string().optional(),
  planId: z.coerce.number().min(1, "Please select a plan"),
});

type CreateOrgFormValues = z.infer<typeof createOrgSchema>;

const statusVariant: Record<string, string> = {
  active: "bg-green-500/10 text-green-400 border-green-500/20",
  suspended: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  cancelled: "bg-destructive/10 text-destructive border-destructive/20",
};

export default function Organizations() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [planFilter, setPlanFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useListOrganizations(
    { status: statusFilter === "all" ? null : statusFilter },
    { query: { queryKey: getListOrganizationsQueryKey({ status: statusFilter === "all" ? null : statusFilter }) } }
  );
  const { data: plans } = useListBillingPlans({ query: { queryKey: getListBillingPlansQueryKey() } });

  const createMutation = useCreateOrganization();

  const form = useForm<CreateOrgFormValues>({
    resolver: zodResolver(createOrgSchema),
    defaultValues: { name: "", slug: "", domain: "", planId: 1 },
  });

  const onSubmit = (values: CreateOrgFormValues) => {
    createMutation.mutate({ data: values }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListOrganizationsQueryKey() });
        setIsCreateOpen(false);
        form.reset();
        toast({ title: "Organization created successfully" });
      },
      onError: (error: any) => {
        toast({
          title: "Failed to create organization",
          description: error?.error || "Unknown error occurred",
          variant: "destructive",
        });
      },
    });
  };

  const filteredOrgs = (data?.organizations ?? []).filter((org) => {
    const matchesSearch = org.name.toLowerCase().includes(search.toLowerCase()) ||
      org.slug.toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });

  const totalOrgs = data?.total ?? 0;
  const activeCount = (data?.organizations ?? []).filter((o) => o.status === "active").length;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Organizations</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {totalOrgs} total &middot; {activeCount} active
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="w-4 h-4" /> New Organization
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Organization</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Organization Name</FormLabel>
                    <FormControl><Input placeholder="Acme Corp" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="slug" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Slug</FormLabel>
                    <FormControl><Input placeholder="acme-corp" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="domain" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Domain (Optional)</FormLabel>
                    <FormControl><Input placeholder="acme.com" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="planId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Billing Plan</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={String(field.value)}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Select a plan" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {plans?.map((plan) => (
                          <SelectItem key={plan.id} value={String(plan.id)}>{plan.name} — ${plan.priceMonthly}/mo</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="flex justify-end pt-2">
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Create Organization
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="pb-0">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search organizations..."
                className="pl-9 bg-background/50 h-9 text-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[150px] h-9 text-sm">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent className="p-0 mt-4">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organization</TableHead>
                  <TableHead className="hidden sm:table-cell">Status</TableHead>
                  <TableHead className="hidden md:table-cell">
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" /> Users</span>
                  </TableHead>
                  <TableHead className="hidden md:table-cell">
                    <span className="flex items-center gap-1"><Network className="w-3 h-3" /> Subgraphs</span>
                  </TableHead>
                  <TableHead className="hidden lg:table-cell">Domain</TableHead>
                  <TableHead className="hidden xl:table-cell">Created</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : filteredOrgs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground text-sm">
                      No organizations found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredOrgs.map((org) => (
                    <TableRow key={org.id} className="group hover:bg-muted/30 transition-colors">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                            <Building2 className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="font-medium text-sm">{org.name}</div>
                            <div className="text-xs text-muted-foreground font-mono">{org.slug}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Badge variant="outline" className={`text-xs ${statusVariant[org.status] ?? ""}`}>
                          {org.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <span className="text-sm font-mono text-muted-foreground">{org.userCount ?? 0}</span>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <span className="text-sm font-mono text-muted-foreground">{org.subgraphCount ?? 0}</span>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {org.domain ? (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Globe className="w-3 h-3" /> {org.domain}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground/40">—</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden xl:table-cell">
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(org.createdAt), { addSuffix: true })}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Link href={`/organizations/${org.id}`}>
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
