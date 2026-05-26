"use client";

import { useState, useEffect } from "react";
import { Building2, ChevronDown, Check } from "lucide-react";
import styles from "./FirmSwitcher.module.css"; // Let's use inline styles instead for simplicity

export default function FirmSwitcher() {
  const [workspace, setWorkspace] = useState<any>(null);
  const [firms, setFirms] = useState<any[]>([]);
  const [selectedFirmId, setSelectedFirmId] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const fetchWorkspaceData = async () => {
      try {
        const [wsRes, firmsRes] = await Promise.all([
          fetch("/api/workspaces"),
          fetch("/api/firms"),
        ]);
        if (wsRes.ok) {
          const data = await wsRes.json();
          if (data.length > 0) setWorkspace(data[0]);
        }
        if (firmsRes.ok) {
          const data = await firmsRes.json();
          setFirms(data);

          const savedFirmId = localStorage.getItem("selectedFirmId");
          if (savedFirmId && data.find((f: any) => f.id === savedFirmId)) {
            setSelectedFirmId(savedFirmId);
          } else if (data.length > 0) {
            const defaultFirm = data.find((f: any) => f.is_default) || data[0];
            setSelectedFirmId(defaultFirm.id);
            localStorage.setItem("selectedFirmId", defaultFirm.id);
          }
        }
      } catch (err) {
        console.error("Failed to load workspace data");
      }
    };
    fetchWorkspaceData();
  }, []);

  const handleSelectFirm = (firmId: string) => {
    setSelectedFirmId(firmId);
    localStorage.setItem("selectedFirmId", firmId);
    setIsOpen(false);
    // Dispatch event for other components
    window.dispatchEvent(
      new CustomEvent("firmChanged", { detail: { firmId } }),
    );
  };

  if (!workspace || firms.length === 0) return null;

  const selectedFirm = firms.find((f) => f.id === selectedFirmId) || firms[0];

  return (
    <div
      style={{ padding: "0 16px", marginBottom: "16px", position: "relative" }}
    >
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px",
          background: "rgba(255,255,255,0.05)",
          borderRadius: "12px",
          cursor: "pointer",
          transition: "background 0.2s",
          border: "1px solid rgba(255,255,255,0.1)",
        }}
        onMouseOver={(e) =>
          (e.currentTarget.style.background = "rgba(255,255,255,0.1)")
        }
        onMouseOut={(e) =>
          (e.currentTarget.style.background = "rgba(255,255,255,0.05)")
        }
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "8px",
              background: "#3b82f6",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              flexShrink: 0,
            }}
          >
            <Building2 size={18} />
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            <span
              style={{
                fontSize: "11px",
                color: "#94a3b8",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              {workspace.workspace_name}
            </span>
            <span
              style={{
                fontSize: "14px",
                fontWeight: 600,
                color: "#f8fafc",
                whiteSpace: "nowrap",
                textOverflow: "ellipsis",
                overflow: "hidden",
              }}
            >
              {selectedFirm.firm_name}
            </span>
          </div>
        </div>
        {firms.length > 1 && (
          <ChevronDown size={16} color="#94a3b8" style={{ flexShrink: 0 }} />
        )}
      </div>

      {/* Dropdown Menu */}
      {isOpen && firms.length > 1 && (
        <>
          <div
            style={{ position: "fixed", inset: 0, zIndex: 90 }}
            onClick={() => setIsOpen(false)}
          />
          <div
            style={{
              position: "absolute",
              top: "100%",
              left: "16px",
              right: "16px",
              marginTop: "8px",
              background: "#1e293b",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "12px",
              boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.5)",
              zIndex: 100,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "8px 12px",
                fontSize: "11px",
                color: "#94a3b8",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                borderBottom: "1px solid rgba(255,255,255,0.05)",
              }}
            >
              Switch Firm
            </div>
            <div
              style={{ padding: "4px", maxHeight: "250px", overflowY: "auto" }}
            >
              {firms.map((firm) => (
                <div
                  key={firm.id}
                  onClick={() => handleSelectFirm(firm.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 12px",
                    borderRadius: "8px",
                    cursor: "pointer",
                    background:
                      selectedFirmId === firm.id
                        ? "rgba(59, 130, 246, 0.2)"
                        : "transparent",
                    color: selectedFirmId === firm.id ? "#3b82f6" : "#e2e8f0",
                    transition: "background 0.2s",
                  }}
                  onMouseOver={(e) => {
                    if (selectedFirmId !== firm.id)
                      e.currentTarget.style.background =
                        "rgba(255,255,255,0.05)";
                  }}
                  onMouseOut={(e) => {
                    if (selectedFirmId !== firm.id)
                      e.currentTarget.style.background = "transparent";
                  }}
                >
                  <span style={{ fontSize: "14px", fontWeight: 500 }}>
                    {firm.firm_name}
                  </span>
                  {selectedFirmId === firm.id && <Check size={16} />}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
