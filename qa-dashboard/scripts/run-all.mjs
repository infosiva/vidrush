#!/usr/bin/env node
/**
 * CLI runner — runs visual-qa.mjs against all registered projects.
 * Usage:
 *   node qa-dashboard/scripts/run-all.mjs           # all projects
 *   node qa-dashboard/scripts/run-all.mjs speakiq   # single project
 *   node qa-dashboard/scripts/run-all.mjs --fail    # only show failures
 */

import { execSync } from 'child_process'
import { existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dir = dirname(fileURLToPath(import.meta.url))
const AGENTS = join(__dir, '..', '..')
const QA_SCRIPT = join(AGENTS, 'scripts', 'visual-qa.mjs')

const PROJECTS = [
  { id: 'speakiq',       url: 'https://speakiq.app'             },
  { id: 'kwizzo',        url: 'https://kwizzo.app'              },
  { id: 'tutiq',         url: 'https://tutiq.app'               },
  { id: 'quizbites',     url: 'https://quizbites.app'           },
  { id: 'roamplan',      url: 'https://roamplan.app'            },
  { id: 'trackwealth',   url: 'https://trackwealth.app'         },
  { id: 'invoicemint',   url: 'https://invoicemint.app'         },
  { id: 'resumevault',   url: 'https://resumevault.app'         },
  { id: 'draftcal',      url: 'https://draftcal.app'            },
  { id: 'aicoachlab',    url: 'https://aicoachlab.app'          },
  { id: 'flighttracker', url: 'https://flightbrain.app'         },
  { id: 'worldtrends',   url: 'https://worldtrends.today'       },
  { id: 'myvitals',      url: 'https://myvitals.app'            },
  { id: 'pixelforge',    url: 'https://arcadeforge.app'         },
  { id: 'neuralos',      url: 'https://neuralagent.app'         },
  { id: 'bookingcall',   url: 'https://bookingcall.app'         },
  { id: 'mandirates',    url: 'https://mandirates.app'          },
  { id: 'nammatamil',    url: 'https://nammatamil.live'         },
  { id: 'anylocal',      url: 'https://anylocal.app'            },
  { id: 'weekendai',     url: 'https://weekendai.app'           },
  { id: 'protoforge',    url: 'https://protofast.app'           },
  { id: 'agenttrace',    url: 'https://agentlogs.app'           },
]

const args = process.argv.slice(2)
const singleFilter = args.find(a => !a.startsWith('--'))
const failOnly = args.includes('--fail')

const targets = singleFilter
  ? PROJECTS.filter(p => p.id === singleFilter)
  : PROJECTS

if (!targets.length) {
  console.error(`❌ No project found for: ${singleFilter}`)
  process.exit(1)
}

const summary = []

for (const proj of targets) {
  console.log(`\n${'─'.repeat(60)}`)
  console.log(`▶  ${proj.id}  →  ${proj.url}`)
  console.log('─'.repeat(60))

  let exit = 0
  try {
    execSync(
      `node ${QA_SCRIPT} --url ${proj.url} --project ${proj.id} --no-server`,
      { stdio: 'inherit', timeout: 60000 }
    )
  } catch (e) {
    exit = e.status ?? 2
  }
  summary.push({ id: proj.id, exit })
}

console.log(`\n${'═'.repeat(60)}`)
console.log('SUMMARY')
console.log('═'.repeat(60))
for (const s of summary) {
  const icon = s.exit === 0 ? '✅' : s.exit === 1 ? '⚠️' : '❌'
  if (!failOnly || s.exit !== 0) console.log(`${icon}  ${s.id}`)
}

const fails = summary.filter(s => s.exit === 2).length
const warns = summary.filter(s => s.exit === 1).length
const passes = summary.filter(s => s.exit === 0).length
console.log(`\n✅ ${passes}  ⚠️  ${warns}  ❌ ${fails}  /  ${summary.length} projects`)
process.exit(fails > 0 ? 2 : warns > 0 ? 1 : 0)
