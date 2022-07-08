# tscd

`tsc` but for building TypeScript library with dual CJS/ESM output.

Require `typescript` 4.7 or above.

## Installation

```sh
npm i tscd
```

## Usage

Call `tscd` with the same args as `tsc`, with an addition of `entry` (defaulted to `index.js`) arg which is the entrypoint (with extension) with respect to `outDir`.

```sh
tscd --entry index.js --outDir dist
```

The script will update `package.json` with fields like below:

```json
{
  "exports": {
    "import": {
      "types": "./dist/types/index.d.ts",
      "default": "./dist/esm/index.js"
    },
    "require": {
      "types": "./dist/types/index.d.ts",
      "default": "./dist/commonjs/index.cjs"
    }
  },
  "main": "dist/commonjs/index.cjs",
  "types": "dist/types/index.d.ts"
}
```

Go ahead and publish your package. It will be usable in both CJS and ESM context.

## License

[MIT](LICENSE)
