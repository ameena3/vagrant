package store

import (
	"context"
	"fmt"
	"log"
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

type Store struct {
	client       *mongo.Client
	db           *mongo.Database
	Menu         *MenuStore
	Order        *OrderStore
	Schedule     *ScheduleStore
	User         *UserStore
	Announcement *AnnouncementStore
}

func New(mongoURI string) (*Store, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	client, err := mongo.Connect(options.Client().ApplyURI(mongoURI))
	if err != nil {
		return nil, err
	}

	if err := client.Ping(ctx, nil); err != nil {
		return nil, err
	}

	db := client.Database("freshkitchen")
	log.Println("Connected to MongoDB")

	// Ensure TTL indexes exist and backfill existing documents
	if err := ensureTTLIndexes(ctx, db); err != nil {
		log.Printf("Warning: TTL index setup: %v", err)
	}

	return &Store{
		client:       client,
		db:           db,
		Menu:         &MenuStore{col: db.Collection("menus")},
		Order:        &OrderStore{col: db.Collection("orders")},
		Schedule:     &ScheduleStore{col: db.Collection("schedule")},
		User:         &UserStore{col: db.Collection("users")},
		Announcement: &AnnouncementStore{col: db.Collection("announcements")},
	}, nil
}

func (s *Store) Close(ctx context.Context) error {
	return s.client.Disconnect(ctx)
}

// ensureTTLIndexes creates TTL indexes for automatic cleanup and backfills
// existing documents that don't have an expires_at field yet.
func ensureTTLIndexes(ctx context.Context, db *mongo.Database) error {
	// Menu TTL index: expires_at with 0 second delay
	menusCol := db.Collection("menus")
	_, err := menusCol.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys:    bson.M{"expires_at": 1},
		Options: options.Index().SetExpireAfterSeconds(0),
	})
	if err != nil {
		return fmt.Errorf("creating menu TTL index: %w", err)
	}

	// Announcement TTL index
	annCol := db.Collection("announcements")
	_, err = annCol.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys:    bson.M{"expires_at": 1},
		Options: options.Index().SetExpireAfterSeconds(0),
	})
	if err != nil {
		return fmt.Errorf("creating announcement TTL index: %w", err)
	}

	// Backfill menus missing expires_at
	if err := backfillMenuExpiry(ctx, menusCol); err != nil {
		return fmt.Errorf("backfilling menu expiry: %w", err)
	}

	// Backfill announcements missing expires_at
	if err := backfillAnnouncementExpiry(ctx, annCol); err != nil {
		return fmt.Errorf("backfilling announcement expiry: %w", err)
	}

	return nil
}

func backfillMenuExpiry(ctx context.Context, col *mongo.Collection) error {
	filter := bson.M{"expires_at": bson.M{"$exists": false}}
	cursor, err := col.Find(ctx, filter)
	if err != nil {
		return err
	}
	defer cursor.Close(ctx)

	for cursor.Next(ctx) {
		var m Menu
		if err := cursor.Decode(&m); err != nil {
			continue
		}
		ws, err := time.Parse("2006-01-02", m.WeekStart)
		if err != nil {
			continue
		}
		expiresAt := ws.AddDate(0, 0, 14)
		_, _ = col.UpdateByID(ctx, m.ID, bson.M{"$set": bson.M{"expires_at": expiresAt}})
	}
	return nil
}

func backfillAnnouncementExpiry(ctx context.Context, col *mongo.Collection) error {
	filter := bson.M{
		"end_date":   bson.M{"$ne": ""},
		"expires_at": bson.M{"$exists": false},
	}
	cursor, err := col.Find(ctx, filter)
	if err != nil {
		return err
	}
	defer cursor.Close(ctx)

	for cursor.Next(ctx) {
		var a Announcement
		if err := cursor.Decode(&a); err != nil {
			continue
		}
		ed, err := time.Parse("2006-01-02", a.EndDate)
		if err != nil {
			continue
		}
		expiresAt := ed.AddDate(0, 0, 1)
		_, _ = col.UpdateByID(ctx, a.ID, bson.M{"$set": bson.M{"expires_at": expiresAt}})
	}
	return nil
}

func (s *Store) Settings() *mongo.Collection {
	return s.db.Collection("settings")
}
