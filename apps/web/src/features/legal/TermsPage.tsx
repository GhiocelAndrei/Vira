import { LegalSection, LegalShell } from "./LegalShell";

/**
 * Terms of Service. Linked from the TikTok Developer app submission. Plain-language terms for a
 * marketplace connecting brands with TikTok creators (pay-per-verified-view).
 */
export default function TermsPage() {
  return (
    <LegalShell title="Terms of Service" lastUpdated="6 August 2026">
      <p>
        These Terms govern your use of Vira, a platform that connects brands with content creators on
        TikTok. By creating an account or connecting your TikTok account, you agree to these Terms.
      </p>

      <LegalSection heading="The service">
        <p>
          Vira lets brands create campaigns and lets creators discover and take part in them. Creators
          post natively on TikTok; Vira reads public metrics through TikTok's official Display API to
          measure verified views. Vira does not post to TikTok on anyone's behalf.
        </p>
      </LegalSection>

      <LegalSection heading="Accounts">
        <p>
          Creators sign in with TikTok (TikTok Login Kit); no separate password is created. Brands
          register with an email and password via Firebase Authentication. You are responsible for
          activity under your account and for keeping your credentials secure.
        </p>
      </LegalSection>

      <LegalSection heading="Acceptable use">
        <ul className="list-disc pl-5">
          <li>Do not misuse the service, attempt to disrupt it, or access it unlawfully.</li>
          <li>Do not submit content that is illegal, infringing, or that violates TikTok's terms.</li>
          <li>Creators remain responsible for complying with TikTok's Community Guidelines and Terms.</li>
        </ul>
      </LegalSection>

      <LegalSection heading="TikTok data">
        <p>
          Our access to and use of TikTok information complies with the TikTok Developer Terms and is
          described in our{" "}
          <a href="/privacy" className="text-primary hover:opacity-80">Privacy Policy</a>. We only
          request the scopes needed to operate the service and delete TikTok data when access ends or
          on request.
        </p>
      </LegalSection>

      <LegalSection heading="Campaigns and payments">
        <p>
          Brands fund campaigns; creators may earn based on verified views subject to each campaign's
          terms. Specific rates, eligibility, and payout timing are shown within the product.
        </p>
      </LegalSection>

      <LegalSection heading="Disclaimers and liability">
        <p>
          The service is provided "as is". To the maximum extent permitted by law, Vira is not liable
          for indirect or consequential damages arising from your use of the service.
        </p>
      </LegalSection>

      <LegalSection heading="Changes and contact">
        <p>
          We may update these Terms; continued use after changes constitutes acceptance. These Terms
          are governed by the laws of Romania. Questions can be sent to the contact address below.
        </p>
      </LegalSection>
    </LegalShell>
  );
}
