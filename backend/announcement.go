package freshkitchen

import (
	"context"
	"time"

	announcement "freshkitchen/gen/announcement"
	"freshkitchen/store"

	"go.mongodb.org/mongo-driver/v2/bson"
	"goa.design/clue/log"
)

// announcement service implementation.
type announcementsrvc struct {
	store *store.Store
}

// NewAnnouncement returns the announcement service implementation.
func NewAnnouncement(s *store.Store) announcement.Service {
	return &announcementsrvc{store: s}
}

// List all active announcements
func (s *announcementsrvc) ListActive(ctx context.Context) (res []*announcement.Announcement, err error) {
	log.Printf(ctx, "announcement.listActive")

	announcements, err := s.store.Announcement.GetActive(ctx)
	if err != nil {
		log.Printf(ctx, "Error fetching active announcements: %v", err)
		return nil, err
	}

	res = make([]*announcement.Announcement, len(announcements))
	for i, a := range announcements {
		res[i] = convertStoreAnnouncementToGoaAnnouncement(&a)
	}

	return res, nil
}

// Create a new announcement
func (s *announcementsrvc) Create(ctx context.Context, p *announcement.CreatePayload) (res *announcement.Announcement, err error) {
	log.Printf(ctx, "announcement.create")

	// Extract user info from context (auth would normally provide this)
	createdBy := "admin" // Placeholder

	storeAnnouncement := &store.Announcement{
		Message:   p.Message,
		Type:      p.Type,
		Active:    p.Active,
		StartDate: p.StartDate,
		EndDate:   p.EndDate,
		CreatedBy: createdBy,
	}

	resultAnnouncement, err := s.store.Announcement.Create(ctx, storeAnnouncement)
	if err != nil {
		log.Printf(ctx, "Error creating announcement: %v", err)
		return nil, err
	}

	res = convertStoreAnnouncementToGoaAnnouncement(resultAnnouncement)
	return res, nil
}

// Update an existing announcement
func (s *announcementsrvc) Update(ctx context.Context, p *announcement.UpdatePayload) (res *announcement.Announcement, err error) {
	log.Printf(ctx, "announcement.update")

	storeAnnouncement := &store.Announcement{
		Message:   p.Message,
		Type:      p.Type,
		Active:    p.Active,
		StartDate: p.StartDate,
		EndDate:   p.EndDate,
	}

	resultAnnouncement, err := s.store.Announcement.Update(ctx, p.ID, storeAnnouncement)
	if err != nil {
		log.Printf(ctx, "Error updating announcement: %v", err)
		return nil, err
	}

	res = convertStoreAnnouncementToGoaAnnouncement(resultAnnouncement)
	return res, nil
}

// Delete an announcement
func (s *announcementsrvc) Delete(ctx context.Context, p *announcement.DeletePayload) (err error) {
	log.Printf(ctx, "announcement.delete")

	err = s.store.Announcement.Delete(ctx, p.ID)
	if err != nil {
		log.Printf(ctx, "Error deleting announcement: %v", err)
		return err
	}

	return nil
}

// Helper functions

func convertStoreAnnouncementToGoaAnnouncement(a *store.Announcement) *announcement.Announcement {
	if a == nil {
		return nil
	}

	id := a.ID.Hex()
	createdAt := a.CreatedAt.Format(time.RFC3339)

	return &announcement.Announcement{
		ID:        &id,
		Message:   &a.Message,
		Type:      &a.Type,
		Active:    &a.Active,
		StartDate: &a.StartDate,
		EndDate:   &a.EndDate,
		CreatedAt: &createdAt,
	}
}
