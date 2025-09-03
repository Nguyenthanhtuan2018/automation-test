// tools/gen-tests.ts  (CommonJS-friendly, chạy bằng ts-node)
import fs from 'fs';
import path from 'path';
import xlsx from 'xlsx';

// ===== Types =====
type Row = {
  Suite?: string;
  TestID?: string;
  TestName?: string;
  StepNo?: number;
  Action?: string;
  Target?: string;
  Value?: string;
  ExpectType?: string;
  ExpectTarget?: string;
  ExpectValue?: string;
  Url?: string;
};

type Mapping = Record<string, string>;

// ===== Paths =====
const ROOT = path.resolve(__dirname, '..');
const TESTS_OUT_DIR = path.join(ROOT, 'tests-gen');

// ===== Helpers =====
function loadMapping(): Mapping {
  const p = path.join(ROOT, 'mapping.json');
  if (!fs.existsSync(p)) throw new Error('mapping.json not found');
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function readExcel(file: string): Row[] {
  if (!fs.existsSync(file)) throw new Error(`Excel not found: ${file}`);
  const wb = xlsx.readFile(file);
  const ws = wb.Sheets[wb.SheetNames[0]];
  return xlsx.utils.sheet_to_json<Row>(ws, { defval: '' });
}

function esc(s: string) {
  return s.replace(/\\/g, '\\\\').replace(/`/g, '\\`');
}

function selOf(target: string, mapping: Mapping): string {
  if (!target) return '';
  return Object.prototype.hasOwnProperty.call(mapping, target) ? mapping[target] : target;
}

function ensureDir(p: string) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function groupBySuiteTest(rows: Row[]) {
  const bySuite = new Map<string, Map<string, Row[]>>();
  for (const raw of rows) {
    const r: Row = {
      Suite: (raw.Suite ?? 'Default').toString().trim() || 'Default',
      TestID: (raw.TestID ?? 'NO_ID').toString().trim() || 'NO_ID',
      TestName: (raw.TestName ?? '').toString().trim(),
      StepNo: Number(raw.StepNo ?? 0),
      Action: (raw.Action ?? '').toString().trim(),
      Target: (raw.Target ?? '').toString().trim(),
      Value: (raw.Value ?? '').toString(),
      ExpectType: (raw.ExpectType ?? '').toString().trim().toLowerCase(),
      ExpectTarget: (raw.ExpectTarget ?? '').toString().trim(),
      ExpectValue: (raw.ExpectValue ?? '').toString(),
      Url: (raw.Url ?? '').toString().trim(),
    };

    if (!bySuite.has(r.Suite!)) bySuite.set(r.Suite!, new Map());
    const suiteMap = bySuite.get(r.Suite!)!;
    if (!suiteMap.has(r.TestID!)) suiteMap.set(r.TestID!, []);
    suiteMap.get(r.TestID!)!.push(r);
  }
  // sort by StepNo
  for (const [, tests] of bySuite) {
    for (const [, arr] of tests) arr.sort((a, b) => (a.StepNo ?? 0) - (b.StepNo ?? 0));
  }
  return bySuite;
}

// ===== Codegen cho từng step =====
function stepToCode(r: Row, mapping: Mapping): string {
  const act = (r.Action || '').toUpperCase();
  const targetSel = selOf(r.Target || '', mapping);
  const value = (r.Value || '').trim();
  const expType = (r.ExpectType || '').toLowerCase();
  const expTargetSel = selOf((r.ExpectTarget || r.Target || '').trim(), mapping);
  const expValue = (r.ExpectValue || '').trim();
  const url = (r.Url || (r.Target ? mapping[r.Target] : '') || '').trim();

  switch (act) {
    case 'GOTO': {
      if (!url) throw new Error(`GOTO thiếu Url/Target ở step ${r.StepNo} – "${r.TestName}"`);
      return `await page.goto(\`${esc(url)}\`);`;
    }
    case 'FILL':
      if (!targetSel) throw new Error(`FILL thiếu Target ở step ${r.StepNo} – "${r.TestName}"`);
      return `await page.locator(\`${esc(targetSel)}\`).fill(\`${esc(value)}\`);`;

    case 'CLICK':
      if (!targetSel) throw new Error(`CLICK thiếu Target ở step ${r.StepNo} – "${r.TestName}"`);
      return `await page.locator(\`${esc(targetSel)}\`).click();`;

    case 'CHECK':
      if (!targetSel) throw new Error(`CHECK thiếu Target ở step ${r.StepNo} – "${r.TestName}"`);
      return `await page.locator(\`${esc(targetSel)}\`).check();`;

    case 'UNCHECK':
      if (!targetSel) throw new Error(`UNCHECK thiếu Target ở step ${r.StepNo} – "${r.TestName}"`);
      return `await page.locator(\`${esc(targetSel)}\`).uncheck();`;

    case 'SELECT':
      if (!targetSel) throw new Error(`SELECT thiếu Target ở step ${r.StepNo} – "${r.TestName}"`);
      return `await page.locator(\`${esc(targetSel)}\`).selectOption(\`${esc(value)}\`);`;

    case 'WAIT':
      return `await page.waitForTimeout(${Number(value) || 500});`;

    case 'EXPECT_URL': {
      if (!expValue) {
        throw new Error(`EXPECT_URL thiếu ExpectValue ở step ${r.StepNo} – "${r.TestName}"`);
      }
      if (expType === 'url-equals') {
        return `await expect(page).toHaveURL(\`${esc(expValue)}\`);`;
      }
      if (expType === 'url-contains') {
        return `await expect(page).toHaveURL(new RegExp(\`${esc(expValue)}\`));`;
      }
      throw new Error(
        `EXPECT_URL cần ExpectType = url-contains|url-equals (step ${r.StepNo} – "${r.TestName}")`
      );
    }

    case 'EXPECT_TEXT': {
      if (!expTargetSel) {
        throw new Error(`EXPECT_TEXT thiếu ExpectTarget ở step ${r.StepNo} – "${r.TestName}"`);
      }
      if (!expValue) {
        throw new Error(`EXPECT_TEXT thiếu ExpectValue ở step ${r.StepNo} – "${r.TestName}"`);
      }
      if (expType === 'text-equals') {
        return `await expect(page.locator(\`${esc(expTargetSel)}\`)).toHaveText(\`${esc(expValue)}\`);`;
      }
      if (expType === 'text-contains') {
        return `await expect(page.locator(\`${esc(expTargetSel)}\`)).toContainText(\`${esc(expValue)}\`);`;
      }
      throw new Error(
        `EXPECT_TEXT cần ExpectType = text-contains|text-equals (step ${r.StepNo} – "${r.TestName}")`
      );
    }

    case 'EXPECT_VISIBLE': {
      const sel = expTargetSel || targetSel;
      if (!sel) throw new Error(`EXPECT_VISIBLE thiếu Target/ExpectTarget ở step ${r.StepNo}`);
      return `await expect(page.locator(\`${esc(sel)}\`)).toBeVisible();`;
    }

    case 'EXPECT_HIDDEN': {
      const sel = expTargetSel || targetSel;
      if (!sel) throw new Error(`EXPECT_HIDDEN thiếu Target/ExpectTarget ở step ${r.StepNo}`);
      return `await expect(page.locator(\`${esc(sel)}\`)).toBeHidden();`;
    }

    default:
      throw new Error(`Action không hỗ trợ: ${act} (step ${r.StepNo} – "${r.TestName}")`);
  }
}

// ===== Render 1 suite =====
function renderSuite(suite: string, tests: Map<string, Row[]>, mapping: Mapping) {
  const lines: string[] = [];
  lines.push(`import { test, expect } from '@playwright/test';`);
  lines.push('');
  lines.push(`test.describe(${JSON.stringify(suite)}, () => {`);

  for (const [testId, steps] of tests) {
    const name = (steps[0]?.TestName || testId).trim() || testId;
    lines.push(`  test(${JSON.stringify(name)}, async ({ page }) => {`);
    for (const r of steps) {
      lines.push(`    // Step ${r.StepNo}: ${r.Action} ${r.Target || ''}`);
      lines.push(`    ${stepToCode(r, mapping)}`);
    }
    lines.push(`  });`);
    lines.push('');
  }

  lines.push('});');
  lines.push('');
  return lines.join('\n');
}

// ===== Main =====
function main() {
  const mapping = loadMapping();
  const rows = readExcel(path.join(ROOT, 'testcases.xlsx'));
  const grouped = groupBySuiteTest(rows);
  ensureDir(TESTS_OUT_DIR);

  // dọn file cũ
  for (const f of fs.readdirSync(TESTS_OUT_DIR)) {
    if (f.endsWith('.spec.ts')) fs.unlinkSync(path.join(TESTS_OUT_DIR, f));
  }

  // mỗi suite -> 1 file
  for (const [suite, tests] of grouped) {
    const code = renderSuite(suite, tests, mapping);
    const out = path.join(TESTS_OUT_DIR, `${suite.replace(/\W+/g, '_')}.spec.ts`);
    fs.writeFileSync(out, code, 'utf8');
    console.log('Generated:', out);
  }
}

main();
