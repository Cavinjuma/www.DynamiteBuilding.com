#!/usr/bin/env node
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

// Usage: node scripts/seed-admin.mjs --email=user@example.com --password=Secret123! --role=admin

const args = Object.fromEntries(process.argv.slice(2).map(p=>{
  const [k,v] = p.split('=');
  return [k.replace(/^--/,''), v];
}));

const email = args.email;
const password = args.password || 'ChangeMe123!';
const role = args.role || 'admin';

if (!email) {
  console.error('Missing --email');
  process.exit(1);
}

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const admin = createClient(url, serviceKey);

try {
  // 1) Create user (if not exists)
  const { data: existing } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const found = existing?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase());
  const user = found ? found : (await admin.auth.admin.createUser({ email, password, email_confirm: true })).data.user;

  if (!user) throw new Error('Failed to create or fetch user');

  // 2) Assign role in app_metadata
  const roles = new Set([...(user.app_metadata?.roles || [])]);
  roles.add(role);
  await admin.auth.admin.updateUserById(user.id, { app_metadata: { roles: Array.from(roles) } });

  console.log(`User ${email} is now roles=[${Array.from(roles).join(', ')}]`);
  process.exit(0);
} catch (e) {
  console.error('Error:', e.message || e);
  process.exit(1);
}






