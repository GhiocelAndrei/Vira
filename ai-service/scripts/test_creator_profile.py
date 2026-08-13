"""Local smoke test for the Creator Profile Generator — calls the /portrait route logic directly,
no server needed. Uses real data for Gabriela Musat (pulled from the DB), including her real gap:
all three clips have a null cover image, so the vision half of the call is genuinely exercised as absent.

Usage:
    export ANTHROPIC_API_KEY=...
    python scripts/test_creator_profile.py
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.models import PortraitRequest  # noqa: E402
from app.routers.portrait import generate_portrait  # noqa: E402

GABRIELA_MUSAT_REQUEST = {
    "creatorId": "4f3b4dae-9595-4c41-bf81-8f8caeb1770a",
    "displayName": "Gabriela Musat",
    "followerCount": 29500,
    "category": "Food",
    "city": "Bucuresti",
    "clips": [
        {
            "tikTokVideoId": "7614653016075013398",
            "coverImageUrl": None,
            "embedLink": "https://www.tiktok.com/@heyitsgabix/video/7614653016075013398",
            "viewCount": 0, "likeCount": 0, "commentCount": 0, "shareCount": 0,
            "tikTokCreateTime": "2026-08-10T20:51:06.119755Z",
        },
        {
            "tikTokVideoId": "7669036284865826070",
            "coverImageUrl": None,
            "embedLink": "https://www.tiktok.com/@heyitsgabix/video/7669036284865826070",
            "viewCount": 0, "likeCount": 0, "commentCount": 0, "shareCount": 0,
            "tikTokCreateTime": "2026-08-10T20:57:44.146303Z",
        },
        {
            "tikTokVideoId": "7668714864650620182",
            "coverImageUrl": None,
            "embedLink": "https://www.tiktok.com/@heyitsgabix/video/7668714864650620182",
            "viewCount": 0, "likeCount": 0, "commentCount": 0, "shareCount": 0,
            "tikTokCreateTime": "2026-08-12T12:00:00Z",
        },
    ],
    "aggregates": {
        "avgViews": 0, "avgLikes": 0, "avgComments": 0, "avgShares": 0, "engagementRate": 0.0,
    },
    # Her CreatorQuestionnaires row (mock intake data seeded into the DB), mirrored here.
    "questionnaire": {
        "preferredCategories": ["Food", "Lifestyle"],
        "excludedCategories": ["Gaming"],
        "acceptsShippedProducts": True,
        "canPurchaseProducts": True,
        "travelWillingness": "SameCounty",
        "goals": ["Ajung la 50.000 de urmăritori", "Parteneriat pe termen lung cu un brand de nutriție"],
        "values": ["Alimentație echilibrată", "Transparență față de comunitate", "Ambalaje sustenabile"],
        "preferredFormats": ["tutorial", "rețetă pas cu pas", "review de produs"],
        "contentLanguages": ["ro", "en"],
        "excludedBrands": ["Băuturi energizante", "Fast-food"],
        "allowsAlcohol": False,
        "allowsGambling": False,
        "allowsPolitical": False,
        "collabCapacityPerMonth": 4,
        "selfDescribedAudience": "Femei de 20-35 de ani din România, interesate de rețete sănătoase, deserturi cu proteine și fitness.",
        "priorSponsorships": [
            {"brandName": "MyProtein", "category": "Food"},
            {"brandName": "Belbake", "category": "Food"},
        ],
    },
    "analyses": [
        {
            "tikTokVideoId": "7614653016075013398",
            "analysis": {
                "topic": {"value": "Food", "confidence": 1.0, "evidence": [{"source": "video", "reference": "0:00-0:05"}]},
                "subtopics": ["High-protein dessert", "Healthy recipe", "Cooking tutorial"],
                "tone": {"value": "Educational", "confidence": 0.9, "evidence": [{"source": "video", "reference": "0:07-0:49"}]},
                "visualStyle": {"value": "Clean", "confidence": 0.8, "evidence": [{"source": "video", "reference": "0:00-0:05"}]},
                "visualDescription": {"value": "Top-down view of hands preparing food in a kitchen, clear focus, text overlays.", "confidence": 1.0, "evidence": [{"source": "video", "reference": "0:07-0:49"}]},
                "audioDescription": {"value": "Romanian narration with background music.", "confidence": 1.0, "evidence": [{"source": "video", "reference": "0:00-1:09"}]},
                "contentFormat": {"value": "Tutorial/How-to", "confidence": 1.0, "evidence": [{"source": "video", "reference": "0:00-1:09"}]},
                "creatorPresence": {"value": "Voice-only", "confidence": 1.0, "evidence": [{"source": "video", "reference": "0:00-1:09"}]},
                "hook": {"value": "Demonstration/result", "confidence": 0.9, "evidence": [{"source": "video", "reference": "0:00-0:04"}]},
                "products": [
                    {"value": "Belbake", "confidence": 0.9, "evidence": [{"source": "video", "reference": "0:13"}]},
                    {"value": "MyProtein", "confidence": 0.9, "evidence": [{"source": "video", "reference": "0:26"}]},
                ],
                "disclosure": {"value": "No disclosure detected", "confidence": 0.9, "evidence": [{"source": "video", "reference": "0:00-1:09"}]},
                "cta": {"value": "Follow", "confidence": 0.9, "evidence": [{"source": "video", "reference": "1:07-1:08"}]},
                "sentiment": {"value": "Positive", "confidence": 0.9, "evidence": [{"source": "video", "reference": "0:00-0:05"}]},
                "brandSafety": {"value": "Safe", "confidence": 1.0, "evidence": [{"source": "video", "reference": "0:00-1:09"}]},
            },
            "aiModel": "gemini-3.1-flash-lite", "promptVersion": "video-analyzer-v6",
            "ontologyVersion": "video-analyzer-ontology-v6", "analyzedAt": "2026-08-10T20:55:31.591898Z",
        },
        {
            "tikTokVideoId": "7669036284865826070",
            "analysis": {
                "topic": {"value": "Food", "confidence": 1.0, "evidence": [{"source": "video", "reference": "0:01-0:03"}]},
                "subtopics": ["Healthy recipes", "Lemon brownies", "Protein dessert"],
                "tone": {"value": "Educational", "confidence": 0.9, "evidence": [{"source": "video", "reference": "0:06-0:30"}]},
                "visualStyle": {"value": "Clean", "confidence": 0.9, "evidence": [{"source": "video", "reference": "0:06-0:30"}]},
                "visualDescription": {"value": "Close-up on a wooden bowl for mixing ingredients and a baking dish. The creator appears", "confidence": 0.9, "evidence": [{"source": "video", "reference": "0:00-0:34"}]},
                "audioDescription": {"value": "Creator speaks in Romanian, narrating the recipe steps. Light background music plays throughout.", "confidence": 0.9, "evidence": [{"source": "video", "reference": "0:00-0:34"}]},
                "contentFormat": {"value": "Tutorial/How-to", "confidence": 0.9, "evidence": [{"source": "video", "reference": "0:06-0:30"}]},
                "creatorPresence": {"value": "On-camera", "confidence": 1.0, "evidence": [{"source": "video", "reference": "0:00"}]},
                "hook": {"value": "Demonstration/result", "confidence": 0.9, "evidence": [{"source": "video", "reference": "0:00-0:02"}]},
                "products": [],
                "disclosure": {"value": "No brand or product present", "confidence": 0.9, "evidence": []},
                "cta": {"value": "Comment", "confidence": 0.9, "evidence": [{"source": "video", "reference": "0:32-0:34"}]},
                "sentiment": {"value": "Positive", "confidence": 0.9, "evidence": [{"source": "video", "reference": "0:01"}]},
                "brandSafety": {"value": "Safe", "confidence": 1.0, "evidence": []},
            },
            "aiModel": "gemini-3.1-flash-lite", "promptVersion": "video-analyzer-v6",
            "ontologyVersion": "video-analyzer-ontology-v6", "analyzedAt": "2026-08-10T20:58:28.576093Z",
        },
        {
            "tikTokVideoId": "7668714864650620182",
            "analysis": {
                "topic": {"value": "Lifestyle", "confidence": 0.8, "evidence": [{"source": "video", "reference": "0:00-0:02"}, {"source": "video", "reference": "0:07"}]},
                "subtopics": ["Digestion", "Health", "Wellness"],
                "tone": {"value": "Educational", "confidence": 0.9, "evidence": [{"source": "video", "reference": "0:00-0:07"}, {"source": "video", "reference": "0:12-0:19"}]},
                "visualStyle": {"value": "Clean", "confidence": 0.9, "evidence": [{"source": "video", "reference": "0:00-0:43"}]},
                "visualDescription": {"value": "Creator talks into camera, interspersed with B-roll of desserts and product packaging shots.", "confidence": 1.0, "evidence": [{"source": "video", "reference": "0:00-0:43"}]},
                "audioDescription": {"value": "Creator speaks Romanian in a clear, consistent pace, background music plays.", "confidence": 1.0, "evidence": [{"source": "video", "reference": "0:00-0:43"}]},
                "contentFormat": {"value": "Voiceover+B-roll", "confidence": 0.9, "evidence": [{"source": "video", "reference": "0:00-0:43"}]},
                "creatorPresence": {"value": "On-camera", "confidence": 1.0, "evidence": [{"source": "video", "reference": "0:00-0:02"}, {"source": "video", "reference": "0:11-0:43"}]},
                "hook": {"value": "Text-on-screen", "confidence": 0.9, "evidence": [{"source": "video", "reference": "0:00-0:03"}]},
                "products": [
                    {"value": "Digenzym Plus", "confidence": 1.0, "evidence": [{"source": "video", "reference": "0:12-0:14"}, {"source": "video", "reference": "0:20"}]},
                ],
                "disclosure": {"value": "No disclosure detected", "confidence": 0.8, "evidence": []},
                "cta": {"value": "None", "confidence": 1.0, "evidence": []},
                "sentiment": {"value": "Positive", "confidence": 0.9, "evidence": [{"source": "video", "reference": "0:12"}, {"source": "video", "reference": "0:35"}]},
                "brandSafety": {"value": "Safe", "confidence": 0.9, "evidence": [{"source": "video", "reference": "0:00-0:43"}]},
            },
            "aiModel": "gemini-3.1-flash-lite", "promptVersion": "video-analyzer-v6",
            "ontologyVersion": "video-analyzer-ontology-v6", "analyzedAt": "2026-08-12T08:43:57.892673Z",
        },
    ],
}


def main() -> None:
    req = PortraitRequest.model_validate(GABRIELA_MUSAT_REQUEST)
    result = generate_portrait(req)
    print(result.model_dump_json(by_alias=True, indent=2))


if __name__ == "__main__":
    main()
