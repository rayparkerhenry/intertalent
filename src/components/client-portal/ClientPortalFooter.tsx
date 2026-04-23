export default function ClientPortalFooter() {
  return (
    <footer className="bg-[var(--color-primary)] text-white/70 py-8 mt-16">
      <div className="container mx-auto px-4">
        <div className="text-center">
          <p className="text-sm">
            © {new Date().getFullYear()} InterSolutions. All rights reserved.
          </p>
          <div className="mt-4 flex justify-center gap-6 text-sm">
            <a
              href="#"
              className="text-white/80 hover:text-[var(--color-secondary)] transition-colors"
            >
              Privacy Policy
            </a>
            <a
              href="#"
              className="text-white/80 hover:text-[var(--color-secondary)] transition-colors"
            >
              Terms of Use
            </a>
            <a
              href="#"
              className="text-white/80 hover:text-[var(--color-secondary)] transition-colors"
            >
              Contact
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
