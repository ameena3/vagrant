"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import type { Announcement } from "@/types";
import { formatDate } from "@/lib/utils";
import { Plus, Trash2, Edit, AlertTriangle, Info } from "lucide-react";

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [formData, setFormData] = useState({
    message: "",
    type: "info" as "info" | "warning" | "urgent",
    active: true,
    start_date: "",
    end_date: "",
  });

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  async function fetchAnnouncements() {
    setLoading(true);
    try {
      const data = await api.getAllAnnouncements();
      setAnnouncements(data || []);
    } catch (err) {
      console.error("Error fetching announcements:", err);
    }
    setLoading(false);
  }

  function handleEdit(announcement: Announcement) {
    setSelectedAnnouncement(announcement);
    setFormData({
      message: announcement.message,
      type: announcement.type,
      active: announcement.active,
      start_date: announcement.start_date || "",
      end_date: announcement.end_date || "",
    });
    setDialogOpen(true);
  }

  function handleNew() {
    setSelectedAnnouncement(null);
    setFormData({
      message: "",
      type: "info",
      active: true,
      start_date: "",
      end_date: "",
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    try {
      if (selectedAnnouncement) {
        await api.updateAnnouncement(selectedAnnouncement.id, formData);
      } else {
        await api.createAnnouncement(formData);
      }
      setDialogOpen(false);
      await fetchAnnouncements();
    } catch (err) {
      console.error("Error saving announcement:", err);
    }
  }

  async function handleDelete() {
    if (selectedAnnouncement) {
      try {
        await api.deleteAnnouncement(selectedAnnouncement.id);
        setDeleteDialogOpen(false);
        setSelectedAnnouncement(null);
        await fetchAnnouncements();
      } catch (err) {
        console.error("Error deleting announcement:", err);
      }
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case "warning":
        return "bg-yellow-100 text-yellow-800 hover:bg-yellow-100";
      case "urgent":
        return "bg-red-100 text-red-800 hover:bg-red-100";
      default:
        return "bg-blue-100 text-blue-800 hover:bg-blue-100";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Announcements</h1>
          <p className="text-muted-foreground mt-2">
            Create and manage announcements for customers
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleNew}>
              <Plus className="h-4 w-4 mr-2" />
              New Announcement
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {selectedAnnouncement ? "Edit Announcement" : "Create Announcement"}
              </DialogTitle>
              <DialogDescription>
                {selectedAnnouncement
                  ? "Update the announcement details"
                  : "Add a new announcement for customers"}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Message */}
              <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  placeholder="Enter announcement message"
                  value={formData.message}
                  onChange={(e) =>
                    setFormData({ ...formData, message: e.target.value })
                  }
                  className="min-h-24"
                />
              </div>

              {/* Type */}
              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <Select value={formData.type} onValueChange={(value) =>
                  setFormData({ ...formData, type: value as any })
                }>
                  <SelectTrigger id="type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Active */}
              <div className="flex items-center justify-between">
                <Label>Active</Label>
                <Switch
                  checked={formData.active}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, active: checked })
                  }
                />
              </div>

              <Separator />

              {/* Date Range */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="start_date">Start Date</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) =>
                      setFormData({ ...formData, start_date: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_date">End Date</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={formData.end_date}
                    onChange={(e) =>
                      setFormData({ ...formData, end_date: e.target.value })
                    }
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              {selectedAnnouncement && (
                <Button
                  variant="destructive"
                  onClick={() => {
                    setDialogOpen(false);
                    setDeleteDialogOpen(true);
                  }}
                >
                  Delete
                </Button>
              )}
              <Button onClick={handleSave}>
                {selectedAnnouncement ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Announcement</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this announcement? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Announcements List */}
      {loading ? (
        <div className="flex items-center justify-center p-12">
          <p className="text-muted-foreground">Loading announcements...</p>
        </div>
      ) : announcements.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center p-12">
            <Info className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">No announcements yet</p>
            <Button onClick={handleNew}>Create First Announcement</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {announcements.map((announcement) => (
            <Card key={announcement.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    {/* Message */}
                    <p className="text-sm leading-relaxed">{announcement.message}</p>

                    {/* Badges and Meta */}
                    <div className="flex flex-wrap items-center gap-2 pt-2">
                      <Badge className={getTypeColor(announcement.type)}>
                        {announcement.type === "warning" || announcement.type === "urgent" ? (
                          <AlertTriangle className="h-3 w-3 mr-1" />
                        ) : (
                          <Info className="h-3 w-3 mr-1" />
                        )}
                        <span className="capitalize">{announcement.type}</span>
                      </Badge>

                      {announcement.active ? (
                        <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="outline">Inactive</Badge>
                      )}

                      {announcement.start_date && (
                        <span className="text-xs text-muted-foreground">
                          {formatDate(announcement.start_date)}
                          {announcement.end_date && ` - ${formatDate(announcement.end_date)}`}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(announcement)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setSelectedAnnouncement(announcement);
                        setDeleteDialogOpen(true);
                      }}
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
