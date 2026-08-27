import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { validateUmlSequenceSpec } from "../src/engines/uml-sequence/schema.js";

type Result = ReturnType<typeof validateUmlSequenceSpec>;

function errorPaths(result: Result): string[] {
  assert.equal(result.ok, false);
  if (result.ok) throw new Error("unreachable");
  return result.errors.map((e) => e.path);
}

function errorMessages(result: Result): string[] {
  assert.equal(result.ok, false);
  if (result.ok) throw new Error("unreachable");
  return result.errors.map((e) => e.message);
}

const base = {
  type: "uml-sequence",
  version: "1",
  participants: [
    { id: "a", name: "A" },
    { id: "b", name: "B" },
  ],
};

describe("uml-sequence spec validation", () => {
  test("accepts a valid minimal spec and applies defaults", () => {
    const result = validateUmlSequenceSpec({
      ...base,
      messages: [{ id: "m1", from: "a", to: "b" }],
    });
    assert.equal(result.ok, true, result.ok ? undefined : JSON.stringify(result.errors));
    if (!result.ok) return;
    assert.equal(result.spec.theme, "clean-light");
    assert.equal(result.spec.direction, "auto");
    assert.deepEqual(result.spec.fragments, []);
    assert.equal(result.spec.participants[0].type, "object");
    assert.equal(result.spec.messages[0].kind, "sync");
  });

  test("accepts a full spec with all message kinds, actor, stereotype, and fragments", () => {
    const result = validateUmlSequenceSpec({
      type: "uml-sequence",
      version: "1",
      title: "Order flow",
      theme: "midnight-dark",
      direction: "down",
      participants: [
        { id: "user", name: "User", type: "actor" },
        { id: "ctrl", name: "OrderCtrl", stereotype: "control" },
        { id: "repo", name: "OrderRepo", stereotype: "entity" },
      ],
      messages: [
        { id: "m1", from: "user", to: "ctrl", label: "place()", kind: "sync", activation: true },
        { id: "m2", from: "ctrl", to: "repo", label: "save()", kind: "async" },
        { id: "m3", from: "repo", to: "ctrl", label: "id", kind: "reply" },
        { id: "m4", from: "ctrl", to: "ctrl", label: "validate()", kind: "self" },
      ],
      fragments: [
        { id: "f1", kind: "alt", label: "valid order", participants: ["ctrl", "repo"], messages: ["m2", "m3"] },
        { id: "f2", kind: "loop", participants: ["user", "ctrl"], messages: ["m1"] },
      ],
    });
    assert.equal(result.ok, true, result.ok ? undefined : JSON.stringify(result.errors));
  });

  test("rejects a fragment whose covered message leaves its participant span", () => {
    const result = validateUmlSequenceSpec({
      ...base,
      messages: [{ id: "m1", from: "a", to: "b" }],
      fragments: [{ id: "f1", kind: "alt", participants: ["a"], messages: ["m1"] }],
    });
    const paths = errorPaths(result);
    const messages = errorMessages(result);
    assert.ok(paths.includes("fragments.0.participants"), `expected fragments.0.participants in ${JSON.stringify(paths)}`);
    assert.ok(messages.some((m) => m.includes("span")), "error should mention the participant span");
  });

  test("requires the type discriminator", () => {
    const result = validateUmlSequenceSpec({ version: "1", participants: base.participants });
    assert.equal(result.ok, false);
  });

  test("rejects a wrong type discriminator", () => {
    const result = validateUmlSequenceSpec({ ...base, type: "uml-class" });
    assert.equal(result.ok, false);
  });

  test("rejects a spec with no participants, explaining why", () => {
    const result = validateUmlSequenceSpec({ type: "uml-sequence", version: "1", participants: [] });
    const messages = errorMessages(result);
    assert.ok(messages.some((m) => m.includes("at least one participant")), "error should mention at least one participant");
  });

  test("rejects a duplicate participant id with the field path", () => {
    const result = validateUmlSequenceSpec({
      ...base,
      participants: [
        { id: "a", name: "A" },
        { id: "a", name: "A2" },
      ],
    });
    const paths = errorPaths(result);
    assert.ok(paths.includes("participants.1.id"), `expected participants.1.id in ${JSON.stringify(paths)}`);
  });

  test("rejects a duplicate message id with the field path", () => {
    const result = validateUmlSequenceSpec({
      ...base,
      messages: [
        { id: "m1", from: "a", to: "b" },
        { id: "m1", from: "b", to: "a" },
      ],
    });
    const paths = errorPaths(result);
    assert.ok(paths.includes("messages.1.id"), `expected messages.1.id in ${JSON.stringify(paths)}`);
  });

  test("rejects a duplicate fragment id with the field path", () => {
    const result = validateUmlSequenceSpec({
      ...base,
      messages: [{ id: "m1", from: "a", to: "b" }],
      fragments: [
        { id: "f1", kind: "alt", participants: ["a"], messages: ["m1"] },
        { id: "f1", kind: "opt", participants: ["b"], messages: ["m1"] },
      ],
    });
    const paths = errorPaths(result);
    assert.ok(paths.includes("fragments.1.id"), `expected fragments.1.id in ${JSON.stringify(paths)}`);
  });

  test("rejects a message referencing an unknown participant, listing the defined ones", () => {
    const result = validateUmlSequenceSpec({
      ...base,
      messages: [{ id: "m1", from: "ghost", to: "b" }],
    });
    const paths = errorPaths(result);
    const messages = errorMessages(result);
    assert.ok(paths.includes("messages.0.from"), `expected messages.0.from in ${JSON.stringify(paths)}`);
    assert.ok(messages.some((m) => m.includes("ghost") && m.includes("a") && m.includes("b")), "error should name the missing participant and list defined ones");
  });

  test("rejects a self message whose from and to differ", () => {
    const result = validateUmlSequenceSpec({
      ...base,
      messages: [{ id: "m1", from: "a", to: "b", kind: "self" }],
    });
    const paths = errorPaths(result);
    assert.ok(paths.includes("messages.0.kind"), `expected messages.0.kind in ${JSON.stringify(paths)}`);
  });

  test("rejects a fragment referencing an unknown participant", () => {
    const result = validateUmlSequenceSpec({
      ...base,
      messages: [{ id: "m1", from: "a", to: "b" }],
      fragments: [{ id: "f1", kind: "alt", participants: ["ghost"], messages: ["m1"] }],
    });
    const paths = errorPaths(result);
    assert.ok(paths.includes("fragments.0.participants"), `expected fragments.0.participants in ${JSON.stringify(paths)}`);
  });

  test("rejects a fragment referencing an unknown message", () => {
    const result = validateUmlSequenceSpec({
      ...base,
      messages: [{ id: "m1", from: "a", to: "b" }],
      fragments: [{ id: "f1", kind: "alt", participants: ["a"], messages: ["ghost"] }],
    });
    const paths = errorPaths(result);
    assert.ok(paths.includes("fragments.0.messages"), `expected fragments.0.messages in ${JSON.stringify(paths)}`);
  });

  test("rejects a message covered by two fragments, pointing at the second fragment", () => {
    const result = validateUmlSequenceSpec({
      ...base,
      messages: [
        { id: "m1", from: "a", to: "b" },
        { id: "m2", from: "b", to: "a" },
      ],
      fragments: [
        { id: "f1", kind: "alt", participants: ["a"], messages: ["m1"] },
        { id: "f2", kind: "opt", participants: ["b"], messages: ["m1"] },
      ],
    });
    const paths = errorPaths(result);
    const messages = errorMessages(result);
    assert.ok(paths.includes("fragments.1.messages"), `expected fragments.1.messages in ${JSON.stringify(paths)}`);
    assert.ok(messages.some((m) => m.includes("f1")), "error should name the fragment that already covers the message");
  });

  test("rejects a fragment whose messages are out of spec order", () => {
    const result = validateUmlSequenceSpec({
      ...base,
      messages: [
        { id: "m1", from: "a", to: "b" },
        { id: "m2", from: "b", to: "a" },
      ],
      fragments: [{ id: "f1", kind: "alt", participants: ["a"], messages: ["m2", "m1"] }],
    });
    const paths = errorPaths(result);
    assert.ok(paths.includes("fragments.0.messages"), `expected fragments.0.messages in ${JSON.stringify(paths)}`);
  });

  test("accepts a spec with no messages or fragments", () => {
    const result = validateUmlSequenceSpec(base);
    assert.equal(result.ok, true, result.ok ? undefined : JSON.stringify(result.errors));
  });

  test("rejects an invalid participant type value", () => {
    const result = validateUmlSequenceSpec({
      type: "uml-sequence",
      version: "1",
      participants: [{ id: "a", name: "A", type: "service" }],
    });
    assert.equal(result.ok, false);
  });

  test("rejects an invalid fragment kind, listing the allowed kinds", () => {
    const result = validateUmlSequenceSpec({
      ...base,
      messages: [{ id: "m1", from: "a", to: "b" }],
      fragments: [{ id: "f1", kind: "critical", participants: ["a"], messages: ["m1"] }],
    });
    assert.equal(result.ok, false);
    const messages = errorMessages(result);
    assert.ok(messages.some((m) => m.includes("alt") && m.includes("par")), "error should list allowed fragment kinds");
  });
});
