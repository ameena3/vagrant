package services

import (
	"context"
	"time"

	"freshkitchen/store"
)

type AnalyticsSummary struct {
	TotalOrders     int64   `json:"total_orders"`
	TotalRevenue    float64 `json:"total_revenue"`
	TotalCustomers  int64   `json:"total_customers"`
	OrdersThisWeek  int64   `json:"orders_this_week"`
	RevenueThisWeek float64 `json:"revenue_this_week"`
}

type AnalyticsService struct {
	store *store.Store
}

func NewAnalyticsService(s *store.Store) *AnalyticsService {
	return &AnalyticsService{store: s}
}

func (s *AnalyticsService) Summary(ctx context.Context) (*AnalyticsSummary, error) {
	now := time.Now()
	// Find start of current week (Sunday)
	weekday := now.Weekday()
	weekStart := now.AddDate(0, 0, -int(weekday))
	weekStart = time.Date(weekStart.Year(), weekStart.Month(), weekStart.Day(), 0, 0, 0, 0, time.UTC)
	weekEnd := weekStart.AddDate(0, 0, 7)

	epoch := time.Date(2020, 1, 1, 0, 0, 0, 0, time.UTC)
	future := time.Date(2030, 1, 1, 0, 0, 0, 0, time.UTC)

	totalOrders, _ := s.store.Order.CountByDateRange(ctx, epoch, future)
	totalRevenue, _ := s.store.Order.GetRevenueByDateRange(ctx, epoch, future)
	totalCustomers, _ := s.store.User.CountCustomers(ctx)
	ordersThisWeek, _ := s.store.Order.CountByDateRange(ctx, weekStart, weekEnd)
	revenueThisWeek, _ := s.store.Order.GetRevenueByDateRange(ctx, weekStart, weekEnd)

	return &AnalyticsSummary{
		TotalOrders:     totalOrders,
		TotalRevenue:    totalRevenue,
		TotalCustomers:  totalCustomers,
		OrdersThisWeek:  ordersThisWeek,
		RevenueThisWeek: revenueThisWeek,
	}, nil
}

func (s *AnalyticsService) OrderTrends(ctx context.Context, from, to string) ([]store.OrderTrendResult, error) {
	fromTime, _ := time.Parse("2006-01-02", from)
	toTime, _ := time.Parse("2006-01-02", to)
	if toTime.IsZero() {
		toTime = time.Now()
	}
	if fromTime.IsZero() {
		fromTime = toTime.AddDate(0, 0, -30)
	}
	return s.store.Order.GetOrderTrends(ctx, fromTime, toTime)
}

func (s *AnalyticsService) PopularItems(ctx context.Context) ([]store.PopularItemResult, error) {
	return s.store.Order.GetPopularItems(ctx, 10)
}
