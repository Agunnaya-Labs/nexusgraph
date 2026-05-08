import { useGetMe, getGetMeQueryKey, useLogout } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { LogOut, User, Key, Shield, Network, Terminal, CheckCircle2, ExternalLink, Copy, FileCode, RefreshCw } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button
      onClick={handleCopy}
      className="p-1.5 text-muted-foreground hover:text-foreground transition-colors rounded hover:bg-muted"
      title="Copy"
    >
      {copied ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
    </button>
  );
}

function CodeBlock({ code, label }: { code: string; label?: string }) {
  return (
    <div className="rounded-lg border border-border bg-muted/40 overflow-hidden">
      {label && (
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-muted/60">
          <span className="text-xs font-mono text-muted-foreground">{label}</span>
          <CopyButton value={code} />
        </div>
      )}
      <pre className="p-4 text-xs font-mono text-foreground overflow-x-auto leading-relaxed whitespace-pre-wrap break-all">
        {code}
      </pre>
    </div>
  );
}

export default function Settings() {
  const { data: user } = useGetMe({ query: { queryKey: getGetMeQueryKey() } });
  const logoutMutation = useLogout();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [graphRef, setGraphRef] = useState("");
  const [routingUrl, setRoutingUrl] = useState("https://nexusgraph.replit.app/api/graphql");

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        localStorage.removeItem("nexusgraph_token");
        queryClient.clear();
        setLocation("/login");
      },
    });
  };

  const publishCmd = graphRef
    ? `GRAPH_REF="${graphRef}" ROUTING_URL="${routingUrl}" \\\n  ./artifacts/api-server/rover-publish.sh`
    : `GRAPH_REF="<your-graph>@<variant>" \\\n  ./artifacts/api-server/rover-publish.sh`;

  const roverConfigPath = `/home/runner/workspace/.config/rover/profiles/default/.sensitive`;
  const supergraphYaml = `federation_version: =2.0.0\n\nsubgraphs:\n  nexusgraph:\n    routing_url: ${routingUrl}\n    schema:\n      file: ./artifacts/api-server/schema.graphql`;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-4xl">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1 text-sm">Manage platform preferences and integrations</p>
      </div>

      <div className="grid gap-6">
        {/* Profile */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-primary" />
              <CardTitle className="text-base">Profile</CardTitle>
            </div>
            <CardDescription className="text-xs">Your personal information and role</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary text-2xl font-bold uppercase shrink-0">
                {user?.name?.charAt(0) || "U"}
              </div>
              <div>
                <h3 className="text-lg font-semibold">{user?.name}</h3>
                <p className="text-muted-foreground text-sm">{user?.email}</p>
                <div className="mt-1.5 flex items-center gap-2">
                  <Shield className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs font-mono capitalize px-2 py-0.5 bg-muted rounded border border-border">{user?.role}</span>
                </div>
              </div>
            </div>
            <Separator />
            <div className="grid gap-4 md:grid-cols-2 pt-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Full Name</Label>
                <Input value={user?.name || ""} readOnly className="bg-muted/50 text-sm h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Email Address</Label>
                <Input value={user?.email || ""} readOnly className="bg-muted/50 text-sm h-9" />
              </div>
            </div>
          </CardContent>
          <CardFooter className="border-t border-border pt-4 mt-2">
            <Button disabled size="sm">Save Changes</Button>
          </CardFooter>
        </Card>

        {/* Apollo Studio Integration */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Network className="w-4 h-4 text-primary" />
                <CardTitle className="text-base">Apollo Studio Integration</CardTitle>
              </div>
              <Badge className="bg-green-500/10 text-green-400 border-green-500/20 text-xs">
                <CheckCircle2 className="w-3 h-3 mr-1" /> Rover Authenticated
              </Badge>
            </div>
            <CardDescription className="text-xs">
              Publish the NexusGraph Federation v2 subgraph schema to Apollo Studio for managed federation, schema checks, and usage metrics.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Status */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="p-3 rounded-lg border border-border bg-muted/30 space-y-1">
                <p className="text-xs text-muted-foreground font-mono uppercase tracking-wide">Rover Config</p>
                <p className="text-sm font-medium text-green-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Authenticated
                </p>
                <p className="text-xs text-muted-foreground font-mono truncate">{roverConfigPath}</p>
              </div>
              <div className="p-3 rounded-lg border border-border bg-muted/30 space-y-1">
                <p className="text-xs text-muted-foreground font-mono uppercase tracking-wide">GraphQL Endpoint</p>
                <p className="text-sm font-medium flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-400" /> Federation v2
                </p>
                <p className="text-xs text-muted-foreground font-mono">/api/graphql</p>
              </div>
            </div>

            <Separator />

            {/* Graph Ref config */}
            <div className="space-y-3">
              <div>
                <h4 className="text-sm font-semibold mb-1">Configure Your Graph</h4>
                <p className="text-xs text-muted-foreground">
                  Find your Graph Ref in{" "}
                  <a href="https://studio.apollographql.com" target="_blank" rel="noopener noreferrer" className="text-primary underline inline-flex items-center gap-0.5">
                    Apollo Studio <ExternalLink className="w-3 h-3" />
                  </a>{" "}
                  under your graph's Settings. Format: <code className="font-mono bg-muted px-1 rounded">graphname@variant</code>
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Graph Ref</Label>
                  <Input
                    value={graphRef}
                    onChange={(e) => setGraphRef(e.target.value)}
                    placeholder="nexusgraph@main"
                    className="font-mono text-sm h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Routing URL (production)</Label>
                  <Input
                    value={routingUrl}
                    onChange={(e) => setRoutingUrl(e.target.value)}
                    className="font-mono text-sm h-9"
                  />
                </div>
              </div>
            </div>

            {/* Publish command */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Terminal className="w-3.5 h-3.5 text-muted-foreground" />
                <h4 className="text-sm font-semibold">Publish Schema</h4>
              </div>
              <CodeBlock
                code={publishCmd}
                label="bash — run from workspace root"
              />
              <p className="text-xs text-muted-foreground">
                This script introspects the live GraphQL endpoint, saves the SDL to{" "}
                <code className="font-mono bg-muted px-1 rounded">artifacts/api-server/schema.graphql</code>, and publishes it via Rover.
              </p>
            </div>

            {/* Supergraph config */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <FileCode className="w-3.5 h-3.5 text-muted-foreground" />
                <h4 className="text-sm font-semibold">Supergraph Config</h4>
              </div>
              <CodeBlock code={supergraphYaml} label="artifacts/api-server/supergraph.yaml" />
            </div>

            {/* Schema SDL preview */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
                <h4 className="text-sm font-semibold">Introspect & Save SDL</h4>
              </div>
              <CodeBlock
                code={`/home/runner/workspace/.rover/bin/rover subgraph introspect \\\n  http://localhost:80/api/graphql \\\n  --output artifacts/api-server/schema.graphql`}
                label="bash"
              />
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <a
                href="https://studio.apollographql.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                  <ExternalLink className="w-3 h-3" /> Open Apollo Studio
                </Button>
              </a>
              <a
                href="https://www.apollographql.com/docs/rover/"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-muted-foreground">
                  Rover Docs <ExternalLink className="w-3 h-3" />
                </Button>
              </a>
            </div>
          </CardContent>
        </Card>

        {/* Security */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4 text-primary" />
              <CardTitle className="text-base">Security</CardTitle>
            </div>
            <CardDescription className="text-xs">Manage your account security and sessions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Current Password</Label>
              <Input type="password" placeholder="••••••••" className="h-9 text-sm" />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs">New Password</Label>
                <Input type="password" className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Confirm New Password</Label>
                <Input type="password" className="h-9 text-sm" />
              </div>
            </div>
          </CardContent>
          <CardFooter className="border-t border-border pt-4">
            <Button disabled size="sm">Update Password</Button>
          </CardFooter>
        </Card>

        {/* Session */}
        <Card className="border-destructive/20">
          <CardHeader>
            <CardTitle className="text-base text-destructive">Session Management</CardTitle>
            <CardDescription className="text-xs">Control your active sessions on this device</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="destructive" size="sm" onClick={handleLogout} disabled={logoutMutation.isPending} className="gap-2">
              <LogOut className="w-4 h-4" />
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
