import { PageLayout } from "@/components/PageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Quote, Star } from "lucide-react";

export default function SuccessStories() {
  const stories = [
    {
      name: "Sarah M.",
      role: "Fashion Designer",
      location: "New York",
      quote: "BLINNO helped me reach customers across the globe. My sales have tripled since joining!",
      rating: 5,
      achievement: "3x increase in sales"
    },
    {
      name: "John K.",
      role: "Music Producer",
      location: "Los Angeles",
      quote: "The platform connected me with artists and clients I never would have found otherwise. Game changer!",
      rating: 5,
      achievement: "50+ bookings in 3 months"
    },
    {
      name: "Amina H.",
      role: "Event Organizer",
      location: "London",
      quote: "Managing events has never been easier. The booking system and payment integration are seamless.",
      rating: 5,
      achievement: "100+ successful events"
    },
    {
      name: "David T.",
      role: "Freelance Developer",
      location: "Remote",
      quote: "As someone working remotely, BLINNO helps me find clients and stay connected with the global creative community.",
      rating: 5,
      achievement: "Remote client base established"
    },
  ];

  return (
    <PageLayout>
      <div className="container mx-auto px-4 max-w-6xl">
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-4xl mb-4">Success Stories</CardTitle>
            <p className="text-muted-foreground">
              Real stories from creators and businesses thriving on BLINNO
            </p>
          </CardHeader>
        </Card>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {stories.map((story, index) => (
            <Card key={index} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <Quote className="h-8 w-8 text-primary/50 mb-4" />
                <p className="text-lg mb-4 italic">"{story.quote}"</p>
                <div className="flex items-center gap-2 mb-2">
                  {[...Array(story.rating)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <div className="border-t pt-4">
                  <h3 className="font-semibold">{story.name}</h3>
                  <p className="text-sm text-muted-foreground">{story.role} • {story.location}</p>
                  <p className="text-sm text-primary mt-2 font-medium">{story.achievement}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardContent className="p-6 text-center">
            <h3 className="text-xl font-semibold mb-4">Share Your Success Story</h3>
            <p className="text-muted-foreground mb-4">
              Have a success story to share? We'd love to hear how BLINNO has helped you grow your business or career.
            </p>
            <p className="text-sm text-muted-foreground">
              Contact us at <a href="mailto:stories@blinno.app" className="text-primary hover:underline">stories@blinno.app</a>
            </p>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}

