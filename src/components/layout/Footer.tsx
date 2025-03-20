import React from 'react';
import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="bg-white border-t">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <img 
              src="/images/BRM_Main_Logo-1.png"
              alt="BRM Warehouse"
              className="h-8 w-auto"
            />
            <p className="mt-4 text-sm text-gray-500">
              The leading platform for warehouse space management and rentals.
            </p>
          </div>
          <div className="md:col-span-2">
            <nav className="flex justify-end space-x-8">
              <Link to="/about" className="text-gray-500 hover:text-gray-900">
                About
              </Link>
              <Link to="/faq" className="text-gray-500 hover:text-gray-900">
                FAQ
              </Link>
              <Link to="/contact" className="text-gray-500 hover:text-gray-900">
                Contact
              </Link>
              <Link to="/terms" className="text-gray-500 hover:text-gray-900">
                Terms & Conditions
              </Link>
            </nav>
          </div>
        </div>
        <div className="mt-8 border-t border-gray-200 pt-8">
          <p className="text-sm text-gray-400 text-center">
            © {new Date().getFullYear()} 24WM OÜ. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}