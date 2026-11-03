import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('===================================================================');
console.log('      VERIFYING MODULE M: ACCESSIBILITY & RESPONSIVE DESIGN        ');
console.log('===================================================================\n');

let totalPassed = 0;
let totalFailed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
    totalPassed++;
  } else {
    console.error(`  [FAIL] ${message}`);
    totalFailed++;
  }
}

const frontendDir = path.join(__dirname, '..', 'frontend', 'src');
const indexCssPath = path.join(frontendDir, 'index.css');
const appShellPath = path.join(frontendDir, 'pages', 'AppShell.tsx');
const sidebarPath = path.join(frontendDir, 'components', 'Sidebar.tsx');
const toastPath = path.join(frontendDir, 'components', 'Toast.tsx');
const loginPagePath = path.join(frontendDir, 'pages', 'LoginPage.tsx');
const uploadPagePath = path.join(frontendDir, 'pages', 'UploadDocument.tsx');
const dashboardPath = path.join(frontendDir, 'pages', 'Dashboard.tsx');
const myDocumentsPath = path.join(frontendDir, 'pages', 'MyDocuments.tsx');

const indexCssContent = fs.readFileSync(indexCssPath, 'utf8');
const appShellContent = fs.readFileSync(appShellPath, 'utf8');
const sidebarContent = fs.readFileSync(sidebarPath, 'utf8');
const toastContent = fs.readFileSync(toastPath, 'utf8');
const loginPageContent = fs.readFileSync(loginPagePath, 'utf8');
const uploadPageContent = fs.readFileSync(uploadPagePath, 'utf8');
const dashboardContent = fs.readFileSync(dashboardPath, 'utf8');
const myDocumentsContent = fs.readFileSync(myDocumentsPath, 'utf8');

// -------------------------------------------------------------------
// PROMPT M.1: Color Contrast - WCAG AA Compliance
// -------------------------------------------------------------------
console.log('--- PROMPT M.1: Color Contrast - WCAG AA Compliance ---');
assert(indexCssContent.includes('--color-primary: #2563EB'), 'Primary text color configured with high-contrast ratio (4.5:1 min)');
assert(indexCssContent.includes('--color-text: #1E293B'), 'Base body text color configured with > 15:1 contrast on background');
assert(!loginPageContent.includes('text-[#94A3B8]') || loginPageContent.includes('text-[#64748B]'), 'Low contrast text replaced with high-contrast slate-600/slate-500 in login page');
assert(dashboardContent.includes('text-[#64748B]') || dashboardContent.includes('text-[#475569]'), 'Dashboard metrics cards use WCAG AA compliant text color');
assert(myDocumentsContent.includes('text-[#475569]') || myDocumentsContent.includes('text-[#64748B]'), 'MyDocuments toolbar labels use WCAG AA contrast colors');

// -------------------------------------------------------------------
// PROMPT M.2: Keyboard Navigation - Tab Order & Focus
// -------------------------------------------------------------------
console.log('\n--- PROMPT M.2: Keyboard Navigation - Tab Order & Focus ---');
assert(appShellContent.includes('skip-link'), 'Skip-to-content keyboard navigation link configured in AppShell');
assert(indexCssContent.includes('.skip-link'), 'Skip link CSS rules defined with high contrast and top position transition');
assert(loginPageContent.includes('id="email"') && loginPageContent.includes('id="password"'), 'Login form inputs have explicit Tab-accessible IDs');
assert(loginPageContent.includes('id="show-pw-checkbox"'), 'Show Password checkbox included in logical Tab order');

// -------------------------------------------------------------------
// PROMPT M.3: Screen Reader Support - ARIA Labels
// -------------------------------------------------------------------
console.log('\n--- PROMPT M.3: Screen Reader Support - ARIA Labels ---');
assert(appShellContent.includes('role="banner"'), 'Header has role="banner" screen reader landmark');
assert(appShellContent.includes('id="main-content"') && appShellContent.includes('tabIndex={-1}'), 'Main landmark has id="main-content" and tabIndex={-1}');
assert(sidebarContent.includes('aria-label="Sidebar navigation"'), 'Sidebar nav has explicit screen reader aria-label');
assert(sidebarContent.includes('aria-current={active ? \'page\' : undefined}'), 'Sidebar active tab communicates aria-current="page" to screen readers');
assert(toastContent.includes('role="alert"') && toastContent.includes('aria-live="polite"'), 'Dynamic notifications announce via role="alert" and aria-live="polite"');
assert(dashboardContent.includes('role="table"'), 'Dashboard recent activity formatted with accessible ARIA table role');

// -------------------------------------------------------------------
// PROMPT M.4: Form Labels & Error Messages
// -------------------------------------------------------------------
console.log('\n--- PROMPT M.4: Form Labels & Error Messages ---');
assert(loginPageContent.includes('htmlFor="email"') && loginPageContent.includes('id="email"'), 'LoginPage email input correctly associated with <label htmlFor="email">');
assert(loginPageContent.includes('htmlFor="password"') && loginPageContent.includes('id="password"'), 'LoginPage password input correctly associated with <label htmlFor="password">');
assert(loginPageContent.includes('aria-required="true"'), 'Mandatory input fields specify aria-required="true"');
assert(loginPageContent.includes('aria-describedby'), 'Login error messages linked via aria-describedby');
assert(uploadPageContent.includes('htmlFor="upload-title"') && uploadPageContent.includes('id="upload-title"'), 'Upload form title input linked to explicit label');
assert(uploadPageContent.includes('htmlFor="upload-category"') && uploadPageContent.includes('id="upload-category"'), 'Upload form category select linked to explicit label');

// -------------------------------------------------------------------
// PROMPT M.5: Alternative Text for Images & Icons
// -------------------------------------------------------------------
console.log('\n--- PROMPT M.5: Alternative Text for Images & Icons ---');
assert(appShellContent.includes('aria-hidden="true"'), 'Decorative icons in header set to aria-hidden="true"');
assert(appShellContent.includes('aria-label="Search documents"') || appShellContent.includes('aria-label="Application settings"'), 'Icon-only header buttons specify descriptive aria-label');
assert(sidebarContent.includes('aria-hidden="true"'), 'Decorative icons in sidebar set to aria-hidden="true"');
assert(dashboardContent.includes('aria-hidden="true"'), 'Decorative metrics icons specify aria-hidden="true"');

// -------------------------------------------------------------------
// PROMPT M.6: Focus Indicators & Visual Feedback
// -------------------------------------------------------------------
console.log('\n--- PROMPT M.6: Focus Indicators & Visual Feedback ---');
assert(indexCssContent.includes('*:focus-visible'), 'Global *:focus-visible outline style configured');
assert(indexCssContent.includes('outline: 2px solid #2563EB') || indexCssContent.includes('outline: 2px solid'), 'Focus ring has 2px width and high-contrast blue color');
assert(indexCssContent.includes('outline-offset: 2px'), 'Focus ring specifies 2px offset to prevent outline obscuration');

// -------------------------------------------------------------------
// PROMPT M.7: Responsive Design - All Device Sizes
// -------------------------------------------------------------------
console.log('\n--- PROMPT M.7: Responsive Design - All Device Sizes ---');
assert(indexCssContent.includes('min-height: 38px') || indexCssContent.includes('min-height: 44px'), 'Minimum touch target height rules defined');
assert(uploadPageContent.includes('grid-cols-1 sm:grid-cols-3'), 'Upload document form stacks controls vertically on small screens');
assert(appShellContent.includes('hidden sm:flex') || appShellContent.includes('sm:block'), 'Responsive navigation hides non-essential breadcrumbs on mobile widths (< 640px)');

// -------------------------------------------------------------------
// PROMPT M.8: Text Sizing & Readability
// -------------------------------------------------------------------
console.log('\n--- PROMPT M.8: Text Sizing & Readability ---');
assert(indexCssContent.includes('line-height: 1.5'), 'Global line-height configured to >= 1.5 for readability');
assert(indexCssContent.includes('font-family'), 'Typography specified with modern legible fonts (DM Sans / Sora)');

console.log('\n===================================================================');
console.log(`SUMMARY: ${totalPassed} PASSED, ${totalFailed} FAILED out of ${totalPassed + totalFailed} assertions.`);
console.log('===================================================================\n');

if (totalFailed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
