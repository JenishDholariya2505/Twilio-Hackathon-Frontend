// src/App.jsx
import React, { useEffect, useRef, useState } from "react";
import {
  Layout,
  Card,
  Space,
  Input,
  Button,
  Tag,
  Typography,
  Tooltip,
  Modal,
  Select,
  Divider,
  List,
  message,
  Row,
  Col,
} from "antd";
import {
  PhoneFilled,
  PhoneOutlined,
  SoundOutlined,
  AudioOutlined,
  SoundTwoTone,
  AudioTwoTone,
  NumberOutlined,
  CloseCircleOutlined,
  ReloadOutlined,
  PauseOutlined,
  CaretRightOutlined,
} from "@ant-design/icons";
import { getDevice, destroyDevice } from "./twilioClient";

const { Header, Content, Footer } = Layout;
const { Title, Text } = Typography;

export default function App() {
  const deviceRef = useRef(null);
  const [status, setStatus] = useState("Connecting…");
  const [to, setTo] = useState("+919687424831"); // default for you 😉 919687424831
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

  const sendSMS = async () => {
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
        alert("✅ Message sent! SID: " + data.sid);
      } else {
        alert("❌ Failed: " + data.error);
      }
    } catch (err) {
      console.error("Fetch error:", err);
      alert("Something went wrong");
    }
  };

  const pushLog = (line) =>
    setLogs((prev) =>
      [`${new Date().toLocaleTimeString()}  ${line}`, ...prev].slice(0, 200)
    );

  useEffect(() => {
    async function fetchLogs() {
      try {
        const res = await fetch(
          "https://twilio-be-henna.vercel.app/call-logs?limit=500"
        );
        const data = await res.json();
        if (data.success) {
          setCallLogs(data.calls); // 👈 updated setter
        }
      } catch (err) {
        console.error("Error fetching logs:", err);
      }
    }
    fetchLogs();
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
  useEffect(() => {
    if (to) localStorage.setItem("lastTo", to);
  }, [to]);

  function hangup() {
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
      pushLog("🔄 Sending DTMF 9 for call forwarding...");
      activeCall.sendDigits(d);
      pushLog("✅ DTMF 9 sent - call should be forwarded");

      // Optional: Add a visual indicator that forwarding is active
      setTimeout(() => {
        pushLog("📞 Call forwarding activated");
      }, 1000);

      // Additional DTMF sequence for better forwarding
      setTimeout(() => {
        pushLog("🔄 Sending additional forwarding sequence...");
        activeCall.sendDigits("9");
      }, 2000);
    } else {
      activeCall.sendDigits(d);
      pushLog(`DTMF sent: ${d}`);
    }
  }

  async function refreshDevices() {
    try {
      // Use enumerateDevices for better labels
      const devices = await navigator.mediaDevices.enumerateDevices();
      const mics = devices.filter((d) => d.kind === "audioinput");
      const spks = devices.filter((d) => d.kind === "audiooutput");
      setMicList(mics);
      setSpkList(spks);
      if (!micId && mics[0]) setMicId(mics[0].deviceId);
      if (!spkId && spks[0]) setSpkId(spks[0].deviceId);
    } catch (e) {
      pushLog(`enumerateDevices failed: ${e.message || e}`);
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

  const handleCallError = (error) => {
    console.error("Call error:", error);

    if (error.code === 31005) {
      // Gateway error - attempt reconnection
      setTimeout(() => {
        reconnectCall();
      }, 2000);
    }
  };

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
      pushLog(
        `Mic set: ${shortLabel(micList.find((x) => x.deviceId === id)?.label)}`
      );
    } catch (e) {
      pushLog(`Mic set failed: ${e.message || e}`);
    }
  }

  async function applySpeaker(id) {
    setSpkId(id);
    try {
      // Twilio SDK speaker change (expects an array)
      await deviceRef.current?.audio?.speakerDevices?.set?.([id]);
      pushLog(
        `Speaker set: ${shortLabel(
          spkList.find((x) => x.deviceId === id)?.label
        )}`
      );
    } catch (e) {
      pushLog(`Speaker set failed: ${e.message || e}`);
    }
  }

  function shortLabel(label = "") {
    return label || "Default";
  }

  const ready = /Ready/i.test(status);

  return (
    <Layout style={{ height: "100vh", overflow: "hidden" }}>
      <Header
        style={{
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          padding: "0 24px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          height: "64px",
          flexShrink: 0,
        }}
      >
        <Space>
          <PhoneFilled
            style={{
              fontSize: 24,
              color: "#fff",
              animation: "pulse 2s infinite",
            }}
          />
          <Title
            level={4}
            style={{
              color: "#fff",
              margin: 0,
              animation: "fadeIn 1s ease-out",
            }}
          >
            Twilio Voice Hub
          </Title>
        </Space>
        <div style={{ marginLeft: "auto" }}>
          <Space>
            <Tag
              color={
                ready
                  ? "success"
                  : status.startsWith("Error")
                  ? "error"
                  : "processing"
              }
              style={{
                fontSize: 13,
                padding: "6px 12px",
                borderRadius: 20,
                fontWeight: 500,
                animation: ready ? "pulse 2s infinite" : "none",
              }}
            >
              {ready ? "🟢 " : status.startsWith("Error") ? "🔴 " : "🟡 "}
              {status}
            </Tag>
            {isOnline ? (
              <Tag color="success" style={{ borderRadius: 20 }}>
                🌐 Online
              </Tag>
            ) : (
              <Tag color="error" style={{ borderRadius: 20 }}>
                📴 Offline
              </Tag>
            )}
          </Space>
        </div>
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
          <Col xs={24} lg={12} xl={8}>
            <Card
              size="large"
              style={{
                borderRadius: 16,
                background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)",
                border: "none",
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                transition: "all 0.3s ease",
                transform: "translateY(0)",
                animation: "slideInUp 0.6s ease-out",
                height: "100%",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-5px)";
                e.currentTarget.style.boxShadow = "0 8px 25px rgba(0,0,0,0.15)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.1)";
              }}
            >
              <Space
                direction="vertical"
                style={{ width: "100%" }}
                size="large"
              >
                <Title level={5} style={{ margin: 0, color: "#2c3e50" }}>
                  📞 Make a Call
                </Title>
                <Space.Compact style={{ width: "100%" }}>
                  <Input
                    size="large"
                    prefix={<NumberOutlined style={{ color: "#667eea" }} />}
                    placeholder="+91XXXXXXXXXX or client:alice"
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                    style={{ borderRadius: "8px 0 0 8px" }}
                  />
                  <Tooltip title="Make Call">
                    <Button
                      size="large"
                      type="primary"
                      icon={<PhoneFilled />}
                      onClick={makeCall}
                      disabled={!ready || !to}
                      style={{
                        borderRadius: "0 8px 8px 0",
                        background:
                          "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                        border: "none",
                        transition: "all 0.3s ease",
                      }}
                      onMouseEnter={(e) => {
                        if (ready && to) {
                          e.currentTarget.style.transform = "scale(1.05)";
                          e.currentTarget.style.boxShadow =
                            "0 4px 15px rgba(102, 126, 234, 0.4)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "scale(1)";
                        e.currentTarget.style.boxShadow = "none";
                      }}
                    >
                      Call
                    </Button>
                  </Tooltip>
                </Space.Compact>

                <Space>
                  <Tooltip title="End Call">
                    <Button
                      size="large"
                      danger
                      icon={<PhoneOutlined />}
                      onClick={hangup}
                      disabled={!activeCall}
                      style={{ borderRadius: 8 }}
                    >
                      End Call
                    </Button>
                  </Tooltip>
                </Space>

                <Space wrap>
                  <Button
                    icon={muted ? <PauseOutlined /> : <CaretRightOutlined />}
                    disabled={!activeCall}
                    onClick={toggleMute}
                    style={{
                      borderRadius: 8,
                      background: muted ? "#ff4d4f" : "#52c41a",
                      borderColor: muted ? "#ff4d4f" : "#52c41a",
                      color: "#fff",
                    }}
                  >
                    {muted ? "🔇 Unmute" : "🔊 Mute"}
                  </Button>
                  <Button
                    icon={<NumberOutlined />}
                    disabled={!activeCall}
                    onClick={() => setKeypadOpen(true)}
                    style={{ borderRadius: 8 }}
                  >
                    ⌨️ Keypad / DTMF
                  </Button>
                  <Button
                    icon={<ReloadOutlined />}
                    onClick={refreshDevices}
                    style={{ borderRadius: 8 }}
                  >
                    🔄 Refresh Devices
                  </Button>
                </Space>
              </Space>
            </Card>
          </Col>

          {/* SMS Section */}
          <Col xs={24} lg={12} xl={8}>
            <Card
              size="large"
              style={{
                borderRadius: 16,
                transition: "all 0.3s ease",
                transform: "translateY(0)",
                animation: "slideInUp 0.6s ease-out 0.1s both",
                height: "100%",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-5px)";
                e.currentTarget.style.boxShadow = "0 8px 25px rgba(0,0,0,0.15)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.1)";
              }}
            >
              <Title level={5} style={{ marginTop: 0 }}>
                📱 Send SMS
              </Title>
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
                  rows={4}
                  style={{ borderRadius: 8 }}
                />
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
              </Space>
            </Card>
          </Col>

          {/* Devices */}
          <Col xs={24} lg={12} xl={8}>
            <Card
              size="large"
              style={{
                borderRadius: 16,
                transition: "all 0.3s ease",
                transform: "translateY(0)",
                animation: "slideInUp 0.6s ease-out 0.2s both",
                height: "100%",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-5px)";
                e.currentTarget.style.boxShadow = "0 8px 25px rgba(0,0,0,0.15)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.1)";
              }}
            >
              <Title level={5} style={{ marginTop: 0 }}>
                Devices
              </Title>
              <Space
                direction="vertical"
                size="middle"
                style={{ width: "100%" }}
              >
                <Space style={{ width: "100%" }} direction="vertical">
                  <Text strong>
                    <AudioTwoTone twoToneColor="#1677ff" /> Microphone
                  </Text>
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

                <Divider style={{ margin: "8px 0" }} />

                <Space style={{ width: "100%" }} direction="vertical">
                  <Text strong>
                    <SoundTwoTone twoToneColor="#52c41a" /> Speaker
                  </Text>
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
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Tip: Some browsers need a user gesture (click) before
                    changing output device takes effect.
                  </Text>
                </Space>
              </Space>
            </Card>
          </Col>

          {/* Call Logs Section */}
          <Col xs={12} lg={12} xl={12}>
            <Card
              size="large"
              style={{
                borderRadius: 16,
                transition: "all 0.3s ease",
                transform: "translateY(0)",
                animation: "slideInUp 0.6s ease-out 0.3s both",
                height: "100%",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-5px)";
                e.currentTarget.style.boxShadow = "0 8px 25px rgba(0,0,0,0.15)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.1)";
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "12px",
                }}
              >
                <Title level={5} style={{ margin: 0 }}>
                  📞 Call History
                </Title>
                <Button
                  size="small"
                  icon={<ReloadOutlined />}
                  onClick={() => {
                    // Refresh call logs
                    fetch(
                      "https://twilio-be-henna.vercel.app/call-logs?limit=500"
                    )
                      .then((res) => res.json())
                      .then((data) => {
                        if (data.success) {
                          setCallLogs(data.calls);
                          pushLog("Call history refreshed");
                        }
                      })
                      .catch((err) => {
                        console.error("Error fetching logs:", err);
                        pushLog("Failed to refresh call history");
                      });
                  }}
                  style={{ borderRadius: "20px" }}
                >
                  Refresh
                </Button>
              </div>
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
                  dataSource={callLogs}
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
                  locale={{ emptyText: "No call history yet." }}
                />
              </div>
            </Card>
          </Col>

          {/* Logs */}
          <Col xs={12} lg={12} xl={12}>
            <Card
              size="large"
              style={{
                borderRadius: 16,
                transition: "all 0.3s ease",
                transform: "translateY(0)",
                animation: "slideInUp 0.6s ease-out 0.4s both",
                height: "100%",
                maxHeightL: "400px",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-5px)";
                e.currentTarget.style.boxShadow = "0 8px 25px rgba(0,0,0,0.15)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.1)";
              }}
            >
              <Title level={5} style={{ marginTop: 0 }}>
                📋 Logs
              </Title>
              <div
                style={{
                  maxHeight: "500px",
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
        </Row>
      </Content>

      <Footer
        style={{
          textAlign: "center",
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          color: "#fff",
          padding: "20px",
          height: "80px",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Space direction="vertical" size="small">
          <Text style={{ color: "#fff", fontSize: 16 }}>
            🚀 Twilio Voice Hub - Made with 💙 by you
          </Text>
          <Text style={{ color: "#fff", opacity: 0.8, fontSize: 12 }}>
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
                  background:
                    k === "9"
                      ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                      : "#f0f2f5",
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
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
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
    </Layout>
  );
}
