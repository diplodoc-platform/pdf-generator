# docs2pdf

Package to turn Diplodoc projects into PDFs.

## Installation

```
npm i -g @diplodoc/docs2pdf
```

## Usage

### Step 1: Generate Single Page Files

Run `@diplodoc/cli` command. This will create an output folder with a single page file for each Table of Contents (ToC) file.

```
npx -- @diplodoc/cli@latest -i ./docs -o ./docs-output --single-page
```

### Step 2: Convert Single Page Files to PDFs

Run the `@diplodoc/docs2pdf` command. This will create PDF files right next to the single page ones.

```
npx -- @diplodoc/docs2pdf@latest -i ./docs-output
```