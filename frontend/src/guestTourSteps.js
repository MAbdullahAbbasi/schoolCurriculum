import { APP_LABELS, ROLE_LABELS } from './roleLabels';

/** Ordered steps for the guest demo walkthrough (shown on every guest session). */
export const GUEST_TOUR_STEPS = [
  {
    id: 'welcome',
    type: 'center',
    title: `Welcome to ${APP_LABELS.brandTitle}`,
    body: 'This is a live demo of the school curriculum portal. Follow this short guide to see where everything lives — objectives, people, marks, and reports.',
  },
  {
    id: 'brand',
    target: '[data-guest-tour="sidebar-brand"]',
    title: APP_LABELS.brandTitle,
    body: `${APP_LABELS.brandTagline}. All main sections are reached from the sidebar on the left.`,
    placement: 'right',
  },
  {
    id: 'objectives',
    target: '[data-guest-tour="nav-objectives"]',
    title: 'Objectives',
    body: 'Browse and filter learning objectives by grade, subject, and topic. Courses are built from these objectives so curriculum stays aligned.',
    placement: 'right',
  },
  {
    id: 'grove',
    target: '[data-guest-tour="nav-grove"]',
    title: APP_LABELS.groveNav,
    body: `Your community hub: manage ${ROLE_LABELS.forestKeeper.toLowerCase()}s, ${ROLE_LABELS.gardener.toLowerCase()}s, and the ${ROLE_LABELS.seedling.toLowerCase()} directory — roles, accounts, and student records.`,
    placement: 'right',
  },
  {
    id: 'record',
    target: '[data-guest-tour="nav-record"]',
    title: 'Record',
    body: 'Open any course to enter marks question-by-question. Educators fill scores here; admins review and lock results when ready.',
    placement: 'right',
  },
  {
    id: 'reports',
    target: '[data-guest-tour="nav-reports"]',
    title: 'Reports',
    body: 'Generate result sheets, individual report cards, and class rankings by grade and grading period — ready to print or share as PDF.',
    placement: 'right',
  },
  {
    id: 'grading',
    target: '[data-guest-tour="nav-grading"]',
    title: 'Grading Scheme',
    body: 'Define how percentages map to letter grades (A+, A, B, …) for each academic session or term.',
    placement: 'right',
  },
  {
    id: 'guest-banner',
    target: '[data-guest-tour="guest-banner"]',
    title: 'Guest demo mode',
    body: 'You can explore every screen, but saving and editing are disabled so demo data stays safe. Your own school gets full edit access.',
    placement: 'bottom',
  },
  {
    id: 'main',
    target: '[data-guest-tour="main-content"]',
    title: 'Main workspace',
    body: 'Page title and content appear here. Click any sidebar item to switch sections — filters, tables, and PDF exports all live in this panel.',
    placement: 'left',
  },
  {
    id: 'finish',
    type: 'center',
    title: 'You\'re ready to explore',
    body: 'Click through the sidebar at your own pace. Use “Replay tour” in the yellow banner anytime to see this guide again.',
  },
];
