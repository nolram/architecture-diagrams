#!/usr/bin/env node
// Valida o frontmatter de architecture-diagrams/SKILL.md contra as mesmas regras
// usadas pelo plugin skill-creator (ver ~/.claude/plugins/.../skill-creator/scripts/quick_validate.py),
// sem depender de Python/pyyaml — só o parser `yaml` que já é dependência do projeto.
import { readFileSync } from "node:fs";
import { parse as parseYaml } from "yaml";

const SKILL_MD_PATH = "architecture-diagrams/SKILL.md";
const ALLOWED_PROPERTIES = new Set(["name", "description", "license", "allowed-tools", "metadata", "compatibility"]);

function fail(message) {
  console.error(`Validação da skill falhou: ${message}`);
  process.exit(1);
}

const content = readFileSync(SKILL_MD_PATH, "utf-8");
const match = content.match(/^---\n([\s\S]*?)\n---/);
if (!match) fail("frontmatter YAML não encontrado no início do arquivo");

let frontmatter;
try {
  frontmatter = parseYaml(match[1]);
} catch (err) {
  fail(`YAML inválido no frontmatter: ${(err).message}`);
}
if (typeof frontmatter !== "object" || frontmatter === null) fail("frontmatter deve ser um objeto YAML");

const unexpectedKeys = Object.keys(frontmatter).filter((k) => !ALLOWED_PROPERTIES.has(k));
if (unexpectedKeys.length > 0) {
  fail(`chave(s) inesperada(s): ${unexpectedKeys.join(", ")}. Permitidas: ${[...ALLOWED_PROPERTIES].join(", ")}`);
}

const { name, description } = frontmatter;
if (!name) fail("campo 'name' ausente");
if (!description) fail("campo 'description' ausente");
if (typeof name !== "string" || !/^[a-z0-9-]+$/.test(name) || name.startsWith("-") || name.endsWith("-") || name.includes("--")) {
  fail(`'name' deve ser kebab-case (letras minúsculas, dígitos, hífen simples): "${name}"`);
}
if (name.length > 64) fail(`'name' muito longo (${name.length} caracteres, máximo 64)`);
if (typeof description !== "string") fail("'description' deve ser string");
if (description.includes("<") || description.includes(">")) fail("'description' não pode conter '<' ou '>'");
if (description.length > 1024) fail(`'description' muito longa (${description.length} caracteres, máximo 1024)`);

console.log(`Skill válida: name="${name}", description tem ${description.length} caracteres.`);
