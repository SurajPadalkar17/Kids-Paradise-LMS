import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

type Book = { id: string; title: string; author: string; class_suitable: number; available_count: number; total_count: number };

const StudentDashboard = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"title_asc" | "title_desc">("title_asc");
  const [onlyMyGrade, setOnlyMyGrade] = useState(true);

  const { data: sessionUser, isLoading: loadingUser } = useQuery({
    queryKey: ["auth", "user"],
    queryFn: async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error) throw error;
      return data.user ?? null;
    },
  });

  const { data: profile } = useQuery({
    queryKey: ["profile", sessionUser?.id],
    enabled: !!sessionUser?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, role, grade")
        .eq("id", sessionUser!.id)
        .single();
      if (error) throw error;
      return data as { id: string; full_name: string; role: "admin" | "student"; grade: number | null };
    },
  });

  useEffect(() => {
    if (!loadingUser && !sessionUser) {
      toast.error("Please log in to continue");
      navigate("/student/login");
    }
  }, [loadingUser, sessionUser, navigate]);

  const { data: books, isLoading: loadingBooks, refetch: refetchBooks } = useQuery<Book[]>({
    queryKey: ["books", { search, sort, onlyMyGrade, grade: profile?.grade ?? null }],
    enabled: !!sessionUser,
    queryFn: async () => {
      let q = supabase.from("books").select("id, title, author, class_suitable, available_count, total_count");
      q = q.gt("available_count", 0);
      if (search.trim()) {
        q = q.ilike("title", `%${search.trim()}%`);
      }
      if (onlyMyGrade && profile?.grade != null) {
        q = q.lte("class_suitable", profile.grade);
      }
      const { data, error } = await q;
      if (error) throw error;
      const arr = (data || []) as Book[];
      const sorted = [...arr].sort((a, b) => {
        if (sort === "title_asc") return a.title.localeCompare(b.title);
        if (sort === "title_desc") return b.title.localeCompare(a.title);
        return 0;
      });
      return sorted;
    },
  });

  const { data: myIssues, isLoading: loadingIssues } = useQuery({
    queryKey: ["my", "issues", sessionUser?.id],
    enabled: !!sessionUser?.id,
    queryFn: async () => {
      type IssueRow = { id: string; book_id: string; issued_at: string; due_date: string; returned_at: string | null };
      const { data, error } = await supabase
        .from("issued_books")
        .select("id, book_id, issued_at, due_date, returned_at")
        .eq("student_id", sessionUser!.id)
        .is("returned_at", null)
        .order("issued_at", { ascending: false });
      if (error) throw error;
      const rows = (data || []) as IssueRow[];
      const ids = Array.from(new Set(rows.map(r => r.book_id)));
      let bmap = new Map<string, { title: string }>();
      if (ids.length) {
        const { data: b, error: berr } = await supabase.from("books").select("id, title").in("id", ids);
        if (berr) throw berr;
        bmap = new Map((b || []).map((x: any) => [x.id as string, { title: x.title as string }]));
      }
      return rows.map(r => ({
        id: r.id,
        title: bmap.get(r.book_id)?.title ?? r.book_id,
        issuedAt: new Date(r.issued_at),
        dueDate: new Date(r.due_date),
        overdue: new Date(r.due_date) < new Date(),
      }));
    },
  });

  const subtitle = useMemo(() => {
    if (!profile) return undefined;
    const grade = profile.grade == null ? "N/A" : String(profile.grade);
    return `Grade: ${grade}`;
  }, [profile]);

  return (
    <div className="min-h-screen bg-background">
      <Header title="Student Panel" userName={profile?.full_name} showLogout />
      <main className="container mx-auto px-4 py-8 space-y-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex flex-col gap-1">
              <span>Search Books</span>
              {subtitle && <span className="text-sm font-normal text-muted-foreground">{subtitle}</span>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 grid-cols-1 md:grid-cols-4">
              <div className="md:col-span-2">
                <Input placeholder="Search by title" value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") refetchBooks(); }} />
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="gradeOnly" checked={onlyMyGrade} onCheckedChange={(v) => setOnlyMyGrade(Boolean(v))} />
                <label htmlFor="gradeOnly" className="text-sm text-muted-foreground">Only show books suitable for my grade</label>
              </div>
              <div>
                <Select value={sort} onValueChange={(v: any) => setSort(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="title_asc">Title A → Z</SelectItem>
                    <SelectItem value="title_desc">Title Z → A</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="mt-6 grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {loadingBooks ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <Card key={i} className="h-28 animate-pulse bg-muted/30" />
                ))
              ) : (books || []).length === 0 ? (
                <div className="col-span-full text-center text-muted-foreground">No books found</div>
              ) : (
                (books || []).map((b) => (
                  <Card key={b.id} className="border-2 border-accent/20 hover:shadow-lg transition-shadow">
                    <CardContent className="p-4 flex items-center justify-between gap-4">
                      <div>
                        <div className="text-lg font-semibold">{b.title}</div>
                        <div className="text-sm text-muted-foreground">by {b.author}</div>
                        <div className="text-xs text-muted-foreground mt-1">Suitable for grade {b.class_suitable}</div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Badge variant={b.available_count > 0 ? "default" : "secondary"}>{b.available_count}/{b.total_count} available</Badge>
                        <Button size="sm" disabled>Request</Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>My Borrowed Books</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
              {loadingIssues ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <Card key={i} className="h-24 animate-pulse bg-muted/30" />
                ))
              ) : (myIssues || []).length === 0 ? (
                <div className="col-span-full text-center text-muted-foreground">You have no active borrowed books</div>
              ) : (
                (myIssues || []).map((it: any) => (
                  <Card key={it.id} className="border-2 border-primary/20">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div>
                        <div className="font-semibold">{it.title}</div>
                        <div className="text-sm text-muted-foreground">Due on {it.dueDate.toLocaleDateString()}</div>
                      </div>
                      {it.overdue ? (
                        <Badge variant="destructive">Overdue</Badge>
                      ) : (
                        <Badge variant="secondary">On time</Badge>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default StudentDashboard;
