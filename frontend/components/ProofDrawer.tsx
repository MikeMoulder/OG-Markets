"use client";

import { useState } from "react";
import {
  Check,
  ChevronDown,
  Copy,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import type { ProofBundle } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function ProofDrawer({ proof }: { proof: ProofBundle }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const teeSignature = proof.tee_signature;
  const txHash =
    proof.transaction_hash && proof.transaction_hash !== "external"
      ? proof.transaction_hash
      : null;

  const copyToClipboard = (text: string, field: string) => {
    void navigator.clipboard.writeText(text);
    setCopied(field);
    window.setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="panel rounded-lg">
      <button
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between px-5 py-3.5 text-left"
      >
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-4 w-4 text-txt-tertiary" />
          <div>
            <p className="font-mono text-sm font-semibold text-txt-primary">
              Verification proof
            </p>
            <p className="text-xs text-txt-tertiary">
              TEE receipt, settlement mode, and signature.
            </p>
          </div>
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-txt-muted transition-transform",
            open && "rotate-180"
          )}
        />
      </button>

      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="grid gap-2 border-t border-border px-5 pb-4 pt-3 sm:grid-cols-2">
              <ProofField label="Model" value={proof.model} />
              <ProofField label="Settlement" value={proof.settlement_mode} />
              <ProofField
                label="Receipt ID"
                value={proof.receipt_id}
                copyable
                copied={copied === "receipt"}
                onCopy={() => copyToClipboard(proof.receipt_id, "receipt")}
              />
              {teeSignature ? (
                <ProofField
                  label="TEE Signature"
                  value={teeSignature}
                  copyable
                  copied={copied === "tee"}
                  onCopy={() => copyToClipboard(teeSignature, "tee")}
                  truncate
                />
              ) : null}
              {txHash ? (
                <ProofField
                  label="Tx Hash"
                  value={txHash}
                  copyable
                  copied={copied === "tx"}
                  onCopy={() => copyToClipboard(txHash, "tx")}
                  link={`https://explorer.opengradient.ai/tx/${txHash}`}
                  truncate
                />
              ) : null}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function ProofField({
  label,
  value,
  copyable,
  copied,
  onCopy,
  link,
  truncate,
}: {
  label: string;
  value: string;
  copyable?: boolean;
  copied?: boolean;
  onCopy?: () => void;
  link?: string;
  truncate?: boolean;
}) {
  return (
    <div className="rounded-md border border-border bg-bg p-3">
      <p className="stat-label">{label}</p>
      <div className="mt-2 flex items-start justify-between gap-2">
        <p
          className={cn(
            "font-mono text-xs text-txt-secondary",
            truncate ? "truncate" : ""
          )}
        >
          {value}
        </p>
        <div className="flex items-center gap-1.5">
          {copyable && onCopy ? (
            <button
              onClick={onCopy}
              className="rounded border border-border bg-elevated p-1.5 text-txt-muted hover:text-txt-secondary"
            >
              {copied ? (
                <Check className="h-3 w-3 text-bullish" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
            </button>
          ) : null}
          {link ? (
            <a
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded border border-border bg-elevated p-1.5 text-txt-muted hover:text-txt-secondary"
            >
              <ExternalLink className="h-3 w-3" />
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}
