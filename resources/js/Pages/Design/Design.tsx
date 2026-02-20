  "use client";

  import React, { useState, useMemo, useEffect, useRef } from "react";
  import { Head, usePage, router } from "@inertiajs/react";
  import { ArrowLeft, ArrowRight, X, Shirt, Upload as UploadIcon, Type, Image as ClipartIcon } from "lucide-react";
  import { route } from "ziggy-js";



  import ProductEdit from "./Sidebar/ProductEdit";
  import AddText from "./Sidebar/TextSideBar/AddText";
  import Clipart from "./Sidebar/ClipartSideBar/UI/Clipart";
  import UploadSidebar from "./Sidebar/UploadSideBar/UploadSidebar";
  import ChangeProductModal from "./ChangeProduct";
  import Canvas from "./Canvas/Canvas";
  import TextProperties from "./Sidebar/TextSideBar/TextProperties/TextProperties";
  import MultiSelectPanel from "./Sidebar/MultiSelectPanel";
  import ClipartProperties from "./Sidebar/ClipartSideBar/Properties/ClipartProperties";
  import SidebarHeader from "./Components/SidebarHeader";
  import ClipartSectionsPage from "./Sidebar/ClipartSideBar/UI/ClipartSectionsPage";
  import BlankSidebar from "./Sidebar/BlankSidebar";
  import DesignNavbar from "./Components/DesignNavbar";
  import MyDesignsSidebar from "./Sidebar/OtherSideBar/MyDesignsSidebar";

  export interface Product {
    id: number;
    name: string;
    slug: string;
    brand?: string;
    price?: number | string;
    original_price?: number | string | null;
    images?: any[];
    image?: string;
    colourProducts?: any[];
    sizes?: string[];
    categories?: any[];
  }



  export type CanvasPosition = {
    x: number;
    y: number;
    width: number;
    height: number;
    scale: number;
  };

  export type ImageState = {
    url: string;
    type: "image" | "text";
    isClipart?: boolean;
    isSvg?: boolean;
    text?: string;
    fontFamily?: string;
    rotation: number;
    flip: "none" | "horizontal" | "vertical";
    size: { w: number; h: number };
    color?: string;
    borderColor?: string;
    borderWidth?: number;
    canvasPositions?: Record<string, CanvasPosition>;
    restrictedBox?: { x: number; y: number; w: number; h: number };
    original: {
      url: string;
      rotation: number;
      flip: "none" | "horizontal" | "vertical";
      size: { w: number; h: number };
      color?: string;
      renderKey?: string;
    };
    fontSize?: number;
    width?: number;
    renderKey?: string;
  };

  type SidebarView =
    | "blank"
    | "product"
    | "upload"
    | "text"
    | "clipart"
    | "clipart-sections"
    | "clipart-properties"
    | "my-designs";
    

  export default function Design() {
    const { props } = usePage();

    
    
    const { product, selectedColour: propColour, selectedSize: propSize, onResizeTextCommit } = props;


    // 1️⃣ Create currentProduct state first
  const [currentProduct, setCurrentProduct] = useState<Product | null>(product ?? null);

  // 2️⃣ Create safeProduct after currentProduct exists
  const safeProduct: Product = currentProduct ?? {
    id: 0,
    name: "Unknown",
    brand: "",
    slug: "",
    images: [],
    sizes: [],
    colourProducts: [],
    categories: [],
  };

  // 3️⃣ Optional: safe name
  const safeName: string = safeProduct.name ?? "Unknown";


    // ---------------- STATES ----------------
    const [isChangeProductModalOpen, setIsChangeProductModalOpen] = useState(false);
    const [imageState, setImageState] = useState<Record<string, ImageState>>({});
    const [uploadedImages, setUploadedImages] = useState<string[]>([]);
    const [selectedUploadedImage, setSelectedUploadedImage] = useState<string | null>(null);
    const [selectedText, setSelectedText] = useState<string | null>(null);
    const [selectedClipart, setSelectedClipart] = useState<string | null>(null);

    const [sidebarTitleOverride, setSidebarTitleOverride] = useState<string | null>(null);
    const [sidebarStack, setSidebarStack] = useState<SidebarView[]>(["product"]);
    const activeSidebar = sidebarStack[sidebarStack.length - 1];

    
    const [mainImage, setMainImage] = useState("");
    const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
    const canvasRef = useRef<HTMLDivElement | null>(null);
    const [selectedObjects, setSelectedObjects] = useState<string[]>([]);
    const [replaceClipartId, setReplaceClipartId] = useState<string | null>(null);
    const [positions, setPositions] = useState<Record<string, {

  

      x: number;
      y: number;
      width: number;
      height: number;
      scale: number;
  }>>({});

    const [sizes, setSizes] = useState<Record<string, { w: number; h: number }>>({});

    const normalizeImages = (images: any[]) =>
    (images ?? []).map(img => (typeof img === "string" ? img : img.url ?? img.path ?? ""));

  const [displayImages, setDisplayImages] = useState<string[]>(
    normalizeImages(currentProduct?.images ?? [])
  );

    // ---------------- UTILS ----------------
  const setSelectedUploadedImageWithLog = (uid: string | null) => {
    console.log("🟢 setSelectedUploadedImage called:", uid);
    setSelectedUploadedImage(uid);

    // If an uploaded image is selected, always switch sidebar to Upload
    if (uid) {
      setSidebarStack(["upload"]);
    }
  };


    const goBackSidebar = () => {
      setSidebarStack(prev => (prev.length <= 1 ? prev : prev.slice(0, -1)));
    };

    const canGoBack = sidebarStack.length > 1;

    const closeToBlank = () => {
      setSelectedObjects([]);
      setSelectedUploadedImage(null);
      setSelectedText(null);
      setSidebarTitleOverride(null);
      setSidebarStack(["blank"]);
    };

    const restrictedBox = {
      left: canvasSize.width * 0.367,
      top: canvasSize.height * 0.1,
      width: canvasSize.width * 0.26,
      height: canvasSize.height * 0.65,
    };

  const variantsByColour = useMemo(() => {
    const grouped: Record<string, any[]> = {};
    if (!currentProduct) return grouped;

    (currentProduct.colourProducts ?? []).forEach(cp => {
      const colour = cp.colour;
      const sizes = cp.sizes ?? [];
      const images = cp.images ?? currentProduct.images ?? [];
      if (!grouped[colour]) grouped[colour] = [];
      if (sizes.length) {
        sizes.forEach(s => grouped[colour].push({ colour, size: s, images }));
      } else {
        grouped[colour].push({ colour, size: undefined, images });
      }
    });

    return grouped;
  }, [currentProduct]);



    const uniqueColours = Object.keys(variantsByColour);
    const [selectedColour, setSelectedColour] = useState<string | null>(null);
    const [selectedSize, setSelectedSize] = useState<string | null>(null);



    // ---------------- EFFECTS ----------------

    // 🔁 Sync Inertia props → local state (IMPORTANT)
  useEffect(() => {
    if (!product) return;

    setCurrentProduct(product);

    if (propColour) {
      setSelectedColour(propColour);
    }

    if (propSize) {
      setSelectedSize(propSize);
    }
  }, [product, propColour, propSize]);


    useEffect(() => {
      if (!canvasRef.current) return;
      const updateSize = () => {
        const { width, height } = canvasRef.current!.getBoundingClientRect();
        setCanvasSize({ width, height });
      };
      updateSize();
      window.addEventListener("resize", updateSize);
      return () => window.removeEventListener("resize", updateSize);
    }, []);

  useEffect(() => {
    // 🟢 CASE 1: product has NO colour variants
    if (!selectedColour || !variantsByColour[selectedColour]) {
      const fallbackImages = normalizeImages(currentProduct?.images ?? []);
      setDisplayImages(fallbackImages);
      setMainImage(fallbackImages[0] ?? "");
      return;
    }

    // 🟢 CASE 2: product HAS colour variants
    const colourVariants = variantsByColour[selectedColour];
    const variant =
      colourVariants.find(v => v.size === selectedSize) ?? colourVariants[0];

      


    const sorted = normalizeImages(variant?.images ?? []);
  }, [currentProduct, selectedColour, selectedSize, variantsByColour]);



    useEffect(() => {
    if (
      selectedUploadedImage &&
      imageState[selectedUploadedImage]?.type === "image" &&
      !imageState[selectedUploadedImage]?.isClipart
    ) {
      setSidebarTitleOverride("Image Properties"); // override only when an image is selected
    } else {
      setSidebarTitleOverride(null); // revert to default title
    }

    console.group("🟡 DESIGN IMAGE STATE");
    console.log("currentProduct:", currentProduct);
    console.log("selectedColour:", selectedColour);
    console.log("selectedSize:", selectedSize);
    console.log("displayImages:", displayImages);
    console.log("mainImage:", mainImage);
    console.groupEnd();
  }, [selectedUploadedImage, imageState]);





  // ---------- TYPES ----------
  type HistorySnapshot = {
    product: Product | null;
    imageState: Record<string, ImageState>;
    positions: Record<string, CanvasPosition>;
    sizes: Record<string, { w: number; h: number }>;
    selectedColour: string | null;
    selectedSize: string | null;
  };

  // ---------- STATES ----------

  const [history, setHistory] = useState<HistorySnapshot[]>([]);

  const [historyIndex, setHistoryIndex] = useState(-1);


  // ---------- CURRENT VARIANT ----------
  const currentVariant = useMemo(() => {
    if (!selectedColour || !variantsByColour[selectedColour]) return undefined;
    const colourVariants = variantsByColour[selectedColour];
    return colourVariants.find(v => v.size === selectedSize) ?? colourVariants[0];
  }, [selectedColour, selectedSize, variantsByColour]);





  // ---------- SEED INITIAL STATE ----------
  const hasSeededHistory = useRef(false);

  useEffect(() => {
    if (hasSeededHistory.current) return;
    if (!currentProduct || !selectedColour) return; // ✅ use currentProduct

    const snapshot: HistorySnapshot = {
      product: structuredClone(currentProduct),
      imageState: structuredClone(imageState),
      positions: structuredClone(positions),
      sizes: structuredClone(sizes),
      selectedColour,
      selectedSize,
    };

    console.groupCollapsed("%c🌱 SEED HISTORY", "color:#3b82f6;font-weight:bold");
    console.log("product →", currentProduct?.slug);
    console.log("colour →", selectedColour);
    console.log("size →", selectedSize);
    console.groupEnd();

    setHistory([snapshot]);
    setHistoryIndex(0);
    hasSeededHistory.current = true;
  }, [currentProduct, selectedColour]);

  // ---------- PRODUCT CHANGES ----------
  const handleColourChange = (colour: string) => {
    if (colour === selectedColour) return;
    setSelectedColour(colour);

    // Reset size to first available for this colour
    const variants = variantsByColour[colour];
    if (variants?.length) {
      setSelectedSize(variants[0].size ?? null);
      const images = normalizeImages(variants[0].images ?? []);
      setDisplayImages(images);
      setMainImage(images[0] ?? "");
    } else {
      // fallback
      setSelectedSize(null);
      const fallbackImages = normalizeImages(currentProduct?.images ?? []);
      setDisplayImages(fallbackImages);
      setMainImage(fallbackImages[0] ?? "");
    }
  };

  const handleSizeChange = (size: string) => {
    if (size === selectedSize) return;
    setSelectedSize(size);
  };


  const beginResize = () => {
  };


  const handleProductSelect = (product: Product) => {
    router.get(
      route("design.show", { slug: product.slug }), // ✅ must use slug
      {},
      { preserveState: false } // can be true if you want smoother Inertia reload
    );
  };


  useEffect(() => {
    if (!currentProduct) return;

    // No colour selected → fallback to product images
    if (!selectedColour || !variantsByColour[selectedColour]) {
      const fallbackImages = normalizeImages(currentProduct?.images ?? []);
      setDisplayImages(fallbackImages);
      setMainImage(fallbackImages[0] ?? "");
      return;
    }

    // Colour selected → get variant by size
    const colourVariants = variantsByColour[selectedColour];

    // Pick the variant that matches selectedSize, fallback to first
    const variant = colourVariants.find(v => v.size === selectedSize) ?? colourVariants[0];

    const images = normalizeImages(variant?.images ?? []);
    setDisplayImages(images);
    setMainImage(images[0] ?? "");
  }, [currentProduct, selectedColour, selectedSize, variantsByColour]);



  const lastProductRef = useRef<Product | null>(null);

  useEffect(() => {
    if (!currentProduct) return;
    if (lastProductRef.current === currentProduct) return;

    if (lastProductRef.current !== null) {
    }

    lastProductRef.current = currentProduct;
  }, [currentProduct, selectedColour, selectedSize]);




    // ---------------- HANDLERS ----------------
  const beginRotate = () => {
  };

  const handleRotateImage = (uid: string, angle: number) => {
    setImageState(prev => ({
      ...prev,
      [uid]: { ...prev[uid], rotation: angle },
    }));
  };


  const handleFlipImage = (id: string, flip: "none" | "horizontal" | "vertical") => {
    setImageState((prev) => {
      const current = prev[id];
      if (!current) return prev;
      return {
        ...prev,
        [id]: {
          ...current,
          flip,
        },
      };
    });
  };


  const handleUpdateImageSize = (uid: string, w: number, h: number) => {
    setImageState(prev => ({
      ...prev,
      [uid]: {
        ...(prev[uid] ?? { rotation: 0, flip: "none", size: { w: 150, h: 150 } }),
        size: { w, h },
      },
    }));

    setSizes(prev => ({
      ...prev,
      [uid]: { w, h },
    }));
  };



    const handleChangeImageColor = (uid: string, color: string) => {
      setImageState(prev => prev[uid] ? { ...prev, [uid]: { ...prev[uid], color } } : prev);
    };

    const handleAddClipart = (src: string) => {
      const uid = crypto.randomUUID();
      const size = { w: 150, h: 150 };
      setImageState(prev => ({
        ...prev,
        [uid]: {
          url: src,
          type: "image",
          isClipart: true,
          rotation: 0,
          flip: "none",
          size,
          color: "#000000",
          renderKey: crypto.randomUUID(),
          original: { url: src, rotation: 0, flip: "none", size: { ...size } },
        },
      }));
      setSelectedUploadedImageWithLog(uid);
      setSelectedText(null);
      setSidebarStack(["clipart"]);
    };

    const handleReplaceClipart = (src: string) => {
      if (!replaceClipartId) return;
      setImageState(prev => {
        const layer = prev[replaceClipartId];
        if (!layer || !layer.isClipart) return prev;
        return {
          ...prev,
          [replaceClipartId]: {
            ...layer,
            url: src,
            color: "#000000",
            original: { ...layer.original, url: src },
          },
        };
      });
      setSelectedUploadedImageWithLog(replaceClipartId);
      setReplaceClipartId(null);
      setSidebarStack(["clipart"]);
    };

    const handleChangeClipart = () => {
      if (!selectedUploadedImage) return;
      setReplaceClipartId(selectedUploadedImage);
      setSelectedUploadedImageWithLog(null);
      setSidebarStack(["clipart"]);
    };

  const handleUpload = (url: string) => {
    const uid = crypto.randomUUID();
    const defaultSize = { w: 150, h: 150 };

    // Add to uploaded images list
    setUploadedImages(prev => [...prev, uid]);

    // Add new image to image state
    setImageState(prev => ({
      ...prev,
      [uid]: {
        url,
        type: "image",
        rotation: 0,
        flip: "none",
        size: defaultSize,
        canvasPositions: {
          [uid]: { x: 100, y: 100, width: defaultSize.w, height: defaultSize.h, scale: 1 },
        },
        restrictedBox: { x: 0, y: 0, w: 600, h: 600 },
        original: { url, rotation: 0, flip: "none", size: { ...defaultSize } },
        isClipart: false,
        isSvg: false,
        text: undefined,
        fontFamily: undefined,
        color: undefined,
        borderColor: undefined,
        borderWidth: undefined,
        fontSize: undefined,
        width: undefined,
        renderKey: undefined,
      },
    }));

    // Add to sizes for layout
    setSizes(prev => ({
      ...prev,
      [uid]: { ...defaultSize },
    }));

    // Select the newly uploaded image
    setSelectedUploadedImageWithLog(uid);

    // Always show the Upload sidebar
    setSidebarStack(["upload"]);
  };



    const handleDuplicateUploadedImage = (uid: string) => {
      const source = imageState[uid];
      if (!source) return;
      const dup = crypto.randomUUID();
      const originalPos = source.canvasPositions?.[uid] ?? { x: 100, y: 100, width: source.size.w, height: source.size.h, scale: 1 };
      setUploadedImages(prev => [...prev, dup]);
      setImageState(prev => ({
        ...prev,
        [dup]: { ...source, renderKey: crypto.randomUUID(), canvasPositions: { [dup]: { ...originalPos, x: originalPos.x + 20, y: originalPos.y + 20 } } },
      }));
      setSelectedUploadedImageWithLog(dup);
      setSidebarStack(["upload"]);
    };

    const handleRemoveUploadedImage = (uid: string) => {
      setUploadedImages(prev => prev.filter(u => u !== uid));
      setImageState(prev => {
        const next = { ...prev };
        delete next[uid];
        return next;
      });
      if (selectedUploadedImage === uid) setSelectedUploadedImageWithLog(null);
    };

    const deleteTextLayer = (uid: string) => {
      setImageState(prev => { const next = { ...prev }; delete next[uid]; return next; });
      setSelectedText(null);
      setSelectedObjects(prev => prev.filter(id => id !== uid));
      setSidebarStack(["text"]);
    };

    const duplicateTextLayer = (uid: string) => {
      const source = imageState[uid];
      if (!source || source.type !== "text") return;
      const newId = crypto.randomUUID();
      setImageState(prev => ({ ...prev, [newId]: { ...source, renderKey: crypto.randomUUID() } }));
      setSelectedText(newId);
      setSidebarStack(["text"]);

      
    };




  const handleCanvasSelectionChange = (objects: string[]) => {
    setSelectedObjects(objects);

    const textLayer =
      objects.find(uid => imageState[uid]?.type === "text") ?? null;

    const imageLayer =
      objects.find(uid => imageState[uid]?.type === "image") ?? null;

    // ---- TEXT ----
    if (textLayer) {
      setSelectedText(textLayer);
      setSelectedUploadedImageWithLog(null);

      // 🔥 FORCE TAB SWITCH
      setSidebarStack(prev =>
        prev[prev.length - 1] === "text" ? prev : ["product", "text"]
      );

      return;
    }

    // ---- IMAGE / CLIPART ----
    if (imageLayer) {
      setSelectedText(null);
      setSelectedUploadedImageWithLog(imageLayer);

      const isClipart = imageState[imageLayer]?.isClipart;

      // 🔥 FORCE TAB SWITCH
      setSidebarStack(prev =>
        prev[prev.length - 1] === (isClipart ? "clipart" : "upload")
          ? prev
          : ["product", isClipart ? "clipart" : "upload"]
      );

      return;
    }

    // ---- NOTHING ----
    setSelectedText(null);
    setSelectedUploadedImageWithLog(null);
  };





    const updateTextLayer = (uid: string, updates: Partial<ImageState>) => {
      setImageState(prev => ({ ...prev, [uid]: { ...prev[uid], ...updates } }));
    };

  // ---------------- SIDEBAR TITLES ----------------
const SIDEBAR_TITLES: Record<string, string | ((props: any) => string)> = {
  product: "Product",
  text: ({ selectedText }: any) => (selectedText ? "Text Properties" : "Text"),
  clipart: ({ selectedUploadedImage, imageState }: any) =>
    selectedUploadedImage && imageState[selectedUploadedImage]?.isClipart
      ? "Clipart Properties"
      : "Clipart",
  upload: "Upload", // always Upload
  "my-designs": "My Designs", // ✅ ADD THIS LINE
};




    const renderActiveTab = () => {
      if (selectedObjects.length > 1) return <MultiSelectPanel selectedObjects={selectedObjects} imageState={imageState} />;
      if (activeSidebar === "blank") return <BlankSidebar onOpenProduct={() => setSidebarStack(["product"])} onOpenUpload={() => setSidebarStack(["upload"])} onOpenText={() => setSidebarStack(["text"])} onOpenClipart={() => setSidebarStack(["clipart"])} />;

      switch (activeSidebar) {
        case "product":
          return <ProductEdit
              product={safeProduct}
              selectedColour={selectedColour}
              selectedSize={selectedSize}
              onColourChange={handleColourChange}
              onSizeChange={handleSizeChange}
              onOpenChangeProductModal={() => setIsChangeProductModalOpen(true)}
            />;

  case "upload":
    return (
      <UploadSidebar
        canvasRef={canvasRef}  
        onUpload={handleUpload}
        recentImages={uploadedImages}
        selectedImage={selectedUploadedImage}
        onSelectImage={setSelectedUploadedImageWithLog}
        imageState={imageState}
        uploadedImages={imageState} 
        setImageState={setImageState}
        onRotateImage={handleRotateImage}
        onFlipImage={handleFlipImage}
        onUpdateImageSize={handleUpdateImageSize}
        onRemoveUploadedImage={handleRemoveUploadedImage}
        onDuplicateUploadedImage={handleDuplicateUploadedImage}
        restrictedBox={restrictedBox}
        canvasPositions={positions}
        onResetImage={handleResetImage}
      />
    );



        case "text":
          if (!selectedText || !imageState[selectedText]) return <AddText onAddText={layer => { setImageState(prev => ({ ...prev, [layer.id]: { url: "", type: "text", text: layer.text, rotation: 0, flip: "none", size: { w: 200, h: layer.fontSize }, fontFamily: layer.font, color: layer.color, borderColor: layer.borderColor, borderWidth: layer.borderWidth, fontSize: layer.fontSize, width: layer.width, original: { url: "", rotation: 0, flip: "none", size: { w: 200, h: layer.fontSize } } } })); setSelectedText(layer.id); setSidebarStack(["text"]); }} />;

          const layer = imageState[selectedText];
          return <TextProperties textValue={layer.text ?? ""} onTextChange={val => updateTextLayer(selectedText, { text: val })} fontFamily={layer.fontFamily ?? "Arial"} onFontChange={val => updateTextLayer(selectedText, { fontFamily: val })} color={layer.color ?? "#000000"} onColorChange={val => updateTextLayer(selectedText, { color: val })} rotation={layer.rotation ?? 0} onRotationChange={val => updateTextLayer(selectedText, { rotation: val })} fontSize={layer.fontSize ?? 24} onFontSizeChange={val => updateTextLayer(selectedText, { fontSize: val })} borderColor={layer.borderColor ?? "#000000"} onBorderColorChange={val => updateTextLayer(selectedText, { borderColor: val })} borderWidth={layer.borderWidth ?? 0} onBorderWidthChange={val => updateTextLayer(selectedText, { borderWidth: val })} flip={layer.flip ?? "none"} onFlipChange={val => updateTextLayer(selectedText, { flip: val })} onDuplicate={() => duplicateTextLayer(selectedText)} onDelete={() => deleteTextLayer(selectedText)} restrictedBox={restrictedBox} />;

        case "clipart":
          const clipartLayer = selectedUploadedImage && imageState[selectedUploadedImage]?.isClipart ? imageState[selectedUploadedImage] : null;
          if (clipartLayer) return <ClipartProperties layer={clipartLayer} restrictedBox={restrictedBox} canvasPosition={positions[clipartLayer.url]} onRotate={v => handleRotateImage(selectedUploadedImage!, v)} onFlip={v => handleFlipImage(selectedUploadedImage!, v)} onResize={(w, h) => handleUpdateImageSize(selectedUploadedImage!, w, h)} onChangeColor={color => handleChangeImageColor(selectedUploadedImage!, color)} onChangeArt={handleChangeClipart} onDelete={() => handleRemoveUploadedImage(selectedUploadedImage!)} onDuplicate={() => handleDuplicateUploadedImage(selectedUploadedImage!)} />;

          return <Clipart onBack={goBackSidebar} onAddClipart={url => replaceClipartId ? handleReplaceClipart(url) : handleAddClipart(url)} setSidebarTitle={setSidebarTitleOverride} onOpenSections={() => { setSidebarTitleOverride(null); setSidebarStack(["clipart-sections"]); }} />;

        case "clipart-sections":
          return <ClipartSectionsPage onBack={() => { setSidebarTitleOverride(null); goBackSidebar(); }} />;

              
case "my-designs":
  return (
    <MyDesignsSidebar
      closeSidebar={goBackSidebar}
      isSignedIn={Boolean(props.user)} // pass the signed-in state
      designs={props.user?.designs ?? [
        { id: 1, name: "Design 1" },
        { id: 2, name: "Design 2" },
      ]}
      onSelectDesign={(design) => handleProductSelect(design)}
    />
  );
        default:
          return <BlankSidebar onOpenProduct={() => setSidebarStack(["product"])} onOpenUpload={() => setSidebarStack(["upload"])} onOpenText={() => setSidebarStack(["text"])} onOpenClipart={() => setSidebarStack(["clipart"])} />;
      }
    };

    const handleResetImage = (uid: string) => {

      setImageState(prev => {
        const layer = prev[uid];
        if (!layer || !layer.original) return prev;
        return { ...prev, [uid]: { ...layer, ...layer.original } };
      });
    };


    const handleResizeText = (uid: string, newFontSize: number) => {
    if (!uid) return;
    setImageState(prev => ({
      ...prev,
      [uid]: {
        ...prev[uid],
        fontSize: newFontSize
      }
    }));
  };


  
  return (
    <div className="min-h-screen bg-gray-200 dark:bg-gray-900 relative disable-selection">
      <Head title="Start Designing" />

      {isChangeProductModalOpen && (
        <ChangeProductModal
          onClose={() => setIsChangeProductModalOpen(false)}
          onSelectProduct={handleProductSelect}
        />
      )}

      <div className={isChangeProductModalOpen ? "blur-lg opacity-40" : ""}>

        {/* ✅ NEW NAVBAR COMPONENT */}
        <DesignNavbar
          designName={safeName}
          onOpenMyDesigns={() => setSidebarStack([...sidebarStack, "my-designs"])}
        />

        {/* CONTENT */}
        <div className="pt-[96px] flex min-h-screen">

      
  {/* LEFT SIDEBAR */}
  <div className="w-[140px] ml-6 mt-4 mb-6 bg-neutral-700 shadow-xl border rounded-2xl p-4 flex flex-col gap-4 items-center h-[calc(100vh-160px)]">
    {[
      { id: "product", icon: <Shirt size={22} />, label: "Product" },
      { id: "upload", icon: <UploadIcon size={22} />, label: "Upload" },
      { id: "text", icon: <Type size={22} />, label: "Text" },
      { id: "clipart", icon: <ClipartIcon size={22} />, label: "Clipart" },
    ].map(tab => (
      <button
        key={tab.id}
        onClick={() => {
          // Switch sidebar
          setSidebarStack([tab.id as SidebarView]);

          // Keep selectedUploadedImage for "upload" and "clipart", reset for others
          if (tab.id !== "clipart" && tab.id !== "upload") setSelectedUploadedImageWithLog(null);

          // Reset selectedText for non-text tabs
          if (tab.id !== "text") setSelectedText(null);
        }}
        className={`w-full h-16 flex flex-col items-center justify-center rounded-xl transition ${
          activeSidebar === tab.id ? "bg-neutral-600" : "bg-neutral-700 hover:bg-neutral-600"
        }`}
      >
        {React.cloneElement(tab.icon, { className: "text-white" })}
        <span className="text-white text-sm">{tab.label}</span>
      </button>
    ))}
  </div>

  {/* RIGHT SIDEBAR */}
  <div className="w-[480px] ml-4 mt-4 mb-6 h-[calc(100vh-160px)]">
    <div className="bg-white dark:bg-gray-800 shadow-xl border rounded-2xl overflow-y-auto h-full">
      {/* ONLY RENDER HEADER IF NOT BLANK */}
      {activeSidebar !== "blank" && (
        <SidebarHeader
          title={
            sidebarTitleOverride ??
            (typeof SIDEBAR_TITLES[activeSidebar] === "function"
              ? SIDEBAR_TITLES[activeSidebar]!({
                  selectedText,
                  selectedUploadedImage,
                  imageState,
                })
              : SIDEBAR_TITLES[activeSidebar] ?? "")
          }
          canGoBack={canGoBack}
          onBack={goBackSidebar}
          onClose={() => setSidebarStack(["blank"])}
        />
      )}
      <div className="p-4">{renderActiveTab()}</div>
    </div>
  </div>


            {/* MAIN CANVAS */}
            <Canvas
              sizes={sizes}
              setSizes={setSizes}
              canvasPositions={positions}
              mainImage={mainImage}
              restrictedBox={restrictedBox}
              canvasRef={canvasRef}
              uploadedImages={uploadedImages}
              setUploadedImages={setUploadedImages}
              imageState={imageState}
              setImageState={setImageState}
              onSelectImage={setSelectedUploadedImageWithLog}
              onSelectText={setSelectedText}
              onResizeStart={beginResize}
              onSwitchTab={(tab) => {
                if (!tab) return;

                // Keep uploaded image selected for 'upload' tab
            
                setSidebarStack((prev) =>
                  prev[prev.length - 1] === tab ? prev : [...prev.slice(0, 1), tab as SidebarView]
                );
              }}



              onDelete={uids => uids.forEach(uid => handleRemoveUploadedImage(uid))}
              onResizeTextCommit={handleResizeText}
              onSelectionChange={handleCanvasSelectionChange}
            />
          </div>
        </div>
      </div>
    );
  }
