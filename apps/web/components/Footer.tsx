import Link from "next/link";

const links = [
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" }
];

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white py-10 dark:border-slate-800 dark:bg-slate-950">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            © {new Date().getFullYear()} VehicleLab. Crafted for engineers and enthusiasts.
          </p>
        </div>
        <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="transition hover:text-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="https://x.com/vehicellab"
            className="transition hover:text-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950"
          >
            X (Twitter)
          </Link>
          <Link
            href="https://github.com/vkarkhan/VehicleLab"
            className="transition hover:text-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950"
          >
            GitHub
          </Link>
        </div>
      </div>
    </footer>
  );
}
