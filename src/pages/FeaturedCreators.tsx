import { useState, useEffect } from "react";
import { PageLayout } from "@/components/PageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Star, MapPin, ExternalLink, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { api } from "@/lib/api";
import { PLACEHOLDER_IMAGE } from "@/lib/constants";

export default function FeaturedCreators() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [creators, setCreators] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFeaturedCreators();
  }, []);

  const fetchFeaturedCreators = async () => {
    try {
      setLoading(true);
      const data = await api.getFeaturedCreators(10);
      setCreators(data || []);
    } catch (error: any) {
      console.error('Failed to fetch featured creators:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageLayout>
      <div className="container mx-auto px-4 max-w-6xl">
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-4xl mb-4">{t("featuredCreators.title")}</CardTitle>
            <p className="text-muted-foreground">
              {t("featuredCreators.description")}
            </p>
          </CardHeader>
        </Card>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : creators.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground">{t("common.noResults") || "No featured creators found."}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {creators.map((creator) => (
              <Card key={creator.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <img 
                      src={creator.avatar_url || PLACEHOLDER_IMAGE.AVATAR}
                      alt={creator.name}
                      className="w-16 h-16 rounded-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = PLACEHOLDER_IMAGE.AVATAR;
                      }}
                    />
                    <div>
                      <h3 className="font-semibold">{creator.name}</h3>
                      <p className="text-sm text-muted-foreground">{creator.category}</p>
                    </div>
                  </div>
                  {creator.bio && (
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                      {creator.bio}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mb-4">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="text-sm font-semibold">{creator.rating || 0}</span>
                    <span className="text-sm text-muted-foreground">
                      ({creator.reviews_count || 0} {t("common.reviews") || "reviews"})
                    </span>
                  </div>
                  {creator.location && (
                    <div className="flex items-center gap-2 mb-4">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">{creator.location}</span>
                    </div>
                  )}
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => navigate(`/creator/${creator.id}`)}
                  >
                    {t("featuredCreators.viewProfile")}
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Card>
          <CardContent className="p-6">
            <h3 className="text-xl font-semibold mb-4">{t("featuredCreators.becomeFeatured")}</h3>
            <p className="text-muted-foreground mb-4">
              {t("featuredCreators.becomeFeaturedDescription")}
            </p>
            <Button onClick={() => navigate("/signup")}>
              {t("common.getStarted")}
            </Button>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}

