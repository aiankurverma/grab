import type { Metadata } from "next";

import { LegalSection, LegalShell } from "@/components/legal/legal-shell";

export const metadata: Metadata = {
  title: "DMCA and copyright",
  description: "How to send a copyright notice or counter-notice to Grab.",
  alternates: { canonical: "/dmca" },
};

export default function DmcaPage() {
  return (
    <LegalShell
      eyebrow="Copyright"
      title="DMCA and takedowns"
      summary="Grab respects copyright. If you believe a link or file available through the service infringes your rights, use the process below."
      updated="November 1, 2026"
    >
      <LegalSection title="1. Before you send a notice">
        <p>
          Check whether the material is actually hosted by Grab or by the source platform.
          Grab processes public links temporarily; most content remains hosted by the original
          site. A notice should identify the specific Grab link or job, not only the original
          source.
        </p>
      </LegalSection>

      <LegalSection title="2. What a notice must include">
        <p>
          Send a written notice that includes: your physical or electronic signature; identification
          of the copyrighted work; the exact Grab URL or job reference and enough detail for us
          to locate the material; your name, address, telephone number, and email; a statement that
          you have a good-faith belief the use is not authorized; a statement under penalty of
          perjury that the information is accurate and you are the owner or authorized to act for
          the owner.
        </p>
      </LegalSection>

      <LegalSection title="3. Where to send it">
        <p>
          Email dmca@grabwave.app with the subject line “DMCA notice”. Keep a copy of your notice.
          Incomplete notices may be returned for clarification.
        </p>
      </LegalSection>

      <LegalSection title="4. Counter-notices">
        <p>
          If your material was removed and you believe the removal was a mistake or misidentification,
          you may send a counter-notice with your signature, identification of the removed material,
          a statement under penalty of perjury that you have a good-faith belief the material was
          removed by mistake, and your consent to the jurisdiction of the appropriate court.
        </p>
      </LegalSection>

      <LegalSection title="5. Repeat infringement">
        <p>
          We may restrict or terminate access for users or links associated with repeated
          infringement. We may also remove or block links proactively when a credible notice is
          received.
        </p>
      </LegalSection>

      <LegalSection title="6. Misrepresentation">
        <p>
          Knowingly submitting a false or misleading notice can create legal liability. If you are
          unsure whether material infringes, seek independent legal advice.
        </p>
      </LegalSection>
    </LegalShell>
  );
}
