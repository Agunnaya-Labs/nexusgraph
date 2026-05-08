import { useListBillingPlans, getListBillingPlansQueryKey, useGetPlanBreakdown, getGetPlanBreakdownQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Check, Building2, TrendingUp, DollarSign } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { useState } from "react";

export default function Billing() {
  const [isYearly, setIsYearly] = useState(false);

  const { data: plans, isLoading: isPlansLoading } = useListBillingPlans({ query: { queryKey: getListBillingPlansQueryKey() } });
  const { data: breakdown, isLoading: isBreakdownLoading } = useGetPlanBreakdown({ query: { queryKey: getGetPlanBreakdownQueryKey() } });

  const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))'];

  const totalRevenue = breakdown?.reduce((acc, curr) => acc + curr.revenue, 0) || 0;
  const totalOrgs = breakdown?.reduce((acc, curr) => acc + curr.orgCount, 0) || 0;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Billing & Plans</h1>
        <p className="text-muted-foreground mt-1">Manage subscription tiers and view revenue analytics</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Recurring Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isBreakdownLoading ? <Skeleton className="h-8 w-24" /> : (
              <div className="text-2xl font-bold">${totalRevenue.toLocaleString()}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paying Organizations</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isBreakdownLoading ? <Skeleton className="h-8 w-24" /> : (
              <div className="text-2xl font-bold">{totalOrgs}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ARPU</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isBreakdownLoading ? <Skeleton className="h-8 w-24" /> : (
              <div className="text-2xl font-bold">${totalOrgs ? Math.round(totalRevenue / totalOrgs).toLocaleString() : 0}</div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Plan Management</CardTitle>
            <CardDescription>Available subscription tiers for organizations</CardDescription>
            <div className="flex items-center space-x-2 mt-4">
              <Label htmlFor="yearly-toggle" className={`${!isYearly ? 'text-foreground' : 'text-muted-foreground'}`}>Monthly</Label>
              <Switch id="yearly-toggle" checked={isYearly} onCheckedChange={setIsYearly} />
              <Label htmlFor="yearly-toggle" className={`${isYearly ? 'text-foreground' : 'text-muted-foreground'}`}>
                Yearly <span className="text-primary text-xs ml-1 font-bold">20% OFF</span>
              </Label>
            </div>
          </CardHeader>
          <CardContent>
            {isPlansLoading ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <Skeleton className="h-[400px] w-full" />
                <Skeleton className="h-[400px] w-full" />
                <Skeleton className="h-[400px] w-full" />
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {plans?.map((plan) => (
                  <Card key={plan.id} className={`flex flex-col relative ${plan.slug === 'pro' ? 'border-primary shadow-md' : ''}`}>
                    {plan.slug === 'pro' && (
                      <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                        Popular
                      </div>
                    )}
                    <CardHeader>
                      <CardTitle className="text-xl">{plan.name}</CardTitle>
                      <div className="mt-4 flex items-baseline text-4xl font-extrabold">
                        ${isYearly ? plan.priceYearly : plan.priceMonthly}
                        <span className="ml-1 text-xl font-medium text-muted-foreground">
                          /mo
                        </span>
                      </div>
                      {isYearly && plan.priceMonthly > 0 && (
                        <div className="text-sm text-muted-foreground mt-1">
                          Billed ${(plan.priceYearly * 12).toLocaleString()} yearly
                        </div>
                      )}
                    </CardHeader>
                    <CardContent className="flex-1">
                      <div className="space-y-4">
                        <div className="text-sm font-medium">Limits</div>
                        <div className="space-y-2 text-sm text-muted-foreground">
                          <div className="flex justify-between">
                            <span>Users</span>
                            <span className="font-mono text-foreground">{plan.maxUsers || 'Unlimited'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Subgraphs</span>
                            <span className="font-mono text-foreground">{plan.maxSubgraphs || 'Unlimited'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Operations/mo</span>
                            <span className="font-mono text-foreground">{plan.maxMonthlyOperations ? `${(plan.maxMonthlyOperations / 1000000)}M` : 'Unlimited'}</span>
                          </div>
                        </div>

                        <div className="pt-4 mt-4 border-t border-border space-y-2">
                          {plan.features.map((feature, i) => (
                            <div key={i} className="flex items-start">
                              <Check className="h-4 w-4 text-primary mt-0.5 shrink-0 mr-2" />
                              <span className="text-sm">{feature}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Plan Distribution</CardTitle>
            <CardDescription>Organizations by plan</CardDescription>
          </CardHeader>
          <CardContent>
            {isBreakdownLoading ? <Skeleton className="h-[300px] w-full" /> : (
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={breakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="orgCount"
                      nameKey="planName"
                    >
                      {breakdown?.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => [`${value} Organizations`, 'Count']}
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: 'var(--radius)' }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
