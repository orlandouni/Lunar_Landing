import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import ts from 'typescript'

const source = readFileSync(new URL('../src/lib/visibilityStates.ts', import.meta.url), 'utf8')
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } })
const { visibilityState, monthlyStates, VISIBILITY_STATES } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`)

test('every Sun/Earth combination has exactly one distinct state', () => {
  assert.equal(visibilityState(1, 1), 'both')
  assert.equal(visibilityState(1, 0), 'sunOnly')
  assert.equal(visibilityState(0, 1), 'earthOnly')
  assert.equal(visibilityState(0, 0), 'blackout')
  assert.equal(new Set(VISIBILITY_STATES.map((state) => state.id)).size, 4)
})

test('leap February accounts for all 696 hours and matches hourly states', () => {
  const times = Array.from({ length: 696 }, (_, i) => new Date(Date.UTC(2028, 1, 1, i)).toISOString())
  const sun = Uint8Array.from(times, (_, i) => Number(i % 4 < 2))
  const earth = Uint8Array.from(times, (_, i) => Number(i % 2 === 0))
  const [month] = monthlyStates(times, { sun, earth })
  assert.equal(month.month, '2028-02')
  assert.equal(month.total, 696)
  assert.deepEqual(month.counts, { both: 174, sunOnly: 174, earthOnly: 174, blackout: 174 })
  assert.equal(Object.values(month.counts).reduce((a, b) => a + b, 0), month.total)
})

test('monthly boundaries and exclusive Sun-only values preserve simultaneous visibility', () => {
  const months = monthlyStates(['2028-01-31T23:00:00Z', '2028-02-01T00:00:00Z', '2028-02-01T01:00:00Z'], {
    sun: new Uint8Array([0, 1, 0]), earth: new Uint8Array([0, 1, 1]),
  })
  assert.equal(months.length, 2)
  assert.equal(months[0].counts.blackout, 1)
  assert.deepEqual(months[1].counts, { both: 1, sunOnly: 0, earthOnly: 1, blackout: 0 })
  assert.deepEqual(monthlyStates([], { sun: new Uint8Array(), earth: new Uint8Array() }), [])
})
