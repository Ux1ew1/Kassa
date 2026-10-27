import { useEffect, useRef, useState } from "react";
import "./AiImportModal.css";

const TARGET_MIN_BYTES = 100 * 1024;
const TARGET_MAX_BYTES = 300 * 1024;
const DIMENSION_STEPS = [1600, 1400, 1200, 1000, 850, 700, 560];
const QUALITY_STEPS = [0.86, 0.78, 0.7, 0.62, 0.54, 0.46, 0.38];

const bytesFromDataUrl = (dataUrl) => {
  const base64 = dataUrl.split(",")[1] || "";
  return Math.round((base64.length * 3) / 4);
};

const formatBytes = (bytes) => {
  if (!bytes) return "";
  return `${Math.round(bytes / 1024)} КБ`;
};

const blobToDataUrl = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Не удалось прочитать фото"));
    reader.readAsDataURL(blob);
  });

const fileToImage = (file) =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Не удалось открыть фото"));
    };
    image.src = url;
  });

const canvasToJpegDataUrl = (canvas, quality) =>
  new Promise((resolve) => {
    if (!canvas.toBlob) {
      resolve(canvas.toDataURL("image/jpeg", quality));
      return;
    }

    canvas.toBlob(
      async (blob) => {
        resolve(blob ? await blobToDataUrl(blob) : canvas.toDataURL("image/jpeg", quality));
      },
      "image/jpeg",
      quality,
    );
  });

const drawSourceToCanvas = (source, maxDimension) => {
  const sourceWidth = source.videoWidth || source.naturalWidth || source.width;
  const sourceHeight = source.videoHeight || source.naturalHeight || source.height;
  if (!sourceWidth || !sourceHeight) {
    throw new Error("Фото ещё не готово, попробуйте снова");
  }
  const scale = Math.min(1, maxDimension / Math.max(sourceWidth, sourceHeight));
  const width = Math.max(1, Math.round(sourceWidth * scale));
  const height = Math.max(1, Math.round(sourceHeight * scale));
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  canvas.width = width;
  canvas.height = height;
  context.drawImage(source, 0, 0, width, height);

  return canvas;
};

const compressImageSource = async (source) => {
  let best = null;
  let bestInRange = null;

  for (const maxDimension of DIMENSION_STEPS) {
    const canvas = drawSourceToCanvas(source, maxDimension);

    for (const quality of QUALITY_STEPS) {
      const dataUrl = await canvasToJpegDataUrl(canvas, quality);
      const bytes = bytesFromDataUrl(dataUrl);
      const result = {
        dataUrl,
        bytes,
        width: canvas.width,
        height: canvas.height,
        quality,
      };

      if (!best || bytes < best.bytes) {
        best = result;
      }

      if (bytes <= TARGET_MAX_BYTES) {
        if (bytes >= TARGET_MIN_BYTES) {
          bestInRange = result;
          break;
        }

        if (!bestInRange || bytes > bestInRange.bytes) {
          bestInRange = result;
        }
      }
    }

    if (bestInRange?.bytes >= TARGET_MIN_BYTES && bestInRange.bytes <= TARGET_MAX_BYTES) {
      break;
    }
  }

  return bestInRange || best;
};

function AiImportModal({ isOpen, menus = [], selectedMenuId, onClose, onRecognize, onCreate }) {
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [imageData, setImageData] = useState("");
  const [imageMeta, setImageMeta] = useState(null);
  const [preview, setPreview] = useState(null);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [cameraOpen, setCameraOpen] = useState(false);
  const [mode, setMode] = useState("create");
  const [targetMenuId, setTargetMenuId] = useState(selectedMenuId || "");
  const [selectedItems, setSelectedItems] = useState({});

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraOpen(false);
  };

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setImageData("");
      setImageMeta(null);
      setPreview(null);
      setStatus("idle");
      setError("");
      setMode("create");
      setTargetMenuId(selectedMenuId || "");
      setSelectedItems({});
    }
  }, [isOpen, selectedMenuId]);

  useEffect(() => {
    if (isOpen && !targetMenuId && menus[0]?.id) {
      setTargetMenuId(menus[0].id);
    }
  }, [isOpen, menus, targetMenuId]);

  const applyCompressedImage = (result) => {
    setImageData(result.dataUrl);
    setImageMeta(result);
    setPreview(null);
    setSelectedItems({});
  };

  const changeImportTarget = (nextMode, nextTargetMenuId = targetMenuId) => {
    setMode(nextMode);
    setTargetMenuId(nextTargetMenuId);
    setPreview(null);
    setSelectedItems({});
    setError("");
  };

  const handleFile = async (file) => {
    if (!file) return;
    try {
      stopCamera();
      setStatus("compressing");
      setError("");
      const image = await fileToImage(file);
      applyCompressedImage(await compressImageSource(image));
      setStatus("idle");
    } catch (err) {
      setStatus("idle");
      setError(err.message || "Не удалось загрузить фото");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (cameraInputRef.current) cameraInputRef.current.value = "";
    }
  };

  const handleOpenCamera = async () => {
    setError("");
    setPreview(null);

    if (!navigator.mediaDevices?.getUserMedia) {
      cameraInputRef.current?.click();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;
      setCameraOpen(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch {
      cameraInputRef.current?.click();
    }
  };

  const handleCapture = async () => {
    const video = videoRef.current;
    if (!video) return;

    try {
      setStatus("compressing");
      setError("");
      applyCompressedImage(await compressImageSource(video));
      stopCamera();
      setStatus("idle");
    } catch (err) {
      setStatus("idle");
      setError(err.message || "Не удалось сжать фото");
    }
  };

  const handleRecognize = async () => {
    if (!imageData) {
      setError("Сначала выберите или сделайте фото");
      return;
    }

    try {
      setStatus("recognizing");
      setError("");
      if (mode === "append" && !targetMenuId) {
        throw new Error("Выберите меню, которое нужно дополнить");
      }
      const result = await onRecognize(imageData, {
        targetMenuId: mode === "append" ? targetMenuId : null,
      });
      setPreview(result);
      setSelectedItems(
        Object.fromEntries(
          (result.items || []).map((item, index) => [
            item.importKey || `import-${index + 1}`,
            item.match?.type ? false : true,
          ]),
        ),
      );
      setStatus("idle");
    } catch (err) {
      setStatus("idle");
      setError(err.message || "Не удалось распознать меню");
    }
  };

  const handleCreate = async () => {
    if (!preview) return;

    try {
      setStatus("creating");
      setError("");
      const items = (preview.items || []).filter(
        (item, index) => selectedItems[item.importKey || `import-${index + 1}`],
      );
      if (items.length === 0) {
        throw new Error("Выберите хотя бы одну позицию для добавления");
      }
      await onCreate(preview, {
        mode,
        targetMenuId: mode === "append" ? targetMenuId : null,
        items,
      });
      setStatus("idle");
      onClose();
    } catch (err) {
      setStatus("idle");
      setError(err.message || "Не удалось создать меню");
    }
  };

  if (!isOpen) return null;

  const isBusy = status === "compressing" || status === "recognizing" || status === "creating";
  const previewItems = preview?.items || [];
  const selectedCount = previewItems.filter(
    (item, index) => selectedItems[item.importKey || `import-${index + 1}`],
  ).length;
  const duplicateCount = previewItems.filter((item) => item.match?.type === "duplicate").length;
  const similarCount = previewItems.filter((item) => item.match?.type === "similar").length;

  return (
    <div className="ai-modal" onClick={onClose}>
      <div
        className="ai-modal__content"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ai-import-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="ai-modal__header">
          <div>
            <span className="ai-modal__eyebrow">Импорт по фото</span>
            <h3 id="ai-import-title">Меню через ИИ</h3>
            <p>ИИ распознает позиции, а вы проверите итог перед сохранением.</p>
          </div>
          <button type="button" className="ai-modal__close" onClick={onClose} aria-label="Закрыть">
            ×
          </button>
        </div>

        <div className="ai-modal__mode" aria-label="Способ импорта">
          <button
            type="button"
            className={`ai-modal__mode-button${mode === "create" ? " is-active" : ""}`}
            onClick={() => changeImportTarget("create")}
            disabled={isBusy}
          >
            <strong>Новое меню</strong>
            <span>Создать отдельное</span>
          </button>
          <button
            type="button"
            className={`ai-modal__mode-button${mode === "append" ? " is-active" : ""}`}
            onClick={() => changeImportTarget("append", targetMenuId || menus[0]?.id || "")}
            disabled={isBusy || menus.length === 0}
          >
            <strong>Дополнить</strong>
            <span>Без дубликатов</span>
          </button>
        </div>

        {mode === "append" && (
          <label className="ai-modal__field" htmlFor="ai-target-menu">
            <span>Куда добавить</span>
            <select
              id="ai-target-menu"
              value={targetMenuId}
              onChange={(event) => changeImportTarget("append", event.target.value)}
              disabled={isBusy}
            >
              {menus.map((menu) => (
                <option key={menu.id} value={menu.id}>
                  {menu.name} · {menu.itemCount ?? 0} поз.
                </option>
              ))}
            </select>
          </label>
        )}

        <div className="ai-modal__source">
          <div className="ai-modal__source-copy">
            <strong>{imageData ? "Фото готово" : "Добавьте фото меню"}</strong>
            <span>{imageMeta ? `JPG · ${formatBytes(imageMeta.bytes)} · ${imageMeta.width}×${imageMeta.height}` : "Снимок будет сжат перед отправкой"}</span>
          </div>
          <div className="ai-modal__actions">
          <button
            type="button"
            className="ai-modal__button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isBusy}
          >
            Из галереи
          </button>
          <button
            type="button"
            className="ai-modal__button"
            onClick={handleOpenCamera}
            disabled={isBusy}
          >
            Камера
          </button>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="ai-modal__file"
          onChange={(event) => handleFile(event.target.files?.[0])}
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="ai-modal__file"
          onChange={(event) => handleFile(event.target.files?.[0])}
        />

        {cameraOpen && (
          <div className="ai-modal__camera">
            <video ref={videoRef} autoPlay playsInline muted className="ai-modal__video" />
            <div className="ai-modal__actions">
              <button
                type="button"
                className="ai-modal__button"
                onClick={handleCapture}
                disabled={isBusy}
              >
                {status === "compressing" ? "Сжимаем..." : "Снять"}
              </button>
              <button
                type="button"
                className="ai-modal__button ai-modal__button--secondary"
                onClick={stopCamera}
                disabled={isBusy}
              >
                Отмена
              </button>
            </div>
          </div>
        )}

        {imageData && !cameraOpen && (
          <div className="ai-modal__image-row">
            <img src={imageData} alt="Фото меню" className="ai-modal__image" />
            <button
              type="button"
              className="ai-modal__submit ai-modal__submit--inline"
              onClick={handleRecognize}
              disabled={isBusy || (mode === "append" && !targetMenuId)}
            >
              {status === "compressing"
                ? "Сжимаем..."
                : status === "recognizing"
                  ? "Распознаём..."
                  : preview
                    ? "Распознать заново"
                    : "Распознать"}
            </button>
          </div>
        )}

        {error && <div className="ai-modal__error">{error}</div>}

        {preview && (
          <div className="ai-modal__preview">
            <div className="ai-modal__preview-header">
              <div>
                <span className="ai-modal__eyebrow">Проверка перед сохранением</span>
                <h4>{mode === "append" ? preview.targetMenuName : preview.menuName}</h4>
              </div>
              <span className="ai-modal__count">{selectedCount} из {previewItems.length}</span>
            </div>
            {mode === "append" && (duplicateCount > 0 || similarCount > 0) && (
              <div className="ai-modal__notice">
                <strong>Сверили с текущим меню</strong>
                <span>
                  {duplicateCount > 0 ? `Дубли: ${duplicateCount}. ` : ""}
                  {similarCount > 0 ? `Нужна ваша проверка: ${similarCount}.` : ""}
                </span>
              </div>
            )}
            <div className="ai-modal__items">
              {previewItems.map((item, index) => {
                const itemKey = item.importKey || `import-${index + 1}`;
                const isDuplicate = item.match?.type === "duplicate";
                const isSimilar = item.match?.type === "similar";
                return (
                  <label
                    className={`ai-modal__item${selectedItems[itemKey] ? " is-selected" : ""}${isDuplicate ? " is-duplicate" : ""}`}
                    key={itemKey}
                  >
                    <input
                      type="checkbox"
                      checked={Boolean(selectedItems[itemKey])}
                      disabled={isDuplicate || isBusy}
                      onChange={(event) =>
                        setSelectedItems((current) => ({ ...current, [itemKey]: event.target.checked }))
                      }
                    />
                    <span className="ai-modal__item-copy">
                      <strong>{item.name}</strong>
                      {item.match && (
                        <small>
                          {isDuplicate ? "Уже есть" : "Похоже на"}: {item.match.name}
                        </small>
                      )}
                    </span>
                    <span className={`ai-modal__status${isDuplicate ? " is-duplicate" : isSimilar ? " is-review" : ""}`}>
                      {isDuplicate ? "Дубль" : isSimilar ? "Проверьте" : "Новая"}
                    </span>
                    <strong className="ai-modal__price">{item.price} ₽</strong>
                  </label>
                );
              })}
            </div>
            <button
              type="button"
              className="ai-modal__submit"
              onClick={handleCreate}
              disabled={status === "creating" || selectedCount === 0}
            >
              {status === "creating"
                ? "Сохраняем..."
                : mode === "append"
                  ? `Добавить позиции (${selectedCount})`
                  : `Создать меню (${selectedCount})`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default AiImportModal;
