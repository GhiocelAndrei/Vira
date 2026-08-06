using Vira.Abstractions.Common;

namespace Vira.Abstractions.Models.Creators;

/// <summary>
/// An AI video-analysis result for a single clip (<see cref="ClipId"/> → <see cref="CreatorClip"/>).
/// Append-only: a clip can be re-analysed and each result is kept, stamped with the model, prompt,
/// and ontology versions that produced it (CLAUDE.md rule 8) — AI outputs are never regenerable.
///
/// The analysis body is stored verbatim as a JSONB document (<see cref="AnalysisJson"/>) rather than
/// modelled into columns: the ontology is versioned config that evolves, so we keep the AI output
/// exactly as produced instead of a hand-maintained mirror that could silently drop new fields. The
/// authored shape lives with the analyzer (ai-service Pydantic models); the DB treats it as opaque.
/// </summary>
public class ClipAnalysis : Entity
{
    public Guid ClipId { get; set; }   // → CreatorClip.Id (plain FK, per the no-navigation convention)
    public string AiModel { get; set; } = string.Empty;
    public string PromptVersion { get; set; } = string.Empty;
    public string OntologyVersion { get; set; } = string.Empty;
    public DateTimeOffset AnalyzedAt { get; set; }

    /// <summary>The scored analysis, stored verbatim as one JSONB document (opaque to the backend).</summary>
    public string AnalysisJson { get; set; } = "{}";
}
