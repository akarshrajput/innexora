import React, { useRef, useEffect, useState } from "react";
import QRCode from "qrcode";
import html2canvas from "html2canvas";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, QrCode } from "lucide-react";

interface QRCodeDisplayProps {
  roomAccessId: string;
  roomNumber: string;
  roomType: string;
  onClose?: () => void;
}

export const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({
  roomAccessId,
  roomNumber,
  roomType,
  onClose,
}) => {
  const qrRef = useRef<HTMLDivElement>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  useEffect(() => {
    generateQRCode();
  }, [roomAccessId]);

  const generateQRCode = async () => {
    try {
      const url = `${window.location.origin}/hotel/${roomAccessId}`;
      const qrDataUrl = await QRCode.toDataURL(url, {
        width: 200,
        margin: 2,
        color: {
          dark: "#1e40af", // Blue color
          light: "#ffffff",
        },
      });
      setQrDataUrl(qrDataUrl);
    } catch (error) {
      console.error("Error generating QR code:", error);
    }
  };

  const downloadQRCode = async () => {
    if (!qrRef.current) return;

    try {
      // First try the html2canvas approach
      const canvas = await html2canvas(qrRef.current, {
        backgroundColor: "#ffffff",
        scale: 2,
        width: 400,
        height: 500,
        useCORS: true,
        allowTaint: true,
        ignoreElements: (element) => {
          return element.classList.contains("ignore-capture");
        },
        onclone: (clonedDoc) => {
          const style = clonedDoc.createElement("style");
          style.innerHTML = `
            * {
              color: rgb(0, 0, 0) !important;
              background-color: rgb(255, 255, 255) !important;
              border-color: rgb(229, 231, 235) !important;
            }
            .text-blue-600 { color: rgb(37, 99, 235) !important; }
            .text-blue-800 { color: rgb(30, 64, 175) !important; }
            .text-gray-800 { color: rgb(31, 41, 55) !important; }
            .text-gray-600 { color: rgb(75, 85, 99) !important; }
            .text-gray-500 { color: rgb(107, 114, 128) !important; }
            .text-gray-400 { color: rgb(156, 163, 175) !important; }
            .bg-blue-50 { background-color: rgb(239, 246, 255) !important; }
            .bg-yellow-400 { background-color: rgb(251, 191, 36) !important; }
            .border-gray-200 { border-color: rgb(229, 231, 235) !important; }
            .border-blue-100 { border-color: rgb(219, 234, 254) !important; }
          `;
          clonedDoc.head.appendChild(style);
        },
      });

      const link = document.createElement("a");
      link.download = `room-${roomNumber}-qr-code.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (error) {
      console.error("Error downloading QR code with html2canvas:", error);
      // Fallback: Create a simpler version programmatically
      try {
        await downloadSimpleQRCode();
      } catch (fallbackError) {
        console.error("Fallback download also failed:", fallbackError);
        alert("Download failed. Please try again or contact support.");
      }
    }
  };

  const downloadSimpleQRCode = async () => {
    if (!qrDataUrl) return;

    // Create a canvas programmatically
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      console.error("Could not get canvas context");
      return;
    }

    canvas.width = 400;
    canvas.height = 500;

    // White background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, 400, 500);

    // Title
    ctx.fillStyle = "#1f2937";
    ctx.font = "bold 24px Arial";
    ctx.textAlign = "center";
    ctx.fillText("Welcome to", 200, 60);

    ctx.fillStyle = "#2563eb";
    ctx.font = "bold 32px Arial";
    ctx.fillText("INNEXORA", 200, 100);

    ctx.fillStyle = "#6b7280";
    ctx.font = "14px Arial";
    ctx.fillText("Premium Hotel Experience", 200, 125);

    // Load and draw QR code
    const qrImage = new Image();
    qrImage.onload = () => {
      if (!ctx) return;

      // Draw QR code
      ctx.drawImage(qrImage, 100, 150, 200, 200);

      // Room info
      ctx.fillStyle = "#eff6ff";
      ctx.fillRect(75, 370, 250, 60);

      ctx.fillStyle = "#1e40af";
      ctx.font = "bold 18px Arial";
      ctx.fillText(`Room ${roomNumber}`, 200, 395);

      ctx.fillStyle = "#2563eb";
      ctx.font = "14px Arial";
      ctx.fillText(roomType, 200, 415);

      // Instructions
      ctx.fillStyle = "#374151";
      ctx.font = "bold 14px Arial";
      ctx.fillText("Scan to access room services", 200, 450);

      ctx.fillStyle = "#6b7280";
      ctx.font = "12px Arial";
      ctx.fillText("Order food, request housekeeping & more", 200, 470);

      // Download
      const link = document.createElement("a");
      link.download = `room-${roomNumber}-qr-simple.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    };

    qrImage.src = qrDataUrl;
  };

  return (
    <div className="space-y-4">
      {/* QR Code Display */}
      <div
        ref={qrRef}
        className="bg-white p-8 rounded-lg border-2 text-center"
        style={{
          width: "400px",
          height: "500px",
          backgroundColor: "#ffffff",
          borderColor: "#dbeafe",
          color: "#1f2937",
        }}
      >
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-center mb-2">
            <QrCode className="h-6 w-6 mr-2" style={{ color: "#2563eb" }} />
            <h2 className="text-xl font-bold" style={{ color: "#1f2937" }}>
              Welcome to
            </h2>
          </div>
          <h1
            className="text-2xl font-bold"
            style={{
              background: "linear-gradient(to right, #2563eb, #4f46e5)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            INNEXORA
          </h1>
          <p className="text-sm mt-1" style={{ color: "#6b7280" }}>
            Premium Hotel Experience
          </p>
        </div>

        {/* QR Code */}
        {qrDataUrl && (
          <div className="mb-6 flex justify-center">
            <div
              className="p-4 bg-white rounded-lg shadow-inner border"
              style={{
                backgroundColor: "#ffffff",
                borderColor: "#e5e7eb",
              }}
            >
              <img src={qrDataUrl} alt="Room QR Code" className="w-48 h-48" />
            </div>
          </div>
        )}

        {/* Room Info */}
        <div className="mb-6">
          <div
            className="rounded-lg p-3 mb-3"
            style={{ backgroundColor: "#eff6ff" }}
          >
            <p className="text-lg font-semibold" style={{ color: "#1e40af" }}>
              Room {roomNumber}
            </p>
            <p className="text-sm" style={{ color: "#2563eb" }}>
              {roomType}
            </p>
          </div>
        </div>

        {/* Instructions */}
        <div className="text-center">
          <p className="text-sm font-medium mb-1" style={{ color: "#374151" }}>
            Scan to access room services
          </p>
          <p className="text-xs" style={{ color: "#6b7280" }}>
            Order food, request housekeeping & more
          </p>
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4" style={{ borderTop: "1px solid #e5e7eb" }}>
          <p className="text-xs" style={{ color: "#9ca3af" }}>
            Powered by Innexora Hotel Management
          </p>
          <div className="flex justify-center mt-2">
            <div className="flex space-x-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <div
                  key={star}
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: "#fbbf24" }}
                ></div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Download Button */}
      <div className="flex justify-center space-x-3">
        <Button
          onClick={downloadQRCode}
          className="flex items-center space-x-2"
        >
          <Download className="h-4 w-4" />
          <span>Download QR Code</span>
        </Button>
        {onClose && (
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        )}
      </div>
    </div>
  );
};
