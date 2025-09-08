package middleware

import (
	"net/http"
	"strings"

	"meet-backend/internal/auth"

	"github.com/gin-gonic/gin"
)

// AuthRequired middleware validates JWT tokens
func AuthRequired(authService *auth.AuthService) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization header required"})
			c.Abort()
			return
		}

		// Extract token from "Bearer <token>"
		tokenString := strings.TrimPrefix(authHeader, "Bearer ")
		if tokenString == authHeader {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid authorization header format"})
			c.Abort()
			return
		}

		// Validate token
		claims, err := authService.ValidateToken(tokenString)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
			c.Abort()
			return
		}

		// Store user claims in context
		c.Set("user_id", claims.UserID)
		c.Set("user_email", claims.Email)
		c.Set("user_name", claims.Name)
		c.Set("user_username", claims.Username)
		c.Set("user_groups", claims.Groups)

		c.Next()
	}
}

// AdminRequired middleware checks if user has admin privileges
func AdminRequired() gin.HandlerFunc {
	return func(c *gin.Context) {
		groups, exists := c.Get("user_groups")
		if !exists {
			c.JSON(http.StatusForbidden, gin.H{"error": "User groups not found"})
			c.Abort()
			return
		}

		userGroups, ok := groups.([]string)
		if !ok {
			c.JSON(http.StatusForbidden, gin.H{"error": "Invalid user groups"})
			c.Abort()
			return
		}

		// Check if user has admin group
		hasAdminAccess := false
		for _, group := range userGroups {
			if group == "admin" || group == "meet-admin" {
				hasAdminAccess = true
				break
			}
		}

		if !hasAdminAccess {
			c.JSON(http.StatusForbidden, gin.H{"error": "Admin access required"})
			c.Abort()
			return
		}

		c.Next()
	}
}
