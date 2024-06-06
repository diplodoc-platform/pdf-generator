# pdf-generator

Package to turn Diplodoc projects into PDFs.

## Installation

```
npm i -g @diplodoc/pdf-generator
```

## Usage

### Step 1: Generate Single Page Files

Run `@diplodoc/cli` command. This will create an output folder with a single page file for each Table of Contents (ToC) file.

```
npx -- @diplodoc/cli@latest -i ./docs -o ./docs-output --single-page
```

### Step 2: Convert Single Page Files to PDFs

Run the `@diplodoc/pdf-generator` command. This will create PDF files right next to the single page ones.

```
npx -- @diplodoc/pdf-generator@latest -i ./docs-output
```

## Development

### Prerequisites

* node >= 18.x
* graphicsmagick
* ghostscript

#### Don't have graphicsmagick and ghostscript yet?

Follow [this](https://github.com/yakovmeister/pdf2image/blob/HEAD/docs/gm-installation.md) guide to install the required dependencies.

### Run test

```
npm run test
```