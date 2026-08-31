// Adds the DOM matchers (toHaveTextContent, toHaveAttribute, …) used by the
// component tests. Harmless for the node-environment tests, which never call them.
import '@testing-library/jest-dom/vitest'

/**
 * jsdom implements no layout, so it ships no `scrollIntoView`. The SDS `Tab`
 * calls it to keep the selected tab visible when the strip scrolls — real
 * behaviour worth keeping, so the environment gets the stub rather than the
 * vendored component getting a guard.
 */
if (typeof Element !== 'undefined' && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = function scrollIntoView() {}
}
