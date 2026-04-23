import Link from 'next/link';

export default function ClientPortalNotFoundPage() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-12">
      <div className="max-w-md text-center">
        <h1 className="mb-2 text-2xl font-bold text-gray-900">Portal not found</h1>
        <p className="mb-6 text-sm text-gray-600">
          The client portal you&apos;re looking for doesn&apos;t exist.
        </p>
        <Link
          href="/"
          className="inline-flex rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50"
        >
          Back to main portal
        </Link>
      </div>
    </div>
  );
}
