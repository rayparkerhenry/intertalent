'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';

export default function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <header className="absolute top-0 left-0 right-0 z-50 bg-black/0 text-white">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <Image
              src="/InterSolutions_Trademark_White.webp"
              alt="InterSolutions - Property Management Staffing Specialists"
              width={200}
              height={50}
              priority
              className="h-10 md:h-12 w-auto"
            />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <Link href="https://www.intersolutions.com/job-seekers/" className="hover:text-gray-200 transition-colors">
              Job Seekers
            </Link>
            <Link href="https://www.intersolutions.com/employers/" className="hover:text-gray-200 transition-colors">
              Employers
            </Link>
            <Link href="https://www.intersolutions.com/specializations/" className="hover:text-gray-200 transition-colors">
              Specializations
            </Link>
            <Link href="https://jobs.intersolutions.com/" className="hover:text-gray-200 transition-colors">
              Search Jobs
            </Link>
            <Link href="https://www.intersolutions.com/about-us/" className="hover:text-gray-200 transition-colors">
              About Us
            </Link>
            <Link href="https://www.intersolutions.com/news/" className="hover:text-gray-200 transition-colors">
              News
            </Link>
            <Link href="https://www.intersolutions.com/contact-us/" className="hover:text-gray-200 transition-colors">
              Contact Us
            </Link>
          </nav>

          {/* Mobile menu button */}
          <button
            className="md:hidden text-white p-2"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle mobile menu"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {isMobileMenuOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Navigation Menu */}
        {isMobileMenuOpen && (
          <nav className="md:hidden mt-4 pb-4 flex flex-col gap-4 bg-[#1e3a5f]/95 rounded-lg p-4">
            <Link
              href="https://www.intersolutions.com/job-seekers/"
              className="hover:text-gray-200 transition-colors py-2"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Job Seekers
            </Link>
            <Link
              href="https://www.intersolutions.com/employers/"
              className="hover:text-gray-200 transition-colors py-2"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Employers
            </Link>
            <Link
              href="https://www.intersolutions.com/specializations/"
              className="hover:text-gray-200 transition-colors py-2"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Specializations
            </Link>
            <Link
              href="https://jobs.intersolutions.com/"
              className="hover:text-gray-200 transition-colors py-2"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Search Jobs
            </Link>
            <Link
              href="https://www.intersolutions.com/about-us/"
              className="hover:text-gray-200 transition-colors py-2"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              About Us
            </Link>
            <Link
              href="https://www.intersolutions.com/news/"
              className="hover:text-gray-200 transition-colors py-2"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              News
            </Link>
            <Link
              href="https://www.intersolutions.com/contact-us/"
              className="hover:text-gray-200 transition-colors py-2"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Contact Us
            </Link>
          </nav>
        )}
      </div>
    </header>
  );
}
