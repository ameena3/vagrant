package store

import (
	"context"
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

type Announcement struct {
	ID        bson.ObjectID `bson:"_id,omitempty" json:"id"`
	Message   string        `bson:"message" json:"message"`
	Type      string        `bson:"type" json:"type"`
	Active    bool          `bson:"active" json:"active"`
	StartDate string        `bson:"start_date,omitempty" json:"start_date,omitempty"`
	EndDate   string        `bson:"end_date,omitempty" json:"end_date,omitempty"`
	CreatedBy string        `bson:"created_by" json:"created_by,omitempty"`
	CreatedAt time.Time     `bson:"created_at" json:"created_at"`
}

type AnnouncementStore struct {
	col *mongo.Collection
}

func (a *AnnouncementStore) GetActive(ctx context.Context) ([]Announcement, error) {
	today := time.Now().Format("2006-01-02")
	filter := bson.M{
		"active": true,
		"$or": []bson.M{
			{"end_date": ""},
			{"end_date": bson.M{"$gte": today}},
		},
	}
	opts := options.Find().SetSort(bson.M{"created_at": -1})
	cursor, err := a.col.Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var announcements []Announcement
	if err := cursor.All(ctx, &announcements); err != nil {
		return nil, err
	}
	return announcements, nil
}

func (a *AnnouncementStore) Create(ctx context.Context, ann *Announcement) (*Announcement, error) {
	ann.CreatedAt = time.Now()
	result, err := a.col.InsertOne(ctx, ann)
	if err != nil {
		return nil, err
	}
	ann.ID = result.InsertedID.(bson.ObjectID)
	return ann, nil
}

func (a *AnnouncementStore) Update(ctx context.Context, id string, ann *Announcement) (*Announcement, error) {
	objID, err := bson.ObjectIDFromHex(id)
	if err != nil {
		return nil, err
	}
	opts := options.FindOneAndUpdate().SetReturnDocument(options.After)
	var result Announcement
	err = a.col.FindOneAndUpdate(ctx, bson.M{"_id": objID}, bson.M{"$set": ann}, opts).Decode(&result)
	if err != nil {
		return nil, err
	}
	return &result, nil
}

func (a *AnnouncementStore) Delete(ctx context.Context, id string) error {
	objID, err := bson.ObjectIDFromHex(id)
	if err != nil {
		return err
	}
	_, err = a.col.DeleteOne(ctx, bson.M{"_id": objID})
	return err
}

func (a *AnnouncementStore) GetAll(ctx context.Context) ([]Announcement, error) {
	opts := options.Find().SetSort(bson.M{"created_at": -1})
	cursor, err := a.col.Find(ctx, bson.M{}, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var announcements []Announcement
	if err := cursor.All(ctx, &announcements); err != nil {
		return nil, err
	}
	return announcements, nil
}
