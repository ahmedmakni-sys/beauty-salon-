import { supabase } from './supabase'
import { normalizePhone } from './format'

const CLIENT_COLUMNS = 'id, full_name, phone, notes, total_haircuts, cycle_position, cycle_number, created_at, updated_at'

function unwrap({ data, error, count }) {
  if (error) throw error
  return count !== undefined && count !== null ? { data, count } : data
}

// PostgREST : on échappe les caractères qui ont un sens dans un filtre "or".
const safeTerm = (s) => s.replace(/[,()*%\\]/g, ' ').trim()

export async function listClients({ search = '', nearReward = null, page = 0, pageSize = 25 } = {}) {
  let q = supabase.from('clients').select(CLIENT_COLUMNS, { count: 'exact' })
  const term = safeTerm(search)
  if (term) {
    const digits = normalizePhone(term).replace('+', '')
    q = digits.length >= 2 && /^\+?\d+$/.test(normalizePhone(term))
      ? q.ilike('phone', `%${digits}%`)
      : q.ilike('full_name', `%${term}%`)
  }
  if (nearReward) q = q.in('cycle_position', nearReward)
  q = q.order('created_at', { ascending: false }).range(page * pageSize, page * pageSize + pageSize - 1)
  return unwrap(await q)
}

export async function listAllClients() {
  return unwrap(await supabase.from('clients').select(CLIENT_COLUMNS).order('full_name').limit(10000))
}

export async function getClient(id) {
  return unwrap(await supabase.from('clients').select(CLIENT_COLUMNS).eq('id', id).maybeSingle())
}

export async function findClientByPhone(phone) {
  return unwrap(await supabase.from('clients').select(CLIENT_COLUMNS).eq('phone', normalizePhone(phone)).maybeSingle())
}

export async function createClient(values) {
  return unwrap(await supabase.from('clients').insert(values).select(CLIENT_COLUMNS).single())
}

export async function updateClient(id, values) {
  return unwrap(await supabase.from('clients').update(values).eq('id', id).select(CLIENT_COLUMNS).single())
}

export async function deleteClient(id) {
  const { error } = await supabase.from('clients').delete().eq('id', id)
  if (error) throw error
}

const VISIT_COLUMNS = 'id, client_id, visit_type, base_price, discount_amount, amount_paid, cycle_number, cycle_position, created_at, clients(full_name, phone)'

export async function listVisits({ clientId, type, from, to, search = '', page = 0, pageSize = 25, all = false } = {}) {
  const term = safeTerm(search)
  const cols = term ? VISIT_COLUMNS.replace('clients(', 'clients!inner(') : VISIT_COLUMNS
  let q = supabase.from('visits').select(cols, { count: 'exact' })
  if (clientId) q = q.eq('client_id', clientId)
  if (type) q = q.eq('visit_type', type)
  if (from) q = q.gte('created_at', new Date(`${from}T00:00:00`).toISOString())
  if (to) q = q.lte('created_at', new Date(`${to}T23:59:59`).toISOString())
  if (term) q = q.ilike('clients.full_name', `%${term}%`)
  q = q.order('created_at', { ascending: false })
  q = all ? q.limit(10000) : q.range(page * pageSize, page * pageSize + pageSize - 1)
  return unwrap(await q)
}

export async function listRewards({ clientId, type, page = 0, pageSize = 25 } = {}) {
  let q = supabase
    .from('rewards')
    .select('id, client_id, visit_id, reward_type, amount, cycle_number, created_at, clients(full_name, phone)', { count: 'exact' })
  if (clientId) q = q.eq('client_id', clientId)
  if (type) q = q.eq('reward_type', type)
  q = q.order('created_at', { ascending: false }).range(page * pageSize, page * pageSize + pageSize - 1)
  return unwrap(await q)
}

export async function registerVisit(clientId, idempotencyKey) {
  return unwrap(await supabase.rpc('register_visit', { p_client_id: clientId, p_idempotency_key: idempotencyKey }))
}

export async function getDashboardStats() {
  return unwrap(await supabase.rpc('dashboard_stats'))
}

export async function getSettings() {
  return unwrap(await supabase.from('salon_settings').select('*').eq('id', 1).maybeSingle())
}

export async function updateSettings(values) {
  return unwrap(await supabase.from('salon_settings').update(values).eq('id', 1).select('*').single())
}
