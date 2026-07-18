import {
  certificateAchievementText,
  certificateTitles,
  type CertificateKind,
  type CertificateRecipient,
} from "@shared/certificate";
import { learningLevelLabels } from "@shared/profile";
import { cn } from "@/lib/utils";

export type CertificateDocumentProps = {
  code: string;
  kind: CertificateKind;
  scorePercent: number | null | undefined;
  issuedAt: string | Date;
  recipient: CertificateRecipient;
  className?: string;
};

function formatLongDate(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() ?? "")
    .join("");
}

/** Decorative corner flourish for classic certificates. */
function CornerOrnament({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 80 80" fill="none" aria-hidden>
      <path
        d="M8 72V40C8 20 20 8 40 8H72"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M18 72V48C18 30 30 18 48 18H72"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
        opacity="0.55"
      />
      <circle cx="12" cy="68" r="2.2" fill="currentColor" />
      <circle cx="68" cy="12" r="2.2" fill="currentColor" />
    </svg>
  );
}

function OfficialSeal({ scorePercent, kind }: { scorePercent?: number | null; kind: CertificateKind }) {
  return (
    <div className="certificate-seal" aria-hidden>
      <div className="certificate-seal-inner">
        <span className="certificate-seal-brand">EasyEPS</span>
        <span className="certificate-seal-line" />
        <span className="certificate-seal-text">
          {kind === "mock-test" ? `${scorePercent ?? 0}%` : "60 CH"}
        </span>
        <span className="certificate-seal-sub">VERIFIED</span>
      </div>
    </div>
  );
}

/**
 * Classic, print-ready certificate layout.
 * Landscape A4 friendly; uses snapshotted recipient profile + photo.
 */
export function CertificateDocument({
  code,
  kind,
  scorePercent,
  issuedAt,
  recipient,
  className,
}: CertificateDocumentProps) {
  const title = certificateTitles[kind];
  const achievement = certificateAchievementText(kind, scorePercent);
  const level =
    recipient.learningLevel && learningLevelLabels[recipient.learningLevel]
      ? learningLevelLabels[recipient.learningLevel].en
      : null;
  const locationLine = [recipient.city, recipient.nationality].filter(Boolean).join(", ");

  return (
    <article
      className={cn("certificate-sheet", className)}
      aria-label={`${title.en} for ${recipient.fullName}`}
    >
      <div className="certificate-border-outer">
        <div className="certificate-border-inner">
          <CornerOrnament className="certificate-corner certificate-corner-tl" />
          <CornerOrnament className="certificate-corner certificate-corner-tr" />
          <CornerOrnament className="certificate-corner certificate-corner-bl" />
          <CornerOrnament className="certificate-corner certificate-corner-br" />

          <header className="certificate-header">
            <div className="certificate-brand-mark" aria-hidden>
              <span>한</span>
            </div>
            <div>
              <p className="certificate-org">EasyEPS Learning Platform</p>
              <p className="certificate-org-sub">Korean Language · EPS-TOPIK Preparation</p>
            </div>
          </header>

          <p className="certificate-eyebrow">This is to certify that</p>
          <h1 className="certificate-title">{title.latin}</h1>
          <div className="certificate-title-rule" aria-hidden />

          <div className="certificate-recipient-block">
            <div className="certificate-photo-frame">
              {recipient.avatarUrl ? (
                <img
                  src={recipient.avatarUrl}
                  alt=""
                  className="certificate-photo"
                />
              ) : (
                <div className="certificate-photo-fallback">{initials(recipient.fullName) || "E"}</div>
              )}
            </div>

            <div className="certificate-recipient-meta">
              <p className="certificate-presented">is hereby presented to</p>
              <h2 className="certificate-name">{recipient.fullName}</h2>
              <div className="certificate-name-rule" aria-hidden />
              <dl className="certificate-facts">
                {locationLine ? (
                  <div>
                    <dt>Origin</dt>
                    <dd>{locationLine}</dd>
                  </div>
                ) : null}
                {recipient.email ? (
                  <div>
                    <dt>Email</dt>
                    <dd>{recipient.email}</dd>
                  </div>
                ) : null}
                {recipient.phone ? (
                  <div>
                    <dt>Phone</dt>
                    <dd>{recipient.phone}</dd>
                  </div>
                ) : null}
                {level ? (
                  <div>
                    <dt>Level</dt>
                    <dd>{level}</dd>
                  </div>
                ) : null}
                {recipient.targetIndustry ? (
                  <div>
                    <dt>Industry focus</dt>
                    <dd>{recipient.targetIndustry}</dd>
                  </div>
                ) : null}
              </dl>
            </div>
          </div>

          <p className="certificate-body">{achievement.en}</p>
          <p className="certificate-body-bn" lang="bn">
            {achievement.bn}
          </p>

          <div className="certificate-footer">
            <div className="certificate-meta-col">
              <p className="certificate-meta-label">Date of issue</p>
              <p className="certificate-meta-value">{formatLongDate(issuedAt)}</p>
              <p className="certificate-meta-label mt-3">Certificate ID</p>
              <p className="certificate-meta-value certificate-code">{code}</p>
            </div>

            <OfficialSeal scorePercent={scorePercent} kind={kind} />

            <div className="certificate-meta-col certificate-meta-col-end">
              <div className="certificate-signature-line" />
              <p className="certificate-meta-value">Academic Office</p>
              <p className="certificate-meta-label">EasyEPS · Independent Learning Platform</p>
              {kind === "mock-test" && scorePercent != null ? (
                <>
                  <p className="certificate-meta-label mt-3">Verified score</p>
                  <p className="certificate-meta-value">{scorePercent}%</p>
                </>
              ) : (
                <>
                  <p className="certificate-meta-label mt-3">Curriculum</p>
                  <p className="certificate-meta-value">60 chapters completed</p>
                </>
              )}
            </div>
          </div>

          <p className="certificate-disclaimer">
            EasyEPS is an independent educational platform and is not an official HRD Korea or EPS government
            service. This certificate attests to platform learning progress only.
          </p>
        </div>
      </div>
    </article>
  );
}
