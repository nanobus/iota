# Iota

Build reusable, streaming components in Go and Rust. Iotas are universal dependencies that can be used in frameworks like NanoBus.

## What is an iota?

An iota is a "small thing." It's a specification for programming dependencies so local libraries, WebAssembly modules, and even remote microservices can be used the same way. Iotas make it possible to build an application like a monolith and scale parts of it as necessary without changing the original application.

Iotas are a work-in-progress. We've been working with the concepts for years and are formalizing them into specifications that implementations can adhere to.

For more details, refer to the [iota-spec](docs/iota-spec.md)

## Iota implementations

**WebAssembly Modules**

- Go (TinyGo) w/ wasmRS
- Rust w/ wasmRS

**WebAssembly Components**

The component model specification is not yet ratified. Once it is, an iota implementation and updated spec will follow.

**Native Microservice**

- Go w/ RSocket

## Repository structure

**[WasmRS Go packages](go/)**

`go/` houses the `Go` implementation of WasmRS & RSocket protocols used by native and WebAssembly iotas.

**[WasmRS Rust packages](rust/)**

`rust/` houses the `Rust` implementation of WasmRS protocols used by WebAssembly iotas.

**[Iota & WasmRS code generators](codegen/)**

`codegen/` houses [`apex`](https://apexlang.io) code generators that automatically generate `Go`, `TinyGo`, and `Rust` boilerplate for iotas.

**[Apex project templates](templates/)**

`templates/` houses `apex` project templates you can use to automatically kickstart new projects.

**[Docs](docs/)**

`docs/` contains any documentation related to iotas, wasmRS, and their usage with NanoBus.

## Local development

### Compile generator typescript

```
just codegen
```

### Run all tests

```
just test
```
