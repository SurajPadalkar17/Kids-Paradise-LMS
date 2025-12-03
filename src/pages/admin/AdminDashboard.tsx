import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useQueryClient } from "@tanstack/react-query";

type Activity = { when: string; user: string; action: string; details: string; status: string };

// Import the API client
import { studentApi, bookApi } from "@/lib/api";

const AdminDashboard = () => {
  const [openAdd, setOpenAdd] = useState(false);
  const [openIssue, setOpenIssue] = useState(false);
  const [openCollect, setOpenCollect] = useState(false);
  const [openStudent, setOpenStudent] = useState(false);

  const [addForm, setAddForm] = useState({ title: "", author: "", isbn: "", classSuitable: "", totalCount: "" });
  const [issueForm, setIssueForm] = useState({ studentId: "", bookId: "", dueDate: "" });
  const [collectForm, setCollectForm] = useState({ studentId: "", bookId: "" });
  const [students, setStudents] = useState<Array<{ id: string; full_name: string; email: string }>>([]);
  const [books, setBooks] = useState<Array<{ id: string; title: string; available_count: number; total_count: number }>>([]);
  const [issuedBooks, setIssuedBooks] = useState<Array<{ id: string; title: string }>>([]);
  const [activeStudents, setActiveStudents] = useState<Array<{ id: string; full_name: string; email: string }>>([]);

  useEffect(() => {
    const fetchLists = async () => {
      try {
        // Always fetch available books for Issue dialog
        const { data: bk, error: bkErr } = await supabase
          .from("books")
          .select("id, title, available_count, total_count")
          .gt("available_count", 0);
        if (bkErr) throw bkErr;
        setBooks(bk || []);

        // For Issue: all students
        if (openIssue) {
          const { data: stu, error: stuErr } = await supabase
            .from("profiles")
            .select("id, full_name, email")
            .eq("role", "student");
          if (stuErr) throw stuErr;
          setStudents(stu || []);
        }

        // For Collect: only students with active issues
        if (openCollect) {
          const { data: rows, error: rowsErr } = await supabase
            .from("issued_books")
            .select("student_id")
            .is("returned_at", null);
          if (rowsErr) throw rowsErr;
          const ids = Array.from(new Set((rows || []).map((r: any) => r.student_id)));
          if (ids.length === 0) {
            setActiveStudents([]);
          } else {
            const { data: astu, error: aerr } = await supabase
              .from("profiles")
              .select("id, full_name, email")
              .in("id", ids);
            if (aerr) throw aerr;
            setActiveStudents(astu || []);
          }
        }
      } catch (e) {
        console.error(e);
        toast.error("Failed to load lists");
      }
    };
    if (openIssue || openCollect) fetchLists();
  }, [openIssue, openCollect]);

  useEffect(() => {
    const fetchIssuedForStudent = async () => {
      try {
        if (!openCollect || !collectForm.studentId) {
          setIssuedBooks([]);
          return;
        }
        const { data: issued, error: issuedErr } = await supabase
          .from("issued_books")
          .select("book_id")
          .eq("student_id", collectForm.studentId)
          .is("returned_at", null);
        if (issuedErr) throw issuedErr;
        const ids = (issued || []).map((r: any) => r.book_id);
        if (ids.length === 0) {
          setIssuedBooks([]);
          return;
        }
        const { data: booksRes, error: booksErr } = await supabase
          .from("books")
          .select("id, title")
          .in("id", ids);
        if (booksErr) throw booksErr;
        setIssuedBooks((booksRes || []).map((b: any) => ({ id: b.id, title: b.title })));
      } catch (e) {
        console.error(e);
        toast.error("Failed to load issued books");
        setIssuedBooks([]);
      }
    };
    fetchIssuedForStudent();
  }, [openCollect, collectForm.studentId]);
  const [studentForm, setStudentForm] = useState({ 
    name: "", 
    email: "", 
    grade: "", 
    password: "",
    age: "",
    parentName: "",
    contactNumber: "",
    address: ""
  });
  const [activities, setActivities] = useState(
    [
      { when: "2m ago", user: "Priya S.", action: "Borrowed “Wonder”", details: "—", status: "ok" },
      { when: "18m ago", user: "Arjun K.", action: "Returned “Cosmic Kids”", details: "—", status: "returned" },
      { when: "1h ago", user: "Maya R.", action: "Login attempt", details: "—", status: "review" },
    ] as Activity[],
  );

  const queryClient = useQueryClient();

  const { data: studentsCount } = useQuery({
    queryKey: ["count", "students"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("role", "student");
      if (error) throw error;
      return count ?? 0;
    },
  });

  const { data: booksCount } = useQuery({
    queryKey: ["count", "books"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("books")
        .select("id", { count: "exact", head: true });
      if (error) throw error;
      return count ?? 0;
    },
  });

  const { data: issuedOpenCount } = useQuery({
    queryKey: ["count", "issued_open"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("issued_books")
        .select("id", { count: "exact", head: true })
        .is("returned_at", null);
      if (error) throw error;
      return count ?? 0;
    },
  });

  const { data: overdueCount } = useQuery({
    queryKey: ["count", "overdue"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("issued_books")
        .select("id", { count: "exact", head: true })
        .is("returned_at", null)
        .lt("due_date", new Date().toISOString());
      if (error) throw error;
      return count ?? 0;
    },
  });

  const { data: recentIssued } = useQuery<Activity[]>({
    queryKey: ["recent", "issued"],
    queryFn: async (): Promise<Activity[]> => {
      type IssuedRow = { id: string; student_id: string; book_id: string; issued_at: string; due_date: string };
      type StudentRow = { id: string; full_name: string };
      type BookRow = { id: string; title: string };

      const { data, error } = await supabase
        .from("issued_books")
        .select("id, student_id, book_id, issued_at, due_date")
        .order("issued_at", { ascending: false })
        .limit(10);
      if (error) throw error;

      const rows = (data || []) as IssuedRow[];
      const studentIds = Array.from(new Set(rows.map(r => r.student_id)));
      const bookIds = Array.from(new Set(rows.map(r => r.book_id)));

      const [{ data: srows }, { data: brows }] = await Promise.all([
        studentIds.length ? supabase.from("profiles").select("id, full_name").in("id", studentIds) : Promise.resolve({ data: [] as StudentRow[] }),
        bookIds.length ? supabase.from("books").select("id, title").in("id", bookIds) : Promise.resolve({ data: [] as BookRow[] }),
      ]);

      const sMap = new Map<string, string>(((srows || []) as StudentRow[]).map((s) => [s.id, s.full_name]));
      const bMap = new Map<string, string>(((brows || []) as BookRow[]).map((b) => [b.id, b.title]));

      return rows.map<Activity>((r) => ({
        when: new Date(r.issued_at).toLocaleString(),
        user: sMap.get(r.student_id) ?? r.student_id,
        action: "Issued Book",
        details: `Book: ${bMap.get(r.book_id) ?? r.book_id} · Due: ${new Date(r.due_date).toLocaleDateString()}`,
        status: new Date(r.due_date) < new Date() ? "overdue" : "ok",
      }));
    },
  });

  const onSubmitAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const classSuitableNum = parseInt(addForm.classSuitable, 10);
    const totalCountNum = parseInt(addForm.totalCount, 10);
    if (!addForm.title || !addForm.author || Number.isNaN(classSuitableNum) || Number.isNaN(totalCountNum)) {
      toast.error("Please provide Title, Author, Class Suitable and Total Copies");
      return;
    }
    try {
      const { data, error } = await supabase.from("books").insert({
        title: addForm.title,
        author: addForm.author,
        class_suitable: classSuitableNum,
        total_count: totalCountNum,
        available_count: totalCountNum,
      }).select();
      if (error) throw error;
      const created = data?.[0];
      toast.success("Book saved to database");
      queryClient.invalidateQueries({ queryKey: ["count", "books"] });
      queryClient.invalidateQueries({ queryKey: ["recent", "issued"] });
      setOpenAdd(false);
      setAddForm({ title: "", author: "", isbn: "", classSuitable: "", totalCount: "" });
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to save book");
      // keep UI unchanged on error, toast already shown
    }
  };

  const onSubmitIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!issueForm.studentId || !issueForm.bookId || !issueForm.dueDate) {
      toast.error("Select student, book, and due date");
      return;
    }
    try {
      const studentId = issueForm.studentId;
      const bookId = issueForm.bookId;

      const { data: userRes, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userRes.user) throw new Error("Not authenticated");
      const issuedBy = userRes.user.id;

      const { error: insertErr } = await supabase.from("issued_books").insert({
        student_id: studentId,
        book_id: bookId,
        issued_by: issuedBy,
        due_date: new Date(issueForm.dueDate).toISOString(),
      });
      if (insertErr) throw insertErr;

      const { data: bookNow, error: readErr } = await supabase
        .from("books")
        .select("available_count")
        .eq("id", bookId!)
        .single();
      if (readErr) throw readErr;
      const newAvail = Math.max(0, (bookNow?.available_count ?? 0) - 1);
      const { error: updErr } = await supabase
        .from("books")
        .update({ available_count: newAvail })
        .eq("id", bookId!);
      if (updErr) throw updErr;

      toast.success("Book issued");
      queryClient.invalidateQueries({ queryKey: ["count", "issued_open"] });
      queryClient.invalidateQueries({ queryKey: ["count", "overdue"] });
      queryClient.invalidateQueries({ queryKey: ["recent", "issued"] });
      setOpenIssue(false);
      setIssueForm({ studentId: "", bookId: "", dueDate: "" });
    } catch (err: any) {
      toast.error(err.message || "Failed to issue book");
      // keep UI unchanged on error, toast already shown
    }
  };

  const onSubmitCollect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!collectForm.studentId || !collectForm.bookId) {
      toast.error("Select student and book");
      return;
    }
    try {
      const studentId = collectForm.studentId;
      const bookId = collectForm.bookId;

      const { error: delErr } = await supabase
        .from("issued_books")
        .delete()
        .eq("student_id", studentId!)
        .eq("book_id", bookId!)
        .is("returned_at", null);
      if (delErr) throw delErr;

      const { data: bookNow, error: readErr } = await supabase
        .from("books")
        .select("available_count")
        .eq("id", bookId!)
        .single();
      if (readErr) throw readErr;
      const newAvail = (bookNow?.available_count ?? 0) + 1;
      const { error: updErr } = await supabase
        .from("books")
        .update({ available_count: newAvail })
        .eq("id", bookId!);
      if (updErr) throw updErr;

      toast.success("Return completed");
      queryClient.invalidateQueries({ queryKey: ["count", "issued_open"] });
      queryClient.invalidateQueries({ queryKey: ["count", "overdue"] });
      queryClient.invalidateQueries({ queryKey: ["recent", "issued"] });
      setOpenCollect(false);
      setCollectForm({ studentId: "", bookId: "" });
    } catch (err: any) {
      toast.error(err.message || "Failed to collect book");
      // keep UI unchanged on error, toast already shown
    }
  };

  const onSubmitStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentForm.name || !studentForm.email || !studentForm.password || 
        !studentForm.age || !studentForm.parentName || !studentForm.contactNumber || !studentForm.address) {
      toast.error("Please fill in all required fields");
      return;
    }
    (async () => {
      try {
        await studentApi.create({
          name: studentForm.name,
          email: studentForm.email,
          grade: studentForm.grade,
          password: studentForm.password,
          age: studentForm.age,
          parentName: studentForm.parentName,
          contactNumber: studentForm.contactNumber,
          address: studentForm.address
        });

        toast.success("Student created successfully!");
        setActivities(prev => [
          { 
            when: "just now", 
            user: "Admin", 
            action: "Added Student", 
            details: `Name: ${studentForm.name} · Email: ${studentForm.email} · Grade: ${studentForm.grade || "N/A"}`,
            status: "ok" 
          },
          ...prev,
        ]);
        // Refresh students list so dropdown includes the new student
        const { data: stu, error: stuErr } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .eq("role", "student");
        if (!stuErr) setStudents(stu || []);

        setOpenStudent(false);
        setStudentForm({ 
          name: "", 
          email: "", 
          grade: "", 
          password: "",
          age: "",
          parentName: "",
          contactNumber: "",
          address: ""
        });
      } catch (err: any) {
        toast.error(err.message || "Failed to create student");
      }
    })();
  };

  return (
    <div className="min-h-screen bg-background">
      <Header title="Admin Panel" showLogout />
      <main className="container mx-auto px-4 py-8 space-y-8">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader>
              <CardTitle>Total Students</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{studentsCount ?? 0}</div>
              <p className="text-sm text-muted-foreground">registered</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Books</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{booksCount ?? 0}</div>
              <p className="text-sm text-muted-foreground">in catalog</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Active Issues</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{issuedOpenCount ?? 0}</div>
              <p className="text-sm text-muted-foreground">not yet returned</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Overdue Returns</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{overdueCount ?? 0}</div>
              <p className="text-sm text-muted-foreground">needs attention</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
              <Dialog open={openAdd} onOpenChange={setOpenAdd}>
                <DialogTrigger asChild>
                  <Button className="w-full">Add Book</Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[480px]">
                  <DialogHeader>
                    <DialogTitle>Add Book</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={onSubmitAdd} className="grid gap-4 py-2">
                    <div className="grid gap-2">
                      <Label htmlFor="title">Title</Label>
                      <Input id="title" placeholder="Book title" value={addForm.title} onChange={(e) => setAddForm((s) => ({ ...s, title: e.target.value }))} />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="author">Author</Label>
                      <Input id="author" placeholder="Author name" value={addForm.author} onChange={(e) => setAddForm((s) => ({ ...s, author: e.target.value }))} />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="classSuitable">Class Suitable</Label>
                      <Input id="classSuitable" type="number" min="1" placeholder="e.g. 5" value={addForm.classSuitable} onChange={(e) => setAddForm((s) => ({ ...s, classSuitable: e.target.value }))} />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="totalCount">Total Copies</Label>
                      <Input id="totalCount" type="number" min="0" placeholder="e.g. 10" value={addForm.totalCount} onChange={(e) => setAddForm((s) => ({ ...s, totalCount: e.target.value }))} />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="isbn">ISBN</Label>
                      <Input id="isbn" placeholder="978-..." value={addForm.isbn} onChange={(e) => setAddForm((s) => ({ ...s, isbn: e.target.value }))} />
                    </div>
                    <DialogFooter>
                      <Button type="submit">Save</Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>

              <Dialog open={openIssue} onOpenChange={setOpenIssue}>
                <DialogTrigger asChild>
                  <Button variant="secondary" className="w-full">Issue Book</Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[480px]">
                  <DialogHeader>
                    <DialogTitle>Issue Book</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={onSubmitIssue} className="grid gap-4 py-2">
                    <div className="grid gap-2">
                      <Label>Student</Label>
                      <Select value={issueForm.studentId} onValueChange={(v) => setIssueForm((s) => ({ ...s, studentId: v }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select student" />
                        </SelectTrigger>
                        <SelectContent>
                          {students.map((s) => (
                            <SelectItem key={s.id} value={s.id}>{`${s.full_name} (${s.email})`}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label>Book</Label>
                      <Select value={issueForm.bookId} onValueChange={(v) => setIssueForm((s) => ({ ...s, bookId: v }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select available book" />
                        </SelectTrigger>
                        <SelectContent>
                          {books.map((b) => (
                            <SelectItem key={b.id} value={b.id}>{`${b.title} (${b.available_count}/${b.total_count})`}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="dueDate">Due Date</Label>
                      <Input id="dueDate" type="date" value={issueForm.dueDate} onChange={(e) => setIssueForm((s) => ({ ...s, dueDate: e.target.value }))} />
                    </div>
                    <DialogFooter>
                      <Button type="submit">Issue</Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>

              <Dialog open={openCollect} onOpenChange={setOpenCollect}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full">Collect Book</Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[480px]">
                  <DialogHeader>
                    <DialogTitle>Collect Book</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={onSubmitCollect} className="grid gap-4 py-2">
                    <div className="grid gap-2">
                      <Label>Student</Label>
                      <Select value={collectForm.studentId} onValueChange={(v) => setCollectForm((s) => ({ ...s, studentId: v }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select student with active issue" />
                        </SelectTrigger>
                        <SelectContent>
                          {activeStudents.length === 0 ? (
                            <SelectItem disabled value="__none">No active issues</SelectItem>
                          ) : (
                            activeStudents.map((s) => (
                              <SelectItem key={s.id} value={s.id}>{`${s.full_name} (${s.email})`}</SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label>Book</Label>
                      <Select value={collectForm.bookId} onValueChange={(v) => setCollectForm((s) => ({ ...s, bookId: v }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select issued book" />
                        </SelectTrigger>
                        <SelectContent>
                          {issuedBooks.length === 0 ? (
                            <SelectItem disabled value="__none">No books issued</SelectItem>
                          ) : (
                            issuedBooks.map((b) => (
                              <SelectItem key={b.id} value={b.id}>{b.title}</SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <DialogFooter>
                      <Button type="submit">Mark as Returned</Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>

              <Dialog open={openStudent} onOpenChange={setOpenStudent}>
                <DialogTrigger asChild>
                  <Button className="w-full" variant="ghost">Add Student</Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[480px]">
                  <DialogHeader>
                    <DialogTitle>Add Student</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={onSubmitStudent} className="grid gap-4 py-2">
                    <div className="grid gap-2">
                      <Label htmlFor="studentName">Full Name *</Label>
                      <Input 
                        id="studentName" 
                        placeholder="Student's full name" 
                        value={studentForm.name} 
                        onChange={(e) => setStudentForm((s) => ({ ...s, name: e.target.value }))} 
                        required 
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="studentEmail">Email *</Label>
                      <Input 
                        id="studentEmail" 
                        type="email" 
                        placeholder="name@example.com" 
                        value={studentForm.email} 
                        onChange={(e) => setStudentForm((s) => ({ ...s, email: e.target.value }))} 
                        required 
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="studentAge">Age *</Label>
                      <Input 
                        id="studentAge" 
                        type="number" 
                        placeholder="e.g. 10" 
                        min="3" 
                        max="18"
                        value={studentForm.age} 
                        onChange={(e) => setStudentForm((s) => ({ ...s, age: e.target.value }))} 
                        required 
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="studentGrade">Grade *</Label>
                      <Input 
                        id="studentGrade" 
                        placeholder="e.g. 5" 
                        value={studentForm.grade} 
                        onChange={(e) => setStudentForm((s) => ({ ...s, grade: e.target.value }))} 
                        required 
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="parentName">Parent/Guardian Name *</Label>
                      <Input 
                        id="parentName" 
                        placeholder="Parent/Guardian full name" 
                        value={studentForm.parentName} 
                        onChange={(e) => setStudentForm((s) => ({ ...s, parentName: e.target.value }))} 
                        required 
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="contactNumber">Contact Number *</Label>
                      <Input 
                        id="contactNumber" 
                        type="tel" 
                        placeholder="+91 98765 43210" 
                        value={studentForm.contactNumber} 
                        onChange={(e) => setStudentForm((s) => ({ ...s, contactNumber: e.target.value }))} 
                        required 
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="address">Address *</Label>
                      <textarea 
                        id="address" 
                        className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        placeholder="Full address" 
                        value={studentForm.address} 
                        onChange={(e) => setStudentForm((s) => ({ ...s, address: e.target.value }))} 
                        required 
                        rows={3}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="studentPassword">Temporary Password *</Label>
                      <Input 
                        id="studentPassword" 
                        type="password" 
                        placeholder="Set temporary password" 
                        value={studentForm.password} 
                        onChange={(e) => setStudentForm((s) => ({ ...s, password: e.target.value }))} 
                        required 
                      />
                    </div>
                    <DialogFooter>
                      <Button type="submit">Save</Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>

              <Button asChild className="w-full" variant="link">
                <Link to="/student/login">Go to Student Login</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {((recentIssued ?? activities) as Activity[]).map((a, i) => (
                  <TableRow key={i}>
                    <TableCell>{a.when}</TableCell>
                    <TableCell>{a.user}</TableCell>
                    <TableCell>{a.action}</TableCell>
                    <TableCell className="max-w-[320px] truncate text-muted-foreground">{a.details}</TableCell>
                    <TableCell className="text-right">
                      {a.status === "returned" ? (
                        <Badge variant="secondary">{a.status}</Badge>
                      ) : a.status === "review" ? (
                        <Badge variant="outline">{a.status}</Badge>
                      ) : a.status === "overdue" ? (
                        <Badge variant="destructive">{a.status}</Badge>
                      ) : (
                        <Badge>{a.status}</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default AdminDashboard;
