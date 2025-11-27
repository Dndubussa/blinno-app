import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import creator1 from "@/assets/gallery/creator-1.jpg";
import creator2 from "@/assets/gallery/creator-2.jpg";
import creator3 from "@/assets/gallery/creator-3.jpg";
import creator4 from "@/assets/gallery/creator-4.jpg";
import creator5 from "@/assets/gallery/creator-5.jpg";
import creator6 from "@/assets/gallery/creator-6.jpg";

const galleryItems = [
  {
    id: 1,
    image: creator1,
    title: "Local Landscapes",
    creator: "Sarah Mwangi",
    category: "Photography",
  },
  {
    id: 2,
    image: creator2,
    title: "African Fashion Design",
    creator: "Amina Hassan",
    category: "Fashion",
  },
  {
    id: 3,
    image: creator3,
    title: "Contemporary African Art",
    creator: "David Kimaro",
    category: "Art",
  },
  {
    id: 4,
    image: creator4,
    title: "Traditional Music",
    creator: "John Makonde",
    category: "Music",
  },
  {
    id: 5,
    image: creator5,
    title: "Local Cuisine",
    creator: "Peter Moshi",
    category: "Food",
  },
  {
    id: 6,
    image: creator6,
    title: "Tech Innovation",
    creator: "Grace Sanga",
    category: "Technology",
  },
];

const categories = ["All", "Photography", "Fashion", "Art", "Music", "Food", "Technology"];

export const CreatorGallery = () => {
  const [selectedImage, setSelectedImage] = useState<typeof galleryItems[0] | null>(null);
  const [filter, setFilter] = useState("All");
  const navigate = useNavigate();

  const filteredItems = filter === "All" 
    ? galleryItems 
    : galleryItems.filter(item => item.category === filter);

  return (
    <section className="container mx-auto px-4 py-16">
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-4xl font-bold mb-4">
          <span className="text-primary">Creator</span> Gallery
        </h2>
        <p className="text-xl text-muted-foreground mb-8">
          Discover amazing work from local creators
        </p>

        <div className="flex flex-wrap gap-2 justify-center mb-8">
          {categories.map((category) => (
            <Button
              key={category}
              variant={filter === category ? "default" : "outline"}
              onClick={() => setFilter(category)}
              className="rounded-full"
            >
              {category}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredItems.map((item) => (
          <div
            key={item.id}
            className="group relative overflow-hidden rounded-lg cursor-pointer aspect-square"
            onClick={() => setSelectedImage(item)}
          >
            <img
              src={item.image}
              alt={item.title}
              loading="lazy"
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110 will-change-transform"
              style={{
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden'
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <div className="absolute bottom-0 left-0 right-0 p-6">
                <Badge className="mb-2 bg-primary">{item.category}</Badge>
                <h3 className="text-xl font-bold text-foreground mb-1">{item.title}</h3>
                <p className="text-sm text-muted-foreground">by {item.creator}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden">
          {selectedImage && (
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-4 right-4 z-10 bg-background/80 hover:bg-background"
                onClick={() => setSelectedImage(null)}
              >
                <X className="h-4 w-4" />
              </Button>
              <img
                src={selectedImage.image}
                alt={selectedImage.title}
                className="w-full h-auto"
              />
              <div className="p-6 bg-card">
                <Badge className="mb-2 bg-primary">{selectedImage.category}</Badge>
                <h3 className="text-2xl font-bold mb-2">{selectedImage.title}</h3>
                <p className="text-muted-foreground">Created by {selectedImage.creator}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Get Started Today Button */}
      <div className="mt-12 text-center">
        <button 
          onClick={() => navigate("/auth?tab=signup")}
          className="inline-block bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 px-8 rounded-lg transition-colors duration-300"
        >
          Get Started Today
        </button>
        <p className="mt-4 text-muted-foreground">Showcase your creativity to a global audience</p>
      </div>
    </section>
  );
};
