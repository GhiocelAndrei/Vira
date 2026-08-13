"""Local smoke test for BackendClient — calls the .NET backend's /creators API directly.

Usage:
    export VIRA_BACKEND_URL=https://vira-backend.lemonfield-d6638dd6.westeurope.azurecontainerapps.io
    python scripts/test_backend_client.py                # fetch_all() against every creator
    python scripts/test_backend_client.py Food            # filter to one category first
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.backend_client import BackendClient  # noqa: E402


def main() -> None:
    category = sys.argv[1] if len(sys.argv) > 1 else None

    with BackendClient() as client:
        print("health:", client.health())

        creators = client.fetch_all(category)
        print(f"\nfetched {len(creators)} creator(s){f' in {category}' if category else ''}")
        for c in creators[:5]:
            print(f"  {c.display_name:<22} {c.category.value:<10} "
                  f"{c.follower_count:>9,} followers  {len(c.clips)} clips  "
                  f"ER={c.aggregates.engagement_rate:.3f}  {c.city}")

        if creators:
            target = creators[0]
            print(f"\nget_creator({target.creator_id}): {target.display_name}")

            print(f"generate_portrait({target.creator_id}):")
            print(client.generate_portrait(target.creator_id))


if __name__ == "__main__":
    main()
