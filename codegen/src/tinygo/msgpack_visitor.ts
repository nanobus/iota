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
  Primitive,
  PrimitiveName,
  Stream,
  Writer,
} from "https://deno.land/x/apex_core@v0.1.0/model/mod.ts";
import {
  convertOperationToType,
  convertUnionToType,
} from "https://deno.land/x/apex_codegen@v0.1.0/utils/mod.ts";
import {
  Import,
  StructVisitor,
} from "https://deno.land/x/apex_codegen@v0.1.0/go/mod.ts";
import { MsgPackDecoderVisitor } from "./msgpack_decoder_visitor.ts";
import {
  MsgPackEncoderUnionVisitor,
  MsgPackEncoderVisitor,
} from "./msgpack_encoder_visitor.ts";

export class MsgPackVisitor extends BaseVisitor {
  constructor(writer: Writer) {
    super(writer);
    const operArgs = (context: Context): void => {
      const { interface: iface, operation } = context;
      const parameters = operation.parameters.filter(
        (p) => p.type.kind != Kind.Stream,
      );
      if (parameters.length == 0 || operation.isUnary()) {
        return;
      }
      const tr = context.getType.bind(context);
      const type = convertOperationToType(tr, iface, operation);
      const ctx = context.clone({ type: type });
      const struct = new StructVisitor(this.writer);
      type.accept(ctx, struct);
      const decoder = new MsgPackDecoderVisitor(this.writer);
      type.accept(ctx, decoder);
      const encoder = new MsgPackEncoderVisitor(this.writer);
      type.accept(ctx, encoder);
      this.write(`\n`);
    };
    this.setCallback("FunctionAfter", "arguments", operArgs);
    this.setCallback("OperationAfter", "arguments", operArgs);
  }

  visitNamespaceBefore(context: Context): void {
    const importVisitor = new ImportsVisitor(this.writer);
    context.namespace.accept(context, importVisitor);
    const sortedImports = Array.from(importVisitor.imports).sort();

    const packageName = context.config["package"] || "module";
    this.write(`// Code generated by @apexlang/codegen. DO NOT EDIT.

    package ${packageName}

    import (
      "github.com/nanobus/iota/go/msgpack"
      "github.com/nanobus/iota/go/msgpack/convert"\n`);
    sortedImports.forEach((i) => this.write(`"${i}"\n`));
    this.write(`)
    
    var _ = convert.Package\n\n`);
    super.triggerNamespaceBefore(context);
  }

  visitType(context: Context): void {
    const { type } = context;
    const decoder = new MsgPackDecoderVisitor(this.writer);
    type.accept(context, decoder);
    const encoder = new MsgPackEncoderVisitor(this.writer);
    type.accept(context, encoder);
    this.write(`\n`);
  }

  visitUnion(context: Context): void {
    const { union } = context;
    const tr = context.getType.bind(context);
    const type = convertUnionToType(tr, union);
    const ctx = context.clone({ type: type });
    const decoder = new MsgPackDecoderVisitor(this.writer);
    type.accept(ctx, decoder);
    const encoder = new MsgPackEncoderUnionVisitor(this.writer);
    type.accept(ctx, encoder);
    this.write(`\n`);
  }
}

class ImportsVisitor extends BaseVisitor {
  imports: Set<string> = new Set();

  visitFunction(context: Context): void {
    const { operation } = context;
    this.checkType(context, operation.type);
  }

  visitOperation(context: Context): void {
    const { operation } = context;
    this.checkType(context, operation.type);
  }

  visitParameter(context: Context): void {
    const { operation, parameter } = context;
    if (operation.unary) {
      this.checkType(context, parameter.type);
    } else {
      // Fields in Args type
      this.checkType(context, parameter.type, true);
    }
  }

  visitTypeField(context: Context): void {
    const { field } = context;
    this.checkType(context, field.type);
  }

  checkType(context: Context, t: AnyType, argument = false): void {
    switch (t.kind) {
      case Kind.Primitive: {
        const p = t as Primitive;
        if (argument && p.name == PrimitiveName.DateTime) {
          this.imports.add("time");
        }
        break;
      }
      case Kind.Alias: {
        const a = t as Alias;
        const aliases = (context.config.aliases as { [key: string]: Import }) ||
          {};
        const t2 = aliases[a.name];
        if (t2 && t2.import) {
          this.imports.add(t2.import);
        } else {
          this.checkType(context, a.type, argument);
        }
        break;
      }
      case Kind.Stream: {
        const s = t as Stream;
        this.checkType(context, s.type, argument);
        break;
      }
      case Kind.Optional: {
        const o = t as Optional;
        this.checkType(context, o.type, argument);
        break;
      }
      case Kind.List: {
        const l = t as List;
        this.checkType(context, l.type, argument);
        break;
      }
      case Kind.Map: {
        const m = t as Map;
        this.checkType(context, m.keyType, argument);
        this.checkType(context, m.valueType, argument);
        break;
      }
    }
  }
}
