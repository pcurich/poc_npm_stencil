# @pcurich/http-mock-workbench — Package usage

This repository contains a Stencil component `mock-workbench` (web component).

This document explains how to build and create an npm package suitable for installing into another project.

## Build & pack locally

1. Install dependencies:

```powershell
npm install
```

2. Build the project (Stencil will emit the `dist/` folder):

```powershell
npm run build
```

3. Create a tarball package (from the repo root):

```powershell
npm pack
```

This produces a file like `pcurich-http-mock-workbench-2.0.0.tgz` (for scoped packages npm replaces the `@scope/` prefix in the filename) which you can install in another project.

4. In your consuming project, install the local package:

```powershell
# from the consumer project
npm install ../path/to/pcurich-http-mock-workbench-2.0.0.tgz
```

or use a relative file reference in package.json:

```json
// package.json (consumer)
{
  "dependencies": {
    "http-mock-workbench": "file:../path/to/http-mock-workbench-2.0.0.tgz"
  }
}
```

## Using the component in the browser

After installation, you can include the Stencil output in your app. If you built the project and the package includes `dist/`, you can add the script and use the tag:

```html
<!-- include the component bundle (adjust path as installed) -->
<script type="module" src="node_modules/@pcurich/http-mock-workbench/dist/http-mock-workbench/http-mock-workbench.esm.js"></script>

<!-- then in your HTML -->
<mock-workbench></mock-workbench>
```

Or, when using frameworks (React/Angular), import the loader and call `defineCustomElements` as recommended by Stencil:

```js
import { applyPolyfills, defineCustomElements } from '@pcurich/http-mock-workbench/loader';

applyPolyfills().then(() => defineCustomElements(window));
```

## Notes
- Ensure you build before packing so `dist/` contains the compiled files.
- This package.json already exposes an export path `./mock-workbench` (after the recent changes). The consuming project can import the component's bundle directly or use the loader.

If you want, I can:
- Run the build here and generate the tarball (if the environment supports build). Otherwise I'll provide the exact commands to run locally and verify.
- Update the repo to remove old `my-component` exports and fully switch to `mock-workbench`.
