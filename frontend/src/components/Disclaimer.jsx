import { Info } from "lucide-react";

export default function Disclaimer() {
  return (
    <div role="note" className="border-b border-gold-100 bg-gold-50/70 px-4 py-1.5 text-[11px] text-gold-600 sm:px-6">
      <p className="mx-auto flex max-w-7xl items-start gap-2">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
        <span>
          <strong className="font-semibold">Independent student project</strong>, not affiliated with the Government of
          Punjab or Pakistan. Information comes from official sources with citations; always confirm on the official
          portal before applying.
        </span>
      </p>
    </div>
  );
}
