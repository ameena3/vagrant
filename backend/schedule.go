package freshkitchen

import (
	"context"
	"time"

	schedule "freshkitchen/gen/schedule"
	"freshkitchen/store"

	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
	"goa.design/clue/log"
)

// schedule service implementation.
type schedulesrvc struct {
	store *store.Store
}

// NewSchedule returns the schedule service implementation.
func NewSchedule(s *store.Store) schedule.Service {
	return &schedulesrvc{store: s}
}

// Get schedule for a specific week
func (s *schedulesrvc) GetWeekSchedule(ctx context.Context, p *schedule.GetWeekSchedulePayload) (res *schedule.WeekSchedule, err error) {
	log.Printf(ctx, "schedule.getWeekSchedule")

	days, err := s.store.Schedule.GetByWeek(ctx, p.WeekStart)
	if err != nil {
		log.Printf(ctx, "Error fetching schedule: %v", err)
		return nil, err
	}

	// Fetch weekends_enabled setting
	settingsColl := s.store.Settings()
	var settingsDoc bson.M
	settingsColl.FindOne(ctx, bson.M{}).Decode(&settingsDoc)

	weekendsEnabled := false
	if settingsDoc != nil {
		if we, ok := settingsDoc["weekends_enabled"].(bool); ok {
			weekendsEnabled = we
		}
	}

	scheduleDays := make([]*schedule.ScheduleDay, len(days))
	for i, day := range days {
		scheduleDays[i] = convertStoreScheduleDayToGoaScheduleDay(&day)
	}

	res = &schedule.WeekSchedule{
		Days:            scheduleDays,
		WeekendsEnabled: &weekendsEnabled,
	}

	return res, nil
}

// Update schedule for a specific day
func (s *schedulesrvc) UpdateDay(ctx context.Context, p *schedule.UpdateDayPayload) (res *schedule.ScheduleDay, err error) {
	log.Printf(ctx, "schedule.updateDay")

	// Extract user info from context (auth would normally provide this)
	updatedBy := "admin" // Placeholder

	blockReason := ""
	if p.BlockReason != nil {
		blockReason = *p.BlockReason
	}

	storeDay := &store.ScheduleDay{
		Date:        p.Date,
		Blocked:     p.Blocked,
		BlockReason: blockReason,
		UpdatedBy:   updatedBy,
	}

	resultDay, err := s.store.Schedule.UpsertDay(ctx, storeDay)
	if err != nil {
		log.Printf(ctx, "Error updating schedule day: %v", err)
		return nil, err
	}

	res = convertStoreScheduleDayToGoaScheduleDay(resultDay)
	return res, nil
}

// Update schedule for an entire week
func (s *schedulesrvc) UpdateWeek(ctx context.Context, p *schedule.UpdateWeekPayload) (res []*schedule.ScheduleDay, err error) {
	log.Printf(ctx, "schedule.updateWeek")

	// Extract user info from context (auth would normally provide this)
	updatedBy := "admin" // Placeholder

	blockReason := ""
	if p.BlockReason != nil {
		blockReason = *p.BlockReason
	}

	days, err := s.store.Schedule.BlockWeek(ctx, p.WeekStart, p.Blocked, blockReason, updatedBy)
	if err != nil {
		log.Printf(ctx, "Error updating schedule week: %v", err)
		return nil, err
	}

	res = make([]*schedule.ScheduleDay, len(days))
	for i, day := range days {
		res[i] = convertStoreScheduleDayToGoaScheduleDay(&day)
	}

	return res, nil
}

// Enable or disable weekend bookings
func (s *schedulesrvc) ToggleWeekends(ctx context.Context, p *schedule.ToggleWeekendsPayload) (res *schedule.ToggleWeekendsResult, err error) {
	log.Printf(ctx, "schedule.toggleWeekends")

	settingsColl := s.store.Settings()

	// Update settings (upsert so it works even if no settings doc exists yet)
	opts := options.UpdateOne().SetUpsert(true)
	_, err = settingsColl.UpdateOne(
		ctx,
		bson.M{},
		bson.M{"$set": bson.M{"weekends_enabled": p.Enabled}},
		opts,
	)
	if err != nil {
		log.Printf(ctx, "Error updating weekends setting: %v", err)
		return nil, err
	}

	res = &schedule.ToggleWeekendsResult{
		Enabled: &p.Enabled,
	}

	return res, nil
}

// Helper functions

func convertStoreScheduleDayToGoaScheduleDay(sd *store.ScheduleDay) *schedule.ScheduleDay {
	if sd == nil {
		return nil
	}

	id := sd.ID.Hex()
	updatedAt := sd.UpdatedAt.Format(time.RFC3339)

	return &schedule.ScheduleDay{
		ID:          &id,
		Date:        &sd.Date,
		DayOfWeek:   &sd.DayOfWeek,
		Blocked:     &sd.Blocked,
		BlockReason: &sd.BlockReason,
		UpdatedAt:   &updatedAt,
	}
}
