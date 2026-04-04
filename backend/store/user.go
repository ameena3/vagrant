package store

import (
	"context"
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
)

type User struct {
	ID        bson.ObjectID `bson:"_id,omitempty" json:"id"`
	Email     string        `bson:"email" json:"email"`
	Name      string        `bson:"name" json:"name"`
	Picture   string        `bson:"picture,omitempty" json:"picture,omitempty"`
	Role      string        `bson:"role" json:"role"`
	CreatedAt time.Time     `bson:"created_at" json:"created_at"`
	LastLogin time.Time     `bson:"last_login" json:"last_login"`
}

type UserStore struct {
	col *mongo.Collection
}

func (u *UserStore) FindOrCreate(ctx context.Context, email, name, picture string) (*User, error) {
	filter := bson.M{"email": email}
	var existingUser User

	err := u.col.FindOne(ctx, filter).Decode(&existingUser)
	if err == nil {
		existingUser.LastLogin = time.Now()
		u.col.UpdateOne(ctx, filter, bson.M{"$set": bson.M{"last_login": existingUser.LastLogin}})
		return &existingUser, nil
	}

	if err != mongo.ErrNoDocuments {
		return nil, err
	}

	count, err := u.col.EstimatedDocumentCount(ctx)
	if err != nil {
		return nil, err
	}

	role := "customer"
	if count == 0 {
		role = "admin"
	}

	newUser := &User{
		Email:     email,
		Name:      name,
		Picture:   picture,
		Role:      role,
		CreatedAt: time.Now(),
		LastLogin: time.Now(),
	}

	result, err := u.col.InsertOne(ctx, newUser)
	if err != nil {
		return nil, err
	}

	newUser.ID = result.InsertedID.(bson.ObjectID)
	return newUser, nil
}

func (u *UserStore) GetByEmail(ctx context.Context, email string) (*User, error) {
	var user User
	err := u.col.FindOne(ctx, bson.M{"email": email}).Decode(&user)
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (u *UserStore) GetByID(ctx context.Context, id string) (*User, error) {
	objID, err := bson.ObjectIDFromHex(id)
	if err != nil {
		return nil, err
	}
	var user User
	err = u.col.FindOne(ctx, bson.M{"_id": objID}).Decode(&user)
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (u *UserStore) GetAdmins(ctx context.Context) ([]User, error) {
	cursor, err := u.col.Find(ctx, bson.M{"role": "admin"})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var admins []User
	if err := cursor.All(ctx, &admins); err != nil {
		return nil, err
	}
	return admins, nil
}

func (u *UserStore) SetRole(ctx context.Context, email, role string) (*User, error) {
	var user User
	err := u.col.FindOneAndUpdate(
		ctx,
		bson.M{"email": email},
		bson.M{"$set": bson.M{"role": role}},
	).Decode(&user)
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (u *UserStore) RemoveAdmin(ctx context.Context, id string) error {
	objID, err := bson.ObjectIDFromHex(id)
	if err != nil {
		return err
	}
	_, err = u.col.UpdateOne(ctx, bson.M{"_id": objID}, bson.M{"$set": bson.M{"role": "customer"}})
	return err
}

func (u *UserStore) CountCustomers(ctx context.Context) (int64, error) {
	return u.col.CountDocuments(ctx, bson.M{"role": "customer"})
}
