"""CLI main — terminal-based outreach tool for previewing and sending emails.

Usage:
    python -m cli.main preview --application-id <id>
    python -m cli.main send --application-id <id>
"""

import argparse
import asyncio
import sys

from app.email_generator import generate_email
from app.preview import render_preview
from app.email_sender import send_email


def cmd_preview(args: argparse.Namespace) -> None:
    """Preview an email in the terminal."""
    preview = render_preview(
        template_type=args.template or "cold",
        job={"title": args.role or "Software Engineer", "company": args.company or "Acme Corp"},
        recipient_name=args.name or "Jane Doe",
        recipient_email=args.email or "jane@example.com",
    )

    print("\n" + "=" * 60)
    print(f"SUBJECT: {preview['subject']}")
    print("=" * 60)
    print(f"TO: {args.name or 'Jane Doe'} <{args.email or 'jane@example.com'}>")
    print("-" * 60)
    print(preview["text"])
    print("-" * 60)
    print(f"Links: {len(preview['links'])}")
    print(f"Est. read time: {preview['estimated_read_time_seconds']}s")
    print("=" * 60)
    print("\n[S]end  [D]raft  [S]kip  [E]dit")
    choice = input("> ").strip().lower()
    if choice == "s":
        cmd_send(args)


def cmd_send(args: argparse.Namespace) -> None:
    """Send an email."""
    email = generate_email(
        template_type=args.template or "cold",
        job={"title": args.role or "Software Engineer", "company": args.company or "Acme Corp"},
        recipient_name=args.name or "Jane Doe",
        recipient_email=args.email or "jane@example.com",
    )

    result = send_email(
        to_email=args.email or "jane@example.com",
        to_name=args.name or "Jane Doe",
        subject=email["subject"],
        body_html=email["body_html"],
        body_text=email["body_text"],
    )

    if result.success:
        print(f"✓ Email sent! Message-ID: {result.message_id}")
    else:
        print(f"✗ Failed: {result.error}")
        sys.exit(1)


def main() -> None:
    parser = argparse.ArgumentParser(description="The Closer — Email Outreach CLI")
    sub = parser.add_subparsers(dest="command", required=True)

    preview_parser = sub.add_parser("preview", help="Preview an email")
    preview_parser.add_argument("--application-id", help="Application ID")
    preview_parser.add_argument("--template", default="cold", choices=["cold", "follow_up"])
    preview_parser.add_argument("--company", default="Acme Corp")
    preview_parser.add_argument("--role", default="Software Engineer")
    preview_parser.add_argument("--name", default="Jane Doe")
    preview_parser.add_argument("--email", default="jane@example.com")

    send_parser = sub.add_parser("send", help="Send an email")
    send_parser.add_argument("--application-id", help="Application ID")
    send_parser.add_argument("--template", default="cold", choices=["cold", "follow_up"])
    send_parser.add_argument("--company", default="Acme Corp")
    send_parser.add_argument("--role", default="Software Engineer")
    send_parser.add_argument("--name", default="Jane Doe")
    send_parser.add_argument("--email", default="jane@example.com")

    args = parser.parse_args()

    if args.command == "preview":
        cmd_preview(args)
    elif args.command == "send":
        cmd_send(args)


if __name__ == "__main__":
    main()