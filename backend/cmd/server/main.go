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
		c.JSON(200, gin.H{"status": "ok"})
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

	// Auth routes
	auth := r.Group("/auth")
	{
		auth.GET("/login", authService.Login)
		auth.GET("/callback", authService.Callback)
		auth.POST("/refresh", authService.RefreshToken)
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
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Server starting on port %s", port)
	r.Run(":" + port)
}
