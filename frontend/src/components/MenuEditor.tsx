"use client";

import { useState, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DayMenu, MenuItem, MealSet } from "@/types";
import { formatDate, MEAL_TYPES } from "@/lib/utils";
import { api } from "@/lib/api";
import { Plus, Trash2, Upload } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface MenuEditorProps {
  weekStart: string;
  dayOfWeek: number;
  date: string;
  menu: DayMenu | null;
  onSave: () => void;
  onDelete: () => void;
}

export function MenuEditor({
  weekStart,
  dayOfWeek,
  date,
  menu,
  onSave,
  onDelete,
}: MenuEditorProps) {
  const { toast } = useToast();
  const [meals, setMeals] = useState<MealSet>(
    menu?.meals || {
      breakfast: [],
      lunch: [],
      dinner: [],
    }
  );
  const [enabled, setEnabled] = useState(menu?.enabled ?? false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [uploadingItemId, setUploadingItemId] = useState<string | null>(null);

  const addItem = (mealType: "breakfast" | "lunch" | "dinner") => {
    setMeals((prev) => ({
      ...prev,
      [mealType]: [
        ...prev[mealType],
        {
          name: "",
          description: "",
          price: 0,
        },
      ],
    }));
  };

  const removeItem = (
    mealType: "breakfast" | "lunch" | "dinner",
    index: number
  ) => {
    setMeals((prev) => ({
      ...prev,
      [mealType]: prev[mealType].filter((_, i) => i !== index),
    }));
  };

  const updateItem = (
    mealType: "breakfast" | "lunch" | "dinner",
    index: number,
    field: keyof MenuItem,
    value: any
  ) => {
    setMeals((prev) => ({
      ...prev,
      [mealType]: prev[mealType].map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      ),
    }));
  };

  const handleImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    mealType: "breakfast" | "lunch" | "dinner",
    index: number
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingItemId(`${mealType}-${index}`);
      const imagePath = await api.uploadImage(file);
      if (imagePath) {
        updateItem(mealType, index, "image_path", imagePath);
        toast({
          title: "Image uploaded",
          description: "Image has been successfully uploaded.",
        });
      } else {
        toast({
          title: "Upload failed",
          description: "Failed to upload image.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Error",
        description: "An error occurred during upload.",
        variant: "destructive",
      });
    } finally {
      setUploadingItemId(null);
    }
  };

  const handleSave = async () => {
    if (enabled) {
      const totalItems =
        meals.breakfast.length + meals.lunch.length + meals.dinner.length;
      if (totalItems === 0) {
        toast({
          title: "Validation error",
          description: "Please add at least one item before enabling this day.",
          variant: "destructive",
        });
        return;
      }
    }

    try {
      setSaving(true);
      const result = await api.createMenu({
        week_start: weekStart,
        day_of_week: dayOfWeek,
        date,
        meals,
        enabled,
      });

      if (result) {
        toast({
          title: "Success",
          description: "Menu has been saved successfully.",
        });
        onSave();
      } else {
        toast({
          title: "Error",
          description: "Failed to save menu.",
          variant: "destructive",
        });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!menu?.id) return;

    try {
      setDeleting(true);
      await api.deleteMenu(menu.id);
      toast({
        title: "Success",
        description: "Menu has been deleted successfully.",
      });
      onDelete();
    } catch {
      toast({
        title: "Error",
        description: "Failed to delete menu.",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Menu Editor</CardTitle>
              <CardDescription>{formatDate(date)}</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm font-medium">Enable this day</span>
              </label>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <Tabs defaultValue="breakfast" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="breakfast">Breakfast</TabsTrigger>
              <TabsTrigger value="lunch">Lunch</TabsTrigger>
              <TabsTrigger value="dinner">Dinner</TabsTrigger>
            </TabsList>

            {(["breakfast", "lunch", "dinner"] as const).map((mealType) => (
              <TabsContent key={mealType} value={mealType} className="space-y-4">
                <div className="space-y-4">
                  {meals[mealType].map((item, index) => (
                    <div
                      key={`${mealType}-${index}`}
                      className="p-4 border rounded-lg space-y-4"
                    >
                      <div className="grid grid-cols-1 gap-4">
                        <div>
                          <Label htmlFor={`name-${mealType}-${index}`}>
                            Item Name
                          </Label>
                          <Input
                            id={`name-${mealType}-${index}`}
                            value={item.name}
                            onChange={(e) =>
                              updateItem(mealType, index, "name", e.target.value)
                            }
                            placeholder="e.g., Scrambled Eggs"
                          />
                        </div>

                        <div>
                          <Label htmlFor={`desc-${mealType}-${index}`}>
                            Description
                          </Label>
                          <Textarea
                            id={`desc-${mealType}-${index}`}
                            value={item.description}
                            onChange={(e) =>
                              updateItem(
                                mealType,
                                index,
                                "description",
                                e.target.value
                              )
                            }
                            placeholder="Describe the item..."
                            rows={3}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor={`price-${mealType}-${index}`}>
                              Price ($)
                            </Label>
                            <Input
                              id={`price-${mealType}-${index}`}
                              type="number"
                              step="0.01"
                              min="0"
                              value={item.price}
                              onChange={(e) =>
                                updateItem(
                                  mealType,
                                  index,
                                  "price",
                                  parseFloat(e.target.value) || 0
                                )
                              }
                              placeholder="0.00"
                            />
                          </div>

                          <div>
                            <Label>Image</Label>
                            <div className="flex gap-2">
                              <label className="flex-1">
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) =>
                                    handleImageUpload(e, mealType, index)
                                  }
                                  disabled={
                                    uploadingItemId === `${mealType}-${index}`
                                  }
                                  className="hidden"
                                />
                                <Button
                                  variant="outline"
                                  className="w-full"
                                  disabled={
                                    uploadingItemId === `${mealType}-${index}`
                                  }
                                  asChild
                                >
                                  <span>
                                    <Upload className="w-4 h-4 mr-2" />
                                    Upload
                                  </span>
                                </Button>
                              </label>
                            </div>
                            {item.image_path && (
                              <p className="text-xs text-slate-500 mt-1">
                                Image: {item.image_path.split("/").pop()}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => removeItem(mealType, index)}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>

                <Button
                  variant="outline"
                  onClick={() => addItem(mealType)}
                  className="w-full"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add {mealType.charAt(0).toUpperCase() + mealType.slice(1)} Item
                </Button>
              </TabsContent>
            ))}
          </Tabs>

          <div className="flex gap-2 mt-6">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="flex-1"
            >
              {saving ? "Saving..." : "Save Menu"}
            </Button>

            {menu && (
              <Button
                variant="destructive"
                onClick={() => setShowDeleteDialog(true)}
                disabled={deleting}
              >
                {deleting ? "Deleting..." : "Delete"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Menu</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this menu? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-2 justify-end">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600">
              Delete
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
