package services

import (
	"context"
	"os"

	"freshkitchen/store"
	"go.mongodb.org/mongo-driver/v2/bson"
)

type AdminService struct {
	store *store.Store
}

func NewAdminService(s *store.Store) *AdminService {
	return &AdminService{store: s}
}

func (s *AdminService) ListAdmins(ctx context.Context) ([]store.User, error) {
	return s.store.User.GetAdmins(ctx)
}

func (s *AdminService) AddAdmin(ctx context.Context, email string) (*store.User, error) {
	return s.store.User.SetRole(ctx, email, "admin")
}

func (s *AdminService) RemoveAdmin(ctx context.Context, id string) error {
	return s.store.User.RemoveAdmin(ctx, id)
}

func (s *AdminService) GetSettings(ctx context.Context) (bool, bool, error) {
	var setting struct {
		Value bool `bson:"value"`
	}
	weekendsEnabled := true
	err := s.store.Settings().FindOne(ctx, bson.M{"key": "weekends_enabled"}).Decode(&setting)
	if err == nil {
		weekendsEnabled = setting.Value
	}

	stripeEnabled := os.Getenv("STRIPE_ENABLED") == "true"
	return weekendsEnabled, stripeEnabled, nil
}
