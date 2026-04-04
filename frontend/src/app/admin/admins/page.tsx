"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { api } from "@/lib/api";
import type { User } from "@/types";
import { Plus, Trash2, Shield, Mail, AlertCircle } from "lucide-react";

export default function AdminsPage() {
  const { data: session } = useSession();
  const [admins, setAdmins] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [selectedAdmin, setSelectedAdmin] = useState<User | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchAdmins();
  }, []);

  async function fetchAdmins() {
    setLoading(true);
    try {
      const data = await api.getAdmins();
      setAdmins(data || []);
    } catch (err) {
      console.error("Error fetching admins:", err);
    }
    setLoading(false);
  }

  async function handleAddAdmin() {
    if (!newEmail.trim()) return;

    setIsSubmitting(true);
    try {
      await api.addAdmin(newEmail.trim());
      setNewEmail("");
      setAddDialogOpen(false);
      await fetchAdmins();
    } catch (err) {
      console.error("Error adding admin:", err);
    }
    setIsSubmitting(false);
  }

  async function handleRemoveAdmin() {
    if (!selectedAdmin) return;

    setIsSubmitting(true);
    try {
      await api.removeAdmin(selectedAdmin.id);
      setDeleteDialogOpen(false);
      setSelectedAdmin(null);
      await fetchAdmins();
    } catch (err) {
      console.error("Error removing admin:", err);
    }
    setIsSubmitting(false);
  }

  const currentUserEmail = (session?.user as any)?.email;
  const canRemoveAdmin = (admin: User) => admin.email !== currentUserEmail;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Admin Users</h1>
          <p className="text-muted-foreground mt-2">
            Manage administrators with access to the Fresh Kitchen admin panel
          </p>
        </div>
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Admin
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Admin</DialogTitle>
              <DialogDescription>
                Enter the Gmail address of the person to add as an admin
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Gmail Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="user@gmail.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setAddDialogOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddAdmin}
                disabled={!newEmail.trim() || isSubmitting}
              >
                {isSubmitting ? "Adding..." : "Add Admin"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Info Alert */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-900">
            The first admin is created automatically during setup. New admins are sent an invitation email to set up their account.
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Admin</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove {selectedAdmin?.name || selectedAdmin?.email} as an admin? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setSelectedAdmin(null);
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRemoveAdmin}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Removing..." : "Remove"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Admins List */}
      {loading ? (
        <div className="flex items-center justify-center p-12">
          <p className="text-muted-foreground">Loading admins...</p>
        </div>
      ) : admins.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center p-12">
            <Shield className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">No admins found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {admins.map((admin) => (
            <Card key={admin.id}>
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  {/* Avatar */}
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-700 font-bold text-lg flex-shrink-0">
                    {admin.name?.[0]?.toUpperCase() || admin.email[0]?.toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm break-words">
                      {admin.name || "Pending Setup"}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                      <Mail className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate">{admin.email}</span>
                    </p>
                    {admin.role === "admin" && (
                      <p className="text-xs text-green-700 mt-2 flex items-center gap-1">
                        <Shield className="h-3 w-3 flex-shrink-0" />
                        Admin Role
                      </p>
                    )}
                  </div>

                  {/* Remove Button */}
                  {canRemoveAdmin(admin) ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setSelectedAdmin(admin);
                        setDeleteDialogOpen(true);
                      }}
                      className="h-8 w-8 flex-shrink-0"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  ) : (
                    <div className="text-xs text-muted-foreground px-2 py-1 rounded bg-gray-100">
                      You
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
