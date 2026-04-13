import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { compile } from "json-schema-to-typescript";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "..");
const schemaPath = path.join(repositoryRoot, "src/schema/schema.json");
const outputPath = path.join(repositoryRoot, "src/types/generated.ts");

/**
 * @typedef {null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue }} JsonValue
 * @typedef {{
 *   type?: string | string[];
 *   properties?: Record<string, JsonSchema>;
 *   required?: string[];
 *   items?: JsonSchema | JsonSchema[];
 *   anyOf?: JsonSchema[];
 *   oneOf?: JsonSchema[];
 *   allOf?: JsonSchema[];
 *   additionalProperties?: boolean | JsonSchema;
 *   $defs?: Record<string, JsonSchema>;
 *   definitions?: Record<string, JsonSchema>;
 * } & { [key: string]: JsonValue }} JsonSchema
 */

/**
 * @param {JsonSchema | JsonValue} schema
 */
function normalizeNullableProperties(schema) {
  if (!schema || typeof schema !== "object" || Array.isArray(schema)) {
    return;
  }

  if (schema.properties) {
    const required = new Set(schema.required ?? []);

    for (const [propertyName, propertySchema] of Object.entries(schema.properties)) {
      normalizeNullableProperties(propertySchema);

      if (isNullableSchema(propertySchema)) {
        required.add(propertyName);
      }
    }

    if (required.size > 0) {
      schema.required = [...required];
    }
  }

  if (schema.items) {
    if (Array.isArray(schema.items)) {
      schema.items.forEach(normalizeNullableProperties);
    } else {
      normalizeNullableProperties(schema.items);
    }
  }

  for (const compositeKey of ["anyOf", "oneOf", "allOf"]) {
    const compositeSchemas = schema[compositeKey];
    if (Array.isArray(compositeSchemas)) {
      compositeSchemas.forEach(normalizeNullableProperties);
    }
  }

  if (schema.additionalProperties && typeof schema.additionalProperties === "object") {
    normalizeNullableProperties(schema.additionalProperties);
  }

  for (const definitionGroup of [schema.$defs, schema.definitions]) {
    if (!definitionGroup) {
      continue;
    }

    for (const definition of Object.values(definitionGroup)) {
      normalizeNullableProperties(definition);
    }
  }
}

/**
 * @param {JsonSchema | JsonValue} schema
 * @returns {boolean}
 */
function isNullableSchema(schema) {
  if (!schema || typeof schema !== "object" || Array.isArray(schema)) {
    return false;
  }

  if (Array.isArray(schema.type) && schema.type.includes("null")) {
    return true;
  }

  for (const compositeKey of ["anyOf", "oneOf"]) {
    const compositeSchemas = schema[compositeKey];
    if (Array.isArray(compositeSchemas) && compositeSchemas.some(isNullSchema)) {
      return true;
    }
  }

  return false;
}

/**
 * @param {JsonSchema | JsonValue} schema
 * @returns {boolean}
 */
function isNullSchema(schema) {
  return Boolean(schema && typeof schema === "object" && !Array.isArray(schema) && schema.type === "null");
}

const schemaContents = await readFile(schemaPath, "utf8");
/** @type {JsonSchema} */
const schema = JSON.parse(schemaContents);
const normalizedSchema = JSON.parse(JSON.stringify(schema));

normalizeNullableProperties(normalizedSchema);

const generatedTypes = await compile(
  normalizedSchema,
  normalizedSchema.title ?? "CatchDataGoldSchemas",
  {
    format: true,
    unreachableDefinitions: true,
    unknownAny: true,
  },
);

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, generatedTypes);
