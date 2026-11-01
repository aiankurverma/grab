import type { Metadata } from "next";

import { LegalSection, LegalShell } from "@/components/legal/legal-shell";

export const metadata: Metadata = {
  title: "Terms of use",
  description: "The rules for using MediaRift, including acceptable use, content rights, and limits.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <LegalShell
      eyebrow="Legal"
      title="Terms of use"
      summary="These terms explain what MediaRift does, what you may use it for, and the limits of the service."
      updated="November 1, 2026"
    >
      <LegalSection title="1. What MediaRift does">
        <p>
          MediaRift is a link-based media utility. When you submit a supported public URL, we ask the
          source for available media and prepare an MP3 or MP4 file. MediaRift is not affiliated with
          YouTube, Instagram, TikTok, Facebook, X, Vimeo, SoundCloud, Reddit, Twitch, Dailymotion,
          Pinterest, or any other source platform.
        </p>
      </LegalSection>

      <LegalSection title="2. Your responsibility">
        <p>
          You may use MediaRift only for media you own, media licensed to you, or media you otherwise
          have permission to download. You are responsible for complying with copyright law and the
          terms of the source platform.
        </p>
        <p>
          Do not use MediaRift to access private, paid, login-walled, or DRM-protected content; to
          redistribute infringing files; or to interfere with the service, its workers, or other
          users.
        </p>
      </LegalSection>

      <LegalSection title="3. Availability and limits">
        <p>
          The service is provided on an “as is” and “as available” basis. Source platforms change
          frequently, so extraction may fail or return a different quality than expected. We may
          apply rate limits, daily conversion limits, file-size limits, and retention limits.
        </p>
        <p>
          Download links expire after six hours. We do not guarantee storage, delivery, or
          recoverability of any file after expiry.
        </p>
      </LegalSection>

      <LegalSection title="4. Intellectual property">
        <p>
          MediaRift does not claim ownership of the media you submit. You retain whatever rights you
          already hold. The MediaRift name, interface, and original site content remain our property
          or that of our licensors.
        </p>
      </LegalSection>

      <LegalSection title="5. Disclaimers and limitation">
        <p>
          To the maximum extent permitted by law, MediaRift disclaims warranties of merchantability,
          fitness for a particular purpose, and non-infringement. We are not liable for indirect,
          incidental, special, consequential, or punitive damages, or for lost data, profits, or
          goodwill.
        </p>
      </LegalSection>

      <LegalSection title="6. Changes and contact">
        <p>
          We may update these terms as the service changes. Continued use after an update means you
          accept the revised terms. Questions can be sent to support@mediarift.store.
        </p>
      </LegalSection>
    </LegalShell>
  );
}
