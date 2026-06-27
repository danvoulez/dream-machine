import { existsSync, readFileSync } from 'node:fs'
import { dirname, isAbsolute, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptRoot = dirname(fileURLToPath(import.meta.url))
const root = dirname(scriptRoot)
const workspaceRoot = dirname(root)
const envelopeRoot = join(workspaceRoot, 'Dream-Machine-Envelope-Ledger')

const requiredFiles = [
  'docs/dream-machine-ownership.v0.yml',
  'docs/dream-machine-vocabulary.v0.yml',
  'docs/dream-machine-reference-map.v0.yml',
  'docs/dream-machine-core-technologies.v0.yml',
  'docs/dream-machine-installable-topology.v0.yml',
  'docs/dream-machine-crossing-map.v0.yml',
  'docs/dream-machine-conflict-map.v0.yml',
  'docs/logline-jurisdiction.v0.yml',
  'docs/envelope-jurisdiction.v0.yml',
  'docs/envelope-sanitization.v0.yml',
  'docs/envelope-proposal-to-logline-package.v0.yml',
  'docs/dream-machine-projections.v0.yml',
  'docs/dream-machine-projections.v0.schema.json',
  'docs/dream-machine-actions.v0.yml',
  'docs/dream-machine-portal-chief.v0.md',
]

const requiredSections = {
  'docs/dream-machine-ownership.v0.yml': [
    'status: draft_locked',
    'domains:',
    'completed_readiness:',
  ],
  'docs/dream-machine-vocabulary.v0.yml': [
    'banned_unqualified_terms:',
    'owned_terms:',
    'validator_rules:',
  ],
  'docs/dream-machine-reference-map.v0.yml': [
    'ref_kinds:',
    'allowed_reference_edges:',
    'reference_bundles:',
  ],
  'docs/dream-machine-core-technologies.v0.yml': [
    'technologies:',
    'excellence_bar:',
    'portal_runtime_policy:',
    'validator_rules:',
  ],
  'docs/dream-machine-installable-topology.v0.yml': [
    'installable:',
    'topology:',
    'portal_chief_flow:',
    'validation_rules:',
  ],
  'docs/dream-machine-crossing-map.v0.yml': [
    'crossing_edges:',
    'crossing_modes:',
    'forbidden_crossings:',
    'validation_rules:',
  ],
  'docs/dream-machine-conflict-map.v0.yml': [
    'precedence_order:',
    'conflict_rules:',
    'rebuild_rules:',
    'validation_rules:',
  ],
  'docs/envelope-proposal-to-logline-package.v0.yml': [
    'package_shape:',
    'slot_mapping:',
    'cannot_do:',
  ],
  'docs/dream-machine-projections.v0.yml': [
    'projection_response:',
    'cannot_do:',
    'standard_cannot_do:',
  ],
  'docs/dream-machine-actions.v0.yml': [
    'affordance_shape:',
    'standard_affordances:',
    'validation_rules:',
  ],
  'docs/dream-machine-projections.v0.schema.json': [
    '"$schema"',
    '"authoritative"',
    '"cannot_do"',
  ],
  'docs/dream-machine-portal-chief.v0.md': [
    '## Portal Chief',
    '## Responsibilities',
    '## Cannot Do',
  ],
}

const boardDocs = [
  join(envelopeRoot, 'docs/board/BOARD SPEC_v0.2.md'),
  join(envelopeRoot, 'docs/board/BOARD_DECISIONS_v0.1.md'),
  join(envelopeRoot, 'docs/board/BOARD_OBJECTS.md'),
  join(envelopeRoot, 'docs/board/BOARD_LIFECYCLE.md'),
  join(envelopeRoot, 'docs/board/BOARD_VERTICAL_SLICE.md'),
]

const allowPoisonedInRepo = new Set([
  'docs/dream-machine-ownership.v0.yml',
  'docs/dream-machine-vocabulary.v0.yml',
  'docs/envelope-sanitization.v0.yml',
])

const poisoned = /\b(candidate|candidates|Candidate|Candidates|admission|Admission|admitted|admit|admits|admitting|act|acts|Act|Acts)\b/g
const dependencyPath = /^\s+[a-zA-Z0-9_]+:\s+((?:\/[^\s]+)|(?:docs\/[^\s]+)|(?:Dream-Machine-[^\s]+))$/gm
const dependencyPathLine = /^\s+[a-zA-Z0-9_]+:\s+((?:\/[^\s]+)|(?:docs\/[^\s]+)|(?:Dream-Machine-[^\s]+))$/

const failures = []

function read(path) {
  const absolute = resolvePath(path)
  return readFileSync(absolute, 'utf8')
}

function exists(path) {
  const absolute = resolvePath(path)
  return existsSync(absolute)
}

function resolvePath(path) {
  if (!path) return path
  if (!isAbsolute(path)) {
    if (path.startsWith('Dream-Machine-')) {
      return join(workspaceRoot, path)
    }
    return join(root, path)
  }
  if (existsSync(path)) return path

  const repoMarker = '/Dream-Machine-'
  const markerIndex = path.indexOf(repoMarker)
  if (markerIndex >= 0) {
    const relativeFromWorkspace = path.slice(markerIndex + 1)
    return join(workspaceRoot, relativeFromWorkspace)
  }

  return path
}

function withoutPathLines(body) {
  return body
    .split('\n')
    .filter((line) => !dependencyPathLine.test(line))
    .filter((line) => !line.includes('/Dream-Machine-'))
    .join('\n')
}

for (const file of requiredFiles) {
  if (!exists(file)) {
    failures.push(`missing required contract: ${file}`)
  }
}

for (const [file, sections] of Object.entries(requiredSections)) {
  if (!exists(file)) continue

  const body = read(file)
  for (const section of sections) {
    if (!body.includes(section)) {
      failures.push(`${file}: missing section marker ${section}`)
    }
  }
}

for (const file of requiredFiles) {
  if (!exists(file)) continue

  const body = read(file)
  const matches = [...body.matchAll(dependencyPath)]
  for (const match of matches) {
    const target = match[1].trim()
    if (target.startsWith('/Users/ubl-ops/Downloads/')) continue
    if (!exists(target)) {
      failures.push(`${file}: dependency target does not exist: ${target}`)
    }
  }

  if (!allowPoisonedInRepo.has(file)) {
    const bad = [...withoutPathLines(body).matchAll(poisoned)].map((match) => match[0])
    if (bad.length > 0) {
      failures.push(`${file}: poisoned unqualified vocabulary: ${[...new Set(bad)].join(', ')}`)
    }
  }

  if (file.endsWith('.json')) {
    try {
      JSON.parse(body)
    } catch (error) {
      failures.push(`${file}: invalid JSON: ${error.message}`)
    }
  }
}

for (const file of boardDocs) {
  if (!exists(file)) {
    failures.push(`missing external Board doc: ${file}`)
    continue
  }

  const body = read(file)
  const matches = [...body.matchAll(poisoned)]
  const allowed = file.endsWith('BOARD SPEC_v0.2.md')
    ? matches.filter((match) => {
        const before = body.slice(0, match.index)
        const line = before.split('\n').length
        return line !== 9 && line !== 10
      })
    : matches

  if (allowed.length > 0) {
    failures.push(`${file}: poisoned Board vocabulary remains: ${[...new Set(allowed.map((match) => match[0]))].join(', ')}`)
  }
}

if (failures.length > 0) {
  console.error('Dream Machine contract validation failed:')
  for (const failure of failures) {
    console.error(`- ${failure}`)
  }
  process.exit(1)
}

console.log(`Dream Machine contract validation passed (${requiredFiles.length} contracts)`)
