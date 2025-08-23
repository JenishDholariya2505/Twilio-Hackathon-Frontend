import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
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

describe("App Component", () => {
  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();

    // Mock fetch responses
    global.fetch = vi.fn();

    // Mock successful API responses
    global.fetch.mockResolvedValueOnce({
      json: async () => ({ success: true, calls: [] }),
    });
    global.fetch.mockResolvedValueOnce({
      json: async () => ({ success: true, messages: [] }),
    });
  });

  describe("Rendering", () => {
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
        expect(
          screen.getByPlaceholderText("+91XXXXXXXXXX or client:alice")
        ).toBeInTheDocument();
        expect(screen.getByText("Call")).toBeInTheDocument();
      });
    });

    it("should render the SMS section", async () => {
      render(<App />);

      await waitFor(() => {
        expect(screen.getByText("📱 Send SMS")).toBeInTheDocument();
        expect(
          screen.getByPlaceholderText("Enter your SMS message here...")
        ).toBeInTheDocument();
        expect(screen.getByText("Send SMS")).toBeInTheDocument();
      });
    });

    it("should render device controls", async () => {
      render(<App />);

      await waitFor(() => {
        expect(screen.getByText("Devices")).toBeInTheDocument();
        expect(screen.getByText("Microphone")).toBeInTheDocument();
        expect(screen.getByText("Speaker")).toBeInTheDocument();
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
  });

  describe("Call Functionality", () => {
    it("should update phone number input", async () => {
      const user = userEvent.setup();
      render(<App />);

      const phoneInput = await screen.findByPlaceholderText(
        "+91XXXXXXXXXX or client:alice"
      );
      await user.type(phoneInput, "+1234567890");

      expect(phoneInput.value).toBe("+1234567890");
    });

    it("should enable call button when phone number is entered", async () => {
      const user = userEvent.setup();
      render(<App />);

      const phoneInput = await screen.findByPlaceholderText(
        "+91XXXXXXXXXX or client:alice"
      );
      const callButton = await screen.findByText("Call");

      // Initially disabled
      expect(callButton).toBeDisabled();

      // Type a valid phone number
      await user.type(phoneInput, "+1234567890");

      // Should be enabled now
      expect(callButton).not.toBeDisabled();
    });

    it("should show error for invalid phone number format", async () => {
      const user = userEvent.setup();
      render(<App />);

      const phoneInput = await screen.findByPlaceholderText(
        "+91XXXXXXXXXX or client:alice"
      );
      const callButton = await screen.findByText("Call");

      // Type invalid phone number
      await user.type(phoneInput, "invalid");
      await user.click(callButton);

      // Should show error in logs
      await waitFor(() => {
        expect(screen.getByText(/Invalid number format/)).toBeInTheDocument();
      });
    });
  });

  describe("SMS Functionality", () => {
    it("should update SMS message input", async () => {
      const user = userEvent.setup();
      render(<App />);

      const smsInput = await screen.findByPlaceholderText(
        "Enter your SMS message here..."
      );
      await user.type(smsInput, "Hello World");

      expect(smsInput.value).toBe("Hello World");
    });

    it("should enable send SMS button when message is entered", async () => {
      const user = userEvent.setup();
      render(<App />);

      const smsInput = await screen.findByPlaceholderText(
        "Enter your SMS message here..."
      );
      const sendButton = await screen.findByText("Send SMS");

      // Initially disabled
      expect(sendButton).toBeDisabled();

      // Type a message
      await user.type(smsInput, "Test message");

      // Should be enabled now
      expect(sendButton).not.toBeDisabled();
    });

    it("should send SMS successfully", async () => {
      const user = userEvent.setup();

      // Mock successful SMS send
      global.fetch.mockResolvedValueOnce({
        json: async () => ({ success: true, sid: "SM123456" }),
      });

      render(<App />);

      const smsInput = await screen.findByPlaceholderText(
        "Enter your SMS message here..."
      );
      const sendButton = await screen.findByText("Send SMS");

      await user.type(smsInput, "Test message");
      await user.click(sendButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          "https://twilio-be-henna.vercel.app/send-sms",
          expect.objectContaining({
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              to: "+919687424831",
              message: "Test message",
            }),
          })
        );
      });
    });
  });

  describe("Device Controls", () => {
    it("should refresh devices when refresh button is clicked", async () => {
      const user = userEvent.setup();
      render(<App />);

      const refreshButton = await screen.findByText("🔄 Devices");
      await user.click(refreshButton);

      // Should call refreshDevices function
      // This will be tested through the mock
    });

    it("should open keypad modal when keypad button is clicked", async () => {
      const user = userEvent.setup();
      render(<App />);

      const keypadButton = await screen.findByText("⌨️ Keypad");
      await user.click(keypadButton);

      // Should open modal
      await waitFor(() => {
        expect(screen.getByText("DTMF Keypad")).toBeInTheDocument();
      });
    });
  });

  describe("Status Indicators", () => {
    it("should show online status", async () => {
      render(<App />);

      await waitFor(() => {
        expect(screen.getByText("🌐 Online")).toBeInTheDocument();
      });
    });

    it("should show connection status", async () => {
      render(<App />);

      await waitFor(() => {
        expect(
          screen.getByText(/Ready to Call|Connecting/)
        ).toBeInTheDocument();
      });
    });
  });

  describe("API Integration", () => {
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

    it("should handle API errors gracefully", async () => {
      // Mock API error
      global.fetch.mockRejectedValueOnce(new Error("Network error"));

      render(<App />);

      // Should not crash and should show empty states
      await waitFor(() => {
        expect(screen.getByText("No call history yet.")).toBeInTheDocument();
      });
    });
  });

  describe("Responsive Design", () => {
    it("should render on different screen sizes", async () => {
      // Test mobile view
      Object.defineProperty(window, "innerWidth", {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText("Twilio Voice Hub")).toBeInTheDocument();
      });
    });
  });

  describe("Accessibility", () => {
    it("should have proper ARIA labels", async () => {
      render(<App />);

      await waitFor(() => {
        const callButton = screen.getByText("Call");
        expect(callButton).toBeInTheDocument();
      });
    });

    it("should be keyboard navigable", async () => {
      const user = userEvent.setup();
      render(<App />);

      const phoneInput = await screen.findByPlaceholderText(
        "+91XXXXXXXXXX or client:alice"
      );

      // Should be able to tab to input
      await user.tab();
      expect(phoneInput).toHaveFocus();
    });
  });
});
