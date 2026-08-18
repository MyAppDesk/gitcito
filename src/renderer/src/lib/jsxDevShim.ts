// React's production `jsx-dev-runtime` exports `jsxDEV: undefined` — the dev
// runtime is a development-only entry point. A dependency compiled with it
// (blobatar's React build, as of 0.1.0) therefore renders fine under `vite dev`
// and throws "jsxDevRuntimeExports.jsxDEV is not a function" in every packaged
// build, which takes the whole renderer down with it.
//
// Aliased over `react/jsx-dev-runtime` for production renderer builds only, so
// our own code keeps the real dev runtime while developing. Drop it once the
// dependency ships a production build.
import { jsx, jsxs, Fragment } from 'react/jsx-runtime'
import type { ElementType, ReactElement } from 'react'

// The dev runtime's fourth argument says whether the children were written as a
// static list — the one bit that decides jsx vs jsxs.
export function jsxDEV(
  type: ElementType,
  props: Record<string, unknown>,
  key?: string,
  isStaticChildren?: boolean
): ReactElement {
  return isStaticChildren
    ? (jsxs as (t: ElementType, p: Record<string, unknown>, k?: string) => ReactElement)(type, props, key)
    : (jsx as (t: ElementType, p: Record<string, unknown>, k?: string) => ReactElement)(type, props, key)
}

export { Fragment, jsx, jsxs }
