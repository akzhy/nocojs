import { parseSync, Visitor } from "oxc-parser";
import MagicString from "magic-string";
import { Transform } from "./transform";

console.time("parse");

const code = `import { preview } from '@nocojs/client';

const img = preview("https://images.unsplash.com/photo-1594568284297-7c64464062b1?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&q=80&w=2670", {
  placeholderType: 'normal',
  width: 20,
  "height": 20
});`;

const transform = new Transform(code, "source.ts");
await transform.begin();

// const s = new MagicString(code);

// let preview = {
//   start: 0,
//   end: 0
// }

// console.log(result.module.staticImports[0]);

// const visitor = new Visitor({
//   CallExpression(node) {
//     console.log("CallExpression", node);
//     if (node.callee.type === "Identifier" && node.callee.name === "preview") {
//       preview.start = node.start;
//       preview.end = node.end;
//     }
//   },
// });

// console.log(result.module.staticImports);

// visitor.visit(result.program);

// s.update(preview.start, preview.end, `"data:image/png;base64, "`);

// const map = s.generateMap({
// 	source: 'source.js',
// 	file: 'converted.js.map',
// 	includeContent: true,
// });

// console.timeEnd("parse");

// // console.log(s.toString());
