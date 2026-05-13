import { z } from 'zod'

// Input the user supplies when creating a workspace.
export const CreateWorkspaceInput = z.object({
  name: z.string().min(1).max(120),
  backendRepoUrl: z.string().url(),
  frontendRepoUrl: z.string().url()
})
export type CreateWorkspaceInput = z.infer<typeof CreateWorkspaceInput>

// Full workspace row as stored + returned across IPC.
export const Workspace = z.object({
  id: z.string().uuid(),
  name: z.string(),
  backendRepoUrl: z.string(),
  frontendRepoUrl: z.string(),
  backendLocalPath: z.string().nullable(),
  frontendLocalPath: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string()
})
export type Workspace = z.infer<typeof Workspace>
