"""Mock raw job listings for reproducible tests."""

from app.adapters.base import RawJobListing


REMOTEOK_LISTINGS = [
    RawJobListing(
        source="remoteok",
        source_id="rok-test-001",
        title="Senior Software Engineer",
        company="TechCorp",
        location="Remote",
        description="We are looking for a Senior Software Engineer to join our platform team. "
                    "You will work on building scalable microservices using Python and Go.",
        description_html="<p>Senior Software Engineer position at TechCorp</p>",
        salary_range="$150k - $200k",
        job_type="full-time",
        remote=True,
        experience_level="senior",
        posted_date="2024-03-15",
        url="https://remoteok.com/jobs/senior-software-engineer-techcorp",
        raw_data={"id": "test-001", "company": "TechCorp"},
    ),
    RawJobListing(
        source="remoteok",
        source_id="rok-test-002",
        title="Data Scientist",
        company="DataFlow AI",
        location="Remote",
        description="Apply machine learning to solve complex business problems using Python and TensorFlow.",
        description_html="<p>Data Scientist at DataFlow AI</p>",
        salary_range="$130k - $170k",
        job_type="full-time",
        remote=True,
        experience_level="mid",
        posted_date="2024-03-20",
        url="https://remoteok.com/jobs/data-scientist-dataflow",
        raw_data={"id": "test-002", "company": "DataFlow AI"},
    ),
    RawJobListing(
        source="remoteok",
        source_id="rok-test-003",
        title="Product Manager",
        company="StartupXYZ",
        location="Remote",
        description="Define product strategy and roadmap for our B2B SaaS platform.",
        description_html="<p>Product Manager at StartupXYZ</p>",
        salary_range="$120k - $160k",
        job_type="full-time",
        remote=True,
        experience_level="mid",
        posted_date="2024-03-18",
        url="https://remoteok.com/jobs/product-manager-startupxyz",
        raw_data={"id": "test-003", "company": "StartupXYZ"},
    ),
]

NAUKRI_LISTINGS = [
    RawJobListing(
        source="naukri",
        source_id="nkr-test-001",
        title="Senior Software Engineer",
        company="TechCorp India",
        location="Bangalore",
        description="Senior Software Engineer role at TechCorp India office. "
                    "Full stack development with React and Node.js.",
        description_html="<div>Senior Software Engineer at TechCorp India</div>",
        salary_range="₹25L - ₹35L",
        job_type="full-time",
        remote=False,
        experience_level="senior",
        posted_date="2024-03-14",
        url="https://naukri.com/jobs/senior-software-engineer-techcorp-india",
        raw_data={"keyword": "Software Engineer"},
    ),
    RawJobListing(
        source="naukri",
        source_id="nkr-test-002",
        title="React Developer",
        company="WebStudio",
        location="Mumbai",
        description="Frontend developer with React expertise. Build responsive web applications.",
        description_html="<div>React Developer at WebStudio</div>",
        salary_range="₹12L - ₹18L",
        job_type="full-time",
        remote=True,
        experience_level="mid",
        posted_date="2024-03-10",
        url="https://naukri.com/jobs/react-developer-webstudio",
        raw_data={"keyword": "React Developer"},
    ),
]

WELLFOUND_LISTINGS = [
    RawJobListing(
        source="wellfound",
        source_id="wf-test-001",
        title="Full Stack Engineer",
        company="AI Startup",
        location="San Francisco",
        description="Join our early-stage startup building AI-powered developer tools.",
        description_html="<div>Full Stack Engineer at AI Startup</div>",
        salary_range="$140k - $180k",
        job_type="full-time",
        remote=False,
        experience_level="mid",
        posted_date="2024-03-22",
        url="https://wellfound.com/startups/ai-startup",
        raw_data={"title": "Full Stack Engineer", "company": "AI Startup"},
    ),
]

ALL_LISTINGS = REMOTEOK_LISTINGS + NAUKRI_LISTINGS + WELLFOUND_LISTINGS