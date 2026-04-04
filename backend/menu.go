package freshkitchen

import (
	"context"
	"io"
	"io/ioutil"
	"os"
	"path/filepath"
	"time"

	menu "freshkitchen/gen/menu"
	"freshkitchen/store"

	"go.mongodb.org/mongo-driver/v2/bson"
	"goa.design/clue/log"
)

// menu service implementation.
type menusrvc struct {
	store *store.Store
}

// NewMenu returns the menu service implementation.
func NewMenu(s *store.Store) menu.Service {
	return &menusrvc{store: s}
}

// Get all menus for a specific week
func (s *menusrvc) GetWeekMenus(ctx context.Context, p *menu.GetWeekMenusPayload) (res []*menu.DayMenu, err error) {
	log.Printf(ctx, "menu.getWeekMenus")

	menus, err := s.store.Menu.GetByWeek(ctx, p.WeekStart)
	if err != nil {
		log.Printf(ctx, "Error fetching menus: %v", err)
		return nil, err
	}

	res = make([]*menu.DayMenu, len(menus))
	for i, m := range menus {
		res[i] = convertStorMenuToDayMenu(&m)
	}

	return res, nil
}

// Create or update menu for a day
func (s *menusrvc) CreateMenu(ctx context.Context, p *menu.CreateMenuPayload) (res *menu.DayMenu, err error) {
	log.Printf(ctx, "menu.createMenu")

	// Validate that at least one meal item exists if enabled
	if p.Enabled && p.Meals != nil {
		itemCount := len(p.Meals.Breakfast) + len(p.Meals.Lunch) + len(p.Meals.Dinner)
		if itemCount == 0 {
			log.Printf(ctx, "Error: Enabled menu must have at least one item")
			return nil, ErrValidation
		}
	}

	// Convert from Goa types to store types
	storeMenu := &store.Menu{
		WeekStart: p.WeekStart,
		DayOfWeek: p.DayOfWeek,
		Date:      p.Date,
		Enabled:   p.Enabled,
	}

	if p.Meals != nil {
		storeMenu.Meals = convertGoaMealSetToStoreMealSet(p.Meals)
	}

	// Upsert the menu
	resultMenu, err := s.store.Menu.Upsert(ctx, storeMenu)
	if err != nil {
		log.Printf(ctx, "Error upserting menu: %v", err)
		return nil, err
	}

	res = convertStorMenuToDayMenu(resultMenu)
	return res, nil
}

// Delete a menu
func (s *menusrvc) DeleteMenu(ctx context.Context, p *menu.DeleteMenuPayload) (err error) {
	log.Printf(ctx, "menu.deleteMenu")

	err = s.store.Menu.Delete(ctx, p.ID)
	if err != nil {
		log.Printf(ctx, "Error deleting menu: %v", err)
		return err
	}

	return nil
}

// Upload a menu item image
func (s *menusrvc) UploadImage(ctx context.Context, p *menu.UploadImagePayload, req io.ReadCloser) (res *menu.ImageUpload, err error) {
	defer req.Close()
	log.Printf(ctx, "menu.uploadImage")

	// Create uploads directory if it doesn't exist
	uploadsDir := "/app/uploads"
	if _, err := os.Stat(uploadsDir); os.IsNotExist(err) {
		os.MkdirAll(uploadsDir, 0755)
	}

	// Generate unique filename
	filename := "menu_" + bson.NewObjectID().Hex() + ".jpg"
	filepath := filepath.Join(uploadsDir, filename)

	// Write file
	data, err := ioutil.ReadAll(req)
	if err != nil {
		log.Printf(ctx, "Error reading upload file: %v", err)
		return nil, err
	}

	if err := ioutil.WriteFile(filepath, data, 0644); err != nil {
		log.Printf(ctx, "Error writing upload file: %v", err)
		return nil, err
	}

	res = &menu.ImageUpload{
		ImagePath: "/uploads/" + filename,
	}
	return res, nil
}

// Helper functions

func convertStorMenuToDayMenu(m *store.Menu) *menu.DayMenu {
	if m == nil {
		return nil
	}

	id := m.ID.Hex()
	now := m.UpdatedAt.Format(time.RFC3339)

	return &menu.DayMenu{
		ID:        &id,
		WeekStart: m.WeekStart,
		DayOfWeek: m.DayOfWeek,
		Date:      m.Date,
		Meals:     convertStoreMealSetToGoaMealSet(&m.Meals),
		Enabled:   m.Enabled,
		CreatedBy: &m.CreatedBy,
		UpdatedAt: &now,
	}
}

func convertStoreMealSetToGoaMealSet(ms *store.MealSet) *menu.MealSet {
	if ms == nil {
		return nil
	}

	breakfast := make([]*menu.MenuItem, len(ms.Breakfast))
	for i, item := range ms.Breakfast {
		breakfast[i] = convertStoreMenuItemToGoaMenuItem(&item)
	}

	lunch := make([]*menu.MenuItem, len(ms.Lunch))
	for i, item := range ms.Lunch {
		lunch[i] = convertStoreMenuItemToGoaMenuItem(&item)
	}

	dinner := make([]*menu.MenuItem, len(ms.Dinner))
	for i, item := range ms.Dinner {
		dinner[i] = convertStoreMenuItemToGoaMenuItem(&item)
	}

	return &menu.MealSet{
		Breakfast: breakfast,
		Lunch:     lunch,
		Dinner:    dinner,
	}
}

func convertStoreMenuItemToGoaMenuItem(item *store.MenuItem) *menu.MenuItem {
	if item == nil {
		return nil
	}

	var desc, imagePath *string
	if item.Description != "" {
		desc = &item.Description
	}
	if item.ImagePath != "" {
		imagePath = &item.ImagePath
	}

	return &menu.MenuItem{
		Name:        item.Name,
		Description: desc,
		Price:       item.Price,
		ImagePath:   imagePath,
	}
}

func convertGoaMealSetToStoreMealSet(gms *menu.MealSet) store.MealSet {
	ms := store.MealSet{}

	if gms == nil {
		return ms
	}

	for _, item := range gms.Breakfast {
		if item != nil {
			ms.Breakfast = append(ms.Breakfast, convertGoaMenuItemToStoreMenuItem(item))
		}
	}

	for _, item := range gms.Lunch {
		if item != nil {
			ms.Lunch = append(ms.Lunch, convertGoaMenuItemToStoreMenuItem(item))
		}
	}

	for _, item := range gms.Dinner {
		if item != nil {
			ms.Dinner = append(ms.Dinner, convertGoaMenuItemToStoreMenuItem(item))
		}
	}

	return ms
}

func convertGoaMenuItemToStoreMenuItem(item *menu.MenuItem) store.MenuItem {
	description := ""
	if item.Description != nil {
		description = *item.Description
	}

	imagePath := ""
	if item.ImagePath != nil {
		imagePath = *item.ImagePath
	}

	return store.MenuItem{
		Name:        item.Name,
		Description: description,
		Price:       item.Price,
		ImagePath:   imagePath,
	}
}
