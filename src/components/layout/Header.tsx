import Link from 'next/link';

export default function Header() {
  return (
    <header className="bg-[#1e3a5f] text-white">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="text-xl font-semibold">
            InterSolutions
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <Link href="/" className="hover:text-gray-200 transition-colors">
              Job Seekers
            </Link>
            <Link href="/" className="hover:text-gray-200 transition-colors">
              Employers
            </Link>
            <Link href="/" className="hover:text-gray-200 transition-colors">
              Specializations
            </Link>
            <Link href="/" className="hover:text-gray-200 transition-colors">
              Search Jobs
            </Link>
            <Link href="/" className="hover:text-gray-200 transition-colors">
              About Us
            </Link>
            <Link href="/" className="hover:text-gray-200 transition-colors">
              News
            </Link>
            <Link href="/" className="hover:text-gray-200 transition-colors">
              Contact Us
            </Link>
          </nav>

          {/* Mobile menu button */}
          <button className="md:hidden text-white">
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}
