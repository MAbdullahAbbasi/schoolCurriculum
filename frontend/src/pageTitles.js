import { APP_LABELS, ROLE_LABELS } from './roleLabels';

/**
 * Page title + subtitle for the main content panel (matches sidebar nav where possible).
 * First matching rule wins (most specific paths first).
 */
const PAGE_RULES = [
  { test: (p) => p.startsWith('/create-course/map-questions'), title: 'Map Questions', subtitle: 'Link assessment questions to learning objectives.' },
  { test: (p) => p.startsWith('/create-course/marks'), title: 'Course Marks', subtitle: 'Set marks for each question in the new course.' },
  { test: (p) => p.startsWith('/create-course'), title: 'Create Course', subtitle: 'Configure course details from selected objectives.' },
  { test: (p) => p.startsWith('/reports/result-sheet'), title: 'Result Sheet', subtitle: 'View and export grade result sheets.' },
  { test: (p) => p.startsWith('/reports/student/'), title: 'Student Report', subtitle: 'Review and download an individual report.' },
  { test: (p) => p.startsWith('/reports'), title: 'Reports', subtitle: 'Select a grade to view students and download reports.' },
  { test: (p) => p.startsWith('/studentRecord/'), title: 'Record', subtitle: 'View and manage marks for this course.' },
  { test: (p) => p === '/course-admins', title: `${ROLE_LABELS.forestKeeper}s`, subtitle: `Manage ${ROLE_LABELS.forestKeeper.toLowerCase()} accounts and access.` },
  { test: (p) => p === '/educators', title: `${ROLE_LABELS.gardener}s`, subtitle: `Manage ${ROLE_LABELS.gardener.toLowerCase()} accounts and assignments.` },
  { test: (p) => p === '/roles', title: APP_LABELS.groveNav, subtitle: APP_LABELS.rolesDashboardSubtitle },
  { test: (p) => p === '/students-data/add', title: `Add ${ROLE_LABELS.seedling}`, subtitle: `Add one ${ROLE_LABELS.seedling.toLowerCase()} or import from Excel.` },
  { test: (p) => p === '/students-data/promote', title: 'Promote students', subtitle: 'Move a whole class or selected students to the next grade.' },
  { test: (p) => p.startsWith('/students-data/'), title: `${ROLE_LABELS.seedling} profile`, subtitle: `View and manage this ${ROLE_LABELS.seedling.toLowerCase()}'s record.` },
  { test: (p) => p === '/students-data', title: APP_LABELS.seedlingData, subtitle: `Browse the ${ROLE_LABELS.seedling.toLowerCase()} directory.` },
  { test: (p) => p === '/grading-scheme', title: 'Grading Scheme', subtitle: 'Define how percentage maps to grades for each validity period.' },
  { test: (p) => p === '/record', title: 'Record', subtitle: 'Select a course to view and manage student records.' },
  { test: (p) => p === '/', title: 'Objectives', subtitle: 'Filter, browse, and manage learning objectives by grade and subject.' },
];

export function getPageMeta(pathname) {
  const path = pathname || '/';
  const rule = PAGE_RULES.find((r) => r.test(path));
  return rule
    ? { title: rule.title, subtitle: rule.subtitle }
    : { title: 'The Learning Grove', subtitle: '' };
}
