package store

import (
	"context"
	"log"
	"time"

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

func (s *Store) Settings() *mongo.Collection {
	return s.db.Collection("settings")
}
