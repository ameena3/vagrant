package services

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
	"time"

	"freshkitchen/store"
)

type MenuService struct {
	store *store.Store
}

func NewMenuService(s *store.Store) *MenuService {
	return &MenuService{store: s}
}

// GetWeekMenus returns all menus for a given week
func (s *MenuService) GetWeekMenus(ctx context.Context, weekStart string) ([]store.Menu, error) {
	return s.store.Menu.GetByWeek(ctx, weekStart)
}

// CreateMenu creates or updates a menu for a specific day
// Validates that if enabled=true, at least one meal item exists
func (s *MenuService) CreateMenu(ctx context.Context, menu *store.Menu) (*store.Menu, error) {
	if menu.Enabled {
		totalItems := len(menu.Meals.Breakfast) + len(menu.Meals.Lunch) + len(menu.Meals.Dinner)
		if totalItems == 0 {
			return nil, fmt.Errorf("enabled day must have at least one menu item")
		}
	}
	menu.UpdatedAt = time.Now()
	return s.store.Menu.Upsert(ctx, menu)
}

// DeleteMenu removes a menu by ID
func (s *MenuService) DeleteMenu(ctx context.Context, id string) error {
	return s.store.Menu.Delete(ctx, id)
}

// UploadImage handles image upload, saves to /app/uploads, returns path
func (s *MenuService) UploadImage(ctx context.Context, filename string, reader io.Reader) (string, error) {
	ext := filepath.Ext(filename)
	if ext == "" {
		ext = ".jpg"
	}
	allowed := map[string]bool{".jpg": true, ".jpeg": true, ".png": true, ".webp": true, ".gif": true}
	if !allowed[strings.ToLower(ext)] {
		return "", fmt.Errorf("unsupported image format: %s", ext)
	}

	b := make([]byte, 16)
	rand.Read(b)
	newName := hex.EncodeToString(b) + ext
	uploadDir := "/app/uploads"
	os.MkdirAll(uploadDir, 0755)

	dst, err := os.Create(filepath.Join(uploadDir, newName))
	if err != nil {
		return "", err
	}
	defer dst.Close()

	if _, err := io.Copy(dst, reader); err != nil {
		return "", err
	}

	return "/uploads/" + newName, nil
}
