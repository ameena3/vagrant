package store

import (
	"context"
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

type OrderItem struct {
	Date         string  `bson:"date" json:"date"`
	DayOfWeek    int     `bson:"day_of_week" json:"day_of_week"`
	MealType     string  `bson:"meal_type" json:"meal_type"`
	MenuItemName string  `bson:"menu_item_name" json:"menu_item_name"`
	Price        float64 `bson:"price" json:"price"`
	Comment      string  `bson:"comment,omitempty" json:"comment,omitempty"`
}

type Order struct {
	ID              bson.ObjectID `bson:"_id,omitempty" json:"id"`
	CustomerID      string        `bson:"customer_id" json:"customer_id"`
	CustomerName    string        `bson:"customer_name" json:"customer_name"`
	CustomerEmail   string        `bson:"customer_email" json:"customer_email"`
	WeekStart       string        `bson:"week_start" json:"week_start"`
	Items           []OrderItem   `bson:"items" json:"items"`
	TotalAmount     float64       `bson:"total_amount" json:"total_amount"`
	StripePaymentID string        `bson:"stripe_payment_id,omitempty" json:"stripe_payment_id,omitempty"`
	StripeSessionID string        `bson:"stripe_session_id,omitempty" json:"stripe_session_id,omitempty"`
	Status          string        `bson:"status" json:"status"`
	CreatedAt       time.Time     `bson:"created_at" json:"created_at"`
}

type OrderTrendResult struct {
	Date       string  `bson:"_id" json:"date"`
	OrderCount int     `bson:"order_count" json:"order_count"`
	Revenue    float64 `bson:"revenue" json:"revenue"`
}

type PopularItemResult struct {
	Name       string `bson:"_id.name" json:"name"`
	MealType   string `bson:"_id.meal_type" json:"meal_type"`
	OrderCount int    `bson:"order_count" json:"order_count"`
}

type OrderStore struct {
	col *mongo.Collection
}

func (o *OrderStore) Create(ctx context.Context, order *Order) (*Order, error) {
	order.CreatedAt = time.Now()
	result, err := o.col.InsertOne(ctx, order)
	if err != nil {
		return nil, err
	}
	order.ID = result.InsertedID.(bson.ObjectID)
	return order, nil
}

func (o *OrderStore) GetByID(ctx context.Context, id string) (*Order, error) {
	objID, err := bson.ObjectIDFromHex(id)
	if err != nil {
		return nil, err
	}
	var order Order
	err = o.col.FindOne(ctx, bson.M{"_id": objID}).Decode(&order)
	if err != nil {
		return nil, err
	}
	return &order, nil
}

func (o *OrderStore) GetByWeek(ctx context.Context, weekStart string) ([]Order, error) {
	filter := bson.M{"week_start": weekStart}
	opts := options.Find().SetSort(bson.M{"created_at": -1})
	cursor, err := o.col.Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var orders []Order
	if err := cursor.All(ctx, &orders); err != nil {
		return nil, err
	}
	return orders, nil
}

func (o *OrderStore) GetAll(ctx context.Context) ([]Order, error) {
	opts := options.Find().SetSort(bson.M{"created_at": -1})
	cursor, err := o.col.Find(ctx, bson.M{}, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var orders []Order
	if err := cursor.All(ctx, &orders); err != nil {
		return nil, err
	}
	return orders, nil
}

func (o *OrderStore) UpdateStatus(ctx context.Context, id string, status string) error {
	objID, err := bson.ObjectIDFromHex(id)
	if err != nil {
		return err
	}
	_, err = o.col.UpdateOne(ctx, bson.M{"_id": objID}, bson.M{"$set": bson.M{"status": status}})
	return err
}

func (o *OrderStore) UpdateStripeSession(ctx context.Context, id string, sessionID string) error {
	objID, err := bson.ObjectIDFromHex(id)
	if err != nil {
		return err
	}
	_, err = o.col.UpdateOne(ctx, bson.M{"_id": objID}, bson.M{"$set": bson.M{"stripe_session_id": sessionID}})
	return err
}

func (o *OrderStore) GetByStripeSession(ctx context.Context, sessionID string) (*Order, error) {
	var order Order
	err := o.col.FindOne(ctx, bson.M{"stripe_session_id": sessionID}).Decode(&order)
	if err != nil {
		return nil, err
	}
	return &order, nil
}

func (o *OrderStore) GetByCustomer(ctx context.Context, email string) ([]Order, error) {
	filter := bson.M{"customer_email": email}
	opts := options.Find().SetSort(bson.M{"created_at": -1})
	cursor, err := o.col.Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var orders []Order
	if err := cursor.All(ctx, &orders); err != nil {
		return nil, err
	}
	return orders, nil
}

func (o *OrderStore) CountByDateRange(ctx context.Context, from, to time.Time) (int64, error) {
	filter := bson.M{
		"created_at": bson.M{"$gte": from, "$lte": to},
	}
	return o.col.CountDocuments(ctx, filter)
}

func (o *OrderStore) GetRevenueByDateRange(ctx context.Context, from, to time.Time) (float64, error) {
	pipeline := mongo.Pipeline{
		bson.D{{Key: "$match", Value: bson.M{"created_at": bson.M{"$gte": from, "$lte": to}}}},
		bson.D{{Key: "$group", Value: bson.M{"_id": nil, "total_revenue": bson.M{"$sum": "$total_amount"}}}},
	}
	cursor, err := o.col.Aggregate(ctx, pipeline)
	if err != nil {
		return 0, err
	}
	defer cursor.Close(ctx)

	var result []bson.M
	if err := cursor.All(ctx, &result); err != nil {
		return 0, err
	}
	if len(result) == 0 {
		return 0, nil
	}
	if v, ok := result[0]["total_revenue"].(float64); ok {
		return v, nil
	}
	return 0, nil
}

func (o *OrderStore) GetOrderTrends(ctx context.Context, from, to time.Time) ([]OrderTrendResult, error) {
	pipeline := mongo.Pipeline{
		bson.D{{Key: "$match", Value: bson.M{"created_at": bson.M{"$gte": from, "$lte": to}}}},
		bson.D{{Key: "$group", Value: bson.M{
			"_id":         bson.M{"$dateToString": bson.M{"format": "%Y-%m-%d", "date": "$created_at"}},
			"order_count": bson.M{"$sum": 1},
			"revenue":     bson.M{"$sum": "$total_amount"},
		}}},
		bson.D{{Key: "$sort", Value: bson.M{"_id": 1}}},
	}
	cursor, err := o.col.Aggregate(ctx, pipeline)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var trends []OrderTrendResult
	if err := cursor.All(ctx, &trends); err != nil {
		return nil, err
	}
	return trends, nil
}

func (o *OrderStore) GetPopularItems(ctx context.Context, limit int) ([]PopularItemResult, error) {
	pipeline := mongo.Pipeline{
		bson.D{{Key: "$unwind", Value: "$items"}},
		bson.D{{Key: "$group", Value: bson.M{
			"_id":         bson.M{"name": "$items.menu_item_name", "meal_type": "$items.meal_type"},
			"order_count": bson.M{"$sum": 1},
		}}},
		bson.D{{Key: "$sort", Value: bson.M{"order_count": -1}}},
		bson.D{{Key: "$limit", Value: limit}},
	}
	cursor, err := o.col.Aggregate(ctx, pipeline)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var items []PopularItemResult
	if err := cursor.All(ctx, &items); err != nil {
		return nil, err
	}
	return items, nil
}
