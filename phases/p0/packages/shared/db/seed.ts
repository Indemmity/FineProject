/**
 * Seed script — populates development database with demo data.
 *
 * Usage: npx tsx packages/shared/db/seed.ts (from phases/p0/)
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { db, users, jobs } = require('./schema');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { neon } = require('@neondatabase/serverless');

async function seed() {
  console.log('Seeding database...');

  // Demo user
  const [user] = await db
    .insert(users)
    .values({
      email: 'demo@jobplatform.dev',
      name: 'Demo User',
      preferences: {
        defaultRemoteOnly: false,
        defaultExperienceLevel: 'mid',
        defaultSources: ['naukri', 'remoteok', 'wellfound'],
      },
    })
    .returning();

  console.log(`Created demo user: ${user.id}`);

  // Sample jobs
  const sampleJobs = [
    {
      source: 'remoteok',
      sourceId: 'rok-001',
      title: 'Senior Software Engineer',
      company: 'TechCorp Inc.',
      location: 'San Francisco, CA',
      description: 'We are looking for a Senior Software Engineer to join our platform team...',
      salaryRange: '$150k - $200k',
      jobType: 'full-time',
      remote: true,
      experienceLevel: 'senior',
      searchKeyword: 'Software Engineer',
    },
    {
      source: 'naukri',
      sourceId: 'nkr-001',
      title: 'Data Scientist',
      company: 'DataFlow Labs',
      location: 'Bangalore, India',
      description: 'Apply machine learning to solve complex business problems...',
      salaryRange: '₹25L - ₹40L',
      jobType: 'full-time',
      remote: false,
      experienceLevel: 'mid',
      searchKeyword: 'Data Scientist',
    },
    {
      source: 'wellfound',
      sourceId: 'wf-001',
      title: 'Product Manager',
      company: 'StartupXYZ',
      location: 'New York, NY',
      description: 'Define product strategy and roadmap for our B2B SaaS platform...',
      salaryRange: '$130k - $170k',
      jobType: 'full-time',
      remote: true,
      experienceLevel: 'mid',
      searchKeyword: 'Product Manager',
    },
  ];

  for (const job of sampleJobs) {
    const [inserted] = await db.insert(jobs).values(job).returning();
    console.log(`  Created job: ${inserted.title} @ ${inserted.company}`);
  }

  console.log('Seed complete!');
}

seed().catch((err: Error) => {
  console.error('Seed failed:', err);
  process.exit(1);
});