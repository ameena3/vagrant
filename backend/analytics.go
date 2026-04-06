package freshkitchen

import (
	"context"
	"time"

	analytics "freshkitchen/gen/analytics"
	"freshkitchen/store"

	"goa.design/clue/log"
)

// analytics service implementation.
type analyticssrvc struct {
	store *store.Store
}

// NewAnalytics returns the analytics service implementation.
func NewAnalytics(s *store.Store) analytics.Service {
	return &analyticssrvc{store: s}
}

// Get analytics summary
func (s *analyticssrvc) Summary(ctx context.Context, p *analytics.SummaryPayload) (res *analytics.AnalyticsSummary, err error) {
	log.Printf(ctx, "analytics.summary")

	// Get total orders
	allOrders, err := s.store.Order.GetAll(ctx)
	if err != nil {
		log.Printf(ctx, "Error fetching all orders: %v", err)
		return nil, err
	}

	totalOrders := len(allOrders)

	// Get total revenue
	totalRevenue, err := s.store.Order.GetRevenueByDateRange(
		ctx,
		time.Unix(0, 0),
		time.Now().AddDate(100, 0, 0), // Far future
	)
	if err != nil {
		log.Printf(ctx, "Error calculating total revenue: %v", err)
		return nil, err
	}

	// Get total customers
	totalCustomers, err := s.store.User.CountCustomers(ctx)
	if err != nil {
		log.Printf(ctx, "Error counting customers: %v", err)
		return nil, err
	}

	// Get this week's orders and revenue
	now := time.Now()
	weekStart := time.Date(now.Year(), now.Month(), now.Day()-int(now.Weekday()), 0, 0, 0, 0, now.Location())

	ordersThisWeek, err := s.store.Order.CountByDateRange(ctx, weekStart, now)
	if err != nil {
		log.Printf(ctx, "Error counting this week's orders: %v", err)
		return nil, err
	}

	revenueThisWeek, err := s.store.Order.GetRevenueByDateRange(ctx, weekStart, now)
	if err != nil {
		log.Printf(ctx, "Error calculating this week's revenue: %v", err)
		return nil, err
	}

	t := int(totalOrders)
	tc := int(totalCustomers)
	otw := int(ordersThisWeek)

	res = &analytics.AnalyticsSummary{
		TotalOrders:     &t,
		TotalRevenue:    &totalRevenue,
		TotalCustomers:  &tc,
		OrdersThisWeek:  &otw,
		RevenueThisWeek: &revenueThisWeek,
	}

	return res, nil
}

// Get order trends for a date range
func (s *analyticssrvc) OrderTrends(ctx context.Context, p *analytics.OrderTrendsPayload) (res []*analytics.OrderTrend, err error) {
	log.Printf(ctx, "analytics.orderTrends")

	// Parse date range
	var fromTime, toTime time.Time

	if p.From != nil && *p.From != "" {
		t, err := time.Parse("2006-01-02", *p.From)
		if err != nil {
			log.Printf(ctx, "Error parsing from date: %v", err)
			return nil, err
		}
		fromTime = t
	} else {
		// Default to 30 days ago
		fromTime = time.Now().AddDate(0, 0, -30)
	}

	if p.To != nil && *p.To != "" {
		t, err := time.Parse("2006-01-02", *p.To)
		if err != nil {
			log.Printf(ctx, "Error parsing to date: %v", err)
			return nil, err
		}
		toTime = t.AddDate(0, 0, 2) // +2 days to cover UTC offset (users in UTC-N create orders past midnight UTC)
	} else {
		toTime = time.Now()
	}

	trends, err := s.store.Order.GetOrderTrends(ctx, fromTime, toTime)
	if err != nil {
		log.Printf(ctx, "Error fetching order trends: %v", err)
		return nil, err
	}

	res = make([]*analytics.OrderTrend, len(trends))
	for i, trend := range trends {
		res[i] = convertStoreOrderTrendToGoaOrderTrend(&trend)
	}

	return res, nil
}

// Get most popular menu items
func (s *analyticssrvc) PopularItems(ctx context.Context, p *analytics.PopularItemsPayload) (res []*analytics.PopularItem, err error) {
	log.Printf(ctx, "analytics.popularItems")

	items, err := s.store.Order.GetPopularItems(ctx, 10)
	if err != nil {
		log.Printf(ctx, "Error fetching popular items: %v", err)
		return nil, err
	}

	res = make([]*analytics.PopularItem, len(items))
	for i, item := range items {
		res[i] = convertStorePopularItemToGoaPopularItem(&item)
	}

	return res, nil
}

// Helper functions

func convertStoreOrderTrendToGoaOrderTrend(trend *store.OrderTrendResult) *analytics.OrderTrend {
	if trend == nil {
		return nil
	}

	orderCount := trend.OrderCount
	return &analytics.OrderTrend{
		Date:       &trend.Date,
		OrderCount: &orderCount,
		Revenue:    &trend.Revenue,
	}
}

func convertStorePopularItemToGoaPopularItem(item *store.PopularItemResult) *analytics.PopularItem {
	if item == nil {
		return nil
	}

	orderCount := item.OrderCount
	return &analytics.PopularItem{
		Name:       &item.ID.Name,
		MealType:   &item.ID.MealType,
		OrderCount: &orderCount,
	}
}
