import { buildStorageOrphanAudit, printStorageOrphanAudit } from './audit-storage-orphans.mjs'
import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'
import path from 'node:path'

const BUCKET = 'menu-images'
const DELETE_BATCH_SIZE = 100

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return

  const content = fs.readFileSync(filePath, 'utf8')
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const separatorIndex = trimmed.indexOf('=')
    if (separatorIndex === -1) continue

    const key = trimmed.slice(0, separatorIndex).trim()
    let value = trimmed.slice(separatorIndex + 1).trim()

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }

    if (key && process.env[key] === undefined) {
      process.env[key] = value
    }
  }
}

function loadLocalEnv() {
  const cwd = process.cwd()
  loadEnvFile(path.join(cwd, '.env.local'))
  loadEnvFile(path.join(cwd, '.env'))
}

function requireEnv(name) {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

async function signInAdmin() {
  loadLocalEnv()

  const supabaseUrl = requireEnv('NEXT_PUBLIC_SUPABASE_URL')
  const supabaseAnonKey = requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
  const adminEmail = requireEnv('NEXT_PUBLIC_ADMIN_LOGIN_EMAIL')
  const adminPassword = process.env.ADMIN_LOGIN_PASSWORD || process.env.ADMIN_ACCESS_CODE

  if (!adminPassword) {
    throw new Error('Missing ADMIN_LOGIN_PASSWORD or ADMIN_ACCESS_CODE for admin sign-in')
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  const { error } = await supabase.auth.signInWithPassword({
    email: adminEmail,
    password: adminPassword,
  })

  if (error) {
    throw new Error(`Admin sign-in failed: ${error.message}`)
  }

  return supabase
}

function chunk(array, size) {
  const chunks = []
  for (let index = 0; index < array.length; index += size) {
    chunks.push(array.slice(index, index + size))
  }
  return chunks
}

async function removeBatch(supabase, paths) {
  const { data, error } = await supabase.storage.from(BUCKET).remove(paths)

  if (!error) {
    for (const pathToDelete of paths) {
      console.log(`Deleted: ${pathToDelete}`)
    }
    return { data, error: null }
  }

  console.error(`Batch delete failed for ${paths.length} files: ${error.message}`)
  console.error('Retrying files one by one...')

  for (const pathToDelete of paths) {
    const { error: singleError } = await supabase.storage.from(BUCKET).remove([pathToDelete])
    if (singleError) {
      console.error(`Failed: ${pathToDelete} - ${singleError.message}`)
    } else {
      console.log(`Deleted: ${pathToDelete}`)
    }
  }

  return { data: null, error }
}

async function main() {
  if (!process.argv.includes('--confirm')) {
    console.error('Refusing to delete without --confirm.')
    console.error('Run: node scripts/delete-storage-orphans.mjs --confirm')
    process.exitCode = 1
    return
  }

  const audit = await buildStorageOrphanAudit()
  printStorageOrphanAudit(audit)

  if (audit.orphanFiles.length === 0) {
    console.log('\nNo orphan files to delete.')
    return
  }

  const supabase = await signInAdmin()

  try {
    console.log(`\nDeleting ${audit.orphanFiles.length} orphan files from ${BUCKET}...`)

    for (const batch of chunk(audit.orphanFiles.map(file => file.path), DELETE_BATCH_SIZE)) {
      await removeBatch(supabase, batch)
    }

    console.log('Delete run finished.')
  } finally {
    await supabase.auth.signOut()
  }
}

main().catch(error => {
  console.error(error.message)
  process.exitCode = 1
})
