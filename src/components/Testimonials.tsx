import { Card, CardContent } from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Star } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { CarouselApi } from "@/components/ui/carousel";
import { useTranslation } from "react-i18next";

const testimonials = [
  {
    name: "Amina Hassan",
    role: "Digital Artist",
    image: "/placeholder.svg",
    rating: 5,
    text: "BLINNO has transformed how I connect with clients. I've grown my business by 300% in just 6 months!",
  },
  {
    name: "John Mwakasege",
    role: "Music Producer",
    image: "/placeholder.svg",
    rating: 5,
    text: "The platform made it easy to showcase my work and collaborate with other talented creators.",
  },
  {
    name: "Fatuma Juma",
    role: "Fashion Designer",
    image: "/placeholder.svg",
    rating: 5,
    text: "I found amazing opportunities and connected with customers worldwide. This platform is a game-changer!",
  },
  {
    name: "David Mollel",
    role: "Event Organizer",
    image: "/placeholder.svg",
    rating: 5,
    text: "BLINNO helped me reach thousands of people for my events. The engagement and turnout exceeded all expectations.",
  },
  {
    name: "Grace Kileo",
    role: "Content Creator",
    image: "/placeholder.svg",
    rating: 5,
    text: "From zero to hero! This platform gave me the visibility I needed to grow my audience and monetize my content.",
  },
];

export const Testimonials = () => {
  const { t } = useTranslation();
  const [api, setApi] = useState<CarouselApi>();
  const navigate = useNavigate();

  useEffect(() => {
    if (!api) return;

    const intervalId = setInterval(() => {
      api.scrollNext();
    }, 5000);

    return () => clearInterval(intervalId);
  }, [api]);

  return (
    <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            {t("homepage.testimonials.title")}
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            {t("homepage.testimonials.subtitle")}
          </p>
        </div>

        <Carousel
          setApi={setApi}
          className="w-full max-w-5xl mx-auto"
          opts={{
            align: "start",
            loop: true,
          }}
        >
          <CarouselContent>
            {testimonials.map((testimonial, index) => (
              <CarouselItem key={index} className="md:basis-1/2 lg:basis-1/3">
                <div className="p-1">
                  <Card className="h-full">
                    <CardContent className="flex flex-col items-center p-6 text-center">
                      <div className="w-20 h-20 rounded-full bg-primary/10 mb-4 flex items-center justify-center">
                        <span className="text-2xl font-bold text-primary">
                          {testimonial.name.charAt(0)}
                        </span>
                      </div>
                      <div className="flex gap-1 mb-3">
                        {[...Array(testimonial.rating)].map((_, i) => (
                          <Star
                            key={i}
                            className="w-4 h-4 fill-yellow-400 text-yellow-400"
                          />
                        ))}
                      </div>
                      <p className="text-foreground mb-4 italic">
                        "{testimonial.text}"
                      </p>
                      <div className="mt-auto">
                        <h4 className="font-semibold">{testimonial.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {testimonial.role}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="-left-12" />
          <CarouselNext className="-right-12" />
        </Carousel>
        
        {/* Get Started Today Button */}
        <div className="mt-16 text-center">
          <button 
            onClick={() => navigate("/auth?tab=signup")}
            className="inline-block bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 px-8 rounded-lg transition-colors duration-300"
          >
            {t("homepage.hero.getStartedToday")}
          </button>
          <p className="mt-4 text-muted-foreground">{t("homepage.testimonials.joinSuccessful")}</p>
        </div>
      </div>
    </section>
  );
};
