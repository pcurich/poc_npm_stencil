# poc-http-mock — Package usage

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

This produces a file like `poc-http-mock-0.0.1.tgz` which you can install in another project.

4. In your consuming project, install the local package:

```powershell
# from the consumer project
npm install ../path/to/poc-http-mock-0.0.1.tgz
```

or use a relative file reference in package.json:

```json
// package.json (consumer)
{
  "dependencies": {
    "poc-http-mock": "file:../path/to/poc-http-mock-0.0.1.tgz"
  }
}
```

## Using the component in the browser

After installation, you can include the Stencil output in your app. If you built the project and the package includes `dist/`, you can add the script and use the tag:

```html
<!-- include the component bundle (adjust path as installed) -->
<script type="module" src="node_modules/poc-http-mock/dist/poc-http-mock/poc-http-mock.esm.js"></script>

<!-- then in your HTML -->
<mock-workbench></mock-workbench>
```

Or, when using frameworks (React/Angular), import the loader and call `defineCustomElements` as recommended by Stencil:

```js
import { applyPolyfills, defineCustomElements } from 'poc-http-mock/loader';

applyPolyfills().then(() => defineCustomElements(window));
```

## Notes
- Ensure you build before packing so `dist/` contains the compiled files.
- This package.json already exposes an export path `./mock-workbench` (after the recent changes). The consuming project can import the component's bundle directly or use the loader.

If you want, I can:
- Run the build here and generate the tarball (if the environment supports build). Otherwise I'll provide the exact commands to run locally and verify.
- Update the repo to remove old `my-component` exports and fully switch to `mock-workbench`.
