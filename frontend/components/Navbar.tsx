"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "Home" },
  { href: "/markets", label: "Markets" },
  { href: "/lab", label: "Lab" },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 h-12 border-b border-border bg-bg/90 backdrop-blur-sm">
      <div className="app-shell flex h-full items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex flex-col">
            <span className="font-mono text-sm font-bold uppercase tracking-widest text-txt-primary">
              OG Markets
            </span>
            <span className="font-mono text-[10px] tracking-wider text-txt-tertiary">
              powered by OpenGradient
            </span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {links.map((link) => {
              const active =
                link.href === "/"
                  ? pathname === link.href
                  : pathname.startsWith(link.href);

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "px-3 py-1.5 font-mono text-xs uppercase tracking-wider",
                    active
                      ? "text-txt-primary"
                      : "text-txt-tertiary hover:text-txt-secondary"
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-txt-tertiary sm:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-bullish" />
            Live
          </span>
          <a
            href="https://docs.opengradient.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-xs uppercase tracking-wider text-txt-tertiary hover:text-txt-secondary"
          >
            Docs
            <ArrowUpRight className="ml-1 inline h-3 w-3" />
          </a>
        </div>
      </div>
    </header>
  );
}
