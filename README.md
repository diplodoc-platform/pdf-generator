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

The tool also provides users with flexible customization of headers and footers in the form of HTML format files, the paths to which can be passed through the corresponding options --custom-header and --custom-footer.

By default, the header is not set, but the page numbering in the lower right corner is set in the footer, as shown in the example below.

```
npx -- @diplodoc/pdf-generator@latest -i ./docs-output
```

Also below is an example of a command with custom header ([example-custom-header.html](https://github.com/ggerlakh/pdf-generator/blob/master/example-custom-header.html)) and custom footer ([example-custom-footer.html](https://github.com/ggerlakh/pdf-generator/blob/master/example-custom-footer.html)).  
Even if you specify a custom footer, the numbering still remains in the lower right corner.

```
npx -- @diplodoc/pdf-generator@latest -i ./docs-output --custom-header ./example-custom-header.html --custom-footer ./example-custom-footer.html
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