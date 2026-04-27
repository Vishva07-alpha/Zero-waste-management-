import { useState, useRef, useCallback } from "react";

const CATEGORIES = {
  plastic: { recyclable: true, icon: "🧴", color: "#22c55e", suggestion: "Rinse and drop at green bin or recycling station." },
  paper: { recyclable: true, icon: "📄", color: "#22c55e", suggestion: "Keep dry, fold flat, place in blue/green bin." },
  metal: { recyclable: true, icon: "🥫", color: "#22c55e", suggestion: "Rinse tins/cans, crush if possible, green bin." },
  glass: { recyclable: true, icon: "🍶", color: "#f59e0b", suggestion: "Drop at dedicated glass collection point." },
  organic: { recyclable: false, icon: "🍂", color: "#a3e635", suggestion: "Use brown compost bin or on-campus composting unit." },
  "e-waste": { recyclable: false, icon: "📱", color: "#ef4444", suggestion: "Hand to e-waste collection drive, never bin." },
  hazardous: { recyclable: false, icon: "⚗️", color: "#ef4444", suggestion: "Take to hazardous waste drop point — do NOT bin." },
  "non-recyclable": { recyclable: false, icon: "🚮", color: "#ef4444", suggestion: "Red bin (non-recyclable). Try to reduce this type." },
};

const SYSTEM_PROMPT = `You are a waste classification AI for a Zero Waste Campus initiative at AR Nagar Engineering College.

When given an image of waste, respond ONLY with a JSON object and nothing else. No markdown, no explanation.

JSON format:
{
  "category": one of ["plastic","paper","metal","glass","organic","e-waste","hazardous","non-recyclable"],
  "item": short name of the item (e.g. "plastic water bottle"),
  "confidence": number 0-100,
  "recyclable": true or false,
  "eco_points": integer 1-10 (higher = better for environment if properly disposed),
  "detail": one sentence about why it's classified this way
}

Be accurate. If the image is unclear, still provide your best guess with lower confidence.`;

export default function WasteClassifier() {
  const [image, setImage] = useState(null);
  const [imageBase64, setImageBase64] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [totalPoints, setTotalPoints] = useState(0);
  const [scanCount, setScanCount] = useState(0);
  const fileRef = useRef();

  const processFile = useCallback((file) => {
    if (!file || !file.type.startsWith("image/")) return;
    setResult(null);
    setError(null);
    const url = URL.createObjectURL(file);
    setImage(url);
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target.result.split(",")[1];
      setImageBase64(base64);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    processFile(e.dataTransfer.files[0]);
  };

  const classify = async () => {
    if (!imageBase64) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: SYSTEM_PROMPT,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "image",
                  source: { type: "base64", media_type: "image/jpeg", data: imageBase64 },
                },
                { type: "text", text: "Classify this waste item." },
              ],
            },
          ],
        }),
      });
      const data = await response.json();
      const raw = data.content?.map((b) => b.text || "").join("").trim();
      const clean = raw.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      setResult(parsed);
      setTotalPoints((p) => p + (parsed.eco_points || 0));
      setScanCount((c) => c + 1);
    } catch (err) {
      setError("Classification failed. Please try a clearer image.");
    } finally {
      setLoading(false);
    }
  };

  const cat = result ? CATEGORIES[result.category] || CATEGORIES["non-recyclable"] : null;

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #0a1a0f 0%, #0d2318 50%, #0a1a0f 100%)",
      fontFamily: "'Georgia', 'Times New Roman', serif",
      color: "#d4e8d0",
      padding: "0",
      margin: "0",
    }}>
      {/* Header */}
      <div style={{
        borderBottom: "1px solid #1a3a20",
        padding: "24px 32px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: "rgba(0,0,0,0.3)",
        backdropFilter: "blur(8px)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ fontSize: "28px" }}>♻️</span>
          <div>
            <div style={{ fontSize: "11px", letterSpacing: "3px", color: "#4ade80", textTransform: "uppercase", marginBottom: "2px" }}>
              Zero Waste Campus
            </div>
            <div style={{ fontSize: "20px", fontWeight: "bold", color: "#f0fdf4", letterSpacing: "-0.5px" }}>
              AI Waste Classifier
            </div>
          </div>
        </div>
        {/* Eco Points */}
        <div style={{
          background: "rgba(34,197,94,0.1)",
          border: "1px solid rgba(34,197,94,0.3)",
          borderRadius: "12px",
          padding: "10px 20px",
          textAlign: "center",
        }}>
          <div style={{ fontSize: "22px", fontWeight: "bold", color: "#4ade80" }}>
            {totalPoints} pts
          </div>
          <div style={{ fontSize: "10px", letterSpacing: "2px", color: "#86efac", textTransform: "uppercase" }}>
            {scanCount} scan{scanCount !== 1 ? "s" : ""}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: "680px", margin: "0 auto", padding: "40px 24px" }}>
        {/* Upload Zone */}
        <div
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          style={{
            border: `2px dashed ${dragOver ? "#4ade80" : "rgba(74,222,128,0.3)"}`,
            borderRadius: "16px",
            minHeight: image ? "auto" : "220px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            transition: "all 0.2s",
            background: dragOver ? "rgba(34,197,94,0.05)" : "rgba(0,0,0,0.2)",
            overflow: "hidden",
            position: "relative",
          }}
        >
          {image ? (
            <img src={image} alt="Waste" style={{
              width: "100%", maxHeight: "340px", objectFit: "contain",
              borderRadius: "14px", display: "block",
            }} />
          ) : (
            <div style={{ textAlign: "center", padding: "40px 20px" }}>
              <div style={{ fontSize: "52px", marginBottom: "16px", opacity: 0.7 }}>📸</div>
              <div style={{ fontSize: "17px", color: "#86efac", marginBottom: "6px" }}>
                Drop a waste image here
              </div>
              <div style={{ fontSize: "13px", color: "#4b7a56" }}>
                or click to browse · JPG, PNG, WEBP
              </div>
            </div>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={(e) => processFile(e.target.files[0])}
        />

        {/* Buttons */}
        <div style={{ display: "flex", gap: "12px", marginTop: "16px" }}>
          {image && (
            <button
              onClick={classify}
              disabled={loading}
              style={{
                flex: 1,
                background: loading ? "rgba(34,197,94,0.3)" : "linear-gradient(135deg, #16a34a, #22c55e)",
                color: "#fff",
                border: "none",
                borderRadius: "12px",
                padding: "14px 24px",
                fontSize: "15px",
                fontFamily: "inherit",
                fontWeight: "bold",
                cursor: loading ? "not-allowed" : "pointer",
                letterSpacing: "0.5px",
                transition: "all 0.2s",
              }}
            >
              {loading ? "Analysing…" : "🔍 Classify Waste"}
            </button>
          )}
          {image && (
            <button
              onClick={() => { setImage(null); setImageBase64(null); setResult(null); setError(null); }}
              style={{
                background: "rgba(255,255,255,0.05)",
                color: "#86efac",
                border: "1px solid rgba(74,222,128,0.2)",
                borderRadius: "12px",
                padding: "14px 20px",
                fontSize: "14px",
                fontFamily: "inherit",
                cursor: "pointer",
              }}
            >
              Clear
            </button>
          )}
        </div>

        {/* Loading */}
        {loading && (
          <div style={{
            marginTop: "28px",
            padding: "28px",
            background: "rgba(0,0,0,0.3)",
            borderRadius: "16px",
            textAlign: "center",
            border: "1px solid rgba(74,222,128,0.15)",
          }}>
            <div style={{ fontSize: "36px", marginBottom: "12px", animation: "spin 1s linear infinite" }}>♻️</div>
            <div style={{ color: "#86efac", fontSize: "14px", letterSpacing: "1px" }}>AI is classifying your waste…</div>
            <style>{`@keyframes spin { from{transform:rotate(0)} to{transform:rotate(360deg)} }`}</style>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{
            marginTop: "20px", padding: "16px 20px",
            background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
            borderRadius: "12px", color: "#fca5a5", fontSize: "14px",
          }}>
            ⚠️ {error}
          </div>
        )}

        {/* Result */}
        {result && cat && (
          <div style={{
            marginTop: "28px",
            borderRadius: "20px",
            overflow: "hidden",
            border: `1px solid ${cat.color}40`,
            background: "rgba(0,0,0,0.4)",
          }}>
            {/* Result Header */}
            <div style={{
              background: `linear-gradient(135deg, ${cat.color}20, ${cat.color}08)`,
              borderBottom: `1px solid ${cat.color}30`,
              padding: "24px 28px",
              display: "flex",
              alignItems: "center",
              gap: "16px",
            }}>
              <span style={{ fontSize: "48px" }}>{cat.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "11px", letterSpacing: "3px", color: cat.color, textTransform: "uppercase", marginBottom: "4px" }}>
                  {result.category}
                </div>
                <div style={{ fontSize: "22px", fontWeight: "bold", color: "#f0fdf4", letterSpacing: "-0.3px" }}>
                  {result.item}
                </div>
              </div>
              <div style={{
                background: result.recyclable ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
                border: `1px solid ${result.recyclable ? "rgba(34,197,94,0.4)" : "rgba(239,68,68,0.4)"}`,
                borderRadius: "10px",
                padding: "8px 14px",
                textAlign: "center",
                minWidth: "80px",
              }}>
                <div style={{ fontSize: "16px", marginBottom: "2px" }}>
                  {result.recyclable ? "✅" : "❌"}
                </div>
                <div style={{
                  fontSize: "10px", letterSpacing: "1.5px", textTransform: "uppercase",
                  color: result.recyclable ? "#4ade80" : "#f87171",
                }}>
                  {result.recyclable ? "Recyclable" : "Non-recycle"}
                </div>
              </div>
            </div>

            {/* Stats Row */}
            <div style={{
              display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
              borderBottom: "1px solid rgba(255,255,255,0.05)",
            }}>
              {[
                { label: "Confidence", value: `${result.confidence}%`, color: result.confidence > 75 ? "#4ade80" : result.confidence > 50 ? "#fbbf24" : "#f87171" },
                { label: "Eco Points", value: `+${result.eco_points}`, color: "#a3e635" },
                { label: "Category", value: result.category, color: cat.color },
              ].map((s, i) => (
                <div key={i} style={{
                  padding: "18px 20px",
                  borderRight: i < 2 ? "1px solid rgba(255,255,255,0.05)" : "none",
                  textAlign: "center",
                }}>
                  <div style={{ fontSize: "20px", fontWeight: "bold", color: s.color, marginBottom: "4px" }}>
                    {s.value}
                  </div>
                  <div style={{ fontSize: "10px", letterSpacing: "2px", color: "#4b7a56", textTransform: "uppercase" }}>
                    {s.label}
                  </div>
                </div>
              ))}
            </div>

            {/* Detail + Suggestion */}
            <div style={{ padding: "20px 28px 24px" }}>
              <p style={{ fontSize: "14px", color: "#86efac", margin: "0 0 16px", lineHeight: "1.6" }}>
                {result.detail}
              </p>
              <div style={{
                background: "rgba(34,197,94,0.07)",
                border: "1px solid rgba(34,197,94,0.2)",
                borderRadius: "10px",
                padding: "14px 18px",
                display: "flex",
                alignItems: "flex-start",
                gap: "10px",
              }}>
                <span style={{ fontSize: "18px", flexShrink: 0 }}>💡</span>
                <div>
                  <div style={{ fontSize: "10px", letterSpacing: "2px", color: "#4ade80", textTransform: "uppercase", marginBottom: "4px" }}>
                    Disposal Tip
                  </div>
                  <div style={{ fontSize: "14px", color: "#d4e8d0", lineHeight: "1.5" }}>
                    {cat.suggestion}
                  </div>
                </div>
              </div>
            </div>

            {/* Scan another */}
            <div style={{
              padding: "0 28px 24px",
            }}>
              <button
                onClick={() => { setImage(null); setImageBase64(null); setResult(null); }}
                style={{
                  width: "100%",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(74,222,128,0.2)",
                  borderRadius: "10px",
                  padding: "12px",
                  color: "#86efac",
                  fontSize: "13px",
                  fontFamily: "inherit",
                  cursor: "pointer",
                  letterSpacing: "1px",
                }}
              >
                ↑ Scan Another Item
              </button>
            </div>
          </div>
        )}

        {/* Bin Guide */}
        {!result && !loading && (
          <div style={{
            marginTop: "40px",
            display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
            gap: "12px",
          }}>
            {[
              { icon: "🟢", label: "Green Bin", items: "Plastic · Paper · Metal" },
              { icon: "🟤", label: "Brown Bin", items: "Food · Organic · Compost" },
              { icon: "🔴", label: "Red Bin", items: "Non-recyclable · Hazardous" },
            ].map((b) => (
              <div key={b.label} style={{
                background: "rgba(0,0,0,0.25)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: "12px",
                padding: "16px",
                textAlign: "center",
              }}>
                <div style={{ fontSize: "22px", marginBottom: "6px" }}>{b.icon}</div>
                <div style={{ fontSize: "12px", fontWeight: "bold", color: "#d4e8d0", marginBottom: "4px" }}>
                  {b.label}
                </div>
                <div style={{ fontSize: "10px", color: "#4b7a56", lineHeight: "1.5" }}>{b.items}</div>
              </div>
            ))}
          </div>
        )}

        <div style={{ textAlign: "center", marginTop: "40px", fontSize: "11px", color: "#2d5a3a", letterSpacing: "1px" }}>
          AR NAGAR ENGINEERING COLLEGE · 23GN01C · ZERO WASTE CAMPUS
        </div>
      </div>
    </div>
  );
}
