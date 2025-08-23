import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import App from "./App";

// Mock the twilioClient module
vi.mock("./twilioClient", () => ({
  getDevice: vi.fn().mockResolvedValue({
    connect: vi.fn().mockResolvedValue({
      on: vi.fn(),
      disconnect: vi.fn(),
      mute: vi.fn(),
      sendDigits: vi.fn(),
    }),
    on: vi.fn(),
    audio: {
      setInputDevice: vi.fn(),
      speakerDevices: {
        set: vi.fn(),
      },
    },
  }),
  destroyDevice: vi.fn(),
}));

describe("Twilio Voice Hub - Working Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock fetch responses
    global.fetch = vi.fn();
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, calls: [], messages: [] }),
    });
  });

  it("should render the main header with title", async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText("Twilio Voice Hub")).toBeInTheDocument();
    });
  });

  it("should render the call section", async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText("📞 Make a Call")).toBeInTheDocument();
    });
  });

  it("should render device controls", async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText("Devices")).toBeInTheDocument();
    });
  });

  it("should show online status", async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText("Online")).toBeInTheDocument();
    });
  });

  it("should show connection status", async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText("Connecting…")).toBeInTheDocument();
    });
  });

  it("should fetch call logs on mount", async () => {
    render(<App />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "https://twilio-hackathon-backend.vercel.app/call-logs?limit=500"
      );
    });
  });

  it("should fetch message logs on mount", async () => {
    render(<App />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "https://twilio-hackathon-backend.vercel.app/message-logs"
      );
    });
  });

  it("should render phone number input", async () => {
    render(<App />);

    await waitFor(() => {
      expect(
        screen.getByPlaceholderText("+91XXXXXXXXXX or client:alice")
      ).toBeInTheDocument();
    });
  });

  it("should render call button", async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText("Call")).toBeInTheDocument();
    });
  });

  it("should render microphone and speaker controls", async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText("Microphone")).toBeInTheDocument();
      expect(screen.getByText("Speaker")).toBeInTheDocument();
    });
  });

  it("should render time display", async () => {
    render(<App />);

    await waitFor(() => {
      // Time format like "06:45 PM"
      const timeRegex = /\d{1,2}:\d{2}\s?(AM|PM)/i;
      expect(screen.getByText(timeRegex)).toBeInTheDocument();
    });
  });
});
