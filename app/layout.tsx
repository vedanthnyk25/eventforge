// app/layout.tsx
import "@/app/globals.css"; // Shadcn created this file during init

export const metadata = {
  title: "EventForge",
  description: "Enterprise Webhook Management",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen bg-background">
        {children}
      </body>
    </html>
  );
}
