# Product photos

Photos live under one folder per product, then one folder per **photo set**:

```
<product-slug>/
  _base/                  shown for any variant (packaging, in-box shots)
    1-400.webp  1-800.webp  1-1000.webp
    1-400.avif  1-800.avif  1-1000.avif
  color-sierra-blue/      shown only when Colour = Sierra Blue
  color-graphite/
  dial-green/             any visual attribute works, not just Colour
```

A folder name is the variant attributes it depicts, kebab-cased, joined with `_`
for multi-attribute sets (`bundle-with-20w-adapter_color-white`).

## Which attributes get their own folder

Only the ones that change how the product looks: Colour, Dial, Bracelet, Strap,
Material, Finish, Pattern, Style, Bundle. Storage, RAM, Case Size, Connectivity
and the rest do not — a 128 GB Graphite iPhone and a 512 GB Graphite iPhone are
the same photograph, so both read from `color-graphite/`. The list lives in
`backend/src/utils/variantMedia.js`.

An image belongs to a variant when every attribute it declares matches that
variant. A photo tagged `{ Color: "Deep Navy" }` therefore can never appear
under Plum. If a variant has no photo set of its own, the gallery shows nothing
rather than falling back to another colour — a missing photo is obvious, a wrong
one is not.

## Do not edit these by hand

`backend/src/utils/generated/productMedia.js` records every file here and is what
`catalogue.js` reads. Both are written by the scripts in
`backend/src/scripts/media/`. Adding a file without re-running them means the
storefront never sees it.

## Workflow

From `backend/`:

```bash
npm run media:audit      # what each variant needs vs what exists
npm run media:fetch      # download candidates for the gaps into media-staging/
npm run media:review     # build media-staging/review.html
#                          open it, tick the correct photos, save approvals.json
npm run media:promote    # generate derivatives from the approved files
npm run media:verify     # fails if any variant would show nothing or a wrong photo
```

`media:verify` is the one that matters: it is what proves no variant anywhere
displays another variant's photos.

Sizes are generated at 400 px, 800 px, and the source's own width when that is
meaningfully larger, in both WebP and AVIF. Nothing is ever upscaled.

If a colourway has no honest photograph available, remove that variant from
`variantsByProduct` in `backend/src/utils/catalogue.js` rather than pointing it
at a stand-in.
