import { TRPCError } from "@trpc/server";
import { and, desc, eq, ne } from "drizzle-orm";
import { z } from "zod";
import {
  favourites,
  enquiries,
  notifications,
  properties,
  type PropertyRow,
} from "../drizzle/schema";
import { seedProperties, type Property } from "../shared/properties";
import { getDb } from "./db";
import { storagePut } from "./storage";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";

const MAX_IMAGES = 12;
const MAX_AMENITIES = 40;
const MAX_IMAGE_URL_LENGTH = 2048;
const MAX_TOUR_URL_LENGTH = 2048;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_GLB_BYTES = 30 * 1024 * 1024;

const propertyKinds = ["sale", "rent"] as const;
const propertyTypes = ["Apartment", "House", "Loft"] as const;
const tourKinds = ["demo", "model", "embed", "none"] as const;

function badRequest(message: string): never {
  throw new TRPCError({ code: "BAD_REQUEST", message });
}

function notFound(message: string): never {
  throw new TRPCError({ code: "NOT_FOUND", message });
}

function forbidden(message: string): never {
  throw new TRPCError({ code: "FORBIDDEN", message });
}

export function assertPropertyOwnership(
  ownerId: number | null,
  userId: number
): void {
  if (ownerId !== userId) forbidden("You do not own this property");
}

async function requireDb() {
  const db = await getDb();
  if (!db) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Database is not available",
    });
  }
  return db;
}

function isStorageUrl(value: string): boolean {
  return (
    /^\/manus-storage\/[A-Za-z0-9._~/%-]+$/.test(value) &&
    !value.includes("..") &&
    !value.includes("//")
  );
}

function isHttpsUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
}

export function isValidImageUrl(value: string): boolean {
  return (
    value.length <= MAX_IMAGE_URL_LENGTH &&
    (isStorageUrl(value) || isHttpsUrl(value))
  );
}

function isMatterportOrKuulaUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.search.includes("javascript:")
    )
      return false;
    if (url.hostname === "my.matterport.com") {
      return (
        /^\/show\/[A-Za-z0-9_-]+(?:\/|$)/.test(url.pathname) ||
        (url.pathname === "/show/" &&
          /^[A-Za-z0-9_-]+$/.test(url.searchParams.get("m") ?? ""))
      );
    }
    if (url.hostname === "kuula.co")
      return /^\/post\/[A-Za-z0-9_-]+(?:\/|$)/.test(url.pathname);
    return false;
  } catch {
    return false;
  }
}

export function validatePropertyMedia(
  images: readonly string[],
  tourKind: Property["tourKind"],
  tourUrl: string | null | undefined
): string | null {
  if (images.length < 1) return "Add at least one property photo";
  if (images.length > MAX_IMAGES)
    return `A property can have at most ${MAX_IMAGES} images`;
  if (images.some(image => !isValidImageUrl(image))) {
    return "Images must be valid HTTPS URLs or project storage URLs";
  }

  const normalizedTourUrl = tourUrl ?? null;
  if (normalizedTourUrl && normalizedTourUrl.length > MAX_TOUR_URL_LENGTH) {
    return "The tour URL is too long";
  }
  if (tourKind === "none" && normalizedTourUrl !== null) {
    return "A property without a tour cannot include a tour URL";
  }
  if (
    tourKind === "embed" &&
    (!normalizedTourUrl || !isMatterportOrKuulaUrl(normalizedTourUrl))
  ) {
    return "Embedded tours must use a Matterport or Kuula HTTPS URL";
  }
  if (
    tourKind === "model" &&
    (!normalizedTourUrl || !isStorageUrl(normalizedTourUrl))
  ) {
    return "Model tours must use a project storage URL";
  }
  if (
    tourKind === "demo" &&
    normalizedTourUrl !== null &&
    !isStorageUrl(normalizedTourUrl) &&
    !isHttpsUrl(normalizedTourUrl)
  ) {
    return "Demo tours must use a valid HTTPS or project storage URL";
  }
  return null;
}

const propertyMediaRefinement = (
  value: {
    images: string[];
    tourKind: Property["tourKind"];
    tourUrl?: string | null;
  },
  ctx: z.RefinementCtx
) => {
  const error = validatePropertyMedia(
    value.images,
    value.tourKind,
    value.tourUrl
  );
  if (error)
    ctx.addIssue({ code: "custom", path: ["tourUrl"], message: error });
};

export const savePropertyInputSchema = z
  .object({
    id: z.number().int().positive().optional(),
    title: z.string().trim().min(1).max(200),
    location: z.string().trim().min(1).max(255),
    address: z.string().trim().min(1).max(500),
    city: z.string().trim().min(1).max(120),
    price: z.number().finite().positive().max(2_000_000_000),
    kind: z.enum(propertyKinds),
    type: z.enum(propertyTypes),
    beds: z.number().int().min(0).max(100),
    baths: z.number().finite().min(0).max(100),
    size: z.number().int().positive().max(10_000_000),
    description: z.string().trim().min(1).max(20_000),
    images: z
      .array(z.string().trim().min(1).max(MAX_IMAGE_URL_LENGTH))
      .min(1)
      .max(MAX_IMAGES),
    amenities: z.array(z.string().trim().min(1).max(120)).max(MAX_AMENITIES),
    tourKind: z.enum(tourKinds),
    tourUrl: z.string().trim().max(MAX_TOUR_URL_LENGTH).nullable().optional(),
    status: z.enum(["draft", "published"]),
    latitude: z.number().finite().min(-90).max(90).nullable().optional(),
    longitude: z.number().finite().min(-180).max(180).nullable().optional(),
  })
  .superRefine(propertyMediaRefinement);

export const listPropertiesInputSchema = z
  .object({
    kind: z.enum(propertyKinds).optional(),
    location: z.string().trim().max(255).optional(),
    minPrice: z.number().finite().nonnegative().optional(),
    maxPrice: z.number().finite().nonnegative().optional(),
    minSize: z.number().int().nonnegative().optional(),
    maxSize: z.number().int().nonnegative().optional(),
    beds: z.number().int().nonnegative().max(100).optional(),
    type: z.enum(propertyTypes).optional(),
    sort: z
      .enum(["recommended", "price-asc", "price-desc", "newest"])
      .default("recommended"),
    toursOnly: z.boolean().default(false),
  })
  .optional();

type ListPropertiesInput = {
  kind?: (typeof propertyKinds)[number];
  location?: string;
  minPrice?: number;
  maxPrice?: number;
  minSize?: number;
  maxSize?: number;
  beds?: number;
  type?: (typeof propertyTypes)[number];
  sort?: "recommended" | "price-asc" | "price-desc" | "newest";
  toursOnly?: boolean;
};

const detailInputSchema = z.object({ id: z.number().int().positive() });
const removeInputSchema = z.object({ id: z.number().int().positive() });
const favouriteInputSchema = z.object({
  propertyId: z.number().int().positive(),
});
const notificationInputSchema = z.object({ id: z.number().int().positive() });
const enquiryInputSchema = z.object({
  propertyId: z.number().int().positive(),
  message: z.string().trim().min(1).max(20_000),
  phone: z.string().trim().max(40).optional(),
});

const uploadContentTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "model/gltf-binary",
] as const;
const uploadInputSchema = z.object({
  name: z.string().trim().min(1).max(200),
  contentType: z.enum(uploadContentTypes),
  data: z.string().min(1),
});

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value))
    return value.filter((item): item is string => typeof item === "string");
  if (typeof value === "string") {
    try {
      const parsed: unknown = JSON.parse(value);
      return Array.isArray(parsed)
        ? parsed.filter((item): item is string => typeof item === "string")
        : [];
    } catch {
      return [];
    }
  }
  return [];
}

function rowToProperty(row: PropertyRow): Property {
  return {
    id: Number(row.id),
    ownerId: row.ownerId === null ? null : Number(row.ownerId),
    title: row.title,
    location: row.location,
    address: row.address,
    city: row.city,
    price: Number(row.price),
    kind: row.kind,
    type: row.type,
    beds: Number(row.beds),
    baths: Number(row.baths),
    size: Number(row.size),
    description: row.description,
    images: toStringArray(row.images),
    amenities: toStringArray(row.amenities),
    tourKind: row.tourKind,
    tourUrl: row.tourUrl,
    status: row.status,
    featured: Boolean(row.featured),
    isDemo: Boolean(row.isDemo),
    latitude: row.latitude === null ? null : Number(row.latitude),
    longitude: row.longitude === null ? null : Number(row.longitude),
    createdAt: row.createdAt,
  };
}

function cloneSeedProperty(property: Property): Property {
  return {
    ...property,
    images: [...property.images],
    amenities: [...property.amenities],
  };
}

function publicSeedProperties(): Property[] {
  return seedProperties
    .filter(property => property.status === "published")
    .map(cloneSeedProperty);
}

export async function getPublicProperties(): Promise<Property[]> {
  const db = await getDb();
  const persisted = db
    ? (
        await db
          .select()
          .from(properties)
          .where(eq(properties.status, "published"))
      ).map(rowToProperty)
    : [];

  const byId = new Map<number, Property>();
  for (const property of publicSeedProperties())
    byId.set(property.id, property);
  for (const property of persisted) {
    // The migration reserves IDs above the six static demo entries. Keep the
    // static entries authoritative if an old database has a colliding row.
    if (!byId.has(property.id)) byId.set(property.id, property);
  }
  return [...byId.values()];
}

export async function getPublicProperty(
  id: number
): Promise<Property | undefined> {
  const seed = publicSeedProperties().find(property => property.id === id);
  if (seed) return seed;

  const db = await getDb();
  if (!db) return undefined;
  const [row] = await db
    .select()
    .from(properties)
    .where(and(eq(properties.id, id), eq(properties.status, "published")))
    .limit(1);
  return row ? rowToProperty(row) : undefined;
}

export function filterAndSortProperties(
  propertiesToFilter: Property[],
  input: ListPropertiesInput | undefined
): Property[] {
  const filters: ListPropertiesInput = input ?? {};
  const location = filters.location?.toLowerCase();
  const result = propertiesToFilter.filter(property => {
    if (filters.kind && property.kind !== filters.kind) return false;
    if (filters.type && property.type !== filters.type) return false;
    if (filters.beds !== undefined && property.beds < filters.beds)
      return false;
    if (filters.minPrice !== undefined && property.price < filters.minPrice)
      return false;
    if (filters.maxPrice !== undefined && property.price > filters.maxPrice)
      return false;
    if (filters.minSize !== undefined && property.size < filters.minSize)
      return false;
    if (filters.maxSize !== undefined && property.size > filters.maxSize)
      return false;
    if (filters.toursOnly && property.tourKind === "none") return false;
    if (
      location &&
      ![property.location, property.address, property.city].some(value =>
        value.toLowerCase().includes(location)
      )
    ) {
      return false;
    }
    return true;
  });

  result.sort((left, right) => {
    switch (filters.sort ?? "recommended") {
      case "price-asc":
        return left.price - right.price || left.id - right.id;
      case "price-desc":
        return right.price - left.price || left.id - right.id;
      case "newest":
        return (
          right.createdAt.getTime() - left.createdAt.getTime() ||
          right.id - left.id
        );
      case "recommended":
      default:
        return (
          Number(right.featured) - Number(left.featured) ||
          right.createdAt.getTime() - left.createdAt.getTime() ||
          left.id - right.id
        );
    }
  });
  return result;
}

function propertyValues(
  input: z.infer<typeof savePropertyInputSchema>,
  ownerId: number
) {
  return {
    ownerId,
    title: input.title,
    location: input.location,
    address: input.address,
    city: input.city,
    price: input.price,
    kind: input.kind,
    type: input.type,
    beds: input.beds,
    baths: input.baths,
    size: input.size,
    description: input.description,
    images: input.images,
    amenities: input.amenities,
    tourKind: input.tourKind,
    tourUrl: input.tourUrl ?? null,
    status: input.status,
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
  };
}

function notificationForSave(
  property: z.infer<typeof savePropertyInputSchema>
) {
  const action =
    property.status === "published" ? "published" : "saved as a draft";
  return {
    title:
      property.status === "published"
        ? "Property published"
        : "Property draft saved",
    content: `“${property.title}” was ${action} in your Hearth marketplace account.`,
  };
}

export function assertUploadPayload(
  name: string,
  contentType: (typeof uploadContentTypes)[number],
  data: string
): Buffer {
  if (
    !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(
      data
    ) ||
    data.length % 4 !== 0
  ) {
    badRequest("Upload data must be valid base64");
  }

  const maxBytes =
    contentType === "model/gltf-binary" ? MAX_GLB_BYTES : MAX_IMAGE_BYTES;
  if (data.length > Math.ceil(maxBytes / 3) * 4 + 4)
    badRequest("Upload exceeds the size limit");
  const buffer = Buffer.from(data, "base64");
  if (buffer.byteLength === 0 || buffer.byteLength > maxBytes)
    badRequest("Upload exceeds the size limit");

  const extension =
    contentType === "model/gltf-binary"
      ? ".glb"
      : contentType.slice("image/".length) === "jpeg"
        ? ".jpg"
        : `.${contentType.slice("image/".length)}`;
  if (
    !name.toLowerCase().endsWith(extension) &&
    !(contentType === "image/jpeg" && name.toLowerCase().endsWith(".jpeg"))
  )
    badRequest(`A ${contentType} upload must use the ${extension} extension`);

  const isJpeg =
    contentType === "image/jpeg" &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff;
  const isPng =
    contentType === "image/png" &&
    buffer
      .subarray(0, 8)
      .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const isWebp =
    contentType === "image/webp" &&
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP";
  const isGlb =
    contentType === "model/gltf-binary" &&
    buffer.subarray(0, 4).toString("ascii") === "glTF";
  if (!isJpeg && !isPng && !isWebp && !isGlb)
    badRequest("Upload bytes do not match the declared content type");
  return buffer;
}

export const marketplaceRouter = router({
  list: publicProcedure
    .input(listPropertiesInputSchema)
    .query(async ({ input }) => {
      return filterAndSortProperties(await getPublicProperties(), input).map(
        property => ({ ...property, ownerId: null })
      );
    }),

  detail: publicProcedure.input(detailInputSchema).query(async ({ input }) => {
    const property = await getPublicProperty(input.id);
    return property ? { ...property, ownerId: null } : null;
  }),

  mine: protectedProcedure.query(async ({ ctx }) => {
    const db = await requireDb();
    const rows = await db
      .select()
      .from(properties)
      .where(
        and(
          eq(properties.ownerId, ctx.user.id),
          ne(properties.status, "removed")
        )
      )
      .orderBy(desc(properties.createdAt));
    return rows.map(rowToProperty);
  }),

  save: protectedProcedure
    .input(savePropertyInputSchema)
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const values = propertyValues(input, ctx.user.id);
      const notification = notificationForSave(input);
      let propertyId: number;

      await db.transaction(async tx => {
        if (input.id !== undefined) {
          const [current] = await tx
            .select()
            .from(properties)
            .where(eq(properties.id, input.id))
            .limit(1);
          if (!current) notFound("Property not found");
          assertPropertyOwnership(current.ownerId, ctx.user.id);
          await tx
            .update(properties)
            .set(values)
            .where(eq(properties.id, input.id));
          propertyId = input.id;
        } else {
          const [inserted] = await tx
            .insert(properties)
            .values(values)
            .$returningId();
          if (!inserted?.id)
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Property could not be saved",
            });
          propertyId = Number(inserted.id);
        }
        await tx.insert(notifications).values({
          userId: ctx.user.id,
          title: notification.title,
          content: notification.content,
        });
      });

      const [saved] = await db
        .select()
        .from(properties)
        .where(eq(properties.id, propertyId!))
        .limit(1);
      if (!saved)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Saved property could not be loaded",
        });
      return rowToProperty(saved);
    }),

  remove: protectedProcedure
    .input(removeInputSchema)
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const [current] = await db
        .select()
        .from(properties)
        .where(eq(properties.id, input.id))
        .limit(1);
      if (!current) notFound("Property not found");
      assertPropertyOwnership(current.ownerId, ctx.user.id);
      await db
        .update(properties)
        .set({ status: "removed" })
        .where(eq(properties.id, input.id));
      return { success: true } as const;
    }),

  favouriteIds: protectedProcedure.query(async ({ ctx }) => {
    const db = await requireDb();
    const rows = await db
      .select({ propertyId: favourites.propertyId })
      .from(favourites)
      .where(eq(favourites.userId, ctx.user.id));
    const availableIds = new Set(
      (await getPublicProperties()).map(property => property.id)
    );
    return rows
      .map(row => Number(row.propertyId))
      .filter(id => availableIds.has(id));
  }),

  toggleFavourite: protectedProcedure
    .input(favouriteInputSchema)
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const [existing] = await db
        .select()
        .from(favourites)
        .where(
          and(
            eq(favourites.userId, ctx.user.id),
            eq(favourites.propertyId, input.propertyId)
          )
        )
        .limit(1);
      if (existing) {
        await db
          .delete(favourites)
          .where(
            and(
              eq(favourites.userId, ctx.user.id),
              eq(favourites.propertyId, input.propertyId)
            )
          );
        return { saved: false } as const;
      }
      const property = await getPublicProperty(input.propertyId);
      if (!property) notFound("Property not found");
      await db
        .insert(favourites)
        .values({ userId: ctx.user.id, propertyId: input.propertyId });
      return { saved: true } as const;
    }),

  notifications: protectedProcedure.query(async ({ ctx }) => {
    const db = await requireDb();
    const rows = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, ctx.user.id))
      .orderBy(desc(notifications.createdAt))
      .limit(100);
    return rows.map(row => ({
      id: Number(row.id),
      title: row.title,
      content: row.content,
      createdAt: row.createdAt,
      read: Boolean(row.read),
    }));
  }),

  markRead: protectedProcedure
    .input(notificationInputSchema)
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const [notification] = await db
        .select({ id: notifications.id })
        .from(notifications)
        .where(
          and(
            eq(notifications.id, input.id),
            eq(notifications.userId, ctx.user.id)
          )
        )
        .limit(1);
      if (!notification) notFound("Notification not found");
      await db
        .update(notifications)
        .set({ read: true })
        .where(
          and(
            eq(notifications.id, input.id),
            eq(notifications.userId, ctx.user.id)
          )
        );
      return { success: true } as const;
    }),

  enquire: protectedProcedure
    .input(enquiryInputSchema)
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const [property] = await db
        .select()
        .from(properties)
        .where(
          and(
            eq(properties.id, input.propertyId),
            eq(properties.status, "published")
          )
        )
        .limit(1);
      if (!property || property.ownerId === null)
        notFound("Property is not available for enquiries");

      const phone = input.phone?.trim() || null;
      const sender =
        ctx.user.name?.trim() || ctx.user.email?.trim() || "A Hearth member";
      const content = `${sender} sent an enquiry about “${property.title}”:\n\n${input.message}${ctx.user.email ? `\n\nReply email: ${ctx.user.email}` : ""}${phone ? `\n\nPhone: ${phone}` : ""}`;
      await db.transaction(async tx => {
        await tx.insert(enquiries).values({
          propertyId: property.id,
          ownerId: property.ownerId!,
          senderId: ctx.user.id,
          message: input.message,
          phone,
        });
        await tx.insert(notifications).values({
          userId: property.ownerId!,
          title: "New property enquiry",
          content,
        });
        await tx.insert(notifications).values({
          userId: ctx.user.id,
          title: "Your enquiry was sent",
          content: `Your message about “${property.title}” was delivered to the owner’s Hearth inbox.\n\n${input.message}\n\nThe owner can use the contact details you shared to reply.`,
        });
      });
      return { success: true } as const;
    }),

  upload: protectedProcedure
    .input(uploadInputSchema)
    .mutation(async ({ ctx, input }) => {
      const buffer = assertUploadPayload(
        input.name,
        input.contentType,
        input.data
      );
      const safeName = input.name.replace(/[^A-Za-z0-9._-]+/g, "-");
      const uploaded = await storagePut(
        `marketplace/${ctx.user.id}/${safeName}`,
        buffer,
        input.contentType
      );
      return { url: uploaded.url };
    }),
});
