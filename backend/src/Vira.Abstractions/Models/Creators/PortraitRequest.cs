using Vira.Abstractions.Common;

namespace Vira.Abstractions.Models.Creators;

/// <summary>
/// A point-in-time snapshot of the exact payload POSTed to the ai-service to generate a
/// <see cref="CreatorPortrait"/>. Persisted as one verbatim JSONB document because the inputs are a
/// heterogeneous merge (creator profile + clip metrics + aggregates + questionnaire + per-clip
/// analyses) whose sources drift over time — metrics update, the questionnaire is edited, clips are
/// re-analysed. Keeping the request exactly as sent makes a generated portrait reproducible and
/// auditable (CLAUDE.md rule 8) without re-deriving inputs that may since have moved.
/// </summary>
public class PortraitRequest : Entity
{
    public Guid CreatorId { get; set; }   // → Creator.Id (plain FK, per the no-navigation convention)

    /// <summary>The assembled <see cref="DTOs.PortraitRequestDto"/> exactly as sent, stored verbatim.</summary>
    public string RequestJson { get; set; } = "{}";
}
