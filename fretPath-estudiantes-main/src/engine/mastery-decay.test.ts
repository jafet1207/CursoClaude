/**
 * Regression test for the returning-user report:
 *
 *   "I left the app for a month. I came back expecting it to send me to review
 *    what had gotten rusty, because it used to. But the map shows everything
 *    mastered, exactly as I left it. It feels like it doesn't notice that time
 *    passed."
 *
 * This describes user-visible behavior, not an implementation detail: a skill
 * that was mastered and then left untouched well past its review date must stop
 * reading as mastered (its retention has decayed), and skills that depended on
 * it must re-lock so the map routes the user back to review.
 *
 * The spec says decay is 3%/day once overdue (OVERDUE_RETENTION_PER_DAY = 0.97)
 * and that a node's status is computed against `now`. A month of neglect drags a
 * mastered item's retention far below the 80 target, so the node can no longer
 * count as mastered.
 */

import { describe, expect, it } from 'vitest'
import {
  buildGraph,
  computeAllNodeStates,
  isNodeWeakened,
  weakenedPrereqs,
} from './graph'
import { DAY_MS } from './srs'
import type { SkillNode, UserItemState } from './types'

const T0 = 1_750_000_000_000

function mkNode(id: string, prerequisites: string[], items: string[]): SkillNode {
  return { id, name: id, description: '', tier: 0, prerequisites, tags: [], items }
}

// FOUNDATION is mastered; DEPENDENT unlocks only while FOUNDATION stays mastered.
const FOUNDATION = mkNode('FOUNDATION', [], ['f1'])
const DEPENDENT = mkNode('DEPENDENT', ['FOUNDATION'], ['d1'])
const graph = () => buildGraph([FOUNDATION, DEPENDENT])

/** A freshly-mastered item: retention 90, reviewed at T0, due 6 days later. */
function masteredItem(itemId: string): UserItemState {
  return {
    itemId,
    easiness: 2.5,
    interval: 6,
    repetitions: 3,
    mastery: 90,
    bestBpm: null,
    dueDate: T0 + 6 * DAY_MS,
    lastReviewed: T0,
  }
}

describe('returning after a month away (mastery decay)', () => {
  it('a mastered skill left untouched for a month no longer reads as mastered', () => {
    const g = graph()
    const states = new Map([['f1', masteredItem('f1')]])

    // The user comes back a month after last practicing — long past the due date.
    const monthLater = T0 + 30 * DAY_MS

    const nodeStates = computeAllNodeStates(g, states, monthLater)
    const foundation = nodeStates.get('FOUNDATION')!

    // What the user expected: the neglected skill is no longer "all mastered".
    expect(foundation.status).not.toBe('mastered')
    expect(foundation.status).not.toBe('maintenance')
  })

  it('skills that depended on the rusty foundation re-lock, routing the user back to review', () => {
    const g = graph()
    const states = new Map([['f1', masteredItem('f1')]])

    // On day one, mastering the foundation unlocks the dependent.
    const day1 = computeAllNodeStates(g, states, T0)
    expect(day1.get('FOUNDATION')!.status).toBe('mastered')
    expect(day1.get('DEPENDENT')!.status).toBe('available')

    // A month later, the foundation has rusted, so the dependent must re-lock.
    const monthLater = T0 + 30 * DAY_MS
    const later = computeAllNodeStates(g, states, monthLater)
    expect(later.get('DEPENDENT')!.status).toBe('locked')
  })
})

/**
 * Scope of the same root cause: while node status never dropped out of
 * "mastered", these two behaviors could not fire at all, so the user report
 * (one symptom) hid them. They must hold once decay reaches node status.
 */
describe('rusty marking (masked by the same bug)', () => {
  it('a skill earned and then rotted is flagged as weakened, not silently mastered', () => {
    const states = new Map([['f1', masteredItem('f1')]])

    // Freshly earned: not weakened.
    expect(isNodeWeakened(FOUNDATION, states, T0)).toBe(false)

    // A month later its retention has decayed below target: weakened.
    const monthLater = T0 + 30 * DAY_MS
    expect(isNodeWeakened(FOUNDATION, states, monthLater)).toBe(true)
  })

  it('a re-locked node points at the rotted prerequisite the user must refresh', () => {
    const g = graph()
    const states = new Map([['f1', masteredItem('f1')]])
    const monthLater = T0 + 30 * DAY_MS

    const toRefresh = weakenedPrereqs(g, 'DEPENDENT', states, monthLater)
    expect(toRefresh.map((n) => n.id)).toEqual(['FOUNDATION'])
  })
})
