import { describe, expect, it } from "vitest";
import { csvCell, parseCsv } from "@/lib/product-csv";

describe("product CSV helpers", () => {
  it("parses quoted commas, escaped quotes and CRLF rows", () => {
    expect(parseCsv('name,description\r\n"Sheet, king","Soft ""cotton"" linen"\r\n')).toEqual([
      ["name", "description"], ["Sheet, king", 'Soft "cotton" linen'],
    ]);
  });
  it("rejects unclosed quoted fields", () => {
    expect(() => parseCsv('name,description\n"open,field')).toThrow("unclosed quoted");
  });
  it("quotes values and neutralizes spreadsheet formulas", () => {
    expect(csvCell("=HYPERLINK(\"x\")")).toBe('"\'=HYPERLINK(""x"")"');
    expect(csvCell('A "quote"')).toBe('"A ""quote"""');
  });
});
