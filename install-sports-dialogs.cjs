/* Run from the Next.js project root. Default: preview; --apply writes only targeted changes. */
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const root = process.cwd();
const pkgPath = path.join(root, 'package.json');
if (!fs.existsSync(pkgPath)) throw new Error('Run in student-activity-app (package.json not found).');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
if (!pkg.dependencies?.sweetalert2) throw new Error('sweetalert2 not in package.json; stop and check dependencies.');
const localRequire = createRequire(pkgPath);
const ts = localRequire('typescript');
const helperRel = 'src/lib/group-sports/sports-dialog.ts';
const helper = path.join(__dirname, helperRel);
const helperDest = path.join(root, helperRel);
const helperText = fs.readFileSync(helper, 'utf8');
const scopes = ['src/app/group-sports', 'src/components/group-sports'];
const importLine = 'import { sportsConfirm } from "@/lib/group-sports/sports-dialog";';
const knownSync = new Set(['saveCheck', 'saveBout', 'makeDraw']);
const changes = [], skipped = [], issues = [];
let count = 0;
function hasAsync(n) { return n.modifiers?.some(m => m.kind === ts.SyntaxKind.AsyncKeyword); }
function analyze(file) {
  const relative = path.relative(root, file).split(path.sep).join('/');
  const original = fs.readFileSync(file, 'utf8');
  const source = ts.createSourceFile(file, original, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  if (source.parseDiagnostics.length) { issues.push(`${relative}: source syntax error`); return; }
  const edits = [], asyncFns = new Set(); let nCalls = 0;
  const eol = original.includes('\r\n') ? '\r\n' : '\n';
  function visit(n) {
    if (ts.isCallExpression(n) && n.expression.getText(source) === 'window.confirm') {
      const line = source.getLineAndCharacterOfPosition(n.getStart(source)).line + 1;
      let fn = n.parent;
      while (fn && !ts.isFunctionLike(fn)) fn = fn.parent;
      const jsxHandler = fn && ts.isArrowFunction(fn) && ts.isJsxExpression(fn.parent) && ts.isJsxAttribute(fn.parent.parent) && ['onClick','onSubmit'].includes(fn.parent.parent.name.getText(source));
      const boxingFn = fn && ts.isFunctionDeclaration(fn) && relative.endsWith('/BoxingDashboard.tsx') && knownSync.has(fn.name?.text);
      if (!fn || (!hasAsync(fn) && !jsxHandler && !boxingFn) || n.arguments.length !== 1 || n.questionDotToken) {
        skipped.push(`${relative}:${line} (manual review)`);
      } else {
        // Wrapping the entire call keeps boolean negation, &&, || and ternaries intact.
        edits.push({ start:n.getStart(source), end:n.expression.getEnd(), value:'(await sportsConfirm' });
        edits.push({ start:n.getEnd(), end:n.getEnd(), value:')' });
        if (!hasAsync(fn)) asyncFns.add(fn);
        nCalls++;
      }
    }
    ts.forEachChild(n, visit);
  }
  visit(source);
  if (!nCalls) return;
  for (const fn of asyncFns) edits.push({start:fn.getStart(source),end:fn.getStart(source),value:'async '});
  if (!original.includes('@/lib/group-sports/sports-dialog')) {
    if (/\bsportsConfirm\b/.test(original)) { issues.push(`${relative}: sportsConfirm name collision`); return; }
    const directive = source.statements[0];
    if (!directive || !ts.isExpressionStatement(directive) || !ts.isStringLiteral(directive.expression) || directive.expression.text !== 'use client') {
      issues.push(`${relative}: not a recognized client component`); return;
    }
    edits.push({start:directive.getEnd(),end:directive.getEnd(),value:eol+importLine});
  }
  let updated = original;
  for (const ed of edits.sort((a,b)=>b.start-a.start || b.end-a.end)) updated = updated.slice(0,ed.start)+ed.value+updated.slice(ed.end);
  const parsed = ts.createSourceFile(file,updated,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  if (parsed.parseDiagnostics.length) { issues.push(`${relative}: generated syntax error`); return; }
  const transpiled = ts.transpileModule(updated,{fileName:file,compilerOptions:{jsx:ts.JsxEmit.Preserve,target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext},reportDiagnostics:true});
  if (transpiled.diagnostics?.some(d=>d.category===ts.DiagnosticCategory.Error)) {issues.push(`${relative}: transpile error`);return;}
  changes.push({file,relative,original,updated,nCalls}); count+=nCalls;
}
function walk(dir){ for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const f=path.join(dir,entry.name);if(entry.isDirectory())walk(f);else if(/\.tsx$/.test(entry.name)&&!/(?:-updated|\.bak|merged|backup)\.tsx$/i.test(entry.name))analyze(f);} }
for(const scope of scopes){const folder=path.join(root,scope);if(!fs.existsSync(folder))throw new Error(`Missing ${scope}`);walk(folder);}
if(fs.existsSync(helperDest)&&fs.readFileSync(helperDest,'utf8').replace(/\r\n/g,'\n')!==helperText.replace(/\r\n/g,'\n'))issues.push('Existing sports-dialog.ts differs; will not overwrite.');
for(const c of changes) console.log(`${c.nCalls} confirmation(s)  ${c.relative}`);
for(const s of skipped)console.log('SKIP '+s);
for(const e of issues)console.error('ERROR '+e);
console.log(`\n${count} confirmation(s) in ${changes.length} file(s). ${skipped.length} skipped. ${issues.length} error(s).`);
if(issues.length){process.exitCode=1;return;}
if(!process.argv.includes('--apply')){console.log('Preview only. No files changed. Run with --apply after review.');return;}
if(!changes.length){console.log('No new changes to apply.');return;}
// Backup exact originals outside src; never touch Git history or database.
const backup=path.join(path.dirname(root),path.basename(root)+'-dialog-backups',new Date().toISOString().replace(/[:.]/g,'-'));
for(const c of changes){const dest=path.join(backup,c.relative);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,c.original);}
if(!fs.existsSync(helperDest)){fs.mkdirSync(path.dirname(helperDest),{recursive:true});fs.copyFileSync(helper,helperDest);}
try {for(const c of changes)fs.writeFileSync(c.file,c.updated);} catch(error){for(const c of changes)fs.writeFileSync(c.file,c.original);throw error;}
console.log('Applied. Backup: '+backup+'\nReview git diff, then npm run build. Do not commit installer or backup files.');
