using Vira.Abstractions.Common;

namespace Vira.Abstractions.Models.Creators;

/// <summary>
/// AI-generated creator portrait — the styled, evidence-backed profile the matcher scores a campaign
/// against. Stored with the model/prompt/ontology versions that produced it (CLAUDE.md rule 8) so any
/// past score is reproducible; AI outputs are never regenerable.
///
/// The typed shape mirrors the ai-service output document. Evidence lives per style dimension
/// (<see cref="StyleEvidence"/>) rather than as discrete claims: a dimension the AI could not ground
/// carries an empty clip list plus a low confidence, and the gap is recorded in
/// <see cref="Limitations"/> — an unmeasured dimension is kept distinct from a genuinely low score
/// (CLAUDE.md rule 3). This is dimension-level grounding, not a <c>PortraitClaim</c>.
/// </summary>
public class CreatorPortrait : Entity
{
    public Guid CreatorId { get; set; }   // → Creator.Id (plain FK, per the no-navigation convention)

    /// <summary>The input snapshot this portrait was generated from (<see cref="PortraitRequest"/>).
    /// Traces the output back to its exact inputs. Nullable — a portrait may be generated without a
    /// persisted request.</summary>
    public Guid? RequestId { get; set; }

    /// <summary>Free-text dossier (Romanian) describing the creator's content and positioning.</summary>
    public string NarrativeDossier { get; set; } = string.Empty;

    /// <summary>The 8 scored style dimensions (0–1). Stored as one JSONB column.</summary>
    public StyleVector StyleVector { get; set; } = new();

    /// <summary>Per-dimension grounding — confidence, rationale, and the backing clips. JSONB.</summary>
    public StyleEvidence StyleEvidence { get; set; } = new();

    /// <summary>What the AI could not ground or measure — distinct from a low score (rule 3).</summary>
    public List<string> Limitations { get; set; } = [];

    /// <summary>Overall confidence in the portrait (0–1).</summary>
    public double Confidence { get; set; }

    // Provenance — the versioned config that produced this output (CLAUDE.md rule 8). Inlined as
    // columns, matching ClipAnalysis, so they stay queryable.
    public string AiModel { get; set; } = string.Empty;
    public string PromptVersion { get; set; } = string.Empty;
    public string OntologyVersion { get; set; } = string.Empty;
    public DateTimeOffset GeneratedAt { get; set; }

    /// <summary>Forward-compatible extra fields the ontology may add, stored verbatim as JSONB so a
    /// newer output shape is never silently dropped.</summary>
    public string ExtensionsJson { get; set; } = "{}";
}

/// <summary>
/// Grounding for the 8 style dimensions, mirroring the AI output's <c>styleEvidence</c> object.
/// Symmetric with <see cref="StyleVector"/> — one <see cref="DimensionEvidence"/> per dimension.
/// Stored as one JSONB column.
/// </summary>
public class StyleEvidence
{
    public DimensionEvidence Warmth { get; set; } = new();
    public DimensionEvidence Energy { get; set; } = new();
    public DimensionEvidence Authority { get; set; } = new();
    public DimensionEvidence Refinement { get; set; } = new();
    public DimensionEvidence Convention { get; set; } = new();
    public DimensionEvidence Humor { get; set; } = new();
    public DimensionEvidence Demonstration { get; set; } = new();
    public DimensionEvidence Intimacy { get; set; } = new();
}

/// <summary>
/// The evidence backing a single style-dimension score. <see cref="EvidenceClipIds"/> holds the
/// TikTok video ids the analyzer cited; it may be empty when the dimension could not be grounded, in
/// which case <see cref="Confidence"/> is low and the portrait's limitations record the gap.
/// </summary>
public class DimensionEvidence
{
    public double Confidence { get; set; }
    public string Rationale { get; set; } = string.Empty;
    public List<string> EvidenceClipIds { get; set; } = [];
}
