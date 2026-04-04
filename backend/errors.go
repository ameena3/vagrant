package freshkitchen

import "errors"

var (
	// ErrValidation indicates a validation error
	ErrValidation = errors.New("validation error")

	// ErrNotFound indicates a resource was not found
	ErrNotFound = errors.New("resource not found")

	// ErrUnauthorized indicates the request is not authorized
	ErrUnauthorized = errors.New("unauthorized")
)
