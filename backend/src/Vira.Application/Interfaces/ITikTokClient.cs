namespace Vira.Application.Interfaces;

/// <summary>Tokens returned by the TikTok OAuth token endpoint. Refresh token rotates — always persist
/// the newly returned one (CLAUDE.md).</summary>
public record TikTokTokens(string AccessToken, string RefreshToken, string OpenId, int ExpiresIn, string Scope);

/// <summary>Creator profile from <c>/v2/user/info/</c> (needs user.info.profile + user.info.stats).</summary>
public record TikTokUserInfo(string OpenId, string DisplayName, string? AvatarUrl, long FollowerCount);

/// <summary>One clip from <c>/v2/video/list/</c>. The API never returns the video file itself.</summary>
public record TikTokVideo(
    string Id,
    string? Title,
    string? CoverImageUrl,
    string? EmbedLink,
    long ViewCount,
    long LikeCount,
    long CommentCount,
    long ShareCount,
    DateTimeOffset CreateTime);

/// <summary>
/// TikTok Login Kit + Display API (D6). Login Kit for the OAuth handshake; Display API for
/// user.info + video.list. Content Posting API is out of scope; polling/video.query is a later slice.
/// </summary>
public interface ITikTokClient
{
    /// <summary>Build the user-facing authorize redirect URL (Login Kit).</summary>
    string BuildAuthorizeUrl(string state);

    /// <summary>Exchange an authorization code for tokens (grant_type=authorization_code).</summary>
    Task<TikTokTokens> ExchangeCodeAsync(string code, CancellationToken ct = default);

    /// <summary>Refresh an access token (grant_type=refresh_token). The refresh token may rotate.</summary>
    Task<TikTokTokens> RefreshAsync(string refreshToken, CancellationToken ct = default);

    Task<TikTokUserInfo> GetUserInfoAsync(string accessToken, CancellationToken ct = default);

    /// <summary>The creator's recent clips (max 20 per call).</summary>
    Task<IReadOnlyList<TikTokVideo>> GetVideosAsync(string accessToken, int maxCount = 20, CancellationToken ct = default);
}
