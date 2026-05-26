import { z } from 'zod'

export const CAPABILITY_IDS = [
  'biometric.authenticate',
  'camera.scanQr',
  'camera.capture',
  'gps.getCurrentPosition',
  'storage.pickFile',
] as const

export const capabilityIdSchema = z.enum(CAPABILITY_IDS)

export const permissionSchema = z.object({
  reason: z.string().min(1, 'Permission reason is required'),
})

export const manifestSchema = z.object({
  id: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/, 'ID must be lowercase alphanumeric with hyphens'),
  name: z.string().min(1),
  version: z.string().regex(/^\d+\.\d+\.\d+$/, 'Version must be semver (e.g. 1.0.0)'),
  runtime: z.literal('node').default('node'),
  entry: z.string().min(1),
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
