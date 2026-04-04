package freshkitchen

import (
	"context"
	"time"

	admin "freshkitchen/gen/admin"
	"freshkitchen/store"

	"go.mongodb.org/mongo-driver/v2/bson"
	"goa.design/clue/log"
)

// admin service implementation.
type adminsrvc struct {
	store *store.Store
}

// NewAdmin returns the admin service implementation.
func NewAdmin(s *store.Store) admin.Service {
	return &adminsrvc{store: s}
}

// List all admin users
func (s *adminsrvc) ListAdmins(ctx context.Context, p *admin.ListAdminsPayload) (res []*admin.User, err error) {
	log.Printf(ctx, "admin.listAdmins")

	admins, err := s.store.User.GetAdmins(ctx)
	if err != nil {
		log.Printf(ctx, "Error fetching admins: %v", err)
		return nil, err
	}

	res = make([]*admin.User, len(admins))
	for i, u := range admins {
		res[i] = convertStoreUserToGoaUser(&u)
	}

	return res, nil
}

// Add a new admin user
func (s *adminsrvc) AddAdmin(ctx context.Context, p *admin.AddAdminPayload) (res *admin.User, err error) {
	log.Printf(ctx, "admin.addAdmin")

	// Set role to admin
	storeUser, err := s.store.User.SetRole(ctx, p.Email, "admin")
	if err != nil {
		log.Printf(ctx, "Error setting user role to admin: %v", err)
		return nil, err
	}

	res = convertStoreUserToGoaUser(storeUser)
	return res, nil
}

// Remove an admin user
func (s *adminsrvc) RemoveAdmin(ctx context.Context, p *admin.RemoveAdminPayload) (err error) {
	log.Printf(ctx, "admin.removeAdmin")

	err = s.store.User.RemoveAdmin(ctx, p.ID)
	if err != nil {
		log.Printf(ctx, "Error removing admin: %v", err)
		return err
	}

	return nil
}

// Get admin settings
func (s *adminsrvc) GetSettings(ctx context.Context, p *admin.GetSettingsPayload) (res *admin.GetSettingsResult, err error) {
	log.Printf(ctx, "admin.getSettings")

	settingsColl := s.store.Settings()
	var settingsDoc bson.M
	settingsColl.FindOne(ctx, bson.M{}).Decode(&settingsDoc)

	weekendsEnabled := false
	stripeEnabled := false

	if settingsDoc != nil {
		if we, ok := settingsDoc["weekends_enabled"].(bool); ok {
			weekendsEnabled = we
		}
		if se, ok := settingsDoc["stripe_enabled"].(bool); ok {
			stripeEnabled = se
		}
	}

	res = &admin.GetSettingsResult{
		WeekendsEnabled: &weekendsEnabled,
		StripeEnabled:   &stripeEnabled,
	}

	return res, nil
}

// Helper functions

func convertStoreUserToGoaUser(u *store.User) *admin.User {
	if u == nil {
		return nil
	}

	id := u.ID.Hex()
	createdAt := u.CreatedAt.Format(time.RFC3339)

	return &admin.User{
		ID:        &id,
		Email:     &u.Email,
		Name:      &u.Name,
		Picture:   &u.Picture,
		Role:      &u.Role,
		CreatedAt: &createdAt,
	}
}
