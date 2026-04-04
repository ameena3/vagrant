package store

import (
	"context"
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

type MenuItem struct {
	Name        string  `bson:"name" json:"name"`
	Description string  `bson:"description" json:"description"`
	Price       float64 `bson:"price" json:"price"`
	ImagePath   string  `bson:"image_path,omitempty" json:"image_path,omitempty"`
}

type MealSet struct {
	Breakfast []MenuItem `bson:"breakfast,omitempty" json:"breakfast"`
	Lunch     []MenuItem `bson:"lunch,omitempty" json:"lunch"`
	Dinner    []MenuItem `bson:"dinner,omitempty" json:"dinner"`
}

type Menu struct {
	ID        bson.ObjectID `bson:"_id,omitempty" json:"id"`
	WeekStart string        `bson:"week_start" json:"week_start"`
	DayOfWeek int           `bson:"day_of_week" json:"day_of_week"`
	Date      string        `bson:"date" json:"date"`
	Meals     MealSet       `bson:"meals" json:"meals"`
	Enabled   bool          `bson:"enabled" json:"enabled"`
	CreatedBy string        `bson:"created_by" json:"created_by,omitempty"`
	UpdatedAt time.Time     `bson:"updated_at" json:"updated_at"`
}

type MenuStore struct {
	col *mongo.Collection
}

func (m *MenuStore) GetByWeek(ctx context.Context, weekStart string) ([]Menu, error) {
	filter := bson.M{"week_start": weekStart}
	cursor, err := m.col.Find(ctx, filter)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var menus []Menu
	if err := cursor.All(ctx, &menus); err != nil {
		return nil, err
	}
	return menus, nil
}

func (m *MenuStore) GetByDate(ctx context.Context, date string) (*Menu, error) {
	filter := bson.M{"date": date}
	var menu Menu
	err := m.col.FindOne(ctx, filter).Decode(&menu)
	if err != nil {
		return nil, err
	}
	return &menu, nil
}

func (m *MenuStore) Upsert(ctx context.Context, menu *Menu) (*Menu, error) {
	filter := bson.M{
		"week_start":  menu.WeekStart,
		"day_of_week": menu.DayOfWeek,
	}
	menu.UpdatedAt = time.Now()

	opts := options.FindOneAndUpdate().
		SetUpsert(true).
		SetReturnDocument(options.After)

	update := bson.M{"$set": menu}

	var result Menu
	err := m.col.FindOneAndUpdate(ctx, filter, update, opts).Decode(&result)
	if err != nil {
		return nil, err
	}
	return &result, nil
}

func (m *MenuStore) Delete(ctx context.Context, id string) error {
	objID, err := bson.ObjectIDFromHex(id)
	if err != nil {
		return err
	}
	_, err = m.col.DeleteOne(ctx, bson.M{"_id": objID})
	return err
}
