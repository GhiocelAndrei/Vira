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
public class CreatorController(
    ICreatorService creators,
    ICampaignApplicationService applications,
    IConfiguration config) : ControllerBase
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
    /// Persist the signed-in creator's onboarding clip selection: keep only the chosen clips
    /// (1..10, each picked from the clips we fetched on login) and discard the rest.
    /// </summary>
    [HttpPost("clips/selection")]
    public async Task<ActionResult<IReadOnlyList<ClipDto>>> SelectClips(
        [FromBody] ClipSelectionRequestDto body, CancellationToken ct)
    {
        if (User.GetCreatorId() is not Guid creatorId)
            return Forbid();

        var ids = (body.TikTokVideoIds ?? [])
            .Where(s => !string.IsNullOrWhiteSpace(s))
            .Distinct()
            .ToList();

        if (ids.Count == 0)
            return BadRequest("Select at least one clip.");
        if (ids.Count > CreatorService.MaxSelectedClips)
            return BadRequest($"Select at most {CreatorService.MaxSelectedClips} clips.");

        var result = await creators.SelectClipsAsync(creatorId, ids, ct);
        if (!result.CreatorFound)
            return NotFound();
        if (result.UnknownVideoIds.Count > 0)
            return BadRequest($"These clips aren't yours: {string.Join(", ", result.UnknownVideoIds)}");

        return Ok(result.Selected);
    }

    /// <summary>
    /// Apply to a campaign by uploading a draft video (multipart: <c>draft</c> file + optional
    /// <c>note</c>). The brand reviews the draft before the creator posts natively on TikTok. Idempotent
    /// per (creator, campaign) — re-submitting replaces the draft. 404 if the campaign isn't an active
    /// one, 403 if the creator is below a product-placement campaign's follower gate.
    /// </summary>
    [HttpPost("campaigns/{campaignId:guid}/applications")]
    [RequestSizeLimit(CampaignApplicationService.MaxDraftBytes + 1_048_576)]      // + 1 MB headroom for form framing
    [RequestFormLimits(MultipartBodyLengthLimit = CampaignApplicationService.MaxDraftBytes + 1_048_576)]
    public async Task<ActionResult<CampaignApplicationDto>> Apply(
        Guid campaignId,
        IFormFile draft,
        [FromForm] string? note,
        CancellationToken ct)
    {
        if (User.GetCreatorId() is not Guid creatorId)
            return Forbid();

        if (draft is null || draft.Length == 0)
            return BadRequest("Attach a draft video.");
        if (draft.Length > CampaignApplicationService.MaxDraftBytes)
            return BadRequest($"Draft exceeds the {CampaignApplicationService.MaxDraftMb} MB limit.");
        if (!CampaignApplicationService.AcceptedContentTypes.Contains(draft.ContentType))
            return BadRequest("Draft must be an MP4 or MOV video.");

        using var stream = new MemoryStream();
        await draft.CopyToAsync(stream, ct);
        var upload = new DraftUpload(stream.ToArray(), draft.FileName, draft.ContentType, draft.Length);

        var result = await applications.CreateAsync(creatorId, campaignId, upload, note ?? string.Empty, ct);
        return result.Outcome switch
        {
            ApplicationOutcome.CampaignNotFound => NotFound(),
            ApplicationOutcome.Locked => StatusCode(
                StatusCodes.Status403Forbidden, "You are below the follower threshold for this campaign."),
            _ => Ok(result.Application),
        };
    }

    /// <summary>The signed-in creator's campaign applications (metadata only), newest first.</summary>
    [HttpGet("applications")]
    public async Task<ActionResult<IReadOnlyList<CampaignApplicationDto>>> Applications(CancellationToken ct)
    {
        if (User.GetCreatorId() is not Guid creatorId)
            return Forbid();
        return Ok(await applications.ListForCreatorAsync(creatorId, ct));
    }

    /// <summary>Download the draft video for one of the signed-in creator's own applications.</summary>
    [HttpGet("applications/{applicationId:guid}/draft")]
    public async Task<IActionResult> Draft(Guid applicationId, CancellationToken ct)
    {
        if (User.GetCreatorId() is not Guid creatorId)
            return Forbid();
        var draft = await applications.GetDraftAsync(creatorId, applicationId, ct);
        return draft is null ? NotFound() : File(draft.Content, draft.ContentType, draft.FileName);
    }

    /// <summary>Save the signed-in creator's onboarding questionnaire (matching preferences + intent).</summary>
    [HttpPost("questionnaire")]
    public async Task<IActionResult> SaveQuestionnaire([FromBody] QuestionnaireDto dto, CancellationToken ct)
    {
        if (User.GetCreatorId() is not Guid creatorId)
            return Forbid();
        return await creators.SaveQuestionnaireAsync(creatorId, dto, ct) ? NoContent() : NotFound();
    }

    /// <summary>Dev-only: reset the signed-in creator's onboarding (clip selection + questionnaire) so
    /// the guided flow runs again. 404 unless App:DevAuth:Enabled is true — inert on a real prod backend.</summary>
    [HttpPost("dev/reset-onboarding")]
    public async Task<IActionResult> ResetOnboarding(CancellationToken ct)
    {
        if (!config.GetValue<bool>("App:DevAuth:Enabled"))
            return NotFound();
        if (User.GetCreatorId() is not Guid creatorId)
            return Forbid();
        return await creators.ResetOnboardingAsync(creatorId, ct) ? NoContent() : NotFound();
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
