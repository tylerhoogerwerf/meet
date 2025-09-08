package handlers

import (
	"fmt"
	"net/http"
	"time"

	"meet-backend/internal/models"

	"github.com/gin-gonic/gin"
	"github.com/livekit/protocol/auth"
	"github.com/livekit/protocol/livekit"
	lksdk "github.com/livekit/server-sdk-go/v2"
)

type RoomHandler struct {
	roomClient   *lksdk.RoomServiceClient
	egressClient *lksdk.EgressClient
	apiKey       string
	apiSecret    string
	serverURL    string
}

// NewRoomHandler creates a new room handler
func NewRoomHandler(apiKey, apiSecret, serverURL string) *RoomHandler {
	roomClient := lksdk.NewRoomServiceClient(serverURL, apiKey, apiSecret)
	egressClient := lksdk.NewEgressClient(serverURL, apiKey, apiSecret)

	return &RoomHandler{
		roomClient:   roomClient,
		egressClient: egressClient,
		apiKey:       apiKey,
		apiSecret:    apiSecret,
		serverURL:    serverURL,
	}
}

// GenerateToken generates a LiveKit access token for a room
func (h *RoomHandler) GenerateToken(c *gin.Context) {
	roomName := c.Param("roomName")
	if roomName == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Room name is required"})
		return
	}

	var request models.RoomTokenRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get user info from context
	userID, _ := c.Get("user_id")
	userName, _ := c.Get("user_name")
	userEmail, _ := c.Get("user_email")

	// Use provided identity or generate from user info
	identity := request.Identity
	if identity == "" {
		identity = fmt.Sprintf("%s", userID)
	}

	// Use provided name or user's name
	participantName := request.Name
	if participantName == "" {
		participantName = fmt.Sprintf("%s", userName)
	}

	// Create access token
	at := auth.NewAccessToken(h.apiKey, h.apiSecret)
	grant := &auth.VideoGrant{
		RoomJoin:     true,
		Room:         roomName,
		CanPublish:   &request.CanPublish,
		CanSubscribe: &request.CanSubscribe,
	}

	// Add recording permission if requested and user has admin rights
	if request.CanRecord {
		userGroups, _ := c.Get("user_groups")
		if groups, ok := userGroups.([]string); ok {
			hasRecordingAccess := false
			for _, group := range groups {
				if group == "admin" || group == "meet-admin" || group == "recording" {
					hasRecordingAccess = true
					break
				}
			}
			if hasRecordingAccess {
				grant.CanPublishData = &request.CanRecord
			}
		}
	}

	at.AddGrant(grant).
		SetIdentity(identity).
		SetName(participantName).
		SetValidFor(time.Hour * 6) // Token valid for 6 hours

	// Add metadata with user info
	metadata := fmt.Sprintf(`{"user_id":"%s","email":"%s"}`, userID, userEmail)
	at.SetMetadata(metadata)

	token, err := at.ToJWT()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	response := gin.H{
		"token":      token,
		"server_url": h.serverURL,
		"room_name":  roomName,
		"identity":   identity,
		"name":       participantName,
	}

	c.JSON(http.StatusOK, response)
}

// GetParticipants returns the list of participants in a room
func (h *RoomHandler) GetParticipants(c *gin.Context) {
	roomName := c.Param("roomName")
	if roomName == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Room name is required"})
		return
	}

	participants, err := h.roomClient.ListParticipants(c.Request.Context(), &livekit.ListParticipantsRequest{
		Room: roomName,
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get participants"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"participants": participants.Participants,
		"count":        len(participants.Participants),
	})
}

// RemoveParticipant removes a participant from a room
func (h *RoomHandler) RemoveParticipant(c *gin.Context) {
	roomName := c.Param("roomName")
	participantID := c.Param("participantId")

	if roomName == "" || participantID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Room name and participant ID are required"})
		return
	}

	// Check if user has admin rights
	userGroups, _ := c.Get("user_groups")
	hasAdminAccess := false
	if groups, ok := userGroups.([]string); ok {
		for _, group := range groups {
			if group == "admin" || group == "meet-admin" {
				hasAdminAccess = true
				break
			}
		}
	}

	if !hasAdminAccess {
		c.JSON(http.StatusForbidden, gin.H{"error": "Admin access required"})
		return
	}

	_, err := h.roomClient.RemoveParticipant(c.Request.Context(), &livekit.RoomParticipantIdentity{
		Room:     roomName,
		Identity: participantID,
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to remove participant"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Participant removed successfully"})
}

// StartRecording starts recording a room
func (h *RoomHandler) StartRecording(c *gin.Context) {
	roomName := c.Param("roomName")
	if roomName == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Room name is required"})
		return
	}

	// Check if user has recording rights
	userGroups, _ := c.Get("user_groups")
	hasRecordingAccess := false
	if groups, ok := userGroups.([]string); ok {
		for _, group := range groups {
			if group == "admin" || group == "meet-admin" || group == "recording" {
				hasRecordingAccess = true
				break
			}
		}
	}

	if !hasRecordingAccess {
		c.JSON(http.StatusForbidden, gin.H{"error": "Recording access required"})
		return
	}

	// Check if recording is already active
	egresses, err := h.egressClient.ListEgress(c.Request.Context(), &livekit.ListEgressRequest{
		RoomName: roomName,
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to check existing recordings"})
		return
	}

	// Check for active recordings
	for _, egress := range egresses.Items {
		if egress.Status == livekit.EgressStatus_EGRESS_STARTING || egress.Status == livekit.EgressStatus_EGRESS_ACTIVE {
			c.JSON(http.StatusConflict, gin.H{"error": "Recording already in progress"})
			return
		}
	}

	// Start room composite recording
	request := &livekit.RoomCompositeEgressRequest{
		RoomName: roomName,
		Layout:   "speaker-light",
		Output: &livekit.RoomCompositeEgressRequest_File{
			File: &livekit.EncodedFileOutput{
				Filepath: fmt.Sprintf("%s-%d.mp4", roomName, time.Now().Unix()),
			},
		},
	}

	info, err := h.egressClient.StartRoomCompositeEgress(c.Request.Context(), request)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to start recording"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":    "Recording started successfully",
		"egress_id":  info.EgressId,
		"status":     info.Status.String(),
		"started_at": info.StartedAt,
	})
}

// StopRecording stops recording a room
func (h *RoomHandler) StopRecording(c *gin.Context) {
	roomName := c.Param("roomName")
	if roomName == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Room name is required"})
		return
	}

	// Check if user has recording rights
	userGroups, _ := c.Get("user_groups")
	hasRecordingAccess := false
	if groups, ok := userGroups.([]string); ok {
		for _, group := range groups {
			if group == "admin" || group == "meet-admin" || group == "recording" {
				hasRecordingAccess = true
				break
			}
		}
	}

	if !hasRecordingAccess {
		c.JSON(http.StatusForbidden, gin.H{"error": "Recording access required"})
		return
	}

	// Find active recordings
	egresses, err := h.egressClient.ListEgress(c.Request.Context(), &livekit.ListEgressRequest{
		RoomName: roomName,
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to check existing recordings"})
		return
	}

	var activeEgressID string
	for _, egress := range egresses.Items {
		if egress.Status == livekit.EgressStatus_EGRESS_STARTING || egress.Status == livekit.EgressStatus_EGRESS_ACTIVE {
			activeEgressID = egress.EgressId
			break
		}
	}

	if activeEgressID == "" {
		c.JSON(http.StatusNotFound, gin.H{"error": "No active recording found"})
		return
	}

	// Stop the recording
	info, err := h.egressClient.StopEgress(c.Request.Context(), &livekit.StopEgressRequest{
		EgressId: activeEgressID,
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to stop recording"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":   "Recording stopped successfully",
		"egress_id": info.EgressId,
		"status":    info.Status.String(),
		"ended_at":  info.EndedAt,
	})
}
