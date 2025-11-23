import { ReactNode } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

interface PageLayoutProps {
  children: ReactNode;
  className?: string;
}

export function PageLayout({ children, className = "" }: PageLayoutProps) {
  return (
    <div className={`min-h-screen bg-background ${className}`}>
      <Header />
      <div className="pt-24 pb-16">
        {children}
      </div>
      <Footer />
    </div>
  );
}

