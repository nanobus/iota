/*
Copyright 2022 The NanoBus Authors.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import {
  Alias,
  AnyType,
  BaseVisitor,
  Context,
  Kind,
  List,
  Map,
  Optional,
  Stream,
} from "https://raw.githubusercontent.com/apexlang/apex-js/deno-wip/src/model/mod.ts";
import { Import } from "https://raw.githubusercontent.com/apexlang/codegen/deno-wip/src/go/mod.ts";
import { isHandler } from "https://raw.githubusercontent.com/apexlang/codegen/deno-wip/src/utils/mod.ts";
import { WrappersVisitor } from "./wrappers_visitor.ts";
import { RegisterVisitor } from "./register_visitor.ts";

export class ExportVisitor extends BaseVisitor {
  visitNamespace(context: Context): void {
    const packageName = context.config["package"] || "module";
    const importVisitor = new ImportsVisitor(this.writer);
    context.namespace.accept(context, importVisitor);
    const sortedImports = Array.from(importVisitor.imports).sort();

    this.write(`// Code generated by @apexlang/codegen. DO NOT EDIT.

    package ${packageName}

    import (
      "context"

      "github.com/nanobus/iota/go/invoke"
      "github.com/nanobus/iota/go/payload"\n`);
    sortedImports.forEach((i) => this.write(`"${i}"\n`));
    this.write(`"github.com/nanobus/iota/go/transform"\n`);
    this.write(`)\n\n`);

    const registerVisitor = new RegisterVisitor(this.writer);
    context.namespace.accept(context, registerVisitor);

    const wrappersVisitor = new WrappersVisitor(this.writer);
    context.namespace.accept(context, wrappersVisitor);
  }
}

class ImportsVisitor extends BaseVisitor {
  imports: Set<string> = new Set();

  visitFunction(context: Context): void {
    const { operation } = context;
    if (operation.type.kind != Kind.Stream) {
      this.imports.add("github.com/nanobus/iota/go/rx/mono");
    }
    this.visitCheckType(context, operation.type);
  }

  visitOperation(context: Context): void {
    if (!isHandler(context)) {
      return;
    }
    const { operation } = context;
    if (operation.type.kind != Kind.Stream) {
      this.imports.add("github.com/nanobus/iota/go/rx/mono");
    }
    this.visitCheckType(context, operation.type);
  }

  visitParameter(context: Context): void {
    if (!isHandler(context)) {
      return;
    }
    const { operation, parameter } = context;
    if (operation.unary) {
      this.visitCheckType(context, parameter.type);
    }
  }

  visitCheckType(context: Context, t: AnyType): void {
    switch (t.kind) {
      case Kind.Alias:
        const a = t as Alias;
        const aliases = (context.config.aliases as { [key: string]: Import }) ||
          {};
        const t2 = aliases[a.name];
        if (t2 && t2.import) {
          this.imports.add(t2.import);
        } else {
          this.visitCheckType(context, a.type);
        }
        break;
      case Kind.Stream:
        this.imports.add("github.com/nanobus/iota/go/rx/flux");
        const s = t as Stream;
        this.visitCheckType(context, s.type);
        break;
      case Kind.Optional:
        const o = t as Optional;
        this.visitCheckType(context, o.type);
        break;
      case Kind.List:
        const l = t as List;
        this.visitCheckType(context, l.type);
        break;
      case Kind.Map:
        const m = t as Map;
        this.visitCheckType(context, m.keyType);
        this.visitCheckType(context, m.valueType);
        break;
    }
  }
}
