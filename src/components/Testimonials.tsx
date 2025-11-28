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
import { api } from "@/lib/api";
import { PLACEHOLDER_IMAGE } from "@/lib/constants";
import { TrustPilotWidget } from "@/components/TrustPilotWidget";

export const Testimonials = () => {
  const { t } = useTranslation();
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  const navigate = useNavigate();
  const [testimonials, setTestimonials] = useState<any[]>([]);

  useEffect(() => {
    fetchTestimonials();
  }, []);

  const fetchTestimonials = async () => {
    try {
      const data = await api.getTestimonials(5);
      setTestimonials(data || []);
    } catch (error: any) {
      console.error('Failed to fetch testimonials:', error);
      // Fallback to empty array
      setTestimonials([]);
    }
  };

  useEffect(() => {
    if (!carouselApi) return;

    const intervalId = setInterval(() => {
      carouselApi.scrollNext();
    }, 5000);

    return () => clearInterval(intervalId);
  }, [carouselApi]);

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
          setApi={setCarouselApi}
          className="w-full max-w-5xl mx-auto"
          opts={{
            align: "start",
            loop: true,
          }}
        >
          <CarouselContent>
            {testimonials.length === 0 ? (
              <CarouselItem className="md:basis-1/2 lg:basis-1/3">
                <div className="p-1">
                  <Card className="h-full">
                    <CardContent className="flex flex-col items-center p-6 text-center">
                      <p className="text-muted-foreground">{t("homepage.testimonials.noTestimonialsAvailable")}</p>
                    </CardContent>
                  </Card>
                </div>
              </CarouselItem>
            ) : (
              testimonials.map((testimonial, index) => (
                <CarouselItem key={index} className="md:basis-1/2 lg:basis-1/3">
                  <div className="p-1">
                    <Card className="h-full">
                      <CardContent className="flex flex-col items-center p-6 text-center">
                        {testimonial.image && testimonial.image !== PLACEHOLDER_IMAGE.AVATAR ? (
                          <img 
                            src={testimonial.image} 
                            alt={testimonial.name}
                            className="w-20 h-20 rounded-full object-cover mb-4"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = PLACEHOLDER_IMAGE.AVATAR;
                            }}
                          />
                        ) : (
                          <div className="w-20 h-20 rounded-full bg-primary/10 mb-4 flex items-center justify-center">
                            <span className="text-2xl font-bold text-primary">
                              {testimonial.name.charAt(0)}
                            </span>
                          </div>
                        )}
                        <div className="flex gap-1 mb-3">
                          {[...Array(testimonial.rating || 5)].map((_, i) => (
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
              ))
            )}
          </CarouselContent>
          <CarouselPrevious className="-left-12" />
          <CarouselNext className="-right-12" />
        </Carousel>
        
        {/* TrustPilot Widget */}
        <div className="mt-12 mb-8">
          <div className="text-center mb-4">
            <h3 className="text-lg font-semibold text-foreground mb-2">{t("homepage.testimonials.seeWhatOthersSaying")}</h3>
            <p className="text-sm text-muted-foreground">{t("homepage.testimonials.readReviewsOnTrustPilot")}</p>
          </div>
          <TrustPilotWidget className="flex justify-center" />
        </div>

        {/* Get Started Today Button */}
        <div className="mt-16 text-center">
          <button 
            onClick={() => navigate("/signup")}
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
