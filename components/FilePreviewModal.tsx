import { useCallback, useEffect, useState } from "react";
import { Loader2, Download, FileText, FileWarning, Printer, Share2, Check, Link2, Clock, Copy, Maximize2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getFileUrl, downloadFile, formatBytes, createShareUrl } from "@/lib/files";
import type { DatabaseFile } from "@/lib/types";

interface FilePreviewModalProps {
  file: DatabaseFile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Returns true when the mime type is a previewable image. */
function isPreviewableImage(mime: string): boolean {
  return mime.startsWith("image/");
}

/** Returns true when the mime type is a PDF document. */
function isPreviewablePdf(mime: string): boolean {
  return mime === "application/pdf";
}

/**
 * Modal dialog that renders an inline preview for image and PDF uploads.
 * Non-previewable file types show a friendly message with a download button.
 */
export function FilePreviewModal({ file, open, onOpenChange }: FilePreviewModalProps) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Share state
  const [shareOpen, setShareOpen] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareExpiresIn, setShareExpiresIn] = useState<number>(60 * 60 * 24 * 7); // 7 days
  const [copied, setCopied] = useState(false);

  const expiryOptions = [
    { label: "1 hour", seconds: 3600 },
    { label: "1 day", seconds: 60 * 60 * 24 },
    { label: "7 days", seconds: 60 * 60 * 24 * 7 },
    { label: "30 days", seconds: 60 * 60 * 24 * 30 },
  ] as const;

  const loadUrl = useCallback(async (storagePath: string) => {
    setLoading(true);
    setError(null);
    setSignedUrl(null);
    try {
      const url = await getFileUrl(storagePath);
      if (!url) {
        setError("Could not generate a preview link for this file.");
      } else {
        setSignedUrl(url);
      }
    } catch {
      setError("An error occurred while loading the preview.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open && file) {
      loadUrl(file.storage_path);
    } else {
      // Reset state when the modal closes so stale URLs don't flash on reopen
      setSignedUrl(null);
      setError(null);
      setShareOpen(false);
      setShareUrl(null);
      setCopied(false);
    }
  }, [open, file, loadUrl]);

  /**
   * Generates a time-limited signed URL for sharing the document.
   * The URL allows anyone with the link to view the file for the selected duration.
   */
  const handleShare = async () => {
    if (!file) return;
    setShareLoading(true);
    setShareOpen(true);
    setShareUrl(null);
    setCopied(false);
    try {
      const url = await createShareUrl(file.storage_path, shareExpiresIn);
      if (!url) {
        toast.error("Could not generate a share link for this file.");
        setShareOpen(false);
      } else {
        setShareUrl(url);
      }
    } catch {
      toast.error("An error occurred while generating the share link.");
      setShareOpen(false);
    } finally {
      setShareLoading(false);
    }
  };

  /** Copy the generated share URL to the clipboard. */
  const handleCopyLink = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Share link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy link. Copy it manually below.");
    }
  };

  /** Regenerate a share URL with a new expiry duration. */
  const handleExpiryChange = async (seconds: number) => {
    setShareExpiresIn(seconds);
    if (!file) return;
    setShareLoading(true);
    setShareUrl(null);
    try {
      const url = await createShareUrl(file.storage_path, seconds);
      if (url) {
        setShareUrl(url);
        setCopied(false);
      } else {
        toast.error("Could not generate share link.");
      }
    } catch {
      toast.error("An error occurred while generating the share link.");
    } finally {
      setShareLoading(false);
    }
  };

  if (!file) return null;

  const isImage = isPreviewableImage(file.mime_type);
  const isPdf = isPreviewablePdf(file.mime_type);
  const canPreview = isImage || isPdf;

  const handleDownload = async () => {
    if (!file) return;
    try {
      await downloadFile(file.storage_path, file.name);
    } catch {
      // Fallback to opening the signed URL in a new tab
      if (signedUrl) window.open(signedUrl, "_blank");
    }
  };

  /**
   * Opens the browser print dialog for the currently previewed document.
   * PDFs are printed via a hidden iframe pointing at the signed URL;
   * images are printed via a hidden iframe containing an <img> tag.
   */
  const handlePrint = () => {
    if (!signedUrl) return;
    const printFrame = document.createElement("iframe");
    printFrame.style.position = "fixed";
    printFrame.style.right = "0";
    printFrame.style.bottom = "0";
    printFrame.style.width = "0";
    printFrame.style.height = "0";
    printFrame.style.border = "0";
    printFrame.setAttribute("aria-hidden", "true");
    document.body.appendChild(printFrame);

    const cleanup = () => {
      // Remove the iframe after the print dialog closes
      setTimeout(() => {
        if (printFrame.parentNode) document.body.removeChild(printFrame);
      }, 1000);
    };

    if (isPdf) {
      // PDFs can be printed directly from the iframe source
      printFrame.src = signedUrl;
      printFrame.onload = () => {
        try {
          printFrame.contentWindow?.focus();
          printFrame.contentWindow?.print();
          cleanup();
        } catch {
          // Cross-origin restriction — fall back to opening in a new tab for printing
          window.open(signedUrl, "_blank");
          cleanup();
        }
      };
    } else if (isImage) {
      // Build a minimal HTML document containing the image for printing
      const doc = printFrame.contentWindow?.document;
      if (!doc) {
        cleanup();
        return;
      }
      doc.open();
      doc.write(`
        <html>
          <head>
            <title>${file.name}</title>
            <style>
              @page { margin: 0.5in; }
              html, body { margin: 0; padding: 0; }
              body { display: flex; align-items: center; justify-content: center; min-height: 100vh; }
              img { max-width: 100%; max-height: 100vh; object-fit: contain; }
            </style>
          </head>
          <body>
            <img src="${signedUrl}" alt="${file.name}" />
          </body>
        </html>
      `);
      doc.close();
      // Wait for the image to load before triggering print
      const img = doc.querySelector("img");
      const triggerPrint = () => {
        try {
          printFrame.contentWindow?.focus();
          printFrame.contentWindow?.print();
          cleanup();
        } catch {
          window.open(signedUrl, "_blank");
          cleanup();
        }
      };
      if (img && !img.complete) {
        img.onload = triggerPrint;
        img.onerror = triggerPrint;
      } else {
        triggerPrint();
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-4xl overflow-hidden p-0">
        {/* Header — file metadata */}
        <div className="flex items-center justify-between gap-3 border-b border-border px-6 py-4">
          <div className="min-w-0 flex-1">
            <DialogHeader className="space-y-1">
              <DialogTitle className="truncate text-base">{file.name}</DialogTitle>
              <DialogDescription className="flex flex-wrap items-center gap-2 text-xs">
                <span>{formatBytes(file.size_bytes)}</span>
                <span aria-hidden>·</span>
                <span>{file.mime_type || "Unknown type"}</span>
                <span aria-hidden>·</span>
                <span>
                  {new Date(file.created_at).toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {isImage && (
              <Badge variant="secondary" className="text-[10px]">
                Image
              </Badge>
            )}
            {isPdf && (
              <Badge variant="secondary" className="text-[10px]">
                PDF
              </Badge>
            )}
            {canPreview && (
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                onClick={handlePrint}
                disabled={!signedUrl}
              >
                <Printer className="h-3.5 w-3.5" />
                Print
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={handleShare}
            >
              <Share2 className="h-3.5 w-3.5" />
              Share
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={handleDownload}
              disabled={!signedUrl}
            >
              <Download className="h-3.5 w-3.5" />
              Download
            </Button>
            {signedUrl && (
              <Button size="sm" className="gap-1.5" onClick={() => window.open(signedUrl, "_blank", "noopener,noreferrer")}>
                <Maximize2 className="h-3.5 w-3.5" />
                Full View
              </Button>
            )}
          </div>
        </div>

        {/* Share panel — collapsible section for generating a share link */}
        {shareOpen && (
          <div className="border-b border-border bg-primary/5 px-6 py-4">
            <div className="flex items-center gap-2 mb-3">
              <Link2 className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Secure share link</span>
              <span className="text-[11px] text-muted-foreground flex items-center gap-1 ml-auto">
                <Clock className="h-3 w-3" />
                Expires automatically
              </span>
            </div>

            {/* Expiry selector */}
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="text-xs text-muted-foreground mr-1">Link valid for:</span>
              {expiryOptions.map((opt) => (
                <Button
                  key={opt.seconds}
                  size="sm"
                  variant={shareExpiresIn === opt.seconds ? "default" : "outline"}
                  className="h-7 px-2.5 text-xs gap-1"
                  onClick={() => handleExpiryChange(opt.seconds)}
                  disabled={shareLoading}
                >
                  {opt.label}
                </Button>
              ))}
            </div>

            {/* Share URL display + copy */}
            {shareLoading ? (
              <div className="flex items-center gap-2 py-2">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">Generating secure link…</span>
              </div>
            ) : shareUrl ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={shareUrl}
                  onFocus={(e) => e.currentTarget.select()}
                  className="flex-1 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-mono truncate"
                />
                <Button
                  size="sm"
                  variant={copied ? "default" : "outline"}
                  className="gap-1.5 shrink-0"
                  onClick={handleCopyLink}
                >
                  {copied ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                  {copied ? "Copied!" : "Copy"}
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Unable to generate a link.</p>
            )}
            <p className="mt-2 text-[11px] text-muted-foreground">
              Anyone with this link can view the document. The link will stop working after the selected time.
            </p>
          </div>
        )}

        {/* Body — preview content */}
        <div className="relative max-h-[calc(92vh-72px)] overflow-auto bg-muted/30 p-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Loading preview…</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                <FileWarning className="h-6 w-6 text-destructive" />
              </div>
              <p className="text-sm font-medium">{error}</p>
              <Button size="sm" variant="outline" className="mt-1 gap-1.5" onClick={handleDownload}>
                <Download className="h-3.5 w-3.5" />
                Download instead
              </Button>
            </div>
          ) : !canPreview ? (
            <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
                <FileText className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">Preview not available for this file type</p>
              <p className="max-w-sm text-xs text-muted-foreground">
                You can still download the file to view it in its native application.
              </p>
              <Button size="sm" variant="outline" className="mt-1 gap-1.5" onClick={handleDownload}>
                <Download className="h-3.5 w-3.5" />
                Download file
              </Button>
            </div>
          ) : isImage && signedUrl ? (
            <div className="flex items-center justify-center">
              <img
                src={signedUrl}
                alt={file.name}
                className="max-h-[calc(92vh-140px)] max-w-full rounded-lg object-contain shadow-sm"
                onError={() => setError("Failed to load the image. It may be corrupted or inaccessible.")}
              />
            </div>
          ) : isPdf && signedUrl ? (
            <iframe
              src={signedUrl}
              title={file.name}
              className="h-[calc(92vh-140px)] w-full rounded-lg border border-border bg-white"
            />
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
