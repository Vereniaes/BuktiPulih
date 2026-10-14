// src/components/AuthModal.tsx
// -> dialog masuk kader lapangan ramah lansia (boomer-friendly auth modal)
//      -> input nomor whatsapp dan papan tombol angka lapang (keypad 56px)
//      -> autentikasi nomor hp dan pin 6 digit
//      -> lencana peran resmi kelompok tani terverifikasi

"use client";

import React, { useState } from "react";
import { loginKaderApi } from "@/services/api";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: Record<string, unknown>, message: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
}) => {
  const [phoneNumber, setPhoneNumber] = useState("081234567890");
  const [pin, setPin] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  if (!isOpen) return null;

  // handler penekanan keypad angka ------------------------------------------------
  const handleKeypadPress = (val: string) => {
    setErrorMessage("");
    if (val === "BACK") {
      setPin((prev) => prev.slice(0, -1));
    } else if (val === "CLEAR") {
      setPin("");
    } else {
      if (pin.length < 6) {
        setPin((prev) => prev + val);
      }
    }
  };
  // end of handler keypad ---------------------------------------------------------

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length < 6) {
      setErrorMessage("Harap masukkan 6 angka PIN Anda.");
      return;
    }

    setIsLoading(true);
    setErrorMessage("");

    const res = await loginKaderApi(phoneNumber, pin);
    setIsLoading(false);

    if (res.success && res.user) {
      onLoginSuccess(res.user, res.message);
      onClose();
      setPin("");
    } else {
      setErrorMessage(res.message);
    }
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal-content-card" style={{ maxWidth: "460px" }}>
        {/* header modal autentikasi ---------------------------------------------- */}
        <div className="modal-header">
          <div>
            <span
              style={{
                fontSize: "12px",
                fontWeight: 800,
                color: "var(--forest-green-700)",
                textTransform: "uppercase",
              }}
            >
              Khusus Petugas & Kader Lapangan
            </span>
            <h2 className="modal-title">Masuk Kader Terdaftar</h2>
          </div>
          <button
            type="button"
            className="btn-modal-close"
            onClick={onClose}
            aria-label="Tutup Dialog Masuk"
          >
            ✕
          </button>
        </div>
        {/* end of header modal --------------------------------------------------- */}

        <form onSubmit={handleSubmit} className="modal-body">
          {errorMessage && (
            <div
              style={{
                backgroundColor: "var(--alert-red-soft)",
                border: "1.5px solid var(--alert-red)",
                color: "var(--alert-red)",
                borderRadius: "var(--radius-md)",
                padding: "10px 14px",
                fontSize: "13.5px",
                fontWeight: 700,
                marginBottom: "16px",
              }}
            >
              ⚠️ {errorMessage}
            </div>
          )}

          {/* input nomor whatsapp ------------------------------------------------ */}
          <div style={{ marginBottom: "18px" }}>
            <label
              style={{
                display: "block",
                fontWeight: 800,
                fontSize: "14px",
                color: "var(--brand-navy-900)",
                marginBottom: "6px",
              }}
            >
              NOMOR WHATSAPP TERDAFTAR:
            </label>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="Contoh: 081234567890"
              style={{
                width: "100%",
                height: "52px",
                fontSize: "17px",
                fontWeight: 700,
                padding: "10px 14px",
                borderRadius: "var(--radius-md)",
                border: "2px solid var(--surface-border-strong)",
                backgroundColor: "#FFFFFF",
              }}
            />
          </div>
          {/* end of input nomor hp ------------------------------------------------ */}

          {/* display kotak 6 digit pin -------------------------------------------- */}
          <div style={{ marginBottom: "16px" }}>
            <label
              style={{
                display: "block",
                fontWeight: 800,
                fontSize: "14px",
                color: "var(--brand-navy-900)",
                marginBottom: "8px",
              }}
            >
              MASUKKAN 6 ANGKA PIN RAHASIA:
            </label>
            <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
              {[0, 1, 2, 3, 4, 5].map((idx) => (
                <div
                  key={idx}
                  style={{
                    width: "48px",
                    height: "56px",
                    border: "2px solid var(--surface-border-strong)",
                    borderRadius: "var(--radius-md)",
                    backgroundColor: pin[idx] ? "var(--forest-green-50)" : "#F8FAFC",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "24px",
                    fontWeight: 800,
                    color: "var(--brand-navy-900)",
                  }}
                >
                  {pin[idx] ? "•" : ""}
                </div>
              ))}
            </div>
          </div>
          {/* end of display kotak pin --------------------------------------------- */}

          {/* papan tombol angka lapang (numeric keypad ramah lansia) --------------- */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "10px",
              marginBottom: "20px",
            }}
          >
            {["1", "2", "3", "4", "5", "6", "7", "8", "9", "CLEAR", "0", "BACK"].map(
              (btn) => (
                <button
                  key={btn}
                  type="button"
                  onClick={() => handleKeypadPress(btn)}
                  style={{
                    height: "54px",
                    fontSize: btn === "CLEAR" || btn === "BACK" ? "14px" : "22px",
                    fontWeight: 800,
                    backgroundColor:
                      btn === "CLEAR" || btn === "BACK" ? "#EDF2F7" : "#FFFFFF",
                    border: "2px solid var(--surface-border-strong)",
                    borderRadius: "var(--radius-md)",
                    color:
                      btn === "CLEAR"
                        ? "#C53030"
                        : btn === "BACK"
                        ? "#4A5568"
                        : "var(--brand-navy-900)",
                  }}
                >
                  {btn === "BACK" ? "⌫ Hapus" : btn === "CLEAR" ? "Ulang" : btn}
                </button>
              )
            )}
          </div>
          {/* end of keypad -------------------------------------------------------- */}

          <button
            type="submit"
            disabled={isLoading}
            className="touch-target-big"
            style={{
              backgroundColor: "var(--forest-green-700)",
              color: "#FFFFFF",
              fontSize: "17px",
            }}
          >
            {isLoading ? "Memeriksa PIN..." : "Masuk ke Akun Kader ➔"}
          </button>

          <div
            style={{
              textAlign: "center",
              marginTop: "16px",
              fontSize: "12.5px",
              color: "#718096",
            }}
          >
            Akun uji coba default: <strong>081234567890</strong> (PIN: <strong>123456</strong>)
          </div>
        </form>
      </div>
    </div>
  );
};
