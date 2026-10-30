import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
let pkgRoot;
try {
  pkgRoot = path.dirname(require.resolve("react-native-css-interop/package.json"));
} catch {
  console.warn("[patch-css-interop] package not found, skip");
  process.exit(0);
}

const target = path.join(pkgRoot, "dist/runtime/native/native-interop.js");
const text = fs.readFileSync(target, "utf8");
if (text.includes("pending.push(action)")) {
  console.log("[patch-css-interop] already applied");
  process.exit(0);
}

const oldA = `    for (const config of configs) {
        const [state, dispatch] = (0, react_1.useReducer)(reducer, {
            dispatch: (action) => dispatch(action),
            reducer,
            config,
            className: props?.[config.source],
        }, initReducer);`;

const oldB = `    for (const config of configs) {
        const dispatchRef = { current: null };
        const [state, dispatch] = (0, react_1.useReducer)(reducer, {
            dispatch: (action) => dispatchRef.current && dispatchRef.current(action),
            reducer,
            config,
            className: props?.[config.source],
        }, initReducer);
        dispatchRef.current = dispatch;`;

const neu = `    for (const config of configs) {
        const pending = [];
        let realDispatch = null;
        const [state, dispatch] = (0, react_1.useReducer)(reducer, {
            dispatch: (action) => {
                if (realDispatch) {
                    realDispatch(action);
                }
                else {
                    pending.push(action);
                }
            },
            reducer,
            config,
            className: props?.[config.source],
        }, initReducer);
        realDispatch = dispatch;
        for (const action of pending) {
            dispatch(action);
        }`;

let next = text;
if (text.includes(oldA)) next = text.replace(oldA, neu);
else if (text.includes(oldB)) next = text.replace(oldB, neu);
else {
  console.warn("[patch-css-interop] pattern missing");
  process.exit(0);
}
fs.writeFileSync(target, next);
console.log("[patch-css-interop] applied React 19 queued-dispatch fix");
