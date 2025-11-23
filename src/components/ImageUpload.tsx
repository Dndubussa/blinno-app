import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Upload, X, Loader2, Image as ImageIcon } from "lucide-react";
import { optimizeImage } from "@/lib/imageOptimizer";

interface ImageUploadProps {
  bucket: "avatars" | "portfolios";
  userId: string;
  onUploadComplete: (url: string) => void;
  currentImage?: string;
  maxSizeMB?: number;
}

export function ImageUpload({
  bucket,
  userId,
  onUploadComplete,
  currentImage,
  maxSizeMB = 5,
}: ImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(currentImage || null);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      // Validate file size
      if (file.size > maxSizeMB * 1024 * 1024) {
        toast({
          title: "Error",
          description: `File size must be less than ${maxSizeMB}MB`,
          variant: "destructive",
        });
        return;
      }

      // Validate file type
      if (!file.type.startsWith("image/")) {
        toast({
          title: "Error",
          description: "Only image files are allowed",
          variant: "destructive",
        });
        return;
      }

      try {
        setUploading(true);

        // Optimize image before upload
        const optimizedBlob = await optimizeImage(file);

        // Create preview
        const previewUrl = URL.createObjectURL(optimizedBlob);
        setPreview(previewUrl);

        // Upload to backend
        const formData = new FormData();
        formData.append('file', optimizedBlob, file.name);

        const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://www.blinno.app/api'}/upload/image`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          },
          body: formData,
        });

        if (!response.ok) {
          const error = await response.json().catch(() => ({ error: 'Upload failed' }));
          throw new Error(error.error || 'Upload failed');
        }

        const { url } = await response.json();
        onUploadComplete(url);

        toast({
          title: "Success",
          description: "Image uploaded successfully",
        });
      } catch (error: any) {
        console.error("Upload error:", error);
        toast({
          title: "Error",
          description: error.message || "Failed to upload image",
          variant: "destructive",
        });
        setPreview(currentImage || null);
      } finally {
        setUploading(false);
      }
    },
    [bucket, userId, maxSizeMB, onUploadComplete, currentImage, toast]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".png", ".jpg", ".jpeg", ".webp"],
    },
    maxFiles: 1,
    disabled: uploading,
  });

  const removeImage = () => {
    setPreview(null);
    onUploadComplete("");
  };

  return (
    <div className="w-full">
      {preview ? (
        <div className="relative">
          <img
            src={preview}
            alt="Preview"
            className="w-full h-48 object-cover rounded-lg border border-border"
          />
          {!uploading && (
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2"
              onClick={removeImage}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
          {uploading && (
            <div className="absolute inset-0 bg-background/80 flex items-center justify-center rounded-lg">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}
        </div>
      ) : (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            isDragActive
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50"
          } ${uploading ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center gap-2">
            {uploading ? (
              <>
                <Loader2 className="h-12 w-12 text-muted-foreground animate-spin" />
                <p className="text-sm text-muted-foreground">
                  Optimizing and uploading...
                </p>
              </>
            ) : (
              <>
                {isDragActive ? (
                  <Upload className="h-12 w-12 text-primary" />
                ) : (
                  <ImageIcon className="h-12 w-12 text-muted-foreground" />
                )}
                <div>
                  <p className="text-sm font-medium">
                    {isDragActive
                      ? "Drop image here"
                      : "Drag & drop an image, or click to select"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    PNG, JPG, WEBP up to {maxSizeMB}MB
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
