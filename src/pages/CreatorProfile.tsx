import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "@/lib/api";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MapPin, Globe, Phone, Star, MessageCircle, Calendar, UserPlus, UserMinus, Heart } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

export default function CreatorProfile() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [portfolios, setPortfolios] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCreatorData();
  }, [id]);

  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followStats, setFollowStats] = useState({ followers: 0, following: 0 });
  const [inWishlist, setInWishlist] = useState(false);
  const { toast } = useToast();
  const { t } = useTranslation();

  const fetchCreatorData = async () => {
    if (!id) return;

    try {
      // Fetch profile
      const profileData = await api.getProfile(id);
      setProfile(profileData);

      // Fetch portfolios
      const portfolioData = await api.getPortfolios(id);
      setPortfolios(portfolioData || []);

      // Fetch reviews
      const reviewData = await api.getCreatorReviews(id);
      setReviews(reviewData.reviews || []);

      // Check if following
      if (user && user.id !== id) {
        const followCheck = await api.isFollowing(id);
        setIsFollowing(followCheck.isFollowing);

        // Check wishlist
        const wishlistCheck = await api.checkWishlist("creator", id);
        setInWishlist(wishlistCheck.inWishlist);
      }

      // Get follow stats
      const stats = await api.getSocialStats(id);
      setFollowStats(stats);
    } catch (error: any) {
      console.error("Error fetching creator data:", error);
      toast({
        title: t("common.error"),
        description: "Failed to load creator profile",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async () => {
    if (!user || !id) {
      navigate("/signin");
      return;
    }

    try {
      if (isFollowing) {
        await api.unfollowUser(id);
        setIsFollowing(false);
        toast({
          title: t("common.unfollowed"),
          description: "You unfollowed this creator",
        });
      } else {
        await api.followUser(id);
        setIsFollowing(true);
        toast({
          title: t("common.following"),
          description: "You are now following this creator",
        });
      }
      const stats = await api.getSocialStats(id);
      setFollowStats(stats);
    } catch (error: any) {
      toast({
        title: t("common.error"),
        description: error.message || "Failed to update follow status",
        variant: "destructive",
      });
    }
  };

  const handleWishlist = async () => {
    if (!user || !id) {
      navigate("/signin");
      return;
    }

    try {
      const wishlists = await api.getWishlists();
      if (wishlists.length === 0) {
        const newWishlist = await api.createWishlist({ name: "My Wishlist" });
        await api.addWishlistItem(newWishlist.id, {
          itemType: "creator",
          itemId: id,
        });
      } else {
        const wishlistCheck = await api.checkWishlist("creator", id);
        if (wishlistCheck.inWishlist) {
          await api.removeWishlistItem(wishlistCheck.wishlist.id, id, {
            itemType: "creator",
          });
          setInWishlist(false);
          toast({
            title: t("common.removedFromWishlist"),
          });
        } else {
          await api.addWishlistItem(wishlists[0].id, {
            itemType: "creator",
            itemId: id,
          });
          setInWishlist(true);
          toast({
            title: t("common.addedToWishlist"),
          });
        }
      }
    } catch (error: any) {
      toast({
        title: t("common.error"),
        description: error.message || "Failed to update wishlist",
        variant: "destructive",
      });
    }
  };

  const handleSubmitReview = async () => {
    if (!user || !id) {
      navigate("/signin");
      return;
    }

    if (!reviewComment.trim()) {
      toast({
        title: t("common.commentRequired"),
        description: "Please provide a review comment",
        variant: "destructive",
      });
      return;
    }

    setSubmittingReview(true);
    try {
      await api.submitReview({
        creatorId: id,
        rating: reviewRating,
        comment: reviewComment,
      });

      toast({
        title: t("common.reviewSubmitted"),
        description: "Thank you for your review!",
      });

      setShowReviewDialog(false);
      setReviewComment("");
      setReviewRating(5);
      await fetchCreatorData(); // Refresh reviews
    } catch (error: any) {
      console.error("Error submitting review:", error);
      toast({
        title: t("common.error"),
        description: error.message || "Failed to submit review",
        variant: "destructive",
      });
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleMessage = () => {
    if (!user) {
      navigate("/signin");
      return;
    }
    navigate(`/messages?recipient=${id}`);
  };

  const handleBooking = () => {
    if (!user) {
      navigate("/signin");
      return;
    }
    navigate(`/booking?creator=${id}`);
  };

  if (loading) {
    return <div className="min-h-screen bg-background"><Header /><div className="container mx-auto px-4 pt-24">Loading...</div></div>;
  }

  if (!profile) {
    return <div className="min-h-screen bg-background"><Header /><div className="container mx-auto px-4 pt-24">Creator not found</div></div>;
  }

  const avgRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 pt-24 pb-12">
        <Card className="mb-8">
          <CardContent className="p-8">
            <div className="flex flex-col md:flex-row gap-6">
              <Avatar className="h-32 w-32">
                <AvatarImage src={profile.avatar_url} alt={profile.display_name} />
                <AvatarFallback>{profile.display_name?.[0]}</AvatarFallback>
              </Avatar>
              
              <div className="flex-1">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h1 className="text-3xl font-bold mb-2">{profile.display_name}</h1>
                    {profile.is_creator && <Badge>Creator</Badge>}
                  </div>
                  <div className="flex gap-2">
                    {user && user.id !== id && (
                      <>
                        <Button
                          variant={isFollowing ? "outline" : "default"}
                          onClick={handleFollow}
                        >
                          {isFollowing ? (
                            <>
                              <UserMinus className="mr-2 h-4 w-4" />
                              Unfollow
                            </>
                          ) : (
                            <>
                              <UserPlus className="mr-2 h-4 w-4" />
                              Follow
                            </>
                          )}
                        </Button>
                        <Button
                          variant={inWishlist ? "secondary" : "outline"}
                          onClick={handleWishlist}
                        >
                          <Heart
                            className={`mr-2 h-4 w-4 ${
                              inWishlist ? "fill-red-500 text-red-500" : ""
                            }`}
                          />
                          {inWishlist ? "In Wishlist" : "Add to Wishlist"}
                        </Button>
                      </>
                    )}
                    <Button onClick={handleMessage}>
                      <MessageCircle className="mr-2 h-4 w-4" />
                      Message
                    </Button>
                    <Button onClick={handleBooking}>
                      <Calendar className="mr-2 h-4 w-4" />
                      Book
                    </Button>
                  </div>
                </div>

                {profile.bio && <p className="text-muted-foreground mb-4">{profile.bio}</p>}

                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  {profile.location && (
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {profile.location}
                    </div>
                  )}
                  {profile.website && (
                    <div className="flex items-center gap-1">
                      <Globe className="h-4 w-4" />
                      <a href={profile.website} target="_blank" rel="noopener noreferrer" className="hover:text-primary">
                        {profile.website}
                      </a>
                    </div>
                  )}
                  {profile.phone && (
                    <div className="flex items-center gap-1">
                      <Phone className="h-4 w-4" />
                      {profile.phone}
                    </div>
                  )}
                  {reviews.length > 0 && (
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      {avgRating.toFixed(1)} ({reviews.length} reviews)
                    </div>
                  )}
                  {followStats.followers > 0 && (
                    <div className="flex items-center gap-1">
                      <UserPlus className="h-4 w-4" />
                      {followStats.followers} followers
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="portfolio" className="w-full">
          <TabsList>
            <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
            <TabsTrigger value="reviews">Reviews</TabsTrigger>
          </TabsList>

          <TabsContent value="portfolio" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {portfolios.map((item) => (
                <Card key={item.id}>
                  <CardContent className="p-4">
                    {item.image_url && (
                      <img
                        src={item.image_url}
                        alt={item.title}
                        className="w-full h-48 object-cover rounded-md mb-4"
                      />
                    )}
                    <h3 className="font-semibold mb-2">{item.title}</h3>
                    <p className="text-sm text-muted-foreground mb-2">{item.description}</p>
                    <div className="flex gap-2 flex-wrap">
                      <Badge variant="secondary">{item.category}</Badge>
                      {item.tags?.map((tag: string) => (
                        <Badge key={tag} variant="outline">{tag}</Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            {portfolios.length === 0 && (
              <p className="text-center text-muted-foreground py-12">No portfolio items yet</p>
            )}
          </TabsContent>

          <TabsContent value="reviews" className="mt-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-lg font-semibold">Reviews</h3>
                {reviews.length > 0 && (
                  <p className="text-sm text-muted-foreground">
                    {reviews.length} review{reviews.length > 1 ? 's' : ''}
                  </p>
                )}
              </div>
              {user && user.id !== id && (
                <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
                  <DialogTrigger asChild>
                    <Button>Write a Review</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Write a Review</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Rating</Label>
                        <div className="flex gap-2 mt-2">
                          {[1, 2, 3, 4, 5].map((rating) => (
                            <button
                              key={rating}
                              type="button"
                              onClick={() => setReviewRating(rating)}
                              className="focus:outline-none"
                            >
                              <Star
                                className={`h-6 w-6 ${
                                  rating <= reviewRating
                                    ? "fill-yellow-400 text-yellow-400"
                                    : "text-gray-300"
                                }`}
                              />
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="review-comment">Comment</Label>
                        <Textarea
                          id="review-comment"
                          value={reviewComment}
                          onChange={(e) => setReviewComment(e.target.value)}
                          placeholder="Share your experience..."
                          rows={4}
                          className="mt-2"
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          onClick={() => setShowReviewDialog(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleSubmitReview}
                          disabled={submittingReview}
                        >
                          {submittingReview ? "Submitting..." : "Submit Review"}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
            <div className="space-y-4">
              {reviews.map((review: any) => (
                <Card key={review.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <Avatar>
                        <AvatarImage src={review.reviewer_avatar} />
                        <AvatarFallback>{review.reviewer_name?.[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-semibold">{review.reviewer_name}</span>
                          <div className="flex">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={`h-4 w-4 ${
                                  i < review.rating
                                    ? "fill-yellow-400 text-yellow-400"
                                    : "text-gray-300"
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-xs text-muted-foreground ml-auto">
                            {new Date(review.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        {review.comment && (
                          <p className="text-sm text-muted-foreground">{review.comment}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            {reviews.length === 0 && (
              <p className="text-center text-muted-foreground py-12">No reviews yet</p>
            )}
          </TabsContent>
        </Tabs>
      </div>
      <Footer />
    </div>
  );
}
