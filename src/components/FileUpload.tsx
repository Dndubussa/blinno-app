/**
 * File Upload Component for Books and Documents
 * Supports PDF, EPUB, MOBI, AZW3, FB2 formats
 */

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, X, FileText, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface FileUploadProps {
  onFileSelect: (file: File | null) => void;
  currentFile?: string | null;
  accept?: string;
  maxSizeMB?: number;
  label?: string;
  description?: string;
  className?: string;
}

const ALLOWED_BOOK_TYPES = [
  'application/pdf',
  'application/epub+zip',
  'application/x-mobipocket-ebook',
  'application/vnd.amazon.ebook',
  'application/x-fictionbook+xml',
];

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export function FileUpload({
  onFileSelect,
  currentFile,
  accept = '.pdf,.epub,.mobi,.azw3,.fb2',
  maxSizeMB = 50,
  label = "Upload File",
  description = "PDF, EPUB, MOBI, AZW3, or FB2 (max 50MB)",
  className,
}: FileUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validate file type
    if (!ALLOWED_BOOK_TYPES.includes(selectedFile.type)) {
      toast({
        title: "Invalid File Type",
        description: "Please upload a PDF, EPUB, MOBI, AZW3, or FB2 file.",
        variant: "destructive",
      });
      return;
    }

    // Validate file size
    if (selectedFile.size > maxSizeMB * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: `File size must be less than ${maxSizeMB}MB.`,
        variant: "destructive",
      });
      return;
    }

    setFile(selectedFile);
    onFileSelect(selectedFile);
  };

  const handleRemove = () => {
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onFileSelect(null as any);
  };

  const getFileIcon = (fileName?: string) => {
    if (!fileName) return <FileText className="h-5 w-5" />;
    const ext = fileName.split('.').pop()?.toLowerCase();
    return <FileText className="h-5 w-5" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  return (
    <div className={cn("space-y-2", className)}>
      <Label>{label}</Label>
      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}

      {file || currentFile ? (
        <div className="flex items-center gap-3 p-4 border rounded-lg bg-muted/50">
          {getFileIcon(file?.name || currentFile)}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {file?.name || currentFile?.split('/').pop() || 'File'}
            </p>
            {file && (
              <p className="text-xs text-muted-foreground">
                {formatFileSize(file.size)}
              </p>
            )}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleRemove}
            disabled={uploading}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
          <Input
            ref={fileInputRef}
            type="file"
            accept={accept}
            onChange={handleFileChange}
            className="hidden"
            id="file-upload"
          />
          <Label
            htmlFor="file-upload"
            className="cursor-pointer flex flex-col items-center gap-2"
          >
            <Upload className="h-8 w-8 text-muted-foreground" />
            <span className="text-sm font-medium">Click to upload</span>
            <span className="text-xs text-muted-foreground">
              {accept} (max {maxSizeMB}MB)
            </span>
          </Label>
        </div>
      )}
    </div>
  );
}

