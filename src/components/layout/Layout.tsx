import React from 'react';
import { Navbar } from './Navbar';
import { Footer } from './Footer';

interface LayoutProps {
  children: React.ReactNode;
  className?: string;
}

export function Layout({ children, className = 'bg-gray-50' }: LayoutProps) {
  return (
    <div className={`min-h-screen ${className}`}>
      <Navbar className="fixed top-0 left-0 right-0 z-50" />
      <main>{children}</main>
      <Footer />
    </div>
  );
}