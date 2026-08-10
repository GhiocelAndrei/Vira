using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Vira.Abstractions.Constants;
using Vira.Abstractions.DTOs;
using Vira.Abstractions.Models.Identity;
using Vira.Api.Auth;
using Vira.Application.Interfaces;

namespace Vira.Api.Controllers;

public record FirebaseLoginRequest(string IdToken);

[ApiController]
[Route("auth")]
public class AuthController(
    IAuthService auth,
    IWebHostEnvironment env,
    ITikTokClient tiktok,
    IConfiguration config) : ControllerBase
{
    private const string StateCookie = "vira_oauth_state";

    /// <summary>Exchange a Firebase ID token for a session cookie (register or login).</summary>
    [HttpPost("firebase")]
    [AllowAnonymous]
    public async Task<ActionResult<MeDto>> Firebase([FromBody] FirebaseLoginRequest body, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(body.IdToken))
            return BadRequest("idToken is required.");

        AuthResultDto result;
        try
        {
            result = await auth.AuthenticateWithFirebaseAsync(body.IdToken, ct);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            return Unauthorized("Firebase token verification failed.");
        }

        Response.Cookies.Append(AuthConstants.SessionCookieName, result.SessionId.ToString(), CookieOptions(result.ExpiresAt));
        return Ok(result.Me);
    }

    /// <summary>Start the TikTok Login Kit flow: set a CSRF state cookie and redirect to TikTok.</summary>
    [HttpGet("tiktok/start")]
    [AllowAnonymous]
    public IActionResult TikTokStart()
    {
        var state = Guid.NewGuid().ToString("N");
        Response.Cookies.Append(StateCookie, state, StateCookieOptions(DateTimeOffset.UtcNow.AddMinutes(10)));
        return Redirect(tiktok.BuildAuthorizeUrl(state));
    }

    /// <summary>TikTok redirects here with the auth code. Exchange it, set the session cookie, and
    /// send the browser back to the SPA. Top-level redirect → the session cookie is first-party here.</summary>
    [HttpGet("tiktok/callback")]
    [AllowAnonymous]
    public async Task<IActionResult> TikTokCallback(
        [FromQuery] string? code, [FromQuery] string? state, [FromQuery] string? error, CancellationToken ct)
    {
        var web = WebBaseUrl();
        Request.Cookies.TryGetValue(StateCookie, out var expectedState);
        Response.Cookies.Delete(StateCookie, StateCookieOptions(DateTimeOffset.UnixEpoch));

        if (!string.IsNullOrEmpty(error))
            return Redirect($"{web}/intra/creator?error={Uri.EscapeDataString(error)}");
        if (string.IsNullOrEmpty(code) || string.IsNullOrEmpty(state) || state != expectedState)
            return Redirect($"{web}/intra/creator?error=invalid_state");

        try
        {
            var result = await auth.AuthenticateWithTikTokAsync(code, ct);
            Response.Cookies.Append(AuthConstants.SessionCookieName, result.SessionId.ToString(), CookieOptions(result.ExpiresAt));
            return Redirect($"{web}/feed");
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            return Redirect($"{web}/intra/creator?error=auth_failed");
        }
    }

    /// <summary>Dev-only login shim: open a session for a seeded demo creator/brand without any real
    /// OAuth. Returns 404 unless App:DevAuth:Enabled is true, so it's inert on a real prod backend.</summary>
    [HttpPost("dev/login")]
    [AllowAnonymous]
    public async Task<ActionResult<MeDto>> DevLogin([FromQuery] string role, CancellationToken ct)
    {
        if (!config.GetValue<bool>("App:DevAuth:Enabled"))
            return NotFound();

        var accountType = string.Equals(role, "brand", StringComparison.OrdinalIgnoreCase)
            ? AccountType.Business
            : AccountType.Creator;

        var result = await auth.DevLoginAsync(accountType, ct);
        Response.Cookies.Append(AuthConstants.SessionCookieName, result.SessionId.ToString(), CookieOptions(result.ExpiresAt));
        return Ok(result.Me);
    }

    /// <summary>The current account, resolved from the session cookie.</summary>
    [HttpGet("me")]
    [Authorize]
    public async Task<ActionResult<MeDto>> Me(CancellationToken ct)
    {
        var me = await auth.GetMeAsync(User.GetAccountId(), ct);
        return me is null ? Unauthorized() : Ok(me);
    }

    /// <summary>Clear the session (server-side + cookie).</summary>
    [HttpPost("logout")]
    [AllowAnonymous]
    public async Task<IActionResult> Logout(CancellationToken ct)
    {
        if (Request.Cookies.TryGetValue(AuthConstants.SessionCookieName, out var raw) && Guid.TryParse(raw, out var sid))
            await auth.LogoutAsync(sid, ct);

        Response.Cookies.Delete(AuthConstants.SessionCookieName, CookieOptions(DateTimeOffset.UnixEpoch));
        return NoContent();
    }

    // Cross-site (Vercel ↔ Azure) needs SameSite=None + Secure. Local http dev is same-site across
    // localhost ports, so Lax + non-secure lets the cookie set over plain http.
    private CookieOptions CookieOptions(DateTimeOffset expires) => new()
    {
        HttpOnly = true,
        IsEssential = true,
        Path = "/",
        Expires = expires,
        Secure = !env.IsDevelopment(),
        SameSite = env.IsDevelopment() ? SameSiteMode.Lax : SameSiteMode.None
    };

    // The OAuth state cookie only needs to survive the top-level redirect back from TikTok, so Lax
    // is correct (and works cross-site on a top-level GET navigation).
    private CookieOptions StateCookieOptions(DateTimeOffset expires) => new()
    {
        HttpOnly = true,
        IsEssential = true,
        Path = "/",
        Expires = expires,
        Secure = !env.IsDevelopment(),
        SameSite = SameSiteMode.Lax
    };

    private string WebBaseUrl() =>
        config["App:WebBaseUrl"]
        ?? config.GetSection("App:AllowedOrigins").Get<string[]>()?.FirstOrDefault()
        ?? "http://localhost:5173";
}
