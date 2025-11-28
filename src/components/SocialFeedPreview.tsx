import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, MessageCircle, ArrowRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { AnimatedSection } from "./AnimatedSection";
import { useTranslation } from "react-i18next";

export function SocialFeedPreview() {
  const { t } = useTranslation();
  // Safely access auth context
  const authContext = useContext(AuthContext);
  const user = authContext?.user || null;
  const navigate = useNavigate();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchRecentPosts();
    }
  }, [user]);

  const fetchRecentPosts = async () => {
    try {
      setLoading(true);
      const data = await api.getSocialFeed({ limit: 3 });
      setPosts(data || []);
    } catch (error) {
      console.error("Error fetching posts:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return null; // Don't show for non-logged-in users
  }

  if (loading) {
    return (
      <AnimatedSection delay={400}>
        <div className="container mx-auto px-4 py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">{t("socialFeed.loading")}</p>
          </div>
        </div>
      </AnimatedSection>
    );
  }

  if (posts.length === 0) {
    return (
      <AnimatedSection delay={400}>
        <div className="container mx-auto px-4 py-12">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-3xl font-bold mb-2">{t("socialFeed.title")}</h2>
              <p className="text-muted-foreground">
                {t("socialFeed.subtitle")}
              </p>
            </div>
            <Button onClick={() => navigate("/social")} variant="outline">
              {t("socialFeed.viewAll")}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-muted-foreground mb-4">
                {t("socialFeed.emptyFeed")}
              </p>
              <Button onClick={() => navigate("/")}>
                {t("socialFeed.discoverCreators")}
              </Button>
            </CardContent>
          </Card>
        </div>
      </AnimatedSection>
    );
  }

  return (
    <AnimatedSection delay={400}>
      <div className="container mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-3xl font-bold mb-2">{t("socialFeed.title")}</h2>
            <p className="text-muted-foreground">
              {t("socialFeed.subtitle")}
            </p>
          </div>
          <Button onClick={() => navigate("/social")} variant="outline">
            {t("socialFeed.viewAll")}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {posts.map((post) => (
            <Card key={post.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate("/social")}>
              <CardContent className="p-6">
                <div className="flex items-start gap-3 mb-4">
                  <Avatar>
                    <AvatarImage src={post.avatar_url} />
                    <AvatarFallback>{post.display_name?.[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{post.display_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(post.created_at), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                </div>

                <p className="text-sm mb-4 line-clamp-3">{post.content}</p>

                {post.media_urls && post.media_urls.length > 0 && (
                  <div className="mb-4">
                    <img
                      src={post.media_urls[0]}
                      alt={t("socialFeed.post")}
                      loading="lazy"
                      className="w-full h-32 object-cover rounded-md"
                      style={{
                        backfaceVisibility: 'hidden',
                        WebkitBackfaceVisibility: 'hidden'
                      }}
                    />
                  </div>
                )}

                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Heart className="h-4 w-4" />
                    {post.likes_count || 0}
                  </div>
                  <div className="flex items-center gap-1">
                    <MessageCircle className="h-4 w-4" />
                    {post.comments_count || 0}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AnimatedSection>
  );
}

