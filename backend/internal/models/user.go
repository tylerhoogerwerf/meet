package models

import "time"

// User represents a user from the SSO system
type User struct {
	ID       string   `json:"id"`
	Email    string   `json:"email"`
	Name     string   `json:"name"`
	Username string   `json:"username"`
	Groups   []string `json:"groups"`
}

// TokenClaims represents JWT token claims
type TokenClaims struct {
	UserID   string   `json:"user_id"`
	Email    string   `json:"email"`
	Name     string   `json:"name"`
	Username string   `json:"username"`
	Groups   []string `json:"groups"`
	Exp      int64    `json:"exp"`
	Iat      int64    `json:"iat"`
}

// AuthResponse represents the response after successful authentication
type AuthResponse struct {
	AccessToken  string    `json:"access_token"`
	RefreshToken string    `json:"refresh_token"`
	ExpiresAt    time.Time `json:"expires_at"`
	User         User      `json:"user"`
}

// RoomTokenRequest represents a request for a room token
type RoomTokenRequest struct {
	RoomName     string `json:"room_name" binding:"required"`
	Identity     string `json:"identity"`
	Name         string `json:"name"`
	CanPublish   bool   `json:"can_publish"`
	CanSubscribe bool   `json:"can_subscribe"`
	CanRecord    bool   `json:"can_record"`
}
