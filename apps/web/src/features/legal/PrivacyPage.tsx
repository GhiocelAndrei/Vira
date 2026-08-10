import { LEGAL_CONTACT_EMAIL, LegalSection, LegalShell } from "./LegalShell";

/**
 * Privacy Policy. Written for the TikTok Developer app review: it states exactly what TikTok data
 * Vira reads (via the official Display API, with the creator's consent), how it is used, stored,
 * and deleted. Keep it in sync with the actual data handling in the backend.
 */
export default function PrivacyPage() {
  return (
    <LegalShell title="Privacy Policy" lastUpdated="6 August 2026">
      <p>
        Vira ("Vira", "we", "us") connects brands with content creators on TikTok. Brands pay for
        verified views; creators post natively on TikTok and we measure the results through TikTok's
        official APIs. This policy explains what personal data we collect, why, and your choices.
      </p>

      <LegalSection heading="Data we collect">
        <p>
          <strong>From creators, via TikTok Login Kit &amp; Display API (with your consent).</strong>{" "}
          When you connect your TikTok account we request the scopes{" "}
          <code>user.info.basic</code>, <code>user.info.profile</code>, <code>user.info.stats</code>{" "}
          and <code>video.list</code>, and receive: your TikTok open ID, display name, avatar image,
          follower count, and public video metadata (video ID, title, cover image, embed link, and
          view/like/comment/share counts). We do <strong>not</strong> receive your TikTok password,
          private messages, or the video files themselves.
        </p>
        <p>
          <strong>From brands.</strong> Business name, contact name, email address, and the campaign
          details they create.
        </p>
        <p>
          <strong>Authentication.</strong> Brands authenticate via Firebase Authentication (email and
          password, handled by Google). Creators authenticate via TikTok. We store a server-side
          session identifier in a secure, HttpOnly cookie.
        </p>
      </LegalSection>

      <LegalSection heading="How we use it">
        <ul className="list-disc pl-5">
          <li>To build a creator profile and match creators with relevant brand campaigns.</li>
          <li>To display a creator's own content and performance metrics back to them.</li>
          <li>To measure verified views for campaigns and support payouts.</li>
          <li>To operate, secure, and improve the service.</li>
        </ul>
      </LegalSection>

      <LegalSection heading="How we store and protect it">
        <p>
          Data is stored on managed infrastructure (Microsoft Azure, EU region). TikTok access and
          refresh tokens are <strong>encrypted at rest</strong>. Access is restricted to what the
          service needs to function.
        </p>
      </LegalSection>

      <LegalSection heading="Sharing">
        <p>
          We do not sell your personal data. Creator profile and public performance metrics may be
          shown to brands you engage with. We use service providers (hosting, authentication) that
          process data on our behalf under appropriate safeguards.
        </p>
      </LegalSection>

      <LegalSection heading="Retention and deletion of TikTok data">
        <p>
          We keep TikTok-derived data only while your account is connected. If you disconnect your
          TikTok account, ask us to delete your data, or if our access to the TikTok API ends, we
          delete the TikTok data we hold about you. You can request deletion at any time by emailing{" "}
          <a href={`mailto:${LEGAL_CONTACT_EMAIL}`} className="text-primary hover:opacity-80">
            {LEGAL_CONTACT_EMAIL}
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection heading="Your rights">
        <p>
          Subject to applicable law (including the GDPR), you may request access to, correction of,
          or deletion of your personal data, and you may withdraw consent by disconnecting your
          TikTok account. Contact us to exercise these rights.
        </p>
      </LegalSection>

      <LegalSection heading="Changes">
        <p>
          We may update this policy; material changes will be reflected by the "last updated" date
          above.
        </p>
      </LegalSection>
    </LegalShell>
  );
}
