import { brandThemeCss, isHex } from "@/lib/palette";

// Emits the generated light + dark palette for an institute's single brand
// colour. Pair it with `data-brand-scope` on the element that should be
// themed. Renders nothing when no (valid) colour is set, so the app's
// default theme applies.
export default function BrandStyle({ color }: { color: string | null | undefined }) {
  if (!isHex(color)) return null;
  return <style>{brandThemeCss(color)}</style>;
}
