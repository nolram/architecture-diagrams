#!/usr/bin/env node
// Validates architecture-diagrams/SKILL.md's frontmatter against the same
// rules used by the skill-creator plugin (see
// ~/.claude/plugins/.../skill-creator/scripts/quick_validate.py), without
// depending on Python/pyyaml -- just the `yaml` parser, already a project dependency.
import { readFileSync } from "node:fs";
import { parse as parseYaml } from "yaml";

const SKILL_MD_PATH = "architecture-diagrams/SKILL.md";
const ALLOWED_PROPERTIES = new Set(["name", "description", "license", "allowed-tools", "metadata", "compatibility"]);

function fail(message) {
  console.error(`Skill validation failed: ${message}`);
  process.exit(1);
}

const content = readFileSync(SKILL_MD_PATH, "utf-8");
const match = content.match(/^---\n([\s\S]*?)\n---/);
if (!match) fail("YAML frontmatter not found at the start of the file");

let frontmatter;
try {
  frontmatter = parseYaml(match[1]);
} catch (err) {
  fail(`Invalid YAML in frontmatter: ${(err).message}`);
}
if (typeof frontmatter !== "object" || frontmatter === null) fail("frontmatter must be a YAML object");

const unexpectedKeys = Object.keys(frontmatter).filter((k) => !ALLOWED_PROPERTIES.has(k));
if (unexpectedKeys.length > 0) {
  fail(`unexpected key(s): ${unexpectedKeys.join(", ")}. Allowed: ${[...ALLOWED_PROPERTIES].join(", ")}`);
}

const { name, description } = frontmatter;
if (!name) fail("missing 'name' field");
if (!description) fail("missing 'description' field");
if (typeof name !== "string" || !/^[a-z0-9-]+$/.test(name) || name.startsWith("-") || name.endsWith("-") || name.includes("--")) {
  fail(`'name' must be kebab-case (lowercase letters, digits, single hyphens): "${name}"`);
}
if (name.length > 64) fail(`'name' too long (${name.length} characters, max 64)`);
if (typeof description !== "string") fail("'description' must be a string");
if (description.includes("<") || description.includes(">")) fail("'description' cannot contain '<' or '>'");
if (description.length > 1024) fail(`'description' too long (${description.length} characters, max 1024)`);

console.log(`Valid skill: name="${name}", description is ${description.length} characters long.`);
