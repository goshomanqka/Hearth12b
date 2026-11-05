import { describe, expect, it } from "vitest";
import {
  assertPropertyOwnership,
  assertUploadPayload,
  validatePropertyMedia,
} from "./marketplace";

const storageImage = "/manus-storage/marketplace/100/photo.webp";

describe("marketplace validation", () => {
  it("requires at least one property photograph", () => {
    expect(validatePropertyMedia([], "none", null)).toContain("at least one");
  });

  it("accepts supported image and embedded tour URLs", () => {
    expect(
      validatePropertyMedia(
        [storageImage],
        "embed",
        "https://my.matterport.com/show/abc123/"
      )
    ).toBeNull();
    expect(
      validatePropertyMedia(
        [storageImage],
        "embed",
        "https://my.matterport.com/show/?m=abc123"
      )
    ).toBeNull();
    expect(
      validatePropertyMedia(
        ["https://cdn.example/property.webp"],
        "embed",
        "https://kuula.co/post/abc123"
      )
    ).toBeNull();
  });

  it("rejects unsafe images and non-approved embeds", () => {
    expect(
      validatePropertyMedia(["http://cdn.example/property.webp"], "none", null)
    ).toContain("valid HTTPS");
    expect(
      validatePropertyMedia([storageImage], "embed", "https://example.com/tour")
    ).toContain("Matterport or Kuula");
  });

  it("requires strict owner identity", () => {
    expect(() => assertPropertyOwnership(7, 7)).not.toThrow();
    expect(() => assertPropertyOwnership(8, 7)).toThrow(
      "You do not own this property"
    );
    expect(() => assertPropertyOwnership(null, 7)).toThrow(
      "You do not own this property"
    );
  });

  it("checks image magic bytes before accepting uploads", () => {
    const png = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    ]).toString("base64");
    expect(assertUploadPayload("front.png", "image/png", png)).toHaveLength(8);
    expect(() =>
      assertUploadPayload(
        "front.png",
        "image/png",
        Buffer.from("not png").toString("base64")
      )
    ).toThrow("do not match");

    const glb = Buffer.from("glTF\0\0\0\0").toString("base64");
    expect(
      assertUploadPayload("walkthrough.glb", "model/gltf-binary", glb)
    ).toHaveLength(8);
  });
});
