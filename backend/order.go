package freshkitchen

import (
	"context"
	"encoding/json"
	"io"
	"io/ioutil"
	"os"
	"time"

	order "freshkitchen/gen/order"
	"freshkitchen/store"

	"go.mongodb.org/mongo-driver/v2/bson"
	"goa.design/clue/log"
)

// order service implementation.
type ordersrvc struct {
	store *store.Store
}

// NewOrder returns the order service implementation.
func NewOrder(s *store.Store) order.Service {
	return &ordersrvc{store: s}
}

// Create a new order
func (s *ordersrvc) CreateOrder(ctx context.Context, p *order.CreateOrderPayload) (res *order.Order, err error) {
	log.Printf(ctx, "order.createOrder")

	// Extract user info from context (auth would normally provide this)
	// For now using placeholder values - would come from auth middleware
	customerID := "placeholder"
	customerName := "Customer"
	customerEmail := "customer@example.com"

	// Convert items
	items := make([]store.OrderItem, len(p.Items))
	totalAmount := 0.0

	for i, item := range p.Items {
		comment := ""
		if item.Comment != nil {
			comment = *item.Comment
		}

		items[i] = store.OrderItem{
			Date:         item.Date,
			DayOfWeek:    item.DayOfWeek,
			MealType:     item.MealType,
			MenuItemName: item.MenuItemName,
			Price:        item.Price,
			Comment:      comment,
		}
		totalAmount += item.Price
	}

	storeOrder := &store.Order{
		CustomerID:    customerID,
		CustomerName:  customerName,
		CustomerEmail: customerEmail,
		WeekStart:     p.WeekStart,
		Items:         items,
		TotalAmount:   totalAmount,
		Status:        "pending",
	}

	resultOrder, err := s.store.Order.Create(ctx, storeOrder)
	if err != nil {
		log.Printf(ctx, "Error creating order: %v", err)
		return nil, err
	}

	res = convertStoreOrderToGoaOrder(resultOrder)
	return res, nil
}

// Get order details
func (s *ordersrvc) GetOrder(ctx context.Context, p *order.GetOrderPayload) (res *order.Order, err error) {
	log.Printf(ctx, "order.getOrder")

	storeOrder, err := s.store.Order.GetByID(ctx, p.ID)
	if err != nil {
		log.Printf(ctx, "Error fetching order: %v", err)
		return nil, err
	}

	res = convertStoreOrderToGoaOrder(storeOrder)
	return res, nil
}

// List all orders (admin only)
func (s *ordersrvc) ListOrders(ctx context.Context, p *order.ListOrdersPayload) (res []*order.Order, err error) {
	log.Printf(ctx, "order.listOrders")

	var storeOrders []store.Order

	if p.Week != nil && *p.Week != "" {
		storeOrders, err = s.store.Order.GetByWeek(ctx, *p.Week)
	} else {
		storeOrders, err = s.store.Order.GetAll(ctx)
	}

	if err != nil {
		log.Printf(ctx, "Error fetching orders: %v", err)
		return nil, err
	}

	res = make([]*order.Order, len(storeOrders))
	for i, o := range storeOrders {
		res[i] = convertStoreOrderToGoaOrder(&o)
	}

	return res, nil
}

// Create Stripe checkout session for order
func (s *ordersrvc) Checkout(ctx context.Context, p *order.CheckoutPayload) (res *order.CheckoutResult, err error) {
	log.Printf(ctx, "order.checkout")

	storeOrder, err := s.store.Order.GetByID(ctx, p.OrderID)
	if err != nil {
		log.Printf(ctx, "Error fetching order for checkout: %v", err)
		return nil, err
	}

	// Check if STRIPE_ENABLED
	stripeEnabled := os.Getenv("STRIPE_ENABLED") == "true"

	var checkoutURL *string
	sessionID := "session_" + bson.NewObjectID().Hex()

	if stripeEnabled {
		// In production, this would create a real Stripe session
		// For now, we generate a placeholder
		url := "https://checkout.stripe.com/pay/" + sessionID
		checkoutURL = &url
	} else {
		// If Stripe is disabled, mark order as paid
		if err := s.store.Order.UpdateStatus(ctx, p.OrderID, "paid"); err != nil {
			log.Printf(ctx, "Error updating order status: %v", err)
			return nil, err
		}
	}

	// Update order with session ID
	if err := s.store.Order.UpdateStripeSession(ctx, p.OrderID, sessionID); err != nil {
		log.Printf(ctx, "Error updating stripe session: %v", err)
		return nil, err
	}

	orderID := storeOrder.ID.Hex()
	res = &order.CheckoutResult{
		CheckoutURL: checkoutURL,
		SessionID:   &sessionID,
		OrderID:     &orderID,
	}

	return res, nil
}

// Handle Stripe webhook events
func (s *ordersrvc) StripeWebhook(ctx context.Context, req io.ReadCloser) (err error) {
	defer req.Close()
	log.Printf(ctx, "order.stripeWebhook")

	body, err := ioutil.ReadAll(req)
	if err != nil {
		log.Printf(ctx, "Error reading webhook body: %v", err)
		return err
	}

	var event map[string]interface{}
	if err := json.Unmarshal(body, &event); err != nil {
		log.Printf(ctx, "Error parsing webhook JSON: %v", err)
		return err
	}

	eventType, ok := event["type"].(string)
	if !ok {
		log.Printf(ctx, "Error: Invalid event type")
		return ErrValidation
	}

	data, ok := event["data"].(map[string]interface{})
	if !ok {
		log.Printf(ctx, "Error: Invalid event data")
		return ErrValidation
	}

	object, ok := data["object"].(map[string]interface{})
	if !ok {
		log.Printf(ctx, "Error: Invalid object data")
		return ErrValidation
	}

	sessionID, ok := object["id"].(string)
	if !ok {
		log.Printf(ctx, "Error: Invalid session ID")
		return ErrValidation
	}

	switch eventType {
	case "checkout.session.completed":
		// Mark order as paid
		storeOrder, err := s.store.Order.GetByStripeSession(ctx, sessionID)
		if err != nil {
			log.Printf(ctx, "Error fetching order by session: %v", err)
			return err
		}

		if err := s.store.Order.UpdateStatus(ctx, storeOrder.ID.Hex(), "paid"); err != nil {
			log.Printf(ctx, "Error updating order status to paid: %v", err)
			return err
		}

		log.Printf(ctx, "Order marked as paid: %s", storeOrder.ID.Hex())

	case "payment_intent.payment_failed":
		storeOrder, err := s.store.Order.GetByStripeSession(ctx, sessionID)
		if err != nil {
			log.Printf(ctx, "Error fetching order by session: %v", err)
			return err
		}

		if err := s.store.Order.UpdateStatus(ctx, storeOrder.ID.Hex(), "payment_failed"); err != nil {
			log.Printf(ctx, "Error updating order status to payment_failed: %v", err)
			return err
		}

		log.Printf(ctx, "Order marked as payment_failed: %s", storeOrder.ID.Hex())
	}

	return nil
}

// Helper functions

func convertStoreOrderToGoaOrder(o *store.Order) *order.Order {
	if o == nil {
		return nil
	}

	id := o.ID.Hex()
	createdAt := o.CreatedAt.Format(time.RFC3339)

	items := make([]*order.OrderItem, len(o.Items))
	for i, item := range o.Items {
		comment := (*string)(nil)
		if item.Comment != "" {
			comment = &item.Comment
		}

		items[i] = &order.OrderItem{
			Date:         item.Date,
			DayOfWeek:    item.DayOfWeek,
			MealType:     item.MealType,
			MenuItemName: item.MenuItemName,
			Price:        item.Price,
			Comment:      comment,
		}
	}

	return &order.Order{
		ID:              &id,
		CustomerID:      &o.CustomerID,
		CustomerName:    &o.CustomerName,
		CustomerEmail:   &o.CustomerEmail,
		WeekStart:       &o.WeekStart,
		Items:           items,
		TotalAmount:     &o.TotalAmount,
		StripePaymentID: &o.StripePaymentID,
		StripeSessionID: &o.StripeSessionID,
		Status:          &o.Status,
		CreatedAt:       &createdAt,
	}
}

func convertGoaOrderItemToStoreOrderItem(item *order.OrderItem) store.OrderItem {
	comment := ""
	if item.Comment != nil {
		comment = *item.Comment
	}

	return store.OrderItem{
		Date:         item.Date,
		DayOfWeek:    item.DayOfWeek,
		MealType:     item.MealType,
		MenuItemName: item.MenuItemName,
		Price:        item.Price,
		Comment:      comment,
	}
}
