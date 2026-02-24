#!/usr/bin/env node

/**
 * Spec Validation Script
 * Validates spec files for required sections and structure.
 */

const fs = require('fs');
const path = require('path');

// CLI argument parsing
const args = process.argv.slice(2);
const specName = args.find(arg => arg.startsWith('--spec='))?.replace('--spec=', '');
const fastMode = args.includes('--fast');

console.log('Spec Validation Tool\n');

if (!specName) {
  console.error('Error: --spec argument is required');
  console.error('Usage: node validate-spec.js --spec=<spec-name>');
  process.exit(1);
}

const specFile = path.join(process.cwd(), '.specify', 'specs', `${specName}.md`);

// Check spec file exists
if (!fs.existsSync(specFile)) {
  console.error(`Spec file not found: ${specFile}`);
  process.exit(1);
}

console.log(`Validating: ${specFile}\n`);

// Read spec file
const specContent = fs.readFileSync(specFile, 'utf-8');

// Validation results
const results = {
  passed: [],
  warnings: [],
  failed: []
};

// 1. Required sections check
console.log('Checking required sections...');

// Pattern: numbered headings (## 1. Overview) + Korean/English support
const requiredSections = [
  { name: 'Overview', pattern: /##\s*(\d+\.\s*)?(개요|Overview)/i },
  { name: 'Requirements', pattern: /##\s*(\d+\.\s*)?(기능\s*)?(요구사항|Requirements)/i },
  { name: 'Testing', pattern: /##\s*(\d+\.\s*)?(테스트|Testing)/i },
];

const optionalSections = [
  { name: 'Database', pattern: /##\s*(\d+\.\s*)?(데이터베이스|데이터\s*모델|Database|Schema)/i },
  { name: 'Security', pattern: /##\s*(\d+\.\s*)?(보안|Security)/i },
];

requiredSections.forEach(({ name, pattern }) => {
  if (pattern.test(specContent)) {
    results.passed.push(`${name} section found`);
  } else {
    results.failed.push(`${name} section missing (required)`);
  }
});

// API section: required unless explicitly marked as N/A
const apiPattern = /##\s*(\d+\.\s*)?(API|Endpoints)/i;
const apiNaPattern = /##\s*(\d+\.\s*)?(API|Endpoints)[^#]*?(해당\s*없음|N\/A|not applicable)/is;
if (apiPattern.test(specContent)) {
  if (apiNaPattern.test(specContent)) {
    results.passed.push('API section found (marked N/A)');
  } else {
    results.passed.push('API section found');
  }
} else {
  results.warnings.push('API section not found (required for feature specs, optional for infra)');
}

optionalSections.forEach(({ name, pattern }) => {
  if (pattern.test(specContent)) {
    results.passed.push(`${name} section found`);
  } else {
    results.warnings.push(`${name} section not found (optional)`);
  }
});

// 2. Title format check
console.log('Checking title format...');
const titleMatch = specContent.match(/^#\s+(.+)/m);
if (titleMatch) {
  results.passed.push(`Title found: "${titleMatch[1]}"`);
} else {
  results.warnings.push('Main title (# ) not found');
}

// 3. Detailed validation (non-fast mode)
if (!fastMode) {
  console.log('Performing detailed validation...');

  // 3-1. Requirement items count
  const requirementItems = specContent.match(/^[-*]\s+.+/gm) || [];
  if (requirementItems.length > 0) {
    results.passed.push(`${requirementItems.length} requirement items found`);
  } else {
    results.warnings.push('No requirement items (- or * lists) found');
  }

  // 3-2. Code blocks check
  const codeBlocks = specContent.match(/```[\s\S]*?```/g) || [];
  if (codeBlocks.length > 0) {
    results.passed.push(`${codeBlocks.length} code blocks found`);
  }

  // 3-3. Checklist items check
  const checklistItems = specContent.match(/^- \[ \].+/gm) || [];
  if (checklistItems.length > 0) {
    results.passed.push(`${checklistItems.length} checklist items found`);
  }
}

// Output results
console.log('\n' + '='.repeat(50));
console.log('Validation Results\n');

if (results.passed.length > 0) {
  console.log('Passed:');
  results.passed.forEach(msg => console.log(`  + ${msg}`));
  console.log('');
}

if (results.warnings.length > 0) {
  console.log('Warnings:');
  results.warnings.forEach(msg => console.log(`  ? ${msg}`));
  console.log('');
}

if (results.failed.length > 0) {
  console.log('Failed:');
  results.failed.forEach(msg => console.log(`  x ${msg}`));
  console.log('');
}

console.log('='.repeat(50));

// Exit with code 1 if any failures
if (results.failed.length > 0) {
  console.log('\nSpec validation failed');
  process.exit(1);
}

console.log('\nSpec validation passed');
process.exit(0);
