import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ParsedRoadmap } from '../repos/roadmaps.js';

// El MISMO lector de PDF que usa el cliente (src/parser.js en la raíz del repo): una sola fuente de verdad.
const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const parser = require(path.join(here, '../../../src/parser.js')) as { parsePdf: (lib: unknown, data: Uint8Array) => Promise<any> };

let pdfjs: unknown;
export async function parseRoadmapPdf(bytes: Uint8Array): Promise<ParsedRoadmap | null> {
  pdfjs ??= require('pdfjs-dist/legacy/build/pdf.js');
  const rm = await parser.parsePdf(pdfjs, bytes);
  if (!rm || !rm.phases?.length) return null;
  return {
    key: rm.key, title: rm.title, subtitle: rm.subtitle,
    phases: rm.phases.map((p: any) => ({ n: p.n, title: p.title, meta: p.meta, hours: p.hours, weeks: p.weeks, prompt: p.prompt, fields: p.fields, tasks: p.tasks.map((t: any) => ({ id: t.id, text: t.text, tag: t.tag })) }))
  };
}
