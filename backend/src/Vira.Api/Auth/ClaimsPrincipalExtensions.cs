using System.Security.Claims;
using Vira.Abstractions.Constants;

namespace Vira.Api.Auth;

public static class ClaimsPrincipalExtensions
{
    public static Guid GetAccountId(this ClaimsPrincipal user) =>
        Guid.Parse(user.FindFirstValue(AuthConstants.Claims.AccountId)!);

    /// <summary>The business id for a Business account, or null.</summary>
    public static Guid? GetBusinessId(this ClaimsPrincipal user) =>
        Guid.TryParse(user.FindFirstValue(AuthConstants.Claims.BusinessId), out var id) ? id : null;

    /// <summary>The creator id for a Creator account, or null.</summary>
    public static Guid? GetCreatorId(this ClaimsPrincipal user) =>
        Guid.TryParse(user.FindFirstValue(AuthConstants.Claims.CreatorId), out var id) ? id : null;
}
