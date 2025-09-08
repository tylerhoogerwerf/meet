package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"meet-backend/internal/services"
)

type RoomManagementHandler struct {
	roomService *services.RoomService
}

func NewRoomManagementHandler() *RoomManagementHandler {
	return &RoomManagementHandler{
		roomService: services.NewRoomService(),
	}
}

// CreateRoom creates a new room
func (rmh *RoomManagementHandler) CreateRoom(c *gin.Context) {
	var request struct {
		Name string `json:"name" binding:"required"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Check if user is authenticated
	var userID *string
	if userIDValue, exists := c.Get("user_id"); exists {
		if uid, ok := userIDValue.(string); ok {
			userID = &uid
		}
	}

	// Create room
	room, err := rmh.roomService.CreateRoom(request.Name, userID)
	if err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
		return
	}

	response := gin.H{
		"room_id":        room.ID,
		"name":          room.Name,
		"created_at":    room.CreatedAt,
		"expires_at":    room.ExpiresAt,
		"max_duration":  room.MaxDuration,
		"is_guest_room": room.CreatedBy == nil,
	}

	if room.ExpiresAt != nil {
		response["time_remaining"] = room.TimeRemaining()
	}

	c.JSON(http.StatusCreated, response)
}

// GetRoom retrieves room information
func (rmh *RoomManagementHandler) GetRoom(c *gin.Context) {
	roomName := c.Param("roomName")
	if roomName == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Room name is required"})
		return
	}

	room, err := rmh.roomService.GetRoom(roomName)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	// Get room statistics
	stats, err := rmh.roomService.GetRoomStats(room.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get room stats"})
		return
	}

	c.JSON(http.StatusOK, stats)
}

// JoinRoom handles participant joining a room
func (rmh *RoomManagementHandler) JoinRoom(c *gin.Context) {
	roomName := c.Param("roomName")
	if roomName == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Room name is required"})
		return
	}

	var request struct {
		Identity string `json:"identity" binding:"required"`
		Name     string `json:"name" binding:"required"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get room
	room, err := rmh.roomService.GetRoom(roomName)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	// Check if user is authenticated
	var userID *string
	isGuest := true
	if userIDValue, exists := c.Get("user_id"); exists {
		if uid, ok := userIDValue.(string); ok {
			userID = &uid
			isGuest = false
		}
	}

	// Add participant
	participant, err := rmh.roomService.AddParticipant(room.ID, userID, request.Identity, request.Name, isGuest)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	response := gin.H{
		"participant_id": participant.ID,
		"room_id":       room.ID,
		"identity":      participant.Identity,
		"name":          participant.Name,
		"joined_at":     participant.JoinedAt,
		"is_guest":      participant.IsGuest,
	}

	if room.ExpiresAt != nil {
		response["room_expires_at"] = room.ExpiresAt
		response["time_remaining"] = room.TimeRemaining()
	}

	c.JSON(http.StatusOK, response)
}

// LeaveRoom handles participant leaving a room
func (rmh *RoomManagementHandler) LeaveRoom(c *gin.Context) {
	roomName := c.Param("roomName")
	identity := c.Param("identity")

	if roomName == "" || identity == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Room name and identity are required"})
		return
	}

	// Get room
	room, err := rmh.roomService.GetRoom(roomName)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	// Remove participant
	if err := rmh.roomService.RemoveParticipant(room.ID, identity); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Left room successfully"})
}

// GetRoomParticipants gets all active participants in a room
func (rmh *RoomManagementHandler) GetRoomParticipants(c *gin.Context) {
	roomName := c.Param("roomName")
	if roomName == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Room name is required"})
		return
	}

	// Get room
	room, err := rmh.roomService.GetRoom(roomName)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	// Get participants
	participants, err := rmh.roomService.GetActiveParticipants(room.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"room_id":      room.ID,
		"room_name":    room.Name,
		"participants": participants,
		"count":        len(participants),
	})
}

// ExtendRoom extends the expiration time for guest rooms
func (rmh *RoomManagementHandler) ExtendRoom(c *gin.Context) {
	roomName := c.Param("roomName")
	if roomName == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Room name is required"})
		return
	}

	var request struct {
		AdditionalMinutes int `json:"additional_minutes" binding:"required,min=1,max=60"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get room
	room, err := rmh.roomService.GetRoom(roomName)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	// Only allow extension for guest rooms
	if room.CreatedBy != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "Cannot extend authenticated user rooms"})
		return
	}

	// Extend room
	if err := rmh.roomService.ExtendRoom(room.ID, request.AdditionalMinutes); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get updated room info
	updatedRoom, _ := rmh.roomService.GetRoomByID(room.ID)
	
	c.JSON(http.StatusOK, gin.H{
		"message":        "Room extended successfully",
		"expires_at":     updatedRoom.ExpiresAt,
		"time_remaining": updatedRoom.TimeRemaining(),
	})
}

// DeactivateRoom deactivates a room (admin only)
func (rmh *RoomManagementHandler) DeactivateRoom(c *gin.Context) {
	roomName := c.Param("roomName")
	if roomName == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Room name is required"})
		return
	}

	// Get room
	room, err := rmh.roomService.GetRoom(roomName)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	// Deactivate room
	if err := rmh.roomService.DeactivateRoom(room.ID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Room deactivated successfully"})
}

// GetRoomStats returns detailed room statistics
func (rmh *RoomManagementHandler) GetRoomStats(c *gin.Context) {
	roomName := c.Param("roomName")
	if roomName == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Room name is required"})
		return
	}

	// Get room
	room, err := rmh.roomService.GetRoom(roomName)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	// Get statistics
	stats, err := rmh.roomService.GetRoomStats(room.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, stats)
}
