using System.Net.Http.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Options;
using Vira.Abstractions.Constants;
using Vira.Abstractions.Settings;
using Vira.Application.Interfaces;

namespace Vira.Application.Services;

/// <summary>
/// TikTok Login Kit + Display API over a pooled <see cref="HttpClient"/> (BaseAddress is the API
/// host, set in ApplicationExtensions). The authorize URL points at www.tiktok.com and is built as
/// an absolute string; token/user.info/video.list are relative calls on the API host.
/// </summary>
public class TikTokClient(HttpClient http, IOptions<TikTokSettings> settings) : ITikTokClient
{
    private const string AuthorizeBase = "https://www.tiktok.com/v2/auth/authorize/";
    private static readonly string Scope = string.Join(",",
        TikTokScopes.UserInfoBasic, TikTokScopes.UserInfoProfile, TikTokScopes.UserInfoStats, TikTokScopes.VideoList);

    private readonly TikTokSettings _settings = settings.Value;

    public string BuildAuthorizeUrl(string state)
    {
        var q = new Dictionary<string, string?>
        {
            ["client_key"] = _settings.ClientKey,
            ["scope"] = Scope,
            ["response_type"] = "code",
            ["redirect_uri"] = _settings.RedirectUri,
            ["state"] = state,
        };
        var query = string.Join("&", q.Select(kv => $"{Uri.EscapeDataString(kv.Key)}={Uri.EscapeDataString(kv.Value ?? string.Empty)}"));
        return $"{AuthorizeBase}?{query}";
    }

    public Task<TikTokTokens> ExchangeCodeAsync(string code, CancellationToken ct = default) =>
        TokenRequestAsync(new Dictionary<string, string>
        {
            ["client_key"] = _settings.ClientKey,
            ["client_secret"] = _settings.ClientSecret,
            ["code"] = code,
            ["grant_type"] = "authorization_code",
            ["redirect_uri"] = _settings.RedirectUri,
        }, ct);

    public Task<TikTokTokens> RefreshAsync(string refreshToken, CancellationToken ct = default) =>
        TokenRequestAsync(new Dictionary<string, string>
        {
            ["client_key"] = _settings.ClientKey,
            ["client_secret"] = _settings.ClientSecret,
            ["grant_type"] = "refresh_token",
            ["refresh_token"] = refreshToken,
        }, ct);

    private async Task<TikTokTokens> TokenRequestAsync(Dictionary<string, string> form, CancellationToken ct)
    {
        using var req = new HttpRequestMessage(HttpMethod.Post, "/v2/oauth/token/")
        {
            Content = new FormUrlEncodedContent(form),
        };
        using var resp = await http.SendAsync(req, ct);
        var body = await resp.Content.ReadFromJsonAsync<TokenResponse>(cancellationToken: ct);
        if (body is null || !string.IsNullOrEmpty(body.Error) || string.IsNullOrEmpty(body.AccessToken))
            throw new InvalidOperationException($"TikTok token request failed: {body?.Error} {body?.ErrorDescription}");

        return new TikTokTokens(
            body.AccessToken!, body.RefreshToken ?? string.Empty, body.OpenId ?? string.Empty,
            body.ExpiresIn, body.Scope ?? string.Empty);
    }

    public async Task<TikTokUserInfo> GetUserInfoAsync(string accessToken, CancellationToken ct = default)
    {
        const string fields = "open_id,display_name,avatar_url,follower_count";
        using var req = new HttpRequestMessage(HttpMethod.Get, $"/v2/user/info/?fields={fields}");
        req.Headers.Add("Authorization", $"Bearer {accessToken}");

        using var resp = await http.SendAsync(req, ct);
        var body = await resp.Content.ReadFromJsonAsync<UserInfoResponse>(cancellationToken: ct);
        var user = body?.Data?.User
            ?? throw new InvalidOperationException($"TikTok user.info failed: {body?.Error?.Message}");

        return new TikTokUserInfo(user.OpenId ?? string.Empty, user.DisplayName ?? string.Empty, user.AvatarUrl, user.FollowerCount);
    }

    public async Task<IReadOnlyList<TikTokVideo>> GetVideosAsync(string accessToken, int maxCount = 20, CancellationToken ct = default)
    {
        const string fields = "id,title,cover_image_url,embed_link,view_count,like_count,comment_count,share_count,create_time";
        using var req = new HttpRequestMessage(HttpMethod.Post, $"/v2/video/list/?fields={fields}")
        {
            // Batch limit is 20 (CLAUDE.md).
            Content = JsonContent.Create(new { max_count = Math.Clamp(maxCount, 1, 20) }),
        };
        req.Headers.Add("Authorization", $"Bearer {accessToken}");

        using var resp = await http.SendAsync(req, ct);
        var body = await resp.Content.ReadFromJsonAsync<VideoListResponse>(cancellationToken: ct);
        if (body?.Error is { Code: not null and not "ok" })
            throw new InvalidOperationException($"TikTok video.list failed: {body.Error.Message}");

        return (body?.Data?.Videos ?? [])
            .Select(v => new TikTokVideo(
                v.Id ?? string.Empty, v.Title, v.CoverImageUrl, v.EmbedLink,
                v.ViewCount, v.LikeCount, v.CommentCount, v.ShareCount,
                DateTimeOffset.FromUnixTimeSeconds(v.CreateTime)))
            .ToList();
    }

    // ── Response shapes ────────────────────────────────────────────────────────────────────────
    private sealed class TokenResponse
    {
        [JsonPropertyName("access_token")] public string? AccessToken { get; set; }
        [JsonPropertyName("refresh_token")] public string? RefreshToken { get; set; }
        [JsonPropertyName("open_id")] public string? OpenId { get; set; }
        [JsonPropertyName("expires_in")] public int ExpiresIn { get; set; }
        [JsonPropertyName("scope")] public string? Scope { get; set; }
        [JsonPropertyName("error")] public string? Error { get; set; }
        [JsonPropertyName("error_description")] public string? ErrorDescription { get; set; }
    }

    private sealed class TikTokError
    {
        [JsonPropertyName("code")] public string? Code { get; set; }
        [JsonPropertyName("message")] public string? Message { get; set; }
    }

    private sealed class UserInfoResponse
    {
        [JsonPropertyName("data")] public UserData? Data { get; set; }
        [JsonPropertyName("error")] public TikTokError? Error { get; set; }
    }

    private sealed class UserData
    {
        [JsonPropertyName("user")] public UserObj? User { get; set; }
    }

    private sealed class UserObj
    {
        [JsonPropertyName("open_id")] public string? OpenId { get; set; }
        [JsonPropertyName("display_name")] public string? DisplayName { get; set; }
        [JsonPropertyName("avatar_url")] public string? AvatarUrl { get; set; }
        [JsonPropertyName("follower_count")] public long FollowerCount { get; set; }
    }

    private sealed class VideoListResponse
    {
        [JsonPropertyName("data")] public VideoData? Data { get; set; }
        [JsonPropertyName("error")] public TikTokError? Error { get; set; }
    }

    private sealed class VideoData
    {
        [JsonPropertyName("videos")] public List<VideoObj>? Videos { get; set; }
    }

    private sealed class VideoObj
    {
        [JsonPropertyName("id")] public string? Id { get; set; }
        [JsonPropertyName("title")] public string? Title { get; set; }
        [JsonPropertyName("cover_image_url")] public string? CoverImageUrl { get; set; }
        [JsonPropertyName("embed_link")] public string? EmbedLink { get; set; }
        [JsonPropertyName("view_count")] public long ViewCount { get; set; }
        [JsonPropertyName("like_count")] public long LikeCount { get; set; }
        [JsonPropertyName("comment_count")] public long CommentCount { get; set; }
        [JsonPropertyName("share_count")] public long ShareCount { get; set; }
        [JsonPropertyName("create_time")] public long CreateTime { get; set; }
    }
}
