"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Plus, Trash2, Shield, Mail, KeyRound } from "lucide-react";

export default function AdminsPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [roleUpdating, setRoleUpdating] = useState<string | null>(null);

  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("customer");
  const [resetPwDialogOpen, setResetPwDialogOpen] = useState(false);
  const [resetPwUser, setResetPwUser] = useState<User | null>(null);
  const [resetPwNew, setResetPwNew] = useState("");
  const [resetPwConfirm, setResetPwConfirm] = useState("");
  const [resetPwError, setResetPwError] = useState("");
  const [resetPwLoading, setResetPwLoading] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    setLoading(true);
    try {
      const data = await api.getAdmins();
      setUsers(data || []);
    } catch {
      setUsers([]);
    }
    setLoading(false);
  }

  async function handleCreateUser() {
    if (!newEmail.trim() || !newName.trim() || !newPassword.trim()) return;

    setFormError("");
    setIsSubmitting(true);
    try {
      await api.createUser({
        email: newEmail.trim(),
        name: newName.trim(),
        password: newPassword,
        role: newRole,
      });
      setNewEmail("");
      setNewName("");
      setNewPassword("");
      setNewRole("customer");
      setCreateDialogOpen(false);
      await fetchUsers();
    } catch (err: any) {
      setFormError(err.message || "Failed to create user");
    }
    setIsSubmitting(false);
  }

  async function handleRoleChange(user: User, newRole: string) {
    if (newRole === user.role) return;
    setRoleUpdating(user.id);
    try {
      await api.setUserRole(user.id, newRole);
      await fetchUsers();
    } catch {
      // ignore
    }
    setRoleUpdating(null);
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    setResetPwError("");
    if (resetPwNew !== resetPwConfirm) {
      setResetPwError("Passwords do not match");
      return;
    }
    if (!resetPwUser) return;
    setResetPwLoading(true);
    try {
      await api.adminResetPassword(resetPwUser.id, resetPwNew);
      setResetPwDialogOpen(false);
      setResetPwUser(null);
      setResetPwNew("");
      setResetPwConfirm("");
    } catch (err: any) {
      setResetPwError(err.message || "Failed to reset password");
    }
    setResetPwLoading(false);
  }

  async function handleRemoveUser() {
    if (!selectedUser) return;

    setIsSubmitting(true);
    try {
      await api.removeAdmin(selectedUser.id);
      setDeleteDialogOpen(false);
      setSelectedUser(null);
      await fetchUsers();
    } catch {
      // ignore
    }
    setIsSubmitting(false);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Users</h1>
          <p className="text-muted-foreground mt-2">
            Create accounts and manage user roles
          </p>
        </div>
        <Dialog
          open={createDialogOpen}
          onOpenChange={(open) => {
            setCreateDialogOpen(open);
            if (!open) setFormError("");
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New User</DialogTitle>
              <DialogDescription>
                Set up a new account with email, password, and role.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-email">Email</Label>
                <Input
                  id="new-email"
                  type="email"
                  placeholder="user@example.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-name">Full Name</Label>
                <Input
                  id="new-name"
                  type="text"
                  placeholder="Jane Smith"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password">Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-role">Role</Label>
                <Select value={newRole} onValueChange={setNewRole} disabled={isSubmitting}>
                  <SelectTrigger id="new-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="customer">Customer</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {formError && (
                <p className="text-sm text-red-600">{formError}</p>
              )}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setCreateDialogOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateUser}
                disabled={!newEmail.trim() || !newName.trim() || !newPassword.trim() || isSubmitting}
              >
                {isSubmitting ? "Creating…" : "Create User"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedUser?.name || selectedUser?.email}? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setSelectedUser(null);
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRemoveUser}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={resetPwDialogOpen} onOpenChange={(open) => { setResetPwDialogOpen(open); if (!open) setResetPwError(""); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Set a new password for {resetPwUser?.name || resetPwUser?.email}.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleResetPassword} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="rp-new">New Password</Label>
              <Input
                id="rp-new"
                type="password"
                placeholder="••••••••"
                value={resetPwNew}
                onChange={(e) => setResetPwNew(e.target.value)}
                required
                autoFocus
                disabled={resetPwLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rp-confirm">Confirm Password</Label>
              <Input
                id="rp-confirm"
                type="password"
                placeholder="••••••••"
                value={resetPwConfirm}
                onChange={(e) => setResetPwConfirm(e.target.value)}
                required
                disabled={resetPwLoading}
              />
            </div>
            {resetPwError && (
              <p className="text-sm text-red-600">{resetPwError}</p>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setResetPwDialogOpen(false)}
                disabled={resetPwLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={!resetPwNew.trim() || resetPwLoading}>
                {resetPwLoading ? "Saving…" : "Reset Password"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Users List */}
      {loading ? (
        <div className="flex items-center justify-center p-12">
          <p className="text-muted-foreground">Loading users…</p>
        </div>
      ) : users.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center p-12">
            <Shield className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No admin users found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {users.map((user) => (
            <Card key={user.id}>
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-700 font-bold text-lg flex-shrink-0">
                    {user.name?.[0]?.toUpperCase() || user.email[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm break-words">{user.name}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                      <Mail className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate">{user.email}</span>
                    </p>
                    <div className="mt-2">
                      <Select
                        value={user.role}
                        onValueChange={(val) => handleRoleChange(user, val)}
                        disabled={roleUpdating === user.id}
                      >
                        <SelectTrigger className="h-7 text-xs w-32">
                          <Shield className="h-3 w-3 mr-1 flex-shrink-0" />
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="customer">Customer</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setResetPwUser(user);
                        setResetPwNew("");
                        setResetPwConfirm("");
                        setResetPwError("");
                        setResetPwDialogOpen(true);
                      }}
                      className="h-8 w-8"
                      title="Reset Password"
                    >
                      <KeyRound className="h-4 w-4 text-slate-500" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setSelectedUser(user);
                        setDeleteDialogOpen(true);
                      }}
                      className="h-8 w-8"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
