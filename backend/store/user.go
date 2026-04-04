package store

import (
	"context"
	"errors"
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"golang.org/x/crypto/bcrypt"
)

type User struct {
	ID           bson.ObjectID `bson:"_id,omitempty" json:"id"`
	Email        string        `bson:"email" json:"email"`
	Name         string        `bson:"name" json:"name"`
	Picture      string        `bson:"picture,omitempty" json:"picture,omitempty"`
	Role         string        `bson:"role" json:"role"`
	PasswordHash string        `bson:"password_hash,omitempty" json:"-"`
	CreatedAt    time.Time     `bson:"created_at" json:"created_at"`
	LastLogin    time.Time     `bson:"last_login" json:"last_login"`
}

type UserStore struct {
	col *mongo.Collection
}

// EnsureAdminExists seeds the first admin user if the collection is empty.
func (u *UserStore) EnsureAdminExists(ctx context.Context, email, name, password string) error {
	if email == "" || password == "" {
		return nil // no seed config, skip
	}
	count, err := u.col.EstimatedDocumentCount(ctx)
	if err != nil {
		return err
	}
	if count > 0 {
		return nil
	}
	_, err = u.CreateWithPassword(ctx, email, name, password, "admin")
	return err
}

// CreateWithPassword creates a new user with a bcrypt-hashed password.
func (u *UserStore) CreateWithPassword(ctx context.Context, email, name, password, role string) (*User, error) {
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}
	user := &User{
		Email:        email,
		Name:         name,
		Role:         role,
		PasswordHash: string(hash),
		CreatedAt:    time.Now(),
		LastLogin:    time.Now(),
	}
	result, err := u.col.InsertOne(ctx, user)
	if err != nil {
		return nil, err
	}
	user.ID = result.InsertedID.(bson.ObjectID)
	return user, nil
}

// FindByCredentials looks up a user by email and verifies their password.
func (u *UserStore) FindByCredentials(ctx context.Context, email, password string) (*User, error) {
	var user User
	if err := u.col.FindOne(ctx, bson.M{"email": email}).Decode(&user); err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return nil, errors.New("invalid credentials")
		}
		return nil, err
	}
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password)); err != nil {
		return nil, errors.New("invalid credentials")
	}
	// Update last login
	u.col.UpdateOne(ctx, bson.M{"_id": user.ID}, bson.M{"$set": bson.M{"last_login": time.Now()}})
	return &user, nil
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

func (u *UserStore) GetAll(ctx context.Context) ([]User, error) {
	cursor, err := u.col.Find(ctx, bson.M{})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var users []User
	if err := cursor.All(ctx, &users); err != nil {
		return nil, err
	}
	return users, nil
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
