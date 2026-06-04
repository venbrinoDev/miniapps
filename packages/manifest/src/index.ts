export { manifestSchema, capabilityIdSchema, permissionSchema, argDefinitionSchema, commandDefinitionSchema, CAPABILITY_IDS } from './schema.js'
export type { MiniAppManifest, ArgDefinition, CommandDefinitionSchema } from './schema.js'
export { validateManifest, assertCapabilityAllowed } from './validate.js'
export type { ValidationResult } from './validate.js'
