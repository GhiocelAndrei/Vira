using Vira.Abstractions.DTOs;
using Vira.Abstractions.Models.Identity;

namespace Vira.Application.Interfaces;

/// <summary>Resolved session identity used by the auth handler to build the ClaimsPrincipal.</summary>
public record SessionInfo(Guid AccountId, AccountType Type, Guid? BusinessId, Guid? CreatorId);

/// <summary>
/// Authentication (Firebase for brands, TikTok for creators) + server-side sessions. Business logic
/// depends on this; the implementation lives in Application and owns the DbContext + provider calls.
/// </summary>
public interface IAuthService
{
    /// <summary>Verify a Firebase ID token, find-or-create the Business account, and open a session.</summary>
    Task<AuthResultDto> AuthenticateWithFirebaseAsync(string idToken, CancellationToken ct = default);

    /// <summary>Exchange a TikTok auth code: find-or-create the Creator, refresh their profile + clips,
    /// store encrypted tokens, and open a session.</summary>
    Task<AuthResultDto> AuthenticateWithTikTokAsync(string code, CancellationToken ct = default);

    /// <summary>Dev-only shim: open a session for a seeded demo creator/brand without any real OAuth.
    /// The caller (controller) must gate this behind the App:DevAuth:Enabled flag — it is a login bypass.</summary>
    Task<AuthResultDto> DevLoginAsync(AccountType role, CancellationToken ct = default);

    /// <summary>Validate a session (exists + not expired) and return its identity, else null.</summary>
    Task<SessionInfo?> ResolveSessionAsync(Guid sessionId, CancellationToken ct = default);

    Task<MeDto?> GetMeAsync(Guid accountId, CancellationToken ct = default);

    Task LogoutAsync(Guid sessionId, CancellationToken ct = default);
}
