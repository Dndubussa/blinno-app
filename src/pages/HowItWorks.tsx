import { PageLayout } from "@/components/PageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, UserPlus, Store, CreditCard, TrendingUp } from "lucide-react";

export default function HowItWorks() {
  return (
    <PageLayout>
      <div className="container mx-auto px-4 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-4xl mb-4">How BLINNO Works</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-slate dark:prose-invert max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">For Creators & Sellers</h2>
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <UserPlus className="h-6 w-6 text-primary" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">1. Create Your Account</h3>
                    <p>Sign up and choose your role - creator, seller, freelancer, or any of our specialized roles.</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <Store className="h-6 w-6 text-primary" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">2. Build Your Profile</h3>
                    <p>Add your portfolio, products, services, or listings. Showcase your work and tell your story.</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <TrendingUp className="h-6 w-6 text-primary" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">3. Start Earning</h3>
                    <p>Receive bookings, sell products, get commissions, tips, or subscriptions. Manage everything from your dashboard.</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <CreditCard className="h-6 w-6 text-primary" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">4. Get Paid</h3>
                    <p>Receive payments securely through Click Pesa. Track your earnings and request payouts.</p>
                  </div>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">For Buyers & Customers</h2>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold mb-1">Browse & Discover</h3>
                    <p>Explore products, services, events, and creators across various categories.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold mb-1">Connect & Book</h3>
                    <p>Message creators, book services, or add items to your cart for purchase.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold mb-1">Secure Payment</h3>
                    <p>Pay securely using Click Pesa with mobile money or other payment methods.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold mb-1">Enjoy & Review</h3>
                    <p>Receive your products or services, and leave reviews to help others.</p>
                  </div>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">Platform Features</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <h3 className="font-semibold mb-2">Marketplace</h3>
                  <p className="text-sm text-muted-foreground">Buy and sell products with secure transactions</p>
                </div>
                <div className="p-4 border rounded-lg">
                  <h3 className="font-semibold mb-2">Portfolio Showcase</h3>
                  <p className="text-sm text-muted-foreground">Display your work and attract clients</p>
                </div>
                <div className="p-4 border rounded-lg">
                  <h3 className="font-semibold mb-2">Booking System</h3>
                  <p className="text-sm text-muted-foreground">Manage appointments and service bookings</p>
                </div>
                <div className="p-4 border rounded-lg">
                  <h3 className="font-semibold mb-2">Messaging</h3>
                  <p className="text-sm text-muted-foreground">Communicate directly with creators and customers</p>
                </div>
                <div className="p-4 border rounded-lg">
                  <h3 className="font-semibold mb-2">Subscriptions</h3>
                  <p className="text-sm text-muted-foreground">Support creators with monthly subscriptions</p>
                </div>
                <div className="p-4 border rounded-lg">
                  <h3 className="font-semibold mb-2">Event Management</h3>
                  <p className="text-sm text-muted-foreground">Create and promote events</p>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">Getting Started</h2>
              <p className="mb-4">
                Ready to join BLINNO? It's free to get started! Create your account, choose your role, and start 
                building your presence on the platform.
              </p>
              <p>
                For creators and businesses, we offer subscription tiers with additional features like unlimited listings, 
                advanced analytics, and priority support.
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}

