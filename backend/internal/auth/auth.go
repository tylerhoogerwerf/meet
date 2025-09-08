package auth

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"meet-backend/internal/models"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/oauth2"
)

type AuthService struct {
	oauth2Config *oauth2.Config
	issuerURL    string
	jwtSecret    []byte
}

// NewAuthService creates a new authentication service for id.lazentis.com
func NewAuthService(clientID, clientSecret, redirectURL, issuerURL string) *AuthService {
	// Generate a random JWT secret if not provided
	jwtSecret := make([]byte, 32)
	rand.Read(jwtSecret)

	config := &oauth2.Config{
		ClientID:     clientID,
		ClientSecret: clientSecret,
		RedirectURL:  redirectURL,
		Scopes:       []string{"openid", "profile", "email"},
		Endpoint: oauth2.Endpoint{
			AuthURL:  issuerURL + "/auth",
			TokenURL: issuerURL + "/token",
		},
	}

	return &AuthService{
		oauth2Config: config,
		issuerURL:    issuerURL,
		jwtSecret:    jwtSecret,
	}
}

// Login initiates the OAuth2 login flow
func (a *AuthService) Login(c *gin.Context) {
	state := generateRandomString(32)

	// Store state in session/cookie for CSRF protection
	c.SetCookie("oauth_state", state, 600, "/", "", false, true)

	url := a.oauth2Config.AuthCodeURL(state, oauth2.AccessTypeOffline)
	c.Redirect(http.StatusTemporaryRedirect, url)
}

// Callback handles the OAuth2 callback
func (a *AuthService) Callback(c *gin.Context) {
	// Verify state parameter
	storedState, err := c.Cookie("oauth_state")
	if err != nil || storedState != c.Query("state") {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid state parameter"})
		return
	}

	// Clear the state cookie
	c.SetCookie("oauth_state", "", -1, "/", "", false, true)

	// Exchange authorization code for token
	code := c.Query("code")
	token, err := a.oauth2Config.Exchange(context.Background(), code)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to exchange token"})
		return
	}

	// Get user info from the token
	user, err := a.getUserInfo(token.AccessToken)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get user info"})
		return
	}

	// Generate our own JWT token
	jwtToken, expiresAt, err := a.generateJWT(user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	response := models.AuthResponse{
		AccessToken:  jwtToken,
		RefreshToken: token.RefreshToken,
		ExpiresAt:    expiresAt,
		User:         *user,
	}

	c.JSON(http.StatusOK, response)
}

// RefreshToken refreshes the JWT token
func (a *AuthService) RefreshToken(c *gin.Context) {
	var request struct {
		RefreshToken string `json:"refresh_token" binding:"required"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Use the refresh token to get a new access token
	token := &oauth2.Token{
		RefreshToken: request.RefreshToken,
	}

	newToken, err := a.oauth2Config.TokenSource(context.Background(), token).Token()
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid refresh token"})
		return
	}

	// Get updated user info
	user, err := a.getUserInfo(newToken.AccessToken)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get user info"})
		return
	}

	// Generate new JWT token
	jwtToken, expiresAt, err := a.generateJWT(user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	response := models.AuthResponse{
		AccessToken:  jwtToken,
		RefreshToken: newToken.RefreshToken,
		ExpiresAt:    expiresAt,
		User:         *user,
	}

	c.JSON(http.StatusOK, response)
}

// ValidateToken validates a JWT token and returns the user claims
func (a *AuthService) ValidateToken(tokenString string) (*models.TokenClaims, error) {
	// Remove "Bearer " prefix if present
	tokenString = strings.TrimPrefix(tokenString, "Bearer ")

	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return a.jwtSecret, nil
	})

	if err != nil {
		return nil, err
	}

	if claims, ok := token.Claims.(jwt.MapClaims); ok && token.Valid {
		groups := make([]string, 0)
		if groupsInterface, exists := claims["groups"]; exists {
			if groupsSlice, ok := groupsInterface.([]interface{}); ok {
				for _, group := range groupsSlice {
					if groupStr, ok := group.(string); ok {
						groups = append(groups, groupStr)
					}
				}
			}
		}

		return &models.TokenClaims{
			UserID:   claims["user_id"].(string),
			Email:    claims["email"].(string),
			Name:     claims["name"].(string),
			Username: claims["username"].(string),
			Groups:   groups,
			Exp:      int64(claims["exp"].(float64)),
			Iat:      int64(claims["iat"].(float64)),
		}, nil
	}

	return nil, fmt.Errorf("invalid token")
}

// getUserInfo fetches user information from the SSO provider
func (a *AuthService) getUserInfo(accessToken string) (*models.User, error) {
	req, err := http.NewRequest("GET", a.issuerURL+"/userinfo", nil)
	if err != nil {
		return nil, err
	}

	req.Header.Set("Authorization", "Bearer "+accessToken)

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("failed to get user info: %d", resp.StatusCode)
	}

	var userInfo struct {
		Sub      string   `json:"sub"`
		Email    string   `json:"email"`
		Name     string   `json:"name"`
		Username string   `json:"preferred_username"`
		Groups   []string `json:"groups"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&userInfo); err != nil {
		return nil, err
	}

	return &models.User{
		ID:       userInfo.Sub,
		Email:    userInfo.Email,
		Name:     userInfo.Name,
		Username: userInfo.Username,
		Groups:   userInfo.Groups,
	}, nil
}

// generateJWT creates a JWT token for the user
func (a *AuthService) generateJWT(user *models.User) (string, time.Time, error) {
	expiresAt := time.Now().Add(24 * time.Hour)

	claims := jwt.MapClaims{
		"user_id":  user.ID,
		"email":    user.Email,
		"name":     user.Name,
		"username": user.Username,
		"groups":   user.Groups,
		"exp":      expiresAt.Unix(),
		"iat":      time.Now().Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString(a.jwtSecret)
	if err != nil {
		return "", time.Time{}, err
	}

	return tokenString, expiresAt, nil
}

// generateRandomString generates a random string of the specified length
func generateRandomString(length int) string {
	bytes := make([]byte, length)
	rand.Read(bytes)
	return base64.URLEncoding.EncodeToString(bytes)[:length]
}
