import type { Metadata } from "next";

import { LegalSection, LegalShell } from "@/components/legal/legal-shell";

export const metadata: Metadata = {
  title: "Privacy",
  description: "What Grab stores, why it stores it, and how long temporary media is retained.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <LegalShell
      eyebrow="Privacy"
      title="Privacy policy"
      summary="Grab is designed to keep as little as possible. This page explains the data needed to run a conversion and what happens afterward."
      updated="November 1, 2026"
    >
      <LegalSection title="1. Data we process">
        <p>
          When you start a conversion, we process the submitted URL, the selected format and
          quality, job status and progress, and technical request data such as IP address and user
          agent for security and rate limiting.
        </p>
        <p>
          We do not require an account to try the converter. Account features are not open yet.
        </p>
      </LegalSection>

      <LegalSection title="2. Temporary media">
        <p>
          Converted files are stored temporarily so you can download them. Download links are
          signed and expire after six hours. After expiry, the file is removed from storage and the
          link no longer works.
        </p>
      </LegalSection>

      <LegalSection title="3. Browser history">
        <p>
          Recent conversions are stored in your browser’s local storage so you can find them again.
          This history stays on your device, is not tied to an account, and can be cleared with the
          Clear button in the converter.
        </p>
      </LegalSection>

      <LegalSection title="4. Service providers">
        <p>
          We rely on hosting, database, queue, and storage infrastructure to run the service. The
          source platform receives a request when we read a public link. We do not sell personal
          data.
        </p>
      </LegalSection>

      <LegalSection title="5. Retention and security">
        <p>
          Job records are kept only as long as needed for operation, debugging, abuse prevention,
          and legal obligations. We use signed download links, access controls, and rate limits, but
          no internet service can guarantee absolute security.
        </p>
      </LegalSection>

      <LegalSection title="6. Your choices">
        <p>
          You can avoid persistent browser history by clearing local storage. To ask about data
          associated with a conversion, contact privacy@grabwave.app. Do not submit sensitive
          personal or confidential links.
        </p>
      </LegalSection>

      <LegalSection title="7. Children and changes">
        <p>
          Grab is not directed to children under 13. We may update this policy as the service
          changes; the date at the top shows the latest revision.
        </p>
      </LegalSection>
    </LegalShell>
  );
}
