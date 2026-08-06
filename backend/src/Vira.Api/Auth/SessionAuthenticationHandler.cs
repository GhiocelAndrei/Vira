using System.Security.Claims;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Options;
using Vira.Abstractions.Constants;
using Vira.Application.Interfaces;

namespace Vira.Api.Auth;

/// <summary>
/// Validates the <c>vira_session</c> HttpOnly cookie against the server-side session store and
/// builds the ClaimsPrincipal. This is the app's only authentication scheme.
/// </summary>
public class SessionAuthenticationHandler(
    IOptionsMonitor<AuthenticationSchemeOptions> options,
    ILoggerFactory logger,
    UrlEncoder encoder,
    IAuthService auth) : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
{
    protected override async Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        if (!Request.Cookies.TryGetValue(AuthConstants.SessionCookieName, out var raw)
            || !Guid.TryParse(raw, out var sessionId))
            return AuthenticateResult.NoResult();

        var info = await auth.ResolveSessionAsync(sessionId, Context.RequestAborted);
        if (info is null)
            return AuthenticateResult.Fail("Invalid or expired session.");

        var claims = new List<Claim>
        {
            new(AuthConstants.Claims.AccountId, info.AccountId.ToString()),
            new(AuthConstants.Claims.AccountType, info.Type.ToString())
        };
        if (info.BusinessId is Guid businessId)
            claims.Add(new Claim(AuthConstants.Claims.BusinessId, businessId.ToString()));
        if (info.CreatorId is Guid creatorId)
            claims.Add(new Claim(AuthConstants.Claims.CreatorId, creatorId.ToString()));

        var identity = new ClaimsIdentity(claims, Scheme.Name);
        var ticket = new AuthenticationTicket(new ClaimsPrincipal(identity), Scheme.Name);
        return AuthenticateResult.Success(ticket);
    }
}
