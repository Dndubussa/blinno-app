import { PageLayout } from "@/components/PageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, User, ArrowRight } from "lucide-react";

export default function Blog() {
  const blogPosts = [
    {
      title: "Getting Started as a Creator on BLINNO",
      excerpt: "Learn how to set up your profile, showcase your work, and start earning on BLINNO.",
      author: "BLINNO Team",
      date: "2024-11-15",
      category: "Getting Started"
    },
    {
      title: "Tips for Selling Products Online",
      excerpt: "Best practices for product photography, pricing, and customer service to boost your sales.",
      author: "BLINNO Team",
      date: "2024-11-10",
      category: "Business"
    },
    {
      title: "Building Your Brand on Social Media",
      excerpt: "How to leverage BLINNO and social media to grow your audience and reach more customers.",
      author: "BLINNO Team",
      date: "2024-11-05",
      category: "Marketing"
    },
    {
      title: "Success Stories: Tanzanian Creators Going Global",
      excerpt: "Inspiring stories of creators who expanded their reach beyond Tanzania using BLINNO.",
      author: "BLINNO Team",
      date: "2024-10-28",
      category: "Success Stories"
    },
  ];

  return (
    <PageLayout>
      <div className="container mx-auto px-4 max-w-6xl">
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-4xl mb-4">BLINNO Blog</CardTitle>
            <p className="text-muted-foreground">
              Tips, guides, and insights to help you succeed on BLINNO
            </p>
          </CardHeader>
        </Card>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {blogPosts.map((post, index) => (
            <Card key={index} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="mb-2">
                  <span className="text-xs font-semibold text-primary">{post.category}</span>
                </div>
                <h3 className="text-xl font-semibold mb-2">{post.title}</h3>
                <p className="text-muted-foreground mb-4">{post.excerpt}</p>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                  <div className="flex items-center gap-1">
                    <User className="h-4 w-4" />
                    <span>{post.author}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>{new Date(post.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                  </div>
                </div>
                <Button variant="outline" className="w-full">
                  Read More
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardContent className="p-6 text-center">
            <h3 className="text-xl font-semibold mb-4">Want to Write for Us?</h3>
            <p className="text-muted-foreground mb-4">
              We're always looking for guest writers to share their expertise and experiences.
            </p>
            <p className="text-sm text-muted-foreground">
              Contact us at <a href="mailto:blog@blinno.app" className="text-primary hover:underline">blog@blinno.app</a>
            </p>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}

