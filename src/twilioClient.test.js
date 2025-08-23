import { describe, it, expect, vi, beforeEach } from "vitest";
import { getDevice, destroyDevice } from "./twilioClient";

// Mock Twilio Device
const mockDevice = {
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
  destroy: vi.fn(),
};

// Mock Twilio.Device constructor
const MockTwilioDevice = vi.fn().mockImplementation(() => mockDevice);

describe("twilioClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock global Twilio
    global.Twilio = {
      Device: MockTwilioDevice,
    };
  });

  describe("getDevice", () => {
    it("should create and return a Twilio Device instance", async () => {
      const device = await getDevice({
        onStatus: vi.fn(),
        onIncoming: vi.fn(),
        onLog: vi.fn(),
      });

      expect(MockTwilioDevice).toHaveBeenCalled();
      expect(device).toBe(mockDevice);
    });

    it("should set up device event listeners", async () => {
      const onStatus = vi.fn();
      const onIncoming = vi.fn();
      const onLog = vi.fn();

      await getDevice({ onStatus, onIncoming, onLog });

      expect(mockDevice.on).toHaveBeenCalledWith("ready", expect.any(Function));
      expect(mockDevice.on).toHaveBeenCalledWith("error", expect.any(Function));
      expect(mockDevice.on).toHaveBeenCalledWith(
        "connect",
        expect.any(Function)
      );
      expect(mockDevice.on).toHaveBeenCalledWith(
        "disconnect",
        expect.any(Function)
      );
      expect(mockDevice.on).toHaveBeenCalledWith(
        "incoming",
        expect.any(Function)
      );
    });

    it("should handle device ready event", async () => {
      const onStatus = vi.fn();
      const onLog = vi.fn();

      await getDevice({ onStatus, onLog });

      // Get the ready event handler
      const readyCall = mockDevice.on.mock.calls.find(
        (call) => call[0] === "ready"
      );
      const readyHandler = readyCall[1];

      // Simulate ready event
      readyHandler();

      expect(onStatus).toHaveBeenCalledWith("Ready");
      expect(onLog).toHaveBeenCalledWith("Device ready");
    });

    it("should handle device error event", async () => {
      const onStatus = vi.fn();
      const onLog = vi.fn();

      await getDevice({ onStatus, onLog });

      // Get the error event handler
      const errorCall = mockDevice.on.mock.calls.find(
        (call) => call[0] === "error"
      );
      const errorHandler = errorCall[1];

      // Simulate error event
      const error = new Error("Test error");
      errorHandler(error);

      expect(onStatus).toHaveBeenCalledWith("Error Test error");
      expect(onLog).toHaveBeenCalledWith("Device error: Test error");
    });

    it("should handle incoming call event", async () => {
      const onIncoming = vi.fn();
      const onLog = vi.fn();

      await getDevice({ onIncoming, onLog });

      // Get the incoming event handler
      const incomingCall = mockDevice.on.mock.calls.find(
        (call) => call[0] === "incoming"
      );
      const incomingHandler = incomingCall[1];

      // Simulate incoming call
      const call = { parameters: { CallSid: "test-call-id" } };
      incomingHandler(call);

      expect(onIncoming).toHaveBeenCalledWith(call);
      expect(onLog).toHaveBeenCalledWith("Incoming call: test-call-id");
    });
  });

  describe("destroyDevice", () => {
    it("should destroy the current device instance", () => {
      // Set up a mock device
      global.currentDevice = mockDevice;

      destroyDevice();

      expect(mockDevice.destroy).toHaveBeenCalled();
      expect(global.currentDevice).toBeNull();
    });

    it("should handle case when no device exists", () => {
      global.currentDevice = null;

      // Should not throw error
      expect(() => destroyDevice()).not.toThrow();
    });
  });

  describe("Error Handling", () => {
    it("should handle Twilio Device creation errors", async () => {
      const error = new Error("Twilio initialization failed");
      MockTwilioDevice.mockImplementationOnce(() => {
        throw error;
      });

      await expect(
        getDevice({
          onStatus: vi.fn(),
          onIncoming: vi.fn(),
          onLog: vi.fn(),
        })
      ).rejects.toThrow("Twilio initialization failed");
    });

    it("should handle missing Twilio global", async () => {
      delete global.Twilio;

      await expect(
        getDevice({
          onStatus: vi.fn(),
          onIncoming: vi.fn(),
          onLog: vi.fn(),
        })
      ).rejects.toThrow("Twilio is not available");
    });
  });

  describe("Device Audio Controls", () => {
    it("should set input device", async () => {
      const device = await getDevice({
        onStatus: vi.fn(),
        onIncoming: vi.fn(),
        onLog: vi.fn(),
      });

      const deviceId = "test-mic-id";
      await device.audio.setInputDevice(deviceId);

      expect(mockDevice.audio.setInputDevice).toHaveBeenCalledWith(deviceId);
    });

    it("should set speaker devices", async () => {
      const device = await getDevice({
        onStatus: vi.fn(),
        onIncoming: vi.fn(),
        onLog: vi.fn(),
      });

      const deviceIds = ["test-speaker-id"];
      await device.audio.speakerDevices.set(deviceIds);

      expect(mockDevice.audio.speakerDevices.set).toHaveBeenCalledWith(
        deviceIds
      );
    });
  });
});
