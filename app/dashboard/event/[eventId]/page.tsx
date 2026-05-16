import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ReplayButton } from "@/app/components/ReplayButton";

export default async function EventInspectorPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;

  // Fetch the event, including the endpoint it belongs to AND all delivery attempts
  const event = await prisma.webhookEvent.findUnique({
    where: { id: eventId },
    include: {
      endpoint: true,
      attempts: {
        orderBy: { timestamp: "desc" },
      },
    },
  });

  if (!event) {
    notFound();
  }

  const isSuccess = event.status === "DELIVERED";

  return (
    <div className="container mx-auto py-10 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link href={`/dashboard/${event.endpointId}`}>
            <Button variant="outline" size="sm">
              &larr; Back to Endpoint
            </Button>
          </Link>
          <h1 className="text-2xl font-bold font-mono text-muted-foreground tracking-tight">
            Event: {event.id}
          </h1>
        </div>
        <div className="flex items-center gap-4">
            <Badge variant={isSuccess ? "default" : "destructive"} className={isSuccess ? "bg-green-600" : ""}>
              {event.status}
            </Badge>
            {event.status === "FAILED" || event.status === "PENDING" && (
              <ReplayButton eventId={event.id} />
            )}
        </div>
    </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Payload & Headers */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                JSON Payload
              </CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted p-4 rounded-md overflow-x-auto text-sm font-mono text-foreground">
                {JSON.stringify(event.payload, null, 2)}
              </pre>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Headers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted p-4 rounded-md overflow-x-auto text-sm font-mono text-muted-foreground">
                {JSON.stringify(event.headers, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Delivery Attempts & Metadata */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Delivery Log
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {event.attempts.length === 0 ? (
                <p className="text-sm text-muted-foreground">No delivery attempts yet.</p>
              ) : (
                event.attempts.map((attempt, index) => (
                  <div key={attempt.id} className="text-sm border-b last:border-0 pb-4 last:pb-0">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">Attempt #{event.attempts.length - index}</span>
                      <Badge variant={attempt.responseStatus >= 200 && attempt.responseStatus < 300 ? "outline" : "destructive"}>
                        HTTP {attempt.responseStatus}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">
                      {new Date(attempt.timestamp).toLocaleString()}
                    </p>
                    {attempt.responseBody && (
                      <pre className="bg-muted p-2 rounded text-xs font-mono overflow-x-auto max-h-32">
                        {attempt.responseBody}
                      </pre>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
