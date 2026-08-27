#!/usr/bin/env node
/**
 * Export only OSHA Part 1926 notes from the local Obsidian OSHA vault into
 * Field Talk's flat corpus directory. CBG/company standards are never read.
 *
 * Usage:
 *   node scripts/import-osha-vault.mjs
 *   node scripts/import-osha-vault.mjs --source "/path/to/1926 - Construction"
 *   node scripts/import-osha-vault.mjs --output data/osha-1926
 */

import { readdir, readFile, mkdir, writeFile } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';
import process from 'node:process';

const DEFAULT_SOURCE = '/Users/nickrogoff/Desktop/Obsidian Vault/osha-vault/vault/Standards/1926 - Construction';
const DEFAULT_OUTPUT = 'data/osha-1926';

function parseArgs(argv) {
  const args = { source: DEFAULT_SOURCE, output: DEFAULT_OUTPUT };
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === '--source') args.source = argv[++i];
    else if (argv[i] === '--output') args.output = argv[++i];
    else throw new Error(`Unknown argument: ${argv[i]}`);
  }
  return args;
}

async function collectMarkdown(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await collectMarkdown(path));
    else if (entry.isFile() && entry.name.endsWith('.md')) files.push(path);
  }
  return files.sort();
}

function parseFrontmatter(raw, file) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) throw new Error(`${file}: missing frontmatter`);

  const fields = {};
  for (const line of match[1].split(/\r?\n/)) {
    const separator = line.indexOf(':');
    if (separator === -1) continue;
    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    fields[key] = value === 'null' ? '' : value;
  }
  return { fields, body: raw.slice(match[0].length).trim() };
}

function yamlQuote(value) {
  return JSON.stringify(value ?? '');
}

function normalizeBody(body) {
  // Keep the regulatory text, but remove Obsidian's generated relationship and
  // planning blocks so embeddings contain source material only.
  const withoutGeneratedBlocks = body.split('<!-- osha-related:start -->')[0].trim();
  return withoutGeneratedBlocks
    .replace(/\[\[([^\]]+)\]\]/g, (_match, target) => target.split('|')[0].split('#')[0])
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function outputName(citation) {
  return `${citation.replace(/[^A-Za-z0-9._-]+/g, '_')}.md`;
}

function normalizeNote(raw, file) {
  const { fields, body } = parseFrontmatter(raw, file);
  const citation = fields.citation;
  const sourceUrl = fields.source_url;
  const normalizedBody = normalizeBody(body);
  if (!citation) throw new Error(`${file}: missing citation`);
  if (!sourceUrl) throw new Error(`${file}: missing source_url`);
  if (!normalizedBody) throw new Error(`${file}: empty regulatory body`);

  const titleMatch = normalizedBody.match(/^#\s+(.+)$/m);
  const title = titleMatch?.[1]?.trim() || basename(file, '.md');
  const bodyWithoutHeading = titleMatch
    ? normalizedBody.replace(/^#\s+.+(?:\r?\n|$)/, '').trim()
    : normalizedBody;
  const frontmatter = [
    '---',
    `citation: ${yamlQuote(citation)}`,
    `subpart: ${yamlQuote(fields.subpart)}`,
    `subpart_title: ${yamlQuote(fields.subpart_title)}`,
    `industry: ${yamlQuote(fields.industry || 'construction')}`,
    `source_url: ${yamlQuote(sourceUrl)}`,
    `current_as_of: ${fields.current_as_of || ''}`,
    'official: false',
    '---',
    '',
    `# ${title}`,
    '',
    bodyWithoutHeading,
    '',
  ].join('\n');

  return { citation, filename: outputName(citation), content: frontmatter };
}

async function main() {
  const args = parseArgs(process.argv);
  const source = resolve(args.source);
  const output = resolve(args.output);
  const files = await collectMarkdown(source);
  if (files.length === 0) throw new Error(`No Markdown files found under ${source}`);

  const notes = await Promise.all(files.map(async (file) => normalizeNote(await requireFile(file), file)));
  const citations = new Set();
  for (const note of notes) {
    if (citations.has(note.citation)) throw new Error(`Duplicate citation: ${note.citation}`);
    citations.add(note.citation);
  }

  await mkdir(output, { recursive: true });
  for (const note of notes) await writeFile(join(output, note.filename), note.content, 'utf8');

  console.log(`Imported ${notes.length} OSHA Part 1926 notes from:`);
  console.log(`  ${source}`);
  console.log(`Into:`);
  console.log(`  ${output}`);
  console.log(`Unique citations: ${citations.size}`);
}

// Keep file reads async while preserving useful per-file errors above.
const fileCache = new Map();
async function requireFile(path) {
  if (!fileCache.has(path)) fileCache.set(path, await readFile(path, 'utf8'));
  return fileCache.get(path);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
