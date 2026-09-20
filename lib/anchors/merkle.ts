import { ethers } from 'ethers'

/**
 * Compute the canonical hash of a MongoDB fiat record.
 * This MUST stay stable — changing it invalidates every existing proof.
 */
export function hashRecord(record: Record<string, any>): string {
  // Deterministic serialization: sort keys, exclude proof/anchor fields
  const excluded = new Set(['_id', 'anchorBatchId', 'merkleProof', '__v'])
  const canonical: Record<string, any> = {}
  for (const key of Object.keys(record).sort()) {
    if (excluded.has(key)) continue
    canonical[key] = record[key]
  }
  const json = JSON.stringify(canonical)
  return ethers.keccak256(ethers.toUtf8Bytes(json))
}

/**
 * Build a Merkle tree. Returns the root and the full leaf list.
 * Leaves must be sorted so proofs are deterministic.
 */
export function buildMerkleTree(leaves: string[]): {
  root: string
  layers: string[][]
} {
  if (leaves.length === 0) {
    throw new Error('Cannot build tree from empty leaves')
  }

  // Sort leaves for determinism
  const sortedLeaves = [...leaves].sort()

  const layers: string[][] = [sortedLeaves]

  while (layers[layers.length - 1].length > 1) {
    const prev = layers[layers.length - 1]
    const next: string[] = []
    for (let i = 0; i < prev.length; i += 2) {
      const a = prev[i]
      const b = i + 1 < prev.length ? prev[i + 1] : prev[i] // duplicate last
      next.push(
        a <= b
          ? ethers.keccak256(ethers.concat([a, b]))
          : ethers.keccak256(ethers.concat([b, a]))
      )
    }
    layers.push(next)
  }

  return { root: layers[layers.length - 1][0], layers }
}

/**
 * Generate the Merkle proof for a given leaf.
 */
export function getMerkleProof(leaf: string, layers: string[][]): string[] {
  // Find the index of the leaf in layer 0
  let index = layers[0].indexOf(leaf)
  if (index === -1) throw new Error('Leaf not found in tree')

  const proof: string[] = []
  for (let i = 0; i < layers.length - 1; i++) {
    const layer = layers[i]
    const isRightNode = index % 2 === 1
    const siblingIndex = isRightNode ? index - 1 : index + 1

    if (siblingIndex < layer.length) {
      proof.push(layer[siblingIndex])
    } else {
      // Odd number of nodes — sibling is the node itself
      proof.push(layer[index])
    }

    index = Math.floor(index / 2)
  }

  return proof
}