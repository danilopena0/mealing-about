import 'dotenv/config';
import { main as discover } from './stages/01-discover.js';
import { main as enrich } from './stages/02-enrich.js';
import { main as findMenus } from './stages/03-find-menus.js';
import { main as extract } from './stages/04-extract.js';
import { main as analyze } from './stages/05-analyze.js';

interface StageResult {
  name: string;
  durationMs: number;
  success: boolean;
  error?: string;
}

async function runStage(
  name: string,
  fn: () => Promise<void>,
): Promise<StageResult> {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Running: ${name}`);
  console.log('='.repeat(60));

  const startMs = Date.now();
  try {
    await fn();
    const durationMs = Date.now() - startMs;
    console.log(`\n${name} completed in ${(durationMs / 1000).toFixed(1)}s`);
    return { name, durationMs, success: true };
  } catch (err) {
    const durationMs = Date.now() - startMs;
    const errorMessage = (err as Error).message;
    console.error(`\n✗ ${name} failed after ${(durationMs / 1000).toFixed(1)}s:`, errorMessage);
    return { name, durationMs, success: false, error: errorMessage };
  }
}

async function main(): Promise<void> {
  const pipelineStart = Date.now();
  console.log('Mealing About — Data Pipeline');
  console.log(`Started at: ${new Date().toISOString()}`);

  const stages: Array<{ name: string; fn: () => Promise<void> }> = [
    { name: 'Stage 1: Discover', fn: discover },
    { name: 'Stage 2: Enrich', fn: enrich },
    { name: 'Stage 3: Find Menus', fn: findMenus },
    { name: 'Stage 4: Extract', fn: extract },
    { name: 'Stage 5: Analyze', fn: analyze },
  ];

  const results: StageResult[] = [];

  for (const stage of stages) {
    const result = await runStage(stage.name, stage.fn);
    results.push(result);
  }

  const totalMs = Date.now() - pipelineStart;

  console.log(`\n${'='.repeat(60)}`);
  console.log('Pipeline Summary');
  console.log('='.repeat(60));

  for (const result of results) {
    const status = result.success ? '✓' : '✗';
    const duration = `${(result.durationMs / 1000).toFixed(1)}s`;
    const errorSuffix = result.error ? ` — ${result.error}` : '';
    console.log(`${status} ${result.name} (${duration})${errorSuffix}`);
  }

  console.log(`\nTotal time: ${(totalMs / 1000).toFixed(1)}s`);
  console.log(`Finished at: ${new Date().toISOString()}`);

  const hasFailures = results.some((r) => !r.success);
  if (hasFailures) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal pipeline error:', err);
  process.exit(1);
});
