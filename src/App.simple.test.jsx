import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

describe("App Component - Basic Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock fetch responses
    global.fetch = vi.fn();
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, calls: [], messages: [] }),
    });
  });

  it("should render the main header", async () => {
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

  it("should render the SMS section", async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText("📱 Send SMS")).toBeInTheDocument();
    });
  });

  it("should render device controls", async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText("Devices")).toBeInTheDocument();
    });
  });

  it("should render call history section", async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText("📞 Call History")).toBeInTheDocument();
    });
  });

  it("should render message history section", async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText("📱 Message History")).toBeInTheDocument();
    });
  });

  it("should render logs section", async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText("📋 Logs")).toBeInTheDocument();
    });
  });

  it("should show online status", async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText("Online")).toBeInTheDocument();
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
});
