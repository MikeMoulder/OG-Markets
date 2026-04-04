import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-border py-4">
      <div className="app-shell flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4 font-mono text-xs uppercase tracking-wider text-txt-tertiary">
          <span className="text-txt-secondary">OG Markets</span>
          <Link href="/markets" className="hover:text-txt-secondary">
            Markets
          </Link>
          <Link href="/lab" className="hover:text-txt-secondary">
            Lab
          </Link>
        </div>
        <p className="font-mono text-[10px] tracking-wider text-txt-muted">
          TEE Execution &middot; Verifiable Inference &middot; On-Chain Receipts
        </p>
      </div>
    </footer>
  );
}
