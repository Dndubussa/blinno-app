import { PageLayout } from "@/components/PageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TermsOfService() {
  return (
    <PageLayout>
      <div className="container mx-auto px-4 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-4xl mb-4">Terms of Service</CardTitle>
            <p className="text-muted-foreground">
              Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </CardHeader>
          <CardContent className="prose prose-slate dark:prose-invert max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">1. Acceptance of Terms</h2>
              <p className="mb-4">
                By accessing and using BLINNO ("the Platform"), you accept and agree to be bound by the terms and provision of this agreement. 
                If you do not agree to abide by the above, please do not use this service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">2. Description of Service</h2>
              <p className="mb-4">
                BLINNO is a platform that connects creators, sellers, service providers, and users across Tanzania and the diaspora. 
                The Platform provides:
              </p>
              <ul className="list-disc pl-6 mb-4 space-y-2">
                <li>Marketplace for products and services</li>
                <li>Portfolio and profile management for creators</li>
                <li>Event listings and management</li>
                <li>Booking and payment processing services</li>
                <li>Messaging and communication tools</li>
                <li>Subscription and monetization features</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">3. User Accounts</h2>
              <h3 className="text-xl font-semibold mb-3">3.1 Account Creation</h3>
              <p className="mb-4">
                To use certain features of the Platform, you must register for an account. You agree to:
              </p>
              <ul className="list-disc pl-6 mb-4 space-y-2">
                <li>Provide accurate, current, and complete information</li>
                <li>Maintain and update your information to keep it accurate</li>
                <li>Maintain the security of your password</li>
                <li>Accept all responsibility for activities that occur under your account</li>
                <li>Notify us immediately of any unauthorized use of your account</li>
              </ul>

              <h3 className="text-xl font-semibold mb-3">3.2 Account Types</h3>
              <p className="mb-4">
                BLINNO offers various account types including but not limited to: Creators, Sellers, Freelancers, 
                Lodging Providers, Restaurants, Educators, Journalists, Artisans, Employers, and Event Organizers. 
                Each account type has specific features and responsibilities.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">4. User Conduct</h2>
              <p className="mb-4">You agree not to:</p>
              <ul className="list-disc pl-6 mb-4 space-y-2">
                <li>Violate any applicable laws or regulations</li>
                <li>Infringe upon the rights of others</li>
                <li>Post false, misleading, or fraudulent information</li>
                <li>Upload malicious code, viruses, or harmful content</li>
                <li>Spam, harass, or abuse other users</li>
                <li>Impersonate any person or entity</li>
                <li>Interfere with the Platform's operation or security</li>
                <li>Use automated systems to access the Platform without permission</li>
                <li>Reverse engineer or attempt to extract source code</li>
                <li>Collect user information without consent</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">5. Content and Intellectual Property</h2>
              <h3 className="text-xl font-semibold mb-3">5.1 Your Content</h3>
              <p className="mb-4">
                You retain ownership of content you post on the Platform. By posting content, you grant BLINNO a 
                worldwide, non-exclusive, royalty-free license to use, display, and distribute your content on the Platform.
              </p>

              <h3 className="text-xl font-semibold mb-3">5.2 Platform Content</h3>
              <p className="mb-4">
                All content on the Platform, including text, graphics, logos, and software, is the property of BLINNO 
                or its licensors and is protected by copyright and other intellectual property laws.
              </p>

              <h3 className="text-xl font-semibold mb-3">5.3 Copyright Infringement</h3>
              <p className="mb-4">
                If you believe your copyright has been infringed, please contact us with details of the alleged infringement.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">6. Payments and Fees</h2>
              <h3 className="text-xl font-semibold mb-3">6.1 Payment Processing</h3>
              <p className="mb-4">
                BLINNO uses Click Pesa for payment processing. By making a payment, you agree to Click Pesa's terms and conditions.
              </p>

              <h3 className="text-xl font-semibold mb-3">6.2 Platform Fees</h3>
              <p className="mb-4">
                BLINNO charges platform fees on transactions. Current fee structure:
              </p>
              <ul className="list-disc pl-6 mb-4 space-y-2">
                <li>Marketplace sales: 8% platform fee + payment processing fees</li>
                <li>Digital products: 6% platform fee + payment processing fees</li>
                <li>Commissions: 10% platform fee + payment processing fees</li>
                <li>Tips: 3% platform fee + payment processing fees</li>
                <li>Subscriptions: 5% platform fee + payment processing fees</li>
                <li>Service bookings: 10% platform fee + payment processing fees</li>
                <li>Performance bookings: 12% platform fee + payment processing fees</li>
              </ul>
              <p className="mb-4">
                Fees are subject to change with 30 days' notice. Payment processing fees are 2.5% + 500 TZS per transaction.
              </p>

              <h3 className="text-xl font-semibold mb-3">6.3 Refunds</h3>
              <p className="mb-4">
                Refund policies vary by transaction type. Generally, refunds are at the discretion of the service provider 
                or seller. BLINNO may facilitate refunds in accordance with our refund policy.
              </p>

              <h3 className="text-xl font-semibold mb-3">6.4 Subscriptions</h3>
              <p className="mb-4">
                Subscription fees are billed monthly. You may cancel your subscription at any time. Cancellation takes effect 
                at the end of the current billing period. No refunds for partial billing periods.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">7. Prohibited Items and Services</h2>
              <p className="mb-4">You may not list or sell:</p>
              <ul className="list-disc pl-6 mb-4 space-y-2">
                <li>Illegal goods or services</li>
                <li>Counterfeit or stolen items</li>
                <li>Hazardous materials</li>
                <li>Weapons or ammunition</li>
                <li>Adult content without proper age verification</li>
                <li>Items that violate intellectual property rights</li>
                <li>Services that violate applicable laws</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">8. Disputes and Resolution</h2>
              <h3 className="text-xl font-semibold mb-3">8.1 Dispute Resolution</h3>
              <p className="mb-4">
                BLINNO provides tools for users to resolve disputes. We may, but are not obligated to, assist in dispute resolution.
              </p>

              <h3 className="text-xl font-semibold mb-3">8.2 Limitation of Liability</h3>
              <p className="mb-4">
                BLINNO acts as a platform connecting users. We are not responsible for the quality, safety, or legality of items 
                or services listed, or the accuracy of user-provided information. Our liability is limited to the maximum extent 
                permitted by law.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">9. Termination</h2>
              <p className="mb-4">
                We may suspend or terminate your account at any time for violation of these terms or for any other reason. 
                You may terminate your account at any time by contacting us.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">10. Changes to Terms</h2>
              <p className="mb-4">
                We reserve the right to modify these terms at any time. We will notify users of significant changes via email 
                or platform notification. Continued use of the Platform after changes constitutes acceptance of the new terms.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">11. Governing Law</h2>
              <p className="mb-4">
                These terms are governed by the laws of the United Republic of Tanzania. Any disputes shall be resolved in 
                the courts of Tanzania.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">12. Contact Information</h2>
              <p className="mb-4">
                For questions about these Terms of Service, please contact us at:
              </p>
              <ul className="list-none space-y-2">
                <li><strong>Email:</strong> legal@blinno.app</li>
                <li><strong>Website:</strong> www.blinno.app</li>
              </ul>
            </section>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}

