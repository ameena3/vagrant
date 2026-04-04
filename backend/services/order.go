package services

import (
	"context"
	"fmt"
	"os"

	"freshkitchen/store"
	"github.com/stripe/stripe-go/v78"
	"github.com/stripe/stripe-go/v78/checkout/session"
)

type OrderService struct {
	store *store.Store
}

func NewOrderService(s *store.Store) *OrderService {
	return &OrderService{store: s}
}

func (s *OrderService) CreateOrder(ctx context.Context, order *store.Order) (*store.Order, error) {
	// Calculate total
	var total float64
	for _, item := range order.Items {
		total += item.Price
	}
	order.TotalAmount = total

	// Check if Stripe is enabled
	stripeEnabled := os.Getenv("STRIPE_ENABLED") == "true"
	if !stripeEnabled {
		order.Status = "paid"
	} else {
		order.Status = "pending"
	}

	return s.store.Order.Create(ctx, order)
}

func (s *OrderService) GetOrder(ctx context.Context, id string) (*store.Order, error) {
	return s.store.Order.GetByID(ctx, id)
}

func (s *OrderService) ListOrders(ctx context.Context, weekStart string) ([]store.Order, error) {
	if weekStart != "" {
		return s.store.Order.GetByWeek(ctx, weekStart)
	}
	return s.store.Order.GetAll(ctx)
}

// Checkout creates a Stripe checkout session
func (s *OrderService) Checkout(ctx context.Context, orderID string) (string, string, error) {
	stripeEnabled := os.Getenv("STRIPE_ENABLED") == "true"
	if !stripeEnabled {
		// Already marked as paid in CreateOrder
		return "", "", fmt.Errorf("stripe is disabled, order already completed")
	}

	order, err := s.store.Order.GetByID(ctx, orderID)
	if err != nil {
		return "", "", err
	}

	stripe.Key = os.Getenv("STRIPE_SECRET_KEY")
	frontendURL := os.Getenv("FRONTEND_URL")
	if frontendURL == "" {
		frontendURL = "http://localhost:3000"
	}

	// Build line items
	var lineItems []*stripe.CheckoutSessionLineItemParams
	for _, item := range order.Items {
		lineItems = append(lineItems, &stripe.CheckoutSessionLineItemParams{
			PriceData: &stripe.CheckoutSessionLineItemPriceDataParams{
				Currency:   stripe.String("usd"),
				UnitAmount: stripe.Int64(int64(item.Price * 100)),
				ProductData: &stripe.CheckoutSessionLineItemPriceDataProductDataParams{
					Name: stripe.String(fmt.Sprintf("%s (%s - %s)", item.MenuItemName, item.Date, item.MealType)),
				},
			},
			Quantity: stripe.Int64(1),
		})
	}

	params := &stripe.CheckoutSessionParams{
		PaymentMethodTypes: stripe.StringSlice([]string{"card"}),
		LineItems:          lineItems,
		Mode:               stripe.String(string(stripe.CheckoutSessionModePayment)),
		SuccessURL:         stripe.String(frontendURL + "/order/success?session_id={CHECKOUT_SESSION_ID}"),
		CancelURL:          stripe.String(frontendURL + "/order"),
	}
	params.AddMetadata("order_id", orderID)

	sess, err := session.New(params)
	if err != nil {
		return "", "", err
	}

	// Update order with session ID
	s.store.Order.UpdateStripeSession(ctx, orderID, sess.ID)

	return sess.URL, sess.ID, nil
}

// HandleStripeWebhook processes Stripe webhook events
func (s *OrderService) HandleStripeWebhook(ctx context.Context, sessionID string) error {
	order, err := s.store.Order.GetByStripeSession(ctx, sessionID)
	if err != nil {
		return err
	}
	return s.store.Order.UpdateStatus(ctx, order.ID.Hex(), "paid")
}
