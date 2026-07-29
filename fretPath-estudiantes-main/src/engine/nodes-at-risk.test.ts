/**
 * Pins the edge-case semantics of `nodesAtRisk` — the proactive "this is about
 * to fall" warning. The signature is fixed by spec; these decisions are not, so
 * each one is fixed here. Change a decision in the engine and one of these turns
 * red.
 *
 * Decay is exponential at 3%/day once overdue (mastery × 0.97^d). With an item
 * mastered at 90 whose review is due exactly at `now`, its retention is
 * 90 × 0.97^d after d days: 82.1 at day 3, 79.7 at day 4 — so it crosses the 80
 * target between day 3 and day 4. That single fact drives the horizon tests.
 */

import { describe, expect, it } from 'vitest'
import { buildGraph, computeNodeStatus, nodesAtRisk } from './graph'
import { DAY_MS } from './srs'
import type { SkillNode, UserItemState } from './types'

const T0 = 1_750_000_000_000

function mkNode(id: string, items: string[], prerequisites: string[] = []): SkillNode {
  return { id, name: id, description: '', tier: 0, prerequisites, tags: [], items }
}

/** Mastered item (retention 90) whose review is due exactly at `now` (T0). */
function mkState(itemId: string, overrides: Partial<UserItemState> = {}): UserItemState {
  return {
    itemId,
    easiness: 2.5,
    interval: 6,
    repetitions: 3,
    mastery: 90,
    bestBpm: null,
    dueDate: T0,
    lastReviewed: T0 - 6 * DAY_MS,
    ...overrides,
  }
}

const idsAtRisk = (
  nodes: SkillNode[],
  states: Map<string, UserItemState>,
  horizonDays: number,
): string[] => nodesAtRisk(buildGraph(nodes), states, T0, horizonDays).map((n) => n.id)

describe('nodesAtRisk — a mastered node that will decay within the horizon', () => {
  it('flags a node whose average will cross below target inside the window', () => {
    const n = mkNode('N', ['n1'])
    const states = new Map([['n1', mkState('n1')]])
    // Crosses between day 3 and day 4; a 5-day horizon catches it.
    expect(idsAtRisk([n], states, 5)).toEqual(['N'])
  })

  it('does not flag a node that stays above target through the whole window', () => {
    const n = mkNode('N', ['n1'])
    const states = new Map([['n1', mkState('n1')]])
    // At day 3 it is still 82.1 ≥ 80.
    expect(idsAtRisk([n], states, 3)).toEqual([])
  })
})

describe('decision: risk is the node average, not the first item to dip', () => {
  it('does not flag while the average holds, even after one item is already below', () => {
    const n = mkNode('N', ['weak', 'strong'])
    const states = new Map([
      ['weak', mkState('weak')], // decays: 77.3 at day 5
      ['strong', mkState('strong', { mastery: 100, dueDate: T0 + 999 * DAY_MS })], // stays 100
    ])
    // Item `weak` is below 80 at day 5, but the node average (≈88.6) is not.
    expect(idsAtRisk([n], states, 5)).toEqual([])
  })

  it('flags once the average itself crosses below target', () => {
    const n = mkNode('N', ['weak', 'strong'])
    const states = new Map([
      ['weak', mkState('weak')],
      ['strong', mkState('strong', { mastery: 100, dueDate: T0 + 999 * DAY_MS })],
    ])
    // By day 14 the average (≈79.4) has dropped below the target.
    expect(idsAtRisk([n], states, 14)).toEqual(['N'])
  })
})

describe('decision: never-practiced nodes are not at risk', () => {
  it('excludes a node with a fresh, never-reviewed item', () => {
    const n = mkNode('N', ['n1'])
    const states = new Map([
      ['n1', mkState('n1', { mastery: 0, repetitions: 0, dueDate: null, lastReviewed: null })],
    ])
    expect(idsAtRisk([n], states, 30)).toEqual([])
  })

  it('excludes a node with no state at all', () => {
    const n = mkNode('N', ['n1'])
    expect(idsAtRisk([n], new Map(), 30)).toEqual([])
  })
})

describe('decision: nodes already below target are out (they already fell)', () => {
  it('excludes a node whose average is already below target today', () => {
    const n = mkNode('N', ['n1'])
    // Due 10 days ago → already decayed to ≈66 at now, below target.
    const states = new Map([['n1', mkState('n1', { dueDate: T0 - 10 * DAY_MS })]])
    expect(idsAtRisk([n], states, 30)).toEqual([])
  })
})

describe('decision: maintenance nodes get the same treatment', () => {
  it('flags a maintenance node that will decay within the horizon', () => {
    const n = mkNode('N', ['n1'])
    const states = new Map([['n1', mkState('n1', { interval: 21 })]])
    const g = buildGraph([n])
    // Confirm it really is in maintenance today, then confirm it is flagged.
    expect(computeNodeStatus(g, n, states, T0)).toBe('maintenance')
    expect(nodesAtRisk(g, states, T0, 5).map((x) => x.id)).toEqual(['N'])
  })
})

describe('decision: a node with no items is excluded', () => {
  it('never flags an itemless node', () => {
    const empty = mkNode('EMPTY', [])
    expect(idsAtRisk([empty], new Map(), 30)).toEqual([])
  })
})

describe('decision: the horizon is inclusive (crossing on day horizonDays counts)', () => {
  it('includes a node whose average first drops below target on the horizon day', () => {
    const n = mkNode('N', ['n1'])
    const states = new Map([['n1', mkState('n1')]])
    // Day 4 is the first day below 80 (79.7); with horizonDays = 4 it is in.
    expect(idsAtRisk([n], states, 4)).toEqual(['N'])
    // One day short of the crossing, it is out.
    expect(idsAtRisk([n], states, 3)).toEqual([])
  })
})
