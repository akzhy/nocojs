import { Argument, ParseResult, parseSync, Visitor } from "oxc-parser";
import { PreviewOptions } from "./placeholder-image";
import { getSharpInstance } from "./image";
import path from "path";
import MagicString from "magic-string";

export interface TransformOptions extends PreviewOptions {
  publicDir?: string;
  cacheFileDir?: string;
  logLevel?: "none" | "info" | "warn" | "error" | "debug";
  sourceMapFilePath?: string;
}

export class Transform {
  code: string;
  filePath: string;
  options: TransformOptions;

  constructor(code: string, filePath: string, options?: TransformOptions) {
    this.code = code;
    this.filePath = filePath;

    this.options = {
      cache: true,
      placeholderType: "blurred",
      replaceFunctionCall: true,
      wrapWithSvg: true,
      cacheFileDir: path.join(process.cwd(), ".nocojs"),
      publicDir: path.join(process.cwd(), "public"),
      logLevel: "error",
      sourceMapFilePath: filePath,
      width: 12,
      ...options,
    };
  }

  async begin() {
    const parsedResult = parseSync(this.filePath, this.code);

    const previewFnName = this.getPreviewFnName(parsedResult);
    if (!previewFnName) {
      return null;
    }

    const foundCalls = this.visitCallExpressions(parsedResult, {
      previewFnName,
    });

    const processed = await Promise.all(
      foundCalls.map(async (call) => {
        const sharpInstance = await getSharpInstance(call.url);
        sharpInstance.resize(call.options.width, call.options.height);
        const buffer = await sharpInstance.toBuffer();
        const base64 = buffer.toString("base64");
        const placeholder = `data:image/png;base64,${base64}`;
        return {
          ...call,
          placeholder,
        };
      })
    );

    const magicString = new MagicString(this.code);
    for (const item of processed) {
      magicString.overwrite(item.start, item.end, `"${item.placeholder}"`);
    }

    const map = magicString.generateMap({
      source: this.filePath,
      file: this.filePath + ".map",
      includeContent: true,
    });

    console.log(magicString.toString());

    return {
      code: magicString.toString(),
      map,
    };
  }

  private getPreviewFnName(parseResult: ParseResult): string | null {
    for (const importDecl of parseResult.module.staticImports) {
      if (importDecl.moduleRequest.value !== "@nocojs/client") {
        continue;
      }

      for (const specifier of importDecl.entries) {
        if (specifier.importName.name === "preview") {
          return specifier.localName.value;
        }
      }
    }

    return null;
  }

  private visitCallExpressions(
    parserResult: ParseResult,
    { previewFnName }: { previewFnName: string }
  ) {
    const foundCalls: {
      url: string;
      start: number;
      end: number;
      options: PreviewOptions;
    }[] = [];

    const visitor = new Visitor({
      CallExpression: (node) => {
        if (
          node.callee.type === "Identifier" &&
          node.callee.name === previewFnName
        ) {
          let url = "";
          if (
            node.arguments[0].type === "Literal" &&
            typeof node.arguments[0].value === "string"
          ) {
            url = node.arguments[0].value;
          }

          const optionsArg = node.arguments[1];
          const previewOptions = this.extractOptions(optionsArg);

          foundCalls.push({
            url,
            start: node.start,
            end: node.end,
            options: previewOptions,
          });
        }
      },
    });

    visitor.visit(parserResult.program);

    return foundCalls;
  }

  private extractOptions(argument: Argument): PreviewOptions {
    const options: PreviewOptions = {
      ...this.options,
    };

    if (argument.type === "ObjectExpression") {
      for (const prop of argument.properties) {
        if (
          prop.type === "Property" &&
          prop.key.type === "Literal" &&
          prop.value.type === "Literal"
        ) {
          const keyName = prop.key.value as keyof PreviewOptions;
          if (options.hasOwnProperty(keyName)) {
            // @ts-expect-error
            options[keyName] = prop.value.value;
          }
        }
      }
    }

    return options;
  }
}
