import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Heart, MessageCircle, Share2, Image as ImageIcon, Plus, Send } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SocialFeed() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newPost, setNewPost] = useState({
    content: "",
    mediaUrls: [] as string[],
  });

  useEffect(() => {
    if (user) {
      fetchFeed();
    } else {
      navigate("/auth");
    }
  }, [user]);

  const fetchFeed = async () => {
    try {
      const data = await api.getSocialFeed();
      setPosts(data || []);
    } catch (error: any) {
      console.error("Error fetching feed:", error);
      toast({
        title: "Error",
        description: "Failed to load feed",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePost = async () => {
    if (!newPost.content.trim()) {
      toast({
        title: "Content required",
        description: "Please write something to post",
        variant: "destructive",
      });
      return;
    }

    try {
      await api.createSocialPost({
        content: newPost.content,
        mediaUrls: newPost.mediaUrls,
      });

      toast({
        title: "Post created",
        description: "Your post has been shared",
      });

      setShowCreateDialog(false);
      setNewPost({ content: "", mediaUrls: [] });
      await fetchFeed();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create post",
        variant: "destructive",
      });
    }
  };

  const handleLike = async (postId: string) => {
    try {
      const result = await api.likePost(postId);
      await fetchFeed();
    } catch (error) {
      console.error("Error liking post:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="pt-24 pb-16 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading feed...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2">Social Feed</h1>
              <p className="text-muted-foreground">
                See what creators you follow are sharing
              </p>
            </div>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  New Post
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Post</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="content">What's on your mind?</Label>
                    <Textarea
                      id="content"
                      value={newPost.content}
                      onChange={(e) =>
                        setNewPost({ ...newPost, content: e.target.value })
                      }
                      placeholder="Share your thoughts..."
                      rows={6}
                      className="mt-2"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setShowCreateDialog(false)}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleCreatePost}>Post</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {posts.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <p className="text-muted-foreground mb-4">
                  Your feed is empty. Follow creators to see their posts!
                </p>
                <Button onClick={() => navigate("/")}>
                  Discover Creators
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onLike={handleLike}
                  onComment={() => {}}
                />
              ))}
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}

function PostCard({ post, onLike, onComment }: any) {
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const { toast } = useToast();

  const fetchComments = async () => {
    try {
      const data = await api.getPostComments(post.id);
      setComments(data || []);
    } catch (error) {
      console.error("Error fetching comments:", error);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    try {
      await api.commentOnPost(post.id, { content: newComment });
      setNewComment("");
      await fetchComments();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add comment",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start gap-4 mb-4">
          <Avatar>
            <AvatarImage src={post.avatar_url} />
            <AvatarFallback>{post.display_name?.[0]}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold">{post.display_name}</span>
              <span className="text-sm text-muted-foreground">
                {formatDistanceToNow(new Date(post.created_at), {
                  addSuffix: true,
                })}
              </span>
            </div>
            <p className="text-sm whitespace-pre-wrap">{post.content}</p>
            {post.media_urls && post.media_urls.length > 0 && (
              <div className="mt-3 grid grid-cols-2 gap-2">
                {post.media_urls.map((url: string, idx: number) => (
                  <img
                    key={idx}
                    src={url}
                    alt={`Post media ${idx + 1}`}
                    className="rounded-md w-full h-48 object-cover"
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-6 pt-4 border-t">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onLike(post.id)}
            className={post.is_liked ? "text-red-500" : ""}
          >
            <Heart
              className={`h-4 w-4 mr-2 ${
                post.is_liked ? "fill-red-500 text-red-500" : ""
              }`}
            />
            {post.likes_count || 0}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setShowComments(!showComments);
              if (!showComments) fetchComments();
            }}
          >
            <MessageCircle className="h-4 w-4 mr-2" />
            {post.comments_count || 0}
          </Button>
          <Button variant="ghost" size="sm">
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
        </div>

        {showComments && (
          <div className="mt-4 pt-4 border-t space-y-3">
            {comments.map((comment) => (
              <div key={comment.id} className="flex items-start gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={comment.avatar_url} />
                  <AvatarFallback>{comment.display_name?.[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">
                      {comment.display_name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(comment.created_at), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {comment.content}
                  </p>
                </div>
              </div>
            ))}
            <div className="flex gap-2 mt-4">
              <Input
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Write a comment..."
                onKeyPress={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleAddComment();
                  }
                }}
              />
              <Button onClick={handleAddComment} size="sm">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

