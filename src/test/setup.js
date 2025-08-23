import "@testing-library/jest-dom";

// Mock Twilio Voice SDK
global.Twilio = {
  Device: {
    version: "2.15.0",
  },
};

// Mock window.matchMedia
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock navigator.mediaDevices
Object.defineProperty(navigator, "mediaDevices", {
  value: {
    getUserMedia: vi.fn().mockResolvedValue({}),
    enumerateDevices: vi.fn().mockResolvedValue([
      { deviceId: "mic1", label: "Microphone 1", kind: "audioinput" },
      { deviceId: "speaker1", label: "Speaker 1", kind: "audiooutput" },
    ]),
  },
});

// Mock fetch
global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  json: async () => ({ success: true, token: "mock-token" }),
  text: async () => "mock response",
});

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
global.localStorage = localStorageMock;

// Mock window.online
Object.defineProperty(window, "onLine", {
  writable: true,
  value: true,
});
