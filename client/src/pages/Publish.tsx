import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "wouter";
import {
  ArrowLeft,
  ArrowRight,
  Upload,
  ImagePlus,
  X,
  Check,
  House,
  Box,
  Save,
  ShieldCheck,
  Loader2,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useMarketplace } from "@/contexts/MarketplaceContext";
import type { Property } from "@shared/properties";
import NotFound from "./NotFound";

type Form = {
  title: string;
  address: string;
  city: string;
  location: string;
  price: string;
  kind: "sale" | "rent";
  type: "Apartment" | "House" | "Loft";
  beds: string;
  baths: string;
  size: string;
  description: string;
  images: string[];
  amenities: string[];
  tourKind: "none" | "embed" | "model";
  tourUrl: string;
};
const empty: Form = {
  title: "",
  address: "",
  city: "",
  location: "",
  price: "",
  kind: "sale",
  type: "Apartment",
  beds: "2",
  baths: "1",
  size: "",
  description: "",
  images: [],
  amenities: [],
  tourKind: "none",
  tourUrl: "",
};
const amenityOptions = [
  "Air conditioning",
  "Natural light",
  "Modern kitchen",
  "Private outdoor space",
  "Parking",
  "Pet friendly",
  "Elevator",
  "Balcony",
  "Garden",
  "Pool",
  "Gym",
  "Laundry",
];
export default function Publish() {
  const params = useParams<{ id?: string }>();
  const editingId = params.id ? Number(params.id) : undefined;
  const invalidEditRoute =
    params.id !== undefined &&
    !(editingId && Number.isInteger(editingId) && editingId > 0);
  const [, navigate] = useLocation();
  const { user, loading, signIn } = useMarketplace();
  const utils = trpc.useUtils();
  const mine = trpc.marketplace.mine.useQuery(undefined, {
    enabled: !!user && !!editingId && !invalidEditRoute,
    retry: false,
  });
  const [form, setForm] = useState<Form>(empty);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [error, setError] = useState("");
  const [loadedId, setLoadedId] = useState<number | null>(null);
  const upload = trpc.marketplace.upload.useMutation();
  const save = trpc.marketplace.save.useMutation({
    onSuccess: () => {
      utils.marketplace.mine.invalidate();
      utils.marketplace.list.invalidate();
      utils.marketplace.notifications.invalidate();
      toast.success(
        save.variables?.status === "published"
          ? "Your property is now live on Hearth"
          : "Your draft is saved"
      );
      navigate("/account");
    },
    onError: e => {
      setError(e.message);
      toast.error(e.message);
    },
  });
  useEffect(() => {
    if (!editingId || !mine.data || loadedId === editingId) return;
    const p = mine.data.find(p => p.id === editingId) as Property | undefined;
    if (p) {
      setForm({
        title: p.title,
        address: p.address,
        city: p.city,
        location: p.location,
        price: String(p.price),
        kind: p.kind,
        type: p.type,
        beds: String(p.beds),
        baths: String(p.baths),
        size: String(p.size),
        description: p.description,
        images: p.images,
        amenities: p.amenities,
        tourKind:
          p.tourKind === "model" || p.tourKind === "embed"
            ? p.tourKind
            : "none",
        tourUrl: p.tourUrl ?? "",
      });
      setLoadedId(editingId);
    }
  }, [editingId, mine.data, loadedId]);
  const update = <K extends keyof Form>(key: K, value: Form[K]) =>
    setForm(old => ({ ...old, [key]: value }));
  const uploadFiles = async (files: FileList | null, model = false) => {
    if (!files?.length) return;
    if (!user) {
      signIn();
      return;
    }
    const chosen = Array.from(files);
    if (!model && form.images.length + chosen.length > 12) {
      toast.error("Add up to 12 property photos");
      return;
    }
    setUploading(true);
    try {
      for (let i = 0; i < chosen.length; i++) {
        const file = chosen[i];
        if (file.size > (model ? 30 : 8) * 1024 * 1024)
          throw new Error(
            model
              ? "GLB models must be under 30 MB"
              : "Each photo must be under 8 MB"
          );
        if (
          !model &&
          !["image/jpeg", "image/png", "image/webp"].includes(file.type)
        )
          throw new Error("Use JPG, PNG or WebP photos");
        if (model && !file.name.toLowerCase().endsWith(".glb"))
          throw new Error("Use a GLB 3D model");
        setUploadProgress(
          model
            ? "Uploading your 3D model…"
            : `Uploading photo ${i + 1} of ${chosen.length}…`
        );
        const data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result).split(",")[1]);
          reader.onerror = () => reject(new Error("Could not read this file"));
          reader.readAsDataURL(file);
        });
        const result = await upload.mutateAsync({
          name: file.name,
          contentType: model
            ? "model/gltf-binary"
            : (file.type as "image/jpeg" | "image/png" | "image/webp"),
          data,
        });
        if (model) {
          setForm(old => ({ ...old, tourKind: "model", tourUrl: result.url }));
        } else {
          setForm(old => ({ ...old, images: [...old.images, result.url] }));
        }
      }
      toast.success(model ? "3D model uploaded" : "Property photos uploaded");
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Upload failed. Please try again."
      );
    } finally {
      setUploading(false);
      setUploadProgress("");
    }
  };
  const submit = (status: "draft" | "published") => {
    setError("");
    if (
      !form.title.trim() ||
      !form.address.trim() ||
      !form.city.trim() ||
      !form.location.trim() ||
      !form.description.trim() ||
      !form.price ||
      !form.size
    ) {
      setError(
        "Complete the property details, location, price, size and description before saving."
      );
      return;
    }
    if (form.images.length === 0) {
      setError("Add at least one property photo before saving.");
      return;
    }
    if (form.tourKind !== "none" && !form.tourUrl.trim()) {
      setError("Upload a GLB model or enter a supported hosted-tour URL.");
      return;
    }
    const numeric = {
      price: Number(form.price),
      beds: Number(form.beds),
      baths: Number(form.baths),
      size: Number(form.size),
    };
    if (
      numeric.price <= 0 ||
      numeric.size <= 0 ||
      numeric.beds < 0 ||
      numeric.baths < 1
    ) {
      setError(
        "Price and size must be positive, bedrooms cannot be negative and at least one bathroom is required."
      );
      return;
    }
    save.mutate({
      id: editingId,
      title: form.title.trim(),
      address: form.address.trim(),
      city: form.city.trim(),
      location: form.location.trim(),
      ...numeric,
      kind: form.kind,
      type: form.type,
      description: form.description.trim(),
      images: form.images,
      amenities: form.amenities,
      tourKind: form.tourKind,
      tourUrl: form.tourKind === "none" ? null : form.tourUrl.trim(),
      status,
    });
  };
  if (invalidEditRoute) return <NotFound />;
  if (loading || (editingId && mine.isLoading))
    return (
      <div className="section loading-state">
        Preparing your property workspace…
      </div>
    );
  if (!user)
    return (
      <div className="section account-page">
        <div className="account-gate">
          <div className="empty-icon">
            <House size={30} />
          </div>
          <span className="eyebrow">OPEN THE DOOR TO YOUR NEXT CHAPTER</span>
          <h1>Your home deserves a great first impression.</h1>
          <p>
            Create an account to publish your property, upload photography, and
            let prospective buyers explore with a 3D walkthrough.
          </p>
          <button
            className="button button-dark"
            onClick={() => signIn("register")}
          >
            Create an account
            <ArrowRight size={17} />
          </button>
          <button className="account-create" onClick={() => signIn()}>
            Already have an account? Sign in
          </button>
        </div>
      </div>
    );
  if (editingId && (mine.isError || !mine.data?.find(p => p.id === editingId)))
    return (
      <div className="section empty-state">
        <h2>This listing isn’t in your account.</h2>
        <p>
          {mine.error?.message || "Only the property owner can edit a listing."}
        </p>
        <Link href="/account" className="button button-dark">
          Back to my properties
        </Link>
      </div>
    );
  return (
    <div className="publish-page section">
      <Link href="/account" className="text-link">
        <ArrowLeft size={16} />
        Back to my properties
      </Link>
      <div className="publish-heading">
        <span className="eyebrow">FOR THE NEXT CHAPTER</span>
        <h1>
          {editingId
            ? "Make your home’s story even better."
            : "A great home. A new beginning."}
        </h1>
        <p>
          {editingId
            ? "Refine your listing, then save a draft or publish your updates."
            : "Tell the story of your property. We’ll help people picture themselves there."}
        </p>
      </div>
      <div className="publish-layout">
        <form
          className="publish-form"
          onSubmit={e => {
            e.preventDefault();
            submit("published");
          }}
        >
          <section className="form-section">
            <div className="form-section-heading">
              <span>01</span>
              <div>
                <h2>The essentials.</h2>
                <p>A little information goes a long way.</p>
              </div>
            </div>
            <div className="form-fields">
              <label className="span-2">
                Property title
                <input
                  required
                  maxLength={140}
                  value={form.title}
                  onChange={e => update("title", e.target.value)}
                  placeholder="e.g. A sunlit apartment in West Village"
                />
              </label>
              <label>
                Listing type
                <select
                  value={form.kind}
                  onChange={e => update("kind", e.target.value as Form["kind"])}
                >
                  <option value="sale">For sale</option>
                  <option value="rent">For rent</option>
                </select>
              </label>
              <label>
                Property type
                <select
                  value={form.type}
                  onChange={e => update("type", e.target.value as Form["type"])}
                >
                  <option>Apartment</option>
                  <option>House</option>
                  <option>Loft</option>
                </select>
              </label>
              <label>
                Price (USD{form.kind === "rent" ? " / month" : ""})
                <input
                  required
                  type="number"
                  min="1"
                  max="1000000000"
                  value={form.price}
                  onChange={e => update("price", e.target.value)}
                  placeholder={form.kind === "rent" ? "4,200" : "1,250,000"}
                />
              </label>
              <label>
                Size (sq ft)
                <input
                  required
                  type="number"
                  min="1"
                  max="1000000"
                  value={form.size}
                  onChange={e => update("size", e.target.value)}
                  placeholder="1,450"
                />
              </label>
              <label>
                Bedrooms
                <input
                  type="number"
                  min="0"
                  max="50"
                  required
                  value={form.beds}
                  onChange={e => update("beds", e.target.value)}
                />
              </label>
              <label>
                Bathrooms
                <input
                  type="number"
                  min="1"
                  max="50"
                  required
                  value={form.baths}
                  onChange={e => update("baths", e.target.value)}
                />
              </label>
            </div>
          </section>
          <section className="form-section">
            <div className="form-section-heading">
              <span>02</span>
              <div>
                <h2>A place on the map.</h2>
                <p>Help people find their new neighbourhood.</p>
              </div>
            </div>
            <div className="form-fields">
              <label className="span-2">
                Street address
                <input
                  required
                  value={form.address}
                  maxLength={240}
                  onChange={e => update("address", e.target.value)}
                  placeholder="120 Greenwich Avenue"
                />
              </label>
              <label>
                City
                <input
                  required
                  value={form.city}
                  maxLength={120}
                  onChange={e => update("city", e.target.value)}
                  placeholder="New York"
                />
              </label>
              <label>
                Neighbourhood and city
                <input
                  required
                  value={form.location}
                  maxLength={240}
                  onChange={e => update("location", e.target.value)}
                  placeholder="West Village, New York"
                />
              </label>
            </div>
          </section>
          <section className="form-section">
            <div className="form-section-heading">
              <span>03</span>
              <div>
                <h2>Let the space speak.</h2>
                <p>Upload 1–12 JPG, PNG or WebP photos. Up to 8 MB each.</p>
              </div>
            </div>
            <label className={`upload-zone ${uploading ? "uploading" : ""}`}>
              <ImagePlus size={30} />
              <strong>
                {uploading ? uploadProgress : "Choose property photos"}
              </strong>
              <span>The first image will be your listing cover.</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                disabled={uploading}
                onChange={e => {
                  uploadFiles(e.target.files);
                  e.target.value = "";
                }}
              />
            </label>
            {form.images.length > 0 && (
              <div className="upload-preview">
                {form.images.map((image, i) => (
                  <div key={`${image}-${i}`}>
                    <img src={image} alt={`Property photo ${i + 1}`} />
                    {i === 0 && <span>COVER</span>}
                    <button
                      type="button"
                      aria-label={`Remove photo ${i + 1}`}
                      disabled={uploading}
                      onClick={() =>
                        update(
                          "images",
                          form.images.filter((_, j) => j !== i)
                        )
                      }
                    >
                      <X size={15} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
          <section className="form-section">
            <div className="form-section-heading">
              <span>04</span>
              <div>
                <h2>Every home has a story.</h2>
                <p>Tell people what makes yours special.</p>
              </div>
            </div>
            <div className="form-fields">
              <label className="span-2">
                Property description
                <textarea
                  required
                  minLength={20}
                  maxLength={10000}
                  value={form.description}
                  onChange={e => update("description", e.target.value)}
                  placeholder="Describe the layout, light, materials and the little details that make this home yours…"
                />
              </label>
            </div>
            <h4 className="form-amenities-heading">Amenities</h4>
            <div className="amenity-options">
              {amenityOptions.map(a => (
                <button
                  key={a}
                  type="button"
                  aria-pressed={form.amenities.includes(a)}
                  className={form.amenities.includes(a) ? "selected" : ""}
                  onClick={() =>
                    update(
                      "amenities",
                      form.amenities.includes(a)
                        ? form.amenities.filter(v => v !== a)
                        : [...form.amenities, a]
                    )
                  }
                >
                  {form.amenities.includes(a) ? (
                    <Check size={14} />
                  ) : (
                    <Plus size={14} />
                  )}{" "}
                  {a}
                </button>
              ))}
            </div>
          </section>
          <section className="form-section">
            <div className="form-section-heading">
              <span>05</span>
              <div>
                <h2>Give them a new perspective.</h2>
                <p>Add a 3D tour so people can explore before they visit.</p>
              </div>
            </div>
            <div className="tour-type-options">
              {(
                [
                  { value: "none", label: "No tour yet" },
                  { value: "embed", label: "Hosted 3D tour" },
                  { value: "model", label: "Upload GLB model" },
                ] as const
              ).map(v => (
                <button
                  type="button"
                  key={v.value}
                  className={form.tourKind === v.value ? "selected" : ""}
                  onClick={() =>
                    setForm(old => ({ ...old, tourKind: v.value, tourUrl: "" }))
                  }
                >
                  {v.value !== "none" && <Box size={17} />} {v.label}
                </button>
              ))}
            </div>
            {form.tourKind === "embed" && (
              <label className="standalone-label">
                Matterport or Kuula tour URL
                <input
                  type="url"
                  value={form.tourUrl}
                  onChange={e => update("tourUrl", e.target.value)}
                  placeholder="https://my.matterport.com/show/?m=…"
                />
                <small>
                  Only HTTPS Matterport /show/ or Kuula /post/ tour links are
                  supported.
                </small>
              </label>
            )}
            {form.tourKind === "model" && (
              <div>
                <label className="upload-zone model-upload">
                  <Box size={27} />
                  <strong>
                    {uploading
                      ? uploadProgress
                      : form.tourUrl
                        ? "3D model uploaded — choose to replace"
                        : "Choose a GLB walkthrough model"}
                  </strong>
                  <span>
                    GLB only. Up to 30 MB. Use a model you have permission to
                    share.
                  </span>
                  <input
                    type="file"
                    accept=".glb,model/gltf-binary"
                    disabled={uploading}
                    onChange={e => {
                      uploadFiles(e.target.files, true);
                      e.target.value = "";
                    }}
                  />
                </label>
                {form.tourUrl && (
                  <p className="model-upload-success">
                    <Check size={15} />
                    Your model is ready for the interactive viewer.
                  </p>
                )}
              </div>
            )}
          </section>
          {error && (
            <div role="alert" className="form-error">
              {error}
            </div>
          )}
          <div className="publish-submit">
            <button
              type="button"
              className="button button-light"
              disabled={save.isPending || uploading}
              onClick={() => submit("draft")}
            >
              <Save size={16} />
              Save draft
            </button>
            <button
              type="submit"
              className="button button-dark"
              disabled={save.isPending || uploading}
            >
              {save.isPending ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <ArrowRight size={16} />
              )}{" "}
              {save.isPending
                ? "Saving your property…"
                : editingId
                  ? "Publish updates"
                  : "Publish property"}
            </button>
          </div>
          <p className="publish-legal">
            By publishing, you confirm that the property details are accurate
            and that you have the right to list it and share its media.
          </p>
        </form>
        <aside className="publish-tips">
          <div className="tips-icon">
            <House size={28} />
          </div>
          <h3>
            A thoughtful listing
            <br />
            makes a difference.
          </h3>
          <p>Help people get a true feeling for your home.</p>
          <div>
            <strong>Let the light in.</strong>
            <span>
              Use bright, clear photos that show each room in its best natural
              light.
            </span>
          </div>
          <div>
            <strong>Tell the whole story.</strong>
            <span>
              Include useful details about the layout, neighbourhood, and what
              makes the space special.
            </span>
          </div>
          <div>
            <strong>Invite them inside.</strong>
            <span>
              A 3D model or hosted tour gives people a way to explore, wherever
              they are.
            </span>
          </div>
          <small>
            <ShieldCheck size={15} />
            Only you can edit or remove your listings.
          </small>
        </aside>
      </div>
    </div>
  );
}
