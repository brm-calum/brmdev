import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Settings, Users, FileText } from 'lucide-react';

export function AdminMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={handleClick}
        className="text-gray-700 hover:text-green-600 px-3 py-2 rounded-md text-sm font-medium"
      >
        Manage Platform
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5">
          <div className="py-1" role="menu">
            <Link
              to="/admin/inquiries"
              className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              role="menuitem"
              onClick={() => setIsOpen(false)}
            >
              <FileText className="mr-3 h-4 w-4" />
              Manage Inquiries
            </Link>
            <Link
              to="/admin/users"
              className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              role="menuitem"
              onClick={() => setIsOpen(false)}
            >
              <Users className="mr-3 h-4 w-4" />
              Manage Users
            </Link>
            <Link
              to="/admin/features"
              className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              role="menuitem"
              onClick={() => setIsOpen(false)}
            >
              <Settings className="mr-3 h-4 w-4" />
              Platform Features
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}