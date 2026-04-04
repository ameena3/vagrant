package store

import (
	"context"
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

type ScheduleDay struct {
	ID          bson.ObjectID `bson:"_id,omitempty" json:"id"`
	Date        string        `bson:"date" json:"date"`
	DayOfWeek   int           `bson:"day_of_week" json:"day_of_week"`
	Blocked     bool          `bson:"blocked" json:"blocked"`
	BlockReason string        `bson:"block_reason,omitempty" json:"block_reason,omitempty"`
	UpdatedBy   string        `bson:"updated_by" json:"updated_by,omitempty"`
	UpdatedAt   time.Time     `bson:"updated_at" json:"updated_at"`
}

type ScheduleStore struct {
	col *mongo.Collection
}

func (s *ScheduleStore) GetByWeek(ctx context.Context, weekStart string) ([]ScheduleDay, error) {
	startDate, err := time.Parse("2006-01-02", weekStart)
	if err != nil {
		return nil, err
	}
	endDate := startDate.AddDate(0, 0, 6)

	filter := bson.M{
		"date": bson.M{
			"$gte": weekStart,
			"$lte": endDate.Format("2006-01-02"),
		},
	}
	opts := options.Find().SetSort(bson.M{"date": 1})
	cursor, err := s.col.Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var days []ScheduleDay
	if err := cursor.All(ctx, &days); err != nil {
		return nil, err
	}
	return days, nil
}

func (s *ScheduleStore) UpsertDay(ctx context.Context, day *ScheduleDay) (*ScheduleDay, error) {
	day.UpdatedAt = time.Now()
	opts := options.FindOneAndUpdate().
		SetUpsert(true).
		SetReturnDocument(options.After)

	var result ScheduleDay
	err := s.col.FindOneAndUpdate(
		ctx,
		bson.M{"date": day.Date},
		bson.M{"$set": day},
		opts,
	).Decode(&result)
	if err != nil {
		return nil, err
	}
	return &result, nil
}

func (s *ScheduleStore) BlockWeek(ctx context.Context, weekStart string, blocked bool, reason string, updatedBy string) ([]ScheduleDay, error) {
	startDate, err := time.Parse("2006-01-02", weekStart)
	if err != nil {
		return nil, err
	}

	var days []ScheduleDay
	for i := 0; i < 7; i++ {
		date := startDate.AddDate(0, 0, i)
		day := &ScheduleDay{
			Date:        date.Format("2006-01-02"),
			DayOfWeek:   int(date.Weekday()),
			Blocked:     blocked,
			BlockReason: reason,
			UpdatedBy:   updatedBy,
		}
		updatedDay, err := s.UpsertDay(ctx, day)
		if err != nil {
			return nil, err
		}
		days = append(days, *updatedDay)
	}
	return days, nil
}
