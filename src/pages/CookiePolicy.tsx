import { PageLayout } from "@/components/PageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function CookiePolicy() {
  return (
    <PageLayout>
      <div className="container mx-auto px-4 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-4xl mb-4">Cookie Policy</CardTitle>
            <p className="text-muted-foreground">
              Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </CardHeader>
          <CardContent className="prose prose-slate dark:prose-invert max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">1. What Are Cookies?</h2>
              <p className="mb-4">
                Cookies are small text files that are placed on your device when you visit a website. They are widely used 
                to make websites work more efficiently and provide information to website owners.
              </p>
              <p className="mb-4">
                BLINNO uses cookies and similar technologies to enhance your experience, analyze usage, and provide personalized 
                content and advertising.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">2. Types of Cookies We Use</h2>
              
              <h3 className="text-xl font-semibold mb-3">2.1 Essential Cookies</h3>
              <p className="mb-4">
                These cookies are necessary for the website to function properly. They enable core functionality such as 
                security, network management, and accessibility. You cannot opt-out of these cookies.
              </p>
              <ul className="list-disc pl-6 mb-4 space-y-2">
                <li><strong>Authentication:</strong> Remember your login status</li>
                <li><strong>Security:</strong> Protect against fraud and unauthorized access</li>
                <li><strong>Session Management:</strong> Maintain your session while browsing</li>
              </ul>

              <h3 className="text-xl font-semibold mb-3">2.2 Functional Cookies</h3>
              <p className="mb-4">
                These cookies allow the website to remember choices you make (such as language preferences) and provide 
                enhanced, personalized features.
              </p>
              <ul className="list-disc pl-6 mb-4 space-y-2">
                <li><strong>Preferences:</strong> Remember your language, region, and display settings</li>
                <li><strong>User Experience:</strong> Remember your preferences for a better experience</li>
              </ul>

              <h3 className="text-xl font-semibold mb-3">2.3 Analytics Cookies</h3>
              <p className="mb-4">
                These cookies help us understand how visitors interact with our website by collecting and reporting information 
                anonymously.
              </p>
              <ul className="list-disc pl-6 mb-4 space-y-2">
                <li><strong>Usage Statistics:</strong> Track pages visited, time spent, and user interactions</li>
                <li><strong>Performance:</strong> Identify and fix technical issues</li>
                <li><strong>Improvements:</strong> Understand user behavior to improve our services</li>
              </ul>

              <h3 className="text-xl font-semibold mb-3">2.4 Marketing Cookies</h3>
              <p className="mb-4">
                These cookies are used to deliver advertisements that are relevant to you and your interests. They may also be 
                used to limit the number of times you see an advertisement.
              </p>
              <ul className="list-disc pl-6 mb-4 space-y-2">
                <li><strong>Targeted Advertising:</strong> Show relevant ads based on your interests</li>
                <li><strong>Campaign Tracking:</strong> Measure the effectiveness of advertising campaigns</li>
                <li><strong>Retargeting:</strong> Show ads to users who have visited our platform</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">3. Third-Party Cookies</h2>
              <p className="mb-4">
                In addition to our own cookies, we may also use various third-party cookies to report usage statistics, 
                deliver advertisements, and provide other services. These include:
              </p>
              <ul className="list-disc pl-6 mb-4 space-y-2">
                <li><strong>Analytics Providers:</strong> Google Analytics and similar services</li>
                <li><strong>Payment Processors:</strong> Click Pesa may set cookies for payment processing</li>
                <li><strong>Social Media:</strong> If you connect social media accounts, those platforms may set cookies</li>
                <li><strong>Advertising Networks:</strong> Third-party ad networks for targeted advertising</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">4. Managing Cookies</h2>
              
              <h3 className="text-xl font-semibold mb-3">4.1 Browser Settings</h3>
              <p className="mb-4">
                Most web browsers allow you to control cookies through their settings. You can:
              </p>
              <ul className="list-disc pl-6 mb-4 space-y-2">
                <li>Block all cookies</li>
                <li>Block third-party cookies only</li>
                <li>Delete cookies when you close your browser</li>
                <li>Delete existing cookies</li>
                <li>Receive notifications when cookies are set</li>
              </ul>
              <p className="mb-4">
                Note: Blocking cookies may impact your ability to use certain features of BLINNO.
              </p>

              <h3 className="text-xl font-semibold mb-3">4.2 Platform Settings</h3>
              <p className="mb-4">
                You can manage your cookie preferences through your account settings on BLINNO. However, essential cookies 
                cannot be disabled as they are necessary for the platform to function.
              </p>

              <h3 className="text-xl font-semibold mb-3">4.3 Opt-Out Links</h3>
              <p className="mb-4">You can opt-out of certain third-party cookies:</p>
              <ul className="list-disc pl-6 mb-4 space-y-2">
                <li><strong>Google Analytics:</strong> <a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Google Analytics Opt-out</a></li>
                <li><strong>Advertising:</strong> Visit <a href="http://www.youronlinechoices.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Your Online Choices</a> to opt-out of interest-based advertising</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">5. Cookie Duration</h2>
              <p className="mb-4">Cookies can be either:</p>
              <ul className="list-disc pl-6 mb-4 space-y-2">
                <li><strong>Session Cookies:</strong> Temporary cookies that are deleted when you close your browser</li>
                <li><strong>Persistent Cookies:</strong> Remain on your device for a set period or until you delete them</li>
              </ul>
              <p className="mb-4">
                The duration of persistent cookies varies. Essential cookies typically last for the duration of your session 
                or up to 30 days. Analytics and marketing cookies may last up to 2 years.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">6. Local Storage and Similar Technologies</h2>
              <p className="mb-4">
                In addition to cookies, we may use other storage technologies such as:
              </p>
              <ul className="list-disc pl-6 mb-4 space-y-2">
                <li><strong>Local Storage:</strong> Store data locally in your browser</li>
                <li><strong>Session Storage:</strong> Store data for a single session</li>
                <li><strong>IndexedDB:</strong> Store larger amounts of structured data</li>
                <li><strong>Web Beacons:</strong> Small images used to track email opens and page views</li>
              </ul>
              <p className="mb-4">
                These technologies serve similar purposes to cookies and are subject to the same privacy considerations.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">7. Updates to This Policy</h2>
              <p className="mb-4">
                We may update this Cookie Policy from time to time to reflect changes in our practices or for other operational, 
                legal, or regulatory reasons. We will notify you of significant changes by updating the "Last updated" date 
                at the top of this policy.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">8. Contact Us</h2>
              <p className="mb-4">
                If you have questions about our use of cookies or this Cookie Policy, please contact us at:
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

