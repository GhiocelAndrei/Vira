using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Vira.Abstractions.Constants;
using Vira.Abstractions.DTOs;
using Vira.Api.Auth;
using Vira.Application.Services;

namespace Vira.Api.Controllers;

[ApiController]
[Route("creator")]
[Authorize(Policy = AuthConstants.CreatorPolicy)]
public class CreatorController(ICreatorService creators, IConfiguration config) : ControllerBase
{
    /// <summary>The signed-in creator's real TikTok profile + clips.</summary>
    [HttpGet("profile")]
    public async Task<ActionResult<CreatorProfileDto>> Profile(CancellationToken ct)
    {
        if (User.GetCreatorId() is not Guid creatorId)
            return Forbid();
        var profile = await creators.GetProfileAsync(creatorId, ct);
        return profile is null ? NotFound() : Ok(profile);
    }

    /// <summary>Active campaigns for the creator's feed / marketplace (with match + follower gate).</summary>
    [HttpGet("campaigns")]
    public async Task<ActionResult<IReadOnlyList<FeedCampaignDto>>> Campaigns(CancellationToken ct)
    {
        if (User.GetCreatorId() is not Guid creatorId)
            return Forbid();
        return Ok(await creators.GetFeedAsync(creatorId, ct));
    }

    /// <summary>
    /// Ingest an AI video-analysis for one of a creator's clips. Called service-to-service by the
    /// ai-service, so it is authenticated with a shared <c>X-Service-Key</c> header rather than a
    /// creator session. 404 if the creator has no clip with that TikTok video id.
    /// </summary>
    [HttpPost("{creatorId:guid}/clips/{tikTokVideoId}/analysis")]
    [AllowAnonymous]
    public async Task<IActionResult> IngestAnalysis(
        Guid creatorId,
        string tikTokVideoId,
        [FromBody] ClipAnalysisDto dto,
        [FromHeader(Name = "X-Service-Key")] string? serviceKey,
        CancellationToken ct)
    {
        var expected = config["Service:ApiKey"];
        if (string.IsNullOrEmpty(expected) || serviceKey != expected)
            return Unauthorized();

        var saved = await creators.SaveClipAnalysisAsync(creatorId, tikTokVideoId, dto, ct);
        return saved ? Accepted() : NotFound();
    }
}
