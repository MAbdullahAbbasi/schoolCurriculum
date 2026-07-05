import { APP_LABELS, ROLE_LABELS } from './roleLabels';

const brandStep = {
  id: 'brand',
  target: '[data-guest-tour="sidebar-brand"]',
  title: APP_LABELS.brandTitle,
  body: `${APP_LABELS.brandTagline}. All main sections are reached from the sidebar on the left.`,
  placement: 'right',
};

const mainStep = {
  id: 'main',
  target: '[data-guest-tour="main-content"]',
  title: 'Main workspace',
  body: 'Page title and content appear here. Use the sidebar to switch sections — filters, tables, and exports all live in this panel.',
  placement: 'left',
};

const objectivesStep = {
  id: 'objectives',
  target: '[data-guest-tour="nav-objectives"]',
  title: 'Objectives',
  body: 'Browse learning objectives by grade, subject, and topic. Courses are built from these objectives so curriculum stays aligned.',
  placement: 'right',
};

const groveStep = {
  id: 'grove',
  target: '[data-guest-tour="nav-grove"]',
  title: APP_LABELS.groveNav,
  body: `Manage ${ROLE_LABELS.forestKeeper.toLowerCase()}s, ${ROLE_LABELS.gardener.toLowerCase()}s, and the ${ROLE_LABELS.seedling.toLowerCase()} directory — roles, accounts, and student records.`,
  placement: 'right',
};

const recordStep = {
  id: 'record',
  target: '[data-guest-tour="nav-record"]',
  title: 'Record',
  body: 'Open a course to enter marks question-by-question. Teachers fill scores here; admins review and lock results when ready.',
  placement: 'right',
};

const reportsStep = {
  id: 'reports',
  target: '[data-guest-tour="nav-reports"]',
  title: 'Reports',
  body: 'Generate result sheets, individual report cards, and class rankings by grade and grading period — ready to print or share as PDF.',
  placement: 'right',
};

const gradingStep = {
  id: 'grading',
  target: '[data-guest-tour="nav-grading"]',
  title: 'Grading Scheme',
  body: 'Define how percentages map to letter grades (A+, A, B, …) for each academic session or term.',
  placement: 'right',
};

const guestBannerStep = {
  id: 'guest-banner',
  target: '[data-guest-tour="guest-banner"]',
  title: 'Guest demo mode',
  body: 'You can explore every screen, but saving and editing are disabled so demo data stays safe. Your own school gets full edit access.',
  placement: 'bottom',
};

const rootLoginsStep = {
  id: 'root-logins',
  target: '[data-guest-tour="nav-root-logins"]',
  title: 'All logins',
  body: 'View and manage every account in the system — admins, course admins, educators, and passwords.',
  placement: 'right',
};

/** Guest demo: full walkthrough, shown every session. */
export const GUEST_TOUR_STEPS = [
  {
    id: 'welcome',
    type: 'center',
    title: `Welcome to ${APP_LABELS.brandTitle}`,
    body: 'This is a live demo of the school curriculum portal. Follow this short guide to see where everything lives — objectives, people, marks, and reports.',
  },
  brandStep,
  objectivesStep,
  groveStep,
  recordStep,
  reportsStep,
  gradingStep,
  guestBannerStep,
  mainStep,
  {
    id: 'finish',
    type: 'center',
    title: "You're ready to explore",
    body: 'Click through the sidebar at your own pace. Use “Replay tour” in the yellow banner anytime to see this guide again.',
  },
];

/** First-login tour steps tailored to each role. */
export function getPortalTourSteps(role) {
  switch (role) {
    case 'GUEST':
      return GUEST_TOUR_STEPS;
    case 'EDUCATOR':
      return [
        {
          id: 'welcome',
          type: 'center',
          title: `Welcome, ${ROLE_LABELS.gardener}`,
          body: `This quick tour shows where to enter marks for your classes. As a ${ROLE_LABELS.gardener.toLowerCase()}, Record is your main workspace.`,
        },
        brandStep,
        {
          ...recordStep,
          body: 'Your assigned courses appear here. Open a course to enter marks for each student, question by question.',
        },
        mainStep,
        {
          id: 'finish',
          type: 'center',
          title: "You're all set",
          body: 'Open Record from the sidebar whenever you need to enter or review marks. This tour will not show again after you finish it.',
        },
      ];
    case 'COURSE_ADMIN':
      return [
        {
          id: 'welcome',
          type: 'center',
          title: `Welcome to ${APP_LABELS.brandTitle}`,
          body: `As a ${ROLE_LABELS.forestKeeper.toLowerCase()}, you manage curriculum, courses, marks, and reports for your school.`,
        },
        brandStep,
        objectivesStep,
        recordStep,
        reportsStep,
        gradingStep,
        mainStep,
        {
          id: 'finish',
          type: 'center',
          title: "You're ready to go",
          body: 'Explore the sidebar at your own pace. This welcome tour appears only once — the first time you sign in.',
        },
      ];
    case 'ADMIN':
      return [
        {
          id: 'welcome',
          type: 'center',
          title: `Welcome to ${APP_LABELS.brandTitle}`,
          body: 'This tour walks you through the portal — objectives, your community, marks, and reports.',
        },
        brandStep,
        objectivesStep,
        groveStep,
        recordStep,
        reportsStep,
        gradingStep,
        mainStep,
        {
          id: 'finish',
          type: 'center',
          title: "You're ready to go",
          body: 'Explore the sidebar at your own pace. This welcome tour appears only once — the first time you sign in.',
        },
      ];
    case 'SUPER_ADMIN':
      return [
        {
          id: 'welcome',
          type: 'center',
          title: 'Root administration',
          body: 'You manage all login accounts for the platform. This short tour shows where to find that.',
        },
        brandStep,
        rootLoginsStep,
        mainStep,
        {
          id: 'finish',
          type: 'center',
          title: "You're ready to go",
          body: 'Use All logins in the sidebar to manage accounts. This welcome tour appears only once — the first time you sign in.',
        },
      ];
    default:
      return [];
  }
}
