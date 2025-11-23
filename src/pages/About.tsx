import { PageLayout } from "@/components/PageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function About() {
  return (
    <PageLayout>
      <div className="container mx-auto px-4 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-4xl mb-4">About BLINNO</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-slate dark:prose-invert max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">Our Mission</h2>
              <p className="mb-4">
                BLINNO is a comprehensive platform designed to connect, showcase, and empower Tanzanian creators, 
                entrepreneurs, and talent both locally and across the diaspora. We believe in the power of community 
                and the importance of supporting local businesses, artists, and innovators.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">What We Do</h2>
              <p className="mb-4">BLINNO provides a unified platform for:</p>
              <ul className="list-disc pl-6 mb-4 space-y-2">
                <li><strong>Creators:</strong> Showcase portfolios, sell digital products, offer services, and monetize content</li>
                <li><strong>Businesses:</strong> List products, manage inventory, reach customers, and grow sales</li>
                <li><strong>Service Providers:</strong> Connect with clients, manage bookings, and build reputation</li>
                <li><strong>Event Organizers:</strong> Promote events, sell tickets, and manage attendees</li>
                <li><strong>Educators:</strong> Share courses, connect with students, and build learning communities</li>
                <li><strong>Job Seekers & Employers:</strong> Find opportunities and hire talent</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">Our Values</h2>
              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <div>
                  <h3 className="text-xl font-semibold mb-2">Community First</h3>
                  <p>We prioritize building a supportive and inclusive community for all Tanzanians.</p>
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Empowerment</h3>
                  <p>We provide tools and opportunities for creators and businesses to thrive.</p>
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Innovation</h3>
                  <p>We continuously evolve our platform to meet the changing needs of our community.</p>
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Transparency</h3>
                  <p>We believe in clear communication, fair pricing, and honest business practices.</p>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">Join Us</h2>
              <p className="mb-4">
                Whether you're a creator looking to showcase your work, a business owner seeking to expand your reach, 
                or someone looking to discover amazing Tanzanian talent, BLINNO is here for you.
              </p>
              <p>
                Join our growing community and be part of the movement to celebrate and support Tanzanian creativity and entrepreneurship.
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}
