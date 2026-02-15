// Children page — manage child profiles with dialog form
"use client";

import { useState, useEffect } from "react";
import { Plus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ChildCard } from "@/components/parent/ChildCard";
import type { Child } from "@/db/types";

export default function ChildrenPage() {
  const [children, setChildren] = useState<Child[]>([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [grade, setGrade] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchChildren = async () => {
    const res = await fetch("/api/children");
    if (res.ok) {
      const data = await res.json();
      setChildren(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchChildren();
  }, []);

  const handleAdd = async (e: { preventDefault: () => void }) => {
    e.preventDefault();

    const res = await fetch("/api/children", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        age: parseInt(age),
        grade: parseInt(grade),
        pin,
      }),
    });

    if (res.ok) {
      setName("");
      setAge("");
      setGrade("");
      setPin("");
      setOpen(false);
      fetchChildren();
    }
  };

  if (loading) {
    return <p className="text-text-secondary">Loading...</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-text-primary">
            Children
          </h1>
          <p className="text-text-secondary text-sm mt-1">
            Manage your children&apos;s profiles.
          </p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-1.5" />
              Add Child
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleAdd}>
              <DialogHeader>
                <DialogTitle>Add a Child</DialogTitle>
                <DialogDescription>
                  Create a profile for your child to start tutoring sessions.
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Full name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="age">Age</Label>
                  <Input
                    id="age"
                    type="number"
                    min={5}
                    max={18}
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    placeholder="5-18"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="grade">Grade</Label>
                  <Input
                    id="grade"
                    type="number"
                    min={1}
                    max={12}
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                    placeholder="1-12"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pin">PIN (4 digits)</Label>
                  <Input
                    id="pin"
                    inputMode="numeric"
                    pattern="[0-9]{4}"
                    maxLength={4}
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                    placeholder="1234"
                    required
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">Save</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {children.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Users className="h-8 w-8 text-text-secondary/40 mx-auto mb-3" />
            <p className="text-text-secondary text-sm mb-3">
              No children added yet.
            </p>
            <Button variant="outline" onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4 mr-1.5" />
              Add your first child
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {children.map((child) => (
            <ChildCard key={child.id} child={child} />
          ))}
        </div>
      )}
    </div>
  );
}
