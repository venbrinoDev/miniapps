import { z } from 'zod'

export const CAPABILITY_IDS = [
  'biometric.authenticate',
  'camera.scanQr',
  'camera.capture',
  'gps.getCurrentPosition',
  'storage.pickFile',
  'providerProxy.call',
] as const

export const capabilityIdSchema = z.enum(CAPABILITY_IDS)

export const permissionSchema = z.object({
  reason: z.string().min(1, 'Permission reason is required'),
})

export const argDefinitionSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  required: z.boolean().optional(),
  type: z.enum(['string', 'number', 'boolean']).optional(),
})

export const commandDefinitionSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  semantic: z.string().min(1),
  args: z.array(argDefinitionSchema).optional(),
})

export const runtimeConfigSchema = z.object({
  engine: z.literal('node').default('node'),
  capabilities: z.array(capabilityIdSchema).default([]).optional(),
  providerProxy: z
    .object({
      providers: z.array(
        z.object({
          providerId: z
            .string()
            .min(2)
            .max(80)
            .regex(/^[a-z0-9][a-z0-9._-]*$/, 'providerId must be lowercase letters, numbers, dots, underscores, or dashes'),
          operationIds: z.array(
            z
              .string()
              .min(1)
              .max(80)
              .regex(/^[A-Za-z0-9][A-Za-z0-9._-]*$/, 'operationId must be letters, numbers, dots, underscores, or dashes'),
          ).default([]).optional(),
        }),
      ).default([]),
    })
    .optional(),
  compatibility: z
    .object({
      minHostVersion: z.string().optional(),
    })
    .optional(),
  execution: z.record(z.string(), z.unknown()).optional(),
})

export const manifestSchema = z.object({
  id: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/, 'ID must be lowercase alphanumeric with hyphens'),
  name: z.string().min(1),
  version: z.string().regex(/^\d+\.\d+\.\d+$/, 'Version must be semver (e.g. 1.0.0)'),
  runtime: z.union([z.literal('node'), runtimeConfigSchema]).default('node'),
  entry: z.string().min(1),
  description: z.string().optional(),
  category: z.string().optional(),
  instruction: z.string().optional(),
  files: z.array(z.string()).optional(),
  commands: z.array(commandDefinitionSchema).optional(),
  requiredCapabilities: z.array(capabilityIdSchema).default([]),
  permissions: z.record(capabilityIdSchema, permissionSchema).default({}),
  timeout: z.number().positive().optional(),
  compatibility: z
    .object({
      minHostVersion: z.string().optional(),
    })
    .optional(),
})

export type MiniAppManifest = z.infer<typeof manifestSchema>
export type ArgDefinition = z.infer<typeof argDefinitionSchema>
export type CommandDefinitionSchema = z.infer<typeof commandDefinitionSchema>
