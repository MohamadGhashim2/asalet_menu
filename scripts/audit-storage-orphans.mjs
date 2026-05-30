import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const BUCKET = 'menu-images'
const PAGE_SIZE = 1000

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

function getSupabaseConfig() {
  loadLocalEnv()

  const supabaseUrl = requireEnv('NEXT_PUBLIC_SUPABASE_URL')
  const supabaseAnonKey = requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
  const adminEmail = requireEnv('NEXT_PUBLIC_ADMIN_LOGIN_EMAIL')
  const adminPassword = process.env.ADMIN_LOGIN_PASSWORD || process.env.ADMIN_ACCESS_CODE

  if (!adminPassword) {
    throw new Error('Missing ADMIN_LOGIN_PASSWORD or ADMIN_ACCESS_CODE for admin sign-in')
  }

  return { supabaseUrl, supabaseAnonKey, adminEmail, adminPassword }
}

function getMenuImageStoragePath(url, supabaseUrl) {
  const trimmedUrl = typeof url === 'string' ? url.trim() : ''
  const publicPrefix = `/storage/v1/object/public/${BUCKET}/`

  if (!trimmedUrl || trimmedUrl.includes('/menu-assets/')) {
    return null
  }

  try {
    const parsedUrl = new URL(trimmedUrl)
    const parsedSupabaseUrl = new URL(supabaseUrl)

    if (parsedUrl.origin !== parsedSupabaseUrl.origin) {
      return null
    }

    if (!parsedUrl.pathname.startsWith(publicPrefix)) {
      return null
    }

    const encodedPath = parsedUrl.pathname.slice(publicPrefix.length)
    return encodedPath ? decodeURIComponent(encodedPath) : null
  } catch {
    return null
  }
}

function getFileSize(file) {
  const metadata = file.metadata || {}
  const size = Number(
    metadata.size ??
    metadata.contentLength ??
    metadata.ContentLength ??
    metadata.content_length ??
    0
  )

  return Number.isFinite(size) ? size : 0
}

function formatBytes(bytes) {
  if (!bytes) return '0 B'

  const units = ['B', 'KB', 'MB', 'GB']
  let value = bytes
  let unitIndex = 0

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex += 1
  }

  return `${value.toFixed(unitIndex === 0 ? 0 : 2)} ${units[unitIndex]}`
}

async function signInAdmin() {
  const { supabaseUrl, supabaseAnonKey, adminEmail, adminPassword } = getSupabaseConfig()
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

  return { supabase, supabaseUrl }
}

async function listStorageFiles(supabase, prefix = '') {
  const files = []
  let offset = 0

  while (true) {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .list(prefix, {
        limit: PAGE_SIZE,
        offset,
        sortBy: { column: 'name', order: 'asc' },
      })

    if (error) {
      throw new Error(`Storage list failed for "${prefix || '/'}": ${error.message}`)
    }

    if (!data || data.length === 0) {
      break
    }

    for (const entry of data) {
      const entryPath = prefix ? `${prefix}/${entry.name}` : entry.name
      const isFolder = entry.id === null || entry.metadata === null || entry.metadata === undefined

      if (isFolder) {
        files.push(...await listStorageFiles(supabase, entryPath))
      } else {
        files.push({ path: entryPath, size: getFileSize(entry) })
      }
    }

    if (data.length < PAGE_SIZE) {
      break
    }

    offset += PAGE_SIZE
  }

  return files
}

async function fetchImageUrls(supabase, tableName) {
  const urls = []
  let from = 0

  while (true) {
    const { data, error } = await supabase
      .from(tableName)
      .select('image_url')
      .not('image_url', 'is', null)
      .order('id', { ascending: true })
      .range(from, from + PAGE_SIZE - 1)

    if (error) {
      throw new Error(`Failed to fetch ${tableName}.image_url: ${error.message}`)
    }

    for (const row of data || []) {
      if (typeof row.image_url === 'string' && row.image_url.trim()) {
        urls.push(row.image_url.trim())
      }
    }

    if (!data || data.length < PAGE_SIZE) {
      break
    }

    from += PAGE_SIZE
  }

  return urls
}

export async function buildStorageOrphanAudit() {
  const { supabase, supabaseUrl } = await signInAdmin()

  try {
    const [storageFiles, itemImageUrls, categoryImageUrls] = await Promise.all([
      listStorageFiles(supabase),
      fetchImageUrls(supabase, 'menu_items'),
      fetchImageUrls(supabase, 'categories'),
    ])

    const referencedImageUrls = [...itemImageUrls, ...categoryImageUrls]
    const referencedStoragePaths = new Set(
      referencedImageUrls
        .map(url => getMenuImageStoragePath(url, supabaseUrl))
        .filter(Boolean)
    )
    const orphanFiles = storageFiles.filter(file => !referencedStoragePaths.has(file.path))
    const estimatedOrphanBytes = orphanFiles.reduce((sum, file) => sum + file.size, 0)

    return {
      storageFiles,
      referencedImageUrls,
      referencedStoragePaths,
      orphanFiles,
      estimatedOrphanBytes,
    }
  } finally {
    await supabase.auth.signOut()
  }
}

export function printStorageOrphanAudit(audit) {
  console.log(`Bucket: ${BUCKET}`)
  console.log(`Total storage files: ${audit.storageFiles.length}`)
  console.log(`Total referenced image URLs: ${audit.referencedImageUrls.length}`)
  console.log(`Unique referenced menu-images paths: ${audit.referencedStoragePaths.size}`)
  console.log(`Orphan file count: ${audit.orphanFiles.length}`)
  console.log(`Estimated orphan size: ${formatBytes(audit.estimatedOrphanBytes)}`)

  if (audit.orphanFiles.length > 0) {
    console.log('\nOrphan file paths:')
    for (const file of audit.orphanFiles) {
      const sizeSuffix = file.size ? ` (${formatBytes(file.size)})` : ''
      console.log(`- ${file.path}${sizeSuffix}`)
    }
  }
}

async function main() {
  const audit = await buildStorageOrphanAudit()
  printStorageOrphanAudit(audit)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => {
    console.error(error.message)
    process.exitCode = 1
  })
}
