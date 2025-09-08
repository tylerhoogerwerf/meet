package services

import (
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"meet-backend/internal/database"
	"meet-backend/internal/models"
)

type RoomService struct {
	db *gorm.DB
}

func NewRoomService() *RoomService {
	return &RoomService{
		db: database.GetDatabase(),
	}
}

// CreateRoom creates a new room (guest or authenticated)
func (rs *RoomService) CreateRoom(name string, userID *string) (*models.Room, error) {
	// Check if room already exists
	var existingRoom models.Room
	result := rs.db.Where("name = ? AND is_active = ?", name, true).First(&existingRoom)
	
	if result.Error == nil {
		// Room exists and is active
		if existingRoom.IsExpired() {
			// Room expired, mark as inactive
			rs.db.Model(&existingRoom).Update("is_active", false)
		} else {
			return nil, fmt.Errorf("room '%s' already exists and is active", name)
		}
	}
	
	// Create new room
	var room *models.Room
	if userID == nil {
		// Guest room with 30-minute limit
		room = models.CreateGuestRoom(name)
	} else {
		// Authenticated room without limit
		room = models.CreateAuthenticatedRoom(name, *userID)
	}
	
	if err := rs.db.Create(room).Error; err != nil {
		return nil, fmt.Errorf("failed to create room: %w", err)
	}
	
	return room, nil
}

// GetRoom retrieves a room by name
func (rs *RoomService) GetRoom(name string) (*models.Room, error) {
	var room models.Room
	result := rs.db.Where("name = ? AND is_active = ?", name, true).First(&room)
	
	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("room '%s' not found", name)
		}
		return nil, fmt.Errorf("failed to get room: %w", result.Error)
	}
	
	// Check if room is expired
	if room.IsExpired() {
		// Mark as inactive
		rs.db.Model(&room).Update("is_active", false)
		return nil, fmt.Errorf("room '%s' has expired", name)
	}
	
	return &room, nil
}

// GetRoomByID retrieves a room by ID
func (rs *RoomService) GetRoomByID(id uuid.UUID) (*models.Room, error) {
	var room models.Room
	result := rs.db.Where("id = ? AND is_active = ?", id, true).First(&room)
	
	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("room not found")
		}
		return nil, fmt.Errorf("failed to get room: %w", result.Error)
	}
	
	return &room, nil
}

// AddParticipant adds a participant to a room
func (rs *RoomService) AddParticipant(roomID uuid.UUID, userID *string, identity, name string, isGuest bool) (*models.RoomParticipant, error) {
	// Check if participant already exists and is active
	var existingParticipant models.RoomParticipant
	result := rs.db.Where("room_id = ? AND identity = ? AND left_at IS NULL", roomID, identity).First(&existingParticipant)
	
	if result.Error == nil {
		// Participant already in room
		return &existingParticipant, nil
	}
	
	// Create new participant
	participant := &models.RoomParticipant{
		RoomID:   roomID,
		UserID:   userID,
		Identity: identity,
		Name:     name,
		JoinedAt: time.Now(),
		IsGuest:  isGuest,
	}
	
	if err := rs.db.Create(participant).Error; err != nil {
		return nil, fmt.Errorf("failed to add participant: %w", err)
	}
	
	return participant, nil
}

// RemoveParticipant marks a participant as left
func (rs *RoomService) RemoveParticipant(roomID uuid.UUID, identity string) error {
	now := time.Now()
	result := rs.db.Model(&models.RoomParticipant{}).
		Where("room_id = ? AND identity = ? AND left_at IS NULL", roomID, identity).
		Update("left_at", now)
	
	if result.Error != nil {
		return fmt.Errorf("failed to remove participant: %w", result.Error)
	}
	
	if result.RowsAffected == 0 {
		return fmt.Errorf("participant not found in room")
	}
	
	return nil
}

// GetActiveParticipants gets all active participants in a room
func (rs *RoomService) GetActiveParticipants(roomID uuid.UUID) ([]models.RoomParticipant, error) {
	var participants []models.RoomParticipant
	result := rs.db.Where("room_id = ? AND left_at IS NULL", roomID).Find(&participants)
	
	if result.Error != nil {
		return nil, fmt.Errorf("failed to get participants: %w", result.Error)
	}
	
	return participants, nil
}

// ExtendRoom extends the expiration time for a room (only for guest rooms)
func (rs *RoomService) ExtendRoom(roomID uuid.UUID, additionalMinutes int) error {
	var room models.Room
	result := rs.db.Where("id = ? AND is_active = ?", roomID, true).First(&room)
	
	if result.Error != nil {
		return fmt.Errorf("room not found: %w", result.Error)
	}
	
	// Only extend guest rooms
	if room.ExpiresAt == nil {
		return fmt.Errorf("cannot extend authenticated user rooms")
	}
	
	// Extend expiration time
	newExpiresAt := room.ExpiresAt.Add(time.Duration(additionalMinutes) * time.Minute)
	result = rs.db.Model(&room).Update("expires_at", newExpiresAt)
	
	if result.Error != nil {
		return fmt.Errorf("failed to extend room: %w", result.Error)
	}
	
	return nil
}

// DeactivateRoom marks a room as inactive
func (rs *RoomService) DeactivateRoom(roomID uuid.UUID) error {
	// Mark room as inactive
	result := rs.db.Model(&models.Room{}).Where("id = ?", roomID).Update("is_active", false)
	if result.Error != nil {
		return fmt.Errorf("failed to deactivate room: %w", result.Error)
	}
	
	// Mark all participants as left
	now := time.Now()
	rs.db.Model(&models.RoomParticipant{}).
		Where("room_id = ? AND left_at IS NULL", roomID).
		Update("left_at", now)
	
	return nil
}

// GetRoomStats returns statistics about a room
func (rs *RoomService) GetRoomStats(roomID uuid.UUID) (map[string]interface{}, error) {
	var room models.Room
	if err := rs.db.Where("id = ?", roomID).First(&room).Error; err != nil {
		return nil, fmt.Errorf("room not found: %w", err)
	}
	
	// Count active participants
	var activeCount int64
	rs.db.Model(&models.RoomParticipant{}).
		Where("room_id = ? AND left_at IS NULL", roomID).
		Count(&activeCount)
	
	// Count total participants (ever joined)
	var totalCount int64
	rs.db.Model(&models.RoomParticipant{}).
		Where("room_id = ?", roomID).
		Count(&totalCount)
	
	stats := map[string]interface{}{
		"room_id":              room.ID,
		"room_name":            room.Name,
		"created_at":           room.CreatedAt,
		"expires_at":           room.ExpiresAt,
		"time_remaining":       room.TimeRemaining(),
		"is_guest_room":        room.CreatedBy == nil,
		"active_participants":  activeCount,
		"total_participants":   totalCount,
		"is_active":           room.IsActive,
		"is_expired":          room.IsExpired(),
	}
	
	return stats, nil
}
