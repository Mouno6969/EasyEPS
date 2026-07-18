import { CertificateDocument } from "@/components/CertificateDocument";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import type { CertificateKind, CertificateRecipient } from "@shared/certificate";
import { Loader2, Printer, ShieldCheck, Share2 } from "lucide-react";
import { toast } from "sonner";
import { useRoute } from "wouter";

function fallbackRecipient(name?: string): CertificateRecipient {
  return {
    fullName: name || "EasyEPS Learner",
    email: "",
    phone: "",
    nationality: "",
    city: "",
    targetIndustry: "",
    avatarUrl: "",
  };
}

export default function CertificatePage() {
  const [, params] = useRoute("/certificate/:code");
  const code = params?.code ?? "";
  const query = trpc.certificates.verify.useQuery(
    { code },
    { enabled: code.length >= 6, retry: false },
  );

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({
          title: "EasyEPS Certificate",
          text: `Verify certificate ${code}`,
          url,
        });
        return;
      }
      await navigator.clipboard.writeText(url);
      toast.success("Certificate link copied");
    } catch {
      // user cancelled share
    }
  };

  return (
    <div className="certificate-page-wrap">
      <div className="container py-8 md:py-12">
        <div className="print:hidden mx-auto mb-6 flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="eyebrow">Official certificate</p>
            <h1 className="mt-1 font-serif text-2xl font-bold text-[var(--navy)] md:text-3xl">
              Certificate of Achievement
            </h1>
            <p className="mt-1 text-sm text-[var(--navy)]/55">
              Issued with the learner’s verified profile details and photograph.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={share}
              className="rounded-full border-[var(--navy)]/15"
              disabled={!query.data}
            >
              <Share2 className="size-4" />
              Share
            </Button>
            <Button
              type="button"
              onClick={() => window.print()}
              className="rounded-full bg-[var(--navy)] px-6 text-white"
              disabled={!query.data}
            >
              <Printer className="size-4" />
              Print / PDF
            </Button>
          </div>
        </div>

        {query.isLoading ? (
          <div className="paper-card mx-auto max-w-xl p-12 text-center">
            <Loader2 className="mx-auto size-7 animate-spin text-[var(--gold-dark)]" />
            <p className="mt-4 text-sm font-semibold text-[var(--navy)]/60">সার্টিফিকেট যাচাই করা হচ্ছে…</p>
          </div>
        ) : query.data ? (
          <CertificateDocument
            code={query.data.code}
            kind={query.data.kind as CertificateKind}
            scorePercent={query.data.scorePercent}
            issuedAt={query.data.issuedAt}
            recipient={query.data.recipient ?? fallbackRecipient(query.data.learnerName)}
          />
        ) : (
          <div className="paper-card mx-auto max-w-xl p-10 text-center">
            <ShieldCheck className="mx-auto size-10 text-red-600" />
            <h2 className="mt-4 font-serif text-2xl font-bold text-[var(--navy)]">সার্টিফিকেট পাওয়া যায়নি</h2>
            <p className="mt-2 text-sm text-[var(--navy)]/60">
              কোডটি সঠিক কিনা যাচাই করুন। Certificate code may be invalid or expired.
            </p>
            {code ? (
              <p className="mt-4 font-mono text-xs text-[var(--navy)]/40">{code}</p>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
