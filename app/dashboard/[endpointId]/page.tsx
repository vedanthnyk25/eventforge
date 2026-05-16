import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { AutoRefresh } from "@/app/components/AutoRefresh";
import { headers } from "next/headers";

export default async function EndpointEventsPage(
  {params,}: {params: Promise<{endpointId: string}>} 
) {
  const {endpointId}= await params;

  const headerList= await headers();
  const host= headerList.get("host")?? "localhost:3000";
  const protocol= host.includes("localhost") ? "http" : "https";
  const ingestUrl= `${protocol}://${host}/api/ingest/${endpointId}`;

  const endpoint= await prisma.webhookEndpoint.findUnique({
    where: {
      id: endpointId
    },
    include: {
      events: {
        orderBy: {
          createdAt: "desc"
        },
        take: 50
      }
    }
  });

  if (!endpoint) {
    notFound();
  }

  return (
    <div className="container mx-auto py-10 max-w-6xl">
      <AutoRefresh interval={3000} /> {/* Refresh every 5 seconds */}
      {/* Header Section */}
      <div className="flex items-center gap-4 mb-8">
        <Link href="/dashboard">
          <Button variant="outline" size="sm">
            &larr; Back
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">{endpoint.description}</h1>
          <p className="text-sm text-muted-foreground font-mono mt-1">
            Target: {endpoint.targetUrl}
          </p>
        </div>
      </div>

      {/* Ingest URL Card */}
      <div className="bg-muted/50 border rounded-lg p-4 mb-8 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium mb-1">Your Ingest URL</p>
          <code className="text-xs bg-background p-1.5 rounded border select-all">
            {ingestUrl}
          </code>
        </div>
        <Badge variant="outline" className="uppercase">{endpoint.provider} secured</Badge>
      </div>

      {/* Data Table Section */}
      <div className="border rounded-md bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Status</TableHead>
              <TableHead>Event ID</TableHead>
              <TableHead>Timestamp</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {endpoint.events.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                  No events received yet. Send a webhook to your ingest URL to get started.
                </TableCell>
              </TableRow>
            ) : (
              endpoint.events.map((event) => (
                <TableRow key={event.id}>
                  <TableCell>{getStatusBadge(event.status)}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {event.id}
                  </TableCell>
                  <TableCell className="text-sm">
                    {new Date(event.createdAt).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <Link href={`/dashboard/event/${event.id}`}>
                      <Button variant="outline" size="sm">
                        View Details
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

const getStatusBadge= (status: string) => {
  switch (status) {
      case "DELIVERED":
        return <Badge className="bg-green-600 hover:bg-green-700">Delivered</Badge>;
      case "FAILED":
        return <Badge variant="destructive">Failed</Badge>;
      case "PENDING":
        return <Badge variant="secondary" className="text-yellow-600 bg-yellow-100">Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
}
