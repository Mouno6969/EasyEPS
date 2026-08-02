#!/bin/bash
# OCR rendered page images for Book 2 units (31-60), whose PDF text layer holds
# no Hangul. Writes reference/extracts/unit-NN.ocr.txt; the pdftotext stub is
# left untouched. OMP_THREAD_LIMIT=1 keeps each tesseract single-threaded so the
# outer -P parallelism is not oversubscribed.
set -uo pipefail
cd /root/EasyEPS/reference/extracts || exit 1
ocr_unit() {
  local u="$1" n out p
  n="${u#u}"
  out="unit-${n}.ocr.txt"
  : > "$out"
  for p in "pages/$u"/*.png; do
    [ -f "$p" ] || continue
    printf '\n===== page %s =====\n' "$(basename "$p" .png)" >> "$out"
    OMP_THREAD_LIMIT=1 tesseract "$p" stdout -l kor+eng --psm 3 2>/dev/null >> "$out"
  done
}
export -f ocr_unit
ls -d pages/u* 2>/dev/null | xargs -n1 basename | sort | xargs -P 6 -I{} bash -c 'ocr_unit "$@"' _ {}
echo "ALL_OCR_COMPLETE"
