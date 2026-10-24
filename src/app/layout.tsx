import "./globals.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th">
      <body className="bg-slate-50 min-h-screen">
        <main>{children}</main>
      </body>
    </html>
  );
}