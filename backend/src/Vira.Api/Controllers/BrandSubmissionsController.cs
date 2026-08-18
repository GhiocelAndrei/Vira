using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Vira.Abstractions.Constants;
using Vira.Abstractions.DTOs;
using Vira.Api.Auth;
using Vira.Application.Services;

namespace Vira.Api.Controllers;

/// <summary>
/// The brand approval queue: the creator applications (draft clips) awaiting or having received a
/// decision on this business's campaigns. Approval is permission, not distribution — the brand clears
/// a draft so the creator can post it natively on TikTok; Vira never publishes it.
/// </summary>
[ApiController]
[Route("brand/submissions")]
[Authorize(Policy = AuthConstants.BusinessPolicy)]
public class BrandSubmissionsController(ICampaignApplicationService applications) : ControllerBase
{
    /// <summary>Every application to the signed-in business's campaigns (metadata only), newest first.</summary>
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<BrandSubmissionDto>>> List(CancellationToken ct)
    {
        if (User.GetBusinessId() is not Guid businessId)
            return Forbid();
        return Ok(await applications.ListForBrandAsync(businessId, ct));
    }

    /// <summary>
    /// Record the brand's decision on a submission. A rejection must carry a reason and a note so the
    /// creator knows what to change — "no" without a reason is not representable. 404 if the submission
    /// isn't for one of this business's campaigns.
    /// </summary>
    [HttpPost("{applicationId:guid}/decision")]
    public async Task<IActionResult> Decide(Guid applicationId, [FromBody] SubmissionDecisionDto dto, CancellationToken ct)
    {
        if (User.GetBusinessId() is not Guid businessId)
            return Forbid();

        if (!dto.Approve && (dto.RejectionReason is null || string.IsNullOrWhiteSpace(dto.Note)))
            return BadRequest("A rejection needs a reason and a note.");

        var decided = await applications.DecideAsync(
            businessId, applicationId, dto.Approve, dto.RejectionReason, dto.Note?.Trim(), ct);
        return decided ? NoContent() : NotFound();
    }

    /// <summary>Stream the draft video for a submission to one of the business's campaigns. Served inline
    /// (no filename → no attachment disposition) with range processing, so it plays in a <c>&lt;video&gt;</c>
    /// element and seeks.</summary>
    [HttpGet("{applicationId:guid}/draft")]
    public async Task<IActionResult> Draft(Guid applicationId, CancellationToken ct)
    {
        if (User.GetBusinessId() is not Guid businessId)
            return Forbid();
        var draft = await applications.GetDraftForBrandAsync(businessId, applicationId, ct);
        return draft is null ? NotFound() : File(draft.Content, draft.ContentType, enableRangeProcessing: true);
    }
}
