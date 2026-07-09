export type AuditCategory = 'classes' | 'other'

// Insert one audit_log row. Client call sites (browser supabase client, RLS-scoped) omit actorId and
// let it resolve from the current session; server routes running under the service-role client (RLS
// bypassed, no session) must pass actorId explicitly (the already-verified admin caller's id).
export async function logAction(
  supabase: any,
  params: {
    actorId?: string
    category: AuditCategory
    action_type: string
    target_type?: string
    target_id?: string
    details?: Record<string, any>
  }
): Promise<void> {
  let actorId = params.actorId
  if (!actorId) {
    const { data: { user } } = await supabase.auth.getUser()
    actorId = user?.id
  }
  if (!actorId) return
  await supabase.from('audit_log').insert({
    actor_id: actorId,
    category: params.category,
    action_type: params.action_type,
    target_type: params.target_type ?? null,
    target_id: params.target_id ?? null,
    details: params.details ?? null,
  })
}
