import React from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileMenu: React.FC<MobileMenuProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const menuItems = [
    { href: '/', label: 'Home' },
    { href: '/properties', label: 'Properties' },
    { href: '/developers', label: 'Developers' },
    { href: '/blog', label: 'Blog' },
    { href: '/about', label: 'About' },
    { href: '/contact', label: 'Contact' },
  ];

  return (
    <div className="md:hidden bg-white shadow-lg">
      <div className="px-4 py-3 border-b">
        <div className="flex items-center justify-between">
          <span className="text-xl font-bold text-gray-900">Highrise.pk</span>
          <button onClick={onClose}>
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>
      </div>
      <nav className="py-4">
        {menuItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="block px-4 py-3 text-gray-700 hover:bg-gray-50 hover:text-primary-color transition-colors"
            onClick={onClose}
          >
            {item.label}
          </Link>
        ))}
        <div className="px-4 py-3 border-t">
          <button className="w-full px-4 py-2 bg-primary-color text-white rounded-lg hover:bg-opacity-90 transition-colors">
            Add Property
          </button>
        </div>
      </nav>
    </div>
  );
};
