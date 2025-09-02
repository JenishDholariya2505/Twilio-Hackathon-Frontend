// src/App.jsx
import {
  AudioTwoTone,
  CaretRightOutlined,
  CloseCircleOutlined,
  MessageOutlined,
  NumberOutlined,
  OrderedListOutlined,
  PauseOutlined,
  PhoneFilled,
  ReloadOutlined,
  SoundOutlined,
  SoundTwoTone,
  FilterOutlined,
  SearchOutlined,
  ClearOutlined,
  CalendarOutlined,
} from "@ant-design/icons";
import {
  Button,
  Card,
  Col,
  Divider,
  Flex,
  Input,
  Layout,
  List,
  Modal,
  Row,
  Select,
  Space,
  Tag,
  Tooltip,
  Typography,
  DatePicker,
  Dropdown,
  Menu,
  Badge,
} from "antd";
import React, { useEffect, useRef, useState } from "react";
import { destroyDevice, getDevice } from "./twilioClient";

const { Header, Content, Footer } = Layout;
const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

export default function App() {
  const deviceRef = useRef(null);
  const deviceRefCall = useRef(null);
  console.log(deviceRefCall, "deviceRefCall");

  const [status, setStatus] = useState("Connecting…");
  const [to, setTo] = useState("+919687424831"); // default for you 😉 919687424831
  const [countryCode, setCountryCode] = useState("+91"); // Default country code
  const [phoneNumber, setPhoneNumber] = useState("9687424831"); // Default phone number without country code
  const [activeCall, setActiveCall] = useState(null);
  const [muted, setMuted] = useState(false);
  const [keypadOpen, setKeypadOpen] = useState(false);
  const [logs, setLogs] = useState([]);
  const [micList, setMicList] = useState([]);
  const [spkList, setSpkList] = useState([]);
  const [micId, setMicId] = useState();
  const [spkId, setSpkId] = useState();
  const [smsBody, setSmsBody] = useState(""); // 👈 renamed from message → smsBody
  const [callLogs, setCallLogs] = useState([]); // 👈 renamed state
  const [callLoading, setCallLoading] = useState(true);
  const [messageLogs, setMessageLogs] = useState([]);
  const [messageLoading, setMessageLoading] = useState(true);
  const [isRefreshingDevices, setIsRefreshingDevices] = useState(false);

  // Filter states for Message Logs
  const [messageFilters, setMessageFilters] = useState({
    search: "",
    status: "all",
    direction: "all",
    dateRange: null,
  });

  // Filter states for Call Logs
  const [callFilters, setCallFilters] = useState({
    search: "",
    status: "all",
    dateRange: null,
    duration: "all",
  });

  const pushLog = (line) =>
    setLogs((prev) =>
      [`${new Date().toLocaleTimeString()}  ${line}`, ...prev].slice(0, 200)
    );

  // Filter functions for Message Logs
  const getFilteredMessageLogs = () => {
    return messageLogs.filter((msg) => {
      // Search filter
      if (messageFilters.search) {
        const searchLower = messageFilters.search.toLowerCase();
        const matchesSearch =
          msg.from?.toLowerCase().includes(searchLower) ||
          msg.to?.toLowerCase().includes(searchLower) ||
          msg.body?.toLowerCase().includes(searchLower) ||
          msg.sid?.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      // Status filter
      if (
        messageFilters.status !== "all" &&
        msg.status !== messageFilters.status
      ) {
        return false;
      }

      // Direction filter
      if (
        messageFilters.direction !== "all" &&
        msg.direction !== messageFilters.direction
      ) {
        return false;
      }

      // Date range filter
      if (messageFilters.dateRange && messageFilters.dateRange.length === 2) {
        const msgDate = new Date(msg.dateSent);
        const startDate = messageFilters.dateRange[0].startOf("day");
        const endDate = messageFilters.dateRange[1].endOf("day");
        if (msgDate < startDate || msgDate > endDate) {
          return false;
        }
      }

      return true;
    });
  };

  // Filter functions for Call Logs
  const getFilteredCallLogs = () => {
    return callLogs.filter((call) => {
      // Search filter
      if (callFilters.search) {
        const searchLower = callFilters.search.toLowerCase();
        const matchesSearch =
          call.from?.toLowerCase().includes(searchLower) ||
          call.to?.toLowerCase().includes(searchLower) ||
          call.sid?.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      // Status filter
      if (callFilters.status !== "all" && call.status !== callFilters.status) {
        return false;
      }

      // Date range filter
      if (callFilters.dateRange && callFilters.dateRange.length === 2) {
        const callDate = new Date(call.startTime);
        const startDate = callFilters.dateRange[0].startOf("day");
        const endDate = callFilters.dateRange[1].endOf("day");
        if (callDate < startDate || callDate > endDate) {
          return false;
        }
      }

      // Duration filter
      if (callFilters.duration !== "all") {
        const duration = parseInt(call.duration) || 0;
        switch (callFilters.duration) {
          case "short":
            if (duration > 60) return false; // Less than 1 minute
            break;
          case "medium":
            if (duration <= 60 || duration > 300) return false; // 1-5 minutes
            break;
          case "long":
            if (duration <= 300) return false; // More than 5 minutes
            break;
          default:
            break;
        }
      }

      return true;
    });
  };

  // Clear filters functions
  const clearMessageFilters = () => {
    setMessageFilters({
      search: "",
      status: "all",
      direction: "all",
      dateRange: null,
    });
  };

  const clearCallFilters = () => {
    setCallFilters({
      search: "",
      status: "all",
      dateRange: null,
      duration: "all",
    });
  };

  const sendSMS = async () => {
    pushLog("Sending SMS...");
    try {
      const res = await fetch("https://twilio-be-henna.vercel.app/send-sms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to,
          message: smsBody, // backend still expects "message"
        }),
      });

      const data = await res.json();
      if (data.success) {
        setTimeout(() => {
          setSmsBody("");
          fetchLogs();
          pushLog("✅ Message sent! SID: " + data.sid);
        }, 1500);
      } else {
        pushLog("❌ Failed: " + data.error);
      }
    } catch (err) {
      console.error("Fetch error:", err);

      pushLog("Something went wrong");
    }
  };

  const fetchLogs = async () => {
    setMessageLoading(true);
    try {
      const res = await fetch(
        "https://twilio-hackathon-backend.vercel.app/message-logs"
      );

      const data = await res.json();
      if (data.success) {
        setMessageLogs(data.messages || []); // assuming API returns JSON array
      }
    } catch (err) {
    } finally {
      setMessageLoading(false);
    }
  };
  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchCallLogs = async () => {
    setCallLoading(true);
    try {
      const res = await fetch(
        "https://twilio-hackathon-backend.vercel.app/call-logs?limit=500"
      );
      const data = await res.json();
      if (data.success) {
        setCallLoading(false);
        setCallLogs(data.calls); // 👈 updated setter
      }
    } catch (err) {
      setCallLoading(false);
      console.error("Error fetching logs:", err);
    }
  };
  useEffect(() => {
    fetchCallLogs();
  }, []);

  // init device
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const d = await getDevice({
          onStatus: (s) => mounted && setStatus(s),
          onIncoming: (call) => {
            wireCall(call);
            // show your modal if you want; for demo accept:
            call.accept();
          },
          onLog: (l) => mounted && pushLog(l),
        });
        deviceRef.current = d;
        pushLog(
          `Voice SDK ready (v${
            (window.Twilio && window.Twilio.Device?.version) || "npm 2.x"
          })`
        );
        await refreshDevices(); // populate picker lists
      } catch (e) {
        if (e) {
          setStatus(`Error ${e.message || e}`);
          pushLog(`Init failed: ${e.message || e}`);
        }
      }
    })();
    return () => {
      mounted = false;
      destroyDevice();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function wireCall(call) {
    call.on("accept", () => {
      setActiveCall(call);
      setMuted(!!call.isMuted?.());

      pushLog(
        `Call accepted (CallSid: ${call.parameters?.CallSid || "pending"})`
      );
    });
    call.on("disconnect", () => {
      setActiveCall(null);
      setMuted(false);
      setStatus("Ready");
      pushLog("Call ended");
    });
    call.on("error", (e) => pushLog(`Call error: ${e.message || e}`));
  }
  function isPstn(v) {
    return /^\+\d{7,15}$/.test(v);
  }
  const makeCall = async () => {
    if (!deviceRef.current) {
      pushLog("❌ Device not ready");
      return;
    }

    if (!isPstn(to) && !to.startsWith("client:")) {
      pushLog("❌ Invalid number format. Use +countrycode or client:identity");
      return;
    }

    try {
      pushLog(`📞 Making call to: ${to}`);
      setStatus("Calling...");

      const call = await deviceRef.current.connect({
        params: { To: to },
      });
      deviceRefCall.current = call;

      pushLog("Call initiated, waiting for response...");
      wireCall(call);
    } catch (error) {
      console.error("Call error:", error);

      // Handle specific Twilio errors
      if (error.code === 31005) {
        pushLog(`❌ Gateway error (31005): ${error.message}`);
        pushLog("🔄 Attempting to reconnect...");
        setStatus("Reconnecting...");

        // Wait a bit and try to reconnect
        setTimeout(async () => {
          try {
            await makeCall();
          } catch (retryError) {
            pushLog(`❌ Reconnection failed: ${retryError.message}`);
            setStatus("Ready");
          }
        }, 2000);
      } else {
        pushLog(`❌ Call failed: ${error.message || error}`);
        setStatus("Ready");
      }
    }
  };
  useEffect(() => {
    const last = localStorage.getItem("lastTo");
    if (last) setTo(last);
  }, []);

  // Auto-detect device changes (add/remove)
  useEffect(() => {
    const handleDeviceChange = () => {
      pushLog("🔄 Device list changed, refreshing...");
      refreshDevices();
    };

    // Listen for device changes
    if (navigator.mediaDevices && navigator.mediaDevices.addEventListener) {
      navigator.mediaDevices.addEventListener(
        "devicechange",
        handleDeviceChange
      );
      pushLog("✅ Device change detection enabled");
    } else {
      pushLog("⚠️ Device change detection not supported in this browser");
    }

    // Fallback: Periodic device check for browsers without devicechange support
    const intervalId = setInterval(() => {
      refreshDevices();
    }, 10000); // Check every 10 seconds

    // Cleanup
    return () => {
      if (
        navigator.mediaDevices &&
        navigator.mediaDevices.removeEventListener
      ) {
        navigator.mediaDevices.removeEventListener(
          "devicechange",
          handleDeviceChange
        );
      }
      clearInterval(intervalId);
    };
  }, []);
  useEffect(() => {
    if (to) localStorage.setItem("lastTo", to);
  }, [to]);

  // Initialize phone number from 'to' state
  // useEffect(() => {
  //   if (to && to.startsWith("+")) {
  //     // Extract country code and phone number from 'to' state
  //     const match = to.match(/^\+(\d{1,4})(\d+)$/);
  //     if (match) {
  //       const [, country, phone] = match;
  //       setCountryCode(`+${country}`);
  //       setPhoneNumber(phone);
  //     }
  //   }
  // }, []); // Only run once on mount

  function hangup() {
    fetchCallLogs();
    deviceRefCall.current = null;
    activeCall?.disconnect();
  }

  function toggleMute() {
    if (!activeCall) return;
    const next = !muted;
    activeCall.mute(next);
    setMuted(next);
    pushLog(next ? "Muted" : "Unmuted");
  }

  function sendDigit(d) {
    if (!activeCall) return;

    // Special handling for call forwarding (9)
    if (d === "9") {
      // return;
      const forwardNumber = "+916353791329";
      const callSid = deviceRefCall.current?.parameters?.CallSid;

      pushLog(`Call forwarding to: ${forwardNumber}`);

      fetch(`https://twilio-hackathon-backend.vercel.app/calls/forward`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_auth_token")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ConferenceSid: callSid,
          core_call_number: "+18153965675",
          NewNumber: forwardNumber,
        }),
      })
        .then(async (res) => {
          if (!res.ok) {
            throw new Error(`HTTP error! Status: ${res.status}`);
          }
          return res.json();
        })
        .then((data) => {
          pushLog(`Call forwarded to ${forwardNumber}`);
        })
        .catch((err) => {
          console.error("Forward failed", err);
        });
    } else {
      activeCall.sendDigits(d);
      pushLog(`DTMF sent: ${d}`);
    }
  }

  async function refreshDevices() {
    try {
      setIsRefreshingDevices(true);
      // Use enumerateDevices for better labels
      const devices = await navigator.mediaDevices.enumerateDevices();
      const mics = devices.filter((d) => d.kind === "audioinput");
      const spks = devices.filter((d) => d.kind === "audiooutput");

      // Check if current devices are still available
      const currentMicStillAvailable = mics.some(
        (mic) => mic.deviceId === micId
      );
      const currentSpkStillAvailable = spks.some(
        (spk) => spk.deviceId === spkId
      );

      setMicList(mics);
      setSpkList(spks);

      // Auto-select first available device if current one is no longer available
      if (!micId && mics[0]) {
        setMicId(mics[0].deviceId);
      } else if (!currentMicStillAvailable && mics[0]) {
        setMicId(mics[0].deviceId);
      }

      if (!spkId && spks[0]) {
        setSpkId(spks[0].deviceId);
      } else if (!currentSpkStillAvailable && spks[0]) {
        setSpkId(spks[0].deviceId);
      }
    } catch (e) {
    } finally {
      setIsRefreshingDevices(false);
    }
  }

  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const reconnectCall = async () => {
    try {
      // Re-establish connection
      await makeCall();
    } catch (error) {
      console.error("Reconnection failed:", error);
    }
  };

  async function applyMic(id) {
    setMicId(id);
    try {
      // Twilio SDK input change
      await deviceRef.current?.audio?.setInputDevice?.(id);
    } catch (e) {
      pushLog(`Mic set failed: ${e.message || e}`);
    }
  }

  async function applySpeaker(id) {
    setSpkId(id);
    try {
      // Twilio SDK speaker change (expects an array)
      await deviceRef.current?.audio?.speakerDevices?.set?.([id]);
    } catch (e) {
      pushLog(`Speaker set failed: ${e.message || e}`);
    }
  }

  function shortLabel(label = "") {
    return label || "Default";
  }

  const columns = [
    {
      title: "SID",
      dataIndex: "sid",
      key: "sid",
      ellipsis: true,
    },
    {
      title: "From",
      dataIndex: "from",
      key: "from",
    },
    {
      title: "To",
      dataIndex: "to",
      key: "to",
    },
    {
      title: "Body",
      dataIndex: "body",
      key: "body",
      ellipsis: true,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status) => {
        let color =
          status === "delivered"
            ? "green"
            : status === "failed"
            ? "red"
            : "blue";
        return <Tag color={color}>{status.toUpperCase()}</Tag>;
      },
    },
    {
      title: "Price",
      dataIndex: "price",
      key: "price",
      render: (price, record) => (
        <span>
          {price} {record.priceUnit}
        </span>
      ),
    },
    {
      title: "Date Sent",
      dataIndex: "dateSent",
      key: "dateSent",
      render: (text) => new Date(text).toLocaleString(),
    },
  ];

  const ready = /Ready/i.test(status);

  return (
    <Layout style={{ height: "100vh", overflow: "hidden" }}>
      <Header
        style={{
          background: "#1f1f1f", // clean dark header
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 24px",
          height: "64px",
          borderBottom: "1px solid #303030",
        }}
      >
        {/* Left Section */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              background: "#262626",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <PhoneFilled style={{ fontSize: "18px", color: "#1890ff" }} />
          </div>

          <Flex vertical align="flex-start">
            <Title
              level={4}
              style={{
                color: "#fff",
                margin: 0,
                fontWeight: "600",
                fontSize: "16px",
              }}
            >
              Twilio Voice Hub
            </Title>
            <Text
              style={{
                color: "#bfbfbf",
                fontSize: "12px",
              }}
            >
              Professional Communication
            </Text>
          </Flex>
        </div>

        {/* Right Section */}
        <Space size="middle" align="center">
          {/* Status Badge */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "8px 16px",
              borderRadius: "20px",
              background: ready
                ? "rgba(82,196,26,0.2)"
                : status.startsWith("Error")
                ? "rgba(255,77,79,0.2)"
                : "rgba(250,173,20,0.2)",
              border: `1px solid ${
                ready
                  ? "rgba(82,196,26,0.4)"
                  : status.startsWith("Error")
                  ? "rgba(255,77,79,0.4)"
                  : "rgba(250,173,20,0.4)"
              }`,
              backdropFilter: "blur(10px)",
            }}
          >
            <div
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: ready
                  ? "#52c41a"
                  : status.startsWith("Error")
                  ? "#ff4d4f"
                  : "#faad14",
                boxShadow: ready
                  ? "0 0 8px rgba(82,196,26,0.6)"
                  : status.startsWith("Error")
                  ? "0 0 8px rgba(255,77,79,0.6)"
                  : "0 0 8px rgba(250,173,20,0.6)",
                animation: ready ? "pulse 2s infinite" : "none",
              }}
            />
            <Text
              style={{
                color: "#fff",
                fontSize: "13px",
                fontWeight: "600",
                textShadow: "0 1px 2px rgba(0,0,0,0.1)",
              }}
            >
              {ready ? "Ready" : status.startsWith("Error") ? "Error" : status}
            </Text>
          </div>

          {/* Online Status */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 12px",
              borderRadius: "16px",
              background: isOnline
                ? "rgba(82,196,26,0.2)"
                : "rgba(255,77,79,0.2)",
              // border: `1px solid ${
              //   isOnline ? "rgba(82,196,26,0.4)" : "rgba(255,77,79,0.4)"
              // }`,
              backdropFilter: "blur(10px)",
            }}
          >
            <div
              style={{
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                background: isOnline ? "#52c41a" : "#ff4d4f",
                boxShadow: isOnline
                  ? "0 0 6px rgba(82,196,26,0.6)"
                  : "0 0 6px rgba(255,77,79,0.6)",
                animation: isOnline ? "pulse 1.5s infinite" : "none",
              }}
            />
            <Text
              style={{
                color: "#fff",
                fontSize: "12px",
                fontWeight: "500",
                textShadow: "0 1px 2px rgba(0,0,0,0.1)",
              }}
            >
              {isOnline ? "Online" : "Offline"}
            </Text>
          </div>

          {/* Time Display */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 12px",
              borderRadius: "16px",
              background: "rgba(255,255,255,0.15)",
              // border: "1px solid rgba(255,255,255,0.3)",
              backdropFilter: "blur(10px)",
            }}
          >
            <Text
              style={{
                color: "#fff",
                fontSize: "12px",
                fontWeight: "500",
                margin: 0,
                textShadow: "0 1px 2px rgba(0,0,0,0.1)",
              }}
            >
              {new Date().toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
          </div>
        </Space>
      </Header>

      <Content
        style={{
          padding: 24,
          height: "calc(100vh - 64px - 80px)",
          overflow: "auto",
          background: "#f5f5f5",
        }}
      >
        <Row
          gutter={[24, 24]}
          style={{ width: "100%", margin: "0 auto", paddingBottom: 20 }}
        >
          {/* Dialer */}
          <Col xs={24} lg={12} xl={6}>
            <div className="gradient-border-wrapper">
              <Card
                size="large"
                className="gradient-border-content"
                style={{
                  borderRadius: 12,
                  background: "rgb(2 179 144 / 8%)",
                  // border: "none",
                  // boxShadow: "0 12px 40px rgba(102, 126, 234, 0.4)",
                  transition: "all 0.4s ease",
                  transform: "translateY(0)",
                  animation: "slideInUp 0.6s ease-out",
                  height: "100%",
                  position: "relative",
                  overflow: "hidden",
                  boxShadow: "none",
                }}
              >
                {/* Animated Background Pattern */}
                <div
                  style={{
                    position: "absolute",
                    top: "-50%",
                    right: "-50%",
                    width: "200%",
                    height: "200%",
                    background:
                      "radial-gradient(circle, rgba(255,255,255,0.15) 2px, transparent 2px)",
                    backgroundSize: "30px 30px",
                    opacity: 0.4,
                    pointerEvents: "none",
                    animation: "float 6s ease-in-out infinite",
                  }}
                />

                {/* Floating Elements */}
                <div
                  style={{
                    position: "absolute",
                    top: "20px",
                    right: "20px",
                    width: "40px",
                    height: "40px",
                    borderRadius: "50%",
                    background: "rgb(2 179 144 / 9%)",
                    backdropFilter: "blur(10px)",
                    animation: "bounce 3s ease-in-out infinite",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    bottom: "30px",
                    left: "20px",
                    width: "30px",
                    height: "30px",
                    borderRadius: "50%",
                    background: "rgb(2 179 144 / 9%)",
                    backdropFilter: "blur(10px)",
                    animation: "bounce 4s ease-in-out infinite 1s",
                  }}
                />

                <Space
                  direction="vertical"
                  style={{ width: "100%", position: "relative", zIndex: 1 }}
                  size="large"
                >
                  <div style={{ textAlign: "center", marginBottom: "8px" }}>
                    <div
                      style={{
                        width: "70px",
                        height: "70px",
                        borderRadius: "50%",
                        background: "rgb(2 179 144)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        margin: "0 auto 16px",
                        backdropFilter: "blur(15px)",
                        border: "3px solid rgba(255,255,255,0.4)",
                        // boxShadow: "0 8px 25px rgba(0,0,0,0.2)",
                        animation: "pulse 2s infinite",
                      }}
                    >
                      <PhoneFilled
                        style={{ fontSize: "28px", color: "#fff" }}
                      />
                    </div>
                    <Title
                      level={3}
                      style={{
                        margin: 0,
                        color: "rgb(31 31 31)",
                        fontWeight: "700",
                        // textShadow: "0 2px 8px rgba(0,0,0,0.3)",
                        letterSpacing: "1px",
                      }}
                    >
                      Make a Call
                    </Title>
                    <Text
                      style={{
                        color: "rgb(143 143 143)",
                        fontSize: "15px",
                        fontWeight: "500",
                        // textShadow: "0 1px 4px rgba(0,0,0,0.2)",
                      }}
                    >
                      Connect with anyone worldwide
                    </Text>
                  </div>

                  <Space.Compact style={{ width: "100%" }}>
                    <small>To</small>
                    <Select
                      size="large"
                      options={[{ label: "+1 815 396 5675", value: "123" }]}
                      defaultValue={"123"}
                      style={{
                        borderRadius: "8px 0px 0px 8px",
                        border: "1px solid #1f1f1f24",
                        width: "100%",
                        fontSize: "16px",
                        background: "rgba(255, 255, 255, 0.95)",
                      }}
                    />
                  </Space.Compact>
                  <Space.Compact style={{ width: "100%" }}>
                    <small>From</small>
                    <Flex>
                      {" "}
                      <Select
                        size="large"
                        options={[
                          { label: "🇮🇳 +91", value: "+91" },
                          { label: "🇺🇸 +1", value: "+1" },
                          { label: "🇬🇧 +44", value: "+44" },
                          { label: "🇩🇪 +49", value: "+49" },
                          { label: "🇫🇷 +33", value: "+33" },
                          { label: "🇮🇹 +39", value: "+39" },
                          { label: "🇪🇸 +34", value: "+34" },
                          // { label: "🇨🇦 +1", value: "+1" },
                          { label: "🇦🇺 +61", value: "+61" },
                          { label: "🇯🇵 +81", value: "+81" },
                          { label: "🇰🇷 +82", value: "+82" },
                          { label: "🇨🇳 +86", value: "+86" },
                          { label: "🇧🇷 +55", value: "+55" },
                          { label: "🇷🇺 +7", value: "+7" },
                          { label: "🇿🇦 +27", value: "+27" },
                          { label: "🇪🇬 +20", value: "+20" },
                          { label: "🇳🇬 +234", value: "+234" },
                          { label: "🇰🇪 +254", value: "+254" },
                          { label: "🇲🇽 +52", value: "+52" },
                          { label: "🇦🇷 +54", value: "+54" },
                        ]}
                        value={countryCode}
                        onChange={(value) => {
                          setCountryCode(value);
                          const phone = phoneNumber.trim();
                          if (phone) {
                            setTo(`${value}${phone}`);
                          }
                        }}
                        style={{
                          borderRadius: "8px 0px 0px 8px",
                          border: "1px solid #1f1f1f24",
                          width: "120px",
                          fontSize: "16px",
                          background: "rgba(255, 255, 255, 0.95)",
                        }}
                      />
                      <Input
                        size="large"
                        prefix={<PhoneFilled style={{ color: "#667eea" }} />}
                        placeholder="Enter phone number"
                        value={phoneNumber}
                        onChange={(e) => {
                          const value = e.target.value.replace(/[^0-9]/g, "");
                          setPhoneNumber(value);
                          if (value.trim()) {
                            setTo(`${countryCode}${value.trim()}`);
                          }
                        }}
                        style={{
                          borderRadius: "0px",
                          border: "1px solid #1f1f1f24",
                          borderLeft: "none",
                          borderRight: "none",
                          flex: 1,
                          fontSize: "16px",
                          background: "rgba(255, 255, 255, 0.95)",
                        }}
                      />
                      <Tooltip title={activeCall ? "End Call" : "Make Call"}>
                        <Button
                          size="large"
                          type="primary"
                          icon={<PhoneFilled />}
                          onClick={activeCall ? hangup : makeCall}
                          disabled={activeCall ? false : !ready || !to}
                          style={{
                            borderRadius: "0px 8px 8px 0px",
                            background: activeCall ? "#ff4d4f" : "#02b390",
                            border: "none",
                            color: "#fff",
                            fontWeight: "700",
                            fontSize: "16px",
                            transition: "all 0.3s ease",
                          }}
                        >
                          {activeCall ? "End Call" : "Call"}
                        </Button>
                      </Tooltip>
                    </Flex>
                  </Space.Compact>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "8px",
                    }}
                  >
                    <Button
                      icon={muted ? <PauseOutlined /> : <CaretRightOutlined />}
                      disabled={!activeCall}
                      onClick={toggleMute}
                      style={{
                        borderRadius: "8px",
                        background: muted ? "#ff4d4f" : "rgb(2, 179, 144)",
                        border: "none",
                        color: "#fff",
                        fontWeight: "500",
                        height: "40px",
                        padding: "0 16px",
                        fontSize: "14px",
                      }}
                    >
                      {muted ? "Unmute" : "Mute"}
                    </Button>

                    <div style={{ display: "flex", gap: "6px" }}>
                      <Button
                        icon={<NumberOutlined />}
                        disabled={!activeCall}
                        onClick={() => setKeypadOpen(true)}
                        style={{
                          borderRadius: "8px",
                          background: "rgb(220 220 220)",

                          color: "rgb(31 31 31)",
                          fontWeight: "500",
                          flex: 1,
                          height: "40px",
                          padding: "0 12px",
                          fontSize: "14px",
                        }}
                      >
                        Keypad
                      </Button>
                      <Button
                        icon={<ReloadOutlined />}
                        onClick={refreshDevices}
                        style={{
                          background: "rgb(2 179 144 / 26%)",
                          border: "none",
                          color: "rgb(2 179 144)",
                          fontWeight: "500",
                          flex: 1,
                          height: "40px",
                          borderRadius: "8px",
                          padding: "0 12px",
                          fontSize: "14px",
                        }}
                      >
                        Devices
                      </Button>
                    </div>
                  </div>
                  {/* Status Indicator */}
                  <div style={{ textAlign: "center", marginTop: "8px" }}>
                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "6px 12px",
                      }}
                    >
                      <div
                        style={{
                          width: "6px",
                          height: "6px",
                          borderRadius: "50%",
                          background: ready ? "rgb(2 179 144)" : "#ff4d4f",
                          animation: ready ? "pulse 2s infinite" : "none",
                        }}
                      />
                      <Text
                        style={{
                          color: ready ? "rgb(2 179 144)" : "#ff4d4f",
                          fontSize: "12px",
                          fontWeight: "500",
                        }}
                      >
                        {ready ? "Ready to Call" : "Connecting..."}
                      </Text>
                    </div>
                  </div>
                </Space>
              </Card>
            </div>
          </Col>
          {/* SMS Section */}
          <Col xs={24} lg={12} xl={9}>
            <Card
              size="large"
              style={{
                borderRadius: 12,
                background: "#FFF",
                // border: "1px solid #e1e8ff",
                boxShadow: "none",
                transition: "all 0.3s ease",
                transform: "translateY(0)",
                animation: "slideInUp 0.6s ease-out 0.4s both",
                height: "100%",
              }}
              bordered={false}
              styles={{
                body: {
                  padding: "15px",
                },
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "16px",
                  paddingBottom: "12px",
                  borderBottom: "2px solid #e1e8ff",
                }}
              >
                <div
                  style={{ display: "flex", alignItems: "center", gap: "8px" }}
                >
                  <div
                    style={{
                      width: "40px",
                      height: "40px",
                      borderRadius: "50%",
                      // background: "#02b390",
                      border: "1px solid rgb(2, 179, 144)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      // boxShadow: "0 4px 12px rgba(102, 126, 234, 0.3)",
                    }}
                  >
                    <MessageOutlined
                      style={{ color: "rgb(2, 179, 144)", fontSize: "18px" }}
                    />
                  </div>
                  <Flex align="start" vertical>
                    <Title level={5} style={{ margin: 0, color: "#2c3e50" }}>
                      Send SMS
                    </Title>
                  </Flex>
                </div>
              </div>
              <Space
                direction="vertical"
                style={{ width: "100%" }}
                size="middle"
              >
                <Input.TextArea
                  size="large"
                  placeholder="Enter your SMS message here..."
                  value={smsBody}
                  onChange={(e) => setSmsBody(e.target.value)}
                  rows={2}
                  style={{ borderRadius: 8 }}
                />

                <Flex align="center" justify="end">
                  <Button
                    type="primary"
                    size="large"
                    onClick={sendSMS}
                    disabled={!smsBody.trim() || !to}
                    icon={<SoundOutlined />}
                    style={{ borderRadius: 8 }}
                  >
                    Send SMS
                  </Button>
                </Flex>
              </Space>
              <Divider />

              <Space
                direction="vertical"
                size="middle"
                style={{ width: "100%" }}
              >
                <Space
                  style={{ width: "100%", padding: "0px 20px" }}
                  direction="horizontal"
                >
                  <div style={{ width: "110px", textAlign: "left" }}>
                    <Text strong>
                      <AudioTwoTone twoToneColor="#1677ff" /> Microphone
                    </Text>
                  </div>
                  <Select
                    value={micId}
                    style={{ width: "100%" }}
                    placeholder="Select microphone"
                    options={micList.map((d) => ({
                      value: d.deviceId,
                      label: shortLabel(d.label),
                    }))}
                    onChange={applyMic}
                  />
                </Space>

                <Space
                  style={{ width: "100%", padding: "0px 20px" }}
                  direction="horizontal"
                >
                  <div style={{ width: "110px", textAlign: "left" }}>
                    <Text strong>
                      <SoundTwoTone twoToneColor="#52c41a" /> Speaker
                    </Text>
                  </div>
                  <Select
                    value={spkId}
                    style={{ width: "100%" }}
                    placeholder="Select speaker"
                    options={spkList.map((d) => ({
                      value: d.deviceId,
                      label: shortLabel(d.label),
                    }))}
                    onChange={applySpeaker}
                  />
                </Space>
                <Flex justify="center">
                  {" "}
                  <div style={{ maxWidth: "380px" }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      Tip: Some browsers need a user gesture (click) before
                      changing output device takes effect.
                    </Text>
                  </div>
                </Flex>
              </Space>
            </Card>
          </Col>

          <Col xs={24} lg={12} xl={9}>
            <Card
              size="large"
              style={{
                borderRadius: 12,
                background: "#FFF",
                // border: "1px solid #e1e8ff",
                boxShadow: "none",
                transition: "all 0.3s ease",
                transform: "translateY(0)",
                animation: "slideInUp 0.6s ease-out 0.4s both",
                height: "100%",
              }}
              bordered={false}
              styles={{
                body: {
                  padding: "15px",
                },
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "16px",
                  paddingBottom: "12px",
                  borderBottom: "2px solid #e1e8ff",
                }}
              >
                <div
                  style={{ display: "flex", alignItems: "center", gap: "8px" }}
                >
                  <div
                    style={{
                      width: "40px",
                      height: "40px",
                      borderRadius: "50%",
                      border: "1px solid rgb(2, 179, 144)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      // boxShadow: "0 4px 12px rgba(102, 126, 234, 0.3)",
                    }}
                  >
                    <OrderedListOutlined
                      style={{ color: "rgb(2, 179, 144)", fontSize: "18px" }}
                    />
                  </div>
                  <Flex align="start" vertical>
                    <Title level={5} style={{ margin: 0, color: "#2c3e50" }}>
                      Logs
                    </Title>
                  </Flex>
                </div>
              </div>

              <div
                style={{
                  maxHeight: "340px",
                  overflowY: "auto",
                  border: "1px solid #f0f0f0",
                  borderRadius: "8px",
                  padding: "8px",
                  background: "#fafafa",
                }}
              >
                <List
                  size="small"
                  dataSource={logs}
                  renderItem={(item) => (
                    <List.Item
                      style={{
                        padding: "8px 12px",
                        borderBottom: "1px solid #f0f0f0",
                        borderRadius: "4px",
                        marginBottom: "2px",
                        transition: "all 0.2s ease",
                        background: "#fff",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "#f0f8ff";
                        e.currentTarget.style.transform = "translateX(2px)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "#fff";
                        e.currentTarget.style.transform = "translateX(0)";
                      }}
                    >
                      <Text
                        code
                        style={{
                          whiteSpace: "pre-wrap",
                          fontSize: "12px",
                          color: "#333",
                          fontFamily: "Monaco, Menlo, 'Ubuntu Mono', monospace",
                        }}
                      >
                        {item}
                      </Text>
                    </List.Item>
                  )}
                  locale={{ emptyText: "No logs yet." }}
                />
              </div>
            </Card>
          </Col>
          <Col xs={12} lg={12} xl={12}>
            <Card
              size="large"
              style={{
                borderRadius: 12,
                background: "#FFF",
                // border: "1px solid #e1e8ff",
                boxShadow: "none",
                transition: "all 0.3s ease",
                transform: "translateY(0)",
                animation: "slideInUp 0.6s ease-out 0.4s both",
                height: "100%",
              }}
              bordered={false}
              styles={{
                body: {
                  padding: "15px",
                },
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "16px",
                  paddingBottom: "12px",
                  borderBottom: "2px solid #e1e8ff",
                }}
              >
                <div
                  style={{ display: "flex", alignItems: "center", gap: "8px" }}
                >
                  <div
                    style={{
                      width: "40px",
                      height: "40px",
                      borderRadius: "50%",
                      // background: "#02b390",
                      border: "1px solid rgb(2, 179, 144)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      // boxShadow: "0 4px 12px rgba(102, 126, 234, 0.3)",
                    }}
                  >
                    <PhoneFilled
                      style={{ color: "rgb(2, 179, 144)", fontSize: "18px" }}
                    />
                  </div>
                  <Flex align="start" vertical>
                    <Title level={5} style={{ margin: 0, color: "#2c3e50" }}>
                      Call History
                    </Title>
                    <Text type="secondary" style={{ fontSize: "12px" }}>
                      {getFilteredCallLogs().length} calls
                    </Text>
                  </Flex>
                </div>
                <Space>
                  <Button
                    icon={<ReloadOutlined />}
                    onClick={() => {
                      // Refresh call logs
                      fetchCallLogs();
                    }}
                    style={{
                      borderRadius: "8px",
                      background: "#02b390",
                      border: "none",
                      color: "#fff",
                      boxShadow: "0 2px 8px rgba(102, 126, 234, 0.3)",
                    }}
                  >
                    Refresh
                  </Button>
                </Space>
              </div>
              {/* Quick Search Bar */}
              <Flex gap={7} align="center" style={{ marginBottom: "16px" }}>
                <Input
                  className="search-input"
                  placeholder="Quick search calls..."
                  prefix={<SearchOutlined />}
                  value={callFilters.search}
                  onChange={(e) =>
                    setCallFilters((prev) => ({
                      ...prev,
                      search: e.target.value,
                    }))
                  }
                  style={{ borderRadius: "8px" }}
                  allowClear
                />
                <Select
                  placeholder="Filter by status"
                  value={callFilters.status}
                  onChange={(value) =>
                    setCallFilters((prev) => ({
                      ...prev,
                      status: value,
                    }))
                  }
                  style={{ width: "250px", borderRadius: "8px" }}
                  allowClear
                  options={[
                    { value: "all", label: "All Statuses" },
                    { value: "completed", label: "✅ Completed" },
                    { value: "failed", label: "❌ Failed" },
                    { value: "busy", label: "📞 Busy" },
                    { value: "no-answer", label: "🤐 No Answer" },
                    { value: "canceled", label: "🚫 Canceled" },
                    { value: "in-progress", label: "🔄 In Progress" },
                    { value: "ringing", label: "🔔 Ringing" },
                  ]}
                />
                <Select
                  placeholder="Filter by duration"
                  value={callFilters.duration}
                  onChange={(value) =>
                    setCallFilters((prev) => ({
                      ...prev,
                      duration: value,
                    }))
                  }
                  style={{ width: "300px", borderRadius: "8px" }}
                  allowClear
                  options={[
                    { value: "all", label: "All Durations" },
                    { value: "short", label: "⏱️ Short (< 1 min)" },
                    { value: "medium", label: "⏱️ Medium (1-5 min)" },
                    { value: "long", label: "⏱️ Long (> 5 min)" },
                  ]}
                />
              </Flex>

              {/* Filter Summary Header */}
              <div style={{ marginBottom: "12px" }}>
                <Flex justify="space-between" align="center">
                  <Text type="secondary" style={{ fontSize: "12px" }}>
                    Showing {getFilteredCallLogs().length} of {callLogs.length}{" "}
                    calls
                  </Text>
                  {Object.values(callFilters).some(
                    (v) => v !== "all" && v !== null && v !== ""
                  ) && (
                    <Button
                      type="text"
                      size="small"
                      icon={<ClearOutlined />}
                      onClick={clearCallFilters}
                      style={{
                        padding: "0 8px",
                        height: "auto",
                        fontSize: "12px",
                      }}
                    >
                      Clear Filters
                    </Button>
                  )}
                </Flex>
              </div>

              {/* Filter Summary */}
              {Object.values(callFilters).some(
                (v) => v !== "all" && v !== null && v !== ""
              ) && (
                <div
                  className="filter-summary"
                  style={{
                    marginBottom: "12px",
                    padding: "8px 12px",
                    background: "#f8f9fa",
                    borderRadius: "6px",
                    border: "1px solid #e9ecef",
                  }}
                >
                  <Space wrap size="small">
                    <Text type="secondary" style={{ fontSize: "12px" }}>
                      🔍 Active filters:
                    </Text>
                    {callFilters.status !== "all" && (
                      <Tag
                        className="filter-tag"
                        color="blue"
                        closable
                        onClose={() =>
                          setCallFilters((prev) => ({ ...prev, status: "all" }))
                        }
                        style={{ borderRadius: "12px" }}
                      >
                        📞 {callFilters.status}
                      </Tag>
                    )}
                    {callFilters.duration !== "all" && (
                      <Tag
                        className="filter-tag"
                        color="green"
                        closable
                        onClose={() =>
                          setCallFilters((prev) => ({
                            ...prev,
                            duration: "all",
                          }))
                        }
                        style={{ borderRadius: "12px" }}
                      >
                        ⏱️ {callFilters.duration}
                      </Tag>
                    )}
                    {callFilters.dateRange && (
                      <Tag
                        className="filter-tag"
                        color="orange"
                        closable
                        onClose={() =>
                          setCallFilters((prev) => ({
                            ...prev,
                            dateRange: null,
                          }))
                        }
                        style={{ borderRadius: "12px" }}
                      >
                        📅 {callFilters.dateRange[0].format("MMM DD")} -{" "}
                        {callFilters.dateRange[1].format("MMM DD")}
                      </Tag>
                    )}
                  </Space>
                </div>
              )}

              <div
                style={{
                  maxHeight: "400px",
                  overflowY: "auto",
                  border: "1px solid #f0f0f0",
                  borderRadius: "8px",
                  // padding: "8px",
                }}
              >
                <List
                  size="small"
                  loading={callLoading}
                  dataSource={getFilteredCallLogs()}
                  renderItem={(call) => (
                    <List.Item
                      style={{
                        padding: "12px 8px",
                        borderBottom: "1px solid #f0f0f0",
                        borderRadius: "6px",
                        marginBottom: "4px",
                        transition: "all 0.2s ease",
                        cursor: "pointer",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "#f8f9fa";
                        // e.currentTarget.style.transform = "translateX(4px)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "transparent";
                        // e.currentTarget.style.transform = "translateX(0)";
                      }}
                    >
                      <Space
                        direction="vertical"
                        style={{ width: "100%" }}
                        size="small"
                      >
                        <Space
                          justify="space-between"
                          style={{ width: "100%" }}
                        >
                          <Space>
                            <Tag color="blue" style={{ borderRadius: "12px" }}>
                              {call.from}
                            </Tag>
                            <Text strong style={{ color: "#667eea" }}>
                              →
                            </Text>
                            <Tag color="green" style={{ borderRadius: "12px" }}>
                              {call.to}
                            </Tag>
                          </Space>
                          <Tag
                            color={
                              call.status === "completed"
                                ? "success"
                                : call.status === "failed"
                                ? "error"
                                : "processing"
                            }
                            style={{ borderRadius: "12px" }}
                          >
                            {call.status}
                          </Tag>
                        </Space>
                        <Space>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            ⏱️ Duration: {call.duration || 0}s
                          </Text>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            📅 {new Date(call.startTime).toLocaleString()}
                          </Text>
                        </Space>
                      </Space>
                    </List.Item>
                  )}
                  locale={{
                    emptyText:
                      getFilteredCallLogs().length === 0 &&
                      callLogs.length > 0 ? (
                        <div
                          style={{ textAlign: "center", padding: "40px 20px" }}
                        >
                          <FilterOutlined
                            style={{
                              fontSize: "48px",
                              color: "#d9d9d9",
                              marginBottom: "16px",
                            }}
                          />
                          <Text type="secondary" style={{ fontSize: "16px" }}>
                            No calls match your filters
                          </Text>
                          <br />
                          <Text type="secondary" style={{ fontSize: "12px" }}>
                            Try adjusting your search criteria
                          </Text>
                          <br />
                          <Button
                            type="link"
                            size="small"
                            onClick={clearCallFilters}
                            style={{ marginTop: "8px" }}
                          >
                            Clear All Filters
                          </Button>
                        </div>
                      ) : (
                        <div
                          style={{ textAlign: "center", padding: "40px 20px" }}
                        >
                          <PhoneFilled
                            style={{
                              fontSize: "48px",
                              color: "#d9d9d9",
                              marginBottom: "16px",
                            }}
                          />
                          <Text type="secondary" style={{ fontSize: "16px" }}>
                            No call history yet
                          </Text>
                          <br />
                          <Text type="secondary" style={{ fontSize: "12px" }}>
                            Make your first call to see it here
                          </Text>
                        </div>
                      ),
                  }}
                />
              </div>
            </Card>
          </Col>
          <Col xs={12} lg={12} xl={12}>
            <Card
              size="large"
              style={{
                borderRadius: 12,
                background: "#FFF",
                // border: "1px solid #e1e8ff",
                boxShadow: "none",
                transition: "all 0.3s ease",
                transform: "translateY(0)",
                animation: "slideInUp 0.6s ease-out 0.4s both",
                height: "100%",
              }}
              bordered={false}
              styles={{
                body: {
                  padding: "15px",
                },
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "16px",
                  paddingBottom: "12px",
                  borderBottom: "2px solid #e1e8ff",
                }}
              >
                <div
                  style={{ display: "flex", alignItems: "center", gap: "8px" }}
                >
                  <div
                    style={{
                      width: "40px",
                      height: "40px",
                      borderRadius: "50%",
                      // background: "#02b390",
                      border: "1px solid rgb(2, 179, 144)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      // boxShadow: "0 4px 12px rgba(102, 126, 234, 0.3)",
                    }}
                  >
                    <MessageOutlined
                      style={{ color: "rgb(2, 179, 144)", fontSize: "18px" }}
                    />
                  </div>
                  <Flex align="start" vertical>
                    <Title level={5} style={{ margin: 0, color: "#2c3e50" }}>
                      Message History
                    </Title>
                    <Text type="secondary" style={{ fontSize: "12px" }}>
                      {getFilteredMessageLogs().length} messages
                    </Text>
                  </Flex>
                </div>
                <Space>
                  <Button
                    icon={<ReloadOutlined />}
                    onClick={fetchLogs}
                    style={{
                      borderRadius: "8px",
                      background: "#02b390",
                      border: "none",
                      color: "#fff",
                      boxShadow: "0 2px 8px rgba(102, 126, 234, 0.3)",
                    }}
                  >
                    Refresh
                  </Button>
                </Space>
              </div>
              {/* Quick Search Bar */}
              <div style={{ marginBottom: "16px" }}>
                <Input
                  className="search-input"
                  placeholder="Quick search messages..."
                  prefix={<SearchOutlined />}
                  value={messageFilters.search}
                  onChange={(e) =>
                    setMessageFilters((prev) => ({
                      ...prev,
                      search: e.target.value,
                    }))
                  }
                  style={{ borderRadius: "8px" }}
                  allowClear
                />
              </div>

              {/* Filter Summary */}
              {Object.values(messageFilters).some(
                (v) => v !== "all" && v !== null && v !== ""
              ) && (
                <div
                  className="filter-summary"
                  style={{ marginBottom: "12px" }}
                >
                  <Space wrap size="small">
                    <Text type="secondary" style={{ fontSize: "12px" }}>
                      Active filters:
                    </Text>
                    {messageFilters.status !== "all" && (
                      <Tag
                        className="filter-tag"
                        color="blue"
                        closable
                        onClose={() =>
                          setMessageFilters((prev) => ({
                            ...prev,
                            status: "all",
                          }))
                        }
                      >
                        Status: {messageFilters.status}
                      </Tag>
                    )}
                    {messageFilters.direction !== "all" && (
                      <Tag
                        className="filter-tag"
                        color="green"
                        closable
                        onClose={() =>
                          setMessageFilters((prev) => ({
                            ...prev,
                            direction: "all",
                          }))
                        }
                      >
                        Direction: {messageFilters.direction}
                      </Tag>
                    )}
                    {messageFilters.dateRange && (
                      <Tag
                        className="filter-tag"
                        color="orange"
                        closable
                        onClose={() =>
                          setMessageFilters((prev) => ({
                            ...prev,
                            dateRange: null,
                          }))
                        }
                      >
                        Date: {messageFilters.dateRange[0].format("MMM DD")} -{" "}
                        {messageFilters.dateRange[1].format("MMM DD")}
                      </Tag>
                    )}
                    <Button
                      type="text"
                      size="small"
                      icon={<ClearOutlined />}
                      onClick={clearMessageFilters}
                      style={{ padding: "0 8px", height: "auto" }}
                    >
                      Clear All
                    </Button>
                  </Space>
                </div>
              )}

              <div
                style={{
                  maxHeight: "400px",
                  overflowY: "auto",
                  borderRadius: "12px",
                  // background: "#fff",
                  // border: "1px solid #f0f0f0",
                }}
              >
                <List
                  size="small"
                  dataSource={getFilteredMessageLogs()}
                  loading={messageLoading}
                  renderItem={(msg, index) => (
                    <List.Item
                      style={{
                        padding: "16px",
                        borderBottom: "1px solid #f5f5f5",
                        borderRadius: "8px",
                        margin: "8px",
                        background: "#fff",
                        transition: "all 0.3s ease",
                        cursor: "pointer",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background =
                          "linear-gradient(135deg, #f8f9ff 0%, #e8f4fd 100%)";
                        e.currentTarget.style.transform = "translateX(4px)";
                        e.currentTarget.style.boxShadow =
                          "0 4px 15px rgba(102, 126, 234, 0.15)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "#fff";
                        e.currentTarget.style.transform = "translateX(0)";
                        e.currentTarget.style.boxShadow =
                          "0 2px 8px rgba(0,0,0,0.05)";
                      }}
                    >
                      <Space
                        direction="vertical"
                        style={{ width: "100%" }}
                        size="middle"
                      >
                        {/* Header with From/To and Status */}
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            width: "100%",
                          }}
                        >
                          <Space size="small">
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                              }}
                            >
                              <div
                                style={{
                                  width: "8px",
                                  height: "8px",
                                  borderRadius: "50%",
                                  background:
                                    msg.status === "delivered"
                                      ? "#52c41a"
                                      : msg.status === "failed"
                                      ? "#ff4d4f"
                                      : "#1890ff",
                                  boxShadow: "0 0 8px rgba(0,0,0,0.2)",
                                }}
                              />
                              <Tag
                                color="blue"
                                style={{
                                  borderRadius: "20px",
                                  padding: "4px 12px",
                                  fontSize: "12px",
                                  fontWeight: "500",
                                }}
                              >
                                📤 {msg.from}
                              </Tag>
                            </div>
                            <Text
                              strong
                              style={{ color: "#667eea", fontSize: "16px" }}
                            >
                              →
                            </Text>
                            <Tag
                              color="green"
                              style={{
                                borderRadius: "20px",
                                padding: "4px 12px",
                                fontSize: "12px",
                                fontWeight: "500",
                              }}
                            >
                              📥 {msg.to}
                            </Tag>
                          </Space>
                          <Tag
                            color={
                              msg.status === "delivered"
                                ? "success"
                                : msg.status === "failed"
                                ? "error"
                                : "processing"
                            }
                            style={{
                              borderRadius: "20px",
                              padding: "6px 16px",
                              fontSize: "11px",
                              fontWeight: "600",
                              textTransform: "uppercase",
                            }}
                          >
                            {msg.status === "delivered"
                              ? "✅ "
                              : msg.status === "failed"
                              ? "❌ "
                              : "⏳ "}
                            {msg.status}
                          </Tag>
                        </div>

                        {/* Message Body */}
                        <div
                          style={{
                            background: "#f8f9fa",
                            padding: "12px",
                            borderRadius: "8px",
                            border: "1px solid #e9ecef",
                            margin: "8px 0",
                          }}
                        >
                          <Text
                            style={{
                              fontSize: "14px",
                              color: "#2c3e50",
                              lineHeight: "1.5",
                              fontWeight: "400",
                            }}
                          >
                            {msg.body}
                          </Text>
                        </div>

                        {/* Footer with Details */}
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            flexWrap: "wrap",
                            gap: "8px",
                          }}
                        >
                          <Space size="small" wrap>
                            <Text
                              type="secondary"
                              style={{
                                fontSize: "11px",
                                background: "#f0f2f5",
                                padding: "4px 8px",
                                borderRadius: "12px",
                                fontWeight: "500",
                              }}
                            >
                              📅 {new Date(msg.dateSent).toLocaleString()}
                            </Text>
                            {msg.price && (
                              <Text
                                type="secondary"
                                style={{
                                  fontSize: "11px",
                                  background: "#fff2e8",
                                  padding: "4px 8px",
                                  borderRadius: "12px",
                                  fontWeight: "500",
                                  color: "#d46b08",
                                }}
                              >
                                💰 {msg.price} {msg.priceUnit}
                              </Text>
                            )}
                            {msg.direction && (
                              <Tag
                                color={
                                  msg.direction === "outbound-api"
                                    ? "blue"
                                    : "orange"
                                }
                                style={{
                                  borderRadius: "12px",
                                  fontSize: "10px",
                                  padding: "2px 8px",
                                }}
                              >
                                {msg.direction === "outbound-api"
                                  ? "📤 Outbound"
                                  : "📥 Inbound"}
                              </Tag>
                            )}
                          </Space>
                        </div>

                        {/* SID */}
                        <Text
                          type="secondary"
                          style={{
                            fontSize: "10px",
                            fontFamily:
                              "Monaco, Menlo, 'Ubuntu Mono', monospace",
                            background: "#f5f5f5",
                            padding: "4px 8px",
                            borderRadius: "4px",
                            color: "#666",
                          }}
                        >
                          🔑 SID: {msg.sid}
                        </Text>
                      </Space>
                    </List.Item>
                  )}
                  locale={{
                    emptyText:
                      getFilteredMessageLogs().length === 0 &&
                      messageLogs.length > 0 ? (
                        <div
                          style={{ textAlign: "center", padding: "40px 20px" }}
                        >
                          <FilterOutlined
                            style={{
                              fontSize: "48px",
                              color: "#d9d9d9",
                              marginBottom: "16px",
                            }}
                          />
                          <Text type="secondary" style={{ fontSize: "16px" }}>
                            No messages match your filters
                          </Text>
                          <br />
                          <Text type="secondary" style={{ fontSize: "12px" }}>
                            Try adjusting your search criteria
                          </Text>
                          <br />
                          <Button
                            type="link"
                            size="small"
                            onClick={clearMessageFilters}
                            style={{ marginTop: "8px" }}
                          >
                            Clear All Filters
                          </Button>
                        </div>
                      ) : (
                        <div
                          style={{ textAlign: "center", padding: "40px 20px" }}
                        >
                          <MessageOutlined
                            style={{
                              fontSize: "48px",
                              color: "#d9d9d9",
                              marginBottom: "16px",
                            }}
                          />
                          <Text type="secondary" style={{ fontSize: "16px" }}>
                            No messages yet
                          </Text>
                          <br />
                          <Text type="secondary" style={{ fontSize: "12px" }}>
                            Send your first message to see it here
                          </Text>
                        </div>
                      ),
                  }}
                />
              </div>
            </Card>
          </Col>
          {/* Logs */}
        </Row>
      </Content>

      <Footer
        style={{
          textAlign: "center",
          background: "rgb(219 219 219)",
          color: "rgb(0 0 0)",
          padding: "20px",
          zIndex: 99,
          boxShadow: "rgba(0, 0, 0, 0.25) 0px 25px 50px -12px",
          height: "80px",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Space direction="vertical" size="small">
          <Text style={{ color: "rgb(0 0 0)", fontSize: 16 }}>
            🚀 Twilio Voice Hub - Made with 💙 by you
          </Text>
          <Text style={{ color: "rgb(0 0 0)", opacity: 0.8, fontSize: 12 }}>
            Powered by React + Ant Design + Twilio Voice SDK
          </Text>
        </Space>
      </Footer>

      {/* Keypad / DTMF */}
      <Modal
        title={
          <Space>
            <NumberOutlined style={{ color: "#667eea" }} />
            <span>DTMF Keypad</span>
          </Space>
        }
        open={keypadOpen}
        onCancel={() => setKeypadOpen(false)}
        footer={null}
        style={{ borderRadius: 16 }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 12,
            padding: "20px 0",
          }}
        >
          {["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"].map(
            (k) => (
              <Button
                key={k}
                size="large"
                onClick={() => sendDigit(k)}
                style={{
                  height: 60,
                  fontSize: 20,
                  fontWeight: "bold",
                  borderRadius: 12,
                  background: k === "9" ? "rgb(2, 179, 144)" : "#f0f2f5",
                  border: k === "9" ? "none" : "1px solid #d9d9d9",
                  color: k === "9" ? "#fff" : "#000",
                  transition: "all 0.2s ease",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "scale(1.1)";
                  e.currentTarget.style.boxShadow =
                    "0 4px 15px rgba(0,0,0,0.2)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "scale(1)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                {k}
              </Button>
            )
          )}
        </div>
        <Divider />
        <Space style={{ width: "100%", justifyContent: "center" }}>
          <Button
            type="primary"
            size="large"
            onClick={() => sendDigit("9")}
            style={{
              borderRadius: 8,
              background: "rgb(2, 179, 144)",
              border: "none",
            }}
          >
            📞 Send 9 (Forward)
          </Button>
          <Button
            icon={<CloseCircleOutlined />}
            danger
            size="large"
            onClick={() => setKeypadOpen(false)}
            style={{ borderRadius: 8 }}
          >
            Close
          </Button>
        </Space>
      </Modal>

      {/* Custom CSS for animations */}
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slideIn {
          from {
            transform: translateX(-20px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        .filter-tag {
          animation: slideIn 0.3s ease-out;
        }

        .filter-summary {
          animation: fadeIn 0.4s ease-out;
        }

        .search-input {
          transition: all 0.3s ease;
        }

        .search-input:focus {
          transform: scale(1.02);
          box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
        }

        .filter-button {
          transition: all 0.2s ease;
        }

        .filter-button:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }
      `}</style>
    </Layout>
  );
}
