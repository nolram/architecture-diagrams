// These helpers now live in the shared, dependency-free src/util/text.ts so the
// layout layer can use them without importing from the render layer. This file
// re-exports them for backward compatibility with existing render importers.
export { escapeXml, truncateToWidth, wrapText } from "../util/text.js";
