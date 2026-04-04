package services

import (
	"context"
	"time"

	"freshkitchen/store"
	"go.mongodb.org/mongo-driver/v2/bson"
)

type ScheduleService struct {
	store *store.Store
}

func NewScheduleService(s *store.Store) *ScheduleService {
	return &ScheduleService{store: s}
}

// GetWeekSchedule returns schedule for a week plus weekends_enabled setting
func (s *ScheduleService) GetWeekSchedule(ctx context.Context, weekStart string) ([]store.ScheduleDay, bool, error) {
	days, err := s.store.Schedule.GetByWeek(ctx, weekStart)
	if err != nil {
		return nil, false, err
	}

	// Get weekends_enabled setting
	var setting struct {
		Value bool `bson:"value"`
	}
	err = s.store.Settings().FindOne(ctx, bson.M{"key": "weekends_enabled"}).Decode(&setting)
	weekendsEnabled := true // default
	if err == nil {
		weekendsEnabled = setting.Value
	}

	return days, weekendsEnabled, nil
}

// UpdateDay blocks or unblocks a specific day
func (s *ScheduleService) UpdateDay(ctx context.Context, date string, blocked bool, reason string, updatedBy string) (*store.ScheduleDay, error) {
	// Parse date to get day_of_week
	t, err := time.Parse("2006-01-02", date)
	if err != nil {
		return nil, err
	}

	day := &store.ScheduleDay{
		Date:        date,
		DayOfWeek:   int(t.Weekday()),
		Blocked:     blocked,
		BlockReason: reason,
		UpdatedBy:   updatedBy,
		UpdatedAt:   time.Now(),
	}

	return s.store.Schedule.UpsertDay(ctx, day)
}

// UpdateWeek blocks or unblocks an entire week
func (s *ScheduleService) UpdateWeek(ctx context.Context, weekStart string, blocked bool, reason string, updatedBy string) ([]store.ScheduleDay, error) {
	return s.store.Schedule.BlockWeek(ctx, weekStart, blocked, reason, updatedBy)
}

// ToggleWeekends enables or disables weekend bookings
func (s *ScheduleService) ToggleWeekends(ctx context.Context, enabled bool) error {
	_, err := s.store.Settings().UpdateOne(
		ctx,
		bson.M{"key": "weekends_enabled"},
		bson.M{"$set": bson.M{"value": enabled}},
	)
	return err
}
