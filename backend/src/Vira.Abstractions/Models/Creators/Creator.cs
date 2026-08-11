using Vira.Abstractions.Common;

namespace Vira.Abstractions.Models.Creators;

public class Creator : Entity
{
    public Guid AccountId { get; set; }
    public string DisplayName { get; set; } = string.Empty;
    public long FollowerCount { get; set; }   // from user.info.stats — drives the campaign gate
    public string? Niche { get; set; }
    public string? AvatarUrl { get; set; }    // from user.info — profile header

    // Self-reported at onboarding (TikTok's API doesn't expose it). Drives location-based
    // campaign feasibility: County is matched against a campaign's location scope.
    public string? City { get; set; }
    public string? County { get; set; }

    /// <summary>True once the creator has done the one-time onboarding clip selection. Until then the
    /// app shows the selection panel; after it, login refreshes metrics instead of re-fetching the pool.</summary>
    public bool ClipsSelected { get; set; }
}

/// <summary>TikTok OAuth tokens (encrypted at rest). Refreshed by a background service before 24h expiry.</summary>
public class TikTokConnection : Entity
{
    public Guid CreatorId { get; set; }
    public string OpenId { get; set; } = string.Empty;
    public string AccessTokenEncrypted { get; set; } = string.Empty;
    public string RefreshTokenEncrypted { get; set; } = string.Empty;
    public DateTimeOffset ExpiresAt { get; set; }
    public string Scopes { get; set; } = string.Empty;
}

/// <summary>A clip cached from the Display API <c>video.list</c> (fetch-live-on-login + cache, D4).</summary>
public class CreatorClip : Entity
{
    public Guid CreatorId { get; set; }
    public string TikTokVideoId { get; set; } = string.Empty;
    public string? Title { get; set; }
    public string? CoverImageUrl { get; set; }   // fed to Opus vision for the portrait
    public string? EmbedLink { get; set; }       // how we render it (we don't host it)
    public long ViewCount { get; set; }
    public long LikeCount { get; set; }
    public long CommentCount { get; set; }
    public long ShareCount { get; set; }
    public DateTimeOffset TikTokCreateTime { get; set; }
}
