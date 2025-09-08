package main

import (
	"log"
	"os"

	"meet-backend/internal/auth"
	"meet-backend/internal/database"
	"meet-backend/internal/handlers"
	"meet-backend/internal/middleware"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using system environment variables")
	}

	// Initialize database
	if err := database.InitDatabase(); err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}

	// Initialize router
	r := gin.Default()

	// CORS middleware
	r.Use(middleware.CORS())

	// Health check endpoint
	r.GET("/health", func(c *gin.Context) {
		// Check database health
		if err := database.HealthCheck(); err != nil {
			c.JSON(500, gin.H{"status": "error", "database": "unhealthy"})
			return
		}
		c.JSON(200, gin.H{"status": "ok", "database": "healthy"})
	})

	// Initialize auth service
	authService := auth.NewAuthService(
		os.Getenv("SSO_CLIENT_ID"),
		os.Getenv("SSO_CLIENT_SECRET"),
		os.Getenv("SSO_REDIRECT_URL"),
		os.Getenv("SSO_ISSUER_URL"),
	)

	// Initialize handlers
	roomHandler := handlers.NewRoomHandler(
		os.Getenv("LIVEKIT_API_KEY"),
		os.Getenv("LIVEKIT_API_SECRET"),
		os.Getenv("LIVEKIT_URL"),
	)
	roomManagementHandler := handlers.NewRoomManagementHandler()

	// Auth routes
	auth := r.Group("/auth")
	{
		auth.GET("/login", authService.Login)
		auth.GET("/callback", authService.Callback)
		auth.POST("/refresh", authService.RefreshToken)
	}

	// Public room management routes (for guest access)
	publicRooms := r.Group("/api/public/rooms")
	{
		publicRooms.POST("/", roomManagementHandler.CreateRoom)                               // Create room (guest or auth)
		publicRooms.GET("/:roomName", roomManagementHandler.GetRoom)                          // Get room info
		publicRooms.POST("/:roomName/join", roomManagementHandler.JoinRoom)                   // Join room
		publicRooms.POST("/:roomName/leave/:identity", roomManagementHandler.LeaveRoom)       // Leave room
		publicRooms.GET("/:roomName/participants", roomManagementHandler.GetRoomParticipants) // Get participants
	}

	// Protected API routes
	api := r.Group("/api")
	api.Use(middleware.AuthRequired(authService))
	{
		api.POST("/rooms/:roomName/token", roomHandler.GenerateToken)
		api.GET("/rooms/:roomName/participants", roomHandler.GetParticipants)
		api.DELETE("/rooms/:roomName/participants/:participantId", roomHandler.RemoveParticipant)
		api.POST("/rooms/:roomName/recording/start", roomHandler.StartRecording)
		api.POST("/rooms/:roomName/recording/stop", roomHandler.StopRecording)

		// Room management for authenticated users
		api.POST("/rooms/:roomName/extend", roomManagementHandler.ExtendRoom) // Extend guest room
		api.DELETE("/rooms/:roomName", roomManagementHandler.DeactivateRoom)  // Deactivate room
		api.GET("/rooms/:roomName/stats", roomManagementHandler.GetRoomStats) // Room statistics
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Server starting on port %s", port)
	r.Run(":" + port)
}
