import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DueMate",
  description: "Agreement reminder & compliance tracker",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="app">
          <div className="container">
            <a className="brand" href="/">
              DueMate
            </a>
            <nav>
              <a href="/dashboard">Dashboard</a>
              <a href="/me">My agreements</a>
            </nav>
          </div>
        </header>
        <main className="container">{children}</main>
      </body>
    </html>
  );
}
