package services

import (
	"context"

	"freshkitchen/store"
)

type AnnouncementService struct {
	store *store.Store
}

func NewAnnouncementService(s *store.Store) *AnnouncementService {
	return &AnnouncementService{store: s}
}

func (s *AnnouncementService) ListActive(ctx context.Context) ([]store.Announcement, error) {
	return s.store.Announcement.GetActive(ctx)
}

func (s *AnnouncementService) Create(ctx context.Context, ann *store.Announcement) (*store.Announcement, error) {
	return s.store.Announcement.Create(ctx, ann)
}

func (s *AnnouncementService) Update(ctx context.Context, id string, ann *store.Announcement) (*store.Announcement, error) {
	return s.store.Announcement.Update(ctx, id, ann)
}

func (s *AnnouncementService) Delete(ctx context.Context, id string) error {
	return s.store.Announcement.Delete(ctx, id)
}

func (s *AnnouncementService) GetAll(ctx context.Context) ([]store.Announcement, error) {
	return s.store.Announcement.GetAll(ctx)
}
