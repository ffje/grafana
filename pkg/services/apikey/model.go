package apikey

import (
	"errors"
	"time"

	"github.com/grafana/grafana/pkg/services/org"
	"github.com/grafana/grafana/pkg/services/user"
)

var (
	ErrNotFound          = errors.New("API key not found")
	ErrInvalid           = errors.New("invalid API key")
	ErrInvalidExpiration = errors.New("negative value for SecondsToLive")
	ErrDuplicate         = errors.New("API key, organization ID and name must be unique")
)

type APIKey struct {
	Id               int64
	OrgId            int64
	Name             string
	Key              string
	Role             org.RoleType
	Created          time.Time
	Updated          time.Time
	LastUsedAt       *time.Time `xorm:"last_used_at"`
	Expires          *int64
	ServiceAccountId *int64
	IsRevoked        *bool `xorm:"is_revoked"`
}

func (k APIKey) TableName() string { return "api_key" }

// swagger:model
type AddCommand struct {
	Name             string       `json:"name" binding:"Required"`
	Role             org.RoleType `json:"role" binding:"Required"`
	OrgId            int64        `json:"-"`
	Key              string       `json:"-"`
	SecondsToLive    int64        `json:"secondsToLive"`
	ServiceAccountID *int64       `json:"-"`

	Result *APIKey `json:"-"`
}

type DeleteCommand struct {
	Id    int64 `json:"id"`
	OrgId int64 `json:"-"`
}

type GetApiKeysQuery struct {
	OrgId          int64
	IncludeExpired bool
	User           *user.SignedInUser
	Result         []*APIKey
}
type GetByNameQuery struct {
	KeyName string
	OrgId   int64
	Result  *APIKey
}

type GetByIDQuery struct {
	ApiKeyId int64
	Result   *APIKey
}
