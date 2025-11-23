import { PageLayout } from "@/components/PageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function PrivacyPolicy() {
  return (
    <PageLayout>
      <div className="container mx-auto px-4 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-4xl mb-4">Privacy Policy</CardTitle>
            <p className="text-muted-foreground">
              Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </CardHeader>
          <CardContent className="prose prose-slate dark:prose-invert max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">1. Introduction</h2>
              <p className="mb-4">
                BLINNO ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we 
                collect, use, disclose, and safeguard your information when you use our platform and services.
              </p>
              <p className="mb-4">
                By using BLINNO, you consent to the data practices described in this policy. If you do not agree with the 
                practices described, please do not use our services.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">2. Information We Collect</h2>
              
              <h3 className="text-xl font-semibold mb-3">2.1 Information You Provide</h3>
              <p className="mb-4">We collect information you provide directly, including:</p>
              <ul className="list-disc pl-6 mb-4 space-y-2">
                <li><strong>Account Information:</strong> Name, email address, phone number, password, role</li>
                <li><strong>Profile Information:</strong> Display name, bio, profile picture, location, skills, portfolio items</li>
                <li><strong>Payment Information:</strong> Payment method details (processed securely through Click Pesa)</li>
                <li><strong>Content:</strong> Products, services, events, messages, reviews, and other content you post</li>
                <li><strong>Communication:</strong> Messages sent through the platform, support requests</li>
              </ul>

              <h3 className="text-xl font-semibold mb-3">2.2 Automatically Collected Information</h3>
              <p className="mb-4">We automatically collect certain information when you use our services:</p>
              <ul className="list-disc pl-6 mb-4 space-y-2">
                <li><strong>Device Information:</strong> IP address, browser type, device type, operating system</li>
                <li><strong>Usage Data:</strong> Pages visited, features used, time spent, search queries</li>
                <li><strong>Location Data:</strong> General location based on IP address (with your permission)</li>
                <li><strong>Cookies and Tracking:</strong> See our Cookie Policy for details</li>
              </ul>

              <h3 className="text-xl font-semibold mb-3">2.3 Information from Third Parties</h3>
              <p className="mb-4">
                We may receive information from third-party services you connect to BLINNO, such as social media platforms 
                or payment processors.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">3. How We Use Your Information</h2>
              <p className="mb-4">We use collected information to:</p>
              <ul className="list-disc pl-6 mb-4 space-y-2">
                <li>Provide, maintain, and improve our services</li>
                <li>Process transactions and send related information</li>
                <li>Send administrative messages, updates, and notifications</li>
                <li>Respond to your inquiries and provide customer support</li>
                <li>Personalize your experience and content</li>
                <li>Detect, prevent, and address fraud and security issues</li>
                <li>Comply with legal obligations</li>
                <li>Analyze usage patterns to improve our platform</li>
                <li>Send marketing communications (with your consent)</li>
                <li>Facilitate communication between users</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">4. Information Sharing and Disclosure</h2>
              
              <h3 className="text-xl font-semibold mb-3">4.1 Public Information</h3>
              <p className="mb-4">
                Some information is publicly visible on your profile, including your display name, bio, portfolio items, 
                and public listings. This information can be viewed by anyone using the platform.
              </p>

              <h3 className="text-xl font-semibold mb-3">4.2 Service Providers</h3>
              <p className="mb-4">
                We share information with third-party service providers who perform services on our behalf, including:
              </p>
              <ul className="list-disc pl-6 mb-4 space-y-2">
                <li>Payment processors (Click Pesa)</li>
                <li>Cloud hosting and storage providers</li>
                <li>Analytics and monitoring services</li>
                <li>Email and communication services</li>
              </ul>

              <h3 className="text-xl font-semibold mb-3">4.3 Legal Requirements</h3>
              <p className="mb-4">
                We may disclose information if required by law, court order, or government regulation, or to protect the 
                rights, property, or safety of BLINNO, our users, or others.
              </p>

              <h3 className="text-xl font-semibold mb-3">4.4 Business Transfers</h3>
              <p className="mb-4">
                In the event of a merger, acquisition, or sale of assets, your information may be transferred to the new owner.
              </p>

              <h3 className="text-xl font-semibold mb-3">4.5 With Your Consent</h3>
              <p className="mb-4">
                We may share information with your explicit consent or at your direction.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">5. Data Security</h2>
              <p className="mb-4">
                We implement appropriate technical and organizational measures to protect your information, including:
              </p>
              <ul className="list-disc pl-6 mb-4 space-y-2">
                <li>Encryption of data in transit and at rest</li>
                <li>Secure authentication and access controls</li>
                <li>Regular security assessments and updates</li>
                <li>Limited access to personal information on a need-to-know basis</li>
              </ul>
              <p className="mb-4">
                However, no method of transmission over the internet is 100% secure. While we strive to protect your information, 
                we cannot guarantee absolute security.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">6. Your Rights and Choices</h2>
              <p className="mb-4">You have the right to:</p>
              <ul className="list-disc pl-6 mb-4 space-y-2">
                <li><strong>Access:</strong> Request a copy of your personal information</li>
                <li><strong>Correction:</strong> Update or correct inaccurate information</li>
                <li><strong>Deletion:</strong> Request deletion of your account and personal information</li>
                <li><strong>Portability:</strong> Request transfer of your data in a machine-readable format</li>
                <li><strong>Opt-out:</strong> Unsubscribe from marketing communications</li>
                <li><strong>Cookie Preferences:</strong> Manage cookie settings (see Cookie Policy)</li>
              </ul>
              <p className="mb-4">
                To exercise these rights, contact us at privacy@blinno.app. We will respond within 30 days.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">7. Data Retention</h2>
              <p className="mb-4">
                We retain your information for as long as necessary to provide our services, comply with legal obligations, 
                resolve disputes, and enforce our agreements. When you delete your account, we will delete or anonymize 
                your personal information, except where we are required to retain it by law.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">8. Children's Privacy</h2>
              <p className="mb-4">
                BLINNO is not intended for users under the age of 18. We do not knowingly collect personal information from 
                children. If you believe we have collected information from a child, please contact us immediately.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">9. International Data Transfers</h2>
              <p className="mb-4">
                Your information may be transferred to and processed in countries other than your country of residence. 
                These countries may have different data protection laws. By using our services, you consent to such transfers.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">10. Changes to This Policy</h2>
              <p className="mb-4">
                We may update this Privacy Policy from time to time. We will notify you of significant changes by email or 
                through a notice on our platform. Your continued use after changes constitutes acceptance of the updated policy.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">11. Contact Us</h2>
              <p className="mb-4">
                If you have questions about this Privacy Policy or our data practices, please contact us at:
              </p>
              <ul className="list-none space-y-2">
                <li><strong>Email:</strong> privacy@blinno.app</li>
                <li><strong>Website:</strong> www.blinno.app</li>
              </ul>
            </section>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}

