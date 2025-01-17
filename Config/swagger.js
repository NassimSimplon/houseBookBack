import fs from 'fs';
import path from 'path';
import YAML from 'js-yaml';

/**
 * Load and merge Swagger YAML files from a directory.
 * @param {string} dirPath - Path to the directory containing Swagger YAML files.
 * @returns {object} - Combined Swagger document.
 */
export const loadSwaggerDocs = (dirPath) => {
  const paths = {};
  const schemas = {};
  const securitySchemes = {};

  try {
    const files = fs.readdirSync(dirPath).filter((file) => file.endsWith('.yaml'));

    files.forEach((file) => {
      const filePath = path.join(dirPath, file);
      const doc = YAML.load(fs.readFileSync(filePath, 'utf8'));

      if (doc?.paths) Object.assign(paths, doc.paths);
      if (doc?.components?.schemas) Object.assign(schemas, doc.components.schemas);
      if (doc?.components?.securitySchemes) Object.assign(securitySchemes, doc.components.securitySchemes);
    });
  } catch (error) {
    console.error(`Error loading Swagger docs from ${dirPath}:`, error.message);
  }

  return {
    openapi: '3.0.0',
    info: {
      title: `API Documentation - ${path.basename(dirPath)}`,
      version: '1.0.0',
    },
    paths,
    components: {
      schemas,
      securitySchemes,
    },
  };
};
