package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Room represents a meeting room with time limits
type Room struct {
	ID          uuid.UUID      `json:"id" gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	Name        string         `json:"name" gorm:"uniqueIndex;not null"`
	CreatedBy   *string        `json:"created_by,omitempty"` // nil for guest users
	CreatedAt   time.Time      `json:"created_at"`
	ExpiresAt   *time.Time     `json:"expires_at,omitempty"` // nil for authenticated users (no limit)
	IsActive    bool           `json:"is_active" gorm:"default:true"`
	MaxDuration *int           `json:"max_duration,omitempty"` // in minutes, nil for unlimited
	DeletedAt   gorm.DeletedAt `json:"-" gorm:"index"`
}

// RoomParticipant tracks who joined a room
type RoomParticipant struct {
	ID           uuid.UUID      `json:"id" gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	RoomID       uuid.UUID      `json:"room_id" gorm:"type:uuid;not null"`
	Room         Room           `json:"room" gorm:"foreignKey:RoomID"`
	UserID       *string        `json:"user_id,omitempty"` // nil for guest users
	Identity     string         `json:"identity" gorm:"not null"`
	Name         string         `json:"name" gorm:"not null"`
	JoinedAt     time.Time      `json:"joined_at"`
	LeftAt       *time.Time     `json:"left_at,omitempty"`
	IsGuest      bool           `json:"is_guest" gorm:"default:false"`
	DeletedAt    gorm.DeletedAt `json:"-" gorm:"index"`
}

// BeforeCreate sets default values
func (r *Room) BeforeCreate(tx *gorm.DB) error {
	if r.ID == uuid.Nil {
		r.ID = uuid.New()
	}
	return nil
}

func (rp *RoomParticipant) BeforeCreate(tx *gorm.DB) error {
	if rp.ID == uuid.Nil {
		rp.ID = uuid.New()
	}
	return nil
}

// IsExpired checks if the room has expired
func (r *Room) IsExpired() bool {
	if r.ExpiresAt == nil {
		return false // No expiration for authenticated users
	}
	return time.Now().After(*r.ExpiresAt)
}

// TimeRemaining returns the remaining time in minutes
func (r *Room) TimeRemaining() int {
	if r.ExpiresAt == nil {
		return -1 // Unlimited
	}
	
	remaining := time.Until(*r.ExpiresAt)
	if remaining <= 0 {
		return 0
	}
	
	return int(remaining.Minutes())
}

// CreateGuestRoom creates a room with 30-minute limit for guests
func CreateGuestRoom(name string) *Room {
	expiresAt := time.Now().Add(30 * time.Minute)
	maxDuration := 30
	
	return &Room{
		Name:        name,
		CreatedBy:   nil, // Guest user
		ExpiresAt:   &expiresAt,
		MaxDuration: &maxDuration,
		IsActive:    true,
	}
}

// CreateAuthenticatedRoom creates a room without time limits for authenticated users
func CreateAuthenticatedRoom(name, userID string) *Room {
	return &Room{
		Name:        name,
		CreatedBy:   &userID,
		ExpiresAt:   nil, // No expiration
		MaxDuration: nil, // Unlimited
		IsActive:    true,
	}
}
