/**
 * Static educational articles for the public site.
 * Easy to update without a CMS or database.
 */

export const ARTICLES = [
  {
    slug: 'structured-learning-objectives',
    category: 'Curriculum',
    title: 'Why Structured Learning Objectives Matter',
    excerpt:
      'Clear learning objectives help teachers plan instruction and help families understand what students are working toward.',
    image:
      'https://images.unsplash.com/photo-1456513080080-369143f81f63?auto=format&fit=crop&w=1200&q=80',
    imageAlt: 'Open books and study materials on a desk',
    readMinutes: 5,
    body: [
      'Learning objectives describe what students should know or be able to do after a unit of study. When objectives are written clearly, teaching and assessment stay aligned.',
      'In a structured curriculum system, objectives can be organized by grade and subject so educators share a common language. That makes it easier to build courses, choose assessment tasks, and review progress over time.',
      'Parents also benefit. When academic goals are visible and consistent, conversations about progress become more concrete—focused on skills and understanding rather than vague impressions.',
      'The Learning Grove supports this approach by keeping curriculum objectives available alongside courses, marks, and reports, so planning and evaluation remain connected.',
    ],
  },
  {
    slug: 'understanding-student-assessment',
    category: 'Assessment',
    title: 'Understanding Student Assessment',
    excerpt:
      'Assessment is more than a score. Well-designed evaluation helps teachers see growth and guide the next steps in learning.',
    image:
      'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=1200&q=80',
    imageAlt: 'Student writing during a classroom assessment',
    readMinutes: 6,
    body: [
      'Assessment gathers evidence of learning. It can take many forms—quizzes, projects, oral responses, or end-of-term examinations—depending on the skills being measured.',
      'Structured assessment workflows help schools stay consistent: courses define what is being assessed, marks are recorded carefully, and results can be reviewed before they are finalized.',
      'When marks are entered and locked through a shared process, teams reduce confusion about which results are draft and which are ready for reporting.',
      'Families can then receive reports that reflect a clear academic record, while educators retain tools to manage grading schemes and course-level results responsibly.',
    ],
  },
  {
    slug: 'importance-of-progress-reports',
    category: 'Reporting',
    title: 'The Importance of Academic Progress Reports',
    excerpt:
      'Thoughtful progress reports turn classroom evidence into a shared story of growth that students, teachers, and families can understand.',
    image:
      'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1200&q=80',
    imageAlt: 'Person reviewing documents and charts at a desk',
    readMinutes: 5,
    body: [
      'Progress reports summarize learning across subjects and periods. They help families see strengths, areas for improvement, and overall academic standing.',
      'Consistency matters. Using grading schemes and structured result sheets means percentages and letter grades follow agreed rules rather than ad-hoc decisions.',
      'Digital report generation can make distribution easier, but the value still comes from accurate marks and clear presentation—not from visual design alone.',
      'The Learning Grove includes tools for individual report cards and class result sheets so academic information can be reviewed and shared in an organized way.',
    ],
  },
  {
    slug: 'supporting-grade-progression',
    category: 'Student Growth',
    title: 'Supporting Students Through Grade Progression',
    excerpt:
      'Moving from one grade to the next is a milestone. Clear records and careful promotion processes help schools support that transition.',
    image:
      'https://images.unsplash.com/photo-1523240795612-9e26bda65c69?auto=format&fit=crop&w=1200&q=80',
    imageAlt: 'Students collaborating around a table with notebooks',
    readMinutes: 5,
    body: [
      'Grade progression is both academic and administrative. Schools need reliable student records, clear grade placement, and a process for promoting learners when the year ends.',
      'Promotion workflows reduce mistakes such as duplicated enrollments or lost history. Alumni records also help schools keep a respectful archive of students who have completed their pathway.',
      'For families, transparent progression means fewer surprises: students know where they stand, and the school can communicate next steps with confidence.',
      'The Learning Grove supports student enrollment, grade updates, promotion actions, and alumni tracking so progression remains connected to the wider academic record.',
    ],
  },
];

export function getArticleBySlug(slug) {
  return ARTICLES.find((a) => a.slug === String(slug || '').trim()) || null;
}
