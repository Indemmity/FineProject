"""CLI preview — colorized terminal output for email previews.

Usage:
    python -m cli.preview --subject "..." --body "..."
"""

import argparse


def print_preview(
    subject: str,
    recipient: str,
    body: str,
    max_body_lines: int = 20,
) -> None:
    """Print a colorized email preview to the terminal."""
    print("\n" + "=" * 60)
    print(f"\033[1mSUBJECT:\033[0m {subject}")
    print(f"\033[1mTO:\033[0m {recipient}")
    print("-" * 60)

    lines = body.strip().split("\n")
    truncated = lines[:max_body_lines]
    for line in truncated:
        print(line)

    if len(lines) > max_body_lines:
        print(f"\033[33m... ({len(lines) - max_body_lines} more lines)\033[0m")

    print("=" * 60)


def main() -> None:
    parser = argparse.ArgumentParser(description="CLI Email Preview")
    parser.add_argument("--subject", required=True, help="Email subject")
    parser.add_argument("--recipient", default="Jane Doe", help="Recipient name")
    parser.add_argument("--body", required=True, help="Email body text")

    args = parser.parse_args()
    print_preview(args.subject, args.recipient, args.body)


if __name__ == "__main__":
    main()