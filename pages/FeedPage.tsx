import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Newspaper,
  Heart,
  MessageSquare,
  Send,
  Stethoscope,
  TrendingUp,
  FlaskConical,
  Users,
  Loader2,
  Search,
  X,
  Share2,
  MessageCircle,
  Flame,
  Clock,
  ImagePlus,
  Trash2,
  MapPin,
  ExternalLink,
  ThumbsUp,
} from "lucide-react";
import { toast } from "sonner";
import { useSearchParams } from "react-router-dom";

import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { uploadPostImage } from "@/lib/files";
import type { DatabasePost } from "@/lib/types";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useRealtimeInvalidation } from "@/hooks/use-realtime-invalidation";

type Category = "all" | "surgery" | "news" | "discussion" | "case-study";
type SortMode = "recent" | "liked" | "discussed";

const CATEGORIES: { id: Category; label: string; icon: typeof Stethoscope }[] = [
  { id: "all", label: "All", icon: Newspaper },
  { id: "surgery", label: "Surgery Stories", icon: Stethoscope },
  { id: "news", label: "News & Updates", icon: TrendingUp },
  { id: "case-study", label: "Case Studies", icon: FlaskConical },
  { id: "discussion", label: "Discussions", icon: Users },
];

const SORT_OPTIONS: { value: SortMode; label: string; icon: typeof Clock }[] = [
  { value: "recent", label: "Most Recent", icon: Clock },
  { value: "liked", label: "Most Liked", icon: Heart },
  { value: "discussed", label: "Most Discussed", icon: Flame },
];

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function FeedPage() {
  const [searchParams] = useSearchParams();
  const { profile, user } = useAuth();
  const queryClient = useQueryClient();
  const [category, setCategory] = useState<Category>("all");
  const [sort, setSort] = useState<SortMode>("recent");
  const [search, setSearch] = useState("");
  const [showComposer, setShowComposer] = useState(() => searchParams.get("compose") === "1" || searchParams.get("compose") === "news");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tags, setTags] = useState("");
  const [postCategory, setPostCategory] =
    useState<DatabasePost["category"]>(() => searchParams.get("compose") === "news" ? "news" : "discussion");
  const [postImage, setPostImage] = useState<File | null>(null);
  const [postImagePreview, setPostImagePreview] = useState<string | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [commentingOn, setCommentingOn] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");
  const [likingIds, setLikingIds] = useState<Set<string>>(new Set());
  const [locationName, setLocationName] = useState("");

  useRealtimeInvalidation("social-feed-live", [
    { table: "posts", queryKeys: [["posts"], ["carousel-posts"], ["medical-news"]] },
    { table: "post_comments", queryKeys: [["posts"]] },
  ]);

  const { data: posts = [], isLoading } = useQuery<DatabasePost[]>({
    queryKey: ["posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      const postRows = (data ?? []) as DatabasePost[];
      const { data: comments } = await supabase.from("post_comments").select("*").order("created_at", { ascending: true });
      return postRows.map((post) => ({ ...post, comments: (comments ?? []).filter((comment) => comment.post_id === post.id) })) as DatabasePost[];
    },
  });

  // Filter + sort + search
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = posts;
    if (category !== "all") {
      list = list.filter((p) => p.category === category);
    }
    if (q) {
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.body.toLowerCase().includes(q) ||
          p.author_name.toLowerCase().includes(q) ||
          p.tags.some((t) => t.toLowerCase().includes(q)),
      );
    }
    const sorted = [...list];
    if (sort === "liked") {
      sorted.sort((a, b) => b.likes - a.likes);
    } else if (sort === "discussed") {
      sorted.sort((a, b) => (b.comments?.length ?? 0) - (a.comments?.length ?? 0));
    } else {
      sorted.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
    }
    return sorted;
  }, [posts, category, sort, search]);

  const createPost = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not signed in");

      let imageUrl: string | null = null;
      if (postImage) {
        setImageUploading(true);
        const result = await uploadPostImage(user.id, postImage);
        setImageUploading(false);
        if (result.error) throw new Error(result.error);
        imageUrl = result.publicUrl;
      }

      const { error } = await supabase.from("posts").insert({
        user_id: user.id,
        author_name: profile?.full_name ?? "Anonymous",
        author_specialty: profile?.specialty ?? null,
        category: postCategory,
        title: title.trim(),
        body: body.trim(),
        tags: tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        image_url: imageUrl,
        likes: 0,
        liked_by: [],
        comments: [],
        location_name: locationName.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Post published.");
      setTitle("");
      setBody("");
      setTags("");
      setPostImage(null);
      setPostImagePreview(null);
      setLocationName("");
      setShowComposer(false);
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
    onError: (e: Error) => {
      setImageUploading(false);
      toast.error(e.message);
    },
  });

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5 MB.");
      return;
    }
    setPostImage(file);
    setPostImagePreview(URL.createObjectURL(file));
  };

  const removePostImage = () => {
    setPostImage(null);
    if (postImagePreview) URL.revokeObjectURL(postImagePreview);
    setPostImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const toggleLike = useMutation({
    mutationFn: async (post: DatabasePost) => {
      if (!user) throw new Error("Not signed in");
      const { error } = await supabase.rpc("toggle_post_like", { p_post_id: post.id });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["posts"] }),
  });

  const addComment = useMutation({
    mutationFn: async (post: DatabasePost) => {
      if (!user) throw new Error("Not signed in");
      const newComment = {
        post_id: post.id,
        user_id: user.id,
        author_name: profile?.full_name ?? "Anonymous",
        author_avatar_url: profile?.avatar_url ?? null,
        body: commentText.trim(),
      };
      const { error } = await supabase.from("post_comments").insert(newComment);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      setCommentText("");
      setCommentingOn(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleLike = (post: DatabasePost) => {
    if (!user) {
      toast.error("Please sign in to like posts.");
      return;
    }
    if (likingIds.has(post.id)) return;
    setLikingIds((prev) => new Set(prev).add(post.id));
    toggleLike.mutate(post, {
      onSettled: () => {
        setLikingIds((prev) => {
          const next = new Set(prev);
          next.delete(post.id);
          return next;
        });
      },
    });
  };

  const handleShare = (post: DatabasePost) => {
    const shareText = `${post.title} — by ${post.author_name} on Medical Events Platform`;
    if (navigator.share) {
      navigator.share({ title: post.title, text: shareText }).catch(() => {});
    } else {
      navigator.clipboard
        .writeText(shareText)
        .then(() => toast.success("Post details copied to clipboard."))
        .catch(() => toast.error("Could not copy."));
    }
  };

  const activeFilterCount = (category !== "all" ? 1 : 0) + (search.trim() ? 1 : 0);

  return (
    <AppShell>
      <div className="animate-fade-in-up">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Feed & News</h1>
            <p className="text-sm text-muted-foreground">
              Share surgery stories, discuss cases, and stay updated with the latest medical news.
            </p>
          </div>
          <Button onClick={() => setShowComposer((v) => !v)} className="shrink-0">
            <Send className="mr-1.5 h-4 w-4" />
            New Post
          </Button>
        </div>

        {/* Composer */}
        {showComposer && (
          <Card className="mb-6 animate-fade-in-up">
            <CardContent className="p-5">
              <Input
                placeholder="Post title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mb-3"
              />
              <Textarea
                placeholder="Share your story, insight, or update…"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={4}
                className="mb-3 resize-none"
              />
              <div className="mb-3 flex flex-wrap gap-2">
                {(["surgery", "news", "case-study", "discussion"] as const).map((c) => (
                  <button
                    key={c}
                    onClick={() => setPostCategory(c)}
                    className={cn(
                      "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                      postCategory === c
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-secondary-foreground hover:bg-secondary/70"
                    )}
                  >
                    {c.replace("-", " ")}
                  </button>
                ))}
              </div>
              <Input
                placeholder="Tags (comma-separated, e.g. cardiology, laparoscopy)"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                className="mb-3"
              />
              <div className="relative mb-3">
                <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Location or venue (optional)" value={locationName} onChange={(e) => setLocationName(e.target.value)} className="pl-9" />
              </div>
              {/* Image upload */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
              />
              {postImagePreview ? (
                <div className="relative mb-3 overflow-hidden rounded-lg border border-border">
                  <img
                    src={postImagePreview}
                    alt="Post image preview"
                    className="max-h-64 w-full object-cover"
                  />
                  <button
                    onClick={removePostImage}
                    className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80"
                    aria-label="Remove image"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="mb-3 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border py-3 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
                >
                  <ImagePlus className="h-4 w-4" />
                  Attach an image
                </button>
              )}
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setShowComposer(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => createPost.mutate()}
                  disabled={!title.trim() || !body.trim() || createPost.isPending || imageUploading}
                >
                  {(createPost.isPending || imageUploading) && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                  {imageUploading ? "Uploading image…" : "Publish"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Search bar */}
        <div className="mb-4 relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search posts by title, content, author, or tag…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Category filters + sort */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                onClick={() => setCategory(c.id)}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors",
                  category === c.id
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-card text-muted-foreground hover:bg-secondary"
                )}
              >
                <c.icon className="h-3.5 w-3.5" />
                {c.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Sort:</span>
            <Select value={sort} onValueChange={(v) => setSort(v as SortMode)}>
              <SelectTrigger className="h-8 w-36 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Result count */}
        {activeFilterCount > 0 && (
          <p className="mb-3 text-xs text-muted-foreground">
            {filtered.length} post{filtered.length === 1 ? "" : "s"} match your filters
          </p>
        )}

        {/* Posts */}
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center py-16 text-center">
              <Newspaper className="mb-3 h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm font-medium">
                {activeFilterCount > 0 ? "No posts match your filters" : "No posts in this category yet"}
              </p>
              <p className="text-xs text-muted-foreground">
                {activeFilterCount > 0 ? "Try adjusting your search or filters." : "Be the first to share."}
              </p>
              {activeFilterCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4 gap-1.5"
                  onClick={() => {
                    setSearch("");
                    setCategory("all");
                    setSort("recent");
                  }}
                >
                  <X className="h-3.5 w-3.5" />
                  Clear filters
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filtered.map((post) => {
              const liked = user ? (post.liked_by ?? []).includes(user.id) : false;
              const commentCount = (post.comments ?? []).length;
              return (
                <Card key={post.id} className="overflow-hidden">
                  <CardHeader className="pb-3">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                          {getInitials(post.author_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-semibold">{post.author_name}</p>
                          <Badge variant="secondary" className="text-[10px] capitalize">
                            {post.category.replace("-", " ")}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {post.author_specialty ?? "Healthcare Professional"} ·{" "}
                          {timeAgo(post.created_at)}
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <h3 className="mb-1.5 text-base font-semibold">{post.title}</h3>
                    {post.location_name && (
                      <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(post.location_name)}`} target="_blank" rel="noreferrer" className="mb-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                        <MapPin className="h-3.5 w-3.5" /> {post.location_name} <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                    {post.image_url && (
                      <div className="mb-3 overflow-hidden rounded-lg border border-border">
                        <img
                          src={post.image_url}
                          alt={post.title}
                          loading="lazy"
                          className="max-h-96 w-full object-cover"
                        />
                      </div>
                    )}
                    <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                      {post.body}
                    </p>
                    {post.tags.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {post.tags.map((t) => (
                          <span
                            key={t}
                            className="rounded-full bg-accent/50 px-2 py-0.5 text-[11px] text-accent-foreground"
                          >
                            #{t}
                          </span>
                        ))}
                      </div>
                    )}
                    {/* Actions */}
                    <div className="mt-4 flex items-center justify-between border-t border-border pt-2 text-[11px] text-muted-foreground">
                      <span className="inline-flex items-center gap-1"><ThumbsUp className="h-3.5 w-3.5 fill-primary text-primary" /> {post.likes} {post.likes === 1 ? "member likes this" : "members like this"}</span>
                      <span>{commentCount} {commentCount === 1 ? "comment" : "comments"}</span>
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-1 border-t border-border pt-2">
                      <button
                        onClick={() => handleLike(post)}
                        disabled={likingIds.has(post.id)}
                        className={cn(
                          "flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-all",
                          liked
                            ? "text-rose-500"
                            : "text-muted-foreground hover:bg-rose-500/10 hover:text-rose-500",
                          likingIds.has(post.id) && "scale-95",
                        )}
                      >
                        <ThumbsUp
                          className={cn(
                            "h-4 w-4 transition-transform",
                            liked && "fill-current scale-110",
                          )}
                        />
                        Like
                      </button>
                      <button
                        onClick={() =>
                          setCommentingOn(commentingOn === post.id ? null : post.id)
                        }
                        className={cn(
                          "flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-all",
                          commentingOn === post.id
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground hover:bg-primary/10 hover:text-primary"
                        )}
                      >
                        <MessageSquare className="h-4 w-4" />
                        Comment
                      </button>
                      <button
                        onClick={() => handleShare(post)}
                        className="flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground transition-all hover:bg-secondary hover:text-foreground"
                      >
                        <Share2 className="h-4 w-4" />
                        Share
                      </button>
                    </div>
                    {/* Comments */}
                    {commentingOn === post.id && (
                      <div className="mt-3 space-y-3 border-t border-border pt-3">
                        {(post.comments ?? []).length > 0 && (
                          <div className="space-y-3">
                            {(post.comments ?? []).map((c) => (
                              <div key={c.id} className="flex gap-2">
                                <Avatar className="h-7 w-7">
                                  <AvatarFallback className="bg-muted text-[10px]">
                                    {getInitials(c.author_name)}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0 flex-1 rounded-lg bg-muted px-3 py-2">
                                  <div className="flex items-center justify-between gap-2">
                                    <p className="text-xs font-semibold">{c.author_name}</p>
                                    <p className="text-[10px] text-muted-foreground">
                                      {timeAgo(c.created_at)}
                                    </p>
                                  </div>
                                  <p className="mt-0.5 text-xs text-muted-foreground">{c.body}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="mb-2 flex gap-1" aria-label="Add emoji reaction">{["👍","❤️","👏","🩺","💡","🙏"].map((emoji)=><button key={emoji} type="button" onClick={()=>setCommentText((text)=>`${text}${emoji}`)} className="rounded-md border px-2 py-1 text-sm hover:bg-muted" aria-label={`Add ${emoji}`}>{emoji}</button>)}</div>
                        <div className="flex gap-2">
                          <Input
                            placeholder="Write a comment…"
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && commentText.trim()) {
                                addComment.mutate(post);
                              }
                            }}
                            className="h-9 text-sm"
                          />
                          <Button
                            size="sm"
                            onClick={() => addComment.mutate(post)}
                            disabled={!commentText.trim() || addComment.isPending}
                          >
                            <MessageCircle className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
