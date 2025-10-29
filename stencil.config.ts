import { Config } from '@stencil/core';

export const config: Config = {
  namespace: 'poc-http-mock',
  outputTargets: [
    {
      type: 'dist',
      esmLoaderPath: '../loader',
    },
    {
      type: 'dist-custom-elements',
      customElementsExportBehavior: 'auto-define-custom-elements',
      externalRuntime: false,
    },
    {
      type: 'docs-readme',
    },
    {
      type: 'www',
      serviceWorker: null, // disable service workers
      // copy our global stylesheet into the www output so the dev server serves /styles.css
      copy: [
        // use a relative path that avoids double-'src' resolution inside Stencil
        { src: '../src/styles.css', dest: 'styles.css' },
      ],
    },
  ],
  testing: {
    browserHeadless: "shell",
  },
};
