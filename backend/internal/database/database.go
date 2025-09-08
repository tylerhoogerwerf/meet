package database

import (
	"fmt"
	"log"
	"os"
	"time"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
	"meet-backend/internal/models"
)

var DB *gorm.DB

// InitDatabase initializes the PostgreSQL database connection
func InitDatabase() error {
	// Get database configuration from environment
	host := os.Getenv("DB_HOST")
	if host == "" {
		host = "localhost"
	}
	
	port := os.Getenv("DB_PORT")
	if port == "" {
		port = "5432"
	}
	
	user := os.Getenv("DB_USER")
	if user == "" {
		user = "postgres"
	}
	
	password := os.Getenv("DB_PASSWORD")
	if password == "" {
		password = "postgres"
	}
	
	dbname := os.Getenv("DB_NAME")
	if dbname == "" {
		dbname = "meet_backend"
	}
	
	sslmode := os.Getenv("DB_SSLMODE")
	if sslmode == "" {
		sslmode = "disable"
	}
	
	// Build connection string
	dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=%s TimeZone=UTC",
		host, user, password, dbname, port, sslmode)
	
	// Configure GORM logger
	gormLogger := logger.Default
	if os.Getenv("GIN_MODE") == "release" {
		gormLogger = logger.Default.LogMode(logger.Silent)
	}
	
	// Connect to database
	var err error
	DB, err = gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: gormLogger,
	})
	
	if err != nil {
		return fmt.Errorf("failed to connect to database: %w", err)
	}
	
	// Configure connection pool
	sqlDB, err := DB.DB()
	if err != nil {
		return fmt.Errorf("failed to get database instance: %w", err)
	}
	
	sqlDB.SetMaxIdleConns(10)
	sqlDB.SetMaxOpenConns(100)
	sqlDB.SetConnMaxLifetime(time.Hour)
	
	log.Println("Database connected successfully")
	
	// Run migrations
	if err := runMigrations(); err != nil {
		return fmt.Errorf("failed to run migrations: %w", err)
	}
	
	// Start cleanup routine
	go startCleanupRoutine()
	
	return nil
}

// runMigrations runs database migrations
func runMigrations() error {
	log.Println("Running database migrations...")
	
	err := DB.AutoMigrate(
		&models.Room{},
		&models.RoomParticipant{},
	)
	
	if err != nil {
		return fmt.Errorf("migration failed: %w", err)
	}
	
	log.Println("Database migrations completed successfully")
	return nil
}

// startCleanupRoutine starts a background routine to clean up expired rooms
func startCleanupRoutine() {
	ticker := time.NewTicker(5 * time.Minute) // Check every 5 minutes
	defer ticker.Stop()
	
	for {
		select {
		case <-ticker.C:
			cleanupExpiredRooms()
		}
	}
}

// cleanupExpiredRooms removes expired rooms and their participants
func cleanupExpiredRooms() {
	log.Println("Running expired rooms cleanup...")
	
	// Find expired rooms
	var expiredRooms []models.Room
	result := DB.Where("expires_at IS NOT NULL AND expires_at < ? AND is_active = ?", 
		time.Now(), true).Find(&expiredRooms)
	
	if result.Error != nil {
		log.Printf("Error finding expired rooms: %v", result.Error)
		return
	}
	
	if len(expiredRooms) == 0 {
		return
	}
	
	log.Printf("Found %d expired rooms to cleanup", len(expiredRooms))
	
	// Mark rooms as inactive and remove participants
	for _, room := range expiredRooms {
		// Mark room as inactive
		DB.Model(&room).Update("is_active", false)
		
		// Mark participants as left
		now := time.Now()
		DB.Model(&models.RoomParticipant{}).
			Where("room_id = ? AND left_at IS NULL", room.ID).
			Update("left_at", now)
		
		log.Printf("Cleaned up expired room: %s", room.Name)
	}
}

// GetDatabase returns the database instance
func GetDatabase() *gorm.DB {
	return DB
}

// HealthCheck checks if the database is healthy
func HealthCheck() error {
	sqlDB, err := DB.DB()
	if err != nil {
		return err
	}
	
	return sqlDB.Ping()
}
